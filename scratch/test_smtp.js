import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const EMAIL_USER = (process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = (process.env.EMAIL_PASS || "").trim();

console.log(`Testing SMTP with user: "${EMAIL_USER}"`);

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

try {
  const info = await transporter.sendMail({
    from: `"EcoMart Security" <${EMAIL_USER}>`,
    to: EMAIL_USER,
    subject: "EcoMart Test Email",
    text: "Test email from EcoMart",
  });
  console.log("SUCCESS! MessageId:", info.messageId);
} catch (err) {
  console.error("SMTP ERROR:", err.message);
  if (err.response) console.error("SMTP Response:", err.response);
}
