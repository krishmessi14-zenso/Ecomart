import express from "express";
import jwt from "jsonwebtoken";
import { processAiChat } from "../services/aiService.js";

const router = express.Router();

const getJwtSecret = () => {
  return process.env.JWT_SECRET || "ecomart_dev_jwt_secret_key_change_in_production";
};

// Helper middleware to extract user from Authorization header if available
export function extractOptionalUser(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
    } catch {
      // Invalid token - clear user object
      req.user = null;
    }
  }
  next();
}

// POST /api/chat - Main AI Assistant Chat Endpoint
router.post("/chat", extractOptionalUser, async (req, res) => {
  const { message, selectedLanguage, language, history } = req.body;
  
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "A valid 'message' string is required." });
  }

  try {
    const user = req.user || null;
    const lang = selectedLanguage || language || "en-IN";

    const result = await processAiChat({
      message: message.trim(),
      selectedLanguage: lang,
      history: Array.isArray(history) ? history : [],
      user
    });

    res.json(result);
  } catch (err) {
    console.error("AI Chat endpoint error:", err);
    res.json({
      reply: "I am having trouble processing your request at the moment. How else can I help you navigate EcoMart?",
      language: selectedLanguage || "English"
    });
  }
});

// Alias POST /api/ai/chat for backwards compatibility
router.post("/ai/chat", extractOptionalUser, async (req, res) => {
  const { message, selectedLanguage, language, history } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "A valid 'message' string is required." });
  }

  try {
    const user = req.user || null;
    const lang = selectedLanguage || language || "en-IN";

    const result = await processAiChat({
      message: message.trim(),
      selectedLanguage: lang,
      history: Array.isArray(history) ? history : [],
      user
    });

    res.json(result);
  } catch (err) {
    console.error("AI Chat endpoint error:", err);
    res.json({
      reply: "I am having trouble processing your request at the moment. How else can I help you navigate EcoMart?",
      language: selectedLanguage || "English"
    });
  }
});

export default router;
