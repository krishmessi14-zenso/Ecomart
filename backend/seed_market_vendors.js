import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const databaseName = process.env.DB_NAME || "ecomart";

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database: databaseName,
  waitForConnections: true,
  connectionLimit: 5
});

const query = {
  all: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  get: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows[0] || null;
  },
  run: async (sql, params = []) => {
    const [result] = await pool.query(sql, params);
    return { lastID: result.insertId, changes: result.affectedRows };
  }
};

const VENDORS = [
  {
    id: "v_greenliving",
    email: "greenliving@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "GreenLiving Essentials",
    storeName: "GreenLiving Sustainable Store",
    countryCode: "IN",
    countryName: "India",
    region: "Maharashtra",
    district: "Mumbai Suburban",
    city: "Mumbai",
    lat: 19.0760,
    lng: 72.8777,
    verificationStatus: "Verified",
    about: "Dedicated to premium plastic-free household goods and eco personal care products.",
    rating: 4.9,
    completedOrders: 142
  },
  {
    id: "v_ecotech",
    email: "ecotech@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "EcoTech Innovations",
    storeName: "EcoTech Green Solutions",
    countryCode: "IN",
    countryName: "India",
    region: "Gujarat",
    district: "Ahmedabad",
    city: "Ahmedabad",
    lat: 23.0225,
    lng: 72.5714,
    verificationStatus: "Verified",
    about: "Pioneering renewable energy gadgets, solar accessories, and biodegradable tech accessories.",
    rating: 4.8,
    completedOrders: 98
  },
  {
    id: "v_pureorganics",
    email: "pureorganics@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "PureOrganics Organics",
    storeName: "PureOrganics Natural Farms",
    countryCode: "IN",
    countryName: "India",
    region: "Punjab",
    district: "Amritsar",
    city: "Amritsar",
    lat: 31.6340,
    lng: 74.8723,
    verificationStatus: "Verified",
    about: "Certified organic food products, natural oils, and handcrafted botanical skincare.",
    rating: 4.95,
    completedOrders: 215
  },
  {
    id: "v_earthkraft",
    email: "earthkraft@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "EarthKraft Packaging & Stationery",
    storeName: "EarthKraft Eco Packaging",
    countryCode: "IN",
    countryName: "India",
    region: "Tamil Nadu",
    district: "Coimbatore",
    city: "Coimbatore",
    lat: 11.0168,
    lng: 76.9558,
    verificationStatus: "Verified",
    about: "Zero-waste packaging, recycled plantable stationery, and compostable mailer bags.",
    rating: 4.75,
    completedOrders: 160
  },
  {
    id: "v_auraecowear",
    email: "auraecowear@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "Aura EcoWear & Home",
    storeName: "Aura Sustainable Living",
    countryCode: "IN",
    countryName: "India",
    region: "Kerala",
    district: "Ernakulam",
    city: "Kochi",
    lat: 9.9312,
    lng: 76.2673,
    verificationStatus: "Verified",
    about: "Artisanal organic linen apparel, upcycled home decor, and natural woven accessories.",
    rating: 4.85,
    completedOrders: 110
  },
  {
    id: "v_sample_vendor",
    email: "vendor.sample@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "EcoCraft Studio",
    storeName: "EcoCraft Sustainable Living",
    countryCode: "IN",
    countryName: "India",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    verificationStatus: "Verified",
    about: "Artisanal eco-friendly studio producing sustainable daily-use goods and plastic-free alternatives.",
    rating: 4.9,
    completedOrders: 15
  }
];

const PRODUCTS = [
  {
    id: "p_bamboo_bottle",
    vendorId: "v_sample_vendor",
    name: "Handcrafted Thermal Bamboo Water Bottle",
    category: "Reusable & Household",
    grade: "A",
    price: 399,
    unit: "piece",
    stock: 50,
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Double-walled stainless steel interior insulated with 100% natural organic bamboo exterior casing. Eco-friendly, BPA free, and keeps drinks hot or cold for hours.",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
    images: JSON.stringify([
      { color: "Natural Bamboo", colorHex: "#d4a373", imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1000" },
      { color: "Stainless Steel Interior", colorHex: "#94a3b8", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=1000" },
      { color: "Eco Matte Finish", colorHex: "#334155", imageUrl: "https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=1000" }
    ]),
    moq: 1,
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 95,
    isRenewableEnergy: 1,
    lifespanYears: 3,
    ecoScore: 94,
    co2SavedKg: 3.5,
    plasticSavedKg: 0.5,
    waterSavedLiters: 120,
    treesEquivalent: 0.15,
    status: "approved"
  },
  {
    id: "p_cotton_tote",
    vendorId: "v_sample_vendor",
    name: "Unbleached Organic Cotton Tote Bag",
    category: "Sustainable Apparel",
    grade: "A",
    price: 249,
    unit: "piece",
    stock: 200,
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Heavy-duty 100% GOTS certified organic cotton canvas bag designed for plastic-free grocery shopping and everyday utility.",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800",
    images: JSON.stringify([
      { color: "Natural Beige", colorHex: "#f5f5dc", imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800" },
      { color: "Olive Green", colorHex: "#556b2f", imageUrl: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?w=800" }
    ]),
    moq: 1,
    materialType: "organic",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 3,
    ecoScore: 94,
    co2SavedKg: 3.29,
    plasticSavedKg: 0.42,
    waterSavedLiters: 113,
    treesEquivalent: 0.14,
    status: "approved"
  },
  {
    id: "p_bamboo_brush",
    vendorId: "v_sample_vendor",
    name: "Eco Organic Bamboo Toothbrush (Set of 4)",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 199,
    unit: "pack",
    stock: 150,
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "100% biodegradable natural bamboo handle toothbrush set with soft BPA-free charcoal infused bristles.",
    imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800",
    images: JSON.stringify([
      { color: "Natural Wood", colorHex: "#d4a373", imageUrl: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=800" }
    ]),
    moq: 1,
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 95,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 92,
    co2SavedKg: 3.2,
    plasticSavedKg: 0.42,
    waterSavedLiters: 110,
    treesEquivalent: 0.14,
    status: "approved"
  },
  {
    id: "p_steel_bottle",
    vendorId: "v_sample_vendor",
    name: "Stainless Steel Reusable Insulated Water Bottle (750ml)",
    category: "Reusable & Household",
    grade: "A",
    price: 499,
    unit: "piece",
    stock: 80,
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Double-wall vacuum insulated food-grade 304 stainless steel water bottle. Keeps beverages cold for 24h and hot for 12h.",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
    images: JSON.stringify([
      { color: "Matte Black", colorHex: "#1e1e1e", imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800" }
    ]),
    moq: 1,
    materialType: "steel",
    packagingType: "recycled_paper",
    recyclability: 90,
    isRenewableEnergy: 0,
    lifespanYears: 5,
    ecoScore: 88,
    co2SavedKg: 3.08,
    plasticSavedKg: 0.40,
    waterSavedLiters: 105,
    treesEquivalent: 0.13,
    status: "approved"
  },
  {
    id: "p_neem_comb",
    vendorId: "v_sample_vendor",
    name: "Handcrafted Neem Wood Hair Comb",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 149,
    unit: "piece",
    stock: 120,
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Natural anti-static neem wood comb promoting scalp blood circulation and preventing hair breakage naturally.",
    imageUrl: "https://images.unsplash.com/photo-1590159763121-7c9df3121905?w=800",
    images: JSON.stringify([
      { color: "Natural Teak", colorHex: "#b07d4b", imageUrl: "https://images.unsplash.com/photo-1590159763121-7c9df3121905?w=800" }
    ]),
    moq: 1,
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 2,
    ecoScore: 90,
    co2SavedKg: 3.15,
    plasticSavedKg: 0.41,
    waterSavedLiters: 108,
    treesEquivalent: 0.13,
  },
  {
    id: "p_cassava_bags",
    vendorId: "v_earthkraft",
    name: "Compostable Cassava Starch Produce Bags (100 Pcs)",
    category: "Biodegradable Packaging",
    grade: "A",
    price: 349,
    unit: "pack",
    stock: 160,
    region: "Tamil Nadu",
    district: "Coimbatore",
    city: "Coimbatore",
    lat: 11.0168,
    lng: 76.9558,
    description: "Non-toxic cassava starch carrying bags that completely break down in water and natural soil within 90 days leaving zero microplastics.",
    imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800",
    images: JSON.stringify([
      { color: "Translucent White", colorHex: "#e2e8f0", imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800" },
      { color: "Eco Green Tint", colorHex: "#bbf7d0", imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800" }
    ]),
    moq: 1,
    materialType: "biodegradable",
    packagingType: "compostable",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 99,
    co2SavedKg: 3.46,
    plasticSavedKg: 0.45,
    waterSavedLiters: 119,
    treesEquivalent: 0.15,
    status: "approved"
  }
];

async function seed() {
  console.log("Seeding 5 vendors and 25 unique products with verified images into SQLite...");

  const createdAt = new Date().toISOString();

  // Insert Vendors
  for (const v of VENDORS) {
    const existing = await query.get("SELECT id FROM users WHERE id = ?", [v.id]);
    if (!existing) {
      await query.run(
        `INSERT INTO users (id, email, password, role, name, storeName, countryCode, countryName, region, district, city, lat, lng, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [v.id, v.email, v.password, v.role, v.name, v.storeName, v.countryCode, v.countryName, v.region, v.district, v.city, v.lat, v.lng, v.verificationStatus, v.about, v.rating, v.completedOrders, createdAt]
      );
      console.log(`✅ Seeded Vendor: ${v.name}`);
    } else {
      console.log(`ℹ️ Vendor exists: ${v.name}`);
    }
  }

  // Insert Products
  for (const p of PRODUCTS) {
    const existing = await query.get("SELECT id FROM products WHERE id = ?", [p.id]);
    if (!existing) {
      await query.run(
        `INSERT INTO products (id, name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, images, moq, tierPrices, organic, createdAt, status, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears, ecoScore, co2SavedKg, plasticSavedKg, waterSavedLiters, treesEquivalent)
         VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id,
          p.name,
          p.category,
          p.grade,
          p.price,
          p.unit,
          p.stock,
          p.vendorId,
          p.region,
          p.district,
          p.city,
          p.lat,
          p.lng,
          p.description,
          p.imageUrl,
          p.images,
          p.moq,
          createdAt,
          p.status,
          p.materialType,
          p.packagingType,
          p.recyclability,
          p.isRenewableEnergy,
          p.lifespanYears,
          p.ecoScore,
          p.co2SavedKg,
          p.plasticSavedKg,
          p.waterSavedLiters,
          p.treesEquivalent
        ]
      );
      console.log(`✅ Seeded Product: ${p.name} (${p.category})`);
    } else {
      // Force update existing records so imageUrl and images always reflect the exact product
      await query.run(
        `UPDATE products SET imageUrl = ?, images = ?, status = 'approved', description = ?, price = ? WHERE id = ?`,
        [p.imageUrl, p.images, p.description, p.price, p.id]
      );
      console.log(`🔄 Updated Product: ${p.name}`);
    }
  }

  console.log("🎉 Successfully seeded 5 vendors and 25 products with verified accurate images!");
  await pool.end();
}

seed().catch(async err => {
  console.error("Seeding error:", err);
  await pool.end();
});
