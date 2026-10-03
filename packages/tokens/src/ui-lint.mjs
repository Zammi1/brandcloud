// BrandCloud lint: keeps colours and gradients in @brandcloud/tokens and keeps "AI" gradients out.
//
// Rules:
//   raw-colour     hex, rgb(), hsl(), oklch() literals, and white/black in colour properties. Use var(--brand-*).
//   inline-style   JSX/Astro `style={...}` props. Allowed only for computed geometry, with an allow comment.
//   long-line      lines longer than maxLineLength (default 300).
//   raw-gradient   a CSS gradient with hard-coded colours, or a Tailwind palette gradient (from-pink-500).
//                  Gradients come from tokens: var(--brand-action-depth-fill), bg-action-depth, bg-level-sky.
//   ai-gradient    a gradient whose stops span more than maxHueSpan degrees of hue (default 40): the
//                  violet-to-pink, rainbow, cyan-to-purple look. Tonal single-hue gradients pass.
//   gradient-text  background-clip: text, bg-clip-text, or WebkitBackgroundClip "text". Never gradient text.
//   (plus any rules a wrapper adds through `checks`, e.g. theme-drift in the BrandCloud repo)
//
// Existing violations are recorded per file and rule in a baseline JSON, so the lint only blocks
// regressions. A file may never exceed its baseline count; files not in the baseline must be clean.
// To exempt one documented case, put `ui-lint-allow <rule>: <reason>` on the same line or the line above.
//
// Config (ui-lint.config.json in the project root, or --config <file>):
//   {
//     "include": ["src"],                      folders to scan, relative to the root
//     "exclude": ["src/legacy"],               path prefixes to skip
//     "tokenFiles": ["src/styles/tokens.css"], files that define tokens: raw colours and gradients allowed there
//     "baseline": "ui-lint-baseline.json",
//     "rules": { "inline-style": false, "long-line": { "max": 200 }, "ai-gradient": { "maxHueSpan": 40 } },
//     "tokens": { "brand": "harbour", "mode": "light" }  resolve var(--brand-*) in gradients for the hue check
//   }
//
// CLI (from @brandcloud/tokens: `brand-ui-lint`):
//   brand-ui-lint                              check (exit 1 on regressions)
//   brand-ui-lint --update-baseline            record current counts; refuses to raise any count
//   brand-ui-lint --update-baseline --allow-increase   accept new violations (needs review)
//   options: --root <dir>  --config <file>  --baseline <file>  --json

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { colourLiterals, hueSpan, parseColour } from "./colour.mjs";

export const CORE_RULES = ["raw-colour", "inline-style", "long-line", "raw-gradient", "ai-gradient", "gradient-text"];
export const DEFAULT_MAX_LINE_LENGTH = 300;
export const DEFAULT_MAX_HUE_SPAN = 40;

export const DEFAULT_CONFIG = {
  include: ["src"],
  exclude: [],
  tokenFiles: [],
  baseline: "ui-lint-baseline.json",
  extensions: [".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".html", ".astro", ".vue", ".svelte"],
  rules: {},
};

const ignoredDirectories = new Set(["node_modules", "dist", "coverage", "build", ".astro", ".next", ".svelte-kit", ".git"]);
const colourLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(/g;
const cssKeywordColour = /(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-[a-z]+)?-color|border(?:-[a-z]+)?|outline(?:-color)?|fill|stroke|box-shadow)\s*:[^;{}]*\b(?:white|black)\b/gi;
const inlineStyle = /\bstyle\s*=\s*\{/g;
const gradientStart = /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/g;
const gradientText = /(?:-webkit-)?background-clip\s*:\s*text\b|\bbg-clip-text\b|\b(?:Webkit)?[Bb]ackgroundClip\s*:\s*["'`]text["'`]/g;
const tailwindGradientClass = /\bbg-(?:gradient-to-[a-z]+|linear-[a-z0-9-]+|radial(?:-[a-z0-9-]+)?|conic(?:-[a-z0-9-]+)?)\b/;
// Approximate hues of Tailwind's default palette, for from-/via-/to- gradient stops.
const tailwindHues = {
  red: 0, orange: 25, amber: 38, yellow: 50, lime: 85, green: 142, emerald: 160, teal: 173, cyan: 189,
  sky: 199, blue: 217, indigo: 239, violet: 258, purple: 271, fuchsia: 292, pink: 330, rose: 350,
  slate: null, gray: null, zinc: null, neutral: null, stone: null, white: null, black: null,
};
const tailwindStop = /\b(?:from|via|to)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|white|black)(?:-(\d{2,3}))?(?:\/\d+)?\b/g;

function ruleOptions(config, rule) {
  const value = config.rules?.[rule];
  if (value === false) return undefined;
  return value && typeof value === "object" ? value : {};
}

export function resolveConfig(input = {}) {
  const config = { ...DEFAULT_CONFIG, ...input, rules: { ...DEFAULT_CONFIG.rules, ...(input.rules ?? {}) } };
  config.maxLineLength = ruleOptions(config, "long-line")?.max ?? input.maxLineLength ?? DEFAULT_MAX_LINE_LENGTH;
  config.maxHueSpan = ruleOptions(config, "ai-gradient")?.maxHueSpan ?? input.maxHueSpan ?? DEFAULT_MAX_HUE_SPAN;
  return config;
}

function allowed(lines, index, rule) {
  const marker = new RegExp(`ui-lint-allow\\s+${rule}\\b`);
  return marker.test(lines[index]) || (index > 0 && marker.test(lines[index - 1]));
}

function stripComments(line, isCss) {
  // Comments may mention colours ("#fff") without using them.
  const withoutBlock = line.replace(/\/\*.*?\*\//g, "");
  return isCss ? withoutBlock : withoutBlock.replace(/(^|[^:])\/\/.*$/, "$1");
}

/** Text of a balanced (...) group starting at `open` (the index of "("), possibly across lines. */
function balanced(text, open) {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "(") depth += 1;
    else if (text[index] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  return text.slice(open + 1);
}

function lineOf(text, index) {
  let line = 0;
  for (let position = text.indexOf("\n"); position !== -1 && position < index; position = text.indexOf("\n", position + 1)) line += 1;
  return line;
}

/** Replaces var(--name) with known token values (one level of fallbacks), so token gradients are checked too. */
export function resolveVars(body, vars) {
  if (!vars) return body;
  let current = body;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = current.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (whole, name, fallback) => vars[name] ?? fallback ?? whole);
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Token values for var() resolution: every --brand-ref-* reference plus the --brand-* roles of one
 * brand and mode from a compiled @brandcloud/tokens manifest ({ reference, themes, brands }).
 */
export function tokenVars(manifest, { brand, mode = "light" } = {}) {
  const vars = {};
  const flatten = (node, prefix) => {
    for (const [key, value] of Object.entries(node ?? {})) {
      const name = prefix ? `${prefix}-${key}` : key;
      if (value && typeof value === "object") flatten(value, name);
      else vars[`--brand-ref-${name}`] = String(value);
    }
  };
  flatten(manifest.reference, "");
  const roles = brand && manifest.brands?.[brand] ? manifest.brands[brand][mode] : manifest.themes?.[mode];
  for (const [name, value] of Object.entries(roles ?? {})) vars[`--brand-${name}`] = String(value);
  return vars;
}

/** Hue span in degrees of a CSS gradient's literal colour stops. */
export function gradientHueSpan(body) {
  return hueSpan(colourLiterals(body).filter((literal) => parseColour(literal)?.alpha !== 0));
}

function tailwindStopsSpan(line) {
  const hues = [];
  let palette = 0;
  for (const match of line.matchAll(tailwindStop)) {
    palette += 1;
    const hue = tailwindHues[match[1]];
    if (hue !== null && hue !== undefined) hues.push(hue);
  }
  if (hues.length < 2) return { palette, span: 0 };
  // Same smallest-arc logic as hueSpan, on fixed hues.
  hues.sort((first, second) => first - second);
  let largestGap = 360 - hues[hues.length - 1] + hues[0];
  for (let index = 1; index < hues.length; index += 1) largestGap = Math.max(largestGap, hues[index] - hues[index - 1]);
  return { palette, span: 360 - largestGap };
}

/**
 * Returns violations for one file's text: [{ rule, line, excerpt }].
 * `options`: { maxLineLength, maxHueSpan, tokenFile, rules } (rules as in the config; false disables).
 */
export function lintText(text, relativePath, options = {}) {
  const config = resolveConfig(options);
  const enabled = (rule) => ruleOptions(config, rule) !== undefined;
  const isCss = /\.s?css$/.test(relativePath);
  const isJsx = /\.(?:[jt]sx|astro)$/.test(relativePath);
  const tokenFile = Boolean(options.tokenFile);
  const lines = text.split("\n");
  const violations = [];
  const push = (rule, index, excerpt) => {
    if (!enabled(rule)) return;
    if (!allowed(lines, index, rule)) violations.push({ rule, line: index + 1, excerpt: excerpt.trim().slice(0, 120) });
  };
  let inBlockComment = false;
  const codeLines = [];
  lines.forEach((line, index) => {
    if (line.length > config.maxLineLength) push("long-line", index, `${line.length} characters`);
    let code = line;
    if (inBlockComment) {
      const end = code.indexOf("*/");
      if (end < 0) {
        codeLines.push("");
        return;
      }
      code = code.slice(end + 2);
      inBlockComment = false;
    }
    const open = code.lastIndexOf("/*");
    if (open >= 0 && code.indexOf("*/", open) < 0) {
      inBlockComment = true;
      code = code.slice(0, open);
    }
    code = stripComments(code, isCss);
    codeLines.push(code);
    if (!tokenFile) {
      for (const match of code.matchAll(colourLiteral)) push("raw-colour", index, code.slice(Math.max(0, match.index - 30), match.index + 30));
      if (isCss) for (const match of code.matchAll(cssKeywordColour)) push("raw-colour", index, match[0]);
    }
    if (isJsx) for (const match of code.matchAll(inlineStyle)) push("inline-style", index, code.slice(match.index, match.index + 80));
    for (const match of code.matchAll(gradientText)) push("gradient-text", index, code.slice(Math.max(0, match.index - 20), match.index + 60));
    if (tailwindGradientClass.test(code)) {
      const { palette, span } = tailwindStopsSpan(code);
      if (span > config.maxHueSpan) push("ai-gradient", index, `Tailwind gradient spans ${span} degrees of hue: ${code.trim()}`);
      if (palette > 0 && !tokenFile) push("raw-gradient", index, `Tailwind palette gradient: ${code.trim()}`);
    }
  });

  // CSS gradients can span several lines, so scan the comment-free text as a whole.
  const code = codeLines.join("\n");
  for (const match of code.matchAll(gradientStart)) {
    const body = balanced(code, match.index + match[0].length - 1);
    const index = lineOf(code, match.index);
    const excerpt = `${match[0]}${body.replace(/\s+/g, " ")})`;
    const literals = colourLiterals(body).filter((literal) => !/^transparent$/i.test(literal));
    if (literals.length > 0 && !tokenFile) push("raw-gradient", index, excerpt);
    const span = gradientHueSpan(resolveVars(body, options.vars));
    if (span > config.maxHueSpan) push("ai-gradient", index, `spans ${Math.round(span)} degrees of hue: ${excerpt}`);
  }
  return violations;
}

/** Loads the packaged manifest next to this file (dist/index.js) for config.tokens = { brand, mode }. */
async function loadTokenVars(selection) {
  try {
    const manifest = await import(new URL("./index.js", import.meta.url).href);
    return tokenVars(manifest.default ?? manifest, selection === true ? {} : selection);
  } catch {
    return undefined;
  }
}

function matchesPrefix(relativePath, prefixes) {
  return prefixes.some((prefix) => relativePath === prefix || relativePath.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
}

function listFiles(directory, extensions) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...listFiles(path.join(directory, entry.name), extensions));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files.sort();
}

/**
 * Lints every included file. `checks` are extra async functions (root, config) => { [file]: violations[] }.
 */
export async function collect(root, configInput = {}, checks = []) {
  const config = resolveConfig(configInput);
  const extensions = new Set(config.extensions);
  const vars = config.vars ?? (config.tokens ? await loadTokenVars(config.tokens) : undefined);
  const results = {};
  for (const include of config.include) {
    for (const file of listFiles(path.resolve(root, include), extensions)) {
      const relativePath = path.relative(root, file).split(path.sep).join("/");
      if (matchesPrefix(relativePath, config.exclude)) continue;
      if (results[relativePath]) continue;
      const tokenFile = matchesPrefix(relativePath, config.tokenFiles);
      const violations = lintText(readFileSync(file, "utf8"), relativePath, { ...config, tokenFile, vars });
      if (violations.length) results[relativePath] = violations;
    }
  }
  for (const check of checks) {
    const extra = await check(root, config);
    for (const [file, violations] of Object.entries(extra ?? {})) {
      if (violations.length) results[file] = [...(results[file] ?? []), ...violations];
    }
  }
  return results;
}

export function countByRule(results) {
  const counts = {};
  for (const [file, violations] of Object.entries(results)) {
    counts[file] = {};
    for (const { rule } of violations) counts[file][rule] = (counts[file][rule] ?? 0) + 1;
  }
  return counts;
}

function rulesIn(counts, baselineFiles, rules) {
  const all = new Set(rules);
  for (const entry of [...Object.values(counts), ...Object.values(baselineFiles)]) for (const rule of Object.keys(entry)) all.add(rule);
  return [...all];
}

/** Regressions are files whose count for a rule is above the baseline. */
export function compareWithBaseline(counts, baselineFiles, rules = CORE_RULES) {
  const regressions = [];
  const improvements = [];
  const files = new Set([...Object.keys(counts), ...Object.keys(baselineFiles)]);
  const allRules = rulesIn(counts, baselineFiles, rules);
  for (const file of [...files].sort()) {
    for (const rule of allRules) {
      const now = counts[file]?.[rule] ?? 0;
      const allowedCount = baselineFiles[file]?.[rule] ?? 0;
      if (now > allowedCount) regressions.push({ file, rule, now, allowed: allowedCount });
      else if (now < allowedCount) improvements.push({ file, rule, now, allowed: allowedCount });
    }
  }
  return { regressions, improvements };
}

function readBaseline(file) {
  if (!existsSync(file)) return { files: {} };
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeBaseline(file, counts, rules, description, maxLineLength) {
  const files = {};
  for (const name of Object.keys(counts).sort()) {
    files[name] = {};
    for (const rule of rules) if (counts[name][rule]) files[name][rule] = counts[name][rule];
  }
  const totals = {};
  for (const rule of rules) totals[rule] = Object.values(files).reduce((sum, entry) => sum + (entry[rule] ?? 0), 0);
  const body = { description, maxLineLength, totals, files };
  writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`);
}

export function parseArgs(argv, cwd = process.cwd()) {
  const options = { root: cwd, config: undefined, baseline: undefined, update: false, allowIncrease: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") options.root = path.resolve(argv[++index]);
    else if (arg === "--config") options.config = path.resolve(argv[++index]);
    else if (arg === "--baseline") options.baseline = path.resolve(argv[++index]);
    else if (arg === "--update-baseline") options.update = true;
    else if (arg === "--allow-increase") options.allowIncrease = true;
    else if (arg === "--json") options.json = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}

/** Reads --config, else <root>/ui-lint.config.json, else the given defaults. */
export function loadConfig(root, configPath, defaults = {}) {
  const candidate = configPath ?? path.join(root, "ui-lint.config.json");
  if (existsSync(candidate)) {
    const fromFile = JSON.parse(readFileSync(candidate, "utf8"));
    return { ...defaults, ...fromFile, rules: { ...(defaults.rules ?? {}), ...(fromFile.rules ?? {}) } };
  }
  if (configPath) throw new Error(`Config file not found: ${configPath}`);
  return defaults;
}

/**
 * Runs the lint. `setup` lets a wrapper supply { defaults, checks, rules, description, cwd }.
 * Returns the exit code (0 clean, 1 regressions).
 */
export async function main(argv = process.argv.slice(2), log = console.log, setup = {}) {
  const options = parseArgs(argv, setup.cwd);
  const config = resolveConfig(loadConfig(options.root, options.config, setup.defaults ?? {}));
  const baselinePath = options.baseline ?? path.resolve(options.root, config.baseline);
  const rules = [...CORE_RULES, ...(setup.rules ?? [])];
  const results = await collect(options.root, config, setup.checks ?? []);
  const counts = countByRule(results);
  const baseline = readBaseline(baselinePath);
  const { regressions, improvements } = compareWithBaseline(counts, baseline.files ?? {}, rules);
  const scope = config.include.join(", ");

  if (options.update) {
    const firstBaseline = !existsSync(baselinePath);
    if (regressions.length && !options.allowIncrease && !firstBaseline) {
      log("ui-lint: refusing to raise the baseline. Fix these, or rerun with --allow-increase after review:");
      for (const r of regressions) log(`  ${r.file} ${r.rule}: ${r.allowed} -> ${r.now}`);
      return 1;
    }
    const description = setup.description
      ?? `Existing UI lint violations in ${scope}, per file and rule. Counts may only go down. Regenerate with: brand-ui-lint --update-baseline`;
    writeBaseline(baselinePath, counts, rules, description, config.maxLineLength);
    log(`ui-lint: baseline written to ${path.relative(options.root, baselinePath)}`);
    return 0;
  }

  if (options.json) {
    log(JSON.stringify({ regressions, improvements, results }, null, 2));
    return regressions.length ? 1 : 0;
  }

  if (regressions.length) {
    log(`ui-lint: ${regressions.length} regression(s) against the baseline.`);
    for (const r of regressions) {
      log(`\n${r.file}: ${r.rule} ${r.now} (baseline ${r.allowed})`);
      for (const v of results[r.file].filter((entry) => entry.rule === r.rule)) log(`  ${r.file}:${v.line}  ${v.excerpt}`);
    }
    log("\nUse a @brandcloud/tokens role (var(--brand-*)) or a token gradient (var(--brand-action-depth-fill), bg-level-sky),");
    log("a class instead of an inline style, or split the line. Never gradient text or multi-hue gradients.");
    log("A documented exception needs `ui-lint-allow <rule>: <reason>` on the line or the line above.");
    return 1;
  }

  const totals = {};
  for (const entry of Object.values(counts)) for (const [rule, n] of Object.entries(entry)) totals[rule] = (totals[rule] ?? 0) + n;
  const summary = rules.map((rule) => `${rule} ${totals[rule] ?? 0}`).join(", ");
  log(`ui-lint: no regressions (baselined: ${summary}).`);
  if (improvements.length) {
    log(`ui-lint: ${improvements.length} count(s) are below the baseline; run --update-baseline to lock in the improvement.`);
  }
  return 0;
}
