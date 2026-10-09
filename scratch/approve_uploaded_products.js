import { query } from "../backend/database.js";
import fs from "fs";

async function approveAllUploaded() {
  await query.run("UPDATE products SET status = 'approved' WHERE imageUrl LIKE '%/uploads/%' OR id LIKE 'p_up_%' OR status != 'approved'");

  const storePath = "./backend/data_store.json";
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, "utf8"));
    if (Array.isArray(store.products)) {
      store.products.forEach((p) => {
        p.status = "approved";
      });
      fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
    }
  }

  const allApproved = await query.all("SELECT id, name, imageUrl, status FROM products WHERE status = 'approved'");
  console.log(`✅ Approved products count: ${allApproved.length}`);
  allApproved.forEach((p) => {
    console.log(`  - ${p.name} (${p.imageUrl})`);
  });
}

approveAllUploaded().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Error approving products:", err);
  process.exit(1);
});
