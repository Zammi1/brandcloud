/**
 * Site-wide facts. The product name and package scopes come from project.json at the repository root,
 * the one place they live, so a rename is one edit there. Never write the name into a page or component.
 */
import project from "../../../../project.json";
import tokensPackage from "../../../../packages/tokens/package.json";
import type { FooterColumn, NavLink } from "@brandcloud/astro/copy-types";

export const PRODUCT: string = project.product;
export const SCOPE: string = project.scope;
export const PRO_SCOPE: string = project.proScope;
export const PRO_NAME = `${PRODUCT} Pro`;

/** A package name in the current scope, e.g. pkg("ui") is "@brandcloud/ui" today. */
export const pkg = (name: string) => `${SCOPE}/${name}`;

/** The public repository. The packages are not on npm yet, so installs go through packed tarballs built from it. */
export const REPO_URL = `https://github.com/${project.repository}`;
export const REPO_DIR: string = project.repository.split("/")[1];
/** All packages share one version (one fixed Changesets group). */
export const VERSION: string = tokensPackage.version;
/** Path to a packed package, from a project folder that sits next to the cloned repository. */
export const tgz = (name: string) => `../${REPO_DIR}/packs/${SCOPE.slice(1)}-${name}-${VERSION}.tgz`;
/** Clone, build and pack every package into ./packs. */
export const PACK_STEPS = `git clone ${REPO_URL}.git
cd ${REPO_DIR}
pnpm install
pnpm packs        # builds every package and packs it into ./packs`;
/** The one honest sentence about npm. */
export const NPM_NOTE = "npm packages are coming soon. Until then, install from the GitHub repository: clone it, run one command to pack the packages, then add the packed files to your project.";

/** Done-for-you and the one allowed line about the chatbot product. Both are link outs. */
export const M1_STUDIO = { name: "M1 Studio", href: "https://m1studio.co.uk" } as const;
export const KIKO = { name: "Kiko", href: "https://kikochat.space" } as const;

export const nav: NavLink[] = [
  { label: "Brand builder", href: "/brand-builder/" },
  { label: "AI-look score", href: "/ai-look-score/" },
  { label: "Recipes", href: "/recipes/" },
  { label: "Guides", href: "/guides/" },
  { label: "Pro", href: "/pro/" },
  { label: "For developers", href: "/developers/" },
];

export const devNav: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Start",
    links: [
      { label: "Overview", href: "/developers/" },
      { label: "Getting started", href: "/developers/getting-started/" },
      { label: "Theming", href: "/developers/theming/" },
    ],
  },
  {
    heading: "Build",
    links: [
      { label: "Components", href: "/developers/components/" },
      { label: "Motion", href: "/developers/motion/" },
      { label: "Anti-AI guide", href: "/developers/anti-ai/" },
    ],
  },
  {
    heading: "Reference",
    links: [
      { label: "Showcase", href: "/developers/showcase/" },
      { label: "Changelog", href: "/developers/changelog/" },
    ],
  },
];

export const footerColumns: FooterColumn[] = [
  {
    heading: "Free tools",
    links: [
      { label: "Brand builder", href: "/brand-builder/" },
      { label: "AI-look score", href: "/ai-look-score/" },
      { label: "Page recipes", href: "/recipes/" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Make a page not look AI-made", href: "/guides/not-ai-made/" },
      { label: "Pick colours that pass", href: "/guides/accessible-colours/" },
      { label: "Pro", href: "/pro/" },
    ],
  },
  {
    heading: "For developers",
    links: [
      { label: "Getting started", href: "/developers/getting-started/" },
      { label: "Components", href: "/developers/components/" },
      { label: "Motion", href: "/developers/motion/" },
      { label: "Changelog", href: "/developers/changelog/" },
    ],
  },
];
