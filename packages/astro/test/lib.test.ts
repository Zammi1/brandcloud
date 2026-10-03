import { describe, expect, it } from "vitest";
import { formatDateGB, publishableProof, resolveButtonStyle, slug, splitPrice, validUrgency, whatsappHref } from "../src/lib/index.js";

describe("resolveButtonStyle", () => {
  it("defaults to tone brand, size md and no appearance (the brand decides)", () => {
    expect(resolveButtonStyle()).toEqual({ tone: "brand", appearance: undefined, level: undefined, size: "md" });
  });
  it("maps shadcn variants onto tone and appearance", () => {
    expect(resolveButtonStyle({ variant: "destructive" })).toMatchObject({ tone: "danger" });
    expect(resolveButtonStyle({ variant: "secondary" })).toMatchObject({ tone: "neutral" });
    expect(resolveButtonStyle({ variant: "outline" })).toMatchObject({ tone: "brand", appearance: "outline" });
    expect(resolveButtonStyle({ variant: "link" })).toMatchObject({ appearance: "ghost" });
    expect(resolveButtonStyle({ variant: "depth" })).toMatchObject({ appearance: "depth" });
  });
  it("lets explicit tone and appearance win over the variant alias", () => {
    expect(resolveButtonStyle({ variant: "destructive", tone: "ink", appearance: "solid" })).toMatchObject({ tone: "ink", appearance: "solid" });
  });
  it("only keeps a level with tone level, defaulting to blue", () => {
    expect(resolveButtonStyle({ level: "navy" }).level).toBeUndefined();
    expect(resolveButtonStyle({ tone: "level" }).level).toBe("blue");
    expect(resolveButtonStyle({ tone: "level", level: "pearl" }).level).toBe("pearl");
  });
  it("rejects unknown values", () => {
    // @ts-expect-error testing a runtime guard
    expect(() => resolveButtonStyle({ tone: "primary" })).toThrow(/unknown tone/);
    // @ts-expect-error testing a runtime guard
    expect(() => resolveButtonStyle({ size: "xl" })).toThrow(/unknown size/);
    // @ts-expect-error testing a runtime guard
    expect(() => resolveButtonStyle({ tone: "level", level: "gold" })).toThrow(/unknown level/);
  });
});

describe("whatsappHref", () => {
  it("turns UK numbers into wa.me international form", () => {
    expect(whatsappHref("07700 900123")).toBe("https://wa.me/447700900123");
    expect(whatsappHref("+44 7700 900123", "Hi, is Saturday free?")).toBe("https://wa.me/447700900123?text=Hi%2C%20is%20Saturday%20free%3F");
    expect(whatsappHref("0044 7700 900123")).toBe("https://wa.me/447700900123");
  });
  it("refuses things that are not phone numbers", () => {
    expect(() => whatsappHref("call us")).toThrow();
  });
});

describe("splitPrice", () => {
  it("splits the figure from the note and groups four-figure amounts", () => {
    expect(splitPrice("From £1200, paid in two parts")).toEqual({ figure: "From £1,200", note: "Paid in two parts" });
    expect(splitPrice("£200")).toEqual({ figure: "£200", note: null });
    expect(splitPrice("£250 a month, cancel any time")).toEqual({ figure: "£250 a month", note: "Cancel any time" });
    expect(splitPrice("£40 to £60 per session")).toEqual({ figure: "£40 to £60 per session", note: null });
  });
  it("keeps decimals intact (no '4. 9' style breakage)", () => {
    expect(splitPrice("£3.50 per class").figure).toBe("£3.50 per class");
  });
  it("returns wording without a price as a note", () => {
    expect(splitPrice("Ask for a quote")).toEqual({ figure: null, note: "Ask for a quote" });
  });
});

describe("copy guards", () => {
  it("formats en-GB dates", () => {
    expect(formatDateGB("2026-10-31")).toBe("31 October 2026");
    expect(() => formatDateGB("31/10/2026")).toThrow();
  });
  it("only accepts urgency with a reason and an end date or policy", () => {
    expect(validUrgency({ message: "Two places left", reason: "We take four builds a month.", endsOn: "2026-10-31" })).toBe(true);
    expect(validUrgency({ message: "Two places left", reason: "We take four builds a month.", policyHref: "/terms" })).toBe(true);
    expect(validUrgency({ message: "Hurry", reason: "" , endsOn: "2026-10-31" })).toBe(false);
    expect(validUrgency({ message: "Hurry", reason: "Because" })).toBe(false);
    expect(validUrgency({ message: "Hurry", reason: "Because", endsOn: "soon" })).toBe(false);
  });
  it("drops proof without a source or with consent refused", () => {
    const kept = publishableProof([
      { quote: "Kept.", source: "Google review" },
      { quote: "No source.", source: " " },
      { quote: "Refused.", source: "Email", consent: false },
    ]);
    expect(kept.map((p) => p.quote)).toEqual(["Kept."]);
  });
  it("makes readable slugs", () => {
    expect(slug("Common questions?")).toBe("common-questions");
  });
});
