#!/usr/bin/env node
// Generates a client brand for @brandcloud/tokens and checks it against WCAG 2.2 AA.
//
//   node scripts/make-brand.mjs --name acme --accent "#0f766e" --ink "#111827" --paper "#fbfaf7" \
//     --font-body "Inter, system-ui, sans-serif" [--font-display "Fraunces, Georgia, serif"] \
//     [--label "Acme"] [--appearance depth|solid] [--out-dir brands] [--report report.json] [--force] [--dry-run]
//   node scripts/make-brand.mjs --input brief.json          (same keys as the brand file)
//
// Writes brands/<name>.json (the small input file the token build reads) and prints a contrast
// report for light and dark. Exits 1 without writing when any required text pair fails AA;
// --force writes anyway (for review), --dry-run never writes.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "../src/token-compiler.mjs";
import { BRAND_MODES, checkTokens, deriveBrandModes, normaliseBrandInput } from "../src/brand.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const usage = `Usage: node scripts/make-brand.mjs --name <slug> --accent <colour> --ink <colour> --paper <colour> --font-body <stack> [options]
       node scripts/make-brand.mjs --input <brief.json> [options]
Options: --label <text> --font-display <stack> --appearance depth|solid --out-dir <dir> --report <file.json>
         --css <file.css> (also write the standalone brand stylesheet, for projects outside this repository) --force --dry-run`;

export function parseArgs(argv) {
  const options = { input: {}, outDir: path.join(packageRoot, "brands"), force: false, dryRun: false };
  const take = (index) => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${argv[index]} needs a value.\n${usage}`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--name": options.input.name = take(index); index += 1; break;
      case "--label": options.input.label = take(index); index += 1; break;
      case "--accent": options.input.accent = take(index); index += 1; break;
      case "--ink": options.input.ink = take(index); index += 1; break;
      case "--paper": options.input.paper = take(index); index += 1; break;
      case "--font-body": options.input.fonts = { ...options.input.fonts, body: take(index) }; index += 1; break;
      case "--font-display": options.input.fonts = { ...options.input.fonts, display: take(index) }; index += 1; break;
      case "--appearance": options.input.appearance = take(index); index += 1; break;
      case "--input": options.inputFile = take(index); index += 1; break;
      case "--out-dir": options.outDir = path.resolve(take(index)); index += 1; break;
      case "--report": options.report = path.resolve(take(index)); index += 1; break;
      case "--css": options.css = path.resolve(take(index)); index += 1; break;
      case "--force": options.force = true; break;
      case "--dry-run": options.dryRun = true; break;
      case "--help": case "-h": options.help = true; break;
      default: throw new Error(`Unknown option ${arg}\n${usage}`);
    }
  }
  return options;
}

function formatReport(name, results) {
  const lines = [];
  for (const { mode, checks, errors, advisories } of results) {
    lines.push(`\n${name} ${mode}`);
    for (const check of checks.filter((entry) => entry.required)) {
      const mark = check.pass ? "pass" : "FAIL";
      lines.push(`  ${mark}  ${check.ratio.toFixed(2).padStart(5)} : 1  (needs ${check.need})  ${check.fg} on ${check.bg}`);
    }
    for (const error of errors.filter((entry) => !/contrast/.test(entry))) lines.push(`  FAIL  ${error}`);
    for (const note of advisories) lines.push(`  note  ${note}`);
  }
  return lines.join("\n");
}

/** Builds the brand and its report. Returns { brand, modes, results, failed }. */
export async function makeBrand(input, { tokensPath = path.join(packageRoot, "src", "tokens.json") } = {}) {
  const brandInput = normaliseBrandInput(input, "brand input");
  const { artifacts } = await compile(tokensPath, { brands: [] });
  const baseModes = { light: artifacts.json.themes.light, dark: artifacts.json.themes.dark };
  const { brand, modes } = deriveBrandModes(brandInput, baseModes);
  const results = BRAND_MODES.map((mode) => ({ mode, ...checkTokens(modes[mode], `Brand ${brand.name} ${mode}`) }));
  const failed = results.some((result) => result.errors.length > 0);
  return { brand, modes, results, failed };
}

/** The brand file keeps the inputs only; the token build derives the palette from them. */
export function brandFile(brand) {
  const file = {
    name: brand.name,
    label: brand.label,
    accent: brand.accent,
    ink: brand.ink,
    paper: brand.paper,
    fonts: brand.fonts,
    appearance: brand.appearance,
  };
  if (brand.overrides && Object.keys(brand.overrides).length) file.overrides = brand.overrides;
  return file;
}

export async function main(argv = process.argv.slice(2), log = console.log) {
  const options = parseArgs(argv);
  if (options.help) {
    log(usage);
    return 0;
  }
  let input = options.input;
  if (options.inputFile) {
    const fromFile = JSON.parse(await fs.readFile(path.resolve(options.inputFile), "utf8"));
    input = { ...fromFile, ...input, fonts: { ...fromFile.fonts, ...input.fonts } };
  }
  const { brand, results, failed } = await makeBrand(input);
  log(`Brand ${brand.name}: WCAG 2.2 AA contrast report`);
  log(formatReport(brand.name, results));

  if (options.report) {
    await fs.mkdir(path.dirname(options.report), { recursive: true });
    const report = results.map(({ mode, checks, errors, advisories }) => ({ brand: brand.name, mode, checks, errors, advisories }));
    await fs.writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`);
    log(`\nReport written to ${options.report}`);
  }

  const target = path.join(options.outDir, `${brand.name}.json`);
  if (failed) {
    const count = results.reduce((sum, result) => sum + result.errors.length, 0);
    log(`\n${count} required check(s) failed. Adjust accent, ink or paper, or add overrides.`);
    if (options.force && !options.dryRun) {
      await fs.mkdir(options.outDir, { recursive: true });
      await fs.writeFile(target, `${JSON.stringify(brandFile(brand), null, 2)}\n`);
      log(`Written anyway (--force) to ${target}. The token build will refuse it until the failures are fixed.`);
    }
    return 1;
  }
  if (options.dryRun) {
    log("\nAll required checks pass (dry run, nothing written).");
    return 0;
  }
  await fs.mkdir(options.outDir, { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(brandFile(brand), null, 2)}\n`);
  log(`\nAll required checks pass. Written to ${target}. Rebuild @brandcloud/tokens to emit dist/brands/${brand.name}.css.`);
  if (options.css) {
    const { artifacts } = await compile(path.join(packageRoot, "src", "tokens.json"), { brands: [brandFile(brand)] });
    await fs.mkdir(path.dirname(options.css), { recursive: true });
    await fs.writeFile(options.css, artifacts.brandCss[brand.name]);
    log(`Stylesheet written to ${options.css}: import it after @brandcloud/tokens/css and set data-brand="${brand.name}" (or nothing: it also sets :root).`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }, (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  });
}
