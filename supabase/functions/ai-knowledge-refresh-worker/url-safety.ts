const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 15_000;

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\\[|\\]$/g, "");
  if (!h.includes(":")) return false;
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe8") || h.startsWith("fe9") || h.startsWith("fea") || h.startsWith("feb")) return true;
  const mapped = h.match(/::ffff:(\\d+(?:\\.\\d+){3})$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export function assertSafeUrl(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "https:") throw new Error("Only HTTPS URLs are allowed");
  if (u.username || u.password) throw new Error("Credential-bearing URLs are not allowed");
  if (u.port && u.port !== "443") throw new Error("Only HTTPS port 443 is allowed");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "0.0.0.0") {
    throw new Error("Local hostnames are not allowed");
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) throw new Error("Private or local IP addresses are not allowed");
  if (/^(?:0x[0-9a-f]+|[0-9]+)$/.test(host)) throw new Error("Numeric IP hostnames are not allowed");
  return u;
}

async function readBounded(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) throw new Error("Response body exceeds the knowledge-source limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) throw new Error("Response body exceeds the knowledge-source limit");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

export async function safeFetchText(raw: string): Promise<string> {
  let current = assertSafeUrl(raw);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { "user-agent": "BOOKORA-AI-KnowledgeRefresh/1.1" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect response has no Location header");
      current = assertSafeUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    return readBounded(response);
  }
  throw new Error("Too many redirects");
}
