import { existsSync } from "node:fs";
const required = ["dist/windows/BOOKORA-AI.exe", "dist/windows/client/index.html"];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) { console.error(`Windows executable package is incomplete: ${missing.join(", ")}`); process.exit(1); }
console.log("Windows executable package layout is valid.");