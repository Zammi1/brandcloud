/**
 * Props tables generated at build time from the packages themselves, so the docs never drift:
 * - @brandcloud/ui: the published declaration files (dist/*.d.ts) for types and doc comments, the source
 *   (src/*.tsx) for default values.
 * - @brandcloud/astro: the frontmatter of each .astro component (interface Props and the Astro.props defaults).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import ts from "typescript";

export interface PropRow { name: string; type: string; optional: boolean; default?: string; doc?: string }
export interface PropTable { rows: PropRow[]; extends: string[] }

const require = createRequire(import.meta.url);
const uiRoot = dirname(require.resolve("@brandcloud/ui/package.json"));
const astroRoot = dirname(require.resolve("@brandcloud/astro/package.json"));

const clean = (text: string) => text.replace(/\s+/g, " ").replace(/import\("react"\)\./g, "").trim();
const docOf = (node: ts.Node): string | undefined => {
  const docs = (node as unknown as { jsDoc?: { comment?: string | ts.NodeArray<ts.JSDocComment> }[] }).jsDoc;
  const c = docs?.[docs.length - 1]?.comment;
  if (!c) return undefined;
  return clean(typeof c === "string" ? c : c.map((p) => p.text).join(""));
};

function membersOf(node: ts.TypeElement[] | ts.NodeArray<ts.TypeElement>, sf: ts.SourceFile): PropRow[] {
  const rows: PropRow[] = [];
  for (const m of node) {
    if (!ts.isPropertySignature(m) || !m.name) continue;
    const name = m.name.getText(sf).replace(/^"|"$/g, "");
    rows.push({ name, type: m.type ? clean(m.type.getText(sf)) : "unknown", optional: Boolean(m.questionToken), doc: docOf(m) });
  }
  return rows;
}

/** Collects members of a named interface or type alias, following local heritage and intersections. */
function collect(sf: ts.SourceFile, name: string, seen = new Set<string>()): PropTable {
  const out: PropTable = { rows: [], extends: [] };
  if (seen.has(name)) return out;
  seen.add(name);
  const locals = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  sf.forEachChild((n) => {
    if ((ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) && n.name) locals.set(n.name.text, n);
  });
  const decl = locals.get(name);
  if (!decl) return out;
  const visitType = (t: ts.TypeNode) => {
    if (ts.isTypeLiteralNode(t)) out.rows.push(...membersOf(t.members, sf));
    else if (ts.isIntersectionTypeNode(t) || ts.isUnionTypeNode(t)) t.types.forEach(visitType);
    else if (ts.isParenthesizedTypeNode(t)) visitType(t.type);
    else if (ts.isTypeReferenceNode(t) && ts.isIdentifier(t.typeName) && locals.has(t.typeName.text)) {
      const sub = collect(sf, t.typeName.text, seen);
      out.rows.push(...sub.rows);
      out.extends.push(...sub.extends);
    } else out.extends.push(clean(t.getText(sf)));
  };
  if (ts.isInterfaceDeclaration(decl)) {
    for (const h of decl.heritageClauses ?? []) {
      for (const e of h.types) {
        const base = e.expression.getText(sf);
        if (locals.has(base)) {
          const sub = collect(sf, base, seen);
          out.rows.push(...sub.rows);
          out.extends.push(...sub.extends);
        } else out.extends.push(clean(e.getText(sf)));
      }
    }
    out.rows.push(...membersOf(decl.members, sf));
  } else visitType(decl.type);
  // Later declarations of a name win (the union branches repeat `title`).
  const byName = new Map<string, PropRow>();
  for (const r of out.rows) byName.set(r.name, byName.has(r.name) ? { ...byName.get(r.name)!, type: `${byName.get(r.name)!.type} | ${r.type}` } : r);
  return { rows: [...byName.values()], extends: [...new Set(out.extends)] };
}

/** Default values from the destructured first parameter of the component function in the source. */
function defaultsIn(sourceText: string, fileName: string, fnName: string): Record<string, string> {
  const sf = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Record<string, string> = {};
  const visit = (n: ts.Node) => {
    if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) && n.name?.text === fnName) {
      const p = n.parameters[0];
      if (p && ts.isObjectBindingPattern(p.name)) {
        for (const el of p.name.elements) {
          if (!el.initializer) continue;
          const key = (el.propertyName ?? el.name).getText(sf);
          found[key] = clean(el.initializer.getText(sf));
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
}

const cache = new Map<string, ts.SourceFile>();
function uiDecl(file: string): ts.SourceFile {
  if (!cache.has(file)) {
    const text = readFileSync(join(uiRoot, "dist", `${file}.d.ts`), "utf8");
    cache.set(file, ts.createSourceFile(`${file}.d.ts`, text, ts.ScriptTarget.Latest, true));
  }
  return cache.get(file)!;
}

/** Props of a @brandcloud/ui component, e.g. uiProps("button", "Button"). */
export function uiProps(file: string, component: string, typeName = `${component}Props`): PropTable {
  const table = collect(uiDecl(file), typeName);
  let defaults: Record<string, string> = {};
  try {
    defaults = defaultsIn(readFileSync(join(uiRoot, "src", `${file}.tsx`), "utf8"), `${file}.tsx`, component);
  } catch {
    /* no source shipped: types only */
  }
  return { rows: table.rows.map((r) => (defaults[r.name] ? { ...r, default: defaults[r.name] } : r)), extends: table.extends };
}

/** Props of a @brandcloud/astro component, read from its frontmatter. */
export function astroProps(component: string): PropTable {
  const text = readFileSync(join(astroRoot, "src", "components", `${component}.astro`), "utf8");
  const front = text.split(/^---\s*$/m)[1] ?? "";
  const sf = ts.createSourceFile(`${component}.ts`, front, ts.ScriptTarget.Latest, true);
  let table = collect(sf, "Props");
  if (component === "Button") {
    const common = collect(sf, "Common");
    table = { rows: common.rows, extends: ["Any <a> attribute when href is set, otherwise <button> attributes"] };
  }
  const defaults: Record<string, string> = {};
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer && /Astro\.props/.test(n.initializer.getText(sf))) {
      for (const el of n.name.elements) if (el.initializer) defaults[(el.propertyName ?? el.name).getText(sf)] = clean(el.initializer.getText(sf));
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return { rows: table.rows.map((r) => (defaults[r.name] ? { ...r, default: defaults[r.name] } : r)), extends: table.extends.filter((e) => e !== "Common") };
}
