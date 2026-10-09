import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "vendor", "admin"],
      default: "customer",
    },
    storeName: {
      type: String,
      default: null,
      trim: true,
    },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    countryCode: { type: String, default: "IN" },
    countryName: { type: String, default: "India" },
    region: { type: String, default: null },
    district: { type: String, default: null },
    city: { type: String, default: null },
    postalCode: { type: String, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    currency: { type: String, default: "INR" },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      default: "Verified",
    },
    about: { type: String, default: null },
    rating: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    greenPoints: { type: Number, default: 0 },
    upiId: { type: String, default: null },
    accountHolderName: { type: String, default: null },
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    panNumber: { type: String, default: null },
    gstin: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
