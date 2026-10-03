import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  build,
  compile,
} from "./token-compiler.mjs";

async function createSource(source) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "brand-tokens-"),
  );

  const srcDirectory = path.join(
    directory,
    "src",
  );

  await fs.mkdir(srcDirectory, {
    recursive: true,
  });

  const sourcePath = path.join(
    srcDirectory,
    "tokens.json",
  );

  await fs.writeFile(
    sourcePath,
    `${JSON.stringify(source, null, 2)}\n`,
  );

  return {
    directory,
    sourcePath,
  };
}

function validSource() {
  return {
    reference: {
      color: {
        white: {
          $value: "#ffffff",
          $type: "color",
        },

        black: {
          $value: "#000000",
          $type: "color",
        },

        muted: {
          $value: "#333333",
          $type: "color",
        },
      },
    },

    semantic: {
      canvas: {
        $value: "{reference.color.white}",
        $type: "color",
      },

      surface: {
        $value: "{reference.color.white}",
        $type: "color",
      },

      "surface-muted": {
        $value: "{reference.color.white}",
        $type: "color",
      },

      text: {
        $value: "{reference.color.black}",
        $type: "color",
      },

      "text-muted": {
        $value: "{reference.color.muted}",
        $type: "color",
      },
    },

    modes: {
      light: {
        canvas: {
          $value: "{semantic.canvas}",
          $type: "color",
        },

        surface: {
          $value: "{semantic.surface}",
          $type: "color",
        },

        "surface-muted": {
          $value: "{semantic.surface-muted}",
          $type: "color",
        },

        text: {
          $value: "{semantic.text}",
          $type: "color",
        },

        "text-muted": {
          $value: "{semantic.text-muted}",
          $type: "color",
        },
      },

      dark: {
        canvas: {
          $value: "#000000",
          $type: "color",
        },

        surface: {
          $value: "#000000",
          $type: "color",
        },

        "surface-muted": {
          $value: "#000000",
          $type: "color",
        },

        text: {
          $value: "#ffffff",
          $type: "color",
        },

        "text-muted": {
          $value: "#dddddd",
          $type: "color",
        },
      },
    },

    metadata: {
      defaultMode: "light",
    },
  };
}

test("identical input generates deterministic artifacts", async () => {
  const { sourcePath } = await createSource(
    validSource(),
  );

  const first = await compile(sourcePath);
  const second = await compile(sourcePath);

  assert.deepEqual(
    first.artifacts,
    second.artifacts,
  );
});

test("product semantic roles generate deterministic CSS and Tailwind mappings", async () => {
  const sourcePath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "tokens.json",
  );

  const first = await compile(sourcePath);
  const second = await compile(sourcePath);

  assert.equal(first.artifacts.tokensCss, second.artifacts.tokensCss);
  assert.equal(first.artifacts.themesCss, second.artifacts.themesCss);
  assert.equal(first.artifacts.tailwindCss, second.artifacts.tailwindCss);

  for (const declaration of [
    "--brand-surface-subtle: #f8fafc;",
    "--brand-surface-interactive: #f1f5f9;",
    "--brand-surface-raised: #ffffff;",
    "--brand-border-strong: #94a3b8;",
    "--brand-accent-subtle: #eef2ff;",
    "--brand-status-success-subtle: #dcfce7;",
    "--brand-radius-control: 10px;",
    "--brand-shadow-panel: 0 16px 40px rgb(15 23 42 / 0.12);",
    "--brand-decorative-highlight: #0080ff;",
    "--brand-overlay-backdrop: rgb(10 10 25 / 0.58);",
  ]) {
    assert.match(first.artifacts.tokensCss, new RegExp(declaration.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const mapping of [
    "--color-surface-subtle: var(--brand-surface-subtle);",
    "--color-border-strong: var(--brand-border-strong);",
    "--color-accent-subtle: var(--brand-accent-subtle);",
    "--color-status-danger-subtle: var(--brand-status-danger-subtle);",
    "--color-overlay-backdrop: var(--brand-overlay-backdrop);",
    "--spacing-1: 0.25rem;",
    "--spacing-2: 0.5rem;",
    "--spacing-3: 0.75rem;",
    "--spacing-4: 1rem;",
    "--spacing-5: 1.25rem;",
    "--spacing-6: 1.5rem;",
    "--spacing-8: 2rem;",
    "--spacing-10: 2.5rem;",
    "--spacing-12: 3rem;",
    "--radius-control: 10px;",
    "--radius-panel: 16px;",
    "--radius-feature: 24px;",
  ]) {
    assert.ok(first.artifacts.tailwindCss.includes(mapping), `missing Tailwind mapping: ${mapping}`);
  }
});

test("dark mode overrides contrast-sensitive product roles", async () => {
  const sourcePath = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "tokens.json",
  );
  const { artifacts } = await compile(sourcePath);
  const darkTheme = artifacts.nested.themes.dark;

  assert.deepEqual(
    {
      surfaceSubtle: darkTheme["surface-subtle"],
      surfaceInteractive: darkTheme["surface-interactive"],
      surfaceRaised: darkTheme["surface-raised"],
      borderStrong: darkTheme["border-strong"],
      accentSubtle: darkTheme["accent-subtle"],
      successSubtle: darkTheme["status-success-subtle"],
      warningSubtle: darkTheme["status-warning-subtle"],
      infoSubtle: darkTheme["status-info-subtle"],
      dangerSubtle: darkTheme["status-danger-subtle"],
      decorativeHighlight: darkTheme["decorative-highlight"],
      overlayBackdrop: darkTheme["overlay-backdrop"],
    },
    {
      surfaceSubtle: "#111827",
      surfaceInteractive: "#1e293b",
      surfaceRaised: "#172033",
      borderStrong: "#64748b",
      accentSubtle: "#252653",
      successSubtle: "#123524",
      warningSubtle: "#422f0a",
      infoSubtle: "#0c354d",
      dangerSubtle: "#4c1726",
      decorativeHighlight: "#38a3ff",
      overlayBackdrop: "rgb(10 10 25 / 0.58)",
    },
  );
});

test("unknown aliases fail validation", async () => {
  const source = validSource();

  source.semantic.text.$value =
    "{reference.color.does-not-exist}";

  const { sourcePath } = await createSource(source);

  await assert.rejects(
    () => compile(sourcePath),
    /Unknown alias target/,
  );
});

test("circular aliases fail validation", async () => {
  const source = validSource();

  source.semantic.one = {
    $value: "{semantic.two}",
    $type: "color",
  };

  source.semantic.two = {
    $value: "{semantic.one}",
    $type: "color",
  };

  const { sourcePath } = await createSource(source);

  await assert.rejects(
    () => compile(sourcePath),
    /Circular alias detected/,
  );
});

test("invalid contrast fails compilation", async () => {
  const source = validSource();

  source.modes.light.text = {
    $value: "#999999",
    $type: "color",
  };

  const { sourcePath } = await createSource(source);

  await assert.rejects(
    () => compile(sourcePath),
    /contrast/i,
  );
});

test("OKLCH black and white pass contrast validation", async () => {
  const source = validSource();

  source.modes.light.canvas = {
    $value: "oklch(100% 0 0)",
    $type: "color",
  };

  source.modes.light.surface = {
    $value: "oklch(100% 0 0)",
    $type: "color",
  };

  source.modes.light["surface-muted"] = {
    $value: "oklch(100% 0 0)",
    $type: "color",
  };

  source.modes.light.text = {
    $value: "oklch(0% 0 0)",
    $type: "color",
  };

  source.modes.light["text-muted"] = {
    $value: "oklch(20% 0 0)",
    $type: "color",
  };

  const { sourcePath } = await createSource(source);

  await assert.doesNotReject(() =>
    compile(sourcePath),
  );
});

test("build writes every public token artifact", async () => {
  const { directory, sourcePath } =
    await createSource(validSource());

  await build(sourcePath);

  const dist = path.join(directory, "dist");

  const expected = [
    "tokens.css",
    "themes.css",
    "tailwind.css",
    "tokens.json",
    "index.js",
    "index.d.ts",
  ];

  for (const filename of expected) {
    const filePath = path.join(dist, filename);

    const stat = await fs.stat(filePath);

    assert.equal(
      stat.isFile(),
      true,
      `${filename} was not generated`,
    );
  }
});

const packagedSource = new URL("./tokens.json", import.meta.url).pathname;

test("packaged tokens expose the operator type, layer and breakpoint scales", async () => {
  const { artifacts } = await compile(packagedSource);
  const css = artifacts.tokensCss;
  for (const [name, value] of [
    ["font-size-caption", "0.6875rem"],
    ["font-size-meta", "0.75rem"],
    ["font-size-body-sm", "0.8125rem"],
    ["font-size-body", "0.875rem"],
    ["font-size-section", "1rem"],
    ["font-size-title", "1.25rem"],
    ["font-weight-medium", "500"],
    ["letter-spacing-tight", "-0.02em"],
    ["z-index-modal", "110"],
    ["breakpoint-sm", "600px"],
    ["breakpoint-md", "760px"],
    ["breakpoint-lg", "1100px"],
    ["breakpoint-xl", "1440px"],
  ]) {
    assert.match(css, new RegExp(`--brand-${name}: ${value.replace(".", "\\.")};`), name);
  }
});

test("new roles exist in every mode so themed consumers never fall through", async () => {
  const { artifacts } = await compile(packagedSource);
  const themes = artifacts.json.themes;
  const roles = ["text-subtle", "status-danger-border", "overlay-hover", "focus-ring", "radius-pill", "shadow-popover", "z-index-toast"];
  for (const mode of ["light", "dark", "operator"]) {
    for (const role of roles) {
      assert.ok(themes[mode][role], `${mode} is missing ${role}`);
    }
  }
});

test("operator mode is a light warm theme on Instrument Sans with black actions", async () => {
  const { artifacts } = await compile(packagedSource);
  const operator = artifacts.json.themes.operator;

  assert.match(operator["font-sans"], /^"Instrument Sans"/);
  assert.doesNotMatch(operator["font-sans"], /Inter/);
  assert.equal(operator.accent, "#111111");
  assert.equal(operator["accent-text"], "#ffffff");
  assert.equal(operator["surface-raised"], "#f7f5f1");
  assert.match(artifacts.themesCss, /\[data-theme="operator"\] \{\n {4}color-scheme: light;/);
});

test("existing default token values are unchanged for current consumers", async () => {
  const { artifacts } = await compile(packagedSource);
  const light = artifacts.json.themes.light;

  assert.equal(light.accent, "#4f46e5");
  assert.equal(light.text, "#0f172a");
  assert.equal(light["font-sans"], "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif");
  assert.equal(light["radius-sm"], "0.5rem");
  assert.equal(light["spacing-4"], "1rem");
});

test("tailwind layer keeps non-colour roles out of the colour namespace", async () => {
  const { artifacts } = await compile(packagedSource);
  const tailwind = artifacts.tailwindCss;

  assert.match(tailwind, /--text-body: var\(--brand-font-size-body\);/);
  assert.doesNotMatch(tailwind, /--color-(font-|z-index|breakpoint|letter-spacing|shadow-popover)/);
  assert.doesNotMatch(tailwind, /--breakpoint-/);
});

test("tailwind layer exposes the new brand roles through @theme inline and gradient utilities", async () => {
  const { artifacts } = await compile(packagedSource);
  const tailwind = artifacts.tailwindCss;
  assert.match(tailwind, /^@theme inline \{/);
  for (const mapping of [
    "--color-action-depth-from: var(--brand-action-depth-from);",
    "--color-action-ink: var(--brand-action-ink);",
    "--color-whatsapp: var(--brand-whatsapp);",
    "--color-level-sky-base: var(--brand-level-sky-base);",
    "--color-level-obsidian-text: var(--brand-level-obsidian-text);",
    "--shadow-action-depth: var(--brand-shadow-action-depth);",
    "--shadow-action-depth-hover: var(--brand-shadow-action-depth-hover);",
    "--shadow-popover: var(--brand-shadow-popover);",
    "--font-display: var(--brand-font-display);",
    "--font-body: var(--brand-font-body);",
    "--text-display: var(--brand-font-size-display);",
    "--text-h1: var(--brand-font-size-h1);",
    "--text-lead: var(--brand-font-size-lead);",
    "--text-stat: var(--brand-font-size-stat);",
    "--spacing-section: var(--brand-section-space-y);",
    "--container-content-max: var(--brand-content-max);",
    "--container-content-narrow: var(--brand-content-narrow);",
  ]) {
    assert.ok(tailwind.includes(mapping), `missing Tailwind mapping: ${mapping}`);
  }
  assert.match(tailwind, /@utility bg-action-depth \{\n {2}background-image: var\(--brand-action-depth-fill\);\n\}/);
  assert.match(tailwind, /@utility bg-level-navy \{/);
  assert.doesNotMatch(tailwind, /--color-(shadow-|content|action-appearance|action-depth-glow-reach|level-[a-z]+-fill)/);
});

test("shadcn layer maps the full shadcn variable contract onto brand roles", async () => {
  const { artifacts } = await compile(packagedSource);
  const css = artifacts.shadcnCss;
  assert.match(css, /:root, \[data-theme\], \[data-brand\] \{/);
  const names = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground",
    "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring",
    "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
    "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"];
  for (const name of names) {
    assert.match(css, new RegExp(`\\n {4}--${name}: var\\(--brand-[a-z-]+\\);`), `--${name}`);
    assert.ok(css.includes(`  --color-${name}: var(--${name});`), `--color-${name}`);
  }
  assert.ok(css.includes("--primary: var(--brand-accent);"));
  assert.ok(css.includes("--radius: var(--brand-radius-control);"));
  assert.ok(css.includes("--radius-lg: var(--radius);"));
});

test("U01's 24 px stat size moved to font-size-stat; font-size-display is the marketing display size", async () => {
  const { artifacts } = await compile(packagedSource);
  for (const mode of ["light", "dark", "operator"]) {
    assert.equal(artifacts.json.themes[mode]["font-size-stat"], "1.5rem");
    assert.match(artifacts.json.themes[mode]["font-size-display"], /^clamp\(2\.625rem/);
  }
});

test("build writes the brand, shadcn and contrast report artifacts", async () => {
  const { directory, sourcePath } = await createSource(validSource());
  const brands = path.join(directory, "brands");
  await fs.mkdir(brands);
  await fs.writeFile(path.join(brands, "acme.json"), JSON.stringify({ name: "acme", accent: "#0f766e", ink: "#111827", paper: "#fbfaf7", fonts: { body: "Inter" } }));
  await build(sourcePath);
  const dist = path.join(directory, "dist");
  for (const filename of ["shadcn.css", "shadcn.css.d.ts", "contrast-report.json", "brands/acme.css", "brands/acme.css.d.ts"]) {
    assert.equal((await fs.stat(path.join(dist, filename))).isFile(), true, `${filename} was not generated`);
  }
  const themes = await fs.readFile(path.join(dist, "themes.css"), "utf8");
  assert.match(themes, /\[data-brand="acme"\]/);
});
