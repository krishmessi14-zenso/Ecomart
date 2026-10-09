import express from "express";
import scanRoutes from "../backend/routes/scan.js";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use("/api/scan", scanRoutes);

const JWT_SECRET = process.env.JWT_SECRET || "ecomart_dev_jwt_secret_key_change_in_production";

function generateTestToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

const customerToken = generateTestToken({ id: "u_krishmessi91", name: "Krish", role: "customer", email: "krishmessi14@gmail.com" });

// Small 1x1 transparent PNG base64 for testing
const sampleBase64Buffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function runTests() {
  console.log("==================================================");
  console.log("TEST 1: Authentication Requirement Check");
  console.log("==================================================");
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/scan`;

  // 1. Unauthenticated request to /api/scan
  try {
    const res = await fetch(baseUrl, { method: "POST" });
    console.log("Unauthenticated Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("Error:", err.message);
  }

  console.log("\n==================================================");
  console.log("TEST 2: POST /api/scan Image Upload & Gemini Vision");
  console.log("==================================================");
  try {
    const formData = new FormData();
    const blob = new Blob([sampleBase64Buffer], { type: "image/png" });
    formData.append("image", blob, "sample_plastic_bottle.png");

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken}`
      },
      body: formData
    });

    console.log("Scan Status:", res.status);
    const scanData = await res.json();
    console.log("Scan Result:", JSON.stringify(scanData, null, 2));

    if (scanData.success && scanData.alternatives?.length > 0) {
      const chosenAlt = scanData.alternatives[0];

      console.log("\n==================================================");
      console.log("TEST 3: POST /api/scan/choose-alternative");
      console.log("==================================================");
      const choiceRes = await fetch(`${baseUrl}/choose-alternative`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          scanId: scanData.scanId,
          chosenProductId: chosenAlt.id,
          plasticSavedGrams: scanData.estimatedPlasticWeightGrams,
          co2SavedKg: scanData.estimatedCo2Kg,
          productName: scanData.productName
        })
      });

      console.log("Choice Status:", choiceRes.status);
      const choiceData = await choiceRes.json();
      console.log("Choice Result:", JSON.stringify(choiceData, null, 2));
    }

    console.log("\n==================================================");
    console.log("TEST 4: GET /api/scan/my-impact Dashboard Data");
    console.log("==================================================");
    const impactRes = await fetch(`${baseUrl}/my-impact`, {
      headers: {
        Authorization: `Bearer ${customerToken}`
      }
    });

    console.log("Impact Status:", impactRes.status);
    const impactData = await impactRes.json();
    console.log("Impact Dashboard Data:", JSON.stringify(impactData, null, 2));

  } catch (err) {
    console.error("Scan Test Error:", err);
  } finally {
    server.close();
  }
}

runTests();
