/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's Vite config lets Vitest import .astro files; tests render them with the
// experimental Astro container API (test/components.test.ts).
export default getViteConfig(
  {
    test: {
      include: ["test/**/*.test.ts"],
      environment: "node",
    },
  },
  { logLevel: "error" },
);
