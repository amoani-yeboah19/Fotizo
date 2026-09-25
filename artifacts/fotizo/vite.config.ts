import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { assertSafeBuild } from "./build-policy";

// PORT / BASE_PATH were mandatory under the old Replit setup. They are now optional
// with sensible defaults so the build runs on any host (Vercel, CI, local) without
// extra env; override them when you need a specific dev port or a deploy sub-path.
const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

export default defineConfig(({ command, mode }) => {
  if (command === "build")
    assertSafeBuild(mode, loadEnv(mode, import.meta.dirname, "VITE_"));
  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      proxy: {
        "/api": {
          target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:5000",
          changeOrigin: true,
        },
      },
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
