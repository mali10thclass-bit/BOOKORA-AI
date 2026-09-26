import { join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/client/", import.meta.url));
const port = Number(process.env.BOOKORA_PORT ?? 4173);

function safePath(pathname: string): string | null {
  const decoded = decodeURIComponent(pathname);
  const clean = normalize(decoded).replace(/^([.][.][\\/])+/, "");
  const candidate = join(root, clean === "/" ? "index.html" : clean);
  const rel = relative(root, candidate);
  if (rel.startsWith("..") || rel.includes(".." + sep)) return null;
  return candidate;
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method Not Allowed", { status: 405 });
    const candidate = safePath(url.pathname);
    if (!candidate) return new Response("Not Found", { status: 404 });
    const direct = Bun.file(candidate);
    if (await direct.exists()) return new Response(request.method === "HEAD" ? null : direct);
    const index = Bun.file(join(root, "index.html"));
    if (await index.exists()) return new Response(request.method === "HEAD" ? null : index);
    return new Response("BOOKORA AI build is missing. Run the installer/build first.", { status: 500 });
  },
});

console.log(`BOOKORA AI is running at http://localhost:${server.port}`);