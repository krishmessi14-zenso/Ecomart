/**
 * EcoMart AI Assistant Engine & Knowledge Base
 * Provides intelligent automated answers for eco-friendly product marketplace users.
 */

export const AI_SUGGESTED_PROMPTS = [
  "🌱 What is EcoMart and what products are sold here?",
  "🛍️ How do I buy eco-friendly products as a customer?",
  "📦 How do I list sustainable products as a vendor?",
  "♻️ How does EcoScore & Green Points work?",
  "🔐 How does the 6-digit OTP password reset work?",
  "🚚 How can I track my order delivery?",
];

const KNOWLEDGE_BASE = [
  {
    keywords: ["ecomart", "what is", "about", "how does it work", "overview", "platform", "products"],
    response: `🌱 **Welcome to EcoMart!**

EcoMart is a dedicated marketplace for **Sustainable, Eco-Friendly, and Zero-Waste Products**.

**What You Can Buy & Sell on EcoMart:**
• **Eco-Friendly Products:** Biodegradable packaging, compostable items, reusable household goods, eco fashion, and sustainable daily essentials.
• **EcoScore Transparency:** Every product features a calculated sustainability score (recyclability, plastic reduction, renewable energy).
• **Role-Based Portals:** Automated dashboards for Customers, Vendors, and Admins.
• **Green Points:** Earn rewards for purchasing eco-friendly products!`
  },
  {
    keywords: ["buy", "order", "purchase", "place order", "checkout", "payment", "cart"],
    response: `🛍️ **How to Purchase Sustainable Products:**

1. **Browse Marketplace:** Explore eco-friendly items by category, price (in INR ₹), or sustainability ratings.
2. **Add to Cart:** Select product quantity and click **Add to Cart**.
3. **Review Cart:** View your items and check your estimated Green Points earned.
4. **Checkout:** Enter your delivery address and choose your payment method (Cash on Delivery, UPI, or Card).
5. **Track Delivery:** Monitor live shipping status under **Order History**!`
  },
  {
    keywords: ["sell", "vendor", "list product", "add product", "moq", "tier", "sustainable products"],
    response: `📦 **How to Sell Sustainable Products as a Vendor:**

1. **Register as Vendor:** Sign up with your Store / Business Name.
2. **Go to Vendor Dashboard:** Access your **My Products** panel.
3. **Add Sustainable Product:** Click **+ Add Product** and fill in details:
   - Product Name, Eco Category, Price (in INR ₹), Available Stock
   - Eco-packaging type, recyclability score %, and material type
   - MOQ (Minimum Order Quantity) & Tier Pricing
4. **Publish:** Once submitted, your eco-friendly product goes live on the EcoMart Marketplace!`
  },
  {
    keywords: ["ecoscore", "eco score", "green points", "sustainability", "co2", "plastic", "recyclability"],
    response: `♻️ **EcoScore & Green Points Explained:**

• **EcoScore (0-100):** Automatically calculated based on product recyclability %, renewable energy manufacturing, plastic-free packaging, and material lifespan.
• **Green Points:** Points awarded to customers on every sustainable purchase!
• **Environmental Impact:** Track your plastic saved (kg), CO₂ reduced (kg), and tree equivalents planted on your Customer Dashboard!`
  },
  {
    keywords: ["password", "forgot password", "otp", "reset", "recover", "security", "code"],
    response: `🔐 **6-Digit OTP Password Reset:**

1. Click **"Forgot Password?"** on the Sign In page.
2. Enter your registered email address and click **"Send 6-Digit Code"**.
3. Check your email for the 6-digit OTP code.
4. Enter the 6-digit OTP along with your **New Password** and click **Reset Password**.
5. Log in with your updated credentials!`
  },
  {
    keywords: ["track", "delivery", "shipping", "status", "order history", "where is my order"],
    response: `🚚 **Order Delivery Tracking:**

• Go to **Order History** or click **Track Order** on your Customer Dashboard.
• Live status stages include: **Placed ➔ Processing ➔ Shipped ➔ Delivered**.
• You can view estimated delivery timelines, vendor details, and order receipts anytime!`
  },
  {
    keywords: ["currency", "rupees", "inr", "price", "payment currency"],
    response: `🇮🇳 **Currency Information:**

EcoMart operates entirely in **Indian Rupees (INR - ₹)**.
All product pricing, cart summaries, invoice receipts, and vendor sales are displayed and processed in **₹ Rupees**.`
  },
  {
    keywords: ["contact", "support", "help", "issue", "dispute", "cancel", "refund"],
    response: `🤝 **Customer Support & Inquiry:**

Need assistance?
• Go to the **Support** page from the top navigation header.
• You can send direct messages to vendors via the **Contact Vendor** button on product pages.
• Or email our support team at **support@ecomart.com**.`
  }
];

export function getAiResponse(userPrompt) {
  const query = userPrompt.toLowerCase().trim();

  if (!query) {
    return "Hello! How can I assist you with EcoMart's sustainable products today?";
  }

  // Find best match in knowledge base
  let bestMatch = null;
  let maxScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (query.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && maxScore > 0) {
    return bestMatch.response;
  }

  // Fallback intelligent response
  return `🤖 I'm your **EcoMart AI Assistant**. I understand you're asking about "${userPrompt}".

I can help you with:
• **Browsing & Buying Sustainable & Eco-Friendly Products** (in INR ₹)
• **Listing Eco-Products & Vendor Settings**
• **Understanding EcoScores & Green Points**
• **Account Security & 6-Digit OTP Password Reset**
• **Tracking Delivery Status & Support**

Try asking one of the suggested prompts below or rephrasing your question!`;
}
