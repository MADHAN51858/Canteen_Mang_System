/**
 * SMS Service for DBIT Canteen Management System
 * Supports sending SMS OTPs via Fast2SMS / Twilio, or console simulation fallback.
 */

export const sendPasswordResetOtpSms = async (phoneNo, otp, username = "User") => {
  const cleanPhone = String(phoneNo).replace(/\D/g, "");
  const message = `DBIT Canteen: Your password reset verification code is ${otp}. Valid for 15 minutes. Do not share this code.`;

  // 1. Twilio Gateway (Priority when configured)
  const twilioSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const twilioToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const twilioFrom = String(process.env.TWILIO_PHONE_NUMBER || "").trim();

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      let formattedPhone = cleanPhone;
      if (formattedPhone.length === 10) {
        formattedPhone = `+91${formattedPhone}`;
      } else if (formattedPhone.length === 12 && formattedPhone.startsWith("91")) {
        formattedPhone = `+${formattedPhone}`;
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = `+${formattedPhone}`;
      }

      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const params = new URLSearchParams();
      params.append("To", formattedPhone);
      params.append("From", twilioFrom);
      params.append("Body", message);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      const data = await response.json();

      if (response.ok && data.sid) {
        console.log(`[TWILIO SMS SUCCESS] Message SID: ${data.sid}, Status: ${data.status} sent to ${formattedPhone}`);
        return { success: true, provider: "twilio", sid: data.sid, data };
      }

      // Handle Twilio error / trial unverified number
      if (data.code === 21608) {
        const errorMsg = `Mobile number ${formattedPhone} is unverified in your Twilio Trial account. Please add and verify it in Twilio Console (Phone Numbers > Verified Caller IDs).`;
        console.error(`\n========================================`);
        console.error(`[TWILIO TRIAL ACCOUNT ERROR 21608]`);
        console.error(errorMsg);
        console.error(`Verify here: https://console.twilio.com/us1/develop/phone-numbers/manage/verified`);
        console.error(`Password Reset OTP for ${username}: ${otp}`);
        console.error(`========================================\n`);
        return { success: false, provider: "twilio", code: data.code, message: errorMsg, data };
      }

      console.error(`[TWILIO SMS ERROR ${data.code || response.status}]:`, data.message);
      return {
        success: false,
        provider: "twilio",
        code: data.code,
        message: data.message || "Twilio failed to send SMS",
        data,
      };
    } catch (err) {
      console.error("[TWILIO NETWORK ERROR]:", err.message);
      return { success: false, provider: "twilio", message: err.message };
    }
  }

  // 2. Fast2SMS Gateway (Alternative if configured)
  const fast2smsKey = String(process.env.FAST2SMS_API_KEY || "").trim();
  if (fast2smsKey) {
    let tenDigitPhone = cleanPhone;
    if (cleanPhone.length > 10 && cleanPhone.startsWith("91")) {
      tenDigitPhone = cleanPhone.slice(2);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
      tenDigitPhone = cleanPhone.slice(1);
    }

    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: String(otp),
          numbers: tenDigitPhone,
        }),
      });
      const data = await response.json();
      console.log(`[FAST2SMS RESPONSE] for ${tenDigitPhone}:`, data);
      if (data.return) {
        return { success: true, provider: "fast2sms", data };
      }
      
      console.error(`[FAST2SMS REJECTION]:`, data.message || data);
      return {
        success: false,
        provider: "fast2sms",
        message: data.message || "Failed to send SMS via Fast2SMS",
        data,
      };
    } catch (err) {
      console.error("[FAST2SMS NETWORK ERROR]:", err.message);
      return { success: false, provider: "fast2sms", message: err.message };
    }
  }

  // 3. Fallback / Local Development Simulation
  console.log(`\n========================================`);
  console.log(`[SMS GATEWAY NOT CONFIGURED - SIMULATION]`);
  console.log(`Recipient Phone: ${cleanPhone}`);
  console.log(`Recipient User: ${username}`);
  console.log(`Password Reset SMS OTP: ${otp}`);
  console.log(`SMS Content: "${message}"`);
  console.log(`Tip: Configure TWILIO credentials in .env to send live SMS.`);
  console.log(`========================================\n`);

  return {
    success: true,
    simulated: true,
    message: "SMS OTP simulated (logged to server console)",
  };
};
