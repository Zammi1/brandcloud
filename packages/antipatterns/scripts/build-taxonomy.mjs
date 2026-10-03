// Writes research/TAXONOMY.md from rules.json (single source of truth).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, RULES } from '../lib/engine.mjs';
const all = [...RULES.rules, ...(RULES.copyRules ?? [])];
let md = `# Taxonomy of AI design tells\n\nGenerated from rules.json v${RULES.version} on ${new Date().toISOString().slice(0, 10)}. ${all.length} rules with pairs and detection, plus ${RULES.mirroredMotionRules?.rules.length || 0} motion rules mirrored from @brandcloud/motion (documented only).\nIds are stable: never renumber, only add. Source ids are listed with title, author, date and URL in research/sources.json and rules.json \`sources\`.\n\n`;
for (const [cat, name] of Object.entries(RULES.categories)) {
  const list = all.filter((r) => r.category === cat);
  md += `## ${name} (${cat})\n\n| Id | Tell | Severity | Section types | Sources |\n|---|---|---|---|---|\n`;
  for (const r of list) md += `| ${r.id} | ${r.title} | ${r.severity}${r.houseRule ? ' (house rule)' : ''} | ${(r.sectionTypes || []).join(', ')} | ${(r.sources || []).join(' ') || (r.alsoFrom || []).join('; ')} |\n`;
  md += '\n';
}
if (RULES.mirroredMotionRules) {
  md += `## Motion rules mirrored from @brandcloud/motion (not yet detected here)\n\n| Id | Tell | Severity |\n|---|---|---|\n`;
  for (const r of RULES.mirroredMotionRules.rules) md += `| ${r.id} | ${r.title} | ${r.severity} |\n`;
}
md += `\n## Gradient policy\n\n${RULES.gradientPolicy.summary}\n\nGood:\n${RULES.gradientPolicy.good.map((g) => '- ' + g).join('\n')}\n\nBad:\n${RULES.gradientPolicy.bad.map((g) => '- ' + g).join('\n')}\n`;
writeFileSync(resolve(ROOT, 'research/TAXONOMY.md'), md);
console.log('research/TAXONOMY.md written');
