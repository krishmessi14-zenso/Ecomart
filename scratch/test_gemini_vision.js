import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

// Sample small 1x1 transparent PNG base64 for testing
const sampleBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function testVision() {
  console.log("Testing Gemini Vision API...");
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: sampleBase64
              }
            },
            {
              text: `Analyze this item for plastic content and environmental impact. Respond ONLY with a valid JSON object matching this schema:
{
  "productName": "string",
  "material": "string",
  "estimatedPlasticWeightGrams": number,
  "estimatedCo2Kg": number,
  "category": "string",
  "sustainabilitySummary": "string"
}`
            }
          ]
        }
      ]
    });

    console.log("Gemini Vision response:\n", res.text);
  } catch (err) {
    console.error("Gemini Vision Error:", err.message);
  }
}

testVision();
