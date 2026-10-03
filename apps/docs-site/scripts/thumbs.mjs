// Regenerates the recipe thumbnails in public/recipes/thumbs from the built recipe pages (run after a build,
// then build again). The recipe bar on top is hidden so the thumbnail shows the fictional page itself.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const out = fileURLToPath(new URL("../public/recipes/thumbs", import.meta.url));
mkdirSync(out, { recursive: true });
const server = await serve(dist);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.5 });
  for (const slug of ["campaign", "offer", "event", "local-service"]) {
    await page.goto(`${server.url}/recipes/${slug}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: ".rb { display: none !important; }" });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${out}/${slug}.jpg`, type: "jpeg", quality: 82 });
    console.log(`thumb ${slug}`);
  }
} finally {
  await browser.close();
  await server.close();
}
