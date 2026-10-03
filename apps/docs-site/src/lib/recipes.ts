/** The four page recipes. Every business here is made up; the pages say so. */
export interface Recipe {
  slug: string;
  kind: string;
  business: string;
  brand: "harbour" | "orchard" | "marigold" | "docs";
  brandLabel: string;
  summary: string;
  uses: string[];
}

export const recipes: Recipe[] = [
  {
    slug: "campaign",
    kind: "Campaign landing page",
    business: "Tidewell Physio",
    brand: "harbour",
    brandLabel: "Harbour",
    summary: "A six-week return-to-running programme with a start date, a price and one enquiry form.",
    uses: ["Navbar", "Hero (field)", "Steps (rail)", "Faq", "EnquiryFormShell", "CtaBand", "Footer"],
  },
  {
    slug: "offer",
    kind: "Offer page",
    business: "Bramble and Rye",
    brand: "orchard",
    brandLabel: "Orchard",
    summary: "One product, a wedding cake tasting box, with what is in it, how it works and the terms in plain words.",
    uses: ["Navbar", "Hero (editorial)", "Steps (list)", "Faq (stacked)", "CtaBand (card)", "Footer"],
  },
  {
    slug: "event",
    kind: "Event page",
    business: "Kingsport Night Market",
    brand: "marigold",
    brandLabel: "Marigold",
    summary: "A one-evening market with the date, the running order, how to get there and how to book a stall.",
    uses: ["Navbar", "Hero (field)", "Steps (split)", "TrustStrip (inline)", "Faq", "CtaBand", "Footer"],
  },
  {
    slug: "local-service",
    kind: "Local service page",
    business: "Kestrel Lane Electrical",
    brand: "docs",
    brandLabel: "Docs",
    summary: "An electrician covering a handful of towns: the jobs they do, how a visit works and a quote form.",
    uses: ["Navbar", "Hero (editorial)", "TrustStrip (rule)", "Steps (rail)", "Faq", "EnquiryFormShell", "Footer"],
  },
];
