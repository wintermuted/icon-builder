import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { createPreviewBackend } from "./vite-backend.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  root,
  base: "./",
  publicDir: false,
  plugins: [react(), createPreviewBackend(root)],
  build: {
    outDir: resolve(root, "dist/preview-app"),
    emptyOutDir: true,
    assetsDir: "preview/assets",
    rollupOptions: { input: resolve(root, "preview/index.html") },
  },
});
