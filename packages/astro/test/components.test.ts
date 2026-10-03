import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import Button from "../src/components/Button.astro";
import Container from "../src/components/Container.astro";
import CtaBand from "../src/components/CtaBand.astro";
import EnquiryFormShell from "../src/components/EnquiryFormShell.astro";
import Faq from "../src/components/Faq.astro";
import Footer from "../src/components/Footer.astro";
import Heading from "../src/components/Heading.astro";
import Hero from "../src/components/Hero.astro";
import Navbar from "../src/components/Navbar.astro";
import Section from "../src/components/Section.astro";
import Steps from "../src/components/Steps.astro";
import TrustStrip from "../src/components/TrustStrip.astro";
import * as data from "./data.js";

let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});
// Dev-mode renders carry source annotations; strip them so assertions read like production HTML.
const render = async (component: Parameters<AstroContainer["renderToString"]>[0], props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
  (await container.renderToString(component, { props, slots })).replace(/ data-astro-source-(?:file|loc)="[^"]*"/g, "");
const parse = (html: string) => {
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  return { html, count };
};

describe("Button", () => {
  it("renders a link when href is given and a type=button button otherwise", async () => {
    const link = await render(Button, { href: "/start" }, { default: "Start" });
    expect(link).toMatch(/^<a[^>]+href="\/start"/);
    expect(link).toContain('data-tone="brand"');
    expect(link).not.toContain("data-appearance");
    const button = await render(Button, {}, { default: "Save" });
    expect(button).toMatch(/^<button[^>]+type="button"/);
  });
  it("uses the React prop names: tone, appearance, level, size", async () => {
    const html = await render(Button, { tone: "level", level: "navy", appearance: "depth", size: "lg" }, { default: "Go" });
    expect(html).toContain('data-tone="level"');
    expect(html).toContain('data-level="navy"');
    expect(html).toContain('data-appearance="depth"');
    expect(html).toContain('data-size="lg"');
  });
  it("maps the shadcn variant alias", async () => {
    const html = await render(Button, { variant: "destructive" }, { default: "Delete" });
    expect(html).toContain('data-tone="danger"');
  });
  it("marks loading buttons busy and disabled, and never turns a disabled link into a button", async () => {
    const busy = await render(Button, { loading: true }, { default: "Saving" });
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toMatch(/<button[^>]*disabled/);
    const link = await render(Button, { href: "/x", disabled: true }, { default: "Soon" });
    expect(link).toMatch(/^<a/);
    expect(link).not.toContain("href=");
    expect(link).toContain('aria-disabled="true"');
  });
  it("opens external links safely and says so", async () => {
    const html = await render(Button, { href: "https://example.com", external: true }, { default: "Visit" });
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain("(opens in a new tab)");
  });
  it("allows a channel glyph but never an arrow", async () => {
    const html = await render(Button, { href: "/x", channel: "whatsapp" }, { default: "WhatsApp" });
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/→|&rarr;|M5 12h14M13 6l6 6-6 6/);
  });
});

describe("layout primitives", () => {
  it("Section maps tone to a surface and accepts the blocks appearance alias", async () => {
    expect(await render(Section, { tone: "ink" }, { default: "x" })).toContain('data-surface="ink"');
    expect(await render(Section, { appearance: "inverse" }, { default: "x" })).toContain('data-surface="ink"');
    expect(await render(Section, {}, { default: "x" })).toContain('data-surface="default"');
  });
  it("Container and Heading render with the ba scope class", async () => {
    expect(await render(Container, { width: "narrow" }, { default: "x" })).toMatch(/class="ba ba-container"[^>]*data-width="narrow"|data-width="narrow"[^>]*class="ba ba-container"/);
    const h = await render(Heading, { as: "h3", size: "display" }, { default: "Title" });
    expect(h).toMatch(/^<h3[^>]+data-size="display"/);
  });
});

describe("Hero", () => {
  it("falls back from split to editorial without media and never renders an eyebrow", async () => {
    const html = await render(Hero, { copy: data.hero });
    expect(html).toContain('data-variant="editorial"');
    expect(html).toMatch(/<h1[^>]*>Physio in Ashby Vale/);
    expect(html).not.toMatch(/eyebrow|kicker/i);
  });
  it("renders the split photo and the field facts column", async () => {
    const split = await render(Hero, { copy: data.hero, variant: "split", media: { src: "/a.jpg", alt: "Treatment room", width: 800, height: 1000 } });
    expect(split).toContain('alt="Treatment room"');
    expect(split).toContain("data-portrait");
    const field = await render(Hero, { copy: data.hero, variant: "field", facts: [{ label: "Where", value: "Ashby Vale" }, { label: "When", value: "Mon to Sat" }] });
    expect(field).toContain('data-surface="ink"');
    expect(field).toMatch(/<dt>Where<\/dt>/);
  });
  it("puts the secondary action on ink over light surfaces, neutral over dark ones, whatsapp for WhatsApp", async () => {
    const copy = { ...data.hero, secondary: { label: "See prices", href: "#prices" } };
    expect(await render(Hero, { copy, variant: "editorial" })).toContain('data-tone="ink"');
    expect(await render(Hero, { copy, variant: "field" })).toContain('data-tone="neutral"');
    expect(await render(Hero, { copy: data.hero, variant: "field" })).toContain('data-tone="whatsapp"');
  });
});


describe("content blocks", () => {
  it("Steps is a real ordered list in every variant", async () => {
    for (const variant of ["rail", "list", "split"]) {
      const html = await render(Steps, { steps: data.steps, variant, heading: "How it works" });
      expect(html).toContain("<ol");
      expect(parse(html).count(/<li class="ba-steps__item"/g)).toBe(3);
    }
  });
  it("TrustStrip renders a labelled list", async () => {
    const html = await render(TrustStrip, { items: data.trust, label: "Qualifications" });
    expect(html).toContain('aria-label="Qualifications"');
    expect(parse(html).count(/<li /g)).toBe(3);
  });
  it("Faq uses native details and summary", async () => {
    const html = await render(Faq, { items: data.faqs, heading: "Questions", openFirst: true, ask: { heading: "Still unsure?", action: { label: "Ask us", href: "#ask" } } });
    expect(parse(html).count(/<details/g)).toBe(2);
    expect(parse(html).count(/<summary/g)).toBe(2);
    expect(html).toMatch(/<details[^>]*open/);
    expect(html).toContain('<a href="#prices">prices</a>');
  });
});

describe("conversion blocks", () => {
  it("CtaBand shows honest urgency with an en-GB date and hides urgency without a reason", async () => {
    const ok = await render(CtaBand, { copy: data.cta, urgency: data.urgency });
    expect(ok).toContain("31 October 2026");
    expect(ok).toContain('datetime="2026-10-31"');
    expect(ok).toContain("data-sticky-hide");
    const fake = await render(CtaBand, { copy: data.cta, urgency: { message: "Hurry, almost gone", reason: "" } });
    expect(fake).not.toContain("Hurry");
  });
  it("CtaBand uses a WhatsApp button for a WhatsApp secondary", async () => {
    expect(await render(CtaBand, { copy: data.cta, variant: "card" })).toContain('data-tone="whatsapp"');
  });
  it("EnquiryFormShell posts natively, keeps consent unticked and hides the honeypot", async () => {
    const html = await render(EnquiryFormShell, { action: "/api/enquiry", consent: { label: "Email me occasional updates." }, interest: { label: "Interested in", options: ["Assessment", "Massage"] } });
    expect(html).toMatch(/<form[^>]+action="\/api\/enquiry"[^>]+method="post"/);
    expect(html).toMatch(/<input type="checkbox" name="consent" value="yes"(?![^>]*checked)/);
    expect(html).toContain('name="company_website"');
    expect(html).toMatch(/name="name"[^>]*required/);
    expect(html).toContain('role="status"');
    await expect(render(EnquiryFormShell, {})).rejects.toThrow(/needs an `action`/);
    await expect(render(EnquiryFormShell, { mode: "preview" })).rejects.toThrow(/previewMessage/);
  });
});

describe("chrome", () => {
  it("Navbar uses a details disclosure for the mobile menu and marks the current page", async () => {
    const html = await render(Navbar, { brandName: "Harbour Physio", links: [{ label: "Prices", href: "#prices", current: true }], cta: data.hero.primary, secondary: data.hero.secondary });
    expect(html).toContain("<details");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Harbour Physio");
    expect(html).toContain('aria-label="Main"');
  });
  it("Footer wraps long emails at the @", async () => {
    const html = await render(Footer, { brandName: "Harbour Physio", contact: { heading: "Contact", email: "appointments@harbourphysio.example" }, legal: ["Harbour Physio Ltd"] });
    expect(html).toContain("appointments<wbr>@harbourphysio.example");
  });
});

describe("design rules", () => {
  const dir = fileURLToPath(new URL("../src/components/", import.meta.url));
  const sources = readdirSync(dir).filter((f) => f.endsWith(".astro")).map((f) => ({ file: f, text: readFileSync(dir + f, "utf8") }));
  const styleOf = (text: string) => (text.match(/<style[\s\S]*?<\/style>/g) ?? []).join("\n");
  const css = [...sources.map((s) => ({ file: s.file, css: styleOf(s.text) })), { file: "base.css", css: readFileSync(fileURLToPath(new URL("../src/styles/base.css", import.meta.url)), "utf8") }];

  it("uses no hard-coded colours in component CSS (tokens only)", () => {
    for (const { file, css: c } of css) {
      expect(c, file).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(c, file).not.toMatch(/\brgba?\(\s*\d/);
      expect(c, file).not.toMatch(/\bhsla?\(\s*\d/);
    }
  });
  it("has no gradient text, blur blobs or glassmorphism", () => {
    for (const { file, css: c } of css) {
      expect(c, file).not.toMatch(/background-clip:\s*text/);
      expect(c, file).not.toMatch(/filter:\s*blur/);
      expect(c, file).not.toMatch(/backdrop-filter/);
    }
  });
  it("lets the brand pick the default button treatment, like @brandcloud/ui", () => {
    const button = sources.find((s) => s.file === "Button.astro")!.text;
    expect(button).toContain(':where([data-button-appearance="depth"]) .ba-button:not([data-appearance])');
    expect(styleOf(button)).toMatch(/\.ba-button \{[^}]*background: var\(--ba-btn-flat\)/);
  });
  it("keeps em and en dashes out of component source text", () => {
    for (const { file, text } of sources) expect(text, file).not.toMatch(/[–—]/);
  });
  it("every component root carries the token scope class", async () => {
    const renders = [
      await render(Hero, { copy: data.hero }),
      await render(Faq, { items: data.faqs }),
      await render(CtaBand, { copy: data.cta }),
    ];
    for (const html of renders) expect(html).toMatch(/^<[a-z]+[^>]*class="ba /);
  });
});
