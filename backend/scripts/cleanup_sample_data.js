import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const isApply = process.argv.includes("--apply");

async function cleanupSampleData() {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "ecomart";

  console.log(`🧹 Running MySQL Sample Data Cleanup (${isApply ? "APPLY MODE" : "DRY RUN MODE"})...`);

  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, database });
  } catch (err) {
    console.error(`❌ Unable to connect to MySQL database '${database}':`, err.message);
    process.exit(1);
  }

  const targetUsers = ["v_greenliving", "v_earthkraft", "v_auraecowear", "v_pending_bamboo", "v_pending_solar"];
  const now = Date.now();

  try {
    // 1. Users count / delete
    const [userRows] = await connection.query(
      "SELECT COUNT(*) as count FROM users WHERE id IN (?, ?, ?, ?, ?)",
      targetUsers
    );
    const userCount = userRows[0]?.count || 0;

    // 2. Products count / delete
    const [prodRows] = await connection.query(
      "SELECT COUNT(*) as count FROM products WHERE id LIKE 'p_pending_%' OR id LIKE 'p_sample_%'"
    );
    const prodCount = prodRows[0]?.count || 0;

    // 3. Offers count / delete
    const [offerRows] = await connection.query(
      "SELECT COUNT(*) as count FROM offers WHERE id LIKE 'off_seed_%' OR id LIKE 'off_test_%'"
    );
    const offerCount = offerRows[0]?.count || 0;

    // 4. Email OTPs count / delete
    const [otpRows] = await connection.query(
      "SELECT COUNT(*) as count FROM email_otps WHERE expiresAt < ?",
      [now]
    );
    const otpCount = otpRows[0]?.count || 0;

    console.log("----------------------------------------");
    console.log(`Users matching cleanup criteria: ${userCount}`);
    console.log(`Products matching cleanup criteria: ${prodCount}`);
    console.log(`Offers matching cleanup criteria: ${offerCount}`);
    console.log(`Expired Email OTPs matching cleanup criteria: ${otpCount}`);
    console.log("----------------------------------------");

    if (!isApply) {
      console.log("✨ DRY RUN complete. 0 records deleted. Run with --apply to execute deletions.");
    } else {
      let deletedUsers = 0;
      let deletedProducts = 0;
      let deletedOffers = 0;
      let deletedOtps = 0;

      if (userCount > 0) {
        const [res] = await connection.query("DELETE FROM users WHERE id IN (?, ?, ?, ?, ?)", targetUsers);
        deletedUsers = res.affectedRows;
      }
      if (prodCount > 0) {
        const [res] = await connection.query("DELETE FROM products WHERE id LIKE 'p_pending_%' OR id LIKE 'p_sample_%'");
        deletedProducts = res.affectedRows;
      }
      if (offerCount > 0) {
        const [res] = await connection.query("DELETE FROM offers WHERE id LIKE 'off_seed_%' OR id LIKE 'off_test_%'");
        deletedOffers = res.affectedRows;
      }
      if (otpCount > 0) {
        const [res] = await connection.query("DELETE FROM email_otps WHERE expiresAt < ?", [now]);
        deletedOtps = res.affectedRows;
      }

      console.log(`✅ APPLY MODE complete. Deleted: ${deletedUsers} user(s), ${deletedProducts} product(s), ${deletedOffers} offer(s), ${deletedOtps} expired OTP(s).`);
    }
  } catch (err) {
    console.error("❌ Error running cleanup script:", err.message);
  } finally {
    await connection.end();
  }
}

cleanupSampleData();
