import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { compile } from "../src/token-compiler.mjs";
import { main, makeBrand, parseArgs } from "./make-brand.mjs";

const tokensPath = new URL("../src/tokens.json", import.meta.url).pathname;

async function run(...argv) {
  const lines = [];
  const code = await main(argv, (line) => lines.push(line));
  return { code, output: lines.join("\n") };
}

const good = ["--name", "acme", "--label", "Acme Roofing", "--accent", "#0f766e", "--ink", "#111827", "--paper", "#fbfaf7", "--font-body", "Inter, system-ui, sans-serif", "--font-display", "Fraunces, Georgia, serif"];

test("parses flags into a brand input", () => {
  const options = parseArgs([...good, "--appearance", "solid", "--dry-run"]);
  assert.deepEqual(options.input, {
    name: "acme",
    label: "Acme Roofing",
    accent: "#0f766e",
    ink: "#111827",
    paper: "#fbfaf7",
    fonts: { body: "Inter, system-ui, sans-serif", display: "Fraunces, Georgia, serif" },
    appearance: "solid",
  });
  assert.equal(options.dryRun, true);
  assert.throws(() => parseArgs(["--accent"]), /--accent needs a value/);
  assert.throws(() => parseArgs(["--colour", "red"]), /Unknown option --colour/);
});

test("writes brands/<name>.json and a contrast report when every AA check passes", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "make-brand-"));
  const report = path.join(outDir, "reports", "acme.json");
  const { code, output } = await run(...good, "--out-dir", outDir, "--report", report);
  assert.equal(code, 0, output);
  assert.match(output, /pass\s+\d+\.\d\d : 1 {2}\(needs 4\.5\) {2}text on canvas/);
  assert.match(output, /All required checks pass/);

  const written = JSON.parse(await fs.readFile(path.join(outDir, "acme.json"), "utf8"));
  assert.deepEqual(written, {
    name: "acme",
    label: "Acme Roofing",
    accent: "#0f766e",
    ink: "#111827",
    paper: "#fbfaf7",
    fonts: { body: "Inter, system-ui, sans-serif", display: "Fraunces, Georgia, serif" },
    appearance: "depth",
  });
  const reportBody = JSON.parse(await fs.readFile(report, "utf8"));
  assert.deepEqual(reportBody.map((entry) => entry.mode), ["light", "dark"]);
  assert.ok(reportBody.every((entry) => entry.errors.length === 0));

  // The written file compiles with the real token source.
  const { artifacts } = await compile(tokensPath, { brandsDir: outDir });
  assert.equal(artifacts.json.brands.acme.light.accent, "#0f766e");
  assert.equal(artifacts.json.brands.acme.light["font-display"], "Fraunces, Georgia, serif");
});

test("exits 1 and writes nothing when a required pair fails AA", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "make-brand-"));
  // A pale sky accent cannot be link text on white.
  const { code, output } = await run("--name", "pale", "--accent", "#93c5fd", "--ink", "#111827", "--paper", "#ffffff", "--font-body", "Inter", "--out-dir", outDir);
  assert.equal(code, 1);
  assert.match(output, /FAIL\s+1\.\d\d : 1 {2}\(needs 4\.5\) {2}accent on canvas/);
  assert.match(output, /required check\(s\) failed/);
  await assert.rejects(() => fs.access(path.join(outDir, "pale.json")));

  const forced = await run("--name", "pale", "--accent", "#93c5fd", "--ink", "#111827", "--paper", "#ffffff", "--font-body", "Inter", "--out-dir", outDir, "--force");
  assert.equal(forced.code, 1);
  await fs.access(path.join(outDir, "pale.json"));
  await assert.rejects(() => compile(tokensPath, { brandsDir: outDir }), /Brand pale light: contrast accent\/canvas/);
});

test("derived palettes fix readable text automatically and keep the label on the depth button", async () => {
  const { modes, failed } = await makeBrand({ name: "greyink", accent: "#0f766e", ink: "#777777", paper: "#ffffff", fonts: { body: "Inter" } });
  assert.equal(failed, false);
  assert.notEqual(modes.light.text, "#777777", "text is darkened to reach AA");
  assert.equal(modes.light["action-depth-text"], "#ffffff");
});

test("--input reads the same keys as a brand file; --dry-run never writes", async () => {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "make-brand-"));
  const brief = path.join(outDir, "brief.json");
  await fs.writeFile(brief, JSON.stringify({ name: "briefed", accent: "#b45309", ink: "#1c1917", paper: "#fffbf5", fonts: { body: "Inter" } }));
  const { code, output } = await run("--input", brief, "--out-dir", outDir, "--dry-run");
  assert.equal(code, 0, output);
  assert.match(output, /dry run, nothing written/);
  await assert.rejects(() => fs.access(path.join(outDir, "briefed.json")));
});

test("--css writes the standalone brand stylesheet next to the brand file", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "make-brand-css-"));
  const lines = [];
  const code = await main(["--name", "acme", "--accent", "#0f766e", "--ink", "#111827", "--paper", "#fbfaf7", "--font-body", "Georgia, serif", "--out-dir", dir, "--css", path.join(dir, "acme.css")], (line) => lines.push(line));
  assert.equal(code, 0, lines.join("\n"));
  const css = await fs.readFile(path.join(dir, "acme.css"), "utf8");
  assert.match(css, /\[data-brand="acme"\]/);
  assert.match(css, /--brand-canvas: #fbfaf7/);
});
