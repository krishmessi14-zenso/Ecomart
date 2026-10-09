import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Testing API key:", apiKey ? `${apiKey.slice(0, 8)}...` : "NO KEY");

const ai = new GoogleGenAI({ apiKey });

const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.0-flash-exp"];

async function test() {
  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        model: model,
        contents: "Hello, confirm working."
      });
      console.log(`✅ SUCCESS with model '${model}':`, res.text.trim());
      break;
    } catch (err) {
      console.error(`❌ FAILED with model '${model}':`, err.message);
    }
  }
}

test();
