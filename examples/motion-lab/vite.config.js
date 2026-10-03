import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  // The Three.js chunk is ~133 KB gzip and lazy-loaded; that is the 3D budget, not an accident.
  build: { target: "es2022", sourcemap: false, chunkSizeWarningLimit: 600 },
});
