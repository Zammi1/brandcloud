// Colour / gradient and typography pairs.
import { kitchensHero, fieldnoteHero } from './blocks.mjs';

export default [
  {
    id: 'AP-GRAD-01', biz: 'hp', title: 'Harbour &amp; Pine: fitted kitchens',
    note: 'AI gradient (purple to pink, indigo to cyan) vs tonal light-model depth gradient (#3b82f6 to #1d4ed8, sheen, same-hue shadow)',
    css: `
.offer { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.tile { border-radius: var(--r-md); padding: 24px; min-height: 168px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; }
.tile h3 { font-size: 19px; }
.tile .price-sm { font-size: 28px; font-weight: 620; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.tile-paper { background: var(--card); border: 1px solid var(--line); }
/* level tile: same tonal light model as the button, navy family */
.tile-navy { color: #fff; background: linear-gradient(180deg, #24418f, #142a63);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 1px 2px rgba(15, 31, 77, 0.3), 0 16px 28px -18px rgba(20, 42, 99, 0.7); }
.tile-navy h3 { color: #fff; }
.tile-navy p { color: #d9e1f5; }
.btn-lg { min-height: 58px; padding: 0 30px; font-size: 17px; }
@media (max-width: 520px) { .offer { grid-template-columns: 1fr; } .tile { min-height: 0; } }`,
    good: {
      body: `
<section class="wrap hero">
  <h1>Solid oak and painted kitchens, made in our Merewick workshop.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">We measure, draw, build and fit. One team from survey to the last hinge, usually eight to ten weeks.</p>
      <div class="actions"><a class="btn btn-depth btn-lg" href="#">Book a free survey</a><a class="textlink" href="#">See 2025 kitchens</a></div>
    </div>
    <div class="offer" aria-label="Two ways to work with us">
      <div class="tile tile-paper"><h3>Design visit</h3><p class="muted">Measured drawing and a fixed quote.</p><span class="price-sm">&pound;180</span></div>
      <div class="tile tile-navy"><h3>Full kitchen</h3><p>Built and fitted. Typical 3 metre run.</p><span class="price-sm">from &pound;14,500</span></div>
    </div>
  </div>
</section>`,
    },
    bad: {
      css: `
/* ANTIPATTERN AP-GRAD-01: hue-shifting purple to pink gradients with no light logic */
.btn-depth, .btn-depth:hover { background: linear-gradient(90deg, #7c3aed, #db2777); box-shadow: 0 0 32px rgba(168, 85, 247, 0.55); text-shadow: none; }
.btn-depth::before { display: none; }
.tile-navy { background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%); box-shadow: none; }`,
    },
  },
  {
    id: 'AP-GRAD-02', biz: 'hp', title: 'Harbour &amp; Pine: kitchens that last',
    note: 'gradient text on the headline accent words',
    good: { body: kitchensHero('Kitchens built in Merewick to last forty years.') },
    bad: {
      swap: [['to last forty years.', 'to last <span class="grad">forty years.</span>']],
      css: `/* ANTIPATTERN AP-GRAD-02 */
.grad { background: linear-gradient(90deg, #6366f1, #a855f7 50%, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent; }`,
    },
  },
  {
    id: 'AP-GRAD-03', biz: 'ss', title: 'Saltmarsh Sea School: learn to sail',
    note: 'blurred glow blobs floating behind the hero',
    css: `.hero { position: relative; isolation: isolate; }`,
    good: {
      body: `
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
</section>`,
    },
    bad: {
      swap: [['<section class="wrap hero">', '<section class="wrap hero">\n  <div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div>']],
      css: `/* ANTIPATTERN AP-GRAD-03 */
.blob { position: absolute; width: 440px; height: 440px; border-radius: 50%; filter: blur(90px); opacity: 0.55; z-index: -1; }
.b1 { background: #a855f7; top: -40px; left: -80px; }
.b2 { background: #22d3ee; top: 160px; right: -40px; }`,
    },
  },
  {
    id: 'AP-GRAD-04', biz: 'ss', title: 'Saltmarsh Sea School: course dates',
    note: 'mesh / aurora background made of several coloured radial gradients',
    css: `.band .split { align-items: start; }`,
    good: {
      body: `
<section class="wrap hero hero-tight">
  <h1>Course dates for the 2027 season.</h1>
  <p class="lead" style="margin-top:24px">Booking opens on 1 November. Places are held for 48 hours while you pay the deposit.</p>
</section>
<section class="band navy">
  <div class="wrap split">
    <div class="stack-lg">
      <h2>Weekend courses</h2>
      <p class="body">Saturday and Sunday, 9:30am to 4:30pm. We launch from Merewick Hard and take the theory into the clubhouse when the wind drops.</p>
      <div class="actions"><a class="btn btn-white" href="#">Hold a place</a></div>
    </div>
    <div class="rows rows-light">
      <div class="row"><span class="n">17 to 18 April</span><h3>Stage 1</h3><p>3 places left</p></div>
      <div class="row"><span class="n">8 to 9 May</span><h3>Stage 1</h3><p>Full, waiting list open</p></div>
      <div class="row"><span class="n">22 to 23 May</span><h3>Stage 2</h3><p>6 places</p></div>
      <div class="row"><span class="n">5 to 6 June</span><h3>Stage 1</h3><p>5 places</p></div>
    </div>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-GRAD-04 */
.navy { background:
  radial-gradient(at 15% 20%, rgba(168, 85, 247, 0.85) 0, transparent 45%),
  radial-gradient(at 85% 10%, rgba(34, 211, 238, 0.8) 0, transparent 40%),
  radial-gradient(at 60% 100%, rgba(236, 72, 153, 0.75) 0, transparent 50%),
  #0f172a; }`,
    },
  },
  {
    id: 'AP-GRAD-05', biz: 'fn', title: 'Fieldnote: job sheets for tree surgeons',
    note: 'coloured glows on the button, panel and headline',
    good: { body: fieldnoteHero },
    bad: {
      css: `/* ANTIPATTERN AP-GRAD-05 */
.btn-depth, .btn-depth:hover { box-shadow: 0 0 28px rgba(59, 130, 246, 0.8); }
.panel { box-shadow: 0 0 44px rgba(99, 102, 241, 0.45); border-color: rgba(99, 102, 241, 0.6); }
h1 { text-shadow: 0 0 26px rgba(59, 130, 246, 0.55); }
.btn-ink { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }`,
    },
  },
  {
    id: 'AP-GRAD-06', biz: 'll', title: 'Ledgerline: fixed-price bookkeeping',
    note: 'gradient borders on every card',
    good: {
      body: `
<section class="wrap hero hero-tight">
  <h1>Monthly bookkeeping for trades, at a fixed price.</h1>
  <p class="lead" style="margin-top:24px">You send receipts and read-only bank access. We reconcile, chase what is missing and file your VAT on time.</p>
</section>
<section class="wrap" style="padding-bottom:96px">
  <div class="plans">
    <div class="plan"><h3>Books only</h3><div class="price">&pound;95 <span class="per">a month</span></div><p class="muted">Sole traders under the VAT threshold.</p><ul class="plain-list"><li>Bank reconciled weekly</li><li>Receipts matched from WhatsApp photos</li></ul><a class="textlink" href="#">Start with books only</a></div>
    <div class="plan"><h3>Books and VAT</h3><div class="price">&pound;140 <span class="per">a month</span></div><p class="muted">Most of our clients. Quarterly VAT filed for you.</p><ul class="plain-list"><li>Everything in books only</li><li>VAT return checked and filed</li></ul><a class="btn btn-depth btn-sm" href="#">Start books and VAT</a></div>
    <div class="plan"><h3>Year end</h3><div class="price">&pound;650 <span class="per">once</span></div><p class="muted">Accounts and tax return, even if we did not keep the books.</p><ul class="plain-list"><li>Self assessment or company accounts</li><li>Ready by the end of October</li></ul><a class="textlink" href="#">Book year end</a></div>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-GRAD-06 */
.plans { border-top: 0; gap: 20px; }
.plan, .plan:first-child, .plan:last-child { padding: 28px; border: 2px solid transparent; border-radius: 16px;
  background: linear-gradient(var(--card), var(--card)) padding-box, linear-gradient(135deg, #6366f1, #ec4899, #22d3ee) border-box; }`,
    },
  },
  {
    id: 'AP-GRAD-07', biz: 'ss', title: 'Saltmarsh Sea School: kit list',
    note: 'glassmorphism panel holding body text',
    css: `.kit { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 64px; align-items: start; }
.card-solid { background: var(--paper); color: var(--ink); border-radius: var(--r-md); padding: 32px; }
.card-solid h3 { color: var(--ink); margin-bottom: 14px; }
.card-solid li { color: var(--ink-2); }
@media (max-width: 860px) { .kit { grid-template-columns: 1fr; gap: 32px; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight">
  <h1>What to bring on your first sailing weekend.</h1>
</section>
<section class="band navy">
  <div class="wrap kit">
    <div class="stack">
      <h2>You will get wet.</h2>
      <p class="body">We lend wetsuits, buoyancy aids and spray tops in every size. Bring the things we cannot lend, and a change of clothes for the drive home.</p>
    </div>
    <div class="card-solid">
      <h3>Bring</h3>
      <ul class="plain-list">
        <li>Old trainers or wetsuit boots, not flip-flops</li>
        <li>A warm layer that can get wet (fleece, not cotton)</li>
        <li>Sun cream and a hat with a strap, even in April</li>
        <li>Lunch and a refillable bottle. Tea and coffee are on us.</li>
      </ul>
    </div>
  </div>
</section>`,
    },
    bad: {
      swap: [['<div class="card-solid">', '<div class="card-solid glass">']],
      css: `/* ANTIPATTERN AP-GRAD-07 */
.glass { background: rgba(255, 255, 255, 0.12); color: #fff; border: 1px solid rgba(255, 255, 255, 0.28); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); border-radius: 20px; }
.glass h3 { color: #fff; } .glass li { color: rgba(255, 255, 255, 0.82); }`,
    },
  },
  {
    id: 'AP-GRAD-08', biz: 'fn', title: 'Fieldnote: dark theme',
    note: 'near-black page with neon cyan, magenta and lime accents',
    css: `
body { background: #0b0b0c; color: #ece9e2; }
.bar, .footer { border-color: #2a2a2d; }
.brand, h1, h2, h3 { color: #f6f4ef; }
.brand small, .muted, .footer { color: #a39f95; }
.nav a:not(.btn) { color: #d6d2c9; }
.btn-ink { background: #f3f1ec; color: #0b0b0c; }
.lead { color: #d9d5cc; }
.panel { background: #161618; border-color: #2c2c30; }
.plain-list li { color: #d6d2c9; }`,
    good: { body: fieldnoteHero },
    bad: {
      css: `/* ANTIPATTERN AP-GRAD-08 */
body { background: #05060a; }
.btn-depth, .btn-depth:hover { background: #22d3ee; color: #031014; text-shadow: none; box-shadow: 0 0 26px rgba(34, 211, 238, 0.7); }
.btn-depth::before { display: none; }
.panel { background: #0a0c14; border-color: #d946ef; box-shadow: 0 0 30px rgba(217, 70, 239, 0.35); }
.panel h3 { color: #e879f9; }
.lead { color: #a3e635; }
.textlink { color: #22d3ee; }`,
    },
  },
  {
    id: 'AP-TYPE-01', biz: 'll', title: 'Ledgerline: bookkeeping for trades',
    note: 'untouched defaults: Inter / system stack, Tailwind slate greys on white',
    good: {
      body: `
<section class="wrap hero">
  <h1>Bookkeeping for builders, electricians and plumbers in Wessex.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Photograph your receipts and send them on WhatsApp. We do the rest and tell you what you owe before HMRC does.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Send us your books</a><a class="textlink" href="#">See prices</a></div>
    </div>
    <div class="rows">
      <div class="row"><span class="n">Weekly</span><h3>Bank reconciled</h3><p>Every transaction matched to a receipt or flagged.</p></div>
      <div class="row"><span class="n">Quarterly</span><h3>VAT filed</h3><p>Checked, sent to you, filed when you say yes.</p></div>
      <div class="row"><span class="n">Yearly</span><h3>Accounts done</h3><p>Ready by October, not the night before the deadline.</p></div>
    </div>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-TYPE-01: default font stack and Tailwind slate greys on white */
body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #0f172a; font-feature-settings: normal; }
h1, h2, h3, .brand { color: #0f172a; font-weight: 700; }
.lead, .row p, .brand small, .footer, .footer span { color: #64748b; }
.row .n { color: #94a3b8; }
.nav a:not(.btn) { color: #475569; }
.bar, .footer, .row { border-color: #e2e8f0; }
.rows { border-top-color: #e2e8f0; }
.textlink { color: #0f172a; }`,
    },
  },
  {
    id: 'AP-TYPE-02', biz: 'll', title: 'Ledgerline: services and prices',
    note: 'monospace caps kickers above every heading',
    css: `.kicker { font-family: ui-monospace, "DejaVu Sans Mono", Menlo, monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--accent); margin: 0 0 14px; }`,
    good: {
      body: `
<section class="wrap hero hero-tight">
  <h1>We keep the books for 62 trades businesses across Wessex.</h1>
</section>
<section class="wrap section split">
  <div><h2>What we do each month</h2></div>
  <div class="rows">
    <div class="row"><span class="n">By the 5th</span><h3>Last month reconciled</h3><p>Every bank line matched to a receipt, or a list of what is missing sent to you on WhatsApp.</p></div>
    <div class="row"><span class="n">By the 10th</span><h3>Profit and cash</h3><p>One page: what came in, what went out, and what to put aside for tax.</p></div>
  </div>
</section>
<section class="wrap section split">
  <div><h2>What it costs</h2></div>
  <div class="stack"><p class="lead">&pound;95 a month for books only, &pound;140 with VAT returns. Year-end accounts are &pound;650.</p><a class="textlink" href="#">Full price list</a></div>
</section>`,
    },
    bad: {
      swap: [
        ['<div><h2>What we do each month</h2></div>', '<div><p class="kicker">// SERVICES</p><h2>What we do each month</h2></div>'],
        ['<div><h2>What it costs</h2></div>', '<div><p class="kicker">[ PRICING ]</p><h2>What it costs</h2></div>'],
        ['<section class="wrap hero hero-tight">\n  <h1>', '<section class="wrap hero hero-tight">\n  <p class="kicker">&gt; BOOKKEEPING_FOR_TRADES</p>\n  <h1>'],
      ],
    },
  },
  {
    id: 'AP-TYPE-03', biz: 'hp', title: 'Harbour &amp; Pine: how long it takes',
    note: 'accent-coloured words and an italic serif accent word inside headlines',
    good: {
      body: `
<section class="wrap hero hero-tight">
  <h1>Kitchens drawn, built and fitted by the same six people.</h1>
  <p class="lead" style="margin-top:28px">No subcontracted fitters. The person who made your drawers is the one who hangs them.</p>
</section>
<section class="wrap section split">
  <h2>Most kitchens take eight to ten weeks from survey.</h2>
  <div class="rows">
    <div class="row"><span class="n">Week 1</span><h3>Survey</h3><p>We measure, check walls and services, and photograph everything.</p></div>
    <div class="row"><span class="n">Week 2</span><h3>Drawings and fixed price</h3><p>Plan, elevations and a quote that does not change unless you change the design.</p></div>
    <div class="row"><span class="n">Weeks 3 to 7</span><h3>Workshop</h3><p>Carcasses, doors and drawers built and painted in Merewick.</p></div>
    <div class="row"><span class="n">Weeks 8 to 10</span><h3>Fitting</h3><p>Usually five to eight working days in your home.</p></div>
  </div>
</section>`,
    },
    bad: {
      swap: [
        ['built and fitted by the same six people.', 'built and fitted <span class="accent">by the same six people.</span>'],
        ['Most kitchens take eight to ten weeks from survey.', 'Most kitchens take <em class="serif">eight to ten weeks</em> from survey.'],
      ],
      css: `/* ANTIPATTERN AP-TYPE-03 */
.accent { color: #1d4ed8; }
.serif { font-family: "Instrument Serif", "DejaVu Serif", Georgia, serif; font-style: italic; font-weight: 400; }`,
    },
  },
];
