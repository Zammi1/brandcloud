import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Inspect CSS with the parser used by this package's Vite dependency; no runtime dependency.
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve('vite'))('postcss');
const read = (name: string) => readFileSync(resolve('src', name), 'utf8');
const privateSelector = /brand-(?:agent|app-shell|tool-call|prompt-composer|artifact|conversation|execution|review)/;
function imports(name: string): string[] { return [...read(name).matchAll(/@import "\.\/([^\"]+)";/g)].map((match) => match[1]!); }
function fingerprint(css: string): string {
  const records: string[] = [];
  postcss.parse(css).walkRules((node: any) => {
    const context: string[] = []; let parent = node.parent;
    while (parent && parent.type !== 'root') { context.unshift(`${parent.name} ${parent.params}`); parent = parent.parent; }
    records.push(JSON.stringify([context, node.selector.replace(/\s+/g, ' ').trim(), node.nodes.map((declaration: any) => [declaration.prop, declaration.value, declaration.important || false])]));
  });
  return createHash('sha256').update(records.sort().join('\n')).digest('hex');
}
describe('additive foundation stylesheet source boundary', () => {
  it('styles.css and public.css import the same free stylesheets', () => {
    expect(imports('styles.css')).toEqual(imports('public.css'));
  });
  it('emits public-only CSS and imported source metadata after the package build', () => {
    const css = readFileSync(resolve('dist/public.css'), 'utf8');
    const map = JSON.parse(readFileSync(resolve('dist/public.css.map'), 'utf8'));
    expect(css).not.toMatch(/\.brand-(agent|app-shell|tool-call|prompt-composer|artifact|conversation|execution|review)/);
    const publicSources = ['public.css', ...imports('public.css')];
    expect(map.sources).toEqual(publicSources.map((name) => `../src/${name}`));
    expect(map.sourcesContent).toEqual(publicSources.map(read));
    expect(map.mappings).toBe('');
    expect(readFileSync(resolve('dist/styles.css'), 'utf8')).not.toMatch(/\.brand-(?:agent|app-shell|tool-call|prompt-composer|artifact|conversation|execution|review)/);
  });
  it('public entry contains no private selector or animation families', () => {
    expect(imports('public.css').slice(0, 5)).toEqual(['polish.css', 'popover.css', 'menu.css', 'core.css', 'button.css']);
    for (const name of imports('public.css')) {
      const root = postcss.parse(read(name));
      root.walkRules((rule: any) => expect(rule.selector).not.toMatch(privateSelector));
      root.walkAtRules(/keyframes$/, (rule: any) => expect(rule.params).not.toMatch(/agent|artifact|composer|conversation|execution|review/));
      expect(imports(name)).toEqual([]);
    }
    expect(read('button.css')).toContain('.brand-button');
    const core = read('core.css');
    for (const family of ['dialog', 'drawer', 'meter', 'input', 'select', 'checkbox', 'tabs', 'toast']) expect(core).toContain(`.brand-${family}`);
  });
});
