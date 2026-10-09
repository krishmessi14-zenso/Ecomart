import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
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

const USERS = [
  {
    id: "a1",
    email: "admin@ecomart.com",
    password: "Admin@12345",
    role: "admin",
    name: "EcoMart Admin",
    storeName: null,
    countryCode: "IN",
    countryName: "India",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    verificationStatus: "Verified",
    about: "EcoMart Governance Account",
    rating: 5.0,
    completedOrders: 0
  },
  {
    id: "u_krishmessi91",
    email: "krishmessi91@gmail.com",
    password: "krishna",
    role: "customer",
    name: "krishna",
    storeName: null,
    countryCode: "IN",
    countryName: "India",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    verificationStatus: "Verified",
    about: "Customer Account",
    rating: 5.0,
    completedOrders: 2
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
    about: "Artisanal eco-friendly studio producing sustainable daily-use goods.",
    rating: 4.9,
    completedOrders: 15
  },
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
    about: "Premium plastic-free household goods.",
    rating: 4.8,
    completedOrders: 24
  },
  {
    id: "v_earthkraft",
    email: "earthkraft@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "EarthKraft Packaging",
    storeName: "EarthKraft Eco Packaging",
    countryCode: "IN",
    countryName: "India",
    region: "Tamil Nadu",
    district: "Coimbatore",
    city: "Coimbatore",
    lat: 11.0168,
    lng: 76.9558,
    verificationStatus: "Verified",
    about: "Zero-waste packaging and plantable stationery.",
    rating: 4.75,
    completedOrders: 18
  },
  {
    id: "v_auraecowear",
    email: "auraecowear@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "Aura EcoWear",
    storeName: "Aura Sustainable Living",
    countryCode: "IN",
    countryName: "India",
    region: "Kerala",
    district: "Ernakulam",
    city: "Kochi",
    lat: 9.9312,
    lng: 76.2673,
    verificationStatus: "Verified",
    about: "Organic linen apparel and natural woven goods.",
    rating: 4.85,
    completedOrders: 12
  },
  {
    id: "v_pending_bamboo",
    email: "bamboocraft@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "BambooCraft Organics",
    storeName: "BambooCraft Studio",
    countryCode: "IN",
    countryName: "India",
    region: "Assam",
    district: "Kamrup",
    city: "Guwahati",
    lat: 26.1445,
    lng: 91.7362,
    verificationStatus: "Pending",
    about: "Sustainable bamboo household products awaiting verification.",
    rating: 0,
    completedOrders: 0
  },
  {
    id: "v_pending_solar",
    email: "solartech@ecomart.com",
    password: "Vendor@123",
    role: "vendor",
    name: "SolarTech Energy",
    storeName: "SolarTech Green Solutions",
    countryCode: "IN",
    countryName: "India",
    region: "Gujarat",
    district: "Ahmedabad",
    city: "Ahmedabad",
    lat: 23.0225,
    lng: 72.5714,
    verificationStatus: "Pending",
    about: "Renewable energy consumer gadgets awaiting admin approval.",
    rating: 0,
    completedOrders: 0
  }
];

const PENDING_PRODUCTS = [
  {
    id: "p_pending_1",
    vendorId: "v_sample_vendor",
    name: "Handcrafted Thermal Bamboo Water Bottle",
    category: "Reusable & Household",
    grade: "A",
    price: 399,
    unit: "piece",
    stock: 50,
    region: "Karnataka",
    city: "Bengaluru",
    description: "Double-walled stainless steel interior insulated with 100% natural organic bamboo exterior casing. Eco-friendly, BPA free, keeping beverages hot or cold for 12 hours.",
    imageUrl: "/uploads/products/prod-1790243031689-913563227.png",
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
    status: "pending"
  },
  {
    id: "p_pending_2",
    vendorId: "v_sample_vendor",
    name: "Unbleached Organic Cotton Tote Bag",
    category: "Sustainable Apparel",
    grade: "A",
    price: 249,
    unit: "piece",
    stock: 100,
    region: "Karnataka",
    city: "Bengaluru",
    description: "Heavy-duty 100% GOTS certified organic cotton canvas bag designed for plastic-free grocery shopping and daily utility.",
    imageUrl: "/uploads/products/prod-1790243040248-561049830.png",
    moq: 1,
    materialType: "organic",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 3,
    ecoScore: 92,
    co2SavedKg: 3.2,
    plasticSavedKg: 0.4,
    waterSavedLiters: 110,
    treesEquivalent: 0.14,
    status: "pending"
  },
  {
    id: "p_pending_3",
    vendorId: "v_pending_bamboo",
    name: "Eco Organic Charcoal Bamboo Toothbrush Set",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 199,
    unit: "pack",
    stock: 150,
    region: "Assam",
    city: "Guwahati",
    description: "100% biodegradable natural bamboo handle toothbrush 4-pack with soft BPA-free activated charcoal bristles.",
    imageUrl: "/uploads/products/prod-1790243048443-695762376.png",
    moq: 1,
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 95,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 95,
    co2SavedKg: 3.1,
    plasticSavedKg: 0.42,
    waterSavedLiters: 105,
    treesEquivalent: 0.13,
    status: "pending"
  },
  {
    id: "p_pending_4",
    vendorId: "v_greenliving",
    name: "Reusable Stainless Steel Straw Kit with Cleaner",
    category: "Reusable & Household",
    grade: "A",
    price: 149,
    unit: "set",
    stock: 200,
    region: "Maharashtra",
    city: "Mumbai",
    description: "Set of 4 food-grade 304 stainless steel drinking straws with travel pouch and cleaning brush.",
    imageUrl: "/uploads/products/prod-1790593582957-927081191.png",
    moq: 1,
    materialType: "steel",
    packagingType: "recycled_paper",
    recyclability: 90,
    isRenewableEnergy: 0,
    lifespanYears: 5,
    ecoScore: 90,
    co2SavedKg: 2.8,
    plasticSavedKg: 0.38,
    waterSavedLiters: 95,
    treesEquivalent: 0.12,
    status: "pending"
  },
  {
    id: "p_pending_5",
    vendorId: "v_earthkraft",
    name: "Compostable Cassava Starch Grocery Bags (50 Pcs)",
    category: "Biodegradable Packaging",
    grade: "A",
    price: 299,
    unit: "pack",
    stock: 120,
    region: "Tamil Nadu",
    city: "Coimbatore",
    description: "Zero-plastic cassava starch bags that dissolve harmlessly in warm water or natural soil within 90 days.",
    imageUrl: "/uploads/products/prod-1790593605392-750242933.png",
    moq: 1,
    materialType: "biodegradable",
    packagingType: "compostable",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 98,
    co2SavedKg: 4.1,
    plasticSavedKg: 0.6,
    waterSavedLiters: 130,
    treesEquivalent: 0.18,
    status: "pending"
  },
  {
    id: "p_pending_6",
    vendorId: "v_pending_solar",
    name: "Compact Portable Solar Phone Charger (10000mAh)",
    category: "Solar & Green Tech",
    grade: "A",
    price: 1299,
    unit: "piece",
    stock: 40,
    region: "Gujarat",
    city: "Ahmedabad",
    description: "High-efficiency monocrystalline solar power bank featuring dual USB output ports and LED emergency light.",
    imageUrl: "/uploads/products/prod-1790593628130-379440939.png",
    moq: 1,
    materialType: "solar_cell",
    packagingType: "minimal_plastic",
    recyclability: 85,
    isRenewableEnergy: 1,
    lifespanYears: 4,
    ecoScore: 88,
    co2SavedKg: 5.2,
    plasticSavedKg: 0.3,
    waterSavedLiters: 80,
    treesEquivalent: 0.22,
    status: "pending"
  },
  {
    id: "p_pending_7",
    vendorId: "v_sample_vendor",
    name: "Handcrafted Organic Neem Wood Pocket Comb",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 129,
    unit: "piece",
    stock: 180,
    region: "Karnataka",
    city: "Bengaluru",
    description: "Natural medicinal neem wood hair comb preventing scalp infections and plastic static friction.",
    imageUrl: "/uploads/products/prod-1790593946124-6418158.png",
    moq: 1,
    materialType: "wood",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 2,
    ecoScore: 94,
    co2SavedKg: 2.5,
    plasticSavedKg: 0.35,
    waterSavedLiters: 90,
    treesEquivalent: 0.11,
    status: "pending"
  },
  {
    id: "p_pending_8",
    vendorId: "v_earthkraft",
    name: "Recycled Plantable Seed Paper Notebook (A5)",
    category: "Recycled Stationery",
    grade: "A",
    price: 179,
    unit: "piece",
    stock: 90,
    region: "Tamil Nadu",
    city: "Coimbatore",
    description: "Eco notebook handmade from recycled post-consumer waste embedded with marigold flower seeds in cover.",
    imageUrl: "/uploads/products/prod-1790593953955-739987958.png",
    moq: 1,
    materialType: "recycled_paper",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 96,
    co2SavedKg: 3.0,
    plasticSavedKg: 0.45,
    waterSavedLiters: 115,
    treesEquivalent: 0.16,
    status: "pending"
  },
  {
    id: "p_pending_9",
    vendorId: "v_auraecowear",
    name: "Organic Cotton Beeswax Food Wraps (Set of 3)",
    category: "Reusable & Household",
    grade: "A",
    price: 349,
    unit: "pack",
    stock: 75,
    region: "Kerala",
    city: "Kochi",
    description: "Washable, reusable food storage wraps crafted from organic cotton coated with natural beeswax, jojoba oil, and tree resin.",
    imageUrl: "/uploads/products/prod-1790593972600-164430843.png",
    moq: 1,
    materialType: "organic_cotton",
    packagingType: "plastic_free",
    recyclability: 95,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 93,
    co2SavedKg: 3.4,
    plasticSavedKg: 0.55,
    waterSavedLiters: 125,
    treesEquivalent: 0.15,
    status: "pending"
  },
  {
    id: "p_pending_10",
    vendorId: "v_auraecowear",
    name: "Handmade Sustainable Pure Hemp Eco Backpack",
    category: "Sustainable Apparel",
    grade: "A",
    price: 899,
    unit: "piece",
    stock: 30,
    region: "Kerala",
    city: "Kochi",
    description: "Durable eco-friendly daypack woven from 100% organic wild Himalayan hemp fibers with recycled cotton lining.",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    moq: 1,
    materialType: "hemp",
    packagingType: "plastic_free",
    recyclability: 90,
    isRenewableEnergy: 1,
    lifespanYears: 5,
    ecoScore: 91,
    co2SavedKg: 4.8,
    plasticSavedKg: 0.7,
    waterSavedLiters: 140,
    treesEquivalent: 0.2,
    status: "pending"
  }
];

async function seedPendingData() {
  console.log("Seeding pending products & users into database and data_store.json...");

  // 1. Seed into data_store.json as backup/persistent file store
  const dataStorePath = join(__dirname, "data_store.json");
  let dataStore = { users: [], products: [], orders: [], order_items: [], notifications: [], reviews: [], saved_searches: [], coupons: [], scan_history: [], recommendation_logs: [], email_otps: [], ai_conversations: [], order_status_history: [], voice_history: [], offers: [] };
  
  try {
    if (fs.existsSync(dataStorePath)) {
      const raw = fs.readFileSync(dataStorePath, "utf-8");
      dataStore = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read data_store.json:", e.message);
  }

  // Insert/Merge Users
  for (const u of USERS) {
    const idx = dataStore.users.findIndex(item => item.id === u.id);
    const userObj = {
      ...u,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      dataStore.users[idx] = { ...dataStore.users[idx], ...userObj };
    } else {
      dataStore.users.push(userObj);
    }
  }

  // Insert/Merge Products
  for (const p of PENDING_PRODUCTS) {
    const idx = dataStore.products.findIndex(item => item.id === p.id);
    const prodObj = {
      ...p,
      currency: "INR",
      countryCode: "IN",
      district: p.city,
      lat: 12.9716,
      lng: 77.5946,
      images: JSON.stringify([{ color: "Natural", colorHex: "#10b981", imageUrl: p.imageUrl }]),
      tierPrices: "{}",
      organic: 1,
      rating: 0,
      numReviews: 0,
      createdAt: new Date().toISOString()
    };
    if (idx >= 0) {
      dataStore.products[idx] = { ...dataStore.products[idx], ...prodObj };
    } else {
      dataStore.products.push(prodObj);
    }
  }

  fs.writeFileSync(dataStorePath, JSON.stringify(dataStore, null, 2), "utf-8");
  console.log("✅ data_store.json updated successfully with 10 pending products!");

  // 2. Seed into MySQL
  try {
    const pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 5
    });

    for (const u of USERS) {
      const [rows] = await pool.query("SELECT id FROM users WHERE id = ?", [u.id]);
      if (rows.length === 0) {
        await pool.query(
          `INSERT INTO users (id, email, password, role, name, storeName, countryCode, countryName, region, district, city, lat, lng, currency, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, 0, ?)`,
          [u.id, u.email, u.password, u.role, u.name, u.storeName, u.countryCode, u.countryName, u.region, u.district, u.city, u.lat, u.lng, u.verificationStatus, u.about, u.rating, u.completedOrders, new Date().toISOString()]
        );
        console.log(`✅ Seeded User in MySQL: ${u.name} (${u.role})`);
      } else {
        await pool.query(
          `UPDATE users SET verificationStatus = ? WHERE id = ?`,
          [u.verificationStatus, u.id]
        );
      }
    }

    for (const p of PENDING_PRODUCTS) {
      const [rows] = await pool.query("SELECT id FROM products WHERE id = ?", [p.id]);
      if (rows.length === 0) {
        await pool.query(
          `INSERT INTO products (id, name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, images, moq, tierPrices, organic, createdAt, status, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears, ecoScore, co2SavedKg, plasticSavedKg, waterSavedLiters, treesEquivalent)
           VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, p.name, p.category, p.grade, p.price, p.unit, p.stock, p.vendorId,
            p.region, p.city, p.city, 12.9716, 77.5946, p.description, p.imageUrl,
            JSON.stringify([{ color: "Natural", colorHex: "#10b981", imageUrl: p.imageUrl }]),
            p.moq, new Date().toISOString(), p.status, p.materialType, p.packagingType,
            p.recyclability, p.isRenewableEnergy, p.lifespanYears, p.ecoScore,
            p.co2SavedKg, p.plasticSavedKg, p.waterSavedLiters, p.treesEquivalent
          ]
        );
        console.log(`✅ Seeded Pending Product in MySQL: ${p.name}`);
      } else {
        await pool.query(
          `UPDATE products SET status = 'pending', imageUrl = ? WHERE id = ?`,
          [p.imageUrl, p.id]
        );
      }
    }

    await pool.end();
    console.log("🎉 MySQL pending products and vendor verifications seeded successfully!");
  } catch (err) {
    console.warn("MySQL Seeding Warning (will fallback to data_store.json):", err.message);
  }
}

seedPendingData();
