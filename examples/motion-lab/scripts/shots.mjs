// Builds nothing: run `pnpm build` first. Serves dist/ on 127.0.0.1 for the length of the run only,
// captures screenshots, frame strips and a short video into shots/, and prints measured checks.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, existsSync, readdirSync, renameSync, rmSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const labRoot = join(here, "..");
const repoRoot = join(labRoot, "../..");
const require = createRequire(join(repoRoot, "package.json"));
const { chromium } = require("playwright");
const out = process.env.SHOTS_DIR ?? join(labRoot, "shots");
mkdirSync(out, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
const dist = join(labRoot, "dist");
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let file = join(dist, decodeURIComponent(url.pathname));
  if (url.pathname.endsWith("/")) file = join(file, "index.html");
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const results = {};
const errors = [];
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const shot = (page, name, opts = {}) => page.screenshot({ path: join(out, `${name}.png`), ...opts });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(viewport, query = "", extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, ...extra });
  const page = await context.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + query, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

try {
  // Desktop: full page after the cube and count-up have run.
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    await shot(page, "01-first-view");
    await page.locator("[data-cube]").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.__labCube, null, { timeout: 15000 });
    await sleep(1200);
    results.cubeIdleAfterSettle = await page.evaluate(() => !window.__labCube.isAnimating());
    results.cubePoseAfterSettle = await page.evaluate(() => window.__labCube.pose());
    await page.locator("[data-cube]").screenshot({ path: join(out, "07-cube-settled.png") });
    // Drag to turn, then let go and watch it spring back to a logo pose.
    const box = await page.locator("[data-cube] canvas").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2, { steps: 6 });
    await page.locator("[data-cube]").screenshot({ path: join(out, "07b-cube-dragged.png") });
    await page.mouse.up();
    await sleep(900);
    results.cubeAfterDrag = await page.evaluate(() => ({ ...window.__labCube.pose(), animating: window.__labCube.isAnimating() }));
    // Keyboard alternative: the Turn it button does one whole turn and lands on the mark.
    await page.getByRole("button", { name: "Turn it" }).focus();
    await page.keyboard.press("Enter");
    await sleep(1200);
    results.cubeAfterTurnButton = await page.evaluate(() => ({ ...window.__labCube.pose(), animating: window.__labCube.isAnimating() }));
    // Off screen: no frames requested.
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    results.cubeAnimatingOffscreen = await page.evaluate(() => window.__labCube.isAnimating());
    await shot(page, "00-desktop-full", { fullPage: true });
    await page.locator("[data-springs]").screenshot({ path: join(out, "08-springs.png") });
    results.countUpFinal = await page.locator("[data-count-to]").textContent();
    await context.close();
  }

  // Buttons: rest, hover, pressed, loading, focus. Measured transforms prove the presets run.
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    const specimen = page.locator("section[aria-labelledby=buttons-h] .specimen");
    await specimen.scrollIntoViewIfNeeded();
    await specimen.screenshot({ path: join(out, "02a-buttons-rest.png") });
    const primary = page.getByRole("button", { name: "Get my plan" });
    await primary.hover();
    await sleep(400);
    results.hoverTransform = await primary.evaluate((el) => getComputedStyle(el).transform);
    await specimen.screenshot({ path: join(out, "02b-buttons-hover.png") });
    await page.mouse.down();
    await sleep(160);
    results.pressedTransform = await primary.evaluate((el) => getComputedStyle(el).transform);
    await specimen.screenshot({ path: join(out, "02c-buttons-pressed.png") });
    await page.mouse.up();
    await page.getByRole("button", { name: "Send request" }).click();
    await sleep(200);
    await specimen.screenshot({ path: join(out, "02d-buttons-loading.png") });
    await page.mouse.move(0, 0);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await sleep(300);
    await page.locator("header").screenshot({ path: join(out, "02e-focus-switch.png") });
    // Tiles
    const tiles = page.locator(".tiles");
    await tiles.scrollIntoViewIfNeeded();
    await page.locator(".tile-blue").hover();
    await sleep(500);
    results.tileHoverTransform = await page.locator(".tile-blue").evaluate((el) => getComputedStyle(el).transform);
    await tiles.screenshot({ path: join(out, "03-tiles-hover.png"), animations: "allow" });
    await context.close();
  }

  // Dialog: frame strip of the enter, then the success tick. Drawer open.
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Open the dialog" }).scrollIntoViewIfNeeded();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Animation.enable");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
    await page.getByRole("button", { name: "Open the dialog" }).click();
    for (const ms of [40, 700, 1600, 4000]) {
      await sleep(ms === 40 ? 40 : ms - (ms === 700 ? 40 : ms === 1600 ? 700 : 1600));
      await page.locator("#request-dialog").screenshot({ path: join(out, `04-dialog-enter-${String(ms).padStart(4, "0")}.png`) });
    }
    results.dialogEnterMid = await page.locator("#request-dialog").evaluate((el) => getComputedStyle(el).opacity);
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await sleep(600);
    await shot(page, "04a-dialog-open");
    await page.getByLabel("Your answer").fill("Bring in more bookings from local searches");
    await page.getByRole("button", { name: "Send request" }).last().click();
    await sleep(700);
    results.requestStatusText = await page.locator("[data-request-status]").textContent();
    await page.locator("#request-dialog").screenshot({ path: join(out, "04b-dialog-success.png") });
    await sleep(1500);
    // Submit, close straight away, reopen: the old auto-close timer must not close the reopened dialog.
    await page.getByRole("button", { name: "Open the dialog" }).click();
    await page.getByRole("button", { name: "Send request" }).last().click();
    await page.keyboard.press("Escape");
    await sleep(100);
    await page.getByRole("button", { name: "Open the dialog" }).click();
    await sleep(2000);
    results.dialogStillOpenAfterReopen = await page.locator("#request-dialog").evaluate((d) => d.open);
    await page.keyboard.press("Escape");
    await sleep(500);
    await page.getByRole("button", { name: "Open the drawer" }).click();
    await sleep(700);
    await shot(page, "05-drawer-open");
    await page.keyboard.press("Escape");
    await sleep(500);
    // View transition at 1/10 speed so the morph can be seen mid-flight.
    await page.locator("[data-vt-root]").scrollIntoViewIfNeeded();
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 });
    await page.getByRole("button", { name: /Example case study/ }).click();
    await sleep(1800);
    await shot(page, "06a-view-transition-mid");
    await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
    await sleep(1500);
    await page.locator("section[aria-labelledby=vt-h]").screenshot({ path: join(out, "06b-view-transition-detail.png") });
    results.viewTransitionSupported = await page.evaluate(() => typeof document.startViewTransition === "function");
    // Checklist after a user action
    await page.getByRole("button", { name: "Show the checklist" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Show the checklist" }).click();
    await sleep(700);
    await page.locator("section[aria-labelledby=list-h] .specimen").screenshot({ path: join(out, "06c-checklist.png") });
    await context.close();
  }

  // Reduced motion (OS setting): no scale on press, no 3D until asked, figure final at once.
  {
    const { context, page } = await open({ width: 1440, height: 900 }, "", { reducedMotion: "reduce" });
    const primary = page.getByRole("button", { name: "Get my plan" });
    await primary.scrollIntoViewIfNeeded();
    await primary.hover();
    await page.mouse.down();
    await sleep(160);
    results.reducedPressedTransform = await primary.evaluate((el) => getComputedStyle(el).transform);
    await page.mouse.up();
    results.reducedRevealHidden = await page.evaluate(() => document.querySelectorAll("[data-reveal]:not([data-revealed])").length);
    results.reducedMjs = await page.evaluate(() => document.documentElement.classList.contains("m-js"));
    await page.locator("[data-cube]").scrollIntoViewIfNeeded();
    await sleep(800);
    results.reducedCubeLoaded = await page.evaluate(() => Boolean(window.__labCube));
    results.reducedCountUp = await page.locator("[data-count-to]").textContent();
    await page.locator("[data-cube]").screenshot({ path: join(out, "09a-reduced-cube-poster.png") });
    await page.getByRole("button", { name: "View in 3D" }).click();
    await page.waitForFunction(() => window.__labCube, null, { timeout: 15000 });
    await sleep(400);
    results.reducedCubePose = await page.evaluate(() => window.__labCube.pose());
    await page.locator("[data-cube]").screenshot({ path: join(out, "09b-reduced-cube-on-request.png") });
    await shot(page, "09-reduced-full", { fullPage: true });
    // View transition under reduced motion: the group snaps, the snapshots still cross-fade.
    await page.locator("[data-vt-root]").scrollIntoViewIfNeeded();
    results.reducedViewTransition = await page.evaluate(async () => {
      document.querySelector('[data-case="open"]').click();
      for (let i = 0; i < 60; i += 1) {
        await new Promise((r) => requestAnimationFrame(r));
        const list = document.getAnimations().filter((a) => a.effect?.pseudoElement?.startsWith("::view-transition"));
        if (list.length) return list.map((a) => `${a.effect.pseudoElement} ${a.effect.getTiming().duration}ms`);
      }
      return ["no view-transition animations seen"];
    });
    await context.close();
  }

  // Toggling the lab's reduce switch before the cube loads stops the auto-load watcher.
  {
    const { context, page } = await open({ width: 1440, height: 900 });
    results.watchingBeforeToggle = await page.evaluate(() => window.__labCubeWatching());
    await page.getByRole("button", { name: "Reduce motion" }).click();
    results.watchingAfterToggle = await page.evaluate(() => window.__labCubeWatching());
    await page.locator("[data-cube]").scrollIntoViewIfNeeded();
    await sleep(800);
    results.cubeLoadedAfterToggle = await page.evaluate(() => Boolean(window.__labCube));
    await context.close();
  }

  // Mobile, plus a short video of the interactions.
  {
    const { context, page } = await open({ width: 390, height: 844 }, "", { hasTouch: true, isMobile: true });
    await shot(page, "10-mobile-first-view");
    // Viewport-by-viewport (full-page capture on mobile emulation stitches badly with a sticky header).
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, i = 1; y < height; y += 844, i += 1) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await sleep(900);
      await shot(page, `10-mobile-${String(i).padStart(2, "0")}`);
    }
    await context.close();
  }
  {
    const videoDir = join(out, ".video");
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } } });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await sleep(600);
    const primary = page.getByRole("button", { name: "Get my plan" });
    await primary.scrollIntoViewIfNeeded();
    await primary.hover();
    await sleep(500);
    await page.mouse.down();
    await sleep(250);
    await page.mouse.up();
    await sleep(500);
    await page.locator(".tile-navy").hover();
    await sleep(700);
    await page.getByRole("button", { name: "Open the dialog" }).click();
    await sleep(900);
    await page.keyboard.press("Escape");
    await sleep(500);
    await page.getByRole("button", { name: /Example case study/ }).click();
    await sleep(1000);
    await page.getByRole("button", { name: "Back to the list" }).click();
    await sleep(900);
    await page.locator("[data-cube]").scrollIntoViewIfNeeded();
    await sleep(1800);
    await context.close();
    const [video] = readdirSync(videoDir);
    if (video) renameSync(join(videoDir, video), join(out, "11-interactions.webm"));
    rmSync(videoDir, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  server.close();
}

results.consoleErrors = errors;
console.log(JSON.stringify(results, null, 2));
