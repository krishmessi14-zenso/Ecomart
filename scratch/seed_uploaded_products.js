import mysql from "../backend/node_modules/mysql2/promise.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: "./.env" });

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const databaseName = process.env.DB_NAME || "ecomart";

const createdAt = new Date().toISOString();

const uploadedProducts = [
  {
    id: "p_up_1",
    name: "Eco Bamboo Toothbrush (Soft Charcoal Bristles)",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 199,
    currency: "INR",
    unit: "pack",
    stock: 80,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "100% biodegradable natural bamboo handle toothbrush with soft BPA-free charcoal infused bristles.",
    imageUrl: "/uploads/products/prod-1790243031689-913563227.png",
    images: JSON.stringify(["/uploads/products/prod-1790243031689-913563227.png", "/uploads/products/prod-1790243040248-561049830.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 95,
    co2SavedKg: 3.2,
    plasticSavedKg: 0.45,
    waterSavedLiters: 110,
    treesEquivalent: 0.14
  },
  {
    id: "p_up_2",
    name: "Natural Charcoal Infused Bamboo Brush Pack",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 249,
    currency: "INR",
    unit: "pack",
    stock: 100,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Ergonomic eco-friendly bamboo brush with natural antibacterial charcoal bristles.",
    imageUrl: "/uploads/products/prod-1790243040248-561049830.png",
    images: JSON.stringify(["/uploads/products/prod-1790243040248-561049830.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 98,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 94,
    co2SavedKg: 3.1,
    plasticSavedKg: 0.42,
    waterSavedLiters: 105,
    treesEquivalent: 0.13
  },
  {
    id: "p_up_3",
    name: "Biodegradable Dental Bamboo Toothbrush Set",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 179,
    currency: "INR",
    unit: "pack",
    stock: 60,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Zero-waste compostable bamboo handle toothbrush designed for maximum dental hygiene.",
    imageUrl: "/uploads/products/prod-1790243048443-695762376.png",
    images: JSON.stringify(["/uploads/products/prod-1790243048443-695762376.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 96,
    co2SavedKg: 3.3,
    plasticSavedKg: 0.46,
    waterSavedLiters: 112,
    treesEquivalent: 0.15
  },
  {
    id: "p_up_4",
    name: "Handcrafted Coconut Shell Eco Serving Bowl",
    category: "Reusable & Household",
    grade: "A",
    price: 299,
    currency: "INR",
    unit: "piece",
    stock: 45,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "100% natural reclaimed coconut shell bowl, hand-polished with organic coconut oil.",
    imageUrl: "/uploads/products/prod-1790593582957-927081191.png",
    images: JSON.stringify(["/uploads/products/prod-1790593582957-927081191.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "organic",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 5,
    ecoScore: 98,
    co2SavedKg: 4.1,
    plasticSavedKg: 0.6,
    waterSavedLiters: 140,
    treesEquivalent: 0.18
  },
  {
    id: "p_up_5",
    name: "Organic Teak Wood Cutlery & Spoon Set",
    category: "Reusable & Household",
    grade: "A",
    price: 349,
    currency: "INR",
    unit: "set",
    stock: 70,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Sustainable handcrafted teak wood spoon, fork, and chopstick set for plastic-free dining.",
    imageUrl: "/uploads/products/prod-1790593605392-750242933.png",
    images: JSON.stringify(["/uploads/products/prod-1790593605392-750242933.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 95,
    isRenewableEnergy: 1,
    lifespanYears: 4,
    ecoScore: 93,
    co2SavedKg: 3.4,
    plasticSavedKg: 0.48,
    waterSavedLiters: 115,
    treesEquivalent: 0.15
  },
  {
    id: "p_up_6",
    name: "Unbleached Natural Jute Eco Market Tote",
    category: "Sustainable Apparel",
    grade: "A",
    price: 229,
    currency: "INR",
    unit: "piece",
    stock: 110,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Heavy-duty 100% natural jute fiber tote bag with padded soft handles.",
    imageUrl: "/uploads/products/prod-1790593628130-379440939.png",
    images: JSON.stringify(["/uploads/products/prod-1790593628130-379440939.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "organic",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 3,
    ecoScore: 95,
    co2SavedKg: 3.5,
    plasticSavedKg: 0.52,
    waterSavedLiters: 125,
    treesEquivalent: 0.16
  },
  {
    id: "p_up_7",
    name: "Compostable Plant-Based Eco Drinking Straws",
    category: "Reusable & Household",
    grade: "A",
    price: 149,
    currency: "INR",
    unit: "pack",
    stock: 150,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "100% marine-degradable plant starch straws suitable for hot and cold beverages.",
    imageUrl: "/uploads/products/prod-1790593946124-6418158.png",
    images: JSON.stringify(["/uploads/products/prod-1790593946124-6418158.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "biodegradable",
    packagingType: "compostable",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 1,
    ecoScore: 97,
    co2SavedKg: 3.0,
    plasticSavedKg: 0.4,
    waterSavedLiters: 100,
    treesEquivalent: 0.13
  },
  {
    id: "p_up_8",
    name: "Handcrafted Anti-Static Neem Wood Hair Comb",
    category: "Personal Care & Hygiene",
    grade: "A",
    price: 129,
    currency: "INR",
    unit: "piece",
    stock: 90,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Medicinal neem wood comb that prevents dandruff, scalp irritation, and hair breakage.",
    imageUrl: "/uploads/products/prod-1790593953955-739987958.png",
    images: JSON.stringify(["/uploads/products/prod-1790593953955-739987958.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 100,
    isRenewableEnergy: 1,
    lifespanYears: 2,
    ecoScore: 92,
    co2SavedKg: 3.1,
    plasticSavedKg: 0.41,
    waterSavedLiters: 108,
    treesEquivalent: 0.13
  },
  {
    id: "p_up_9",
    name: "Insulated Bamboo Casing Thermal Stainless Water Bottle",
    category: "Reusable & Household",
    grade: "A",
    price: 449,
    currency: "INR",
    unit: "piece",
    stock: 65,
    vendorId: "v_sample_vendor",
    countryCode: "IN",
    region: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    description: "Premium double-wall insulated water bottle encased in natural handcrafted bamboo.",
    imageUrl: "/uploads/products/prod-1790593972600-164430843.png",
    images: JSON.stringify(["/uploads/products/prod-1790593972600-164430843.png"]),
    moq: 1,
    tierPrices: "{}",
    organic: 1,
    harvestDate: null,
    createdAt,
    status: "approved",
    materialType: "bamboo",
    packagingType: "plastic_free",
    recyclability: 96,
    isRenewableEnergy: 1,
    lifespanYears: 4,
    ecoScore: 95,
    co2SavedKg: 3.6,
    plasticSavedKg: 0.52,
    waterSavedLiters: 125,
    treesEquivalent: 0.16
  }
];

async function seedMySQLDirect() {
  const connection = await mysql.createConnection({ host, port, user, password, database: databaseName });
  console.log("Connected to MySQL direct connection.");

  // Also approve existing products
  await connection.query("UPDATE products SET status = 'approved'");

  for (const p of uploadedProducts) {
    const [rows] = await connection.query("SELECT id FROM products WHERE id = ?", [p.id]);
    if (rows.length === 0) {
      await connection.query(
        `INSERT INTO products (id, name, category, grade, price, currency, unit, stock, vendorId, countryCode, region, district, city, lat, lng, description, imageUrl, images, moq, tierPrices, organic, harvestDate, createdAt, status, materialType, packagingType, recyclability, isRenewableEnergy, lifespanYears, ecoScore, co2SavedKg, plasticSavedKg, waterSavedLiters, treesEquivalent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.id, p.name, p.category, p.grade, p.price, p.currency, p.unit, p.stock, p.vendorId,
          p.countryCode, p.region, p.district, p.city, p.lat, p.lng, p.description, p.imageUrl,
          p.images, p.moq, p.tierPrices, p.organic, p.harvestDate, p.createdAt, p.status,
          p.materialType, p.packagingType, p.recyclability, p.isRenewableEnergy, p.lifespanYears,
          p.ecoScore, p.co2SavedKg, p.plasticSavedKg, p.waterSavedLiters, p.treesEquivalent
        ]
      );
      console.log(`Directly inserted into MySQL: ${p.name}`);
    } else {
      await connection.query("UPDATE products SET status = 'approved', imageUrl = ? WHERE id = ?", [p.imageUrl, p.id]);
    }
  }

  const [allProducts] = await connection.query("SELECT id, name, imageUrl, status FROM products WHERE status = 'approved'");
  console.log(`✅ Total approved products in MySQL database: ${allProducts.length}`);

  await connection.end();

  // Update data_store.json
  const storePath = "./backend/data_store.json";
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (Array.isArray(store.products)) {
      store.products.forEach(p => p.status = "approved");
      uploadedProducts.forEach((p) => {
        if (!store.products.find((sp) => sp.id === p.id)) {
          store.products.push(p);
        }
      });
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
      console.log("Updated data_store.json!");
    }
  }
}

seedMySQLDirect().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Direct MySQL seeding error:", err);
  process.exit(1);
});
