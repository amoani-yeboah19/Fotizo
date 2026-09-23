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
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
