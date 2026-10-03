// Motion pairs. Screenshots cannot show motion, so each bad.html carries a comment and the gallery
// explains what moves; the detector proves it with getAnimations(), computed delays and pointer/scroll probes.
import { fieldnoteHero, fieldnoteShotHero, jobsheetFigure, shotCss } from './blocks.mjs';

const physioPage = `
<section class="wrap hero">
  <h1>Physiotherapy in Kingsport for backs, knees and running injuries.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Evening appointments until 8pm, Monday to Thursday. Free parking behind the clinic.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Book online</a><a class="textlink" href="#">Prices</a></div>
    </div>
    <p class="body">Six in ten of our patients come in with back or neck pain from desks, vans and lifting. The rest are mostly runners and people recovering from surgery.</p>
  </div>
</section>
<section class="wrap section split">
  <h2>What we treat</h2>
  <div class="rows">
    <div class="row"><span class="n">Most common</span><h3>Back and neck pain</h3><p>Assessment, hands-on treatment and three exercises you will actually do.</p></div>
    <div class="row"><span class="n">In season</span><h3>Sports injuries</h3><p>Ankles, knees and hamstrings, with same-week appointments.</p></div>
    <div class="row"><span class="n">After surgery</span><h3>Rehabilitation</h3><p>Knee and hip replacements and ACL repairs, working from your surgeon's protocol.</p></div>
    <div class="row"><span class="n">60 minutes</span><h3>Running assessment</h3><p>Treadmill video and a written plan, &pound;85.</p></div>
  </div>
</section>`;

const sailingPage = `
<section class="wrap hero">
  <h1>Learn to sail on Merewick Harbour, two people to a boat.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">RYA Stage 1 and 2 dinghy courses from April to October. Four instructors, eight boats and a warm changing room at the end of the day.</p>
      <div class="actions"><a class="btn btn-depth" href="#">See 2027 dates</a><a class="textlink" href="#">What to bring</a></div>
    </div>
    <dl class="facts">
      <div><dt>Next course</dt><dd>Sat 17 and Sun 18 April 2027</dd></div>
      <div><dt>Two-day course</dt><dd>&pound;295, boat and buoyancy aid included</dd></div>
      <div><dt>Ages</dt><dd>12 and up, adults welcome</dd></div>
    </dl>
  </div>
</section>
<section class="band navy">
  <div class="wrap split">
    <div class="stack"><h2>Weekend courses</h2><p class="body">Saturday and Sunday, 9:30am to 4:30pm, launching from Merewick Hard.</p></div>
    <div class="rows rows-light">
      <div class="row"><span class="n">17 to 18 April</span><h3>Stage 1</h3><p>3 places left</p></div>
      <div class="row"><span class="n">8 to 9 May</span><h3>Stage 1</h3><p>Full, waiting list open</p></div>
      <div class="row"><span class="n">22 to 23 May</span><h3>Stage 2</h3><p>6 places</p></div>
    </div>
  </div>
</section>`;

const kitchenWork = `
<section class="wrap hero hero-tight"><h1>Three kitchens we finished this year.</h1></section>
<section class="wrap section">
  <div class="projects">
    <article class="proj"><h3>Lowfield</h3><p>Painted shaker in a deep green, oak worktops, a larder cupboard built round the boiler.</p><p class="small">9 weeks, &pound;21,400</p></article>
    <article class="proj"><h3>Fishbourne</h3><p>Solid oak with a hand-cut walnut inlay on the island.</p><p class="small">10 weeks, &pound;27,900</p></article>
    <article class="proj"><h3>Merewick</h3><p>Small galley in a Victorian terrace, painted ivory, brass rails.</p><p class="small">7 weeks, &pound;12,800</p></article>
  </div>
</section>`;

export default [
  {
    id: 'AP-MOT-01', biz: 'np', title: 'Northgate Physio: scroll reveals',
    note: 'every block starts invisible and fades up when scrolled into view (the screenshot shows what a fast scroller, a print or a crawler sees)',
    good: { body: physioPage },
    bad: {
      css: `/* ANTIPATTERN AP-MOT-01 */
.reveal { opacity: 0; transform: translateY(28px); transition: opacity 700ms ease, transform 700ms ease; }
.reveal.in { opacity: 1; transform: none; }`,
      script: `document.querySelectorAll('main h1, main h2, main .lead, main .actions, main .body, main .row').forEach((el) => el.classList.add('reveal'));
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) e.target.classList.add('in'); }), { threshold: [0.6] });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));`,
    },
  },
  {
    id: 'AP-MOT-02', biz: 'np', title: 'Northgate Physio: staggered list',
    note: 'list rows animate in one after another with incrementing delays',
    good: { body: physioPage },
    bad: {
      css: `/* ANTIPATTERN AP-MOT-02 */
@keyframes rowIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
.rows .row { animation: rowIn 500ms ease both; }
.rows .row:nth-child(2) { animation-delay: 150ms; }
.rows .row:nth-child(3) { animation-delay: 300ms; }
.rows .row:nth-child(4) { animation-delay: 450ms; }`,
    },
  },
  {
    id: 'AP-MOT-03', biz: 'hp', title: 'Harbour &amp; Pine: project cards',
    note: 'non-clickable cards lift and scale on hover',
    css: `.projects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border-top: 1px solid var(--ink); }
.proj { padding: 24px 28px 28px 0; display: grid; gap: 10px; align-content: start; }
.proj + .proj { padding-left: 28px; border-left: 1px solid var(--line); }
.proj p { color: var(--ink-2); }
@media (max-width: 860px) { .projects { grid-template-columns: 1fr; } .proj, .proj + .proj { padding: 22px 0; border-left: 0; border-bottom: 1px solid var(--line); } }`,
    good: { body: kitchenWork },
    bad: {
      css: `/* ANTIPATTERN AP-MOT-03 */
.projects { border-top: 0; gap: 20px; }
.proj, .proj + .proj { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 26px; transition: transform 200ms ease, box-shadow 200ms ease; }
.proj:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 24px 40px -20px rgba(20, 18, 12, 0.35); }`,
    },
  },
  {
    id: 'AP-MOT-04', biz: 'ss', title: 'Saltmarsh Sea School: floating decoration',
    note: 'looping float, pulse and shimmer animations on the button and the fact list',
    good: { body: sailingPage },
    bad: {
      css: `/* ANTIPATTERN AP-MOT-04 */
@keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); } 50% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); } }
.facts { animation: floaty 4s ease-in-out infinite; }
.btn-depth { animation: pulse 2s ease-in-out infinite; }
.btn-depth::before { inset: 0; background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.45) 50%, transparent 70%) 0 0 / 200% 100%; animation: shimmer 2.4s linear infinite; }`,
    },
  },
  {
    id: 'AP-MOT-05', biz: 'll', title: 'Ledgerline: who we work for',
    note: 'endless logo marquee under a "Trusted by" label',
    css: `.clients { border-top: 1px solid var(--ink); }
.client { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 6fr); gap: 24px; padding: 22px 0; border-bottom: 1px solid var(--line); }
.client p { color: var(--ink-2); }
.marquee { overflow: hidden; margin-top: 28px; -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent); }
.track { display: flex; gap: 56px; width: max-content; animation: marquee 18s linear infinite; }
.track span { font-size: 20px; font-weight: 650; color: var(--muted); white-space: nowrap; }
@keyframes marquee { to { transform: translateX(-50%); } }
@media (max-width: 860px) { .client { grid-template-columns: 1fr; gap: 4px; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>We keep the books for 62 trades businesses across Wessex.</h1></section>
<section class="wrap section split">
  <h2>Three of them, with their permission</h2>
  <div class="clients">
    <div class="client"><h3>Kemp Roofing, Bognor Regis</h3><p>Monthly books and VAT since 2022. Last year we found &pound;3,180 of VAT they had not reclaimed.</p></div>
    <div class="client"><h3>S. Okafor Electrical, Easthope</h3><p>Year-end accounts and self assessment, filed in September.</p></div>
    <div class="client"><h3>Arun Valley Plumbing</h3><p>Books, VAT and payroll for four staff.</p></div>
  </div>
</section>`,
    },
    bad: {
      body: `
<section class="wrap hero hero-tight"><h1>We keep the books for 62 trades businesses across Wessex.</h1></section>
<section class="wrap section">
  <p class="small">Trusted by 300+ local trades</p>
  <div class="marquee"><div class="track">
    ${['Kemp Roofing', 'Okafor Electrical', 'Arun Valley Plumbing', 'Southwick Joinery', 'Downs Scaffolding', 'Lancing Glass', 'Kemp Roofing', 'Okafor Electrical', 'Arun Valley Plumbing', 'Southwick Joinery', 'Downs Scaffolding', 'Lancing Glass'].map((n) => `<span>${n}</span>`).join('')}
  </div></div>
</section>`,
    },
  },
  {
    id: 'AP-MOT-06', biz: 'fn', title: 'Fieldnote: cursor spotlight',
    note: 'a radial glow that follows the pointer across the page',
    good: { body: fieldnoteHero },
    bad: {
      swap: [['<section class="wrap hero">', '<div class="spot" aria-hidden="true"></div>\n<section class="wrap hero">']],
      css: `/* ANTIPATTERN AP-MOT-06 */
.spot { position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(520px circle at var(--x, 60%) var(--y, 30%), rgba(59, 130, 246, 0.16), transparent 45%); }
main, .wrap { position: relative; z-index: 1; }`,
      script: `addEventListener('pointermove', (e) => { document.documentElement.style.setProperty('--x', e.clientX + 'px'); document.documentElement.style.setProperty('--y', e.clientY + 'px'); });`,
    },
  },
  {
    id: 'AP-MOT-07', biz: 'fn', title: 'Fieldnote: rotating headline',
    note: 'headline word cycles with a blinking typewriter caret',
    good: { body: fieldnoteHero },
    bad: {
      swap: [['photos for tree surgeons, on one phone.', 'photos for <span id="tw">tree surgeons</span><span class="caret" aria-hidden="true"></span>, on one phone.']],
      css: `/* ANTIPATTERN AP-MOT-07 */
.caret { display: inline-block; width: 3px; height: 0.9em; margin-left: 4px; background: currentColor; vertical-align: -0.08em; animation: blink 1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }`,
      script: `const words = ['tree surgeons', 'landscapers', 'fencing crews', 'gardeners'];
let i = 0; setInterval(() => { i = (i + 1) % words.length; document.getElementById('tw').textContent = words[i]; }, 700);`,
    },
  },
  {
    id: 'AP-MOT-08', biz: 'ss', title: 'Saltmarsh Sea School: parallax shapes',
    note: 'decorative rings that drift at a different speed as you scroll',
    css: `.hero { position: relative; }`,
    good: { body: sailingPage },
    bad: {
      swap: [['<section class="wrap hero">', '<section class="wrap hero">\n  <div class="ring r1" aria-hidden="true"></div><div class="ring r2" aria-hidden="true"></div>']],
      css: `/* ANTIPATTERN AP-MOT-08 */
.ring { position: absolute; border: 1.5px solid rgba(29, 78, 216, 0.35); border-radius: 50%; pointer-events: none; }
.r1 { width: 220px; height: 220px; right: 4%; top: 30px; }
.r2 { width: 120px; height: 120px; right: 22%; top: 260px; }`,
      script: `const rings = document.querySelectorAll('.ring');
addEventListener('scroll', () => { rings.forEach((r, i) => { r.style.transform = 'translateY(' + (scrollY * (0.5 + i * 0.3)) + 'px)'; }); }, { passive: true });`,
    },
  },
  {
    id: 'AP-MOT-09', biz: 'fn', title: 'Fieldnote: spinning orb',
    note: 'a large abstract orb rotating forever where the product should be',
    css: shotCss,
    good: { body: fieldnoteShotHero() },
    bad: {
      swap: [[jobsheetFigure, `
<div class="orb" aria-hidden="true"><div class="orb-ring"></div></div>`]],
      css: `/* ANTIPATTERN AP-MOT-09 */
.orb { width: 300px; height: 300px; border-radius: 50%; margin: 0 auto; position: relative;
  background: radial-gradient(circle at 35% 30%, #93c5fd, #2563eb 55%, #1e3a8a); animation: spin 14s linear infinite; }
.orb-ring { position: absolute; inset: -24px; border-radius: 50%; border: 2px dashed rgba(29, 78, 216, 0.4); }
@keyframes spin { to { transform: rotate(360deg); } }`,
    },
  },
];
