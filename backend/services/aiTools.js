import { query } from "../database.js";
import { getOrderTimeline, normalizeStatus } from "./deliveryService.js";

/**
 * Controlled, read-only database tools executable by Gemini AI.
 * Enforces security & role-based permissions on every call.
 */

// Memory Cache (60 second TTL for static read-only data)
const memoryCache = {
  productCount: { data: null, expiresAt: 0 },
  categories: { data: null, expiresAt: 0 }
};

// 1. Get total count of approved products (cached 60s)
export async function getProductCount() {
  const now = Date.now();
  if (memoryCache.productCount.data && memoryCache.productCount.expiresAt > now) {
    return memoryCache.productCount.data;
  }
  try {
    const res = await query.get("SELECT COUNT(*) as count FROM products WHERE status = 'approved'");
    const result = { count: res ? Number(res.count) : 0 };
    memoryCache.productCount = { data: result, expiresAt: now + 60000 };
    return result;
  } catch (err) {
    console.error("getProductCount error:", err);
    return { count: 0 };
  }
}

// 2. Search products by query, category, maxPrice (max 5 items, plain JSON)
export async function searchProducts({ query: queryText = "", category = "", maxPrice = null }) {
  try {
    let sql = "SELECT id, name, category, price, currency, stock, ecoScore, materialType, packagingType, description, imageUrl FROM products WHERE status = 'approved'";
    const params = [];

    if (queryText && String(queryText).trim()) {
      sql += " AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(materialType) LIKE ? OR LOWER(category) LIKE ?)";
      const term = `%${String(queryText).trim().toLowerCase()}%`;
      params.push(term, term, term, term);
    }

    if (category && String(category).trim()) {
      sql += " AND LOWER(category) LIKE ?";
      params.push(`%${String(category).trim().toLowerCase()}%`);
    }

    if (maxPrice !== null && !isNaN(Number(maxPrice))) {
      sql += " AND price <= ?";
      params.push(Number(maxPrice));
    }

    sql += " ORDER BY ecoScore DESC LIMIT 5";
    const rawProducts = await query.all(sql, params);
    const products = (rawProducts || []).map(p => ({
      id: String(p.id),
      name: String(p.name || ""),
      category: String(p.category || ""),
      price: Number(p.price || 0),
      currency: String(p.currency || "INR"),
      stock: Number(p.stock || 0),
      ecoScore: Number(p.ecoScore || 0),
      materialType: String(p.materialType || ""),
      imageUrl: String(p.imageUrl || "")
    }));
    return { products };
  } catch (err) {
    console.error("searchProducts error:", err);
    return { products: [] };
  }
}

// 3. Get top eco-friendly products sorted by EcoScore (max 5 items, plain JSON)
export async function getEcoFriendlyProducts() {
  try {
    const rawProducts = await query.all(
      "SELECT id, name, category, price, ecoScore, materialType, packagingType, co2SavedKg, plasticSavedKg, imageUrl FROM products WHERE status = 'approved' ORDER BY ecoScore DESC LIMIT 5"
    );
    const products = (rawProducts || []).map(p => ({
      id: String(p.id),
      name: String(p.name || ""),
      category: String(p.category || ""),
      price: Number(p.price || 0),
      ecoScore: Number(p.ecoScore || 0),
      materialType: String(p.materialType || ""),
      co2SavedKg: Number(p.co2SavedKg || 0),
      plasticSavedKg: Number(p.plasticSavedKg || 0),
      imageUrl: String(p.imageUrl || "")
    }));
    return { products };
  } catch (err) {
    console.error("getEcoFriendlyProducts error:", err);
    return { products: [] };
  }
}

// 4. Get specific product details by ID or name match
export async function getProductDetails({ id }) {
  if (!id) return { error: "Product ID or name is required." };
  try {
    let product = await query.get("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) {
      product = await query.get("SELECT * FROM products WHERE LOWER(name) LIKE ? AND status = 'approved'", [`%${String(id).toLowerCase()}%`]);
    }
    if (!product) return { error: `Product '${id}' not found.` };
    return {
      product: {
        id: String(product.id),
        name: String(product.name || ""),
        category: String(product.category || ""),
        price: Number(product.price || 0),
        ecoScore: Number(product.ecoScore || 0),
        stock: Number(product.stock || 0),
        materialType: String(product.materialType || ""),
        description: String(product.description || ""),
        imageUrl: String(product.imageUrl || "")
      }
    };
  } catch (err) {
    console.error("getProductDetails error:", err);
    return { error: "Failed to retrieve product details." };
  }
}

// 5. Get list of distinct product categories (cached 60s)
export async function getCategories() {
  const now = Date.now();
  if (memoryCache.categories.data && memoryCache.categories.expiresAt > now) {
    return memoryCache.categories.data;
  }
  try {
    const rows = await query.all("SELECT DISTINCT category FROM products WHERE status = 'approved'");
    const categories = (rows || []).map((r) => String(r.category || "")).filter(Boolean);
    const result = { categories };
    memoryCache.categories = { data: result, expiresAt: now + 60000 };
    return result;
  } catch (err) {
    console.error("getCategories error:", err);
    return { categories: [] };
  }
}

// 6. Explain EcoScore calculation for a product
export async function explainEcoScore({ productId }) {
  if (!productId) return { error: "Product ID is required." };
  try {
    let product = await query.get("SELECT * FROM products WHERE id = ?", [productId]);
    if (!product) {
      product = await query.get("SELECT * FROM products WHERE LOWER(name) LIKE ?", [`%${String(productId).toLowerCase()}%`]);
    }
    if (!product) return { error: `Product '${productId}' not found.` };

    const score = Number(product.ecoScore || 0);
    const material = String(product.materialType || "Sustainable material");
    const packaging = String(product.packagingType || "Minimal plastic");
    const recyclability = Number(product.recyclability || 80);

    const explanation = `Product '${product.name}' has an EcoScore of ${score}/100. Breakdown:\n` +
      `- Material (${material}): high sustainability grade\n` +
      `- Packaging (${packaging}): zero plastic waste\n` +
      `- Recyclability: ${recyclability}%\n` +
      `- Estimated Savings: ${product.plasticSavedKg || 0.5}kg plastic eliminated, ${product.co2SavedKg || 2.1}kg CO2 saved.`;

    return {
      productId: String(product.id),
      productName: String(product.name),
      ecoScore: score,
      materialType: material,
      packagingType: packaging,
      recyclability: recyclability,
      co2SavedKg: Number(product.co2SavedKg || 0),
      plasticSavedKg: Number(product.plasticSavedKg || 0),
      explanation
    };
  } catch (err) {
    console.error("explainEcoScore error:", err);
    return { error: "Failed to explain EcoScore." };
  }
}

// ---------------- CUSTOMER TOOLS ----------------

// 7. Get status of a specific order
export async function getOrderStatus({ orderId }, user) {
  if (!user) return { error: "Authentication required to view order status. Please log in." };
  if (!orderId) return { error: "Order ID is required." };

  try {
    let targetId = String(orderId).trim();
    let order = await query.get("SELECT * FROM orders WHERE id = ?", [targetId]);
    if (!order) {
      const match = await query.get("SELECT * FROM orders WHERE id LIKE ?", [`%${targetId}%`]);
      if (match) order = match;
    }

    if (!order) return { error: `Order #${orderId} was not found.` };

    if (user.role === "customer" && order.customerId && String(order.customerId) !== String(user.id)) {
      return { error: "Access denied. You can only view orders associated with your account." };
    }

    const timeline = await getOrderTimeline(order.id);
    return {
      orderId: String(order.id),
      customerName: String(order.customerName || ""),
      status: String(normalizeStatus(order.status)),
      totalAmount: Number(order.totalAmount || 0),
      currency: String(order.currency || "INR"),
      paymentStatus: String(order.paymentStatus || "pending"),
      deliveryCity: String(order.deliveryCity || ""),
      estimatedDelivery: String(timeline?.estimatedDelivery || "2-4 business days"),
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : String(order.createdAt || "")
    };
  } catch (err) {
    console.error("getOrderStatus error:", err);
    return { error: "Failed to retrieve order status." };
  }
}

// 8. Get orders of the logged-in customer (max 5 items)
export async function getMyOrders(_params, user) {
  if (!user) return { error: "Please log in to view your orders." };
  try {
    let orders = [];
    if (user.role === "vendor") {
      orders = await query.all(
        "SELECT DISTINCT o.* FROM orders o JOIN order_items oi ON o.id = oi.orderId WHERE oi.vendorId = ? ORDER BY o.createdAt DESC LIMIT 5",
        [user.id]
      );
    } else {
      orders = await query.all(
        "SELECT * FROM orders WHERE customerId = ? ORDER BY createdAt DESC LIMIT 5",
        [user.id]
      );
    }

    const formatted = (orders || []).map((o) => ({
      orderId: String(o.id),
      status: String(normalizeStatus(o.status)),
      totalAmount: Number(o.totalAmount || 0),
      currency: String(o.currency || "INR"),
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : String(o.createdAt || "")
    }));

    return { orders: formatted };
  } catch (err) {
    console.error("getMyOrders error:", err);
    return { orders: [] };
  }
}

// 9. Get Green Points and impact profile of logged-in user
export async function getGreenPoints(_params, user) {
  if (!user) return { error: "Please log in to view your Green Points." };
  try {
    const userInfo = await query.get("SELECT id, name, greenPoints FROM users WHERE id = ?", [user.id]);
    const orders = await query.all("SELECT id FROM orders WHERE customerId = ?", [user.id]);
    const count = orders ? orders.length : 0;
    const points = userInfo ? Number(userInfo.greenPoints || 0) : 0;

    return {
      userName: String(userInfo?.name || user.name || "Customer"),
      greenPoints: points,
      totalOrdersPlaced: count,
      plasticSavedKg: parseFloat((count * 0.45).toFixed(2)),
      co2SavedKg: parseFloat((count * 3.2).toFixed(2))
    };
  } catch (err) {
    console.error("getGreenPoints error:", err);
    return { error: "Failed to load Green Points." };
  }
}

// ---------------- VENDOR TOOLS ----------------

// 10. Get products listed by logged-in vendor (max 10 items)
export async function getMyProducts(_params, user) {
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return { error: "Access denied. Vendor login required to view vendor products." };
  }
  try {
    const products = await query.all(
      "SELECT id, name, category, price, stock, ecoScore, status FROM products WHERE vendorId = ? LIMIT 10",
      [user.id]
    );
    const formatted = (products || []).map((p) => ({
      id: String(p.id),
      name: String(p.name || ""),
      category: String(p.category || ""),
      price: Number(p.price || 0),
      stock: Number(p.stock || 0),
      ecoScore: Number(p.ecoScore || 0),
      status: String(p.status || "")
    }));
    return { products: formatted };
  } catch (err) {
    console.error("getMyProducts error:", err);
    return { products: [] };
  }
}

// 11. Get sales and revenue summary for logged-in vendor
export async function getMySales(_params, user) {
  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return { error: "Access denied. Vendor login required to view sales summary." };
  }
  try {
    const items = await query.all("SELECT * FROM order_items WHERE vendorId = ?", [user.id]);
    const totalRevenue = (items || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalUnitsSold = (items || []).reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    return {
      vendorId: String(user.id),
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalUnitsSold: Number(totalUnitsSold),
      totalOrderItems: items ? items.length : 0
    };
  } catch (err) {
    console.error("getMySales error:", err);
    return { error: "Failed to calculate vendor sales." };
  }
}

// ---------------- ADMIN TOOLS ----------------

// 13. Get total count of registered users (Admin only)
export async function getTotalUsers(_params, user) {
  if (!user || user.role !== "admin") {
    return { error: "Access denied. Only administrators can access system user counts." };
  }
  try {
    const allUsers = await query.all("SELECT role FROM users");
    const total = allUsers ? allUsers.length : 0;
    const customers = (allUsers || []).filter((u) => u.role === "customer").length;
    const vendors = (allUsers || []).filter((u) => u.role === "vendor").length;
    const admins = (allUsers || []).filter((u) => u.role === "admin").length;

    return { totalUsers: total, customersCount: customers, vendorsCount: vendors, adminsCount: admins };
  } catch (err) {
    console.error("getTotalUsers error:", err);
    return { error: "Failed to fetch total users." };
  }
}

// 14. Get total count of vendors (Admin only)
export async function getTotalVendors(_params, user) {
  if (!user || user.role !== "admin") {
    return { error: "Access denied. Vendor count metrics are restricted to administrators." };
  }
  try {
    const vendors = await query.all("SELECT id, name, storeName FROM users WHERE role = 'vendor'");
    return { totalVendors: vendors ? vendors.length : 0 };
  } catch (err) {
    console.error("getTotalVendors error:", err);
    return { error: "Failed to fetch vendor metrics." };
  }
}

// 15. Get total count of orders across marketplace (Admin only)
export async function getTotalOrders(_params, user) {
  if (!user || user.role !== "admin") {
    return { error: "Access denied. Total order metrics are restricted to administrators." };
  }
  try {
    const orders = await query.all("SELECT id FROM orders");
    return { totalOrders: orders ? orders.length : 0 };
  } catch (err) {
    console.error("getTotalOrders error:", err);
    return { error: "Failed to fetch total orders." };
  }
}

// 16. Get revenue summary across marketplace (Admin only)
export async function getRevenueSummary(_params, user) {
  if (!user || user.role !== "admin") {
    return { error: "Access denied. Financial revenue metrics are restricted to administrators." };
  }
  try {
    const orders = await query.all("SELECT totalAmount, paymentStatus FROM orders");
    const grossRevenue = (orders || []).reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const paidOrders = (orders || []).filter((o) => String(o.paymentStatus).toLowerCase() === "completed" || String(o.paymentStatus).toLowerCase() === "paid").length;

    return {
      grossRevenue: parseFloat(grossRevenue.toFixed(2)),
      totalOrders: orders ? orders.length : 0,
      paidOrdersCount: paidOrders
    };
  } catch (err) {
    console.error("getRevenueSummary error:", err);
    return { error: "Failed to calculate revenue summary." };
  }
}

// 17. Get pending product approvals (Admin only)
export async function getPendingApprovals(_params, user) {
  if (!user || user.role !== "admin") {
    return { error: "Access denied. Pending product approvals are accessible to administrators only." };
  }
  try {
    const pending = await query.all("SELECT id, name, category, price, vendorId FROM products WHERE status = 'pending'");
    return { pendingCount: pending ? pending.length : 0 };
  } catch (err) {
    console.error("getPendingApprovals error:", err);
    return { error: "Failed to fetch pending approvals." };
  }
}

// Function definitions map for execution
export const toolRegistry = {
  getProductCount,
  searchProducts,
  getEcoFriendlyProducts,
  getProductDetails,
  getCategories,
  explainEcoScore,
  getOrderStatus,
  getMyOrders,
  getGreenPoints,
  getMyProducts,
  getMySales,
  getTotalUsers,
  getTotalVendors,
  getTotalOrders,
  getRevenueSummary,
  getPendingApprovals
};

// Tool Declarations for Gemini API Function Calling
export const geminiToolDeclarations = [
  {
    name: "getProductCount",
    description: "Get the total count of approved products available in the EcoMart store.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "searchProducts",
    description: "Search EcoMart products by keyword, category, or maximum price.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search keyword like plastic-free, water bottle, bamboo" },
        category: { type: "STRING", description: "Product category name" },
        maxPrice: { type: "NUMBER", description: "Maximum price filter in INR" }
      }
    }
  },
  {
    name: "getEcoFriendlyProducts",
    description: "Get top sustainable products with highest EcoScores.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getProductDetails",
    description: "Get details for a specific product by ID or exact product name.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "STRING", description: "Product ID or product name" }
      },
      required: ["id"]
    }
  },
  {
    name: "getCategories",
    description: "Get all distinct product categories in EcoMart.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "explainEcoScore",
    description: "Explain the EcoScore breakdown and sustainability impact for a given product ID.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "The product ID" }
      },
      required: ["productId"]
    }
  },
  {
    name: "getOrderStatus",
    description: "Get live order tracking status for a customer order ID (e.g. EM-90214 or 90214).",
    parameters: {
      type: "OBJECT",
      properties: {
        orderId: { type: "STRING", description: "The order ID to track" }
      },
      required: ["orderId"]
    }
  },
  {
    name: "getMyOrders",
    description: "Get all past and current orders for the logged-in user.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getGreenPoints",
    description: "Get the logged-in customer's Green Points balance and eco impact metrics.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getMyProducts",
    description: "Get products listed by the logged-in vendor. Strictly for vendor role only.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getMySales",
    description: "Get sales summary, total revenue, and units sold for the logged-in vendor. Strictly for vendor role only.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getTotalUsers",
    description: "Admin tool: Get the total count of registered users in EcoMart.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getTotalVendors",
    description: "Admin tool: Get the total count of registered vendors.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getTotalOrders",
    description: "Admin tool: Get total count of orders placed across EcoMart.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getRevenueSummary",
    description: "Admin tool: Get financial revenue summary for EcoMart platform.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "getPendingApprovals",
    description: "Admin tool: Get list and count of vendor products awaiting admin approval.",
    parameters: { type: "OBJECT", properties: {} }
  }
];

// Helper to filter tools strictly based on user role
export function getToolsForRole(role = "customer") {
  const allowedNames = [
    "getProductCount",
    "searchProducts",
    "getEcoFriendlyProducts",
    "getProductDetails",
    "getCategories",
    "explainEcoScore",
    "getOrderStatus",
    "getMyOrders",
    "getGreenPoints"
  ];

  if (role === "vendor") {
    allowedNames.push("getMyProducts", "getMySales");
  } else if (role === "admin") {
    allowedNames.push(
      "getMyProducts",
      "getMySales",
      "getTotalUsers",
      "getTotalVendors",
      "getTotalOrders",
      "getRevenueSummary",
      "getPendingApprovals"
    );
  }

  const declarations = geminiToolDeclarations.filter((d) => allowedNames.includes(d.name));
  const registry = {};
  for (const name of allowedNames) {
    if (toolRegistry[name]) {
      registry[name] = toolRegistry[name];
    }
  }

  return { declarations, registry };
}

