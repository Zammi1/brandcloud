/**
 * @brandcloud/astro: Astro components for marketing pages. Zero client JavaScript by default
 * (Navbar and EnquiryFormShell add small progressive scripts), styled only with
 * @brandcloud/tokens custom properties.
 *
 * Prefer deep imports in pages so only the components you use (and their CSS) are bundled:
 *   import Hero from "@brandcloud/astro/components/Hero.astro";
 * This barrel is for convenience and type imports.
 */
export { default as Button } from "./components/Button.astro";
export { default as Container } from "./components/Container.astro";
export { default as CtaBand } from "./components/CtaBand.astro";
export { default as EnquiryFormShell } from "./components/EnquiryFormShell.astro";
export { default as Faq } from "./components/Faq.astro";
export { default as Footer } from "./components/Footer.astro";
export { default as Heading } from "./components/Heading.astro";
export { default as Hero } from "./components/Hero.astro";
export { default as Icon } from "./components/Icon.astro";
export { default as Navbar } from "./components/Navbar.astro";
export { default as Section } from "./components/Section.astro";
export { default as Steps } from "./components/Steps.astro";
export { default as TrustStrip } from "./components/TrustStrip.astro";

export * from "./copy-types.js";
export * from "./lib/index.js";
