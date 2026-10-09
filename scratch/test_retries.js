import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const tools = [
  {
    functionDeclarations: [
      {
        name: "getProductCount",
        description: "Get the total count of approved products in the EcoMart database.",
        parameters: {
          type: "OBJECT",
          properties: {}
        }
      }
    ]
  }
];

const models = ["gemini-3.8-flash", "gemini-3.1-pro-preview"];

async function runTest() {
  for (const model of models) {
    console.log(`Testing ${model}...`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt} for ${model}...`);
        const res = await ai.models.generateContent({
          model: model,
          contents: "How many products are in the store?",
          config: {
            tools: tools
          }
        });
        console.log(`✅ SUCCESS with ${model}:`);
        console.log("Function calls:", res.functionCalls);
        console.log("Text:", res.text);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

runTest();
