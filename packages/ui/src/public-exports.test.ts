import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Every source module must be public (root barrel and/or a package subpath, with a test) or explicitly internal.
const INTERNAL = new Set(["utils.ts", "modal-focus.ts", "test-setup.ts"]);
const read = (path: string) => readFileSync(resolve(path), "utf8");
const pkg = JSON.parse(read("package.json")) as { exports: Record<string, { import?: string; types?: string } | string> };
const sources = readdirSync(resolve("src")).filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && name !== "index.ts");
const tests = readdirSync(resolve("src")).filter((name) => /\.test\.tsx?$/.test(name)).map((name) => read(`src/${name}`)).join("\n");
const viteEntries = new Map([...read("vite.config.ts").matchAll(/^\s+"?([\w-]+)"?: "src\/([\w-]+\.tsx?)",$/gm)].map((m) => [m[2]!, m[1]!]));
const barrel = new Set([...read("src/index.ts").matchAll(/export \* from "\.\/([\w-]+)\.js";/g)].map((m) => m[1]!));
const exportedDist = new Set(
  Object.values(pkg.exports).flatMap((value) => (typeof value === "string" ? [] : [value.import ?? ""])).filter(Boolean),
);
const buildIncludes = new Set((JSON.parse(read("tsconfig.build.json")) as { include: string[] }).include);

describe("public export audit", () => {
  it("classifies every source module as public or internal", () => {
    const unclassified = sources.filter((name) => {
      if (INTERNAL.has(name)) return false;
      const stem = name.replace(/\.tsx?$/, "");
      const entry = viteEntries.get(name);
      return !barrel.has(stem) && !(entry && exportedDist.has(`./dist/${entry}.js`));
    });
    expect(unclassified).toEqual([]);
  });

  it("marks internal modules in their source", () => {
    for (const name of INTERNAL) {
      if (name === "test-setup.ts") continue;
      expect(read(`src/${name}`)).toMatch(/Internal module: not part of the public API/);
    }
  });

  it("gives every public component module a test", () => {
    const untested = sources.filter((name) => {
      if (INTERNAL.has(name)) return false;
      const stem = name.replace(/\.tsx?$/, "");
      return !new RegExp(`from "\\./${stem}(\\.js)?"`).test(tests);
    });
    expect(untested).toEqual([]);
  });

  it("builds and declares every package subpath", () => {
    for (const [subpath, value] of Object.entries(pkg.exports)) {
      if (typeof value === "string" || !value.import?.endsWith(".js")) continue;
      const entry = value.import.replace("./dist/", "").replace(/\.js$/, "");
      const source = [...viteEntries].find(([, name]) => name === entry)?.[0];
      expect(source, `${subpath} has a vite entry`).toBeDefined();
      expect(buildIncludes.has(`src/${source}`), `${subpath} is in tsconfig.build.json`).toBe(true);
      expect(value.types, `${subpath} types`).toBe(`./dist/${entry}.d.ts`);
    }
  });

  it("keeps experimental modules out of the root barrel", () => {
    for (const stem of ["text-button", "annotated-action", "polish", "agent", "app-shell", "prompt-composer"]) {
      expect(barrel.has(stem)).toBe(false);
    }
  });
});
