import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({ apiKey });

const candidateModels = [
  "gemini-2.5-flash",
  "gemini-3.8-flash",
  "gemini-2.0-flash",
  "gemini-2.5-pro",
  "gemini-1.5-flash-8b"
];

async function run() {
  for (const model of candidateModels) {
    console.log(`Testing model: ${model}...`);
    try {
      const res = await ai.models.generateContent({
        model: model,
        contents: "Respond with OK"
      });
      console.log(`SUCCESS [${model}]: ${res.text}`);
    } catch (err) {
      console.log(`FAIL [${model}]: ${err.message}`);
    }
  }
}

run();
