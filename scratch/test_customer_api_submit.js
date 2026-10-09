import { query } from "../backend/database.js";
import { sendOTP, verifyOTP } from "../backend/controllers/otpController.js";
import { registerCustomer } from "../backend/controllers/authController.js";

async function runCustomerDirectTrace() {
  console.log("Waiting for MySQL database connection...");
  await new Promise(r => setTimeout(r, 2000));

  const email = "test_customer_bhavi@gmail.com";

  // Clean prior test records
  await query.run("DELETE FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  await query.run("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?)", [email]);

  // 1. Send OTP
  console.log("Sending OTP for customer registration...");
  const reqSend = { body: { email, purpose: "register_customer" } };
  const resSend = { status() { return this; }, json(d) { console.log("SendOTP res:", d); } };
  await sendOTP(reqSend, resSend);

  // 2. Query OTP
  const otpRow = await query.get("SELECT otp FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_customer'", [email]);
  console.log("OTP Row:", otpRow);

  // 3. Verify OTP
  console.log("Verifying OTP...");
  const reqVerify = { body: { email, otp: otpRow.otp, purpose: "register_customer" } };
  const resVerify = { status() { return this; }, json(d) { console.log("VerifyOTP res:", d); } };
  await verifyOTP(reqVerify, resVerify);

  // 4. Register Customer Payload
  const reqReg = {
    body: {
      name: "Customer Bhavithran",
      email,
      password: "password123",
      phone: "9876543210",
      mobile: "9876543210",
      countryCode: "IN",
      countryName: "India",
      region: "Tamil Nadu",
      district: "Coimbatore",
      city: "Coimbatore",
      address: "456 Eco Avenue",
      postalCode: "641002",
      lat: 11.0168,
      lng: 76.9558,
      currency: "INR"
    }
  };

  const resReg = {
    status(code) { console.log("Customer Reg status:", code); return this; },
    json(d) { console.log("Customer Reg json:", d); }
  };

  await registerCustomer(reqReg, resReg);
}

runCustomerDirectTrace().then(() => process.exit(0)).catch(err => {
  console.error("Direct customer trace error:", err);
  process.exit(1);
});
