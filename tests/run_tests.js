import assert from "assert";
import { spawn } from "child_process";
import crypto from "crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "../backend/services/razorpayService.js";

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000";

console.log("\n🧪 Running EcoMart Automated Test Suite...\n");

let passed = 0;
let failed = 0;
let spawnedProcess = null;

async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServerRunning() {
  const running = await isServerRunning();
  if (running) {
    console.log("ℹ️ Backend server is already active on port 5000.");
    return;
  }

  console.log("⚡ Starting background server for automated test execution...");
  spawnedProcess = spawn("node", ["backend/server.js"], { stdio: "ignore" });

  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isServerRunning()) {
      console.log("✅ Background test server is ready.\n");
      return;
    }
  }
  throw new Error("Could not start test backend server.");
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} - ${err.message}`);
    failed++;
  }
}

async function testSuite() {
  await ensureServerRunning();

  // 1. Health Check
  await runTest("Health Check Endpoint (/api/health)", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200, "Health check should return status 200");
    const data = await res.json();
    assert.strictEqual(data.status, "ok", "Health check response status should be 'ok'");
  });

  // 2. Public Active Offers
  await runTest("Public Active Offers Endpoint (/api/offers/active)", async () => {
    const res = await fetch(`${BASE_URL}/api/offers/active`);
    assert.strictEqual(res.status, 200, "Offers active should return status 200");
    const data = await res.json();
    assert.ok(Array.isArray(data.offers), "Response must contain offers array");
  });

  // 3. Location Services API
  await runTest("Location Countries API (/api/locations/countries)", async () => {
    const res = await fetch(`${BASE_URL}/api/locations/countries`);
    assert.strictEqual(res.status, 200, "Countries endpoint should return 200");
    const data = await res.json();
    assert.ok(Array.isArray(data) || Array.isArray(data.countries), "Must return array of countries");
  });

  // 4. Invalid Login Handled (401 Status Code)
  await runTest("Auth - Reject Invalid Credentials with 401", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent_test_user@ecomart.com", password: "wrongpassword123" })
    });
    assert.strictEqual(res.status, 401, "Invalid login should return HTTP 401");
  });

  // 5. Unauthorized Protected Route (401 Status Code)
  await runTest("Auth - Protected Endpoint Requires Valid Token (401)", async () => {
    const res = await fetch(`${BASE_URL}/api/offers/vendor`, {
      headers: { Authorization: "Bearer invalid_expired_token_12345" }
    });
    assert.strictEqual(res.status, 401, "Protected endpoint with invalid token must return 401");
  });

  // 6. Razorpay Payment Signature Verification (Valid Signature)
  await runTest("Razorpay - Verify Valid Payment Signature Logic", async () => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_key_12345";
    const orderId = "order_test_123";
    const paymentId = "pay_test_456";
    const payload = `${orderId}|${paymentId}`;
    const validSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(payload).digest("hex");

    const isValid = verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSig
    });
    assert.strictEqual(isValid, true, "Valid Razorpay signature must verify as true");
  });

  // 7. Razorpay Payment Signature Verification (Forged Signature Rejection)
  await runTest("Razorpay - Reject Invalid/Forged Payment Signature", async () => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_key_12345";
    const isInvalid = verifyPaymentSignature({
      razorpayOrderId: "order_test_123",
      razorpayPaymentId: "pay_test_456",
      razorpaySignature: "forged_signature_abcd12345"
    });
    assert.strictEqual(isInvalid, false, "Forged signature must be rejected (false)");
  });

  // 8. Razorpay Webhook Signature Verification
  await runTest("Razorpay - Verify Webhook Signature Logic", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret_789";
    const rawBody = JSON.stringify({ event: "payment.captured", id: "evt_123" });
    const validWebhookSig = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");

    const isWebhookValid = verifyWebhookSignature(rawBody, validWebhookSig);
    assert.strictEqual(isWebhookValid, true, "Valid webhook signature must verify as true");
  });

  // Summary
  console.log(`\n📊 Test Execution Results:`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total:  ${passed + failed}\n`);

  if (spawnedProcess && !spawnedProcess.killed) {
    spawnedProcess.kill("SIGINT");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

testSuite().catch((err) => {
  console.error("Test execution error:", err);
  if (spawnedProcess && !spawnedProcess.killed) {
    spawnedProcess.kill("SIGINT");
  }
  process.exit(1);
});
