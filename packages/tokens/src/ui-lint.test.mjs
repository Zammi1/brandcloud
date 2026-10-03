import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { gradientHueSpan, lintText, main, resolveVars, tokenVars } from "./ui-lint.mjs";
import { compile } from "./token-compiler.mjs";

const rules = (violations) => violations.map((violation) => `${violation.rule}:${violation.line}`);

test("AI gradients are flagged, tonal single-hue gradients are not", () => {
  const css = [
    ".hero { background: linear-gradient(135deg, #7c3aed, #ec4899); }",
    ".rainbow { background: conic-gradient(red, yellow, lime, aqua, blue, magenta, red); }",
    ".cta { background: linear-gradient(#3b82f6, #1d4ed8); }",
    ".glow { background: radial-gradient(65% 30% at 50% 100%, rgba(34, 211, 238, 0.8), transparent), linear-gradient(#2563eb, #2563eb); }",
    ".fade { background: linear-gradient(to bottom, #ffffff, transparent); }",
  ].join("\n");
  const found = lintText(css, "x.css").filter((violation) => violation.rule === "ai-gradient");
  assert.deepEqual(found.map((violation) => violation.line), [1, 2]);
  assert.match(found[0].excerpt, /spans \d+ degrees of hue: linear-gradient\(135deg, #7c3aed, #ec4899\)/);
  assert.ok(gradientHueSpan("#2563eb, rgba(34,211,238,.8)") < 40, "the v4 primary's cyan glow is the same hue family");
  assert.ok(gradientHueSpan("#8b5cf6, #06b6d4") > 40, "violet to cyan is not");
});

test("hard-coded gradients outside tokens are flagged; token gradients are not", () => {
  const css = [
    ".a { background: linear-gradient(#3b82f6, #1d4ed8); }",
    ".b { background-image: var(--brand-action-depth-fill); }",
    ".c { background: linear-gradient(var(--brand-level-sky-highlight), var(--brand-level-sky-deep)); }",
    ".d { background: linear-gradient(to bottom, var(--brand-white-a12, transparent), transparent); }",
  ].join("\n");
  assert.deepEqual(rules(lintText(css, "x.css").filter((violation) => violation.rule === "raw-gradient")), ["raw-gradient:1"]);
  // In a token file the same gradient is the definition, so only the hue rule applies there.
  assert.deepEqual(lintText(css, "tokens.css", { tokenFile: true }), []);
});

test("multi-line gradients are read as a whole and reported on their first line", () => {
  const css = ".x {\n  background: linear-gradient(\n    90deg,\n    #a855f7 0%,\n    #f43f5e 100%\n  );\n}";
  const found = lintText(css, "x.scss");
  assert.deepEqual(rules(found.filter((violation) => violation.rule !== "raw-colour")), ["raw-gradient:2", "ai-gradient:2"]);
});

test("gradient text is flagged in CSS, Tailwind classes and React style objects", () => {
  const css = ".t { background: var(--brand-action-depth-fill); -webkit-background-clip: text; background-clip: text; }";
  assert.equal(lintText(css, "x.css").filter((violation) => violation.rule === "gradient-text").length, 2);
  const tsx = [
    '<h1 className="bg-clip-text text-transparent">Hi</h1>',
    "const heading = { WebkitBackgroundClip: 'text' };",
    '<p className="bg-clip-padding">ok</p>',
  ].join("\n");
  assert.deepEqual(rules(lintText(tsx, "x.tsx")), ["gradient-text:1", "gradient-text:2"]);
});

test("Tailwind palette gradients are raw, and multi-hue ones are AI gradients", () => {
  const tsx = [
    '<div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400" />',
    '<div className="bg-linear-to-b from-blue-500 to-blue-700" />',
    '<div className="bg-action-depth shadow-action-depth" />',
    '<div className="bg-gradient-to-b from-level-sky-highlight to-level-sky-deep" />',
  ].join("\n");
  assert.deepEqual(rules(lintText(tsx, "x.tsx")), ["ai-gradient:1", "raw-gradient:1", "raw-gradient:2"]);
});

test("var() references resolve through token values so token-built AI gradients are caught", async () => {
  const vars = { "--brand-a": "#7c3aed", "--brand-b": "#ec4899", "--brand-c": "#1d4ed8" };
  assert.equal(resolveVars("var(--brand-a), var(--missing, #000000)", vars), "#7c3aed, #000000");
  const css = ".x { background: linear-gradient(var(--brand-a), var(--brand-b)); }\n.y { background: linear-gradient(var(--brand-c), var(--brand-c)); }";
  assert.deepEqual(rules(lintText(css, "x.css", { vars })), ["ai-gradient:1"]);
  assert.deepEqual(rules(lintText(css, "x.css")), [], "without values a var() gradient cannot be judged");

  const { artifacts } = await compile(new URL("./tokens.json", import.meta.url).pathname);
  const harbour = tokenVars(artifacts.json, { brand: "harbour", mode: "light" });
  assert.equal(harbour["--brand-accent"], "#0b5a87");
  assert.ok(harbour["--brand-action-depth-from"]);
  const fill = ".btn { background-image: radial-gradient(65.28% 30% at 50% 100%, var(--brand-action-depth-glow), transparent), linear-gradient(var(--brand-action-depth-from), var(--brand-action-depth-to)); }";
  assert.deepEqual(lintText(fill, "x.css", { vars: harbour }), []);
});

function project(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "brand-ui-lint-"));
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
  }
  return root;
}

async function run(root, ...args) {
  const lines = [];
  const code = await main(["--root", root, ...args], (line) => lines.push(line));
  return { code, output: lines.join("\n") };
}

test("a consumer project lints with its own ui-lint.config.json", async () => {
  const root = project({
    "ui-lint.config.json": JSON.stringify({
      include: ["src"],
      exclude: ["src/legacy"],
      tokenFiles: ["src/styles/brand.css"],
      rules: { "inline-style": false, "long-line": { max: 120 } },
    }),
    "src/styles/brand.css": ":root { --brand-x: #123456; --fill: linear-gradient(#3b82f6, #1d4ed8); }\n",
    "src/legacy/old.css": ".a { color: #ff0000; }\n",
    "src/components/Hero.astro": '<section style={{ top: 0 }}><h1 class="hero">Hi</h1></section>\n<style>.hero { color: var(--brand-text); }</style>\n',
  });
  const clean = await run(root);
  assert.equal(clean.code, 0, clean.output);
  assert.match(clean.output, /no regressions/);

  writeFileSync(path.join(root, "src/components/Hero.astro"), '<h1 class="bg-clip-text">Hi</h1>\n<style>.hero { background: linear-gradient(#8b5cf6, #06b6d4); }</style>\n');
  const failed = await run(root);
  assert.equal(failed.code, 1);
  assert.match(failed.output, /src\/components\/Hero\.astro: ai-gradient 1 \(baseline 0\)/);
  assert.match(failed.output, /src\/components\/Hero\.astro: gradient-text 1 \(baseline 0\)/);
  assert.match(failed.output, /src\/components\/Hero\.astro: raw-gradient 1 \(baseline 0\)/);

  assert.equal((await run(root, "--update-baseline")).code, 0);
  assert.equal((await run(root)).code, 0, "a baseline accepts existing violations");
});

test("the brand-ui-lint CLI runs in a consumer folder and exits non-zero on a regression", () => {
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui-lint-cli.mjs");
  const root = project({ "src/app.css": ".a { color: var(--brand-text); }\n" });
  assert.match(execFileSync(process.execPath, [cli, "--root", root], { encoding: "utf8" }), /no regressions/);
  writeFileSync(path.join(root, "src/app.css"), ".a { background: linear-gradient(90deg, #6366f1, #ec4899); }\n");
  assert.throws(() => execFileSync(process.execPath, [cli, "--root", root], { encoding: "utf8", stdio: "pipe" }), (error) => error.status === 1 && /ai-gradient/.test(error.stdout));
});
