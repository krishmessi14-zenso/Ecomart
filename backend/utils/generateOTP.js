import crypto from "crypto";

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 * @returns {string} 6-digit OTP string
 */
export function generateOTP() {
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

export default generateOTP;
