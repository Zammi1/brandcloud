import fs from "node:fs/promises";
import path from "node:path";

import { BRAND_MODES, DEFAULT_BRAND, checkTokens, deriveBrandModes, loadBrandFiles } from "./brand.mjs";

const aliasPattern = /^\{([^{}]+)\}$/;
function readJson(filePath) {
  return fs.readFile(filePath, "utf8").then((raw) => {
    try {
      return JSON.parse(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot parse ${filePath}: ${message}`);
    }
  });
}

function normalizeSegments(input) {
  const trimmed = String(input).trim().replace(/^\.+/g, "").replace(/\.{2,}/g, ".");
  if (!trimmed) return [];
  return trimmed.split(".");
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isTokenNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return false;
  }

  const valueKey = hasOwn(node, "$value") ? "$value" : hasOwn(node, "value") ? "value" : null;
  const typeKey = hasOwn(node, "$type") ? "$type" : hasOwn(node, "type") ? "type" : null;
  return Boolean(valueKey && typeKey);
}

function tokenValue(node) {
  return hasOwn(node, "$value") ? node.$value : node.value;
}

function flattenTokens(node, prefix = [], out = new Map()) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error("Token sections must be object trees.");
  }

  const entries = Object.entries(node).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    const next = [...prefix, key];
    if (isTokenNode(value)) {
      out.set(next.join("."), value);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenTokens(value, next, out);
      continue;
    }
    throw new Error(`Invalid token node at ${next.join(".")}; expected nested object or token leaf.`);
  }

  return out;
}

function getByPath(map, pathSegments) {
  return map.get(pathSegments.join("."));
}

function isAliasString(value) {
  return typeof value === "string" && aliasPattern.test(value);
}

function toCssValue(value) {
  if (value === null || value === undefined) {
    throw new Error("Token value cannot be nullish.");
  }
  if (typeof value === "number") return `${value}`;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value && value.colorSpace === "oklch" && Array.isArray(value.components) && value.components.length >= 3) {
      const [lightness, chroma, hue] = value.components;
      const alpha = typeof value.alpha === "number" ? value.alpha : 1;
      const alphaPart = alpha === 1 ? "" : ` / ${alpha}`;
      return `oklch(${lightness} ${chroma} ${hue}${alphaPart})`;
    }
    if (Object.prototype.hasOwnProperty.call(value, "value") && Object.prototype.hasOwnProperty.call(value, "unit")) {
      return `${value.value}${value.unit}`;
    }
  }
  return `${value}`;
}

function resolveLeaf(leaf, context, modeName, stack, cache) {
  const value = tokenValue(leaf);
  const serializedValue = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
  const key = `${modeName ?? "global"}::${serializedValue}`;
  if (stack.has(key)) {
    const order = [...stack].join(" -> ");
    throw new Error(`Circular alias detected: ${order} -> ${key}`);
  }

  if (cache.has(key)) {
    return cache.get(key);
  }

  if (isAliasString(value)) {
    stack.add(key);
    const resolved = resolveAlias(value, context, modeName, stack, cache);
    cache.set(key, resolved);
    stack.delete(key);
    return resolved;
  }

  const resolved = toCssValue(value);
  cache.set(key, resolved);
  return resolved;
}

function resolveAlias(alias, context, modeName, stack, cache) {
  const target = alias.slice(1, -1).trim();
  if (!target) {
    throw new Error("Empty alias is not valid.");
  }

  const cacheKey = `${modeName ?? "global"}::${target}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const segments = normalizeSegments(target);
  if (segments.length === 0) {
    throw new Error("Alias target cannot be empty.");
  }

  const first = segments[0];
  const rest = segments.slice(1);

  let candidate;

  if (first === "reference") {
    candidate = getByPath(context.reference, rest);
  } else if (first === "semantic") {
    candidate = getByPath(context.semantic, rest);
  } else if (first === "modes") {
    if (rest.length === 0) {
      throw new Error(`Invalid alias target ${target}`);
    }
    const modeAlias = rest[0];
    const modeSegments = rest.slice(1);
    const modeTree = context.modes.get(modeAlias);
    if (!modeTree) {
      throw new Error(`Unknown mode in alias: ${target}`);
    }
    candidate = getByPath(modeTree, modeSegments);
  } else {
    // Unscoped aliases resolve by current mode -> semantic -> reference.
    if (modeName) {
      const modeTree = context.modes.get(modeName);
      if (modeTree) {
        candidate = getByPath(modeTree, segments);
      }
    }
    if (!candidate) {
      candidate = getByPath(context.semantic, segments);
    }
    if (!candidate && modeName) {
      candidate = getByPath(context.reference, segments);
    }
  }

  if (!candidate) {
    throw new Error(`Unknown alias target ${target}`);
  }

  const stackKey = `${modeName ?? "global"}::${target}`;
  if (stack.has(stackKey)) {
    const order = [...stack].join(" -> ");
    throw new Error(`Circular alias detected: ${order} -> ${stackKey}`);
  }

  stack.add(stackKey);
  const resolved = resolveLeaf(candidate, context, modeName, stack, cache);
  stack.delete(stackKey);
  cache.set(cacheKey, resolved);
  return resolved;
}

function resolveAll(rawTokens, context, modeName) {
  const output = {};
  const cache = new Map();
  for (const [pathString, leaf] of rawTokens.entries()) {
    output[pathString] = resolveLeaf(leaf, context, modeName, new Set(), cache);
  }
  return output;
}

function sortedObject(input) {
  const out = {};
  for (const [key, value] of Object.entries(input).sort(([a], [b]) => a.localeCompare(b))) {
    out[key] = value;
  }
  return out;
}

function unflatten(flat) {
  const out = {};
  for (const [pathString, value] of Object.entries(flat)) {
    const parts = normalizeSegments(pathString);
    let current = out;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (index === parts.length - 1) {
        current[part] = value;
      } else {
        if (typeof current[part] !== "object" || current[part] === null) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// CSS output

const LAYER_DEPENDENT_SELECTORS = (brand) => ({
  light: [
    `[data-brand="${brand}"]`,
    `[data-brand="${brand}"][data-theme="light"]`,
    `:where([data-brand="${brand}"]) [data-theme="light"]`,
  ],
  dark: [
    `[data-brand="${brand}"][data-theme="dark"]`,
    `:where([data-theme="dark"]) [data-brand="${brand}"]`,
    `:where([data-brand="${brand}"]) [data-theme="dark"]`,
  ],
});

function declarations(tokens, indent) {
  return Object.entries(tokens)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${indent}--brand-${name}: ${value};`);
}

const reducedMotion = [
  "@media (prefers-reduced-motion: reduce) {",
  "  @layer tokens {",
  "    :root {",
  "      --brand-duration-fast: 0ms;",
  "      --brand-duration-normal: 0ms;",
  "    }",
  "  }",
  "}",
];

function buildThemeCss(modeMap, defaultMode, brandModes) {
  const modes = Object.keys(modeMap).sort();
  const lines = ["@layer tokens {"];

  for (const mode of modes) {
    const colorScheme = mode === "dark" || mode.endsWith("-dark") ? "dark" : "light";
    lines.push(`  [data-theme="${mode}"] {`);
    lines.push(`    color-scheme: ${colorScheme};`);
    lines.push(...declarations(modeMap[mode], "    "));
    lines.push("  }");
  }

  lines.push(`  [data-theme="${defaultMode}"] {`);
  lines.push(`    color-scheme: ${defaultMode};`);
  lines.push("  }");
  lines.push(`  :root {`);
  lines.push("    color-scheme: light;");
  lines.push("  }");

  // Brands come after the modes so that, at equal specificity, a brand palette wins.
  for (const [brand, modesForBrand] of Object.entries(brandModes)) {
    const selectors = LAYER_DEPENDENT_SELECTORS(brand);
    for (const mode of ["light", "dark"]) {
      lines.push(`  ${selectors[mode].join(",\n  ")} {`);
      lines.push(`    color-scheme: ${mode};`);
      lines.push(...declarations(modesForBrand[mode], "    "));
      lines.push("  }");
    }
  }

  lines.push("}");
  lines.push(...reducedMotion);
  return lines.join("\n");
}

/** One brand as a standalone sheet: the brand's light palette at :root, dark under data-theme="dark". */
function buildBrandCss(brand, modesForBrand) {
  const lines = [
    `/* @brandcloud/tokens brand "${brand}". Import on its own for a single-brand site, or use themes.css with data-brand="${brand}". */`,
    "@layer tokens {",
    `  :root, [data-theme="light"], [data-brand="${brand}"] {`,
    "    color-scheme: light;",
    ...declarations(modesForBrand.light, "    "),
    "  }",
    `  [data-theme="dark"], [data-brand="${brand}"][data-theme="dark"] {`,
    "    color-scheme: dark;",
    ...declarations(modesForBrand.dark, "    "),
    "  }",
    "}",
    ...reducedMotion,
  ];
  return lines.join("\n");
}

function buildTokensCss(referenceTokens, themeTokens) {
  const lines = ["@layer tokens {", "  :root {"];
  for (const [name, value] of Object.entries(referenceTokens)) {
    const cssSafeName = name.replaceAll(".", "-");

    lines.push(`    --brand-ref-${cssSafeName}: ${value};`);
  }
  for (const [name, value] of Object.entries(themeTokens)) {
    lines.push(`    --brand-${name}: ${value};`);
  }
  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

// Roles that have no safe Tailwind namespace stay CSS-variable only.
const tailwindExcludedPrefixes = ["breakpoint-", "z-index-"];
const tailwindExcludedNames = new Set(["action-appearance", "action-depth-glow-reach"]);

function tailwindName(name, type) {
  if (tailwindExcludedNames.has(name) || tailwindExcludedPrefixes.some((prefix) => name.startsWith(prefix))) return undefined;
  if (type === "gradient") return { utility: `bg-${name.replace(/-fill$/, "")}` };
  if (type === "fontFamily") return { variable: `--font-${name.replace(/^font-/, "")}`, value: `var(--brand-${name})` };
  if (type === "fontWeight") return { variable: `--font-weight-${name.slice("font-weight-".length)}`, value: `var(--brand-${name})` };
  if (type === "shadow") return { variable: `--shadow-${name.replace(/^shadow-/, "")}`, value: `var(--brand-${name})` };
  if (type === "number") return undefined;
  if (type === "string") return undefined;
  if (name.startsWith("font-size-")) return { variable: `--text-${name.slice("font-size-".length)}`, value: `var(--brand-${name})` };
  if (name.startsWith("letter-spacing-")) return { variable: `--tracking-${name.slice("letter-spacing-".length)}`, value: `var(--brand-${name})` };
  if (name.startsWith("spacing-") || name.startsWith("radius-") || name.startsWith("duration-")) return { literal: true };
  if (name === "section-space-y") return { variable: "--spacing-section", value: `var(--brand-${name})` };
  if (name.startsWith("action-height-")) return { variable: `--spacing-action-${name.slice("action-height-".length)}`, value: `var(--brand-${name})` };
  if (name === "content" || name.startsWith("content-")) return { variable: `--container-${name}`, value: `var(--brand-${name})` };
  if (type === "color") return { variable: `--color-${name}`, value: `var(--brand-${name})` };
  return undefined;
}

function buildTailwindCss(semanticTokens, types) {
  // `@theme inline` makes utilities read --brand-* where they are used, so data-brand and
  // data-theme on any element (not only <html>) re-theme the utilities inside it.
  const lines = ["@theme inline {"];
  const utilities = [];
  for (const [name, value] of Object.entries(semanticTokens).sort(([a], [b]) => a.localeCompare(b))) {
    const mapping = tailwindName(name, types[name]);
    if (!mapping) continue;
    if (mapping.utility) {
      utilities.push(`@utility ${mapping.utility} {\n  background-image: var(--brand-${name});\n}`);
      continue;
    }
    if (mapping.literal) {
      lines.push(`  --${name}: ${value};`);
      continue;
    }
    lines.push(`  ${mapping.variable}: ${mapping.value};`);
  }
  lines.push("}");
  return [lines.join("\n"), ...utilities].join("\n\n");
}

// shadcn/ui's CSS variable contract, pointed at brand roles so stock shadcn components inherit the brand.
const shadcnMap = [
  ["background", "canvas"],
  ["foreground", "text"],
  ["card", "surface-raised"],
  ["card-foreground", "text"],
  ["popover", "surface-raised"],
  ["popover-foreground", "text"],
  ["primary", "accent"],
  ["primary-foreground", "accent-text"],
  ["secondary", "surface-muted"],
  ["secondary-foreground", "text"],
  ["muted", "surface-muted"],
  ["muted-foreground", "text-muted"],
  ["accent", "surface-interactive"],
  ["accent-foreground", "text"],
  ["destructive", "danger"],
  ["destructive-foreground", "inverse-text"],
  ["border", "border"],
  ["input", "border-strong"],
  ["ring", "focus"],
  ["chart-1", "accent"],
  ["chart-2", "level-sky-base"],
  ["chart-3", "level-navy-base"],
  ["chart-4", "status-success"],
  ["chart-5", "status-warning"],
  ["sidebar", "surface"],
  ["sidebar-foreground", "text"],
  ["sidebar-primary", "accent"],
  ["sidebar-primary-foreground", "accent-text"],
  ["sidebar-accent", "surface-interactive"],
  ["sidebar-accent-foreground", "text"],
  ["sidebar-border", "border"],
  ["sidebar-ring", "focus"],
];

function buildShadcnCss() {
  const lines = [
    "/* shadcn/ui variable contract mapped to @brandcloud/tokens roles. Import after @brandcloud/tokens/css and themes.css. */",
    "@layer tokens {",
    "  :root, [data-theme], [data-brand] {",
    ...shadcnMap.map(([name, role]) => `    --${name}: var(--brand-${role});`),
    "    --radius: var(--brand-radius-control);",
    "  }",
    "}",
    "",
    "@theme inline {",
    ...shadcnMap.map(([name]) => `  --color-${name}: var(--${name});`),
    "  --radius-sm: calc(var(--radius) - 4px);",
    "  --radius-md: calc(var(--radius) - 2px);",
    "  --radius-lg: var(--radius);",
    "  --radius-xl: calc(var(--radius) + 4px);",
    "}",
  ];
  return lines.join("\n");
}

function generateTypeDefinitions() {
  return `export interface TokenTheme {
  [token: string]: string;
}

export interface BrandInfo {
  name: string;
  label: string;
  appearance: "solid" | "depth";
  modes: string[];
}

export interface ThemeManifest {
  reference: TokenTheme;
  semantic: TokenTheme;
  themes: { [mode: string]: TokenTheme };
  brands: { [brand: string]: { [mode: string]: TokenTheme } };
  metadata: {
    defaultMode: string;
    modes: string[];
    defaultBrand: string;
    brands: BrandInfo[];
  };
  warnings: string[];
}

export declare const reference: TokenTheme;
export declare const semantic: TokenTheme;
export declare const themes: { [mode: string]: TokenTheme };
export declare const brands: { [brand: string]: { [mode: string]: TokenTheme } };
export declare const metadata: ThemeManifest['metadata'];
export declare const manifest: ThemeManifest;
export default manifest;
`;
}

function buildArtifacts({ resolvedReference, resolvedSemantic, resolvedModes, defaultMode, metadata, warnings, brandModes, types, contrastReport }) {
  const nestedReference = unflatten(resolvedReference);
  const nestedSemantic = unflatten(resolvedSemantic);
  const nestedThemes = {};

  for (const [modeName, modeValues] of Object.entries(resolvedModes)) {
    nestedThemes[modeName] = unflatten(modeValues);
  }

  const themeTokens = resolvedModes[defaultMode];

  const indexJs = `export const reference = ${JSON.stringify(resolvedReference, null, 2)};
export const semantic = ${JSON.stringify(resolvedSemantic, null, 2)};
export const themes = ${JSON.stringify(resolvedModes, null, 2)};
export const brands = ${JSON.stringify(brandModes, null, 2)};
export const metadata = ${JSON.stringify(metadata, null, 2)};
export const manifest = { reference, semantic, themes, brands, metadata };
export default manifest;
`;

  const brandCss = {};
  for (const [brand, modesForBrand] of Object.entries(brandModes)) brandCss[brand] = `${buildBrandCss(brand, modesForBrand)}\n`;

  return {
    nested: { reference: nestedReference, semantic: nestedSemantic, themes: nestedThemes, metadata },
    json: {
      reference: nestedReference,
      semantic: nestedSemantic,
      themes: nestedThemes,
      brands: brandModes,
      metadata,
      warnings,
    },
    tokensCss: `${buildTokensCss(resolvedReference, themeTokens)}\n`,
    themesCss: `${buildThemeCss(resolvedModes, defaultMode, brandModes)}\n`,
    tailwindCss: `${buildTailwindCss(resolvedSemantic, types)}\n`,
    shadcnCss: `${buildShadcnCss()}\n`,
    brandCss,
    contrastReport,
    indexJs,
    indexDts: generateTypeDefinitions(),
  };
}

function validateTokenStructure(source) {
  if (!source || typeof source !== "object") {
    throw new Error("Source must be a JSON object.");
  }
  if (!source.reference || typeof source.reference !== "object") {
    throw new Error("Missing or invalid reference tokens.");
  }
  if (!source.semantic || typeof source.semantic !== "object") {
    throw new Error("Missing or invalid semantic tokens.");
  }
  if (!source.modes || typeof source.modes !== "object") {
    throw new Error("Missing or invalid mode tokens.");
  }
}

function defaultBrandsDirectory(sourcePath) {
  return path.resolve(path.dirname(sourcePath), "..", "brands");
}

/**
 * Compiles tokens.json plus every brand in `brandsDir` (default: ../brands next to src).
 * Throws when a required contrast pair or a gradient hue rule fails in any brand or mode.
 */
export async function compile(sourcePath = path.resolve(process.cwd(), "src/tokens.json"), options = {}) {
  const source = await readJson(sourcePath);
  validateTokenStructure(source);

  const defaultMode = typeof source.metadata?.defaultMode === "string" ? source.metadata.defaultMode : "light";
  const defaultBrand = typeof source.metadata?.defaultBrand === "string" ? source.metadata.defaultBrand : DEFAULT_BRAND;

  const referenceFlat = flattenTokens(source.reference);
  const semanticFlat = flattenTokens(source.semantic);
  const modeMap = new Map();

  for (const [modeName, value] of Object.entries(source.modes)) {
    if (modeName.length === 0 || !value || typeof value !== "object") {
      throw new Error("Each mode must be an object of token leaves.");
    }
    modeMap.set(modeName, flattenTokens(value));
  }

  if (!modeMap.has(defaultMode)) {
    throw new Error(`Default mode '${defaultMode}' is not defined in modes.`);
  }

  const types = {};
  for (const [name, leaf] of semanticFlat.entries()) types[name] = hasOwn(leaf, "$type") ? leaf.$type : leaf.type;

  const context = {
    reference: referenceFlat,
    semantic: semanticFlat,
    modes: modeMap,
  };

  const diagnostics = { errors: [], warnings: [] };
  const contrastReport = [];
  const resolvedReference = sortedObject(resolveAll(referenceFlat, context));
  const resolvedSemantic = sortedObject(resolveAll(semanticFlat, context));

  const collect = (label, brand, mode, tokens) => {
    const result = checkTokens(tokens, label);
    diagnostics.errors.push(...result.errors);
    contrastReport.push({ brand, mode, checks: result.checks, advisories: result.advisories });
  };

  const resolvedModes = {};
  for (const [modeName] of modeMap) {
    const modeTokens = new Map(context.semantic);
    for (const [name, leaf] of modeMap.get(modeName).entries()) {
      modeTokens.set(name, leaf);
    }
    const resolved = sortedObject(resolveAll(modeTokens, context, modeName));
    collect(`Mode ${modeName}`, defaultBrand, modeName, resolved);
    resolvedModes[modeName] = resolved;
  }

  const brandsDir = options.brandsDir ?? defaultBrandsDirectory(sourcePath);
  const brandFiles = options.brands ?? (brandsDir ? await loadBrandFiles(brandsDir) : []);
  const brandModes = {};
  const brandInfo = [];
  for (const input of brandFiles) {
    if (!resolvedModes.light || !resolvedModes.dark) {
      throw new Error(`Brand ${input.name} needs "light" and "dark" modes in the base tokens.`);
    }
    const { brand, modes } = deriveBrandModes(input, resolvedModes);
    for (const mode of BRAND_MODES) collect(`Brand ${brand.name} ${mode}`, brand.name, mode, modes[mode]);
    brandModes[brand.name] = modes;
    brandInfo.push({ name: brand.name, label: brand.label, appearance: brand.appearance, modes: [...BRAND_MODES] });
  }

  if (diagnostics.errors.length > 0) {
    const lines = diagnostics.errors.map((entry) => `- ${entry}`).join("\n");
    throw new Error(`Token validation failed:\n${lines}`);
  }

  const metadata = {
    defaultMode,
    modes: Object.keys(resolvedModes).sort(),
    defaultBrand,
    brands: [
      { name: defaultBrand, label: "BrandCloud", appearance: resolvedModes[defaultMode]["action-appearance"] ?? "solid", modes: Object.keys(resolvedModes).sort() },
      ...brandInfo,
    ],
  };

  const artifacts = buildArtifacts({
    resolvedReference,
    resolvedSemantic,
    resolvedModes,
    defaultMode,
    metadata,
    warnings: diagnostics.warnings,
    brandModes,
    types,
    contrastReport,
  });
  return { diagnostics, artifacts };
}

const cssDeclaration = "declare const styles: string;\nexport default styles;\n";
// Runtime modules copied into dist so consumer repositories can run ui-lint from the package.
const runtimeModules = ["colour.mjs", "brand.mjs", "ui-lint.mjs", "ui-lint-cli.mjs", "ui-lint.d.mts"];

export async function build(sourcePath = path.resolve(process.cwd(), "src/tokens.json"), options = {}) {
  const { diagnostics, artifacts } = await compile(sourcePath, options);
  const basePath = path.dirname(sourcePath);
  const dist = path.resolve(basePath, "..", "dist");
  await fs.mkdir(path.join(dist, "brands"), { recursive: true });

  const writes = [
    fs.writeFile(path.join(dist, "tokens.css"), artifacts.tokensCss),
    fs.writeFile(path.join(dist, "themes.css"), artifacts.themesCss),
    fs.writeFile(path.join(dist, "tailwind.css"), artifacts.tailwindCss),
    fs.writeFile(path.join(dist, "shadcn.css"), artifacts.shadcnCss),
    fs.writeFile(path.join(dist, "shadcn.css.d.ts"), cssDeclaration),
    fs.writeFile(path.join(dist, "index.js"), artifacts.indexJs),
    fs.writeFile(path.join(dist, "index.d.ts"), artifacts.indexDts),
    fs.writeFile(path.join(dist, "tokens.json"), `${JSON.stringify(artifacts.json, null, 2)}\n`),
    fs.writeFile(path.join(dist, "contrast-report.json"), `${JSON.stringify(artifacts.contrastReport, null, 2)}\n`),
  ];
  for (const [brand, css] of Object.entries(artifacts.brandCss)) {
    writes.push(fs.writeFile(path.join(dist, "brands", `${brand}.css`), css));
    writes.push(fs.writeFile(path.join(dist, "brands", `${brand}.css.d.ts`), cssDeclaration));
  }
  for (const file of runtimeModules) {
    const from = path.join(basePath, file);
    try {
      await fs.access(from);
    } catch {
      continue;
    }
    writes.push(fs.copyFile(from, path.join(dist, file)));
  }
  await Promise.all(writes);

  for (const warning of diagnostics.warnings) {
    console.warn(`[tokens] warning: ${warning}`);
  }
  const advisories = artifacts.contrastReport.reduce((sum, entry) => sum + entry.advisories.length, 0);
  if (advisories > 0) console.warn(`[tokens] ${advisories} advisory contrast note(s); see dist/contrast-report.json`);

  return { diagnostics, artifacts };
}

export async function validate(sourcePath = path.resolve(process.cwd(), "src/tokens.json"), options = {}) {
  const { diagnostics } = await compile(sourcePath, options);
  for (const warning of diagnostics.warnings) {
    console.warn(`[tokens] warning: ${warning}`);
  }
  return diagnostics;
}

export async function run(command = "validate") {
  if (command === "build") {
    await build();
    return;
  }
  if (command === "validate") {
    await validate();
    return;
  }
  throw new Error(`Unknown command '${command}'. Use 'validate' or 'build'.`);
}
