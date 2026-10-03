// Brand palettes layered over the token modes.
//
// A brand file (packages/tokens/brands/<name>.json) is a small input:
//   { name, label, accent, ink, paper, fonts: { display, body }, appearance, overrides: { shared, light, dark } }
// deriveBrandModes() turns it into a complete light and dark token set by starting from the
// default BrandCloud mode of the same name and replacing every colour role that depends on the
// brand (surfaces, text, accent, depth button, ink button, fonts). Offer levels, WhatsApp,
// spacing, radii and z-index layers are shared unless a brand overrides them.

// Node built-ins load lazily inside loadBrandFiles, so this module also runs in a browser
// (an in-page brand builder can call normaliseBrandInput, deriveBrandModes and checkTokens).

import {
  contrastRatio,
  colourLiterals,
  hueSpan,
  isColour,
  mix,
  parseColour,
  shiftLightness,
  toOklch,
  withAlpha,
} from "./colour.mjs";

export const DEFAULT_BRAND = "brandui";
export const BRAND_MODES = ["light", "dark"];
export const LEVELS = ["sky", "blue", "navy", "pearl", "obsidian"];
export const APPEARANCES = ["solid", "depth"];
export const MAX_GRADIENT_HUE_SPAN = 40;

const WHITE = "#ffffff";
const BLACK = "#000000";

/**
 * Text pairs that must meet WCAG 2.2 AA (4.5:1) in every brand and mode. A failure stops the build.
 * [foreground, background]
 */
export const REQUIRED_TEXT_PAIRS = [
  ["text", "canvas"],
  ["text", "surface"],
  ["text", "surface-raised"],
  ["text", "surface-muted"],
  ["text-muted", "canvas"],
  ["text-muted", "surface"],
  ["text-subtle", "canvas"],
  ["text-subtle", "surface"],
  ["accent", "canvas"],
  ["accent-text", "accent"],
  ["accent-text", "accent-hover"],
  ["inverse-text", "inverse-canvas"],
  ["inverse-text", "inverse-surface"],
  ["inverse-text-muted", "inverse-canvas"],
  ["action-depth-text", "action-depth-from"],
  ["action-depth-text", "action-depth-to"],
  ["action-ink-text", "action-ink"],
  ["action-ink-text", "action-ink-hover"],
  ["whatsapp-text", "whatsapp"],
  ["whatsapp-text", "whatsapp-hover"],
  ["whatsapp-text", "whatsapp-highlight"],
  ["status-warning-text", "canvas"],
  ["status-warning-text", "status-warning-subtle"],
  ...LEVELS.flatMap((level) => [
    [`level-${level}-text`, `level-${level}-highlight`],
    [`level-${level}-text`, `level-${level}-base`],
    [`level-${level}-text`, `level-${level}-hover`],
    [`level-${level}-ink`, "canvas"],
    [`level-${level}-ink`, "surface"],
  ]),
];

/** Pairs that are reported but do not stop the build (status colours double as fills; borders are 3:1 targets). */
export const ADVISORY_PAIRS = [
  ["status-success", "canvas", 4.5],
  ["status-warning", "canvas", 4.5],
  ["status-info", "canvas", 4.5],
  ["danger", "canvas", 4.5],
  ["status-success", "status-success-subtle", 4.5],
  ["status-warning", "status-warning-subtle", 4.5],
  ["status-info", "status-info-subtle", 4.5],
  ["danger", "status-danger-subtle", 4.5],
  ["focus", "canvas", 3],
  ["border-strong", "canvas", 3],
];

/** Gradient groups whose stops must stay inside one hue family (the gradient rule). */
export const GRADIENT_GROUPS = [
  ["action-depth", ["action-depth-from", "action-depth-to", "action-depth-glow"]],
  ["whatsapp", ["whatsapp-highlight", "whatsapp"]],
  ...LEVELS.map((level) => [`level-${level}`, [`level-${level}-highlight`, `level-${level}-base`, `level-${level}-deep`]]),
];

/**
 * Worst-case contrast of the depth button label, modelled on a rendered depth button:
 * a top-to-bottom body gradient,
 * an inner glow rising from the bottom edge (an ellipse 65.28% wide and `glowReach` tall), and a
 * white sheen over the top half fading from `sheen` alpha to a quarter of it.
 * The label sits in the vertical centre; we sample every row its glyphs cover (cap top at about
 * half an em above the centre line, descenders at about 0.6 em below it, which is where most
 * grotesque sans faces put them at line-height 1.5) down the centre line, where the glow is
 * strongest, and return the lowest ratio. Calibration: for the v4 primary this finds the worst
 * pixel at the top of the glyphs under the sheen, rgb(46 105 236) at 4.83:1, which is what v4's
 * Playwright pixel measurement recorded (qa/v4/buttons-contrast.json: rgb(45,105,236), 4.83).
 */
export function depthLabelContrast(tokens, { height = 48, fontSize = 16, inset = 2 } = {}) {
  const from = parseColour(tokens["action-depth-from"]);
  const to = parseColour(tokens["action-depth-to"]);
  const glow = parseColour(tokens["action-depth-glow"]) ?? { r: 0, g: 0, b: 0, alpha: 0 };
  const sheen = parseColour(tokens["action-depth-sheen"]) ?? { r: 255, g: 255, b: 255, alpha: 0 };
  const text = tokens["action-depth-text"];
  const reachRaw = String(tokens["action-depth-glow-reach"] ?? "30%").trim();
  const reach = reachRaw.endsWith("%") ? Number.parseFloat(reachRaw) / 100 : 0.3;
  if (!from || !to || !parseColour(text)) return undefined;

  const middle = height / 2;
  const top = middle - 0.5 * fontSize;
  const bottom = middle + 0.6 * fontSize;
  const glowRadius = reach * height;
  const sheenHeight = (height - inset * 2) / 2;
  let worst = { ratio: Infinity };
  for (let y = top; y <= bottom + 1e-9; y += 0.5) {
    const t = y / height;
    let pixel = {
      r: from.r + (to.r - from.r) * t,
      g: from.g + (to.g - from.g) * t,
      b: from.b + (to.b - from.b) * t,
    };
    const glowDistance = (height - y) / glowRadius;
    if (glowDistance < 1) {
      const alpha = glow.alpha * (1 - glowDistance);
      pixel = { r: glow.r * alpha + pixel.r * (1 - alpha), g: glow.g * alpha + pixel.g * (1 - alpha), b: glow.b * alpha + pixel.b * (1 - alpha) };
    }
    const sheenY = y - inset;
    if (sheenY >= 0 && sheenY < sheenHeight) {
      const alpha = sheen.alpha * (1 - 0.75 * (sheenY / sheenHeight));
      pixel = { r: sheen.r * alpha + pixel.r * (1 - alpha), g: sheen.g * alpha + pixel.g * (1 - alpha), b: sheen.b * alpha + pixel.b * (1 - alpha) };
    }
    const ratio = contrastRatio(text, { ...pixel, alpha: 1 });
    if (ratio < worst.ratio) worst = { ratio, y, background: `rgb(${Math.round(pixel.r)} ${Math.round(pixel.g)} ${Math.round(pixel.b)})` };
  }
  return worst;
}

/** Contrast and gradient checks for one resolved token set. */
export function checkTokens(tokens, label) {
  const errors = [];
  const advisories = [];
  const checks = [];
  const record = (fg, bg, need, required, ratioOverride) => {
    const ratio = ratioOverride ?? contrastRatio(tokens[fg], tokens[bg], tokens.canvas && parseColour(tokens.canvas)?.alpha === 1 ? tokens.canvas : WHITE);
    if (ratio === undefined) {
      if (required) errors.push(`${label}: cannot measure contrast of ${fg} (${tokens[fg]}) on ${bg} (${tokens[bg]}).`);
      return;
    }
    const pass = ratio + 1e-9 >= need;
    checks.push({ fg, bg, ratio: Number(ratio.toFixed(2)), need, pass, required });
    if (!pass) {
      const message = `${label}: contrast ${fg}/${bg} is ${ratio.toFixed(2)} and below ${need.toFixed(1)} requirement.`;
      (required ? errors : advisories).push(message);
    }
  };

  for (const [fg, bg] of REQUIRED_TEXT_PAIRS) {
    if (tokens[fg] === undefined || tokens[bg] === undefined) continue;
    record(fg, bg, 4.5, true);
  }
  for (const [fg, bg, need] of ADVISORY_PAIRS) {
    if (tokens[fg] === undefined || tokens[bg] === undefined) continue;
    record(fg, bg, need, false);
  }
  if (tokens["action-depth-from"] !== undefined) {
    for (const size of [{ height: 44, fontSize: 15 }, { height: 48, fontSize: 16 }, { height: 56, fontSize: 17 }]) {
      const worst = depthLabelContrast(tokens, size);
      if (worst) record("action-depth-text", `action-depth-fill@${size.height}px`, 4.5, true, worst.ratio);
    }
  }
  for (const [group, names] of GRADIENT_GROUPS) {
    const stops = names.map((name) => tokens[name]).filter((value) => value !== undefined);
    if (stops.length < 2) continue;
    const span = hueSpan(stops);
    if (span > MAX_GRADIENT_HUE_SPAN) {
      errors.push(`${label}: ${group} gradient spans ${span.toFixed(0)} degrees of hue (max ${MAX_GRADIENT_HUE_SPAN}). Keep gradients in one hue family.`);
    }
  }
  return { errors, advisories, checks };
}

// ---------------------------------------------------------------------------------------------
// Derivation

function best(candidates, background) {
  return candidates
    .map((candidate) => ({ candidate, ratio: contrastRatio(candidate, background) ?? 0 }))
    .sort((first, second) => second.ratio - first.ratio)[0].candidate;
}

/** Moves `colour` towards `towards` in 2% steps until it reaches `target` on every background. */
export function ensureContrast(colour, backgrounds, target, towards) {
  let current = colour;
  for (let step = 0; step <= 50; step += 1) {
    if (backgrounds.every((background) => (contrastRatio(current, background) ?? 0) >= target + 0.05)) return current;
    current = mix(colour, towards, Math.min(1, (step + 1) * 0.02));
  }
  return current;
}

/** White when it reaches AA on the fill, else the brand ink, else black, else whichever is best. */
function labelFor(fill, ink) {
  for (const candidate of [WHITE, ink, BLACK]) if ((contrastRatio(candidate, fill) ?? 0) >= 4.5) return candidate;
  return best([WHITE, ink, BLACK], fill);
}

function isDark(colour) {
  return toOklch(colour).l < 0.5;
}

function rgbTriplet(colour) {
  const parsed = parseColour(colour);
  return `${Math.round(parsed.r)} ${Math.round(parsed.g)} ${Math.round(parsed.b)}`;
}

function depthShadow(contact, glow, alpha) {
  return `0 2px 3px rgb(${rgbTriplet(contact)} / 0.35), 0 12px 28px -8px rgb(${rgbTriplet(glow)} / ${alpha})`;
}

function fontStack(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}

/** Normalises and validates a brand input object. Throws with every problem listed. */
export function normaliseBrandInput(input, source = "brand") {
  const problems = [];
  const brand = { ...input };
  if (typeof brand.name !== "string" || !/^[a-z][a-z0-9-]*$/.test(brand.name)) problems.push("name must be lower-case letters, digits and hyphens, starting with a letter");
  if (brand.name === DEFAULT_BRAND) problems.push(`"${DEFAULT_BRAND}" is the built-in default brand`);
  for (const key of ["accent", "ink", "paper"]) {
    if (!isColour(brand[key]) || parseColour(brand[key]).alpha !== 1) problems.push(`${key} must be an opaque CSS colour`);
  }
  if (!brand.fonts || typeof brand.fonts !== "object" || !brand.fonts.body) problems.push("fonts.body is required (a font-family stack)");
  brand.appearance ??= "depth";
  if (!APPEARANCES.includes(brand.appearance)) problems.push(`appearance must be one of ${APPEARANCES.join(", ")}`);
  brand.overrides ??= {};
  for (const mode of Object.keys(brand.overrides)) {
    if (!BRAND_MODES.includes(mode) && mode !== "shared") problems.push(`overrides.${mode} is not a brand mode (use light, dark or shared)`);
  }
  if (problems.length) throw new Error(`Invalid ${source}:\n${problems.map((problem) => `- ${problem}`).join("\n")}`);
  brand.label ??= brand.name;
  brand.fonts = { body: fontStack(brand.fonts.body), display: fontStack(brand.fonts.display ?? brand.fonts.body) };
  return brand;
}

function deriveLight(brand, base) {
  const { accent, ink, paper } = brand;
  const tokens = {};
  const surface = WHITE;
  tokens.canvas = paper;
  tokens.surface = surface;
  tokens["surface-raised"] = surface;
  tokens["surface-subtle"] = paper;
  tokens["surface-muted"] = mix(paper, ink, 0.05);
  tokens["surface-interactive"] = mix(paper, ink, 0.07);
  tokens.text = ensureContrast(ink, [paper, surface, tokens["surface-muted"]], 7, BLACK);
  tokens["text-muted"] = ensureContrast(mix(ink, paper, 0.3), [paper, surface, tokens["surface-muted"]], 4.5, tokens.text);
  tokens["text-subtle"] = ensureContrast(mix(ink, paper, 0.45), [paper, surface], 4.5, tokens.text);
  tokens.border = withAlpha(ink, 0.12);
  tokens["border-strong"] = withAlpha(ink, 0.28);

  const accentText = labelFor(accent, ink);
  const lightLabel = accentText === WHITE;
  tokens["accent-text"] = accentText;
  // A dark accent doubles as link text, so it must also read on the page. A light accent
  // (yellow, sky) stays a fill; the accent/canvas check then reports it for an override.
  tokens.accent = lightLabel ? ensureContrast(accent, [paper, surface], 4.5, BLACK) : accent;
  tokens["accent-hover"] = ensureContrast(shiftLightness(tokens.accent, lightLabel ? -0.06 : 0.05), [accentText], 4.5, lightLabel ? BLACK : WHITE);
  tokens["accent-subtle"] = mix(tokens.accent, WHITE, 0.9);
  tokens.focus = tokens.accent;
  tokens["focus-ring"] = withAlpha(tokens.accent, 0.24);
  tokens["decorative-highlight"] = tokens.accent;
  tokens["agent-working"] = tokens.accent;

  for (const role of ["status-success", "status-warning", "status-info", "danger"]) {
    if (base[role] !== undefined) tokens[role] = ensureContrast(base[role], [paper, surface], 4.5, ink);
  }
  if (base["status-warning-text"] !== undefined) {
    tokens["status-warning-text"] = ensureContrast(base["status-warning-text"], [paper, surface, base["status-warning-subtle"] ?? surface], 4.5, ink);
  }

  tokens["inverse-canvas"] = isDark(ink) ? ink : "#0b0b0c";
  tokens["inverse-surface"] = mix(tokens["inverse-canvas"], WHITE, 0.06);
  tokens["inverse-surface-muted"] = mix(tokens["inverse-canvas"], WHITE, 0.1);
  tokens["inverse-text"] = ensureContrast(paper, [tokens["inverse-canvas"], tokens["inverse-surface"]], 7, WHITE);
  tokens["inverse-text-muted"] = ensureContrast(mix(paper, tokens["inverse-canvas"], 0.32), [tokens["inverse-canvas"], tokens["inverse-surface"]], 4.5, paper);
  tokens["inverse-border"] = withAlpha(WHITE, 0.12);
  tokens["overlay-backdrop"] = withAlpha(ink, 0.58);
  tokens["overlay-hover"] = withAlpha(ink, 0.04);
  tokens["overlay-pressed"] = withAlpha(ink, 0.08);

  Object.assign(tokens, deriveDepth(tokens.accent, accentText, ink, 0.5));
  tokens["action-ink"] = tokens.text;
  tokens["action-ink-text"] = best([WHITE, paper], tokens.text);
  tokens["action-ink-hover"] = ensureContrast(mix(tokens.text, WHITE, 0.12), [tokens["action-ink-text"]], 4.5, BLACK);
  return tokens;
}

function deriveDark(brand, light, base) {
  const { ink, paper } = brand;
  const tokens = {};
  const canvas = isDark(ink) ? ink : "#0b0b0c";
  tokens.canvas = canvas;
  tokens.surface = mix(canvas, WHITE, 0.05);
  tokens["surface-raised"] = mix(canvas, WHITE, 0.08);
  tokens["surface-subtle"] = mix(canvas, WHITE, 0.03);
  tokens["surface-muted"] = mix(canvas, WHITE, 0.05);
  tokens["surface-interactive"] = mix(canvas, WHITE, 0.1);
  const surfaces = [canvas, tokens.surface, tokens["surface-raised"]];
  tokens.text = ensureContrast(paper, surfaces, 7, WHITE);
  tokens["text-muted"] = ensureContrast(mix(paper, canvas, 0.3), surfaces, 4.5, paper);
  tokens["text-subtle"] = ensureContrast(mix(paper, canvas, 0.42), [canvas, tokens.surface], 4.5, paper);
  tokens.border = withAlpha(WHITE, 0.12);
  tokens["border-strong"] = withAlpha(WHITE, 0.3);

  let accent = brand.accent;
  for (let step = 0; step < 40 && (contrastRatio(accent, canvas) ?? 0) < 4.6; step += 1) accent = shiftLightness(accent, 0.02);
  tokens.accent = accent;
  tokens["accent-text"] = labelFor(accent, canvas);
  tokens["accent-hover"] = ensureContrast(shiftLightness(accent, 0.06), [tokens["accent-text"]], 4.5, tokens["accent-text"] === WHITE ? BLACK : WHITE);
  tokens["accent-subtle"] = mix(accent, canvas, 0.82);
  tokens.focus = accent;
  tokens["focus-ring"] = withAlpha(accent, 0.32);
  tokens["decorative-highlight"] = accent;
  tokens["agent-working"] = accent;

  for (const role of ["status-success", "status-warning", "status-info", "danger"]) {
    if (base[role] !== undefined) tokens[role] = ensureContrast(base[role], [canvas, tokens.surface], 4.5, WHITE);
  }
  if (base["status-warning-text"] !== undefined) {
    tokens["status-warning-text"] = ensureContrast(base["status-warning-text"], [canvas, tokens.surface, base["status-warning-subtle"] ?? tokens.surface], 4.5, WHITE);
  }

  tokens["inverse-canvas"] = mix(canvas, BLACK, 0.5);
  tokens["inverse-surface"] = tokens.surface;
  tokens["inverse-surface-muted"] = tokens["surface-interactive"];
  tokens["inverse-text"] = tokens.text;
  tokens["inverse-text-muted"] = tokens["text-muted"];
  tokens["inverse-border"] = withAlpha(WHITE, 0.14);
  tokens["overlay-backdrop"] = withAlpha(BLACK, 0.66);
  tokens["overlay-hover"] = withAlpha(WHITE, 0.06);
  tokens["overlay-pressed"] = withAlpha(WHITE, 0.12);

  // The depth button keeps its light-mode colours on dark pages; only the glow underneath grows.
  for (const key of ["action-depth-from", "action-depth-to", "action-depth-glow", "action-depth-sheen", "action-depth-edge", "action-depth-rim", "action-depth-text", "shadow-action-depth-hover"]) {
    tokens[key] = light[key];
  }
  tokens["shadow-action-depth"] = depthShadow(BLACK, light["action-depth-from"], 0.6);
  tokens["action-ink"] = paper;
  tokens["action-ink-hover"] = WHITE;
  tokens["action-ink-text"] = best([ink, canvas], paper);
  return tokens;
}

function deriveDepth(accent, accentText, ink, glowAlpha) {
  const textIsLight = accentText === WHITE;
  // Lighter top, deeper bottom, same hue. The top may only lighten while the label keeps AA.
  let from = accent;
  for (let step = 1; step <= 5; step += 1) {
    const candidate = shiftLightness(accent, textIsLight ? 0.01 * step : 0.012 * step);
    if ((contrastRatio(accentText, candidate) ?? 0) >= 4.8) from = candidate;
  }
  const to = ensureContrast(shiftLightness(accent, textIsLight ? -0.06 : -0.03), [accentText], 4.8, textIsLight ? BLACK : WHITE);
  const glowBase = shiftLightness(accent, 0.16);
  return {
    "action-depth-from": from,
    "action-depth-to": to,
    "action-depth-glow": withAlpha(glowBase, textIsLight ? 0.45 : 0.35),
    "action-depth-sheen": withAlpha(WHITE, textIsLight ? 0.1 : 0.22),
    "action-depth-edge": withAlpha(WHITE, 0.19),
    "action-depth-rim": `inset 0 1.5px 0 ${withAlpha(WHITE, textIsLight ? 0.3 : 0.55)}`,
    "action-depth-text": accentText,
    "shadow-action-depth": depthShadow(mix(to, ink, 0.6), from, glowAlpha),
    "shadow-action-depth-hover": depthShadow(mix(to, ink, 0.6), from, 0.68),
  };
}

/**
 * Returns { light, dark } complete token maps for a brand, given the resolved default modes.
 * Order: default mode values, then derived brand values, then the brand's explicit overrides.
 */
export function deriveBrandModes(input, baseModes) {
  const brand = normaliseBrandInput(input);
  const known = new Set(Object.keys(baseModes.light));
  for (const [mode, overrides] of Object.entries(brand.overrides)) {
    for (const key of Object.keys(overrides)) {
      if (!known.has(key)) throw new Error(`Brand ${brand.name}: overrides.${mode}.${key} is not a semantic token.`);
    }
  }
  const shared = {
    "font-sans": brand.fonts.body,
    "font-body": brand.fonts.body,
    "font-display": brand.fonts.display,
    "action-appearance": brand.appearance,
  };
  const lightDerived = deriveLight(brand, baseModes.light);
  const both = brand.overrides.shared ?? {};
  const light = { ...baseModes.light, ...lightDerived, ...shared, ...both, ...(brand.overrides.light ?? {}) };
  const darkDerived = deriveDark(brand, light, baseModes.dark);
  const dark = { ...baseModes.dark, ...darkDerived, ...shared, ...both, ...(brand.overrides.dark ?? {}) };
  return { brand, modes: { light: sortKeys(light), dark: sortKeys(dark) } };
}

function sortKeys(input) {
  return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)));
}

/** Reads every brands/<name>.json (sorted). Returns [] when the folder does not exist. */
export async function loadBrandFiles(directory) {
  const [{ default: fs }, { default: path }] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  let entries;
  try {
    entries = await fs.readdir(directory);
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const brands = [];
  for (const entry of entries.filter((name) => name.endsWith(".json")).sort()) {
    const filePath = path.join(directory, entry);
    let parsed;
    try {
      parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      throw new Error(`Cannot parse ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const expected = entry.slice(0, -".json".length);
    if (parsed.name !== expected) throw new Error(`${filePath}: name "${parsed.name}" must match the file name "${expected}".`);
    delete parsed.$schema;
    delete parsed.$comment;
    brands.push(parsed);
  }
  return brands;
}

/** Hard-coded colour literals inside a gradient value (used by ui-lint and the compiler tests). */
export function gradientLiterals(value) {
  return colourLiterals(value).filter((literal) => literal.toLowerCase() !== "transparent");
}
