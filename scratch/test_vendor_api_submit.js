import { query } from "../backend/database.js";
import { sendOTP, verifyOTP } from "../backend/controllers/otpController.js";
import { registerVendor } from "../backend/controllers/authController.js";

async function runDirectTrace() {
  const email = "bhavithran2006@gmail.com";

  // Clean prior records
  await query.run("DELETE FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?)", [email]);

  // 1. Send OTP
  const reqSend = { body: { email, purpose: "register_vendor" } };
  const resSend = { status() { return this; }, json(d) { console.log("SendOTP res:", d); } };
  await sendOTP(reqSend, resSend);

  // 2. Query OTP
  const otpRow = await query.get("SELECT otp FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_vendor'", [email]);
  console.log("OTP Row:", otpRow);

  // 3. Verify OTP
  const reqVerify = { body: { email, otp: otpRow.otp, purpose: "register_vendor" } };
  const resVerify = { status() { return this; }, json(d) { console.log("VerifyOTP res:", d); } };
  await verifyOTP(reqVerify, resVerify);

  // 4. Register Vendor
  const reqReg = {
    body: {
      name: "Bhavithran",
      email,
      password: "password123",
      phone: "9342162361",
      mobile: "9342162361",
      storeName: "Bhavi Sustainable Store",
      countryCode: "IN",
      countryName: "India",
      region: "Tamil Nadu",
      district: "Coimbatore",
      city: "Coimbatore",
      address: "123 Eco Street",
      postalCode: "641001",
      lat: 11.0168,
      lng: 76.9558,
      currency: "INR",
      about: "Sustainable organic goods store"
    }
  };

  const resReg = {
    status(code) { console.log("Reg status:", code); return this; },
    json(d) { console.log("Reg json:", d); }
  };

  await registerVendor(reqReg, resReg);
}

runDirectTrace().then(() => process.exit(0)).catch(err => {
  console.error("Direct trace error:", err);
  process.exit(1);
});
