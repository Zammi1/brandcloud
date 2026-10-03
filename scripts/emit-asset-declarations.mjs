import fs from "node:fs";
import path from "node:path";

const assetSpecs = {
  ui: { css: ["styles.css", "public.css", "reset.css"] },
  blocks: { css: ["styles.css"] },
  "product-surfaces": { css: ["styles.css"] },
  tokens: { css: ["tokens.css", "themes.css", "tailwind.css"] },
  capture: { css: ["styles.css"] },
  consent: { css: ["styles.css"] },
  loader: { css: ["styles.css"] },
  banner: { css: ["styles.css"] },
  "contact-actions": { css: ["styles.css"] },
};

const packageArg = process.argv.find((value) => value.startsWith("--package="));

if (!packageArg) {
  throw new Error("emit-asset-declarations requires --package=<ui|blocks|product-surfaces|tokens|capture|consent|loader|banner|contact-actions>");
}

const packageName = packageArg.slice("--package=".length);
const spec = assetSpecs[packageName];

if (!spec) {
  throw new Error(`Unknown package ${packageName}`);
}

const distDir = path.join(process.cwd(), "dist");

for (const file of spec.css) {
  const cssPath = path.join(distDir, file);

  if (!fs.existsSync(cssPath)) {
    continue;
  }

  const declarationPath = path.join(distDir, `${file}.d.ts`);
  fs.writeFileSync(
    declarationPath,
    "declare const styles: string;\nexport default styles;\n",
  );
  console.log(`[emit-asset-declarations] ${packageName}/${file}.d.ts`);
}
