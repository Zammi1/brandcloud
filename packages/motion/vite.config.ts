import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: { index: "src/index.ts", dom: "src/dom.ts", react: "src/react.ts", native: "src/native.ts", svelte: "src/svelte.ts", character: "src/character.ts" },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["motion", "motion/react", "react", "react-dom", "react/jsx-runtime"],
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
