#!/usr/bin/env node
// Browser check that data-brand and data-theme combine correctly at any nesting level, and that the
// shadcn variables follow them. Needs a built dist and Playwright's Chromium (repo root devDependency).
//   pnpm --filter @brandcloud/tokens build && node packages/tokens/scripts/check-cascade.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const css = ["tokens.css", "themes.css", "shadcn.css"].map((file) => fs.readFileSync(path.join(dist, file), "utf8")).join("\n");
const html = `<!doctype html><html><head><style>${css}</style></head><body>
<div id="plain"></div>
<div data-theme="dark" id="dark-default"></div>
<div data-brand="harbour" id="brand"><div id="brand-child"></div><div data-theme="dark" id="brand-inner-dark"></div></div>
<div data-theme="dark"><div data-brand="harbour" id="dark-outer-brand"></div><div data-brand="harbour" data-theme="light" id="dark-outer-brand-light"></div></div>
<div data-brand="harbour" data-theme="dark" id="brand-dark-same"><div data-theme="light" id="brand-dark-inner-light"></div></div>
</body></html>`;

// Expected values come from the built token data, so the check follows the brand file.
const data = JSON.parse(fs.readFileSync(path.join(dist, "tokens.json"), "utf8"));
const light = data.brands.harbour.light.canvas, dark = data.brands.harbour.dark.canvas;
const expected = {
  plain: [data.themes.light.canvas, "solid"],
  "dark-default": [data.themes.dark.canvas, "solid"],
  brand: [light, "depth"],
  "brand-child": [light, "depth"],
  "brand-inner-dark": [dark, "depth"],
  "dark-outer-brand": [dark, "depth"],
  "dark-outer-brand-light": [light, "depth"],
  "brand-dark-same": [dark, "depth"],
  "brand-dark-inner-light": [light, "depth"],
};

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(html);
  const actual = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll("[id]")].map((element) => {
    const style = getComputedStyle(element);
    return [element.id, [style.getPropertyValue("--brand-canvas").trim(), style.getPropertyValue("--brand-action-appearance").trim(), style.getPropertyValue("--background").trim()]];
  })));
  for (const [id, [canvas, appearance]] of Object.entries(expected)) {
    assert.deepEqual(actual[id], [canvas, appearance, canvas], id);
    console.log(`ok  ${id.padEnd(22)} canvas ${canvas}  appearance ${appearance}  shadcn --background follows`);
  }
  console.log(`cascade: ${Object.keys(expected).length} of ${Object.keys(expected).length} nesting cases correct`);
} finally {
  await browser.close();
}
