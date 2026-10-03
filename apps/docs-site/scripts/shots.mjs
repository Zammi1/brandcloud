// Screenshots of built pages at 390 and 1440 wide: first view and full page.
// Usage: SHOTS_DIR=<folder> node scripts/shots.mjs [paths...]   (default folder: ./shots, gitignored; default paths: the review set)
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const dist = fileURLToPath(new URL("../dist", import.meta.url));
const pathArgs = process.argv.slice(2);
const out = process.env.SHOTS_DIR ?? fileURLToPath(new URL("../shots", import.meta.url));
const pages = pathArgs.length ? pathArgs : ["/", "/brand-builder/", "/ai-look-score/", "/recipes/campaign/", "/pro/", "/developers/components/", "/developers/motion/"];
const name = (p) => (p === "/" ? "home" : p.replace(/^\/|\/$/g, "").replace(/\//g, "-"));
mkdirSync(out, { recursive: true });
const server = await serve(dist);
const browser = await chromium.launch();
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await context.newPage();
    for (const p of pages) {
      await page.goto(server.url + p, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // Scroll through once so lazy images load, then return to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${name(p)}-${width}-fold.png` });
      await page.screenshot({ path: `${out}/${name(p)}-${width}.png`, fullPage: true });
      console.log(`${name(p)} ${width}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}
