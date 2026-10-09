import { processAiChat } from "../backend/services/aiService.js";

async function runTests() {
  console.log("==========================================");
  console.log("🤖 RUNNING CHATBOT REQUISITE TEST SUITE");
  console.log("==========================================");

  // 1. Customer: "Hi I am Krish"
  const userCustomer = { id: "u_cust_123", name: "Krish", role: "customer" };
  const t1 = Date.now();
  const res1 = await processAiChat({
    message: "Hi I am Krish",
    selectedLanguage: "en-IN",
    history: [],
    user: userCustomer
  });
  const d1 = Date.now() - t1;
  console.log(`\n1. Customer Greeting ("Hi I am Krish"):`);
  console.log(`⏱️ Response Time: ${d1}ms`);
  console.log(`💬 Reply:\n${res1.reply}\n`);

  // 2. Customer: "How many products are there?"
  const t2 = Date.now();
  const res2 = await processAiChat({
    message: "How many products are there?",
    selectedLanguage: "en-IN",
    history: [],
    user: userCustomer
  });
  const d2 = Date.now() - t2;
  console.log(`\n2. Product Count Query ("How many products are there?"):`);
  console.log(`⏱️ Response Time: ${d2}ms`);
  console.log(`💬 Reply:\n${res2.reply}\n`);

  // 3. Customer: "Find eco-friendly products" (must NOT call getMyProducts)
  const t3 = Date.now();
  const res3 = await processAiChat({
    message: "Find eco-friendly products",
    selectedLanguage: "en-IN",
    history: [],
    user: userCustomer
  });
  const d3 = Date.now() - t3;
  console.log(`\n3. Customer Search ("Find eco-friendly products"):`);
  console.log(`⏱️ Response Time: ${d3}ms`);
  console.log(`⚙️ Action Triggered / Tool: ${res3.actionTriggered || 'none'}`);
  console.log(`💬 Reply:\n${res3.reply}\n`);

  // 4. Customer: tap the "Find eco-friendly products" chip (fast path)
  const t4 = Date.now();
  const res4 = await processAiChat({
    message: "find eco-friendly products",
    selectedLanguage: "en-IN",
    history: [],
    user: userCustomer
  });
  const d4 = Date.now() - t4;
  console.log(`\n4. Chip Tap ("find eco-friendly products" - Fast Path):`);
  console.log(`⏱️ Response Time: ${d4}ms`);
  console.log(`💬 Reply:\n${res4.reply}\n`);

  // 5. Vendor: "List my products"
  const userVendor = { id: "u_vend_456", name: "EcoVendor", role: "vendor" };
  const t5 = Date.now();
  const res5 = await processAiChat({
    message: "List my products",
    selectedLanguage: "en-IN",
    history: [],
    user: userVendor
  });
  const d5 = Date.now() - t5;
  console.log(`\n5. Vendor Query ("List my products"):`);
  console.log(`⏱️ Response Time: ${d5}ms`);
  console.log(`⚙️ Action Triggered / Tool: ${res5.actionTriggered || 'none'}`);
  console.log(`💬 Reply:\n${res5.reply}\n`);

  // 6. Customer asking an admin question (must be refused)
  const t6 = Date.now();
  const res6 = await processAiChat({
    message: "How many total users are registered on the system?",
    selectedLanguage: "en-IN",
    history: [],
    user: userCustomer
  });
  const d6 = Date.now() - t6;
  console.log(`\n6. Customer Asking Admin Question ("How many total users are registered?"):`);
  console.log(`⏱️ Response Time: ${d6}ms`);
  console.log(`💬 Reply:\n${res6.reply}\n`);

  console.log("==========================================");
  console.log("✅ ALL TESTS COMPLETE");
  console.log("==========================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test runner error:", err);
  process.exit(1);
});
