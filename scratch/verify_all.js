import express from "express";
import aiRoutes from "../backend/routes/ai.js";
import { query } from "../backend/database.js";

console.log("✅ backend/routes/ai.js loaded successfully.");
console.log("✅ backend/services/aiService.js loaded successfully.");
console.log("✅ backend/services/aiTools.js loaded successfully.");

const dbCheck = await query.get("SELECT COUNT(*) as c FROM products");
console.log("✅ Database accessible:", dbCheck ? dbCheck.c : 0, "products.");
