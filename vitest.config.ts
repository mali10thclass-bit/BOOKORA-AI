import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Deterministic unit tests only — no network, no database, no GPU.
  },
});
