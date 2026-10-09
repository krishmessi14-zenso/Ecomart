import express from "express";
import {
  sendOTP,
  verifyOTP,
  resendOTP,
} from "../controllers/otpController.js";
import {
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
  verifySecurityQuestion,
  resetPasswordWithSecurityAnswer,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";
import { otpSendRateLimiter, otpVerifyRateLimiter, authRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// General OTP Routes
router.post("/send-otp", otpSendRateLimiter, sendOTP);
router.post("/verify-otp", otpVerifyRateLimiter, verifyOTP);
router.post("/resend-otp", otpSendRateLimiter, resendOTP);

// Registration Routes
router.post("/register/customer", authRateLimiter, registerCustomer);
router.post("/register/vendor", authRateLimiter, registerVendor);
router.post("/register", authRateLimiter, registerCustomer); // Backward compatibility fallback

// Login / Logout
router.post("/login", authRateLimiter, login);
router.post("/logout", logout);

// Forgot Password Flow
router.post("/forgot-password/send-otp", otpSendRateLimiter, forgotPasswordSendOTP);
router.post("/forgot-password/verify-otp", otpVerifyRateLimiter, forgotPasswordVerifyOTP);
router.post("/forgot-password/reset-password", resetPassword);

// Legacy reset routes for compatibility
router.post("/verify-otp-only", otpVerifyRateLimiter, verifyOTP);
router.post("/verify-otp-reset-password", resetPassword);
router.post("/verify-security", verifySecurityQuestion);
router.post("/reset-password", resetPasswordWithSecurityAnswer);

// Change Password Flow (Requires Bearer Token authentication)
router.post("/change-password/send-otp", authenticateToken, otpSendRateLimiter, changePasswordSendOTP);
router.post("/change-password/verify-otp", authenticateToken, otpVerifyRateLimiter, changePasswordVerifyOTP);
router.post("/change-password/update", authenticateToken, changePasswordUpdate);

// Email Verification
router.post("/email/verify", otpSendRateLimiter, verifyEmail);

export default router;
