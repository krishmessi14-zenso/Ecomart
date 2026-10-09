import fetch from "node-fetch";

// Base64 payload with luminance > 50 so pixel check passes
const brightBuffer = Buffer.alloc(2000, 180); // mid-bright gray pixels
const validBase64 = "data:image/jpeg;base64," + brightBuffer.toString("base64");

async function testScan() {
  try {
    const res = await fetch("http://localhost:5000/api/scan/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: validBase64,
        fileName: "bamboo_toothbrush.jpg",
        userId: "u_krishmessi91"
      })
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Analysis:", JSON.stringify(data.analysis, null, 2));
    console.log("Recommendations Count:", data.recommendations ? data.recommendations.length : 0);
    console.log("Recommendations Items:", data.recommendations ? data.recommendations.map(p => `${p.name} (Status: ${p.status || 'approved'}, Eco: ${p.ecoScore})`) : []);
  } catch (err) {
    console.error("Test scan failed:", err.message);
  }
}

testScan();
