// Writes the CSS and JSON artefacts into dist/. Run with Node 24 (native TypeScript stripping).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KEYFRAMES, buildTailwindCss, buildTokensCss } from "../src/css.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const tokensCss = buildTokensCss();
const utilities = `${readFileSync(join(root, "src/css/utilities.css"), "utf8").trimEnd()}\n\n/* Keyframes (generated, shared with tailwind.css). */\n${KEYFRAMES}\n`;
const viewTransitions = readFileSync(join(root, "src/css/view-transitions.css"), "utf8");
const character = readFileSync(join(root, "src/css/character.css"), "utf8");

const files: Record<string, string> = {
  "tokens.css": tokensCss,
  "utilities.css": utilities,
  "motion.css": `${tokensCss}\n${utilities}\n${character}`,
  "character.css": character,
  "view-transitions.css": viewTransitions,
  "tailwind.css": buildTailwindCss(),
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(dist, name), content);
  writeFileSync(join(dist, `${name}.d.ts`), "declare const stylesheet: string;\nexport default stylesheet;\n");
}
writeFileSync(join(dist, "tokens.json"), readFileSync(join(root, "src/tokens.json"), "utf8"));
writeFileSync(join(dist, "antipatterns.json"), readFileSync(join(root, "antipatterns.json"), "utf8"));
// tsc keeps the source's ".ts" specifiers in declarations; point them at the emitted ".js" names.
for (const file of readdirSync(dist).filter((f) => f.endsWith(".d.ts") && !f.endsWith(".css.d.ts"))) {
  const path = join(dist, file);
  writeFileSync(path, readFileSync(path, "utf8").replace(/(from\s+["']\.\/[\w-]+)\.ts(["'])/g, "$1.js$2"));
}
console.log(`@brandcloud/motion: wrote ${Object.keys(files).length} stylesheets + tokens.json + antipatterns.json`);
