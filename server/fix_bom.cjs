const fs = require("fs");
const file = "C:/Users/tyler/capsule-erp/server/src/controllers/bom.controller.ts";
let content = fs.readFileSync(file, "utf8");
// The problem: str.includes() with literal newline embedded in string
// Find the includes line and replace it entirely
const before = "            if (str.includes";
const after = ") {";
const startIdx = content.indexOf(before, content.indexOf("escapeCsvValue"));
if (startIdx < 0) { console.log("NOT FOUND"); process.exit(1); }
const endIdx = content.indexOf(after, startIdx) + after.length;
console.log("Replacing:", JSON.stringify(content.substring(startIdx, endIdx)));
const replacement = "            if (str.includes(',') || str.includes('"') || str.includes('
'))";
content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, content);
console.log("Done");