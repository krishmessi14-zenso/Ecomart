import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import User from "../models/User.js";
import EmailOTP from "../models/EmailOTP.js";
import { query } from "../database.js";
import { generateOTP } from "../utils/generateOTP.js";
import { sendEmail } from "../utils/sendEmail.js";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const getJwtSecret = () => process.env.JWT_SECRET || "ecomart_dev_jwt_secret_key_change_in_production";
const isMongoConnected = () => mongoose.connection.readyState === 1;

// Strip sensitive fields before returning user to client
export function sanitizeUser(user) {
  if (!user) return null;
  const raw = user._doc ? user.toObject() : { ...user };
  delete raw.password;
  delete raw.securityAnswer;
  delete raw.securityanswer;
  delete raw.otpHash;
  delete raw.otpExpiry;
  delete raw.resetOtp;
  delete raw.resetOtpExpiry;
  return raw;
}

/**
 * Register Customer
 * POST /api/auth/register/customer
 */
export async function registerCustomer(req, res) {
  try {
    const { name, email, password, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, about, address, phone, mobile } = req.body;
    const userPhone = phone || mobile || null;
    const userAddress = address || null;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP was completed for customer registration
    let otpRecord = null;
    if (isMongoConnected()) {
      otpRecord = await EmailOTP.findOne({ email: cleanEmail, purpose: "register_customer", verified: true }).sort({ createdAt: -1 });
    } else {
      otpRecord = await query.get(
        "SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_customer' AND verified = 1 ORDER BY expiresAt DESC",
        [cleanEmail]
      );
    }

    if (!otpRecord) {
      return res.status(400).json({ error: "Please verify your email address via OTP before completing registration." });
    }

    const rawExpiry = otpRecord.expiresAt;
    const expiryTime = typeof rawExpiry === "number" ? rawExpiry : new Date(isNaN(rawExpiry) ? rawExpiry : Number(rawExpiry)).getTime();
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      return res.status(400).json({ error: "Please verify your email address via OTP before completing registration." });
    }

    // Check duplicate email
    let existingUser = null;
    if (isMongoConnected()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = await query.get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }

    if (existingUser) {
      return res.status(400).json({ error: "Email address is already registered." });
    }

    // Hash password with bcrypt salt 10
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    let newUser = null;
    if (isMongoConnected()) {
      newUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "customer",
        phone: userPhone,
        address: userAddress,
        countryCode: countryCode || "IN",
        countryName: countryName || "India",
        region: region || null,
        district: district || null,
        city: city || null,
        postalCode: postalCode || null,
        lat: lat || null,
        lng: lng || null,
        currency: currency || "INR",
        verified: true,
        verificationStatus: "Verified",
        about: about || null,
      });
      // Delete OTP record after successful registration
      await EmailOTP.deleteMany({ email: cleanEmail, purpose: "register_customer" });
    } else {
      await query.run(
        `INSERT INTO users (id, email, password, role, name, storeName, phone, address, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, verified, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          cleanEmail,
          hashedPassword,
          "customer",
          name.trim(),
          null,
          userPhone,
          userAddress,
          countryCode || "IN",
          countryName || "India",
          region || null,
          district || null,
          city || null,
          postalCode || null,
          lat || null,
          lng || null,
          currency || "INR",
          1,
          "Verified",
          about || null,
          5.0,
          0,
          0,
          createdAt,
        ]
      );
      newUser = await query.get("SELECT * FROM users WHERE id = ?", [userId]);
      await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_customer'", [cleanEmail]);
    }

    const safeUser = sanitizeUser(newUser);
    const token = jwt.sign({ id: safeUser.id || safeUser._id, email: cleanEmail, role: "customer" }, getJwtSecret(), { expiresIn: "30d" });

    res.status(201).json({
      token,
      ...safeUser,
      verified: true,
      message: "Customer account created successfully!",
    });
  } catch (err) {
    console.error("registerCustomer Error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
}

/**
 * Register Vendor
 * POST /api/auth/register/vendor
 */
export async function registerVendor(req, res) {
  try {
    const {
      name,
      storeName,
      email,
      password,
      countryCode,
      countryName,
      region,
      district,
      city,
      postalCode,
      lat,
      lng,
      currency,
      about,
    } = req.body;

    if (!name || !storeName || !email || !password) {
      return res.status(400).json({ error: "Name, store name, email address, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Verify that the email was verified via OTP code before registration
    let verifiedOtp = null;
    if (isMongoConnected()) {
      verifiedOtp = await EmailOTP.findOne({ email: cleanEmail, purpose: "register_vendor", verified: true }).sort({ createdAt: -1 });
    } else {
      verifiedOtp = await query.get(
        "SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_vendor' AND verified = 1 ORDER BY expiresAt DESC",
        [cleanEmail]
      );
    }

    if (!verifiedOtp) {
      return res.status(400).json({ error: "Please verify your email address via OTP before completing registration." });
    }

    const rawExpiry = verifiedOtp.expiresAt;
    const expiryTime = typeof rawExpiry === "number" ? rawExpiry : new Date(isNaN(rawExpiry) ? rawExpiry : Number(rawExpiry)).getTime();
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      return res.status(400).json({ error: "Please verify your email address via OTP before completing registration." });
    }

    let existingUser = null;
    if (isMongoConnected()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = await query.get("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }

    if (existingUser) {
      return res.status(400).json({ error: "Email address is already registered as a user or vendor." });
    }

    // Hash password with bcrypt salt 10
    const hashedPassword = await bcrypt.hash(password, 10);
    const vendorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = new Date().toISOString();

    let newVendor = null;
    if (isMongoConnected()) {
      newVendor = await User.create({
        name: name.trim(),
        storeName: storeName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: "vendor",
        countryCode: countryCode || "IN",
        countryName: countryName || "India",
        region: region || null,
        district: district || null,
        city: city || null,
        postalCode: postalCode || null,
        lat: lat || null,
        lng: lng || null,
        currency: currency || "INR",
        verified: true,
        verificationStatus: "Pending",
        about: about || null,
      });
      await EmailOTP.deleteMany({ email: cleanEmail, purpose: "register_vendor" });
    } else {
      await query.run(
        `INSERT INTO users (id, email, password, role, name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, verified, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId,
          cleanEmail,
          hashedPassword,
          "vendor",
          name.trim(),
          storeName.trim(),
          countryCode || "IN",
          countryName || "India",
          region || null,
          district || null,
          city || null,
          postalCode || null,
          lat || null,
          lng || null,
          currency || "INR",
          1,
          "Pending",
          about || null,
          5.0,
          0,
          0,
          createdAt,
        ]
      );
      newVendor = await query.get("SELECT * FROM users WHERE id = ?", [vendorId]);
      await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_vendor'", [cleanEmail]);
    }

    const safeVendor = sanitizeUser(newVendor);
    const token = jwt.sign({ id: safeVendor.id || safeVendor._id, email: cleanEmail, role: "vendor" }, getJwtSecret(), { expiresIn: "30d" });

    res.status(201).json({
      token,
      ...safeVendor,
      verified: true,
      message: "Vendor store registered successfully!",
    });
  } catch (err) {
    console.error("registerVendor Error:", err);
    res.status(500).json({ error: "Vendor registration failed. Please try again." });
  }
}

/**
 * Universal Unified Login (Customer / Vendor / Admin)
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email address and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Role check if specific role requested
    if (role && user.role !== role && user.role !== "admin") {
      return res.status(403).json({ error: `Account exists but is registered as ${user.role}, not ${role}.` });
    }

    // Compare bcrypt password (with plain password fallback auto-migrated on match)
    let isMatch = false;
    let isLegacyPlain = false;
    if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
      isLegacyPlain = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    // Auto-migrate legacy plaintext password to bcrypt hash
    if (isLegacyPlain) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        if (isMongoConnected()) {
          await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });
        } else {
          await query.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
        }
        user.password = hashedPassword;
      } catch (err) {
        console.warn("Failed to auto-migrate password hash:", err.message);
      }
    }

    // Check verification status
    const isVerified = user.verified === true || user.verified === 1 || user.verificationStatus === "Verified";
    if (!isVerified) {
      return res.status(403).json({
        unverified: true,
        email: cleanEmail,
        error: "Please verify your email address first before logging in.",
      });
    }

    const safeUser = sanitizeUser(user);
    const token = jwt.sign({ id: safeUser.id || safeUser._id, email: cleanEmail, role: safeUser.role }, getJwtSecret(), { expiresIn: "30d" });

    res.json({
      token,
      ...safeUser,
      verified: true,
    });
  } catch (err) {
    console.error("login Error:", err);
    res.status(500).json({ error: "Login failed due to a server error." });
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  res.json({ success: true, message: "Logged out successfully." });
}

/**
 * Forgot Password - Send OTP
 * POST /api/auth/forgot-password/send-otp
 */
export async function forgotPasswordSendOTP(req, res) {
  req.body.purpose = "forgot_password";
  const { sendOTP } = await import("./otpController.js");
  return sendOTP(req, res);
}

/**
 * Forgot Password - Verify OTP
 * POST /api/auth/forgot-password/verify-otp
 */
export async function forgotPasswordVerifyOTP(req, res) {
  req.body.purpose = "forgot_password";
  const { verifyOTP } = await import("./otpController.js");
  return verifyOTP(req, res);
}

/**
 * Forgot Password - Reset Password
 * POST /api/auth/forgot-password/reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP record
    let record = null;
    if (isMongoConnected()) {
      record = await EmailOTP.findOne({ email: cleanEmail, purpose: "forgot_password", verified: true });
    } else {
      record = await query.get(
        "SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'forgot_password' AND verified = 1",
        [cleanEmail]
      );
    }

    if (!record) {
      return res.status(400).json({ error: "Invalid or unverified OTP. Please verify your OTP code first." });
    }

    // Hash new password with bcrypt salt 10
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isMongoConnected()) {
      await User.updateOne({ email: cleanEmail }, { password: hashedPassword });
      await EmailOTP.deleteMany({ email: cleanEmail, purpose: "forgot_password" });
    } else {
      await query.run("UPDATE users SET password = ? WHERE LOWER(email) = LOWER(?)", [hashedPassword, cleanEmail]);
      await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'forgot_password'", [cleanEmail]);
    }

    res.json({
      success: true,
      message: "Password Updated Successfully! You can now log in with your new password.",
    });
  } catch (err) {
    console.error("resetPassword Error:", err);
    res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
}

/**
 * Change Password - Send OTP
 * POST /api/auth/change-password/send-otp
 */
export async function changePasswordSendOTP(req, res) {
  try {
    const { currentPassword } = req.body;
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required to verify identity." });
    }

    let user = null;
    if (isMongoConnected()) {
      user = await User.findById(userId);
    } else {
      user = await query.get("SELECT * FROM users WHERE id = ? OR LOWER(email) = LOWER(?)", [userId, (email || "").toLowerCase()]);
    }

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    let isMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(currentPassword, user.password);
    } else {
      isMatch = user.password === currentPassword;
    }

    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password." });
    }

    req.body.email = user.email;
    req.body.purpose = "change_password";
    const { sendOTP } = await import("./otpController.js");
    return sendOTP(req, res);
  } catch (err) {
    console.error("changePasswordSendOTP Error:", err);
    res.status(500).json({ error: "Failed to process change password OTP request." });
  }
}

/**
 * Change Password - Verify OTP
 * POST /api/auth/change-password/verify-otp
 */
export async function changePasswordVerifyOTP(req, res) {
  req.body.purpose = "change_password";
  const { verifyOTP } = await import("./otpController.js");
  return verifyOTP(req, res);
}

/**
 * Change Password - Update
 * POST /api/auth/change-password/update
 */
export async function changePasswordUpdate(req, res) {
  try {
    const { currentPassword, newPassword, otp } = req.body;
    const userId = req.user?.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters long." });
    }

    let user = null;
    if (isMongoConnected()) {
      user = await User.findById(userId);
    } else {
      user = await query.get("SELECT * FROM users WHERE id = ?", [userId]);
    }

    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const cleanEmail = user.email.toLowerCase();

    // Verify OTP
    let record = null;
    if (isMongoConnected()) {
      record = await EmailOTP.findOne({ email: cleanEmail, purpose: "change_password", verified: true });
    } else {
      record = await query.get(
        "SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'change_password' AND verified = 1",
        [cleanEmail]
      );
    }

    if (!record) {
      return res.status(400).json({ error: "Please verify the 6-digit OTP sent to your email before changing password." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (isMongoConnected()) {
      await User.updateOne({ _id: user._id }, { password: hashedPassword });
      await EmailOTP.deleteMany({ email: cleanEmail, purpose: "change_password" });
    } else {
      await query.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
      await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'change_password'", [cleanEmail]);
    }

    res.json({
      success: true,
      message: "Password changed successfully!",
    });
  } catch (err) {
    console.error("changePasswordUpdate Error:", err);
    res.status(500).json({ error: "Failed to update password." });
  }
}

/**
 * Verify Email (Resend Verification OTP)
 * POST /api/auth/email/verify
 */
export async function verifyEmail(req, res) {
  req.body.purpose = "email_verification";
  const { sendOTP } = await import("./otpController.js");
  return sendOTP(req, res);
}

export default {
  registerCustomer,
  registerVendor,
  login,
  logout,
  forgotPasswordSendOTP,
  forgotPasswordVerifyOTP,
  resetPassword,
  changePasswordSendOTP,
  changePasswordVerifyOTP,
  changePasswordUpdate,
  verifyEmail,
};

/**
 * Verify Security Question
 * POST /api/auth/verify-security
 */
export async function verifySecurityQuestion(req, res) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email address is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = await query.get("SELECT securityQuestion FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }
    res.json({ securityQuestion: user.securityQuestion || "What is your secret hint?" });
  } catch (err) {
    console.error("verifySecurityQuestion error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * Reset Password via Security Answer
 * POST /api/auth/reset-password
 */
export async function resetPasswordWithSecurityAnswer(req, res) {
  try {
    const { email, securityAnswer, newPassword } = req.body;
    if (!email || !securityAnswer || !newPassword) {
      return res.status(400).json({ error: "Email, security answer, and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = await query.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
    }
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }
    const userAns = (user.securityAnswer || user.securityanswer || "").trim().toLowerCase();
    const inputAns = String(securityAnswer).trim().toLowerCase();
    if (!userAns || userAns !== inputAns) {
      return res.status(400).json({ error: "Incorrect security answer." });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    if (isMongoConnected()) {
      await User.updateOne({ _id: user._id }, { password: hashedPassword });
    } else {
      await query.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
    }
    res.json({ success: true, message: "Password reset successfully." });
  } catch (err) {
    console.error("resetPasswordWithSecurityAnswer error:", err);
    res.status(500).json({ error: "Failed to reset password." });
  }
}

