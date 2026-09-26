import { assertEquals, assertRejects } from "jsr:@std/assert";
import { assertSafeUrl } from "./url-safety.ts";

Deno.test("allows ordinary HTTPS URLs", () => {
  assertEquals(assertSafeUrl("https://example.com/docs").protocol, "https:");
});

for (const value of [
  "http://example.com",
  "https://localhost/test",
  "https://127.0.0.1/test",
  "https://10.0.0.5/test",
  "https://192.168.1.5/test",
  "https://172.16.0.10/test",
  "https://[::1]/test",
  "https://user:pass@example.com/test",
  "https://example.com:8443/test",
]) {
  Deno.test(`rejects unsafe URL: ${value}`, async () => {
    await assertRejects(() => Promise.resolve(assertSafeUrl(value)));
  });
}
