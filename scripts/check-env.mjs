import fs from "node:fs";

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
const file = ".env";

if (!fs.existsSync(file)) {
  console.error("Missing .env. Copy .env.example to .env and configure the required values.");
  process.exit(1);
}

const text = fs.readFileSync(file, "utf8");
const values = new Map();
for (const line of text.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
  if (match) values.set(match[1], match[2]);
}

const missing = required.filter((key) => {
  const value = values.get(key);
  return !value || value.includes("your-project") || value.includes("your-publishable");
});

if (missing.length) {
  console.error(`Missing or placeholder environment values: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Required client environment values are configured.");
