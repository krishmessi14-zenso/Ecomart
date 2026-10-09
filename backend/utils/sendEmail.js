import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

/**
 * Send OTP Email with styled HTML Template
 * @param {Object} options
 * @param {string} options.to Email recipient
 * @param {string} options.subject Email subject
 * @param {string} options.otp 6-digit OTP code
 * @param {string} options.purpose Purpose text for email banner
 * @returns {Promise<boolean>}
 */
export async function sendEmail({ to, subject, otp, purpose = "Account Verification" }) {
  const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
  const EMAIL_PASS = (process.env.EMAIL_PASS || "").trim();
  const OTP_DEBUG = process.env.OTP_DEBUG === "true";

  const defaultSubject = subject || "EcoMart Email Verification";

  console.log(`[EcoMart Email OTP] OTP email requested for: ${to} (Purpose: ${purpose})`);

  const hasCredentials =
    EMAIL_USER &&
    EMAIL_PASS &&
    !EMAIL_USER.includes("your_") &&
    !EMAIL_PASS.includes("your_");

  if (!hasCredentials) {
    if (OTP_DEBUG) {
      console.warn(`⚠️ [OTP_DEBUG=true] EMAIL_USER/EMAIL_PASS not configured. Debug OTP: ${otp}`);
      return true;
    }
    console.error("❌ [EcoMart Email OTP] SMTP configuration error: EMAIL_USER and EMAIL_PASS must be configured in .env");
    throw new Error("Unable to send verification email. SMTP server credentials (EMAIL_USER/EMAIL_PASS) are not configured.");
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${defaultSubject}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f7f6;
          margin: 0;
          padding: 0;
          color: #333333;
        }
        .email-container {
          max-width: 580px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%);
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .header p {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #a7f3d0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .content {
          padding: 36px 32px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 12px;
        }
        .message-text {
          font-size: 14.5px;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 28px;
        }
        .otp-card {
          background: #f0fdf4;
          border: 2px dashed #10b981;
          border-radius: 14px;
          padding: 24px;
          margin: 0 auto 28px auto;
          max-width: 320px;
        }
        .otp-label {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 800;
          color: #047857;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .otp-code {
          font-family: 'Courier New', Courier, monospace;
          font-size: 38px;
          font-weight: 900;
          color: #047857;
          letter-spacing: 8px;
          margin: 0;
        }
        .expiry-notice {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          font-size: 12.5px;
          font-weight: 700;
          padding: 6px 16px;
          border-radius: 20px;
          margin-bottom: 24px;
        }
        .warning-text {
          font-size: 12.5px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .footer {
          background: #f8fafc;
          padding: 20px 24px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🌿 EcoMart</h1>
          <p>Sustainable E-Commerce</p>
        </div>
        <div class="content">
          <div class="greeting">Welcome to EcoMart</div>
          <div class="message-text">
            You requested verification for <strong>${purpose}</strong>. Please use the 6-digit security code below to complete your verification process.
          </div>

          <div class="otp-card">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
          </div>

          <div class="expiry-notice">
            ⏰ Code expires in 10 minutes
          </div>

          <div class="warning-text">
            If you did not request this code, please ignore this email. Never share your verification code with anyone for account security.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} EcoMart Sustainable Marketplace. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"EcoMart Security" <${EMAIL_USER}>`,
      to,
      subject: defaultSubject,
      html: htmlContent,
    });

    console.log(`✅ [EcoMart Email OTP] OTP email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ [EcoMart Email OTP] OTP email sending failed for ${to}: ${err.message}`);
    
    // Always print generated OTP in server logs when in debug mode
    if (OTP_DEBUG) {
      console.log(`\n========================================`);
      console.log(`✉️ [EcoMart Server Log Debug OTP]`);
      console.log(`Recipient: ${to}`);
      console.log(`Purpose: ${purpose}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`========================================\n`);
      return true;
    }

    if (err.message && (err.message.includes("535") || err.message.includes("BadCredentials") || err.message.includes("Username and Password not accepted"))) {
      throw new Error("Gmail rejected login (BadCredentials). Please generate a 16-character Gmail App Password from Google Account > Security > App Passwords and update EMAIL_PASS in .env file.", { cause: err });
    }

    throw new Error(`Unable to send verification email. ${err.message}`, { cause: err });
  }
}

export default sendEmail;
