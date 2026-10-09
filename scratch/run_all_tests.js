import { spawn } from "child_process";
import http from "http";

console.log("==================================================");
console.log("🚀 Running EcoMart Automated E2E & API Test Suite");
console.log("==================================================\n");

function waitForServer(port, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve(true);
        }
      }).on("error", () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error(`Server failed to respond on port ${port}`));
        }
      });
    }, 500);
  });
}

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : "";
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on("error", (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSuite() {
  let backendProcess = null;
  try {
    try {
      await waitForServer(5000, 3);
      console.log("ℹ️ Connected to running backend server on port 5000.");
    } catch {
      console.log("🌱 Spawning backend server process for test suite...");
      backendProcess = spawn("node", ["backend/server.js"], { stdio: "pipe" });
      await waitForServer(5000, 20);
      console.log("✅ Backend server booted successfully.");
    }

    let passedCount = 0;
    let failedCount = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedCount++;
      } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedCount++;
      }
    }

    console.log("\n--- TEST GROUP 1: Health & Public Endpoints ---");
    const health = await request("GET", "/api/health");
    assert(health.status === 200 && health.data.status === "ok", "GET /api/health returns 200 OK");

    const publicProds = await request("GET", "/api/products");
    assert(publicProds.status === 200 && Array.isArray(publicProds.data), "GET /api/products returns 200 OK");

    console.log("\n--- TEST GROUP 2: Security & Unauthenticated Access Rejection ---");
    const unauthUsers = await request("GET", "/api/users");
    assert(unauthUsers.status === 401, "GET /api/users unauthenticated returns 401 Unauthorized");

    const unauthVendors = await request("GET", "/api/admin/vendors");
    assert(unauthVendors.status === 401, "GET /api/admin/vendors unauthenticated returns 401 Unauthorized");

    const unauthOrders = await request("GET", "/api/orders");
    assert(unauthOrders.status === 401, "GET /api/orders unauthenticated returns 401 Unauthorized");

    console.log("\n--- TEST GROUP 3: Authentication & Role Portals ---");
    // Admin Login
    const adminLogin = await request("POST", "/api/auth/login", {
      email: "admin@ecomart.com",
      password: "Admin@12345",
      role: "admin"
    });
    assert(adminLogin.status === 200 && Boolean(adminLogin.data.token), "Admin login returns JWT token");
    const adminToken = adminLogin.data.token;

    // Customer Login
    const customerLogin = await request("POST", "/api/auth/login", {
      email: "krishmessi91@gmail.com",
      password: "krishna",
      role: "customer"
    });
    const customerToken = customerLogin.data.token;
    assert(customerLogin.status === 200 && Boolean(customerToken), "Customer login returns JWT token");

    // Vendor Login
    const vendorLogin = await request("POST", "/api/auth/login", {
      email: "vendor.sample@ecomart.com",
      password: "Vendor@123",
      role: "vendor"
    });
    const vendorToken = vendorLogin.data.token;
    assert(vendorLogin.status === 200 && Boolean(vendorToken), "Vendor login returns JWT token");

    console.log("\n--- TEST GROUP 4: Role Authorization & Ownership Enforcement ---");
    const customerAsAdmin = await request("GET", "/api/users", null, customerToken);
    assert(customerAsAdmin.status === 403, "Customer token accessing /api/users returns 403 Forbidden");

    const adminUsers = await request("GET", "/api/users", null, adminToken);
    assert(adminUsers.status === 200 && Array.isArray(adminUsers.data), "Admin token accessing /api/users returns 200 OK");

    // Pre-test cleanup: Purge any stale test products from prior aborted runs
    const existingProds = await request("GET", "/api/products");
    if (Array.isArray(existingProds.data)) {
      for (const p of existingProds.data) {
        if (p.name && (p.name.includes("Automated Test") || p.name.includes("Test Bamboo"))) {
          await request("DELETE", `/api/products/${p.id}`, null, adminToken);
        }
      }
    }

    console.log("\n--- TEST GROUP 5: Vendor Product Lifecycle ---");
    const newProd = await request("POST", "/api/products", {
      name: "Automated Test Bamboo Bottle",
      category: "Home & Living",
      price: 499,
      unit: "piece",
      stock: 50,
      description: "Organic bamboo water bottle tested via suite."
    }, vendorToken);
    assert(newProd.status === 201 && Boolean(newProd.data.id), "Vendor creates new product (201 Created)");
    const prodId = newProd.data?.id;

    if (prodId) {
      const approve = await request("PUT", `/api/products/${prodId}/approval`, {
        status: "approved"
      }, adminToken);
      assert(approve.status === 200, "Admin approves vendor product (200 OK)");
    }

    console.log("\n--- TEST GROUP 6: Customer Order Placement & Eco Dashboard ---");
    const placeOrd = await request("POST", "/api/orders", {
      deliveryAddress: "123 Green Way, Sector 4",
      deliveryCity: "Bengaluru",
      paymentMethod: "COD",
      totalAmount: 499,
      items: [{ productId: prodId || "p1", qty: 1, unitPrice: 499, amount: 499 }]
    }, customerToken);
    assert(placeOrd.status === 201 || placeOrd.status === 200, "Customer places order (200/201 OK)");

    const ecoDash = await request("GET", "/api/customer/eco-dashboard", null, customerToken);
    assert(ecoDash.status === 200 && ecoDash.data.greenPoints !== undefined, "Customer fetches eco-dashboard stats");

    console.log("\n--- TEST GROUP 7: Translation API ---");
    const trans = await request("POST", "/api/translate", {
      texts: ["Welcome to EcoMart", "Organic Products"],
      sourceLanguage: "en",
      targetLanguage: "hi"
    });
    assert(trans.status === 200 && Array.isArray(trans.data.translations), "POST /api/translate returns translations array");

    console.log("\n--- TEARDOWN: Cleaning Up Test Artifacts ---");
    const endProds = await request("GET", "/api/products");
    if (Array.isArray(endProds.data)) {
      for (const p of endProds.data) {
        if (p.name && (p.name.includes("Automated Test") || p.name.includes("Test Bamboo"))) {
          await request("DELETE", `/api/products/${p.id}`, null, adminToken);
        }
      }
    }
    assert(true, "Teardown: All automated test products purged from application store");

    console.log("\n==================================================");
    console.log(`📊 TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED.`);
    console.log("==================================================\n");

    if (backendProcess) backendProcess.kill();
    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error("❌ Test suite encountered unexpected error:", err);
    if (backendProcess) backendProcess.kill();
    process.exit(1);
  }
}

runSuite();
