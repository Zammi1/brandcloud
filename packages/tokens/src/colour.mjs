// Colour maths shared by the token compiler, the brand generator and ui-lint.
// Pure functions, no dependencies. sRGB in, sRGB out; OKLCH for perceptual steps;
// WCAG 2.x relative luminance for contrast.

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const namedColours = {
  white: [255, 255, 255, 1],
  black: [0, 0, 0, 1],
  transparent: [0, 0, 0, 0],
  red: [255, 0, 0, 1],
  orange: [255, 165, 0, 1],
  yellow: [255, 255, 0, 1],
  gold: [255, 215, 0, 1],
  lime: [0, 255, 0, 1],
  green: [0, 128, 0, 1],
  teal: [0, 128, 128, 1],
  aqua: [0, 255, 255, 1],
  cyan: [0, 255, 255, 1],
  blue: [0, 0, 255, 1],
  navy: [0, 0, 128, 1],
  indigo: [75, 0, 130, 1],
  violet: [238, 130, 238, 1],
  purple: [128, 0, 128, 1],
  fuchsia: [255, 0, 255, 1],
  magenta: [255, 0, 255, 1],
  pink: [255, 192, 203, 1],
  hotpink: [255, 105, 180, 1],
  deeppink: [255, 20, 147, 1],
};
const namedPattern = Object.keys(namedColours).sort((a, b) => b.length - a.length).join("|");

function parseCssNumber(raw, percentScale = 1) {
  const value = String(raw).trim();
  if (value === "none") return 0;
  if (value.endsWith("%")) {
    const parsed = Number.parseFloat(value.slice(0, -1));
    return Number.isFinite(parsed) ? (parsed / 100) * percentScale : undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitArguments(inner) {
  // Accept both "r, g, b, a" and "r g b / a".
  const [main, alpha] = inner.includes("/") ? inner.split("/") : [inner, undefined];
  const parts = main.split(/[\s,]+/).filter(Boolean);
  if (alpha === undefined && parts.length === 4) return { parts: parts.slice(0, 3), alpha: parts[3] };
  return { parts, alpha: alpha?.trim() };
}

function linearToSrgb(value) {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function oklabToLinearRgb(lightness, a, b) {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function hslToRgb(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = (((hue % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r, g, b] =
    segment < 1 ? [chroma, second, 0]
      : segment < 2 ? [second, chroma, 0]
        : segment < 3 ? [0, chroma, second]
          : segment < 4 ? [0, second, chroma]
            : segment < 5 ? [second, 0, chroma]
              : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  return [r + offset, g + offset, b + offset];
}

/**
 * Parses a CSS colour (hex, rgb(), rgba(), hsl(), hsla(), oklch(), white, black, transparent).
 * Returns { r, g, b, alpha } with channels 0..255 or undefined when the value is not a plain colour.
 */
export function parseColour(raw) {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().toLowerCase();
  if (namedColours[value]) {
    const [r, g, b, alpha] = namedColours[value];
    return { r, g, b, alpha };
  }
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length <= 4) digits = [...digits].map((char) => char + char).join("");
    return {
      r: Number.parseInt(digits.slice(0, 2), 16),
      g: Number.parseInt(digits.slice(2, 4), 16),
      b: Number.parseInt(digits.slice(4, 6), 16),
      alpha: digits.length === 8 ? Number.parseInt(digits.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = /^(rgba?|hsla?|oklch)\(\s*([^()]*)\)$/.exec(value);
  if (!fn) return undefined;
  const { parts, alpha: alphaRaw } = splitArguments(fn[2]);
  if (parts.length !== 3) return undefined;
  const alpha = alphaRaw === undefined ? 1 : parseCssNumber(alphaRaw, 1);
  if (alpha === undefined) return undefined;
  if (fn[1].startsWith("rgb")) {
    const channels = parts.map((part) => parseCssNumber(part, 255));
    if (channels.some((channel) => channel === undefined)) return undefined;
    return { r: channels[0], g: channels[1], b: channels[2], alpha: clamp01(alpha) };
  }
  if (fn[1].startsWith("hsl")) {
    const hue = Number.parseFloat(parts[0]);
    const saturation = parseCssNumber(parts[1].endsWith("%") ? parts[1] : `${parts[1]}%`, 1);
    const lightness = parseCssNumber(parts[2].endsWith("%") ? parts[2] : `${parts[2]}%`, 1);
    if (!Number.isFinite(hue) || saturation === undefined || lightness === undefined) return undefined;
    const [r, g, b] = hslToRgb(hue, clamp01(saturation), clamp01(lightness));
    return { r: r * 255, g: g * 255, b: b * 255, alpha: clamp01(alpha) };
  }
  const lightness = parseCssNumber(parts[0], 1);
  const chroma = parseCssNumber(parts[1], 0.4);
  const hue = Number.parseFloat(parts[2]);
  if (lightness === undefined || chroma === undefined || !Number.isFinite(hue)) return undefined;
  const radians = (hue * Math.PI) / 180;
  const linear = oklabToLinearRgb(lightness, chroma * Math.cos(radians), chroma * Math.sin(radians));
  const [r, g, b] = linear.map((channel) => clamp01(linearToSrgb(channel)) * 255);
  return { r, g, b, alpha: clamp01(alpha) };
}

export function isColour(raw) {
  return parseColour(raw) !== undefined;
}

export function toHex(colour) {
  const channel = (value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, "0");
  const base = `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`;
  return colour.alpha !== undefined && colour.alpha < 1 ? `${base}${channel(colour.alpha * 255)}` : base;
}

/** "rgb(r g b / a)" with the given alpha, from any parseable colour. */
export function withAlpha(raw, alpha) {
  const colour = typeof raw === "string" ? parseColour(raw) : raw;
  if (!colour) throw new Error(`Not a colour: ${raw}`);
  return `rgb(${Math.round(colour.r)} ${Math.round(colour.g)} ${Math.round(colour.b)} / ${alpha})`;
}

/** Composites a translucent colour over an opaque backdrop. */
export function composite(foreground, backdrop) {
  const top = typeof foreground === "string" ? parseColour(foreground) : foreground;
  const bottom = typeof backdrop === "string" ? parseColour(backdrop) : backdrop;
  if (!top || !bottom) return undefined;
  const alpha = top.alpha ?? 1;
  return {
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
    alpha: 1,
  };
}

export function relativeLuminance(raw) {
  const colour = typeof raw === "string" ? parseColour(raw) : raw;
  if (!colour) return undefined;
  const [r, g, b] = [colour.r, colour.g, colour.b].map((channel) => srgbToLinear(channel / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2.x contrast ratio. A translucent foreground is composited over the background first;
 * a translucent background is composited over `backdrop` (white unless given).
 */
export function contrastRatio(foreground, background, backdrop = "#ffffff") {
  const bgParsed = typeof background === "string" ? parseColour(background) : background;
  const fgParsed = typeof foreground === "string" ? parseColour(foreground) : foreground;
  if (!bgParsed || !fgParsed) return undefined;
  if (bgParsed.alpha === 0 || fgParsed.alpha === 0) return undefined;
  const bg = bgParsed.alpha < 1 ? composite(bgParsed, backdrop) : bgParsed;
  const fg = fgParsed.alpha < 1 ? composite(fgParsed, bg) : fgParsed;
  const first = relativeLuminance(fg);
  const second = relativeLuminance(bg);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function toOklch(raw) {
  const colour = typeof raw === "string" ? parseColour(raw) : raw;
  if (!colour) return undefined;
  const [r, g, b] = [colour.r, colour.g, colour.b].map((channel) => srgbToLinear(channel / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.sqrt(a * a + bb * bb);
  const hue = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: lightness, c: chroma, h: hue, alpha: colour.alpha };
}

function inGamut(linear) {
  return linear.every((channel) => channel >= -1e-4 && channel <= 1 + 1e-4);
}

/** OKLCH to an sRGB hex, reducing chroma until the colour fits the sRGB gamut. */
export function fromOklch({ l, c, h }) {
  let chroma = c;
  const radians = (h * Math.PI) / 180;
  let linear = oklabToLinearRgb(l, chroma * Math.cos(radians), chroma * Math.sin(radians));
  while (!inGamut(linear) && chroma > 0) {
    chroma = Math.max(0, chroma - 0.002);
    linear = oklabToLinearRgb(l, chroma * Math.cos(radians), chroma * Math.sin(radians));
  }
  const [r, g, b] = linear.map((channel) => clamp01(linearToSrgb(clamp01(channel))) * 255);
  return toHex({ r, g, b, alpha: 1 });
}

/** Shifts OKLCH lightness by `delta`, keeping hue and chroma (gamut-mapped). */
export function shiftLightness(raw, delta) {
  const colour = toOklch(raw);
  return fromOklch({ ...colour, l: clamp01(colour.l + delta) });
}

/** Linear sRGB-space mix: amount 0 = a, 1 = b. Returns an opaque hex. */
export function mix(a, b, amount) {
  const first = parseColour(a);
  const second = parseColour(b);
  if (!first || !second) throw new Error(`Cannot mix ${a} and ${b}`);
  return toHex({
    r: first.r + (second.r - first.r) * amount,
    g: first.g + (second.g - first.g) * amount,
    b: first.b + (second.b - first.b) * amount,
    alpha: 1,
  });
}

/** HSL hue (degrees) and saturation (0..1) of a colour; hue is undefined for greys. */
export function hslHue(raw) {
  const colour = typeof raw === "string" ? parseColour(raw) : raw;
  if (!colour) return undefined;
  const r = colour.r / 255;
  const g = colour.g / 255;
  const b = colour.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (delta === 0) return { hue: undefined, saturation: 0, lightness };
  let hue;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  return { hue: (hue + 360) % 360, saturation, lightness };
}

/**
 * The smallest arc of the hue wheel (degrees) that holds every chromatic stop.
 * Greys, near-greys (saturation under 0.12), near-black, near-white and fully transparent stops
 * have no meaningful hue and are ignored, so "blue to transparent" or "white sheen" spans 0.
 */
export function hueSpan(colours) {
  const hues = [];
  for (const raw of colours) {
    const colour = typeof raw === "string" ? parseColour(raw) : raw;
    if (!colour || colour.alpha === 0) continue;
    const { hue, saturation, lightness } = hslHue(colour);
    if (hue === undefined || saturation < 0.12 || lightness < 0.06 || lightness > 0.97) continue;
    hues.push(hue);
  }
  if (hues.length < 2) return 0;
  hues.sort((first, second) => first - second);
  let largestGap = 360 - hues[hues.length - 1] + hues[0];
  for (let index = 1; index < hues.length; index += 1) largestGap = Math.max(largestGap, hues[index] - hues[index - 1]);
  return 360 - largestGap;
}

/** Every colour literal inside a CSS value (e.g. a gradient). */
export function colourLiterals(cssValue) {
  const found = [];
  const pattern = new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?|oklch)\\([^()]*\\)|(?<![-\\w])(?:${namedPattern})(?![-\\w])`, "gi");
  for (const match of String(cssValue).matchAll(pattern)) {
    if (parseColour(match[0])) found.push(match[0]);
  }
  return found;
}
