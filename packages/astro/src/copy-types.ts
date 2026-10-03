/**
 * Typed content slots for @brandcloud/astro components: plain TypeScript interfaces, no runtime.
 *
 * These are the extension point between the free components and anything layered on top: a page passes
 * plain strings, and an add-on may validate the same objects with its own schemas before they render.
 *
 * Rules the components rely on (they never invent content):
 * - Every label, heading and sentence comes from these objects or from props. No component
 *   has business-specific default text.
 * - Prices are strings supplied by the caller. Components never compute or hard-code a price.
 * - Urgency must carry a real reason and a policy or end date.
 * - Proof must carry its evidence source, and testimonials need consent.
 */

/** A link-shaped action. Buttons render as <a> when they have an href. */
export interface CtaLink {
  label: string;
  href: string;
  /** Opens in a new tab with rel="noopener". */
  external?: boolean;
  /** Short label for tight places (sticky bar, header). Falls back to `label`. */
  short?: string;
  /** Optional channel glyph. Only channel glyphs are allowed inside buttons, never arrows. */
  channel?: "whatsapp" | "phone" | "email";
}

export interface HeroCopy {
  heading: string;
  lede?: string;
  primary: CtaLink;
  secondary?: CtaLink;
  /** A small line under the actions, e.g. what happens next. */
  note?: string;
}

/** Offer level colours (tokens `level-<name>-*`). */
export type OfferLevel = "sky" | "blue" | "navy" | "pearl" | "obsidian";

/** Mark shape: the column/category of an offer is carried by shape, the rank by colour. */
export type OfferShape = "grid" | "plain" | "ring";

export interface OfferCopy {
  id: string;
  name: string;
  /** One line on what the buyer gets or becomes. */
  outcome?: string;
  description?: string;
  /** Caller-supplied price wording, e.g. "From £3,500". Never computed by a component. */
  price?: string;
  /** Small note under the price figure (cadence, credit terms). */
  priceNote?: string;
  includes?: string[];
  level?: OfferLevel;
  /** Level name printed next to the colour, so colour is never the only cue (WCAG 1.4.1). */
  levelLabel?: string;
  shape?: OfferShape;
  /** OfferLadder placement. */
  column?: string;
  row?: string;
  cta?: CtaLink;
  /** e.g. "Most chosen". Only when it is true. */
  highlight?: string;
}

export interface PricingTierCopy extends OfferCopy {
  tagline?: string;
  /** Short heading over `includes`, e.g. "Everything in Starter, plus". */
  includesIntro?: string;
  fine?: string;
}

export interface CtaCopy {
  heading: string;
  body?: string;
  primary: CtaLink;
  secondary?: CtaLink;
  note?: string;
}

export interface FaqItem {
  id?: string;
  question: string;
  /** Plain text. Use `answerHtml` only for trusted, author-written HTML (links). */
  answer?: string;
  answerHtml?: string;
  /** The objection this answers (price, time, trust, fit...). Not rendered. */
  objection?: string;
}

export interface ImageRef {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcset?: string;
  sizes?: string;
}

export interface ProofItem {
  id?: string;
  quote: string;
  name?: string;
  role?: string;
  organisation?: string;
  /** Where the quote comes from (review site, email, call notes). Required: no unsourced proof. */
  source: string;
  sourceHref?: string;
  /** Written consent to publish was given. Components skip items where this is false. */
  consent?: boolean;
  image?: ImageRef;
  /** One concrete, verifiable result, e.g. "12 enquiries in the first month". */
  result?: string;
}

export interface GuaranteeCopy {
  name: string;
  promise: string;
  /** The conditions, in plain words. A guarantee is shown only as a real, honoured policy. */
  conditions?: string[];
  policyHref?: string;
  policyLabel?: string;
}

export interface UrgencyCopy {
  message: string;
  /** The real reason (capacity, a dated price change, a cohort start). Required. */
  reason: string;
  /** ISO date (YYYY-MM-DD). Shown as an en-GB date. Either this or `policyHref` is required. */
  endsOn?: string;
  policyHref?: string;
}

export interface StepItem {
  id?: string;
  title: string;
  text?: string;
  /** Optional time or deliverable, e.g. "Day 1" or "You get: a written plan". */
  meta?: string;
}

export interface StepsCopy {
  heading?: string;
  intro?: string;
  steps: StepItem[];
}

export interface TrustItem {
  id?: string;
  text: string;
  /** Optional logo. The text stays visible next to it (names, not only marks). */
  logo?: ImageRef;
  href?: string;
}

export interface NavLink {
  label: string;
  href: string;
  current?: boolean;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}
