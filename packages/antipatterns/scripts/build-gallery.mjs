// Builds gallery.html: every rule with its bad vs good screenshots side by side, filterable by section type,
// plus the motion rules documented by @brandcloud/motion.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, RULES } from '../lib/engine.mjs';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rules = [...RULES.rules, ...(RULES.copyRules ?? [])];
const order = Object.keys(RULES.categories);

function detectSummary(r) {
  if (r.detect.kind === 'regex') return `Copy regex, ${r.detect.patterns.length} pattern(s), fires at ${r.detect.minDistinct ? r.detect.minDistinct + ' different words' : (r.detect.minHits || 1) + ' hit(s)'}`;
  return `DOM check <code>${esc(r.detect.check)}</code> ${esc(JSON.stringify(r.detect.params))}`;
}

function ruleCard(r) {
  const p = `patterns/${r.id}`;
  const shot = (k, w) => `${p}/shots/${k}-${w}.png`;
  const src = (r.sources || []).map((s) => RULES.sources?.[s] ? `<a href="${esc(RULES.sources[s].url)}" title="${esc(RULES.sources[s].title)} (${esc(RULES.sources[s].published)})">${s}</a>` : s).join(' ');
  return `
<article class="rule" id="${r.id}" data-types="${esc((r.sectionTypes || []).join(' '))}">
  <header class="rule-head">
    <div>
      <p class="rid">${r.id} <span class="sev sev-${r.severity}">${r.severity}</span>${r.houseRule ? ' <span class="sev">house rule</span>' : ''}</p>
      <h3>${esc(r.title)}</h3>
    </div>
    <p class="types">${(r.sectionTypes || []).map(esc).join(', ')}</p>
  </header>
  <div class="pair">
    <figure class="side bad">
      <figcaption><strong>Bad</strong> <a href="${p}/bad.html">open</a> <a href="${shot('bad', 390)}">390</a></figcaption>
      <a href="${shot('bad', 1440)}"><img loading="lazy" src="${shot('bad', 1440)}" alt="${esc(r.title)}: bad example at 1440 wide"></a>
    </figure>
    <figure class="side good">
      <figcaption><strong>Good</strong> <a href="${p}/good.html">open</a> <a href="${shot('good', 390)}">390</a></figcaption>
      <a href="${shot('good', 1440)}"><img loading="lazy" src="${shot('good', 1440)}" alt="${esc(r.title)}: fixed example at 1440 wide"></a>
    </figure>
  </div>
  <dl class="meta">
    <div><dt>What</dt><dd>${esc(r.description)}</dd></div>
    <div><dt>Why it reads as AI</dt><dd>${esc(r.whyAI)}</dd></div>
    <div><dt>Fix</dt><dd>${esc(r.fix)}</dd></div>
    <div><dt>Detection</dt><dd>${detectSummary(r)}${r.detect.notes ? '. ' + esc(r.detect.notes) : ''}</dd></div>
    <div><dt>Sources</dt><dd>${src || '<span class="muted">none in the article research</span>'}${(r.alsoFrom || []).length ? '; ' + r.alsoFrom.map(esc).join('; ') : ''}</dd></div>
  </dl>
</article>`;
}

const sections = order.map((cat) => {
  const list = rules.filter((r) => r.category === cat);
  if (!list.length) return '';
  const intro = cat === 'MOT' ? '<p class="note">Screenshots cannot show motion. Open the html files: the bad pages move, the good pages do not. The detector proves it with getAnimations(), computed delays and pointer and scroll probes.</p>'
    : cat === 'GRAD' ? `<p class="note">${esc(RULES.gradientPolicy.summary)} Allowed: ${RULES.gradientPolicy.good.map(esc).join('; ')}.</p>` : '';
  return `<section class="cat" id="cat-${cat}"><h2>${esc(RULES.categories[cat])} <span class="count">${list.length}</span></h2>${intro}${list.map(ruleCard).join('\n')}</section>`;
}).join('\n');

const mirrored = RULES.mirroredMotionRules ? RULES.mirroredMotionRules.rules.map((r) => `<li><strong>${r.id}</strong> ${esc(r.title)} <span class="muted">(${r.severity})</span></li>`).join('') : '';
const types = RULES.sectionTypes || [];

const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI design antipatterns: bad vs good gallery</title>
<style>
@font-face { font-family: "Hanken Grotesk"; src: url("patterns/_shared/fonts/HankenGrotesk-Variable.woff2") format("woff2"); font-weight: 100 900; }
:root { --ink: #0b0b0c; --ink-2: #2b2a27; --muted: #5a564e; --line: #d6d1c6; --paper: #f3f1ec; --card: #fbfaf7; --accent: #1d4ed8; --bad: #9f1d1d; --good: #1d5e3a; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.5 "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif; }
a { color: var(--accent); }
.wrap { max-width: 1320px; margin: 0 auto; padding: 0 32px; }
.top { padding: 48px 0 28px; border-bottom: 1px solid var(--ink); }
h1 { font-size: 44px; line-height: 1.05; letter-spacing: -0.02em; margin: 0 0 14px; font-weight: 620; max-width: 22ch; }
.top p { max-width: 70ch; color: var(--ink-2); margin: 0 0 10px; }
.bar { position: sticky; top: 0; z-index: 5; background: var(--paper); border-bottom: 1px solid var(--line); padding: 12px 0; }
.bar .wrap { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; font-size: 14.5px; }
.bar label { font-weight: 600; }
.bar select { font: inherit; padding: 6px 8px; border: 1px solid var(--line); border-radius: 4px; background: #fff; }
.cat { padding: 40px 0 8px; }
.cat h2 { font-size: 30px; letter-spacing: -0.015em; margin: 0 0 8px; font-weight: 620; }
.count { color: var(--muted); font-weight: 450; font-size: 18px; }
.note { color: var(--ink-2); max-width: 80ch; margin: 0 0 16px; }
.rule { border-top: 1px solid var(--ink); padding: 22px 0 34px; }
.rule-head { display: flex; justify-content: space-between; gap: 20px; align-items: baseline; }
.rule h3 { font-size: 22px; margin: 2px 0 14px; letter-spacing: -0.01em; font-weight: 620; }
.rid { margin: 0; font-size: 14px; color: var(--muted); font-variant-numeric: tabular-nums; }
.types { font-size: 14px; color: var(--muted); margin: 0; }
.sev { display: inline-block; margin-left: 8px; font-size: 12.5px; padding: 1px 7px; border: 1px solid var(--line); border-radius: 3px; color: var(--ink-2); }
.sev-high { border-color: var(--bad); color: var(--bad); }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.side { margin: 0; }
.side figcaption { font-size: 14px; margin-bottom: 6px; display: flex; gap: 12px; }
.bad figcaption strong { color: var(--bad); } .good figcaption strong { color: var(--good); }
.side img { width: 100%; height: 330px; object-fit: cover; object-position: top; display: block; border: 1px solid var(--line); background: #fff; }
.meta { margin: 18px 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 28px; }
.meta div { min-width: 0; }
.meta dt { font-size: 13px; color: var(--muted); }
.meta dd { margin: 2px 0 0; font-size: 14.5px; color: var(--ink-2); overflow-wrap: anywhere; }
.meta code { font-size: 12.5px; }
.muted { color: var(--muted); }
.warn { border: 1px solid var(--bad); color: var(--bad); padding: 12px 16px; border-radius: 4px; max-width: 80ch; }
.score { font-weight: 600; color: var(--ink); }
.noimg { width: 220px; height: 140px; display: grid; place-items: center; border: 1px dashed var(--line); color: var(--muted); font-size: 13px; }
table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
td, th { text-align: left; padding: 8px 10px 8px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
td.num { font-variant-numeric: tabular-nums; }
.hidden { display: none; }
footer { padding: 40px 0 60px; color: var(--muted); font-size: 14px; }
@media (max-width: 900px) { .pair { grid-template-columns: 1fr; } .meta { grid-template-columns: 1fr; } .side img { height: 240px; } h1 { font-size: 34px; } }
</style>
</head>
<body>
<div class="wrap top">
  <h1>AI design antipatterns: bad vs good</h1>
  <p>${rules.length} tells of generated web design, each with a bad page, the same content fixed, screenshots and a detector rule. Run <code>node detect.mjs &lt;url or file&gt;</code> before shipping UI, then compare the section you built with the pairs below.</p>
  <p class="small">Generated ${new Date().toISOString().slice(0, 10)} from rules.json v${esc(RULES.version)}. Screenshots at 1440 wide; the 390 link shows mobile.</p>
</div>
<nav class="bar" aria-label="Filter">
  <div class="wrap">
    <label for="type">Section type</label>
    <select id="type"><option value="">All</option>${types.map((t) => `<option>${esc(t)}</option>`).join('')}</select>
    ${order.map((c) => `<a href="#cat-${c}">${esc(RULES.categories[c])}</a>`).join('')}
  </div>
</nav>
<main class="wrap">
${sections}
${mirrored ? `<section class="cat"><h2>More motion rules from @brandcloud/motion <span class="count">${RULES.mirroredMotionRules.rules.length}</span></h2><p class="note">${esc(RULES.mirroredMotionRules.status)}</p><ul>${mirrored}</ul></section>` : ''}
</main>
<footer class="wrap">Anti-AI design rules. Synthetic pairs use five invented businesses; names and figures are fictional.</footer>
<script>
const sel = document.getElementById('type');
sel.addEventListener('change', () => {
  const t = sel.value;
  document.querySelectorAll('.rule').forEach((el) => el.classList.toggle('hidden', !!t && !el.dataset.types.split(' ').includes(t)));
  document.querySelectorAll('.cat').forEach((c) => { const rs = c.querySelectorAll('.rule'); if (rs.length) c.classList.toggle('hidden', [...rs].every((r) => r.classList.contains('hidden'))); });
});
</script>
</body>
</html>
`;
writeFileSync(resolve(ROOT, 'gallery.html'), html);
console.log(`gallery.html: ${rules.length} rules`);
