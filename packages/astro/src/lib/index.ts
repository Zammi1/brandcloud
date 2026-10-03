import type { CtaLink, OfferLevel, ProofItem, UrgencyCopy } from "../copy-types.js";

/* ── Buttons ────────────────────────────────────────────────────────────────
 * Same prop names and values as the React @brandcloud/ui Button (same names and values):
 *   tone        colour role   brand | ink | neutral | danger | whatsapp | level
 *   appearance  treatment     depth | solid | outline | ghost   (unset = the brand's default)
 *   level       sky | blue | navy | pearl | obsidian            (only with tone="level")
 *   size        sm | md | lg
 * `variant` is a shadcn-compat alias only. */

export const BUTTON_TONES = ["brand", "ink", "neutral", "danger", "whatsapp", "level"] as const;
export const BUTTON_APPEARANCES = ["depth", "solid", "outline", "ghost"] as const;
export const BUTTON_SIZES = ["sm", "md", "lg"] as const;
export const OFFER_LEVELS = ["sky", "blue", "navy", "pearl", "obsidian"] as const;

export type ButtonTone = (typeof BUTTON_TONES)[number];
export type ButtonAppearance = (typeof BUTTON_APPEARANCES)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];
/** shadcn/ui variant names plus the treatment names, accepted as an alias. */
export type ButtonVariantAlias = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | ButtonAppearance;

export interface ButtonStyleInput {
  tone?: ButtonTone;
  appearance?: ButtonAppearance;
  level?: OfferLevel;
  size?: ButtonSize;
  variant?: ButtonVariantAlias;
}

export interface ResolvedButtonStyle {
  tone: ButtonTone;
  /** undefined = no data-appearance attribute, so the brand's default treatment applies. */
  appearance: ButtonAppearance | undefined;
  level: OfferLevel | undefined;
  size: ButtonSize;
}

const VARIANT_ALIAS: Record<ButtonVariantAlias, { tone?: ButtonTone; appearance?: ButtonAppearance }> = {
  default: { tone: "brand" },
  destructive: { tone: "danger" },
  outline: { appearance: "outline" },
  secondary: { tone: "neutral" },
  ghost: { appearance: "ghost" },
  link: { appearance: "ghost" },
  depth: { appearance: "depth" },
  solid: { appearance: "solid" },
};

/** Explicit tone/appearance always win over the `variant` alias. */
export function resolveButtonStyle(input: ButtonStyleInput = {}): ResolvedButtonStyle {
  const alias = input.variant ? VARIANT_ALIAS[input.variant] : undefined;
  if (input.variant && !alias) throw new Error(`Button: unknown variant "${input.variant}"`);
  const tone = input.tone ?? alias?.tone ?? "brand";
  const appearance = input.appearance ?? alias?.appearance;
  if (!BUTTON_TONES.includes(tone)) throw new Error(`Button: unknown tone "${tone}"`);
  if (appearance && !BUTTON_APPEARANCES.includes(appearance)) throw new Error(`Button: unknown appearance "${appearance}"`);
  const size = input.size ?? "md";
  if (!BUTTON_SIZES.includes(size)) throw new Error(`Button: unknown size "${size}"`);
  let level: OfferLevel | undefined;
  if (tone === "level") {
    level = input.level ?? "blue";
    if (!OFFER_LEVELS.includes(level)) throw new Error(`Button: unknown level "${level}"`);
  }
  return { tone, appearance, level, size };
}

/* ── Links ──────────────────────────────────────────────────────────────── */

export function linkAttrs(link: Pick<CtaLink, "href" | "external">): Record<string, string> {
  return link.external ? { href: link.href, target: "_blank", rel: "noopener" } : { href: link.href };
}

/** wa.me link from a UK or international number. "07700 900123" becomes 447700900123. */
export function whatsappHref(phone: string, message?: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `44${digits.slice(1)}`;
  if (!/^\d{8,15}$/.test(digits)) throw new Error(`whatsappHref: "${phone}" is not a phone number`);
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

/* ── Copy helpers ───────────────────────────────────────────────────────── */

/** en-GB long date, e.g. "31 October 2026". Accepts an ISO date (YYYY-MM-DD). */
export function formatDateGB(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`formatDateGB: "${iso}" is not an ISO date`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * Splits caller-supplied price wording into a large figure and a small note (DESIGN-REVIEW T6).
 * "From £1200, paid in two parts" becomes { figure: "From £1,200", note: "Paid in two parts" }.
 * The amount is never changed, only grouped for display.
 */
export function splitPrice(text: string): { figure: string | null; note: string | null } {
  const m = text.match(/^\s*((?:from|typically)\s+)?(£\s?\d{1,3}(?:,\d{3})+(?:\.\d{2})?|£\s?\d+(?:\.\d{2})?)((?:\s*(?:to|-)\s*£?\s?\d+(?:,\d{3})*(?:\.\d{2})?)?)(\s*(?:\/|per|a|an)\s*(?:hour|session|lesson|day|week|month|mo|term|course|person|class|year))?/i);
  if (!m) return { figure: null, note: text.trim() || null };
  const group = (x: string) => x.replace(/\s+/g, "").replace(/£(\d{4,})(?=\b|\.)/, (_, d: string) => `£${Number(d).toLocaleString("en-GB")}`);
  const lead = m[1] ? `${m[1].trim()[0].toUpperCase()}${m[1].trim().slice(1)} ` : "";
  const range = m[3] ? ` to ${group(m[3].replace(/^\s*(?:to|-)\s*/, "").replace(/^(\d)/, "£$1"))}` : "";
  const cadence = m[4] ? ` ${m[4].trim().replace(/^\/\s*/, "a ")}` : "";
  const figure = `${lead}${group(m[2])}${range}${cadence}`.trim();
  let rest = text.slice(m[0].length).replace(/^[\s,;:.]+/, "").trim();
  if (rest) rest = rest[0].toUpperCase() + rest.slice(1);
  return { figure, note: rest || null };
}

/** Joins short phrases as sentences: ["Fixed", "Paid 50/50."] becomes "Fixed. Paid 50/50." */
export function joinSentences(parts: readonly string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).map((p, i, all) => (i < all.length - 1 && !/[.!?:]$/.test(p) ? `${p}.` : p)).join(" ");
}

/** Proof that may be shown: has a source and consent was not refused. */
export function publishableProof(items: readonly ProofItem[]): ProofItem[] {
  return items.filter((item) => item.consent !== false && typeof item.source === "string" && item.source.trim().length > 0 && item.quote.trim().length > 0);
}

/** Urgency is shown only with a real reason and an end date or policy. */
export function validUrgency(urgency: UrgencyCopy | undefined | null): urgency is UrgencyCopy {
  if (!urgency) return false;
  if (!urgency.reason?.trim() || !urgency.message?.trim()) return false;
  if (urgency.endsOn) {
    try {
      formatDateGB(urgency.endsOn);
    } catch {
      return false;
    }
    return true;
  }
  return Boolean(urgency.policyHref);
}

/** Stable, readable id fragment for aria wiring. */
export function slug(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 48) || "item";
}

/** Characters that never appear in rendered default text (no em or en dashes). */
export const FORBIDDEN_DASHES = /[\u2013\u2014]/;
