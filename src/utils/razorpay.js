import { get } from "./api";

let cachedKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

export async function getRazorpayKeyId() {
  if (cachedKeyId) return cachedKeyId;

  try {
    const res = await get("/users/razorpay-key");
    if (res?.data?.keyId) {
      cachedKeyId = res.data.keyId;
      return cachedKeyId;
    }
  } catch (e) {
    console.warn("[Razorpay] Failed to fetch key from backend:", e);
  }

  return cachedKeyId || "rzp_test_TZXnGTteZkxaVh";
}

export async function openRazorpay(param1, param2 = "Order Payment") {
  // Load Razorpay script if not loaded
  if (!window.Razorpay) {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK. Please check your internet connection."));
    });
  }

  let orderId = "";
  let amount = 0;
  let name = "Canteen Management";
  let description = "Order Payment";
  let prefill = {};
  let themeColor = "#F37254";
  let keyId = "";

  if (typeof param1 === "object" && param1 !== null) {
    orderId = param1.orderId || "";
    amount = Number(param1.amount || 0);
    name = param1.name || "Canteen Management";
    description = param1.description || "Order Payment";
    prefill = param1.prefill || {};
    themeColor = param1.themeColor || "#F37254";
    keyId = param1.keyId || "";
  } else {
    amount = Number(param1 || 0);
    description = param2 || "Order Payment";
  }

  const finalKey = keyId || (await getRazorpayKeyId()) || "rzp_test_TZXnGTteZkxaVh";
  const isWithdraw = description?.toLowerCase().includes("withdraw");

  return new Promise((resolve, reject) => {
    const options = {
      key: finalKey,
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      name: name || (isWithdraw ? "Wallet Withdrawal" : "Canteen Food Order"),
      description: description || "Order Payment",
      prefill: {
        name: prefill.name || "",
        email: prefill.email || "",
        contact: prefill.contact || "",
      },
      handler: function (response) {
        resolve(response);
      },
      theme: {
        color: themeColor,
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled by user"));
        },
      },
    };

    if (orderId) {
      options.order_id = orderId;
    }

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (err) {
      console.warn("Razorpay payment failed:", err);
      reject(err?.error || new Error("Payment failed on Razorpay"));
    });
    rzp.open();
  });
}
