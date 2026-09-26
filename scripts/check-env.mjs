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

const placeholder = (value) =>
  !value ||
  /your-project|your-publishable|your-service-role|your-long-random-secret/i.test(value);

const missing = required.filter((key) => placeholder(values.get(key)));
if (missing.length) {
  console.error(`Missing or placeholder environment values: ${missing.join(", ")}`);
  process.exit(1);
}

const mode = values.get("AI_RUNTIME_MODE") || "cloud";
if (!["cloud", "local"].includes(mode)) {
  console.error("AI_RUNTIME_MODE must be either cloud or local.");
  process.exit(1);
}

// Preferred provider selection (mirrors src/lib/ai-runtime-config.ts).
const provider = (values.get("AI_PROVIDER") || (mode === "local" ? "ollama" : "lovable")).toLowerCase();
if (!["lovable", "ollama", "openai-compatible"].includes(provider)) {
  console.error('AI_PROVIDER must be one of "lovable", "ollama", "openai-compatible".');
  process.exit(1);
}

if (provider === "lovable" && placeholder(values.get("LOVABLE_API_KEY"))) {
  console.error("The cloud AI provider requires LOVABLE_API_KEY.");
  process.exit(1);
}

if (provider === "openai-compatible") {
  const baseUrl = values.get("AI_BASE_URL") || "";
  if (!/^https?:\/\//i.test(baseUrl)) {
    console.error("AI_PROVIDER=openai-compatible requires AI_BASE_URL (http/https).");
    process.exit(1);
  }
  if (placeholder(values.get("AI_API_KEY"))) {
    console.error("AI_PROVIDER=openai-compatible requires AI_API_KEY.");
    process.exit(1);
  }
}

if (provider === "ollama") {
  const baseUrl =
    values.get("LOCAL_AI_BASE_URL") || values.get("AI_LOCAL_BASE_URL") || "http://127.0.0.1:11434/v1";
  if (!/^https?:\/\//i.test(baseUrl)) {
    console.error("LOCAL_AI_BASE_URL must be an http(s) URL.");
    process.exit(1);
  }
  console.log(`Local CPU-first AI runtime selected: ${baseUrl}`);
}

for (const key of ["AI_TIMEOUT_MS", "AI_MAX_RETRIES"]) {
  const raw = values.get(key);
  if (raw !== undefined && raw !== "" && !/^\d+$/.test(raw)) {
    console.error(`${key} must be a positive integer.`);
    process.exit(1);
  }
}

console.log("Required client environment values and AI runtime configuration are valid.");
