import mongoose from "mongoose";

const emailOTPSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: [
        "register_customer",
        "register_vendor",
        "forgot_password",
        "change_password",
        "email_verification",
      ],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index to automatically remove expired OTP documents
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup
emailOTPSchema.index({ email: 1, purpose: 1 });

const EmailOTP = mongoose.models.EmailOTP || mongoose.model("EmailOTP", emailOTPSchema);

export default EmailOTP;
