// Detection engine: renders a page in headless Chromium (puppeteer-core) and runs rules.json.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..');
export const RULES = JSON.parse(readFileSync(resolve(ROOT, 'rules.json'), 'utf8'));
RULES.copyRules ??= [];

/**
 * Extension point: adds rule packs (for example a copy rules pack) that use the rules.json shape,
 * `{ rules?, copyRules?, categories? }`. Also loaded from the file named by AP_EXTRA_RULES.
 */
export function addRules(extra = {}) {
  const known = new Set(allRules().map((r) => r.id));
  for (const r of [...(extra.rules || []), ...(extra.copyRules || [])]) if (known.has(r.id)) throw new Error('Duplicate rule id ' + r.id);
  RULES.rules.push(...(extra.rules || []));
  RULES.copyRules.push(...(extra.copyRules || []));
  Object.assign(RULES.categories, extra.categories || {});
}
if (process.env.AP_EXTRA_RULES) addRules(JSON.parse(readFileSync(process.env.AP_EXTRA_RULES, 'utf8')));
const PAGE_SCRIPT = readFileSync(resolve(here, 'page-checks.js'), 'utf8');
const NODE_CHECKS = new Set(['cursorGlow', 'parallaxDecor']);

export function allRules() {
  return [...RULES.rules, ...RULES.copyRules];
}

export function findChrome() {
  const cands = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const pw = resolve(os.homedir(), '.cache/ms-playwright');
  if (existsSync(pw)) {
    try {
      const dirs = execFileSync('ls', ['-1', pw], { encoding: 'utf8' }).split('\n').filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
      for (const d of dirs) cands.push(resolve(pw, d, 'chrome-linux64/chrome'), resolve(pw, d, 'chrome-linux/chrome'));
    } catch { /* ignore */ }
  }
  cands.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const hit = cands.filter(Boolean).find((p) => existsSync(p));
  if (!hit) throw new Error('No Chrome/Chromium found. Set CHROME_PATH.');
  return hit;
}

export async function launch() {
  let puppeteer;
  try { puppeteer = (await import('puppeteer-core')).default; } catch {
    throw new Error('puppeteer-core is not installed. Run `npm install` in ' + ROOT);
  }
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
    protocolTimeout: 60000,
  });
}

export function toUrl(target) {
  if (/^(https?|file):\/\//i.test(target)) return target;
  const p = resolve(process.cwd(), target);
  if (!existsSync(p)) throw new Error('Not a URL and no such file: ' + target);
  return pathToFileURL(p).href;
}

// Background tabs do not run requestAnimationFrame, so settle with a short timer instead.
const raf = () => new Promise((r) => setTimeout(r, 60));

export function runCopyRules(text, rules = RULES.copyRules) {
  const out = {};
  for (const r of rules) {
    let hits = 0; const evidence = []; const distinct = new Set();
    for (const pat of r.detect.patterns) {
      const flags = pat.flags.includes('g') ? pat.flags : pat.flags + 'g';
      const re = new RegExp(pat.source, r.detect.scope === 'lines' && !flags.includes('m') ? flags + 'm' : flags);
      for (const m of text.matchAll(re)) {
        hits++; distinct.add(pat.source);
        if (evidence.length < 6) {
          const i = m.index; const s = text.slice(Math.max(0, i - 30), i + m[0].length + 30).replace(/\s+/g, ' ').trim();
          evidence.push(`"${m[0].trim()}" in "...${s}..."`);
        }
      }
    }
    const ok = hits >= (r.detect.minHits || 1) && distinct.size >= (r.detect.minDistinct || 1);
    out[r.id] = { hits: ok ? hits : 0, evidence: ok ? evidence : [] };
  }
  return out;
}

export function score(findings) {
  const w = RULES.scoring.weights;
  let s = 0;
  for (const r of allRules()) if (findings[r.id] && findings[r.id].hits > 0) s += w[r.severity] || 0;
  s = Math.min(RULES.scoring.cap, s);
  const band = RULES.scoring.bands.find((b) => s <= b.max) || RULES.scoring.bands.at(-1);
  return { score: s, band: band.label, meaning: band.meaning };
}

/**
 * Analyse one target (URL or html file path).
 * opts: { width, height, only: Set<ruleId>|null, timeoutMs }
 */
export async function analyse(browser, target, opts = {}) {
  const { width = 1440, height = 900, only = null, timeoutMs = 30000 } = opts;
  const url = toUrl(target);
  const page = await browser.newPage();
  const errors = [];
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setBypassCSP(true); // the checks are injected as a script; strict CSP sites would block it
    try {
      await page.goto(url, { waitUntil: url.startsWith('file:') ? 'load' : 'networkidle2', timeout: timeoutMs });
    } catch (e) {
      errors.push('navigation: ' + e.message);
    }
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, url.startsWith('file:') ? 250 : 600));
    await page.addScriptTag({ content: PAGE_SCRIPT });

    const domRules = RULES.rules.filter((r) => (!only || only.has(r.id)));
    const inPage = domRules.filter((r) => !NODE_CHECKS.has(r.detect.check)).map((r) => ({ id: r.id, check: r.detect.check, params: r.detect.params }));
    const findings = await page.evaluate((spec) => window.__AP.run(spec), inPage);

    // Cursor-following glow: move the pointer and look for styles that follow it.
    for (const r of domRules.filter((x) => x.detect.check === 'cursorGlow')) {
      // Three pointer positions: a hover state toggles between two values, a cursor-follower takes three.
      const snap = async (x, y) => { await page.mouse.move(x, y, { steps: 3 }); await raf(); await new Promise((res) => setTimeout(res, 100)); return page.evaluate(() => window.__AP.pointerSnapshot()); };
      const a = await snap(width * 0.22, height * 0.25);
      const b = await snap(width * 0.5, height * 0.55);
      const c = await snap(width * 0.78, height * 0.35);
      await page.mouse.move(1, 1);
      const changed = Object.keys(c).filter((k) => a[k] !== undefined && b[k] !== undefined && a[k] !== b[k] && b[k] !== c[k] && a[k] !== c[k]);
      findings[r.id] = { hits: changed.length, evidence: changed.slice(0, 6).map((k) => k.replace(/^\d+:/, '') + ' :: style follows the pointer') };
    }

    // Parallax decoration: scroll and look for decorative elements that move against the page.
    for (const r of domRules.filter((x) => x.detect.check === 'parallaxDecor')) {
      const p = r.detect.params;
      const a = await page.evaluate(() => window.__AP.scrollSnapshot());
      // Dispatch the scroll event explicitly: background tabs may not deliver it before the snapshot.
      await page.evaluate((y) => { window.scrollTo(0, y); window.dispatchEvent(new Event('scroll')); }, p.scrollPx);
      await raf(page);
      await new Promise((res) => setTimeout(res, 150));
      const b = await page.evaluate(() => window.__AP.scrollSnapshot());
      const scrolled = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => { window.scrollTo(0, 0); window.dispatchEvent(new Event('scroll')); });
      const hits = [];
      for (const [k, v] of Object.entries(b)) {
        if (/scroll\(|view\(|^--/.test(v.timeline)) { hits.push(k + ' :: scroll-driven animation-timeline'); continue; }
        const o = a[k];
        if (!o || scrolled < 50 || v.pos === 'fixed' || v.pos === 'sticky') continue;
        // Parallax = a scroll-driven transform change. Pure position changes are usually lazy-loaded layout shifts.
        if (o.transform !== v.transform && Math.abs(v.y - o.y) >= p.minShiftPx) hits.push(k + ` :: moved ${Math.round(v.y - o.y)}px while page scrolled ${scrolled}px`);
      }
      findings[r.id] = { hits: hits.length, evidence: hits.slice(0, 6).map((h) => h.replace(/^\d+:/, '')) };
    }

    const { text, title } = await page.evaluate(() => window.__AP.extractText());
    const copyRules = RULES.copyRules.filter((r) => !only || only.has(r.id));
    Object.assign(findings, runCopyRules(text, copyRules));

    for (const [id, f] of Object.entries(findings)) if (f.error) errors.push(`${id}: ${f.error}`);
    return { target, url, title, viewport: { width, height }, findings, ...score(findings), errors };
  } finally {
    await page.close();
  }
}

export function fired(result) {
  return allRules().filter((r) => result.findings[r.id] && result.findings[r.id].hits > 0);
}

export function formatReport(result) {
  const lines = [];
  const f = fired(result);
  lines.push(`${result.target}  (${result.viewport.width}x${result.viewport.height})`);
  lines.push(`AI-feel score: ${result.score}/100  [${result.band}]  ${result.meaning}`);
  if (!f.length) lines.push('No rules fired.');
  for (const r of f) {
    const x = result.findings[r.id];
    lines.push(`  [${r.severity.padEnd(6)}] ${r.id}  ${r.title}  (x${x.hits})`);
    for (const e of x.evidence.slice(0, 3)) lines.push(`             - ${e}`);
    lines.push(`             fix: ${r.fix}`);
  }
  for (const e of result.errors) lines.push(`  ! ${e}`);
  return lines.join('\n');
}
