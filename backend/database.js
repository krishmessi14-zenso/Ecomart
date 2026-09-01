import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "database.sqlite");

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening SQLite database:", err.message);
  } else {
    console.log("Connected to SQLite database at:", dbPath);
    initDatabase();
  }
});

// Promisify SQLite methods for async/await usage
export const query = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

function initDatabase() {
  db.serialize(() => {
    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON");

    // 1. Create Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        name TEXT,
        storeName TEXT,
        countryCode TEXT DEFAULT 'IN',
        countryName TEXT DEFAULT 'India',
        region TEXT,
        district TEXT,
        city TEXT,
        postalCode TEXT,
        lat REAL,
        lng REAL,
        currency TEXT DEFAULT 'INR',
        securityQuestion TEXT,
        securityAnswer TEXT,
        resetOtpCode TEXT,
        resetOtpExpiry INTEGER,
        verificationStatus TEXT DEFAULT 'Pending',
        about TEXT,
        rating REAL DEFAULT 0,
        completedOrders INTEGER DEFAULT 0,
        greenPoints INTEGER DEFAULT 0,
        createdAt TEXT
      )
    `);

    // 2. Create Products Table
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        grade TEXT,
        price REAL,
        currency TEXT DEFAULT 'INR',
        unit TEXT,
        stock INTEGER,
        vendorId TEXT,
        countryCode TEXT DEFAULT 'IN',
        region TEXT,
        district TEXT,
        city TEXT,
        lat REAL,
        lng REAL,
        description TEXT,
        imageUrl TEXT,
        moq INTEGER DEFAULT 1,
        tierPrices TEXT,
        organic INTEGER DEFAULT 0,
        harvestDate TEXT,
        createdAt TEXT,
        FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 3. Create Orders Table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customerId TEXT,
        customerName TEXT,
        deliveryCountry TEXT DEFAULT 'India',
        deliveryRegion TEXT,
        deliveryDistrict TEXT,
        deliveryCity TEXT,
        deliveryPostalCode TEXT,
        deliveryAddress TEXT,
        paymentMethod TEXT,
        totalAmount REAL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'Pending',
        greenPointsEarned INTEGER DEFAULT 0,
        createdAt TEXT,
        FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Safe column additions for existing sqlite database files
    const alterColumns = [
      "ALTER TABLE users ADD COLUMN countryCode TEXT DEFAULT 'IN'",
      "ALTER TABLE users ADD COLUMN countryName TEXT DEFAULT 'India'",
      "ALTER TABLE users ADD COLUMN district TEXT",
      "ALTER TABLE users ADD COLUMN city TEXT",
      "ALTER TABLE users ADD COLUMN postalCode TEXT",
      "ALTER TABLE users ADD COLUMN lat REAL",
      "ALTER TABLE users ADD COLUMN lng REAL",
      "ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'INR'",
      "ALTER TABLE users ADD COLUMN greenPoints INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN resetOtpCode TEXT",
      "ALTER TABLE users ADD COLUMN resetOtpExpiry INTEGER",
      "ALTER TABLE products ADD COLUMN currency TEXT DEFAULT 'INR'",
      "ALTER TABLE products ADD COLUMN countryCode TEXT DEFAULT 'IN'",
      "ALTER TABLE products ADD COLUMN district TEXT",
      "ALTER TABLE products ADD COLUMN city TEXT",
      "ALTER TABLE products ADD COLUMN lat REAL",
      "ALTER TABLE products ADD COLUMN lng REAL",
      // --- EcoMart sustainability & marketplace-approval fields ---
      "ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'pending'",
      "ALTER TABLE products ADD COLUMN rejectionReason TEXT",
      "ALTER TABLE products ADD COLUMN materialType TEXT DEFAULT 'standard'",
      "ALTER TABLE products ADD COLUMN packagingType TEXT DEFAULT 'minimal_plastic'",
      "ALTER TABLE products ADD COLUMN recyclability INTEGER DEFAULT 80",
      "ALTER TABLE products ADD COLUMN isRenewableEnergy INTEGER DEFAULT 0",
      "ALTER TABLE products ADD COLUMN lifespanYears REAL DEFAULT 2",
      "ALTER TABLE products ADD COLUMN ecoScore INTEGER DEFAULT 0",
      "ALTER TABLE products ADD COLUMN co2SavedKg REAL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN plasticSavedKg REAL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN waterSavedLiters REAL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN treesEquivalent REAL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN rating REAL DEFAULT 0",
      "ALTER TABLE products ADD COLUMN numReviews INTEGER DEFAULT 0",
      "ALTER TABLE orders ADD COLUMN deliveryCountry TEXT DEFAULT 'India'",
      "ALTER TABLE orders ADD COLUMN deliveryRegion TEXT",
      "ALTER TABLE orders ADD COLUMN deliveryDistrict TEXT",
      "ALTER TABLE orders ADD COLUMN deliveryCity TEXT",
      "ALTER TABLE orders ADD COLUMN deliveryPostalCode TEXT",
      "ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'INR'",
      "ALTER TABLE orders ADD COLUMN greenPointsEarned INTEGER DEFAULT 0"
    ];

    alterColumns.forEach(sql => {
      db.run(sql, () => { /* Ignore errors if column already exists */ });
    });

    // 4. Create Order Items Table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        orderId TEXT,
        productId TEXT,
        vendorId TEXT,
        qty INTEGER,
        unitPrice REAL,
        amount REAL,
        FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY(productId) REFERENCES products(id) ON DELETE SET NULL,
        FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 5. Create Notifications Table
    db.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT,
        text TEXT,
        type TEXT,
        read INTEGER DEFAULT 0,
        createdAt TEXT,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 6. Create Reviews Table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        productId TEXT,
        vendorId TEXT,
        customerId TEXT,
        customerName TEXT,
        rating INTEGER,
        comment TEXT,
        verifiedPurchase INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Approved',
        createdAt TEXT,
        FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY(vendorId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 7. Create Saved Searches Table
    db.run(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id TEXT PRIMARY KEY,
        customerId TEXT,
        query TEXT,
        filters TEXT,
        createdAt TEXT,
        FOREIGN KEY(customerId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 8. Create Coupons Table (Green Rewards catalog)
    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        description TEXT,
        discountPercentage REAL,
        pointsRequired INTEGER,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT
      )
    `);

    // Seed upgraded tables sequentially
    setTimeout(seedData, 500);
  });
}

/**
 * EcoMart Database Initializer
 *
 * IMPORTANT: This does NOT create any fake/demo vendors, customers, products,
 * orders, or reviews. Per the EcoMart requirements, the marketplace must start
 * completely empty of products, and all vendors/customers/orders must be
 * created through the real registration & checkout flows.
 *
 * Only provisions:
 *   1. One real Admin account (needed to log in and approve products)
 *   2. The default Green Reward coupon catalog (configuration, not marketplace content)
 *
 * Safe to re-run: it will not duplicate the admin account or coupons.
 */
async function seedData() {
  try {
    const row = await query.get("SELECT COUNT(*) as count FROM users");
    if (row && row.count === 0) {
      console.log("Seeding EcoMart Admin account...");
      const adminEmail = process.env.ADMIN_EMAIL || "admin@ecomart.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

      await query.run(
        `INSERT INTO users (id, email, password, role, name, verificationStatus, about, rating, completedOrders, greenPoints, createdAt)
         VALUES (?, ?, ?, 'admin', ?, 'Verified', ?, 5.0, 0, 0, ?)`,
        ["a1", adminEmail, adminPassword, "EcoMart Admin", "EcoMart Platform Administration Account.", new Date().toISOString()]
      );
      console.log(`✅ Admin account created: ${adminEmail} / ${adminPassword}`);
      console.log("⚠️  Please change this password after first login in production.");
    } else {
      console.log("ℹ️  Users table already has data, skipping admin seeding.");
    }

    const couponRow = await query.get("SELECT COUNT(*) as count FROM coupons");
    if (couponRow && couponRow.count === 0) {
      console.log("Seeding default Green Reward coupons...");
      const coupons = [
        ["c1", "ECOFIRST15", "15% Off Your Sustainable Order", 15, 100, "2026-01-01T00:00:00.000Z"],
        ["c2", "GREENHERO25", "25% Off Super Eco Warrior Special", 25, 200, "2026-01-01T00:00:00.000Z"],
        ["c3", "FREESHIPECO", "Free Carbon-Neutral Delivery", 100, 50, "2026-01-01T00:00:00.000Z"]
      ];
      for (const c of coupons) {
        await query.run(
          `INSERT INTO coupons (id, code, description, discountPercentage, pointsRequired, isActive, createdAt)
           VALUES (?, ?, ?, ?, ?, 1, ?)`,
          c
        );
      }
    }

    console.log("✅ Database initialization complete. Marketplace has ZERO products — ready for real vendors!");
  } catch (err) {
    console.error("Error during database seeding:", err);
  }
}

export default db;
