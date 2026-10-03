// Render every patterns/<ID>/{bad,good}.html to PNG at 1440 and 390 widths.
// Usage: node scripts/render-pairs.mjs [ID ...]
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, ROOT } from '../lib/engine.mjs';

const only = process.argv.slice(2);
const dir = resolve(ROOT, 'patterns');
const ids = readdirSync(dir).filter((d) => /^AP-/.test(d) && (!only.length || only.includes(d))).sort();
const sizes = [{ w: 1440, h: 900 }, { w: 390, h: 844 }];
const MAX_H = { 1440: 1800, 390: 3200 };

const browser = await launch();
let n = 0;
try {
  for (const id of ids) {
    const out = resolve(dir, id, 'shots');
    mkdirSync(out, { recursive: true });
    for (const kind of ['bad', 'good']) {
      const file = resolve(dir, id, kind + '.html');
      if (!existsSync(file)) continue;
      for (const { w, h } of sizes) {
        const page = await browser.newPage();
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.fonts.ready);
        // Freeze motion at a representative frame so shots are stable.
        await new Promise((r) => setTimeout(r, 900));
        await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.pause(); } catch {} }));
        const full = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.screenshot({ path: resolve(out, `${kind}-${w}.png`), clip: { x: 0, y: 0, width: w, height: Math.min(full, MAX_H[w]) } });
        await page.close();
        n++;
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`rendered ${n} screenshots for ${ids.length} patterns`);
