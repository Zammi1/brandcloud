// The public docs and marketing site. Static output, React islands only where a page needs interaction.
import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const project = JSON.parse(readFileSync(new URL("../../project.json", import.meta.url), "utf8"));

export default defineConfig({
  site: project.docsUrl,
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [react()],
});
