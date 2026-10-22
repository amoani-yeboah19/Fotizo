import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "artifacts/fotizo/src") },
    dedupe: ["react", "react-dom"],
  },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["artifacts/**/*.test.{ts,tsx}"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      JWT_SECRET: "test-only-secret-with-at-least-thirty-two-bytes",
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      PAYAZA_PUBLIC_KEY: "test-public",
      PAYAZA_SECRET_KEY: "test-secret",
      PAYAZA_MODE: "Test",
      CURRENCY_RATES_URL: 'data:application/json,{"rates":{"USD":1.3,"GHS":15}}',
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
