import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkTokens, depthLabelContrast, deriveBrandModes, LEVELS } from "./brand.mjs";
import { contrastRatio, hueSpan } from "./colour.mjs";
import { compile } from "./token-compiler.mjs";

const packagedSource = new URL("./tokens.json", import.meta.url).pathname;
const { artifacts } = await compile(packagedSource);
const brandNames = Object.keys(artifacts.json.brands).sort();
const harbour = artifacts.json.brands.harbour;

// Every semantic name the components rely on.
const contractTokens = [
  "action-depth-from", "action-depth-to", "action-depth-sheen", "action-depth-glow", "action-depth-text",
  "shadow-action-depth", "shadow-action-depth-hover",
  "accent", "accent-hover", "action-ink", "action-ink-hover", "action-ink-text",
  "whatsapp", "whatsapp-hover", "whatsapp-text", "status-warning-text", "action-height-md",
  ...LEVELS.flatMap((level) => ["highlight", "base", "deep", "halo", "text"].map((part) => `level-${level}-${part}`)),
  "font-display", "font-body", "font-size-display", "font-size-h1", "font-size-h2", "font-size-h3", "font-size-lead",
  "section-space-y", "content-max", "content-narrow",
];

test("every contract token exists in every brand and mode", () => {
  const sets = {
    ...Object.fromEntries(Object.entries(artifacts.json.themes).map(([mode, tokens]) => [`brandui ${mode}`, tokens])),
    ...Object.fromEntries(brandNames.flatMap((brand) => Object.entries(artifacts.json.brands[brand]).map(([mode, tokens]) => [`${brand} ${mode}`, tokens]))),
  };
  assert.deepEqual(Object.keys(sets).sort(), ["brandui dark", "brandui light", "brandui operator", ...brandNames.flatMap((b) => [`${b} dark`, `${b} light`])].sort());
  for (const [label, tokens] of Object.entries(sets)) {
    for (const name of contractTokens) assert.ok(tokens[name], `${label} is missing ${name}`);
  }
});

test("the default brand keeps the neutral BrandCloud palette and solid buttons", () => {
  const light = artifacts.json.themes.light;
  assert.equal(light.accent, "#4f46e5");
  assert.equal(light.canvas, "#ffffff");
  assert.equal(light["action-appearance"], "solid");
  assert.equal(artifacts.json.themes.operator.accent, "#111111");
  assert.equal(artifacts.json.metadata.defaultBrand, "brandui");
  // Every brands/*.json is compiled and exported; adding a brand needs no edit here.
  const brandFiles = readdirSync(new URL("../brands/", import.meta.url)).filter((file) => file.endsWith(".json")).map((file) => file.slice(0, -5)).sort();
  const names = artifacts.json.metadata.brands.map((brand) => brand.name);
  assert.equal(names[0], "brandui");
  assert.deepEqual(names.slice(1).sort(), brandFiles);
  assert.equal(artifacts.json.metadata.brands.find((brand) => brand.name === "harbour").appearance, "depth");
  const exportsMap = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).exports;
  for (const name of brandFiles) assert.ok(exportsMap[`./brands/${name}.css`], `package.json exports ./brands/${name}.css`);
});

test("example brands are generated from four inputs: accent, ink, paper and fonts", () => {
  assert.equal(harbour.light.accent, "#0b5a87");
  assert.equal(harbour.light.canvas, "#f2f5f7");
  assert.equal(harbour.dark["action-depth-text"], harbour.light["action-depth-text"]);
  assert.match(harbour.light["font-body"], /Schibsted Grotesk/);
});

test("the depth button label passes AA at its worst pixel at every height, in every depth brand", () => {
  for (const brand of brandNames) {
    for (const mode of ["light", "dark"]) {
      const tokens = artifacts.json.brands[brand][mode];
      for (const size of [{ height: 44, fontSize: 15 }, { height: 48, fontSize: 16 }, { height: 56, fontSize: 17 }]) {
        const worst = depthLabelContrast(tokens, size);
        assert.ok(worst.ratio >= 4.5, `${brand} ${mode} ${size.height}px: ${worst.ratio.toFixed(2)}`);
      }
    }
  }
  // A glow that reaches too far up the button drops the label below AA: the reason for the 30% cap.
  const tooFar = depthLabelContrast({ ...harbour.light, "action-depth-glow": "rgb(125 211 252 / 0.95)", "action-depth-glow-reach": "90%" });
  assert.ok(tooFar.ratio < depthLabelContrast(harbour.light).ratio);
});

test("every required text pair passes AA in every brand and mode, and each mode checks at least 45 pairs", () => {
  for (const entry of artifacts.contrastReport) {
    const required = entry.checks.filter((check) => check.required);
    assert.ok(required.length >= 45, `${entry.brand} ${entry.mode} only checked ${required.length}`);
    const failures = required.filter((check) => !check.pass);
    assert.deepEqual(failures, [], `${entry.brand} ${entry.mode}`);
  }
});

test("ink, level and WhatsApp button labels pass AA on their fills in every brand", () => {
  for (const brand of brandNames) {
    const light = artifacts.json.brands[brand].light;
    assert.ok(contrastRatio(light["whatsapp-text"], light.whatsapp) >= 4.5, brand);
    assert.ok(contrastRatio(light["action-ink-text"], light["action-ink"]) >= 4.5, brand);
    assert.ok(contrastRatio(light["status-warning-text"], light["status-warning-subtle"]) >= 4.5, brand);
    for (const level of LEVELS) {
      assert.ok(contrastRatio(light[`level-${level}-text`], light[`level-${level}-base`]) >= 4.5, `${brand} ${level}`);
      assert.ok(contrastRatio(light[`level-${level}-text`], light[`level-${level}-highlight`]) >= 4.5, `${brand} ${level}`);
    }
  }
});

test("gradient tokens stay in one hue family", () => {
  const sets = [["brandui light", artifacts.json.themes.light], ...brandNames.map((b) => [`${b} light`, artifacts.json.brands[b].light])];
  for (const [label, tokens] of sets) {
    assert.ok(hueSpan([tokens["action-depth-from"], tokens["action-depth-to"], tokens["action-depth-glow"]]) <= 40, label);
    for (const level of LEVELS) {
      assert.ok(hueSpan([tokens[`level-${level}-highlight`], tokens[`level-${level}-base`], tokens[`level-${level}-deep`]]) <= 40, `${label} ${level}`);
    }
  }
});

test("an AI style violet to pink depth gradient is refused", () => {
  const tokens = { ...harbour.light, "action-depth-from": "#7c3aed", "action-depth-to": "#db2777", "action-depth-glow": "rgb(236 72 153 / 0.5)" };
  const { errors } = checkTokens(tokens, "test");
  assert.ok(errors.some((error) => /action-depth gradient spans \d+ degrees of hue/.test(error)), errors.join("\n"));
});

async function brandsDir(files) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "brand-brands-"));
  for (const [name, body] of Object.entries(files)) await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(body));
  return directory;
}

const client = { name: "acme", accent: "#0f766e", ink: "#111827", paper: "#fbfaf7", fonts: { body: "Inter, sans-serif" } };

test("a client brand file is compiled into themes.css and its own sheet", async () => {
  const { artifacts: built } = await compile(packagedSource, { brandsDir: await brandsDir({ acme: client }) });
  assert.match(built.themesCss, /\[data-brand="acme"\],\n {2}\[data-brand="acme"\]\[data-theme="light"\]/);
  assert.match(built.themesCss, /:where\(\[data-theme="dark"\]\) \[data-brand="acme"\]/);
  assert.match(built.brandCss.acme, /:root, \[data-theme="light"\], \[data-brand="acme"\] \{/);
  assert.equal(built.json.brands.acme.light.canvas, "#fbfaf7");
  assert.equal(built.json.brands.acme.light["font-body"], "Inter, sans-serif");
  // Brand blocks come after the mode blocks so they win at equal specificity.
  assert.ok(built.themesCss.indexOf('[data-brand="acme"]') > built.themesCss.indexOf('[data-theme="operator"]'));
});

test("a brand file whose override fails AA stops the build", async () => {
  const bad = { ...client, overrides: { light: { "text-muted": "#b0b0b0" } } };
  const directory = await brandsDir({ acme: bad });
  await assert.rejects(() => compile(packagedSource, { brandsDir: directory }), /Brand acme light: contrast text-muted\/canvas/);
});

test("brand files are validated: unknown override keys, bad colours, file name mismatch", async () => {
  const base = { light: artifacts.json.themes.light, dark: artifacts.json.themes.dark };
  assert.throws(() => deriveBrandModes({ ...client, overrides: { light: { "acent": "#000000" } } }, base), /overrides\.light\.acent is not a semantic token/);
  assert.throws(() => deriveBrandModes({ ...client, accent: "blue-ish" }, base), /accent must be an opaque CSS colour/);
  assert.throws(() => deriveBrandModes({ ...client, name: "brandui" }, base), /built-in default brand/);
  const mismatch = await brandsDir({ other: client });
  await assert.rejects(() => compile(packagedSource, { brandsDir: mismatch }), /must match the file name/);
});

test("every brand file has an explicit package export for its standalone sheet", async () => {
  const manifest = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  for (const brand of Object.keys(artifacts.json.brands)) {
    assert.deepEqual(manifest.exports[`./brands/${brand}.css`], { types: `./dist/brands/${brand}.css.d.ts`, default: `./dist/brands/${brand}.css` }, brand);
  }
});
