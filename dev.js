import { spawn, execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("\n🌱 Starting EcoMart Full-Stack Development Environment...\n");

// Free Port 5000 if occupied by a previous process (Cross-Platform)
try {
  if (process.platform === "win32") {
    const stdout = execSync("Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess", { shell: "powershell.exe", encoding: "utf8" });
    const pids = stdout.split(/\r?\n/).map((p) => p.trim()).filter((p) => /^\d+$/.test(p) && p !== "0");
    pids.forEach((pid) => {
      try {
        execSync(`Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`, { shell: "powershell.exe" });
      } catch {}
    });
  } else {
    try {
      execSync("fuser -k 5000/tcp || lsof -ti:5000 | xargs kill -9", { stdio: "ignore" });
    } catch {}
  }
} catch {}

// Check if XAMPP MySQL is installed and start it if port 3306 is not active
try {
  if (process.platform === "win32") {
    const netStat = execSync("Get-NetTCPConnection -LocalPort 3306 -ErrorAction SilentlyContinue", { shell: "powershell.exe", encoding: "utf8" });
    if (!netStat || !netStat.trim()) {
      if (fs.existsSync("C:\\xampp\\mysql\\bin\\mysqld.exe")) {
        console.log("🐬 Starting local XAMPP MySQL server...");
        spawn("C:\\xampp\\mysql\\bin\\mysqld.exe", ["--defaults-file=C:\\xampp\\mysql\\bin\\my.ini", "--standalone"], { detached: true, stdio: "ignore" }).unref();
      }
    }
  }
} catch {}

// Start Express Backend
const backend = spawn("node", ["backend/server.js"], {
  stdio: "inherit",
  shell: false,
  cwd: __dirname,
});

backend.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`\n❌ Backend process exited with code ${code}.`);
  }
});

// Start Vite Frontend
const vitePath = path.join(__dirname, "node_modules", "vite", "bin", "vite.js");
const frontend = spawn("node", [vitePath], {
  stdio: "inherit",
  shell: false,
  cwd: __dirname,
});

frontend.on("exit", (code) => {
  if (code && code !== 0) {
    console.error(`\n❌ Frontend process exited with code ${code}.`);
  }
});

const cleanup = () => {
  try {
    if (backend && !backend.killed) backend.kill("SIGINT");
  } catch {}
  try {
    if (frontend && !frontend.killed) frontend.kill("SIGINT");
  } catch {}
};

process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
process.on("SIGHUP", () => { cleanup(); process.exit(0); });
process.on("exit", cleanup);
