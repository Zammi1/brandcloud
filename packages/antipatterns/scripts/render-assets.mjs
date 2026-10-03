// Renders the shared product screenshot used by some pairs (patterns/_shared/assets/jobsheet.png).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, ROOT } from '../lib/engine.mjs';
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(ROOT, 'patterns/_shared/assets/jobsheet.html')).href, { waitUntil: 'networkidle0' });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: resolve(ROOT, 'patterns/_shared/assets/jobsheet.png'), clip: { x: 0, y: 0, width: 390, height } });
  console.log('patterns/_shared/assets/jobsheet.png rendered');
} finally {
  await browser.close();
}
