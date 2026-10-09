import { generateOTP } from "../utils/generateOTP.js";
import { sendEmail } from "../utils/sendEmail.js";
import EmailOTP from "../models/EmailOTP.js";
import User from "../models/User.js";
import { query } from "../database.js";
import mongoose from "mongoose";

// Check if mongoose is connected
const isMongoConnected = () => mongoose.connection.readyState === 1;

/**
 * Send OTP
 * POST /api/auth/send-otp
 */
export async function sendOTP(req, res) {
  try {
    const { email, purpose = "email_verification" } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Check account existence based on purpose
    let existingUser = null;
    if (isMongoConnected()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }

    if (purpose === "register_customer" || purpose === "register_vendor") {
      if (existingUser) {
        return res.status(400).json({ error: "Email address is already registered. Please sign in instead." });
      }
    } else if (purpose === "forgot_password") {
      if (!existingUser) {
        return res.status(404).json({ error: "No account found registered with this email address." });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 Minutes Expiry

    if (isMongoConnected()) {
      // Remove any existing OTP for this email & purpose
      await EmailOTP.deleteMany({ email: cleanEmail, purpose });

      await EmailOTP.create({
        email: cleanEmail,
        otp,
        purpose,
        verified: false,
        expiresAt,
        attempts: 0,
      });
    } else {
      // SQL / Memory Store Fallback
      await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = ?", [cleanEmail, purpose]);
      await query.run(
        "INSERT INTO email_otps (id, email, otp, purpose, verified, attempts, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          `otp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          cleanEmail,
          otp,
          purpose,
          0,
          0,
          expiresAt.getTime(),
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
    }

    // Send email with custom purpose title
    const purposeTitleMap = {
      register_customer: "Customer Account Registration",
      register_vendor: "Vendor Store Registration",
      forgot_password: "Password Reset",
      change_password: "Password Change",
      email_verification: "Email Verification",
    };

    await sendEmail({
      to: cleanEmail,
      subject: "EcoMart Email Verification",
      otp,
      purpose: purposeTitleMap[purpose] || "Verification",
    });

    res.json({
      success: true,
      message: "Verification OTP sent to your email.",
      email: cleanEmail,
    });
  } catch (err) {
    console.error("sendOTP Error:", err.message);
    res.status(500).json({ error: err.message || "Unable to send verification email. Please try again." });
  }
}

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
export async function verifyOTP(req, res) {
  try {
    const { email, otp, purpose = "email_verification" } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = (otp || "").toString().trim();

    if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
    }

    let record = null;
    if (isMongoConnected()) {
      record = await EmailOTP.findOne({ email: cleanEmail, purpose }).sort({ createdAt: -1 });
    } else {
      record = await query.get(
        "SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = ? ORDER BY expiresAt DESC",
        [cleanEmail, purpose]
      );
    }

    if (!record) {
      return res.status(400).json({ error: "No active verification code found for this email. Please request a new OTP." });
    }

    // Check attempts limit before proceeding
    if (record.attempts >= 5) {
      return res.status(400).json({ error: "Too many incorrect attempts. Please request a new OTP." });
    }

    // Check expiry safely
    const rawExpiry = record.expiresAt;
    const expiryTime = typeof rawExpiry === "number" ? rawExpiry : new Date(isNaN(rawExpiry) ? rawExpiry : Number(rawExpiry)).getTime();
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      return res.status(400).json({ error: "OTP has expired. Please request a new OTP." });
    }

    // Verify OTP match
    if (record.otp !== cleanOtp) {
      const newAttempts = (record.attempts || 0) + 1;

      if (isMongoConnected()) {
        await EmailOTP.updateOne({ _id: record._id }, { attempts: newAttempts });
      } else {
        await query.run("UPDATE email_otps SET attempts = ? WHERE id = ?", [newAttempts, record.id]);
      }

      if (newAttempts >= 5) {
        return res.status(400).json({ error: "Too many incorrect attempts. Please request a new OTP." });
      }

      return res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
    }

    // OTP is valid -> Mark verified
    if (isMongoConnected()) {
      await EmailOTP.updateOne({ _id: record._id }, { verified: true });
    } else {
      await query.run("UPDATE email_otps SET verified = 1 WHERE id = ?", [record.id]);
    }

    res.json({
      success: true,
      verified: true,
      message: "OTP verified successfully!",
    });
  } catch (err) {
    console.error("verifyOTP Error:", err);
    res.status(500).json({ error: "Failed to verify OTP code. Please try again." });
  }
}

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
export async function resendOTP(req, res) {
  try {
    const { email, purpose = "email_verification" } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Delegate to sendOTP which cleans up prior OTP and creates fresh 10-minute code
    return await sendOTP(req, res);
  } catch (err) {
    console.error("resendOTP Error:", err);
    res.status(500).json({ error: "Unable to send verification email. Please try again." });
  }
}

export default {
  sendOTP,
  verifyOTP,
  resendOTP,
};
