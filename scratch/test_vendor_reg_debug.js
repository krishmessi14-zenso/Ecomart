import mysql from "../backend/node_modules/mysql2/promise.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const host = process.env.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || 3306);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const databaseName = process.env.DB_NAME || "ecomart";

async function debugDirectMySQL() {
  const conn = await mysql.createConnection({ host, port, user, password, database: databaseName });
  const email = "bhavithran2006@gmail.com";

  await conn.query("DELETE FROM email_otps WHERE LOWER(email) = LOWER(?)", [email]);
  await conn.query(
    "INSERT INTO email_otps (id, email, otp, purpose, verified, attempts, expiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ["otp_bhavi_test", email, "123456", "register_vendor", 1, 0, Date.now() + 600000, new Date().toISOString(), new Date().toISOString()]
  );

  const [allOtps] = await conn.query("SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?)", [email]);
  console.log("MySQL all OTPs for bhavithran:", allOtps);

  const [vOtps] = await conn.query("SELECT * FROM email_otps WHERE LOWER(email) = LOWER(?) AND purpose = 'register_vendor' AND verified = 1 ORDER BY expiresAt DESC", [email]);
  console.log("MySQL verified OTP result:", vOtps);

  await conn.end();
}

debugDirectMySQL().then(() => process.exit(0)).catch(err => {
  console.error("MySQL Debug Error:", err);
  process.exit(1);
});
