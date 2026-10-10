import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const storeFilePath = join(__dirname, "data_store.json");

// In-Memory & Persistent File Database Store (Used when MySQL server is not running on localhost:3306)
const memoryStore = {
  users: [],
  products: [],
  orders: [],
  order_items: [],
  notifications: [],
  reviews: [],
  saved_searches: [],
  coupons: [],
  scan_history: [],
  recommendation_logs: [],
  email_otps: [],
  ai_conversations: [],
  order_status_history: [],
  voice_history: [],
  offers: []
};

let useMemoryStore = false;
let mysqlPool = null;
let dbMode = "starting";

export function getDbMode() {
  return dbMode;
}

// Persistent File Storage Helpers
function loadMemoryStore() {
  try {
    if (fs.existsSync(storeFilePath)) {
      const fileData = fs.readFileSync(storeFilePath, "utf8");
      const parsed = JSON.parse(fileData);
      Object.keys(memoryStore).forEach((key) => {
        if (Array.isArray(parsed[key])) {
          memoryStore[key] = parsed[key];
        }
      });
      if (!Array.isArray(memoryStore.offers)) memoryStore.offers = [];
      console.log(
        `💾 EcoMart Persistent Data Store loaded: ${memoryStore.products.length} product(s), ${memoryStore.users.length} user(s), ${memoryStore.orders.length} order(s), ${memoryStore.offers.length} offer(s).`
      );
      return true;
    }
  } catch (err) {
    console.warn("⚠️ Failed to load data_store.json file:", err.message);
  }
  return false;
}

function saveMemoryStore() {
  try {
    const tempPath = `${storeFilePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(memoryStore, null, 2), "utf8");
    fs.renameSync(tempPath, storeFilePath);
  } catch (err) {
    console.error("❌ Failed to save data_store.json file:", err.message);
  }
}

let dbReady = Promise.resolve();

const internalQuery = {
  all: async (sql, params = []) => {
    if (!useMemoryStore && mysqlPool) {
      const [rows] = await mysqlPool.query(sql, params);
      return rows;
    }
    return runMemoryQueryAll(sql, params);
  },
  get: async (sql, params = []) => {
    if (!useMemoryStore && mysqlPool) {
      const [rows] = await mysqlPool.query(sql, params);
      return rows[0] || null;
    }
    const rows = runMemoryQueryAll(sql, params);
    return rows[0] || null;
  },
  run: async (sql, params = []) => {
    if (!useMemoryStore && mysqlPool) {
      const [result] = await mysqlPool.query(sql, params);
      return { lastID: result.insertId, changes: result.affectedRows };
    }
    return runMemoryQueryRun(sql, params);
  }
};

export const query = {
  all: async (sql, params = []) => {
    await dbReady;
    return internalQuery.all(sql, params);
  },
  get: async (sql, params = []) => {
    await dbReady;
    return internalQuery.get(sql, params);
  },
  run: async (sql, params = []) => {
    await dbReady;
    return internalQuery.run(sql, params);
  }
};

// In-Memory & Persistent File SQL Query Executor
function runMemoryQueryAll(sql, params) {
  const cleanSql = sql.trim().toLowerCase();

  if (cleanSql.includes("from users")) {
    let list = [...memoryStore.users];
    if (cleanSql.includes("count(*)")) return [{ count: list.length }];
    if (cleanSql.includes("lower(email) = lower(?)") || cleanSql.includes("lower(email) = ?")) {
      const email = String(params[0] || "").toLowerCase();
      const altEmail = params[1] ? String(params[1]).toLowerCase() : email;
      list = list.filter((u) => {
        const uEmail = String(u.email || "").toLowerCase();
        return uEmail === email || uEmail === altEmail;
      });
    } else if (/(^|[^a-z])id = \?/.test(cleanSql)) {
      list = list.filter((u) => u.id === params[0]);
    } else if (cleanSql.includes("role = 'admin'")) {
      list = list.filter((u) => u.role === "admin");
    }
    if (cleanSql.includes("order by createdat desc")) {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }

  if (cleanSql.includes("from products")) {
    let list = [...memoryStore.products];
    if (cleanSql.includes("count(*)")) return [{ count: list.length }];
    if (cleanSql.includes("vendorid = ?")) {
      list = list.filter((p) => p.vendorId === params[0]);
    }
    if (cleanSql.includes("status = 'approved'")) {
      list = list.filter((p) => p.status === "approved");
    } else if (cleanSql.includes("status = 'pending'")) {
      list = list.filter((p) => p.status === "pending");
    } else if (cleanSql.includes("status = 'rejected'")) {
      list = list.filter((p) => p.status === "rejected");
    } else if (cleanSql.includes("status = ?")) {
      list = list.filter((p) => p.status === params[0]);
    }
    if (cleanSql.includes("ecoscore > ?")) {
      const minScore = Number(params[0] || 0);
      list = list.filter((p) => (p.ecoScore || 0) > minScore);
    }
    if (/(^|[^a-z])id = \?/.test(cleanSql)) {
      list = list.filter((p) => p.id === params[0]);
    }
    if (cleanSql.includes("order by ecoscore desc")) {
      list.sort((a, b) => (b.ecoScore || 0) - (a.ecoScore || 0));
    } else if (cleanSql.includes("order by createdat desc")) {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (cleanSql.includes("limit 5")) {
      list = list.slice(0, 5);
    }
    return list;
  }

  if (cleanSql.includes("from coupons")) {
    let list = [...memoryStore.coupons];
    if (cleanSql.includes("count(*)")) return [{ count: list.length }];
    return list;
  }
  
  if (cleanSql.includes("from scan_history")) {
    let list = [...memoryStore.scan_history];
    if (cleanSql.includes("userid = ?")) {
      list = list.filter((s) => s.userId === params[0] || s.userId === "u_krishmessi91");
    }
    list.sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0));
    if (cleanSql.includes("limit 20")) list = list.slice(0, 20);
    return list;
  }

  if (cleanSql.includes("from notifications")) {
    let list = [...memoryStore.notifications];
    if (cleanSql.includes("userid = ?")) {
      list = list.filter((n) => n.userId === params[0]);
    }
    return list;
  }

  if (cleanSql.includes("from reviews")) {
    let list = [...memoryStore.reviews];
    if (cleanSql.includes("productid = ?")) {
      list = list.filter((r) => r.productId === params[0]);
    } else if (cleanSql.includes("vendorid = ?")) {
      list = list.filter((r) => r.vendorId === params[0]);
    }
    return list;
  }

  if (cleanSql.includes("from email_otps")) {
    let list = [...memoryStore.email_otps];
    if (cleanSql.includes("lower(email) = lower(?)") || cleanSql.includes("lower(email) = ?")) {
      const targetEmail = String(params[0] || "").toLowerCase();
      const targetPurpose = params[1] ? String(params[1]) : null;
      list = list.filter((o) => {
        const matchesEmail = String(o.email || "").toLowerCase() === targetEmail;
        if (targetPurpose) {
          return matchesEmail && o.purpose === targetPurpose;
        }
        return matchesEmail;
      });
    }
    if (cleanSql.includes("verified = 1")) {
      list = list.filter((o) => Number(o.verified) === 1 || o.verified === true);
    }
    if (cleanSql.includes("order by expiresat desc")) {
      list.sort((a, b) => Number(b.expiresAt || 0) - Number(a.expiresAt || 0));
    }
    return list;
  }

  if (cleanSql.includes("from orders")) {
    let list = [...memoryStore.orders];
    if (/(^|[^a-z])id = \?/.test(cleanSql)) {
      const targetId = params[params.length - 1] || params[0];
      list = list.filter((o) => o.id === targetId);
    } else if (cleanSql.includes("customerid = ?")) {
      list = list.filter((o) => o.customerId === params[0]);
    }

    if (cleanSql.includes("join order_items")) {
      const joined = [];
      for (const ord of list) {
        const items = memoryStore.order_items.filter((oi) => oi.orderId === ord.id);
        if (items.length > 0) {
          for (const item of items) {
            joined.push({ ...ord, ...item, id: ord.id, itemId: item.id });
          }
        } else {
          joined.push({ ...ord });
        }
      }
      return joined;
    }
    return list;
  }

  if (cleanSql.includes("from order_items")) {
    let list = [...memoryStore.order_items];
    if (cleanSql.includes("orderid = ?")) {
      list = list.filter((oi) => oi.orderId === params[0]);
    }
    return list;
  }

  if (cleanSql.includes("from ai_conversations")) {
    let list = [...(memoryStore.ai_conversations || [])];
    if (cleanSql.includes("productid = ?")) {
      list = list.filter((c) => String(c.productId) === String(params[0]));
    }
    if (cleanSql.includes("customerid = ?")) {
      list = list.filter((c) => String(c.customerId) === String(params[0]));
    }
    list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return list;
  }

  if (cleanSql.includes("from order_status_history")) {
    let list = [...(memoryStore.order_status_history || [])];
    if (cleanSql.includes("orderid = ?")) {
      list = list.filter((h) => String(h.orderId) === String(params[0]));
    }
    list.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    return list;
  }

  if (cleanSql.includes("from offers")) {
    let list = [...(memoryStore.offers || [])];
    if (cleanSql.includes("status = 'approved'")) {
      list = list.filter((o) => o.status === "approved");
    } else if (cleanSql.includes("status = 'pending'")) {
      list = list.filter((o) => o.status === "pending");
    } else if (cleanSql.includes("status = 'rejected'")) {
      list = list.filter((o) => o.status === "rejected");
    } else if (cleanSql.includes("status = ?")) {
      list = list.filter((o) => o.status === params[0]);
    }
    if (cleanSql.includes("vendorid = ?")) {
      list = list.filter((o) => String(o.vendorId) === String(params[0]));
    }
    if (/(^|[^a-z])id = \?/.test(cleanSql)) {
      list = list.filter((o) => String(o.id) === String(params[0]));
    }
    if (cleanSql.includes("couponcode = ?")) {
      list = list.filter((o) => String(o.couponCode || "").toLowerCase() === String(params[0] || "").toLowerCase());
    }
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }

  if (cleanSql.includes("count(*)")) {
    return [{ count: 0 }];
  }

  return [];
}

function runMemoryQueryRun(sql, params) {
  const cleanSql = sql.trim().toLowerCase();

  if (cleanSql.startsWith("insert into users")) {
    const matchCols = cleanSql.match(/\((.*?)\)\s*values/i);
    let user = {};
    if (matchCols && matchCols[1]) {
      const cols = matchCols[1].split(",").map((c) => c.trim().replace(/`/g, ""));
      cols.forEach((col, idx) => {
        user[col] = params[idx];
      });
    } else {
      user = {
        id: params[0],
        email: params[1],
        password: params[2],
        role: params[3] || "customer",
        name: params[4],
        storeName: params[5],
        verificationStatus: params[6] || "Verified",
        about: params[7],
        rating: params[8] || 5.0,
        completedOrders: params[9] || 0,
        greenPoints: params[10] || 0,
        createdAt: params[11] || new Date().toISOString()
      };
    }
    if (!user.role) user.role = "customer";
    if (!user.verificationStatus) user.verificationStatus = "Verified";
    memoryStore.users = memoryStore.users.filter((u) => u.id !== user.id);
    memoryStore.users.push(user);
    saveMemoryStore();
    return { lastID: user.id, changes: 1 };
  }

  if (cleanSql.startsWith("insert into products")) {
    const prod = {
      id: params[0],
      name: params[1],
      category: params[2],
      grade: params[3],
      price: params[4],
      currency: params[5] || "INR",
      unit: params[6],
      stock: params[7],
      vendorId: params[8],
      countryCode: params[9] || "IN",
      region: params[10],
      district: params[11],
      city: params[12],
      lat: params[13],
      lng: params[14],
      description: params[15],
      imageUrl: params[16],
      images: params[17],
      moq: params[18],
      tierPrices: params[19],
      organic: params[20],
      harvestDate: params[21],
      createdAt: params[22],
      status: params[23] || "approved",
      materialType: params[24],
      packagingType: params[25],
      recyclability: params[26],
      isRenewableEnergy: params[27],
      lifespanYears: params[28],
      ecoScore: params[29],
      co2SavedKg: params[30],
      plasticSavedKg: params[31],
      waterSavedLiters: params[32],
      treesEquivalent: params[33]
    };
    memoryStore.products = memoryStore.products.filter((p) => p.id !== prod.id);
    memoryStore.products.unshift(prod);
    saveMemoryStore();
    return { lastID: prod.id, changes: 1 };
  }

  if (cleanSql.startsWith("delete from products")) {
    const targetId = params[0];
    memoryStore.products = memoryStore.products.filter((p) => p.id !== targetId);
    saveMemoryStore();
    return { lastID: targetId, changes: 1 };
  }

  if (cleanSql.startsWith("insert into orders")) {
    const ord = {
      id: params[0],
      customerId: params[1],
      customerName: params[2],
      deliveryCountry: params[3],
      deliveryRegion: params[4],
      deliveryDistrict: params[5],
      deliveryCity: params[6],
      deliveryPostalCode: params[7],
      deliveryAddress: params[8],
      paymentMethod: params[9],
      totalAmount: params[10],
      currency: params[11],
      status: params[12] || "Pending",
      paymentStatus: params[13] || "pending",
      greenPointsEarned: params[14] || 0,
      createdAt: params[15] || new Date().toISOString()
    };
    memoryStore.orders = memoryStore.orders.filter((o) => o.id !== ord.id);
    memoryStore.orders.unshift(ord);
    saveMemoryStore();
    return { lastID: ord.id, changes: 1 };
  }

  if (cleanSql.startsWith("insert into order_items")) {
    const item = {
      id: params[0],
      orderId: params[1],
      productId: params[2],
      vendorId: params[3],
      qty: params[4],
      unitPrice: params[5],
      amount: params[6]
    };
    memoryStore.order_items.push(item);
    saveMemoryStore();
    return { lastID: item.id, changes: 1 };
  }

  if (cleanSql.startsWith("update orders set")) {
    const orderId = params[params.length - 1];
    const existing = memoryStore.orders.find((o) => o.id === orderId);
    if (existing) {
      const setClauseMatch = cleanSql.match(/update orders set (.*?) where/i);
      if (setClauseMatch) {
        const assignments = setClauseMatch[1].split(",");
        let paramIdx = 0;
        for (const assign of assignments) {
          const parts = assign.trim().split("=");
          if (parts.length === 2) {
            const field = parts[0].trim().replace(/`/g, "");
            const isPlaceholder = parts[1].trim() === "?";
            const val = isPlaceholder ? params[paramIdx++] : parts[1].trim().replace(/'/g, "");
            const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            existing[camelField] = val;
            if (field === "paymentstatus") existing.paymentStatus = val;
            if (field === "paymentmethod") existing.paymentMethod = val;
            if (field === "totalamount") existing.totalAmount = val;
            if (field === "status") existing.status = val;
          }
        }
      }
    }
    saveMemoryStore();
    return { lastID: orderId, changes: 1 };
  }

  if (cleanSql.startsWith("update products set")) {
    const prodId = params[params.length - 1];
    const prod = memoryStore.products.find((p) => p.id === prodId);
    if (prod) {
      if (cleanSql.includes("stock = stock -")) {
        const qty = Number(params[0] || 0);
        prod.stock = Math.max(0, (prod.stock || 0) - qty);
      } else if (cleanSql.includes("stock = stock +")) {
        const qty = Number(params[0] || 0);
        prod.stock = (prod.stock || 0) + qty;
      } else {
        const setClauseMatch = cleanSql.match(/update products set (.*?) where/i);
        if (setClauseMatch) {
          const assignments = setClauseMatch[1].split(",");
          let paramIdx = 0;
          for (const assign of assignments) {
            const parts = assign.trim().split("=");
            if (parts.length === 2) {
              const field = parts[0].trim().replace(/`/g, "");
              const isPlaceholder = parts[1].trim() === "?";
              const val = isPlaceholder ? params[paramIdx++] : parts[1].trim().replace(/'/g, "");
              const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
              prod[camelField] = val;
              if (field === "rejectionreason") prod.rejectionReason = val;
              if (field === "status") prod.status = val;
            }
          }
        }
      }
    }
    saveMemoryStore();
    return { lastID: prodId, changes: 1 };
  }

  if (cleanSql.startsWith("update users set")) {
    const userId = params[params.length - 1];
    const user = memoryStore.users.find((u) => u.id === userId);
    if (user) {
      if (cleanSql.includes("greenpoints = greenpoints +")) {
        const pts = Number(params[0] || 0);
        user.greenPoints = (user.greenPoints || 0) + pts;
      } else if (cleanSql.includes("greenpoints = ?")) {
        user.greenPoints = Number(params[0] || 0);
      }
      if (cleanSql.includes("verificationstatus = ?")) {
        user.verificationStatus = params[0];
      }
      if (cleanSql.includes("password = ?")) {
        user.password = params[0];
      }
      if (cleanSql.includes("resetotpcode = ?")) {
        user.resetOtpCode = params[0];
        user.resetOtpExpiry = params[1];
      }
    }
    saveMemoryStore();
    return { lastID: userId, changes: 1 };
  }

  if (cleanSql.startsWith("insert into scan_history")) {
    const scan = {
      id: params[0],
      userId: params[1],
      scannedImage: params[2],
      detectedProduct: params[3],
      category: params[4],
      material: params[5],
      packagingType: params[6],
      recyclability: params[7],
      ecoScore: params[8],
      carbonImpact: params[9],
      confidenceScore: params[10],
      aiExplanation: params[11],
      recommendationIds: params[12],
      scannedAt: params[13]
    };
    memoryStore.scan_history.unshift(scan);
    saveMemoryStore();
    return { lastID: scan.id, changes: 1 };
  }

  if (cleanSql.startsWith("insert into coupons")) {
    memoryStore.coupons.push({ id: params[0], code: params[1], description: params[2], discountPercentage: params[3], pointsRequired: params[4], isActive: 1 });
    saveMemoryStore();
    return { lastID: params[0], changes: 1 };
  }

  if (cleanSql.startsWith("insert into reviews")) {
    const rev = {
      id: params[0],
      productId: params[1],
      vendorId: params[2],
      customerId: params[3],
      customerName: params[4],
      rating: params[5],
      comment: params[6],
      imageUrl: params[7] || null,
      verifiedPurchase: params[8] !== undefined ? params[8] : 1,
      status: params[9] || "Approved",
      createdAt: params[10] || new Date().toISOString()
    };
    if (!memoryStore.reviews) memoryStore.reviews = [];
    memoryStore.reviews.unshift(rev);
    saveMemoryStore();
    return { lastID: rev.id, changes: 1 };
  }

  if (cleanSql.startsWith("delete from reviews")) {
    const targetId = params[0];
    if (memoryStore.reviews) {
      memoryStore.reviews = memoryStore.reviews.filter((r) => r.id !== targetId);
    }
    saveMemoryStore();
    return { lastID: targetId, changes: 1 };
  }

  if (cleanSql.startsWith("delete from email_otps")) {
    if (cleanSql.includes("lower(email) = lower(?)") || cleanSql.includes("lower(email) = ?")) {
      const targetEmail = String(params[0] || "").toLowerCase();
      const targetPurpose = params[1] ? String(params[1]) : null;
      memoryStore.email_otps = memoryStore.email_otps.filter((o) => {
        const matchesEmail = String(o.email || "").toLowerCase() === targetEmail;
        if (targetPurpose) {
          return !(matchesEmail && o.purpose === targetPurpose);
        }
        return !matchesEmail;
      });
    }
    saveMemoryStore();
    return { lastID: null, changes: 1 };
  }

  if (cleanSql.startsWith("insert into offers")) {
    const offer = {
      id: params[0],
      vendorId: params[1],
      title: params[2],
      description: params[3],
      type: params[4] || "percentage",
      discountValue: Number(params[5]),
      productIds: typeof params[6] === "string" ? params[6] : JSON.stringify(params[6] || []),
      couponCode: params[7],
      startDate: params[8],
      endDate: params[9],
      status: params[10] || "pending",
      rejectionReason: params[11] || null,
      createdAt: params[12] || new Date().toISOString(),
      updatedAt: params[13] || new Date().toISOString()
    };
    if (!memoryStore.offers) memoryStore.offers = [];
    memoryStore.offers = memoryStore.offers.filter((o) => o.id !== offer.id);
    memoryStore.offers.unshift(offer);
    saveMemoryStore();
    return { lastID: offer.id, changes: 1 };
  }

  if (cleanSql.startsWith("update offers set")) {
    const offerId = params[params.length - 1];
    if (!memoryStore.offers) memoryStore.offers = [];
    const offer = memoryStore.offers.find((o) => o.id === offerId);
    if (offer) {
      const canonicalMap = {
        status: "status",
        rejectionreason: "rejectionReason",
        title: "title",
        description: "description",
        type: "type",
        discountvalue: "discountValue",
        productids: "productIds",
        couponcode: "couponCode",
        startdate: "startDate",
        enddate: "endDate",
        updatedat: "updatedAt"
      };

      if (cleanSql.includes("status = ?") && cleanSql.includes("rejectionreason = ?")) {
        offer.status = params[0];
        offer.rejectionReason = params[1] === "NULL" || params[1] === "null" ? null : params[1];
      } else {
        const setClauseMatch = cleanSql.match(/update offers set (.*?) where/i);
        if (setClauseMatch) {
          const assignments = setClauseMatch[1].split(",");
          let paramIdx = 0;
          for (const assign of assignments) {
            const parts = assign.trim().split("=");
            if (parts.length === 2) {
              const rawField = parts[0].trim().replace(/`/g, "");
              const canonicalField = canonicalMap[rawField.toLowerCase()] || rawField;
              const rightPart = parts[1].trim();
              let val;
              if (rightPart === "?") {
                val = params[paramIdx++];
              } else {
                const unquoted = rightPart.replace(/'/g, "");
                val = unquoted.toUpperCase() === "NULL" ? null : unquoted;
              }
              if (typeof val === "string" && val.toUpperCase() === "NULL") {
                val = null;
              }
              offer[canonicalField] = val;
            }
          }
        }
      }
      delete offer.rejectionreason;
      offer.updatedAt = new Date().toISOString();
    }
    saveMemoryStore();
    return { lastID: offerId, changes: 1 };
  }

  if (cleanSql.startsWith("insert into email_otps")) {
    const record = {
      id: params[0],
      email: params[1],
      otp: params[2],
      purpose: params[3],
      verified: params[4] || 0,
      attempts: params[5] || 0,
      expiresAt: params[6],
      createdAt: params[7],
      updatedAt: params[8]
    };
    memoryStore.email_otps.push(record);
    saveMemoryStore();
    return { lastID: record.id, changes: 1 };
  }

  if (cleanSql.startsWith("update email_otps")) {
    if (cleanSql.includes("attempts = attempts + 1")) {
      const targetId = params[0];
      const rec = memoryStore.email_otps.find((o) => o.id === targetId);
      if (rec) rec.attempts = (rec.attempts || 0) + 1;
    }
    if (cleanSql.includes("verified = 1")) {
      const targetId = params[0];
      const rec = memoryStore.email_otps.find((o) => o.id === targetId);
      if (rec) rec.verified = 1;
    }
    saveMemoryStore();
    return { lastID: null, changes: 1 };
  }

  if (cleanSql.startsWith("insert into ai_conversations")) {
    const rec = {
      id: params[0],
      customerId: params[1],
      productId: params[2],
      role: params[3],
      message: params[4],
      language: params[5] || "en-US",
      actionTriggered: params[6] || null,
      timestamp: params[7] || new Date().toISOString()
    };
    if (!memoryStore.ai_conversations) memoryStore.ai_conversations = [];
    memoryStore.ai_conversations.push(rec);
    saveMemoryStore();
    return { lastID: rec.id, changes: 1 };
  }

  if (cleanSql.startsWith("insert into order_status_history")) {
    const rec = {
      id: params[0],
      orderId: params[1],
      status: params[2],
      message: params[3],
      location: params[4],
      updatedBy: params[5],
      updatedByRole: params[6],
      timestamp: params[7] || new Date().toISOString()
    };
    if (!memoryStore.order_status_history) memoryStore.order_status_history = [];
    memoryStore.order_status_history.push(rec);
    saveMemoryStore();
    return { lastID: rec.id, changes: 1 };
  }

  saveMemoryStore();
  return { lastID: 1, changes: 1 };
}

async function initDatabase() {
  const dbType = (process.env.DB_TYPE || "mysql").toLowerCase();
  let host = process.env.DB_HOST || "localhost";
  let port = Number(process.env.DB_PORT || 3306);
  let user = process.env.DB_USER || "root";
  let password = process.env.DB_PASSWORD || "";
  let databaseName = process.env.DB_NAME || "ecomart";
  let ssl = process.env.DB_SSL === "true" || port === 4000 || host.includes("tidbcloud") || host.includes("aivencloud");

  // Support direct connection URI (TiDB / MySQL URI)
  const connUri = process.env.DATABASE_URL || process.env.TIDB_URI;
  if (connUri) {
    try {
      const parsed = new URL(connUri);
      host = parsed.hostname;
      if (parsed.port) port = Number(parsed.port);
      user = decodeURIComponent(parsed.username);
      password = decodeURIComponent(parsed.password);
      if (parsed.pathname && parsed.pathname.length > 1) {
        databaseName = parsed.pathname.slice(1);
      }
      ssl = true;
    } catch {}
  }

  if (dbType === "file" || dbType === "json" || dbType === "memory" || dbType === "store") {
    console.log("🌱 EcoMart Persistent Data Store Engine activated (Standalone File Mode).");
    useMemoryStore = true;
    dbMode = "json-file";
    const hasData = loadMemoryStore();
    await seedData(hasData);
    return;
  }

  const sslOptions = ssl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined;
  const maxRetries = 4;
  let connected = false;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      try {
        const tempConnection = await mysql.createConnection({
          host,
          port,
          user,
          password,
          connectTimeout: 5000,
          ...(sslOptions ? { ssl: sslOptions } : {})
        });
        await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
        await tempConnection.end();
      } catch {
        // Cloud MySQL/TiDB users often operate within pre-provisioned databases; continue to pool connection
      }

      mysqlPool = mysql.createPool({
        host,
        port,
        user,
        password,
        database: databaseName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000,
        ...(sslOptions ? { ssl: sslOptions } : {})
      });

      await mysqlPool.query("SELECT 1");
      connected = true;
      break;
    } catch (err) {
      lastError = err;
      if (err.code === "ER_ACCESS_DENIED_ERROR") {
        console.error("Wrong DB_USER / DB_PASSWORD in .env");
        break;
      }
      if (attempt < maxRetries) {
        console.log(`⚠️ MySQL/TiDB connection attempt ${attempt}/${maxRetries} failed (${err.code || err.message}). Retrying in 1.5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  if (connected && mysqlPool) {
    try {
      await initMysqlTables();
      await seedData(false);
      useMemoryStore = false;
      dbMode = "mysql";
      console.log(`✅ Connected to MySQL database '${databaseName}' successfully.`);
    } catch (setupErr) {
      const reason = setupErr.sqlMessage || setupErr.message || String(setupErr);
      console.error("❌ MySQL table initialization or seeding error:", reason);
      if (mysqlPool) {
        try { await mysqlPool.end(); } catch {}
      }
      mysqlPool = null;
      connected = false;
      console.warn(`⚠️ MySQL table setup failed (${reason}). Falling back to JSON persistent store mode.`);
    }
  }

  if (!connected) {
    const reason = lastError ? (lastError.sqlMessage || lastError.message || String(lastError)) : "Unreachable";
    console.warn(`⚠️ MySQL is unreachable (${reason}). Falling back to JSON persistent store mode. MySQL database data will not be shown.`);
    useMemoryStore = true;
    dbMode = "json-file";
    const hasData = loadMemoryStore();
    await seedData(hasData);
  }
}

async function initMysqlTables() {
  const tables = [
    // 1. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      password TEXT,
      role VARCHAR(50),
      name VARCHAR(255),
      storeName VARCHAR(255),
      countryCode VARCHAR(10) DEFAULT 'IN',
      countryName VARCHAR(100) DEFAULT 'India',
      region VARCHAR(100),
      district VARCHAR(100),
      city VARCHAR(100),
      postalCode VARCHAR(20),
      lat DOUBLE,
      lng DOUBLE,
      currency VARCHAR(10) DEFAULT 'INR',
      verified TINYINT(1) DEFAULT 1,
      resetOtpCode VARCHAR(20),
      resetOtpExpiry BIGINT,
      verificationStatus VARCHAR(50) DEFAULT 'Verified',
      about TEXT,
      rating DOUBLE DEFAULT 0,
      completedOrders INT DEFAULT 0,
      greenPoints INT DEFAULT 0,
      upiId TEXT,
      accountHolderName VARCHAR(255),
      accountNumber VARCHAR(255),
      ifscCode VARCHAR(50),
      panNumber VARCHAR(50),
      gstin VARCHAR(50),
      createdAt VARCHAR(100)
    )`,

    // 1b. EmailOTP Table
    `CREATE TABLE IF NOT EXISTS email_otps (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255),
      otp VARCHAR(20),
      purpose VARCHAR(50),
      verified TINYINT(1) DEFAULT 0,
      attempts INT DEFAULT 0,
      expiresAt BIGINT,
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100)
    )`,

    // 2. Products Table
    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      category VARCHAR(100),
      grade VARCHAR(100),
      price DOUBLE,
      currency VARCHAR(10) DEFAULT 'INR',
      unit VARCHAR(50),
      stock INT,
      vendorId VARCHAR(255),
      countryCode VARCHAR(10) DEFAULT 'IN',
      region VARCHAR(100),
      district VARCHAR(100),
      city VARCHAR(100),
      lat DOUBLE,
      lng DOUBLE,
      description TEXT,
      imageUrl LONGTEXT,
      moq INT DEFAULT 1,
      tierPrices TEXT,
      organic INT DEFAULT 0,
      harvestDate VARCHAR(100),
      createdAt VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      rejectionReason TEXT,
      materialType VARCHAR(100) DEFAULT 'standard',
      packagingType VARCHAR(100) DEFAULT 'minimal_plastic',
      recyclability INT DEFAULT 80,
      isRenewableEnergy INT DEFAULT 0,
      lifespanYears DOUBLE DEFAULT 2,
      ecoScore INT DEFAULT 0,
      co2SavedKg DOUBLE DEFAULT 0,
      plasticSavedKg DOUBLE DEFAULT 0,
      waterSavedLiters DOUBLE DEFAULT 0,
      treesEquivalent DOUBLE DEFAULT 0,
      rating DOUBLE DEFAULT 0,
      numReviews INT DEFAULT 0,
      images LONGTEXT,
      FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 3. Orders Table
    `CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      customerId VARCHAR(255),
      customerName VARCHAR(255),
      deliveryCountry VARCHAR(100) DEFAULT 'India',
      deliveryRegion VARCHAR(100),
      deliveryDistrict VARCHAR(100),
      deliveryCity VARCHAR(100),
      deliveryPostalCode VARCHAR(20),
      deliveryAddress TEXT,
      paymentMethod VARCHAR(100),
      totalAmount DOUBLE,
      currency VARCHAR(10) DEFAULT 'INR',
      status VARCHAR(50) DEFAULT 'Pending',
      paymentStatus VARCHAR(50) DEFAULT 'pending',
      paymentVerifiedAt VARCHAR(100),
      paymentFailureReason TEXT,
      greenPointsEarned INT DEFAULT 0,
      razorpayOrderId VARCHAR(255),
      razorpayPaymentId VARCHAR(255),
      razorpaySignature VARCHAR(255),
      vendorPayoutStatus VARCHAR(50) DEFAULT 'not_started',
      vendorUpiId VARCHAR(255),
      createdAt VARCHAR(100),
      FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // 4. Order Items Table
    `CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(255) PRIMARY KEY,
      orderId VARCHAR(255),
      productId VARCHAR(255),
      vendorId VARCHAR(255),
      qty INT,
      unitPrice DOUBLE,
      amount DOUBLE,
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE SET NULL,
      FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // 5. Notifications Table
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255),
      text TEXT,
      type VARCHAR(100),
      \`read\` INT DEFAULT 0,
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 6. Reviews Table
    `CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(255) PRIMARY KEY,
      productId VARCHAR(255),
      vendorId VARCHAR(255),
      customerId VARCHAR(255),
      customerName VARCHAR(255),
      rating INT,
      comment TEXT,
      imageUrl TEXT,
      verifiedPurchase INT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'Approved',
      createdAt VARCHAR(100),
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // 7. Saved Searches Table
    `CREATE TABLE IF NOT EXISTS saved_searches (
      id VARCHAR(255) PRIMARY KEY,
      customerId VARCHAR(255),
      query TEXT,
      filters TEXT,
      createdAt VARCHAR(100),
      FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 8. Coupons Table
    `CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(100) UNIQUE,
      description TEXT,
      discountPercentage DOUBLE,
      pointsRequired INT,
      isActive INT DEFAULT 1,
      createdAt VARCHAR(100)
    )`,

    // 9. AI Scan History Table
    `CREATE TABLE IF NOT EXISTS scan_history (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255),
      scannedImage LONGTEXT,
      detectedProduct VARCHAR(255),
      category VARCHAR(100),
      material VARCHAR(100),
      packagingType VARCHAR(100),
      recyclability INT DEFAULT 50,
      ecoScore INT DEFAULT 50,
      carbonImpact VARCHAR(50),
      confidenceScore INT DEFAULT 90,
      aiExplanation TEXT,
      recommendationIds TEXT,
      scannedAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 10. AI Recommendation Logs Table
    `CREATE TABLE IF NOT EXISTS recommendation_logs (
      id VARCHAR(255) PRIMARY KEY,
      scanHistoryId VARCHAR(255),
      recommendedProducts TEXT,
      aiSummary TEXT,
      createdAt VARCHAR(100),
      FOREIGN KEY(scanHistoryId) REFERENCES scan_history(id) ON DELETE CASCADE
    )`,

    // 11. Cart Table
    `CREATE TABLE IF NOT EXISTS cart (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      productId VARCHAR(255) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100),
      UNIQUE KEY uk_user_product (userId, productId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
    )`,

    // 12. Wishlist Table
    `CREATE TABLE IF NOT EXISTS wishlist (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      productId VARCHAR(255) NOT NULL,
      createdAt VARCHAR(100),
      UNIQUE KEY uk_wishlist_user_product (userId, productId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
    )`,

    // 13. Voice Assistant History Table
    `CREATE TABLE IF NOT EXISTS voice_history (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      userTranscript TEXT NOT NULL,
      detectedLanguage VARCHAR(20) DEFAULT 'en-US',
      aiResponseText TEXT NOT NULL,
      actionTriggered VARCHAR(100),
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 14. Customer Addresses Table
    `CREATE TABLE IF NOT EXISTS addresses (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      fullName VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      addressLine TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      district VARCHAR(100),
      state VARCHAR(100) NOT NULL,
      postalCode VARCHAR(20) NOT NULL,
      country VARCHAR(100) DEFAULT 'India',
      isDefault TINYINT(1) DEFAULT 0,
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 15. Refresh Tokens Table
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      token TEXT NOT NULL,
      expiresAt BIGINT NOT NULL,
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 16. Support Tickets Table
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'Open',
      priority VARCHAR(20) DEFAULT 'Normal',
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 17. Eco Dashboard Logs Table
    `CREATE TABLE IF NOT EXISTS eco_dashboard_logs (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      action VARCHAR(100) NOT NULL,
      co2SavedKg DOUBLE DEFAULT 0,
      plasticSavedKg DOUBLE DEFAULT 0,
      waterSavedLiters DOUBLE DEFAULT 0,
      treesEquivalent DOUBLE DEFAULT 0,
      createdAt VARCHAR(100),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // 18. AI Voice Explainer Product History Table
    `CREATE TABLE IF NOT EXISTS ai_voice_history (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255) NOT NULL,
      productId VARCHAR(255) NOT NULL,
      question TEXT NOT NULL,
      aiAnswer TEXT NOT NULL,
      language VARCHAR(20) DEFAULT 'en-US',
      createdAt VARCHAR(100),
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
    )`,

    // 19. AI Conversations Memory Table
    `CREATE TABLE IF NOT EXISTS ai_conversations (
      id VARCHAR(255) PRIMARY KEY,
      customerId VARCHAR(255),
      productId VARCHAR(255),
      role VARCHAR(50),
      message TEXT,
      language VARCHAR(20) DEFAULT 'en-US',
      actionTriggered VARCHAR(100),
      timestamp VARCHAR(100)
    )`,

    // 20. Order Status History Table
    `CREATE TABLE IF NOT EXISTS order_status_history (
      id VARCHAR(255) PRIMARY KEY,
      orderId VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      message TEXT,
      location VARCHAR(255),
      updatedBy VARCHAR(255),
      updatedByRole VARCHAR(50),
      timestamp VARCHAR(100),
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
    )`,

    // 21. Offers Table
    `CREATE TABLE IF NOT EXISTS offers (
      id VARCHAR(255) PRIMARY KEY,
      vendorId VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) DEFAULT 'percentage',
      discountValue DOUBLE NOT NULL,
      productIds TEXT NOT NULL,
      couponCode VARCHAR(100),
      startDate VARCHAR(100) NOT NULL,
      endDate VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      rejectionReason TEXT,
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100),
      FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of tables) {
    await mysqlPool.query(sql);
  }

  try {
    await mysqlPool.query("ALTER TABLE orders ADD COLUMN paymentStatus VARCHAR(50) DEFAULT 'pending'");
  } catch {
    /* Ignore if column already exists */
  }

  const userMigrations = [
    "ALTER TABLE users ADD COLUMN verified TINYINT(1) DEFAULT 1",
    "ALTER TABLE users ADD COLUMN verificationStatus VARCHAR(50) DEFAULT 'Verified'",
    "ALTER TABLE users ADD COLUMN phone VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN address TEXT",
    "ALTER TABLE users ADD COLUMN storeName VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN countryCode VARCHAR(10) DEFAULT 'IN'",
    "ALTER TABLE users ADD COLUMN countryName VARCHAR(100) DEFAULT 'India'",
    "ALTER TABLE users ADD COLUMN region VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN district VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN city VARCHAR(100)",
    "ALTER TABLE users ADD COLUMN postalCode VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN lat DOUBLE",
    "ALTER TABLE users ADD COLUMN lng DOUBLE",
    "ALTER TABLE users ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'",
    "ALTER TABLE users ADD COLUMN resetOtpCode VARCHAR(20)",
    "ALTER TABLE users ADD COLUMN resetOtpExpiry BIGINT",
    "ALTER TABLE users ADD COLUMN about TEXT",
    "ALTER TABLE users ADD COLUMN rating DOUBLE DEFAULT 0",
    "ALTER TABLE users ADD COLUMN completedOrders INT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN greenPoints INT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN upiId TEXT",
    "ALTER TABLE users ADD COLUMN accountHolderName VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN accountNumber VARCHAR(255)",
    "ALTER TABLE users ADD COLUMN ifscCode VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN panNumber VARCHAR(50)",
    "ALTER TABLE users ADD COLUMN gstin VARCHAR(50)"
  ];

  for (const alterSql of userMigrations) {
    try {
      await mysqlPool.query(alterSql);
    } catch {
      /* Ignore if column already exists */
    }
  }

  const productMigrations = [
    "ALTER TABLE products MODIFY imageUrl LONGTEXT",
    "ALTER TABLE products MODIFY images LONGTEXT"
  ];
  for (const alterSql of productMigrations) {
    try {
      await mysqlPool.query(alterSql);
    } catch {
      /* Ignore */
    }
  }
}

/**
 * EcoMart Database Seeder
 */
async function seedData(hasLoadedData = false) {
  try {
    // Sanitize any invalid ecoScore or status values in memoryStore
    if (Array.isArray(memoryStore.products)) {
      memoryStore.products.forEach((p) => {
        if (typeof p.ecoScore !== "number" || isNaN(p.ecoScore) || p.ecoScore < 10) {
          p.ecoScore = 50;
        }
      });
    }

    const row = await internalQuery.get("SELECT COUNT(*) as count FROM users");
    const count = row ? Number(row.count) : 0;
    if (count === 0) {
      console.log("Seeding EcoMart Admin account...");
      const adminEmail = process.env.ADMIN_EMAIL || "admin@ecomart.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

      await internalQuery.run(
        `INSERT INTO users (id, email, password, role, name, storeName, countryCode, countryName, region, district, city, postalCode, lat, lng, currency, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ["a1", adminEmail, adminPassword, "admin", "EcoMart Admin", null, "IN", "India", null, null, null, null, null, null, "INR", "Verified", "EcoMart Platform Administration Account.", 5.0, 0, 0, new Date().toISOString()]
      );
      console.log(`✅ Admin account created: ${adminEmail}`);
    }

    const couponRow = await internalQuery.get("SELECT COUNT(*) as count FROM coupons");
    const couponCount = couponRow ? Number(couponRow.count) : 0;
    if (couponCount === 0) {
      const coupons = [
        ["c1", "ECOFIRST15", "15% Off Your Sustainable Order", 15, 100, "2026-01-01T00:00:00.000Z"],
        ["c2", "GREENHERO25", "25% Off Super Eco Warrior Special", 25, 200, "2026-01-01T00:00:00.000Z"],
        ["c3", "FREESHIPECO", "Free Carbon-Neutral Delivery", 100, 50, "2026-01-01T00:00:00.000Z"]
      ];
      for (const c of coupons) {
        await internalQuery.run(
          `INSERT INTO coupons (id, code, description, discountPercentage, pointsRequired, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          c
        );
      }
    }

    if (useMemoryStore) {
      saveMemoryStore();
    }
    console.log("✅ EcoMart Database initialization complete.");
  } catch (err) {
    console.error("Error during database seeding:", err);
  }
}

// Start database initialization
dbReady = initDatabase();

export default { isMysql: () => !useMemoryStore };
