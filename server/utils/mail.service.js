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
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - DBIT Canteen</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,600;0,6..72,700;1,6..72,600&display=swap');
          body { margin: 0; padding: 0; background-color: #0E0F11; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
          table { border-collapse: collapse; }
          a { text-decoration: none; }
          .btn-hover:hover { background-color: #d85331 !important; box-shadow: 0 6px 22px rgba(200, 74, 42, 0.5) !important; }
          
          @media only screen and (max-width: 620px) {
            .split-container { width: 100% !important; max-width: 100% !important; }
            .col-left, .col-right { display: block !important; width: 100% !important; box-sizing: border-box !important; }
            .col-left { border-right: none !important; border-bottom: 1px solid rgba(200, 74, 42, 0.25) !important; padding: 32px 24px !important; }
            .col-right { padding: 32px 24px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 36px 16px; background-color: #0E0F11; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #D0D2D7;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0E0F11; width: 100%;">
          <tr>
            <td align="center">
              <table role="presentation" class="split-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 660px; background-color: #161719; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 22px; overflow: hidden; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.85);">
                
                <!-- SPLIT ROW: LEFT (TERRACOTTA TEXT) & RIGHT (DARK FORM / BUTTON / OTP) -->
                <tr>
                  
                  <!-- LEFT COLUMN (WARM TERRACOTTA PANEL) -->
                  <td class="col-left" width="46%" valign="top" style="background-color: #381912; background: linear-gradient(155deg, #381912 0%, #261009 100%); padding: 40px 32px; border-right: 1px solid rgba(200, 74, 42, 0.22); box-sizing: border-box;">
                    
                    <!-- Branding Header -->
                    <h1 style="margin: 0; font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.01em; line-height: 1.15;">
                      DBIT canteen
                    </h1>
                    <p style="margin: 8px 0 24px; font-size: 13.5px; color: #D89987; font-weight: 400; line-height: 1.5; letter-spacing: 0.1px;">
                      Order ahead, skip the line. Ready between classes.
                    </p>

                    <!-- Divider accent -->
                    <div style="width: 36px; height: 3px; background-color: #C84A2A; border-radius: 2px; margin-bottom: 24px;"></div>

                    <!-- Greeting & Instructions -->
                    <p style="margin: 0 0 10px; font-size: 16px; color: #FFFFFF; font-weight: 600;">
                      Hello <span style="color: #F6B867;">${username}</span>,
                    </p>
                    <p style="margin: 0 0 20px; color: #E0B4A7; font-size: 13.5px; line-height: 1.6;">
                      We received a request to reset your password. You can click the button on the right to reset directly, or enter the 6-digit code manually on the reset page.
                    </p>

                    <!-- Security Note -->
                    <p style="margin: 28px 0 0; font-size: 12px; color: #B37D71; line-height: 1.55;">
                      If you did not make this request, you can safely ignore this email. Your password remains unchanged.
                    </p>
                  </td>

                  <!-- RIGHT COLUMN (DARK FORM & ACTION PANEL) -->
                  <td class="col-right" width="54%" valign="middle" style="background-color: #161719; padding: 40px 32px; box-sizing: border-box;">
                    
                    <h2 style="margin: 0 0 6px; font-family: 'Newsreader', Georgia, 'Times New Roman', serif; font-size: 25px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.01em; line-height: 1.2;">
                      Password Reset
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 13px; color: #888C95;">
                      Choose your preferred verification method:
                    </p>

                    <!-- DIRECT RESET BUTTON -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 22px;">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" class="btn-reset btn-hover" target="_blank" style="background-color: #C84A2A; color: #FFFFFF !important; padding: 14px 24px; font-size: 14.5px; font-weight: 600; text-decoration: none; border-radius: 10px; display: block; text-align: center; box-shadow: 0 4px 18px rgba(200, 74, 42, 0.4); letter-spacing: 0.1px; border: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box;">
                            Reset Password Directly &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- SECTION DIVIDER -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                      <tr>
                        <td style="border-bottom: 1px solid #282B30;"></td>
                        <td style="width: auto; padding: 0 12px; text-align: center; color: #727680; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; white-space: nowrap;">
                          OR ENTER CODE MANUALLY
                        </td>
                        <td style="border-bottom: 1px solid #282B30;"></td>
                      </tr>
                    </table>

                    <!-- OTP CODE BOX -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0 6px;">
                      <tr>
                        <td style="background-color: #1E2024; border: 2px dashed rgba(200, 74, 42, 0.7); border-radius: 14px; padding: 20px 14px; text-align: center;">
                          <div style="font-family: 'SF Mono', Consolas, Monaco, 'Courier New', monospace; font-size: 34px; font-weight: 800; letter-spacing: 9px; color: #F6B867; margin: 0 0 6px; text-shadow: 0 2px 10px rgba(246, 184, 103, 0.25);">
                            ${otp}
                          </div>
                          <div style="font-size: 12.5px; color: #888C95; margin-top: 4px;">
                            Valid for <strong style="color: #D89987;">10 minutes</strong>
                          </div>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- FULL WIDTH FOOTER -->
                <tr>
                  <td colspan="2" style="background-color: #111214; border-top: 1px solid #222428; padding: 18px 24px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #5B5F69; line-height: 1.5;">
                      &copy; ${new Date().getFullYear()} DBIT Canteen Management System. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
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
