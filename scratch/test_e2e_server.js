import express from "express";
import aiRoutes from "../backend/routes/ai.js";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());
app.use("/api", aiRoutes);

const JWT_SECRET = process.env.JWT_SECRET || "ecomart_dev_jwt_secret_key_change_in_production";

function generateTestToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

const customerToken = generateTestToken({ id: "u_krishmessi91", name: "Krish", role: "customer", email: "krishmessi14@gmail.com" });
const adminToken = generateTestToken({ id: "u_admin1", name: "EcoMart Admin", role: "admin", email: "admin@ecomart.com" });

async function makeRequest(description, payload, token = null) {
  console.log(`\n--------------------------------------------------`);
  console.log(`TEST: ${description}`);
  console.log(`--------------------------------------------------`);

  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const server = app.listen(0);
  const port = server.address().port;
  const url = `http://localhost:${port}/api/chat`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Reply:\n${data.reply}`);
    if (data.language) console.log(`Detected Language: ${data.language}`);
  } catch (err) {
    console.error("HTTP Request Error:", err.message);
  } finally {
    server.close();
  }
}

async function runE2eTests() {
  // Test 1: "Hi I am Krish" -> "Hi Krish, how can I help you?"
  await makeRequest("1. Introduction", { message: "Hi I am Krish", selectedLanguage: "en-IN" }, customerToken);

  // Test 2: "How many products are there?" -> real count from DB
  await makeRequest("2. Product count", { message: "How many products are there?", selectedLanguage: "en-IN" });

  // Test 3: "Track my order EM-90214" -> real status
  await makeRequest("3. Track order", { message: "Track my order EM-90214", selectedLanguage: "en-IN" }, customerToken);

  // Test 4: "Recommend a plastic-free water bottle" -> real products from DB
  await makeRequest("4. Product recommendation", { message: "Recommend a plastic-free water bottle", selectedLanguage: "en-IN" });

  // Test 5: Admin asks "How many users are registered?" -> real count
  await makeRequest("5. Admin asks total users", { message: "How many users are registered?", selectedLanguage: "en-IN" }, adminToken);

  // Test 6: Customer asks the same admin question -> politely refused
  await makeRequest("6. Customer asks total users", { message: "How many users are registered?", selectedLanguage: "en-IN" }, customerToken);

  // Test 7: Tamil and Hindi questions
  await makeRequest("7a. Tamil Question", { message: "வேகமான விநியோகம் உள்ளதா?", selectedLanguage: "ta-IN" });
  await makeRequest("7b. Hindi Question", { message: "क्या प्लास्टिक-मुक्त बोतलें उपलब्ध हैं?", selectedLanguage: "hi-IN" });

  // Test 8: Unrelated question -> politely declined
  await makeRequest("8. Unrelated question", { message: "Who won the cricket match?", selectedLanguage: "en-IN" });
}

runE2eTests();
