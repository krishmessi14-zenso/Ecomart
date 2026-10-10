import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getToolsForRole, getEcoFriendlyProducts, searchProducts, getMyOrders, getGreenPoints } from "./aiTools.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

// Detect language from text or language code
export function normalizeLanguage(requestedLang, text = "") {
  if (requestedLang === "ta-IN" || requestedLang === "ta" || /[\u0B80-\u0BFF]/.test(text)) {
    return "Tamil";
  }
  if (requestedLang === "hi-IN" || requestedLang === "hi" || /[\u0900-\u097F]/.test(text)) {
    return "Hindi";
  }
  return "English";
}

// Build system prompt for Gemini
function getSystemPrompt(user, language = "English") {
  const userName = user ? user.name || "Customer" : "Customer";
  const userRole = user ? user.role || "customer" : "customer";

  return `You are EcoMart AI Assistant, a friendly and helpful AI advisor for EcoMart — a sustainable zero-waste e-commerce marketplace in India.

CRITICAL INSTRUCTIONS & RULES:
1. EcoMart features EcoScores (0-100), Green Points, plastic-free products, order tracking, vendors, and admins.
2. Logged in user: Name = "${userName}", Role = "${userRole}".
3. If the user introduces themselves ("Hi I am Krish" or "My name is Krish"), reply "Hi Krish, how can I help you?" Always address the user warmly.
4. ALWAYS reply in the requested language: ${language}. (If Tamil, use clear Tamil. If Hindi, use clear Hindi. If English, use clear English).
5. Answer ONLY using real data returned by tools. Never invent numbers, products, prices, or order statuses.
6. For general product searches, use searchProducts or getEcoFriendlyProducts. Use getMyProducts only when a vendor asks about their own products.
7. Politely decline any questions unrelated to EcoMart (e.g., sports, weather, general trivia).
8. Keep replies short, friendly, clear, and nicely formatted in markdown.`;
}

// Fallback message generator when Gemini fails or is offline
function getSmartFallbackResponse(message, user, language = "English") {
  const cleanMsg = (message || "").toLowerCase().trim();
  let nameStr = "";
  const nameMatch = cleanMsg.match(/(?:i am|i'm|my name is|im)\s+([a-zA-Z0-9_-]+)/i);
  if (nameMatch && nameMatch[1]) {
    nameStr = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
  } else if (user && user.name) {
    nameStr = user.name;
  }

  if (cleanMsg.includes("hi") || cleanMsg.includes("hello") || cleanMsg.includes("hey") || cleanMsg.includes("வணக்கம்") || cleanMsg.includes("नमस्ते")) {
    const greeting = nameStr ? `Hi ${nameStr}, how can I help you?` : "Hi! How can I help you today?";
    if (language === "Tamil") {
      return `வணக்கம் ${nameStr ? nameStr : ''}! EcoMart AI உதவியாளருக்கு உங்களை வரவேற்கிறோம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?`;
    }
    if (language === "Hindi") {
      return `नमस्ते ${nameStr ? nameStr : ''}! EcoMart AI सहायक में आपका स्वागत है। मैं आपकी कैसे मदद कर सकता हूँ?`;
    }
    return `${greeting}\n\nWould you like to explore plastic-free products, check your order status, or view your Green Points balance?`;
  }

  if (language === "Tamil") {
    return "நன்றி! உங்கள் EcoMart கேள்விகளுக்கு உதவ நான் தயாராக உள்ளேன். தயாரிப்புகள், ஆர்டர்கள் அல்லது பசுமை புள்ளிகள் பற்றி கேட்கவும்.";
  }
  if (language === "Hindi") {
    return "धन्यवाद! मैं EcoMart उत्पादों, ऑर्डर ट्रैकिंग और ग्रीन पॉइंट्स के बारे में आपकी मदद कर सकता हूँ।";
  }

  return `I am processing your query regarding "${message}". How can I assist you with EcoMart products, orders, or Green Points today?`;
}

// Format history to start with 'user' and alternate 'user'/'model'
function sanitizeAndFormatHistory(history, currentMessage) {
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-6);
    let expectedRole = "user";
    for (const h of recent) {
      if (!h || !h.text || typeof h.text !== "string" || !h.text.trim()) continue;
      const role = h.sender === "user" ? "user" : "model";
      if (role === expectedRole) {
        contents.push({
          role: role,
          parts: [{ text: h.text.trim() }]
        });
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }
  }

  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    contents.pop();
  }

  contents.push({
    role: "user",
    parts: [{ text: currentMessage }]
  });

  return contents;
}

// Main processAiChat logic for POST /api/chat
export async function processAiChat({ message, selectedLanguage, history = [], user = null }) {
  if (!message || !message.trim()) {
    throw new Error("A valid message string is required.");
  }

  const cleanMessage = message.trim();
  const lowerMsg = cleanMessage.toLowerCase();
  const language = normalizeLanguage(selectedLanguage, cleanMessage);

  // Fast Path for Quick Reply Chips (<1s response time)
  if (lowerMsg === "find eco-friendly products" || lowerMsg === "find eco friendly products") {
    const data = await getEcoFriendlyProducts();
    const products = data.products || [];
    let replyText = "🌱 **Here are top rated eco-friendly products on EcoMart:**\n\n";
    products.forEach((p, idx) => {
      replyText += `${idx + 1}. **${p.name}** — ₹${p.price} (EcoScore: ${p.ecoScore}/100, Material: ${p.materialType})\n`;
    });
    replyText += "\nTap any product card below to view full details!";
    return {
      reply: replyText,
      language,
      recommendations: products,
      actionTriggered: "recommend_products"
    };
  }

  if (lowerMsg === "track my order") {
    if (!user) {
      return {
        reply: "Please log in to track your active orders, or provide your specific order ID (e.g. EM-10482).",
        language
      };
    }
    const data = await getMyOrders({}, user);
    const orders = data.orders || [];
    let replyText = "";
    if (orders.length === 0) {
      replyText = "You don't have any active or past orders placed yet.";
    } else {
      replyText = `📦 **Your Recent Orders (${orders.length}):**\n\n`;
      orders.forEach((o) => {
        replyText += `- **Order #${o.orderId}**: Status: **${o.status}** | Total: ₹${o.totalAmount}\n`;
      });
    }
    return {
      reply: replyText,
      language,
      actionTriggered: "track_order"
    };
  }

  if (lowerMsg === "how many green points do i have?" || lowerMsg === "green points") {
    if (!user) {
      return {
        reply: "Please log in to view your Green Points balance and eco impact details.",
        language
      };
    }
    const data = await getGreenPoints({}, user);
    return {
      reply: `💎 **Green Points Balance for ${data.userName}:**\n\nYou currently have **${data.greenPoints} Green Points**!\n\n🌱 Total Impact: You have saved **${data.plasticSavedKg}kg plastic** and avoided **${data.co2SavedKg}kg CO₂** across ${data.totalOrdersPlaced} orders!`,
      language
    };
  }

  if (lowerMsg === "what is ecoscore?" || lowerMsg === "what is eco score") {
    return {
      reply: "🌱 **What is EcoScore?**\n\nEcoScore is EcoMart's 0-100 sustainability index evaluated for every product. It measures:\n- **Sustainable Material Grade** (Organic cotton, bamboo, glass)\n- **Zero-Plastic Packaging**\n- **Recyclability & Renewable Manufacturing**\n- **Carbon Footprint Avoidance**\n\nHigher EcoScores earn you more Green Points!",
      language
    };
  }

  // Fast Path: Product Display / Search Intent Handler
  const displayKeywords = ["display", "show", "explain", "detail", "view", "find", "search", "recommend", "bag", "bottle", "brush", "straw", "product"];
  if (displayKeywords.some((kw) => lowerMsg.includes(kw))) {
    let searchTerm = lowerMsg
      .replace(/^(display|show|open|view|explain|tell me about|recommend|find)\s+(that|the|a|an)?\s*/gi, "")
      .replace(/product/gi, "")
      .trim();

    if (!searchTerm && history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const text = (history[i]?.text || "").toLowerCase();
        if (text && !text.includes("display") && !text.includes("show")) {
          searchTerm = text.replace(/^(explain|tell me about|what is|how about)\s+(that|the|a|an)?\s*/gi, "").trim();
          if (searchTerm) break;
        }
      }
    }

    if (!searchTerm) searchTerm = "eco";
    const searchRes = await searchProducts({ queryText: searchTerm });
    const matchedProds = searchRes.products && searchRes.products.length > 0
      ? searchRes.products
      : (await getEcoFriendlyProducts()).products;

    if (matchedProds && matchedProds.length > 0) {
      let replyText = `🛍️ **Here are the product details for "${searchTerm}":**\n\n`;
      matchedProds.slice(0, 3).forEach((p, idx) => {
        replyText += `${idx + 1}. **${p.name}** — ₹${p.price} (EcoScore: ${p.ecoScore}/100, Material: ${p.materialType})\n`;
      });
      replyText += "\nTap any product card below to view complete specifications!";
      return {
        reply: replyText,
        language,
        recommendations: matchedProds.slice(0, 3),
        actionTriggered: "search_products"
      };
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.length < 10) {
    console.warn("⚠️ GEMINI_API_KEY missing or invalid in env.");
    return {
      reply: getSmartFallbackResponse(cleanMessage, user, language),
      language
    };
  }

  const coreProcess = async () => {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = getSystemPrompt(user, language);
    const contents = sanitizeAndFormatHistory(history, cleanMessage);

    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
    const userRole = user ? user.role || "customer" : "customer";
    const { declarations: roleDeclarations, registry: roleRegistry } = getToolsForRole(userRole);

    let finalReply = null;
    let actionTriggered = null;
    let extractedRecommendations = [];

    const toolExecutionCache = new Map();

    for (const modelName of candidateModels) {
      try {
        let currentContents = JSON.parse(JSON.stringify(contents));
        let round = 0;
        const maxRounds = 4;

        while (round < maxRounds) {
          round++;

          const res = await ai.models.generateContent({
            model: modelName,
            contents: currentContents,
            config: {
              systemInstruction: systemInstruction,
              tools: roleDeclarations.length > 0 ? [{ functionDeclarations: roleDeclarations }] : [],
              maxOutputTokens: 400
            }
          });

          // Check for function calls FIRST - NEVER call res.text if functionCalls exist!
          const fnCalls = res.functionCalls;
          if (fnCalls && fnCalls.length > 0) {
            const candidate = res.candidates?.[0];
            if (candidate?.content) {
              currentContents.push(candidate.content);
            } else {
              currentContents.push({
                role: "model",
                parts: fnCalls.map((c) => ({ functionCall: c }))
              });
            }

            // Execute tools in parallel with 5s timeout
            const toolResponses = await Promise.all(
              fnCalls.map(async (call) => {
                actionTriggered = call.name;
                const cacheKey = `${call.name}:${JSON.stringify(call.args || {})}`;

                let result;
                if (toolExecutionCache.has(cacheKey)) {
                  result = toolExecutionCache.get(cacheKey);
                } else {
                  const toolFn = roleRegistry[call.name];
                  if (!toolFn) {
                    result = { error: `Tool '${call.name}' is not allowed for your role.` };
                  } else {
                    try {
                      const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Tool execution timeout")), 5000)
                      );
                      result = await Promise.race([toolFn(call.args || {}, user), timeoutPromise]);
                    } catch (tErr) {
                      console.warn(`⚠️ Tool ${call.name} failed/timed out:`, tErr.message);
                      result = { error: `Tool ${call.name} execution failed or timed out.` };
                    }
                  }
                  toolExecutionCache.set(cacheKey, result);
                }

                if (result && Array.isArray(result.products)) {
                  extractedRecommendations.push(...result.products);
                }

                return {
                  functionResponse: {
                    name: call.name,
                    response: { result: result || {} }
                  }
                };
              })
            );

            currentContents.push({
              role: "user",
              parts: toolResponses
            });

            continue;
          }

          // No function calls: read text response
          if (res.text && res.text.trim()) {
            finalReply = res.text.trim();
            break;
          }
        }

        if (finalReply) break;
      } catch (err) {
        console.warn(`⚠️ [Gemini Model ${modelName} Error]:`, err.message);
      }
    }

    if (!finalReply) {
      finalReply = getSmartFallbackResponse(cleanMessage, user, language);
    }

    return {
      reply: finalReply,
      language,
      actionTriggered,
      recommendations: extractedRecommendations
    };
  };

  try {
    const serverTimeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Server Timeout")), 15000)
    );
    return await Promise.race([coreProcess(), serverTimeoutPromise]);
  } catch (err) {
    return {
      reply: getSmartFallbackResponse(cleanMessage, user, language),
      language
    };
  }
}

