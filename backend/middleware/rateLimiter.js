import rateLimit from "express-rate-limit";

// Limit OTP sending requests: Max 15 requests per hour
export const otpSendRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  message: {
    error: "Too many OTP requests. Please try again after an hour.",
    status: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit OTP verification attempts: Max 20 attempts per window
export const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    error: "Too many failed OTP verification attempts. Please try again later.",
    status: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit Login and Register attempts: Max 20 attempts per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    error: "Too many login/registration attempts. Please try again after 15 minutes.",
    status: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: {
    error: "Too many requests from this IP, please try again later.",
    status: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  otpSendRateLimiter,
  otpVerifyRateLimiter,
  authRateLimiter,
  apiRateLimiter,
};
