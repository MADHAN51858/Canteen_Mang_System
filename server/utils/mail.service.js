import nodemailer from "nodemailer";

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT) || 587;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

export const sendPasswordResetOtpEmail = async (toEmail, otp, username = "User") => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n========================================`);
    console.log(`[EMAIL NOT CONFIGURED]`);
    console.log(`Recipient: ${toEmail}`);
    console.log(`Password Reset OTP: ${otp}`);
    console.log(`Set EMAIL_USER and EMAIL_PASS in Backend/.env to send real emails.`);
    console.log(`========================================\n`);
    return {
      success: true,
      simulated: true,
      message: "Email credentials not set; OTP logged to server console.",
    };
  }

  const frontendUrl = (process.env.CORS_ORIGIN || "http://localhost:5173").replace(/\/$/, "");
  const resetLink = `${frontendUrl}/forgot-password?email=${encodeURIComponent(toEmail)}&otp=${otp}`;

  const mailOptions = {
    from: `"DBIT Canteen" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `Password Reset Request - DBIT Canteen`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 32px 28px; color: #333333; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0 20px; }
          .btn-reset { background-color: #1976d2; color: #ffffff !important; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(25, 118, 210, 0.35); }
          .otp-box { background: #f0f7ff; border: 2px dashed #1976d2; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1976d2; margin: 0; }
          .note { font-size: 13px; color: #666666; margin-top: 6px; }
          .divider { text-align: center; margin: 24px 0 16px; color: #999999; font-size: 13px; position: relative; }
          .footer { background: #fafafa; border-top: 1px solid #eeeeee; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DBIT Canteen</h1>
            <p>Password Reset Request</p>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>We received a request to reset your password. You can either click the button below to reset it directly, or use the 6-digit verification code:</p>
            
            <div class="btn-container">
              <a href="${resetLink}" class="btn-reset" target="_blank">Reset Password Directly</a>
            </div>

            <div class="divider">─── OR ENTER CODE MANUALLY ───</div>

            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="note">This code & link will expire in <strong>10 minutes</strong>.</div>
            </div>

            <p style="font-size: 13px; color: #777; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DBIT Canteen Management System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP Email Sent] to: ${toEmail}, messageId: ${info.messageId}`);
    return { success: true, simulated: false, info };
  } catch (err) {
    console.error(`[OTP Email Error]:`, err);
    throw err;
  }
};
