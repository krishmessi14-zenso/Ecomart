import fs from "fs";
import { execSync } from "child_process";

try {
  const out = execSync("npx eslint src/ --format json", { encoding: "utf8" });
  console.log("ESLint output clean!");
} catch (err) {
  const reports = JSON.parse(err.stdout || "[]");
  reports.forEach((report) => {
    const filePath = report.filePath;
    if (!filePath.endsWith(".jsx") && !filePath.endsWith(".js")) return;
    let content = fs.readFileSync(filePath, "utf8");

    const unusedVars = report.messages
      .filter((m) => m.ruleId === "no-unused-vars")
      .map((m) => {
        const match = m.message.match(/'([^']+)' is (defined|assigned)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (unusedVars.length > 0) {
      console.log(`Cleaning ${unusedVars.length} unused vars in: ${filePath}`);
      unusedVars.forEach((v) => {
        // Handle unused imports e.g. import { a, b } from "..."
        const importRegex = new RegExp(`\\b${v}\\b\\s*,?\\s*`, "g");
        content = content.replace(importRegex, (match, offset, fullStr) => {
          const lineStart = fullStr.lastIndexOf("\n", offset);
          const lineEnd = fullStr.indexOf("\n", offset);
          const line = fullStr.slice(lineStart === -1 ? 0 : lineStart, lineEnd === -1 ? fullStr.length : lineEnd);
          if (line.includes("import")) {
            return "";
          }
          return match;
        });
      });
      // Clean up empty imports like import { } from "..." or double commas
      content = content
        .replace(/import\s*{\s*,?\s*}\s*from\s*['"][^'"]+['"];?\n?/g, "")
        .replace(/{\s*,/g, "{")
        .replace(/,\s*}/g, "}")
        .replace(/,\s*,/g, ",");

      fs.writeFileSync(filePath, content, "utf8");
    }
  });
}
