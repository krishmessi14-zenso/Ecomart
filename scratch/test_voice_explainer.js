const BASE_URL = "http://localhost:5000";

async function testVoiceExplainer() {
  console.log("🧪 Testing Gemini AI Voice Product Explainer Backend Integration...\n");

  try {
    // 1. Fetch sample product ID from database
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const products = await prodsRes.json();
    if (!products || products.length === 0) {
      console.error("❌ No products found in database.");
      return;
    }
    const sampleProduct = products[0];
    console.log(`1️⃣ Selected sample product: "${sampleProduct.name}" (ID: ${sampleProduct.id})\n`);

    // 2. Test English Product Voice Explainer
    console.log("2️⃣ Testing POST /api/ai/product-voice (English)...");
    const enRes = await fetch(`${BASE_URL}/api/ai/product-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: sampleProduct.id,
        customerQuestion: "Why is the Eco Score high and what material is used?",
        language: "en-US",
        userId: "u_krishmessi91"
      })
    });
    console.log(`   Response Status: ${enRes.status}`);
    const enData = await enRes.json();
    console.log(`   ✅ English Answer Generated (${enData.answer.length} chars).`);
    console.log(`   ✅ Recommendations count: ${enData.recommendedProducts?.length || 0}\n`);

    // 3. Test Tamil Product Voice Explainer
    console.log("3️⃣ Testing POST /api/ai/product-voice (Tamil ta-IN)...");
    const taRes = await fetch(`${BASE_URL}/api/ai/product-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: sampleProduct.id,
        customerQuestion: "இந்த தயாரிப்பு எவ்வாறு மறுசுழற்சி செய்யப்படுகிறது?",
        language: "ta-IN",
        userId: "u_krishmessi91"
      })
    });
    console.log(`   Response Status: ${taRes.status}`);
    const taData = await taRes.json();
    console.log(`   ✅ Tamil Answer Generated (${taData.answer.length} chars).\n`);

    // 4. Test Fetch History
    console.log("4️⃣ Testing GET /api/ai/product-voice/history/:productId...");
    const histRes = await fetch(`${BASE_URL}/api/ai/product-voice/history/${sampleProduct.id}`);
    console.log(`   Response Status: ${histRes.status}`);
    const history = await histRes.json();
    console.log(`   ✅ Fetched ${history.length} voice history record(s) from MySQL ai_voice_history table.\n`);

    console.log("🎉 ALL GEMINI AI VOICE PRODUCT EXPLAINER TESTS PASSED!");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
  }
}

testVoiceExplainer();
