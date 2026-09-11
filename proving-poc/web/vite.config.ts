import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: ROOT,
  publicDir: path.join(ROOT, "public"),
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  resolve: {
    alias: {
      "@poc": path.resolve(ROOT, "..", "src"),
    },
  },
  define: {
    global: "globalThis",
  },
});
