// The public docs and marketing site. Static output, React islands only where a page needs interaction.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const project = JSON.parse(readFileSync(new URL("../../project.json", import.meta.url), "utf8"));

export default defineConfig({
  site: project.docsUrl,
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        // The detector's in-page checks are plain browser JavaScript; the AI-look score page loads them as text.
        "@antipatterns-lib": fileURLToPath(new URL("../../packages/antipatterns/lib", import.meta.url)),
      },
    },
  },
});
