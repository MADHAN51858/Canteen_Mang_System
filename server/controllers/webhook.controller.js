import crypto from "crypto";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Payment } from "../models/payment.model.js";

/**
 * POST /webhook/razorpay
 *
 * Razorpay sends a raw JSON body and an "X-Razorpay-Signature" header.
 * We verify the HMAC-SHA256 digest before touching the database.
 *
 * Events handled:
 *   payment.captured  → Marks Cart order as completed / Credits Profile Wallet
 *   payment.failed    → Marks Cart order / Wallet transaction as failed
 *   order.paid        → Belt-and-suspenders order / wallet completion
 */
export const handleRazorpayWebhook = async (req, res) => {
  // ── 1. Verify webhook signature ──────────────────────────────────────────
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Webhook] RAZORPAY_WEBHOOK_SECRET is not set in environment");
    return res.status(500).json({ message: "Webhook secret not configured" });
  }

  const receivedSignature = req.headers["x-razorpay-signature"];
  if (!receivedSignature) {
    console.warn("[Webhook] Missing X-Razorpay-Signature header");
    return res.status(400).json({ message: "Missing signature header" });
  }

  // Retrieve raw buffer for HMAC verification
  const rawBody = req.rawBody
    ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody))
    : (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body)));

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== receivedSignature) {
    console.warn("[Webhook] Signature mismatch — possible spoofed request");
    return res.status(400).json({ message: "Invalid signature" });
  }

  // ── 2. Parse payload ──────────────────────────────────────────────────────
  let payload;
  try {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      payload = req.body;
    } else {
      payload = JSON.parse(rawBody.toString("utf8"));
    }
  } catch (e) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  const event = payload?.event;
  const paymentEntity = payload?.payload?.payment?.entity;
  const orderEntity   = payload?.payload?.order?.entity;

  console.log(`[Webhook] Received Razorpay event: ${event}`);

  // ── 3. Handle events ──────────────────────────────────────────────────────
  try {
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id || payload?.payload?.payment?.entity?.id;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    switch (event) {
      // ── payment.captured & order.paid ─────────────────────────────────────
      case "payment.captured":
      case "order.paid": {
        if (!razorpayOrderId) {
          console.warn("[Webhook] Missing order_id in webhook event payload");
          break;
        }

        // Check if there is an existing Payment record
        let paymentRecord = await Payment.findOne({ razorpayOrderId });

        const isWalletRecharge =
          notes.type === "wallet_recharge" ||
          paymentRecord?.type === "wallet_recharge";

        if (isWalletRecharge) {
          // ── Flow A: Profile Wallet Recharge ──
          const userId = notes.userId || paymentRecord?.userId;
          const rechargeAmount = Number(notes.amount || paymentRecord?.amount || (paymentEntity?.amount ? paymentEntity.amount / 100 : 0));

          if (!userId) {
            console.warn(`[Webhook] Wallet recharge missing userId for order: ${razorpayOrderId}`);
            break;
          }

          if (paymentRecord && paymentRecord.creditedToWallet) {
            console.log(`[Webhook] Wallet recharge ${razorpayOrderId} already credited. Skipping duplicate credit.`);
          } else {
            const updatedUser = await User.findByIdAndUpdate(
              userId,
              { $inc: { walletBalance: rechargeAmount } },
              { new: true }
            );

            if (updatedUser) {
              console.log(`[Webhook] Successfully credited ₹${rechargeAmount} to ${updatedUser.username}'s wallet. New balance: ₹${updatedUser.walletBalance}`);
            }

            if (!paymentRecord) {
              paymentRecord = new Payment({
                userId,
                razorpayOrderId,
                razorpayPaymentId,
                amount: rechargeAmount,
                type: "wallet_recharge",
                status: "completed",
                creditedToWallet: true,
              });
            } else {
              paymentRecord.creditedToWallet = true;
              paymentRecord.status = "completed";
              if (razorpayPaymentId) paymentRecord.razorpayPaymentId = razorpayPaymentId;
            }
            await paymentRecord.save();
          }
        } else {
          // ── Flow B: Canteen Food Order ──
          const order = await Order.findOne({ razorpayOrderId });
          if (order) {
            order.paymentStatus = "completed";
            if (razorpayPaymentId) order.razorpayPaymentId = razorpayPaymentId;
            await order.save();
            console.log(`[Webhook] Order ${order._id} (${order.orderNumber}) marked paymentStatus = 'completed'`);
          } else {
            console.log(`[Webhook] Order with razorpayOrderId ${razorpayOrderId} not found yet (client may finalize creation)`);
          }

          if (paymentRecord) {
            paymentRecord.status = "completed";
            if (razorpayPaymentId) paymentRecord.razorpayPaymentId = razorpayPaymentId;
            await paymentRecord.save();
          }
        }
        break;
      }

      // ── payment.failed ───────────────────────────────────────────────────
      case "payment.failed": {
        if (!razorpayOrderId) break;

        const paymentRecord = await Payment.findOne({ razorpayOrderId });
        if (paymentRecord) {
          paymentRecord.status = "failed";
          await paymentRecord.save();
        }

        const order = await Order.findOne({ razorpayOrderId });
        if (order) {
          order.paymentStatus = "failed";
          await order.save();
          console.log(`[Webhook] Order ${order._id} marked paymentStatus = 'failed'`);
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event} — acknowledged`);
    }
  } catch (dbErr) {
    console.error("[Webhook] DB error while processing event:", dbErr);
    return res.status(200).json({ message: "Webhook received, DB error logged" });
  }

  // Razorpay expects a 200 OK to consider the webhook delivered
  return res.status(200).json({ message: "Webhook processed successfully" });
};
