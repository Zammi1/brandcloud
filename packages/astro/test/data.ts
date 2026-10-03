// Fictional sample content for render tests. Generic local business, no real clients.
import type { CtaCopy, FaqItem, GuaranteeCopy, HeroCopy, OfferCopy, PricingTierCopy, ProofItem, StepItem, TrustItem, UrgencyCopy } from "../src/copy-types.js";

export const hero: HeroCopy = {
  heading: "Physio in Ashby Vale that gets you back to running",
  lede: "Assessment and treatment in one hour, with a written plan you can follow at home.",
  primary: { label: "Book an assessment", href: "#book", short: "Book" },
  secondary: { label: "Message us on WhatsApp", href: "https://wa.me/447700900123", external: true, channel: "whatsapp" },
  note: "Most people are seen within a week.",
};

export const columns = [
  { id: "check", name: "Check", description: "Find out what is wrong", shape: "grid" as const },
  { id: "treat", name: "Treat", description: "Fix it with us", shape: "plain" as const },
  { id: "keep", name: "Keep", description: "Stay well every month", shape: "ring" as const },
];
export const rows = [
  { id: "one", name: "Foundation", level: "sky" as const, outcome: "One problem sorted" },
  { id: "two", name: "Growth", level: "blue" as const, outcome: "Back to full training" },
  { id: "three", name: "Scale", level: "navy" as const, outcome: "Race ready" },
];
export const offers: OfferCopy[] = columns.flatMap((c) =>
  rows.map((r) => ({ id: `${c.id}-${r.id}`, name: `${r.name} ${c.name}`, column: c.id, row: r.id, price: c.id === "keep" ? "£40 a month" : "From £60", cta: { label: "Ask about this", href: `#${c.id}-${r.id}` } })),
);

export const tier: PricingTierCopy = {
  id: "growth",
  name: "Growth",
  tagline: "For a recurring injury",
  price: "From £240, paid after each session",
  includes: ["Four sessions", "A written home plan", "Messages between sessions"],
  includesIntro: "Everything in Starter, plus",
  level: "blue",
  levelLabel: "Level 2",
  cta: { label: "Book Growth", href: "#growth" },
  highlight: "Most chosen",
  fine: "Pay as you go. Stop any time.",
};

export const steps: StepItem[] = [
  { title: "Tell us what hurts", text: "A short form or a message." },
  { title: "Assessment", text: "One hour, hands on.", meta: "Day 1" },
  { title: "Your plan", text: "Written, with exercises you can do at home." },
];

export const proof: ProofItem[] = [
  { quote: "Two sessions in and I was running again without the knee pain I had for a year.", name: "Sample Person", role: "Club runner", source: "Test content" },
  { quote: "Clear, kind and on time.", name: "Another Sample", source: "Test content" },
  { quote: "Hidden because consent was refused.", name: "Refused", source: "Email", consent: false },
];

export const trust: TrustItem[] = [
  { text: "HCPC registered physiotherapists" },
  { text: "Member of the Chartered Society of Physiotherapy" },
  { text: "Running since 2012" },
];

export const guarantee: GuaranteeCopy = {
  name: "First session guarantee",
  promise: "If the first session does not help, the second one is free.",
  conditions: ["Tell us within 7 days", "One free session per person"],
  policyHref: "/terms#guarantee",
  policyLabel: "Read the guarantee terms",
};

export const faqs: FaqItem[] = [
  { question: "Do I need a GP referral?", answer: "No. Book directly.", objection: "process" },
  { question: "How much is it?", answerHtml: 'See <a href="#prices">prices</a>.', objection: "price" },
];

export const cta: CtaCopy = {
  heading: "Book your assessment",
  body: "One hour, a clear answer and a plan.",
  primary: { label: "Book an assessment", href: "#book" },
  secondary: { label: "WhatsApp us", href: "https://wa.me/447700900123", external: true, channel: "whatsapp" },
};

export const urgency: UrgencyCopy = { message: "Autumn prices end soon", reason: "Our prices go up for new clients on 1 November.", endsOn: "2026-10-31" };
