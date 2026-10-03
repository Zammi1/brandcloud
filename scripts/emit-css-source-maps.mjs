import fs from "node:fs/promises";
import path from "node:path";

const packageToMaps = {
  ui: [
    { source: "src/styles.css", dist: "dist/styles.css" },
    { source: "src/public.css", dist: "dist/public.css" },
    { source: "src/reset.css", dist: "dist/reset.css" },
  ],
  blocks: [{ source: "src/styles.css", dist: "dist/styles.css" }],
  "product-surfaces": [{ source: "src/styles.css", dist: "dist/styles.css" }],
  capture: [{ source: "src/styles.css", dist: "dist/styles.css" }],
  consent: [{ source: "src/styles.css", dist: "dist/styles.css" }],
  loader: [{ source: "src/styles.css", dist: "dist/styles.css" }],
  banner: [{ source: "src/styles.css", dist: "dist/styles.css" }],
  "contact-actions": [{ source: "src/styles.css", dist: "dist/styles.css" }],
};

function getPackageName(args) {
  const value = args.find(
    (entry) => entry.startsWith("--package="),
  );

  if (!value) {
    return args[0];
  }

  return value.slice("--package=".length);
}

export function mapPayload(fileName, sourcePath, sourceCss) {
  return {
    version: 3,
    sources: [sourcePath],
    names: [],
    mappings: "",
    file: fileName,
    sourcesContent: [sourceCss],
  };
}

/** Supported source syntax: plain quoted ./relative.css imports, without conditions. */
export function cssImportPaths(text) {
  const source = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // Escaped at-keywords can conceal imports; this metadata emitter does not parse them.
  if (/@[^\s;{]*\\/.test(source)) throw new Error('Unsupported escaped CSS at-rule.');
  const paths = [];
  for (const match of source.matchAll(/@import\b/gi)) {
    const declaration = /^@import\s+(["'])(\.\/[A-Za-z0-9_./-]+\.css)\1\s*;/.exec(source.slice(match.index));
    if (!declaration || declaration[2].slice(2).split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('Unsupported CSS import: use a plain quoted ./relative.css path without traversal or conditions.');
    }
    paths.push(declaration[2]);
  }
  return paths;
}

async function emitCssMap(packageDirectory, sourcePath, distPath) {
  const absoluteSource = path.resolve(packageDirectory, sourcePath);
  const absoluteDist = path.resolve(packageDirectory, distPath);

  const cssText = await fs.readFile(absoluteDist, "utf8");
  const sourceText = await fs.readFile(absoluteSource, "utf8");
  const mapPath = `${absoluteDist}.map`;

  const map = mapPayload(path.basename(absoluteDist), path.posix.relative(path.dirname(absoluteDist), absoluteSource), sourceText);
  // CSS entrypoints compose source modules. Preserve their contents as metadata;
  // mappings remain deliberately empty rather than inventing positional data.
  const seen = new Set([absoluteSource]);
  async function importedSources(sourceFile, text) {
    for (const relative of cssImportPaths(text)) {
      const imported = path.resolve(path.dirname(sourceFile), relative);
      if (seen.has(imported)) continue;
      seen.add(imported);
      const content = await fs.readFile(imported, "utf8");
      map.sources.push(path.posix.relative(path.dirname(absoluteDist), imported));
      map.sourcesContent.push(content);
      await importedSources(imported, content);
    }
  }
  await importedSources(absoluteSource, sourceText);

  await fs.writeFile(mapPath, `${JSON.stringify(map)}\n`, "utf8");

  const sourceMappingUrl = `/*# sourceMappingURL=${path.basename(mapPath)} */`;

  if (!cssText.includes(sourceMappingUrl)) {
    await fs.writeFile(absoluteDist, `${cssText}\n${sourceMappingUrl}\n`, "utf8");
  }
}

async function main() {
  const args = process.argv.slice(2);
  const packageName = getPackageName(args);

  if (!packageName || !(packageName in packageToMaps)) {
    throw new Error(
      `Expected a supported --package argument, got ${packageName ?? "none"}`,
    );
  }

  const packageDirectory = path.resolve(process.cwd());
  const entries = packageToMaps[packageName];

  for (const entry of entries) {
    await emitCssMap(packageDirectory, entry.source, entry.dist);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error("[emit-css-source-maps]", error);
    process.exit(1);
  });
}
