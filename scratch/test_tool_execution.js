import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { toolRegistry, geminiToolDeclarations } from "../backend/services/aiTools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

const userContext = { id: "u_krishmessi91", name: "Krish", role: "customer" };

const systemInstruction = `You are EcoMart AI Assistant. EcoMart is a sustainable shopping marketplace with EcoScores, Green Points, plastic-free products, order tracking, vendors and admins.
If the user introduces themselves ("Hi I am Krish"), reply "Hi Krish, how can I help you?" Also use the logged-in user's name if known (${userContext.name}).
Always reply in the selected language. Answer only from data returned by tools. Never invent numbers, products, prices or order statuses.
After answering, suggest a relevant next step when it helps.
Politely decline questions unrelated to EcoMart.
Keep replies short, friendly and clear.`;

async function testQuery(userMessage, role = "customer", language = "English") {
  console.log(`\n==================================================`);
  console.log(`QUERY: "${userMessage}" (Role: ${role}, Lang: ${language})`);
  console.log(`==================================================`);
  const user = role === "admin" ? { id: "u_admin1", name: "EcoMart Admin", role: "admin" } : userContext;

  const contents = [
    { role: "user", parts: [{ text: userMessage }] }
  ];

  try {
    const res1 = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: geminiToolDeclarations }]
      }
    });

    const candidate = res1.candidates?.[0];
    if (res1.functionCalls && res1.functionCalls.length > 0) {
      const call = res1.functionCalls[0];
      console.log(`🤖 Gemini invoked tool: [${call.name}] with args:`, call.args);

      const toolFn = toolRegistry[call.name];
      let toolResult = { error: `Tool ${call.name} not found.` };
      if (toolFn) {
        toolResult = await toolFn(call.args || {}, user);
      }
      console.log(`📊 Tool output:`, JSON.stringify(toolResult).slice(0, 200));

      // Append model response content (preserving thought signature) and functionResponse
      contents.push(candidate.content);
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: call.name,
            response: { result: toolResult }
          }
        }]
      });

      const res2 = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: contents,
        config: {
          systemInstruction: systemInstruction
        }
      });

      console.log(`💬 Gemini Final Reply:\n${res2.text}`);
    } else {
      console.log(`💬 Gemini Direct Reply:\n${res1.text}`);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

async function runAllTests() {
  await testQuery("Hi I am Krish");
  await testQuery("How many products are there?");
  await testQuery("Track my order EM-90214");
  await testQuery("Recommend a plastic-free water bottle");
  await testQuery("How many users are registered?", "admin");
  await testQuery("How many users are registered?", "customer");
  await testQuery("வேகமான விநியோகம் உள்ளதா?", "customer", "Tamil");
  await testQuery("Who won the cricket match?");
}

runAllTests();
