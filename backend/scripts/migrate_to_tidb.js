import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, "../../.env") });

const storeFilePath = join(__dirname, "../data_store.json");

console.log("\n🐬 EcoMart TiDB Cloud Migration Utility\n");

async function runMigration() {
  let host = process.env.DB_HOST || "localhost";
  let port = Number(process.env.DB_PORT || 3306);
  let user = process.env.DB_USER || "root";
  let password = process.env.DB_PASSWORD || "";
  let databaseName = process.env.DB_NAME || "ecomart";
  let ssl = process.env.DB_SSL === "true" || port === 4000 || host.includes("tidbcloud") || host.includes("aivencloud");

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

  console.log(`Connecting to database at ${host}:${port}...`);
  console.log(`Database name: ${databaseName}`);
  console.log(`SSL enabled: ${ssl ? "YES (Required for TiDB Cloud)" : "NO"}\n`);

  const sslOptions = ssl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined;

  let pool;
  try {
    pool = mysql.createPool({
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

    await pool.query("SELECT 1");
    console.log("✅ Successfully connected to TiDB / MySQL server!\n");
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    if (err.message.includes("insecure transport") || !ssl) {
      console.log("💡 Tip: TiDB Cloud requires SSL. Make sure DB_SSL=true or port is 4000.");
    }
    process.exit(1);
  }

  // Read data_store.json
  if (!fs.existsSync(storeFilePath)) {
    console.error("❌ Could not find backend/data_store.json file to migrate.");
    process.exit(1);
  }

  const rawJson = fs.readFileSync(storeFilePath, "utf8");
  const data = JSON.parse(rawJson);

  console.log("📁 Loaded backend/data_store.json:");
  console.log(`   - Users: ${data.users?.length || 0}`);
  console.log(`   - Products: ${data.products?.length || 0}`);
  console.log(`   - Orders: ${data.orders?.length || 0}`);
  console.log(`   - Offers: ${data.offers?.length || 0}`);
  console.log(`   - Coupons: ${data.coupons?.length || 0}`);
  console.log(`   - Reviews: ${data.reviews?.length || 0}\n`);

  // Ensure tables exist
  console.log("🔨 Verifying and creating required tables...");
  await pool.query("SET FOREIGN_KEY_CHECKS = 0;");

  const tables = [
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
      createdAt VARCHAR(100),
      updatedAt VARCHAR(100)
    )`,
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
      imageUrl TEXT,
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
      images TEXT
    )`,
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
      createdAt VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(255) PRIMARY KEY,
      orderId VARCHAR(255),
      productId VARCHAR(255),
      vendorId VARCHAR(255),
      qty INT,
      unitPrice DOUBLE,
      amount DOUBLE
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(255) PRIMARY KEY,
      userId VARCHAR(255),
      text TEXT,
      type VARCHAR(100),
      \`read\` INT DEFAULT 0,
      createdAt VARCHAR(100)
    )`,
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
      createdAt VARCHAR(100)
    )`,
    `CREATE TABLE IF NOT EXISTS coupons (
      id VARCHAR(255) PRIMARY KEY,
      code VARCHAR(100) UNIQUE,
      description TEXT,
      discountPercentage DOUBLE,
      pointsRequired INT,
      isActive INT DEFAULT 1,
      createdAt VARCHAR(100)
    )`,
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
      updatedAt VARCHAR(100)
    )`
  ];

  for (const sql of tables) {
    await pool.query(sql);
  }
  console.log("✅ All tables are ready.\n");

  // Helper function to insert or update
  async function insertTable(tableName, items, cols) {
    if (!Array.isArray(items) || items.length === 0) return 0;
    let count = 0;
    const colNames = cols.join(", ");
    const placeholders = cols.map(() => "?").join(", ");
    const updateClauses = cols.filter(c => c !== "id").map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(", ");

    const query = `
      INSERT INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(", ")})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClauses}
    `;

    for (const item of items) {
      const values = cols.map((col) => {
        let val = item[col];
        if (typeof val === "object" && val !== null) {
          return JSON.stringify(val);
        }
        return val === undefined ? null : val;
      });
      try {
        await pool.query(query, values);
        count++;
      } catch (err) {
        console.warn(`   ⚠️ Warning importing into ${tableName} (${item.id || item.code}): ${err.message}`);
      }
    }
    return count;
  }

  console.log("🚀 Migrating records from data_store.json to TiDB Cloud...");

  // 1. Users
  const userCols = [
    "id", "email", "password", "role", "name", "storeName",
    "countryCode", "countryName", "region", "district", "city",
    "postalCode", "lat", "lng", "currency", "verified", "resetOtpCode",
    "resetOtpExpiry", "verificationStatus", "about", "rating",
    "completedOrders", "greenPoints", "upiId", "accountHolderName",
    "accountNumber", "ifscCode", "panNumber", "gstin", "createdAt", "updatedAt"
  ];
  const uCount = await insertTable("users", data.users, userCols);
  console.log(`   ✅ Users migrated: ${uCount}`);

  // 2. Products
  const prodCols = [
    "id", "name", "category", "grade", "price", "currency", "unit",
    "stock", "vendorId", "countryCode", "region", "district", "city",
    "lat", "lng", "description", "imageUrl", "moq", "tierPrices",
    "organic", "harvestDate", "createdAt", "status", "rejectionReason",
    "materialType", "packagingType", "recyclability", "isRenewableEnergy",
    "lifespanYears", "ecoScore", "co2SavedKg", "plasticSavedKg",
    "waterSavedLiters", "treesEquivalent", "rating", "numReviews", "images"
  ];
  const pCount = await insertTable("products", data.products, prodCols);
  console.log(`   ✅ Products migrated: ${pCount}`);

  // 3. Orders
  const orderCols = [
    "id", "customerId", "customerName", "deliveryCountry", "deliveryRegion",
    "deliveryDistrict", "deliveryCity", "deliveryPostalCode", "deliveryAddress",
    "paymentMethod", "totalAmount", "currency", "status", "paymentStatus",
    "paymentVerifiedAt", "paymentFailureReason", "greenPointsEarned",
    "razorpayOrderId", "razorpayPaymentId", "razorpaySignature",
    "vendorPayoutStatus", "vendorUpiId", "createdAt"
  ];
  const oCount = await insertTable("orders", data.orders, orderCols);
  console.log(`   ✅ Orders migrated: ${oCount}`);

  // 4. Order Items
  const itemCols = ["id", "orderId", "productId", "vendorId", "qty", "unitPrice", "amount"];
  const oiCount = await insertTable("order_items", data.order_items, itemCols);
  console.log(`   ✅ Order items migrated: ${oiCount}`);

  // 5. Coupons
  const couponCols = ["id", "code", "description", "discountPercentage", "pointsRequired", "isActive", "createdAt"];
  const cCount = await insertTable("coupons", data.coupons, couponCols);
  console.log(`   ✅ Coupons migrated: ${cCount}`);

  // 6. Offers
  const offerCols = [
    "id", "vendorId", "title", "description", "type", "discountValue",
    "productIds", "couponCode", "startDate", "endDate", "status", "rejectionReason",
    "createdAt", "updatedAt"
  ];
  const ofCount = await insertTable("offers", data.offers, offerCols);
  console.log(`   ✅ Offers migrated: ${ofCount}`);

  // 7. Reviews
  const revCols = [
    "id", "productId", "vendorId", "customerId", "customerName", "rating",
    "comment", "imageUrl", "verifiedPurchase", "status", "createdAt"
  ];
  const rCount = await insertTable("reviews", data.reviews, revCols);
  console.log(`   ✅ Reviews migrated: ${rCount}`);

  // 8. Notifications
  const notifCols = ["id", "userId", "text", "type", "read", "createdAt"];
  const nCount = await insertTable("notifications", data.notifications, notifCols);
  console.log(`   ✅ Notifications migrated: ${nCount}`);

  await pool.query("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("\n🎉 TiDB Cloud Migration Completed Successfully!");
  console.log("👉 Now update your .env (or Render environment) with DB_TYPE=mysql and your TiDB credentials.");

  await pool.end();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
