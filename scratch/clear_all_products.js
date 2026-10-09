import mysql from "../backend/node_modules/mysql2/promise.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: "./.env" });

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const databaseName = process.env.DB_NAME || "ecomart";

async function clearAllProducts() {
  try {
    const connection = await mysql.createConnection({ host, port, user, password, database: databaseName });
    await connection.query("DELETE FROM products");
    console.log("✅ Cleared all products from MySQL database.");
    await connection.end();
  } catch (err) {
    console.warn("MySQL clear warning:", err.message);
  }

  const storePath = "./backend/data_store.json";
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    store.products = [];
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    console.log("✅ Cleared all products from backend/data_store.json.");
  }
}

clearAllProducts().then(() => {
  console.log("🎉 All products removed from marketplace successfully!");
  process.exit(0);
}).catch((err) => {
  console.error("Error clearing products:", err);
  process.exit(1);
});
