import { sendOTP, resendOTP } from "./otpController.js";

export async function sendVerificationEmail(req, res) {
  req.body.purpose = "email_verification";
  return sendOTP(req, res);
}

export async function resendVerificationEmail(req, res) {
  req.body.purpose = "email_verification";
  return resendOTP(req, res);
}

export default {
  sendVerificationEmail,
  resendVerificationEmail,
};
