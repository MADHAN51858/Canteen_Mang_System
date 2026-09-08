import mongoose, { Schema } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    type: {
      type: String,
      enum: ["canteen_order", "wallet_recharge", "wallet_withdrawal"],
      required: true,
    },
    status: {
      type: String,
      enum: ["created", "pending", "completed", "failed", "refunded"],
      default: "created",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    creditedToWallet: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
