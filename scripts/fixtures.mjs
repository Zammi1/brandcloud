#!/usr/bin/env node
/**
 * Consumer fixtures: packs every package exactly as npm would ship it, then installs the tarballs into fresh
 * apps outside this workspace and builds them. Proves the packages work from their public exports alone.
 *
 *   node scripts/fixtures.mjs [--keep] [--only vite-react19,next15,...]
 *
 * Matrix: Vite + React 19, Vite + React 18, Next.js 15 (App Router, React 19), Astro 7, and a Node CLI check
 * (brand-make, brand-ui-lint). Lifecycle scripts are disabled for every install. Nothing is published.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const keep = args.includes("--keep");
const only = (args[args.indexOf("--only") + 1] ?? "").split(",").filter((x) => args.includes("--only") && x);
const run = (cmd, argv, cwd, quiet = true) => execFileSync(cmd, argv, { cwd, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit", encoding: "utf8", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ASTRO_TELEMETRY_DISABLED: "1" } });
const out = fs.mkdtempSync(path.join(os.tmpdir(), "brand-fixtures-"));
const vendor = path.join(out, "vendor");
fs.mkdirSync(vendor);

const packages = ["tokens", "ui", "astro", "motion", "antipatterns"];
const tarballs = {};
for (const name of packages) {
  const dir = path.join(root, "packages", name);
  const result = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", vendor], dir));
  tarballs[name] = path.join(vendor, result[0].filename);
  const files = result[0].files.map((f) => f.path);
  if (files.some((f) => /(^|\/)(test|tests|__tests__)\/|\.test\.|node_modules|\.env/.test(f))) throw new Error(`${name} packs test or private files: ${files.filter((f) => /test|\.env/.test(f)).join(", ")}`);
}
const dep = (name) => `file:${tarballs[name]}`;
const write = (dir, files) => { for (const [file, content] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), typeof content === "string" ? content : JSON.stringify(content, null, 2)); } };
const tsconfig = (extra = {}) => ({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, skipLibCheck: true, noEmit: true, isolatedModules: true, ...extra }, include: ["src", "app"] });

const reactApp = `import { Button } from "@brandcloud/ui/button";
import { Dialog } from "@brandcloud/ui/dialog";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@brandcloud/ui/tabs";
import { Input } from "@brandcloud/ui/input";
import { Notice } from "@brandcloud/ui/notice";
import { presetSpecs } from "@brandcloud/motion";
import { flightPath } from "@brandcloud/motion/character";

export function App() {
  const arc = flightPath({ x: 0, y: 0 }, { x: 100, y: 0 }, { steps: 4 });
  return (
    <main>
      <h1>Installed from tarballs</h1>
      <Button tone="ink">Ink</Button>
      <Button tone="level" level="navy">Level</Button>
      <Input aria-label="Email" name="email" />
      <Notice tone="success" title="Installed">Press spring stiffness {presetSpecs.press.release.kind === "spring" ? presetSpecs.press.release.spring.stiffness : 0}, arc points {arc.length}</Notice>
      <Tabs defaultValue="a"><TabsList><TabsTab value="a">A</TabsTab><TabsTab value="b">B</TabsTab></TabsList><TabsPanel value="a">First</TabsPanel><TabsPanel value="b">Second</TabsPanel></Tabs>
      <Dialog trigger={<Button appearance="depth">Open dialog</Button>} title="Hello" description="From the packed @brandcloud/ui">Body</Dialog>
    </main>
  );
}
`;
const cssImports = `import "@brandcloud/tokens/css";\nimport "@brandcloud/tokens/themes.css";\nimport "@brandcloud/tokens/brands/harbour.css";\nimport "@brandcloud/ui/styles.css";\nimport "@brandcloud/motion/motion.css";\n`;

const fixtures = {
  "vite-react19": (dir) => vite(dir, "19.2.8", "19.2.18", "19.2.4"),
  "vite-react18": (dir) => vite(dir, "18.2.0", "18.2.79", "18.2.25"),
  next15: (dir) => {
    write(dir, {
      "package.json": { name: "fx-next15", private: true, type: "module", scripts: {}, dependencies: { next: "15.5.23", react: "19.2.8", "react-dom": "19.2.8", "@brandcloud/tokens": dep("tokens"), "@brandcloud/ui": dep("ui"), "@brandcloud/motion": dep("motion") }, devDependencies: { typescript: "5.9.3", "@types/react": "19.2.18", "@types/react-dom": "19.2.4", "@types/node": "22.20.1" } },
      "tsconfig.json": { ...tsconfig({ jsx: "preserve", plugins: [{ name: "next" }], incremental: true, allowJs: false, esModuleInterop: true, resolveJsonModule: true }), include: ["app", "next-env.d.ts", ".next/types/**/*.ts"] },
      "next.config.mjs": "export default { experimental: { cpus: 2 } };\n",
      "app/layout.tsx": `${cssImports.replace(/\n$/, "")}\nimport type { ReactNode } from "react";\nexport default function Layout({ children }: { children: ReactNode }) { return <html lang="en-GB" data-brand="harbour"><body>{children}</body></html>; }\n`,
      "app/client.tsx": `"use client";\n${reactApp}`,
      "app/page.tsx": `import { App } from "./client";\nexport default function Page() { return <App />; }\n`,
    });
    install(dir);
    run(process.execPath, ["node_modules/next/dist/bin/next", "build"], dir);
    if (!fs.existsSync(path.join(dir, ".next/BUILD_ID"))) throw new Error("next build produced no BUILD_ID");
  },
  astro7: (dir) => {
    write(dir, {
      "package.json": { name: "fx-astro7", private: true, type: "module", dependencies: { astro: "7.3.5", "@brandcloud/tokens": dep("tokens"), "@brandcloud/astro": dep("astro"), "@brandcloud/motion": dep("motion") }, devDependencies: { typescript: "5.9.3", "@astrojs/check": "0.9.10" } },
      "astro.config.mjs": "import { defineConfig } from 'astro/config';\nexport default defineConfig({});\n",
      "tsconfig.json": { extends: "astro/tsconfigs/strict" },
      "src/pages/index.astro": `---
import "@brandcloud/tokens/css";
import "@brandcloud/tokens/themes.css";
import "@brandcloud/tokens/brands/orchard.css";
import "@brandcloud/motion/motion.css";
import Hero from "@brandcloud/astro/components/Hero.astro";
import Steps from "@brandcloud/astro/components/Steps.astro";
import Faq from "@brandcloud/astro/components/Faq.astro";
import CtaBand from "@brandcloud/astro/components/CtaBand.astro";
import Button from "@brandcloud/astro/components/Button.astro";
import type { HeroCopy } from "@brandcloud/astro/copy-types";
const hero: HeroCopy = { heading: "Fresh bread before eight", lede: "A fictional bakery, built from installed tarballs.", primary: { label: "See the menu", href: "#menu" } };
---
<html lang="en-GB" data-brand="orchard" data-button-appearance="depth"><body>
<Hero copy={hero} variant="editorial" />
<Steps heading="How it works" steps={[{ title: "Order", text: "By ten the night before." }, { title: "Collect", text: "From seven." }, { title: "Eat", text: "Warm." }]} />
<Faq heading="Questions" items={[{ question: "Do you deliver?", answer: "Not yet." }]} />
<CtaBand copy={{ heading: "Order for tomorrow", primary: { label: "Order", href: "#order" } }} />
<Button href="#x" tone="ink">Ink</Button>
</body></html>
`,
    });
    install(dir);
    run(process.execPath, ["node_modules/astro/bin/astro.mjs", "check"], dir);
    run(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], dir);
    const html = fs.readFileSync(path.join(dir, "dist/index.html"), "utf8");
    if (!/ba-hero/.test(html) || (html.match(/<script/g) ?? []).length > 3) throw new Error("astro page missing components or shipping too much script");
  },
  cli: (dir) => {
    write(dir, { "package.json": { name: "fx-cli", private: true, type: "module", dependencies: { "@brandcloud/tokens": dep("tokens") } }, "src/ok.css": ".a { color: var(--brand-text); }\n", "src/bad.css": ".b { background: linear-gradient(90deg, #7c3aed, #ec4899); }\n", "ui-lint.config.json": { include: ["src"] } });
    install(dir);
    const made = run(process.execPath, ["node_modules/@brandcloud/tokens/scripts/make-brand.mjs", "--name", "acme", "--accent", "#0f766e", "--ink", "#111827", "--paper", "#fbfaf7", "--font-body", "Georgia, serif", "--out-dir", "brands", "--css", "brand.css"], dir);
    if (!/All required checks pass/.test(made) || !fs.readFileSync(path.join(dir, "brand.css"), "utf8").includes('[data-brand="acme"]')) throw new Error("brand-make did not write a brand");
    let failed = false;
    try { run(process.execPath, ["node_modules/@brandcloud/tokens/dist/ui-lint-cli.mjs", "--root", "."], dir); } catch (error) { failed = /ai-gradient/.test(String(error.stdout) + String(error.stderr)); }
    if (!failed) throw new Error("brand-ui-lint did not flag the AI gradient");
  },
};

function install(dir) { run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--loglevel=error"], dir); }
function vite(dir, react, types, domTypes) {
  write(dir, {
    "package.json": { name: `fx-vite-react${react.split(".")[0]}`, private: true, type: "module", dependencies: { react, "react-dom": react, "@brandcloud/tokens": dep("tokens"), "@brandcloud/ui": dep("ui"), "@brandcloud/motion": dep("motion") }, devDependencies: { vite: "8.2.1", typescript: "5.9.3", "@types/react": types, "@types/react-dom": domTypes } },
    "tsconfig.json": tsconfig(),
    "index.html": '<!doctype html><html lang="en-GB" data-brand="harbour"><head><meta charset="utf-8"><title>fixture</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n',
    "src/app.tsx": reactApp,
    "src/main.tsx": `${cssImports}import { createRoot } from "react-dom/client";\nimport { App } from "./app";\ncreateRoot(document.getElementById("root")!).render(<App />);\n`,
    "src/css.d.ts": 'declare module "*.css";\n',
  });
  install(dir);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], dir);
  run(process.execPath, ["node_modules/vite/bin/vite.js", "build"], dir);
}

const results = [];
for (const [name, build] of Object.entries(fixtures)) {
  if (only.length && !only.includes(name)) continue;
  const dir = path.join(out, name);
  fs.mkdirSync(dir);
  const started = Date.now();
  try { build(dir); results.push({ name, status: "pass", seconds: Math.round((Date.now() - started) / 1000) }); }
  catch (error) { results.push({ name, status: "FAIL", error: String(error.stderr || error.stdout || error.message).slice(-1500) }); }
  console.log(`${results.at(-1).status.padEnd(4)}  ${name}${results.at(-1).seconds !== undefined ? `  ${results.at(-1).seconds}s` : `\n${results.at(-1).error}`}`);
}
fs.writeFileSync(path.join(out, "fixtures.json"), JSON.stringify({ tarballs, results }, null, 2));
if (!keep) for (const r of results) if (r.status === "pass") fs.rmSync(path.join(out, r.name), { recursive: true, force: true });
console.log(`fixtures: ${results.filter((r) => r.status === "pass").length} of ${results.length} passed (${out})`);
process.exit(results.every((r) => r.status === "pass") ? 0 : 1);
