// Layout, component and imagery pairs.
import { fieldnoteHero, fieldnoteShotHero, jobsheetFigure, shotCss } from './blocks.mjs';

// Generic line icons of the kind generators drop into every card (drawn here, not copied from a set).
const icon = (d) => `<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  heart: icon('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  bolt: icon('<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'),
  shield: icon('<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/>'),
  run: icon('<circle cx="14" cy="5" r="2"/><path d="m8 21 3-6 3 2v4M7 12l3-3 4 1 3 3"/>'),
  hand: icon('<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6H10a5 5 0 0 1-4-2l-2.5-3.5a1.5 1.5 0 0 1 2.3-1.9L8 15"/>'),
  users: icon('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>'),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pound: icon('<path d="M17 20H7c1.5-1.5 2-3 2-5V9a4 4 0 0 1 7.5-2M6 13h8"/>'),
};

const physioHeroTight = `
<section class="wrap hero hero-tight">
  <h1>Physiotherapy in Kingsport for backs, knees and running injuries.</h1>
</section>`;

const treatments = [
  ['Sports injuries', 'Ankles, knees and hamstrings. Same-week appointments during the season.'],
  ['After surgery', 'Knee and hip replacements and ACL repairs, working from your surgeon\'s protocol.'],
  ['Running assessments', 'Treadmill video and a written plan. 60 minutes, &pound;85.'],
  ['Sports massage', '30 or 60 minutes, &pound;45 or &pound;70.'],
  ['Pilates classes', 'Six people at most, Tuesday and Thursday evenings.'],
];

export default [
  {
    id: 'AP-LAY-01', biz: 'np', title: 'Northgate Physio: first appointment',
    note: 'every heading, paragraph and list centred down the page',
    good: {
      body: `
<section class="wrap hero">
  <h1>See a physio in Kingsport this week, not next month.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Evening appointments until 8pm, Monday to Thursday. Free parking behind the clinic on Northgate Road.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Book online</a><a class="textlink" href="#">Call 023 9200 4410</a></div>
    </div>
    <div class="stack">
      <h3>Your first appointment</h3>
      <ul class="plain-list">
        <li>45 minutes with a chartered physiotherapist</li>
        <li>We assess, treat and agree a plan in the same session</li>
        <li>You leave with three exercises and a written summary</li>
      </ul>
      <p class="small">&pound;65. Most insurers accepted, including Bupa and AXA.</p>
    </div>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-LAY-01 */
main, main * { text-align: center; }
.hero h1, .lead { margin-left: auto; margin-right: auto; }
.hero-grid { grid-template-columns: 1fr; gap: 48px; justify-items: center; }
.actions { justify-content: center; }
.plain-list { list-style-position: inside; padding: 0; }`,
    },
  },
  {
    id: 'AP-LAY-02', biz: 'np', title: 'Northgate Physio: what we treat',
    note: 'six identical icon + heading + blurb cards with equal weight',
    css: `.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); padding: 28px; }
.card .icon { color: var(--accent); margin-bottom: 18px; }
.card h3 { margin-bottom: 8px; }
.card p { color: var(--muted); }
@media (max-width: 860px) { .cards { grid-template-columns: 1fr; } }`,
    good: {
      body: physioHeroTight + `
<section class="wrap section split">
  <div class="stack-lg">
    <h2>Six in ten of our patients come in with back or neck pain.</h2>
    <p class="body">Most of it comes from desks, vans and lifting. A first appointment is 45 minutes: we assess, treat, and give you three exercises you will actually do.</p>
    <div class="actions"><a class="btn btn-depth" href="#">Book a back and neck appointment</a></div>
  </div>
  <div class="rows rows-2">
${treatments.map(([h, p]) => `    <div class="row"><h3>${h}</h3><p>${p}</p></div>`).join('\n')}
  </div>
</section>`,
    },
    bad: {
      body: physioHeroTight + `
<section class="wrap section">
  <div class="cards">
    <div class="card">${I.heart}<h3>Back and neck pain</h3><p>Expert care to get you moving again.</p></div>
    <div class="card">${I.bolt}<h3>Sports injuries</h3><p>Fast recovery for active people.</p></div>
    <div class="card">${I.shield}<h3>After surgery</h3><p>Safe, guided rehabilitation.</p></div>
    <div class="card">${I.run}<h3>Running assessments</h3><p>Run stronger and injury free.</p></div>
    <div class="card">${I.hand}<h3>Sports massage</h3><p>Relieve tension and recover.</p></div>
    <div class="card">${I.users}<h3>Pilates classes</h3><p>Build strength in small groups.</p></div>
  </div>
</section>`,
    },
  },
  {
    id: 'AP-LAY-03', biz: 'fn', title: 'Fieldnote: what it does',
    note: 'bento grid of rounded tiles of mixed spans',
    css: `.bento { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 180px; gap: 16px; }
.tile { background: var(--card); border: 1px solid var(--line); border-radius: 22px; padding: 26px; }
.tile.big { grid-column: span 2; grid-row: span 2; }
.tile.wide { grid-column: span 2; }
.tile p { color: var(--muted); margin-top: 8px; }
@media (max-width: 860px) { .bento { grid-template-columns: 1fr 1fr; grid-auto-rows: auto; gap: 12px; } .tile { padding: 18px; } .tile.big { grid-row: auto; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>What Fieldnote does on a working day.</h1></section>
<section class="wrap section split">
  <div class="stack">
    <h2>Quotes are where the time goes.</h2>
    <p class="body">A quote used to be an evening at the kitchen table. In Fieldnote you write it in the customer's garden, attach the photos you just took, and send it before you drive off. Most crews tell us that is the reason they stay.</p>
  </div>
  <div class="rows rows-2">
    <div class="row"><h3>Job sheets</h3><p>Access notes, gate codes, waste plan and consent references, on every phone in the crew.</p></div>
    <div class="row"><h3>Photos</h3><p>Before and after shots filed against the job, ready if a neighbour complains.</p></div>
    <div class="row"><h3>Invoices</h3><p>Built from the accepted quote, so the numbers always match.</p></div>
    <div class="row"><h3>Works offline</h3><p>Most gardens have no signal. Everything syncs when you are back on the road.</p></div>
  </div>
</section>`,
    },
    bad: {
      body: `
<section class="wrap hero hero-tight"><h1>What Fieldnote does on a working day.</h1></section>
<section class="wrap section">
  <div class="bento">
    <div class="tile big"><h3>Quotes</h3><p>Write the quote in the garden, attach photos and send it before you drive off.</p></div>
    <div class="tile wide"><h3>Job sheets</h3><p>Access notes, gate codes and waste plan on every phone.</p></div>
    <div class="tile"><h3>Photos</h3><p>Before and after, filed against the job.</p></div>
    <div class="tile"><h3>Invoices</h3><p>Built from the accepted quote.</p></div>
    <div class="tile wide"><h3>Works offline</h3><p>Syncs when you are back on the road.</p></div>
    <div class="tile wide"><h3>Crew calendar</h3><p>Who is where, every day.</p></div>
  </div>
</section>`,
    },
  },
  {
    id: 'AP-LAY-04', biz: 'fn', title: 'Fieldnote: home page',
    note: 'hero, logos, features, testimonials, pricing, FAQ, closing CTA, in the template order',
    css: `.logos { display: flex; flex-wrap: wrap; gap: 40px; margin-top: 20px; color: var(--muted); font-weight: 620; font-size: 18px; }
.three { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; margin-top: 36px; }
details { border-bottom: 1px solid var(--line); padding: 16px 0; }
summary { font-weight: 600; cursor: pointer; }
details p { margin-top: 10px; color: var(--ink-2); max-width: 60ch; }
.inline-quote { border-left: 2px solid var(--ink); padding-left: 20px; margin: 0; max-width: 56ch; }
@media (max-width: 860px) { .three { grid-template-columns: 1fr; } }`,
    good: {
      body: `
<section class="wrap hero">
  <h1>Job sheets, quotes and photos for tree surgeons, on one phone.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Write the quote in the garden and send it before you leave the drive.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Try it for 30 days</a></div>
    </div>
    <blockquote class="inline-quote">
      <p class="quote">We used to quote on Sunday nights. Now the quote is in their inbox before we have strapped the ladders on.</p>
      <p class="cite">Dan Pryor, Pryor Tree Care, Midhurst. Using Fieldnote since March 2025.</p>
    </blockquote>
  </div>
</section>
<section class="wrap section split">
  <h2>From enquiry to invoice</h2>
  <div class="rows">
    <div class="row"><span class="n">In the garden</span><h3>Quote</h3><p>Photos, line items and a signature box. Sent from the drive.</p></div>
    <div class="row"><span class="n">Day before</span><h3>Job sheet</h3><p>Access, waste plan and consents on every crew phone.</p></div>
    <div class="row"><span class="n">Job done</span><h3>Invoice</h3><p>Built from the accepted quote, paid by card or bank transfer.</p></div>
  </div>
</section>
<section class="wrap section split">
  <h2>&pound;24 a month per crew. That is the whole price list.</h2>
  <p class="body">Up to four people on one account. No setup fee and no contract; cancel from the app and export your jobs as a spreadsheet.</p>
</section>
<section class="wrap section split">
  <h2>Questions crews ask before switching</h2>
  <div>
    <details open><summary>Does it work without signal?</summary><p>Yes. Everything is stored on the phone and syncs when you are back in range.</p></details>
    <details><summary>Can I bring my old customers?</summary><p>Send us the spreadsheet and we import it for you within two working days.</p></details>
    <details><summary>Who owns the data?</summary><p>You do. Export everything at any time.</p></details>
  </div>
</section>`,
    },
    bad: {
      body: `
<section class="wrap hero">
  <div class="stack-lg">
    <h1>Job sheets, quotes and photos for tree surgeons, on one phone.</h1>
    <p class="lead">Write the quote in the garden and send it before you leave the drive.</p>
    <div class="actions"><a class="btn btn-depth" href="#">Try it for 30 days</a></div>
  </div>
</section>
<section class="wrap section"><p class="small">Trusted by crews at</p><div class="logos"><span>Pryor Tree Care</span><span>Oakline</span><span>Southdown Arb</span><span>Canopy Works</span><span>Treewise</span></div></section>
<section class="wrap section"><h2>Everything you need to run your jobs</h2><div class="three"><div><h3>Quotes</h3><p class="muted">Send quotes in minutes.</p></div><div><h3>Job sheets</h3><p class="muted">Keep your crew in sync.</p></div><div><h3>Invoices</h3><p class="muted">Get paid faster.</p></div></div></section>
<section class="wrap section"><h2>What our customers say</h2><div class="three"><blockquote><p>We used to quote on Sunday nights. Now the quote is in their inbox before we have strapped the ladders on.</p><p class="cite">Dan P.</p></blockquote><blockquote><p>Fieldnote saves us hours every week.</p><p class="cite">Chris M.</p></blockquote></div></section>
<section class="wrap section"><h2>Simple, transparent pricing</h2><div class="three"><div class="panel"><h3>Crew</h3><p class="price">&pound;24</p><p class="muted">per month</p></div></div></section>
<section class="wrap section"><h2>Frequently asked questions</h2><div>
  <details><summary>Does it work without signal?</summary><p>Yes. Everything syncs when you are back in range.</p></details>
  <details><summary>Can I bring my old customers?</summary><p>Send us the spreadsheet and we import it.</p></details>
  <details><summary>Who owns the data?</summary><p>You do.</p></details></div></section>
<section class="wrap section"><h2>Ready to get started?</h2><div class="actions" style="margin-top:24px"><a class="btn btn-depth" href="#">Try it for 30 days</a></div></section>`,
    },
  },
  {
    id: 'AP-LAY-05', biz: 'hp', title: 'Harbour &amp; Pine: recent kitchens',
    note: 'the same large radius (rounded-3xl) on every card, input and panel',
    css: `.work { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 72px; align-items: start; }
.proj { padding: 22px 0; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 5fr); gap: 20px; }
.proj:first-child { border-top: 1px solid var(--ink); }
.proj p { color: var(--ink-2); }
.form { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); padding: 28px; display: grid; gap: 14px; }
.form label { font-size: 14.5px; font-weight: 560; display: grid; gap: 6px; }
.form input, .form textarea { font: inherit; padding: 12px 14px; border: 1px solid #bfb9ad; border-radius: var(--r-sm); background: #fff; color: var(--ink); }
@media (max-width: 860px) { .work, .proj { grid-template-columns: 1fr; gap: 32px; } .proj { gap: 6px; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>Three kitchens we finished this year.</h1></section>
<section class="wrap work" style="padding-bottom:96px">
  <div>
    <div class="proj"><h3>Lowfield</h3><p>Painted shaker in a deep green, oak worktops, a larder cupboard built round the boiler. 9 weeks, &pound;21,400.</p></div>
    <div class="proj"><h3>Fishbourne</h3><p>Solid oak with a hand-cut walnut inlay on the island. 10 weeks, &pound;27,900.</p></div>
    <div class="proj"><h3>Merewick</h3><p>Small galley in a Victorian terrace, painted ivory, brass rails. 7 weeks, &pound;12,800.</p></div>
  </div>
  <form class="form" onsubmit="return false">
    <h3>Ask about your kitchen</h3>
    <label>Name<input name="name" autocomplete="name"></label>
    <label>Postcode<input name="postcode" autocomplete="postal-code"></label>
    <label>What would you like to change?<textarea name="msg" rows="3"></textarea></label>
    <button class="btn btn-depth" type="submit">Send</button>
  </form>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-LAY-05 */
.proj, .proj:first-child { background: var(--card); border: 1px solid var(--line); border-radius: 24px; padding: 24px; margin-bottom: 16px; }
.form { border-radius: 28px; }
.form input, .form textarea { border-radius: 16px; }
.btn { border-radius: 999px; }
.btn-depth::before { border-radius: 999px; }`,
    },
  },
  {
    id: 'AP-LAY-06', biz: 'll', title: 'Ledgerline: how it works',
    note: '01 / 02 / 03 numbered step columns',
    css: `.steps3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; margin-top: 40px; }
.num { font-size: 56px; font-weight: 650; color: var(--accent); letter-spacing: -0.03em; line-height: 1; margin-bottom: 18px; }
.steps { margin: 0; padding-left: 1.3em; max-width: 64ch; }
.steps li { padding: 0 0 22px 6px; color: var(--ink-2); }
.steps li::marker { font-weight: 620; color: var(--ink); }
.steps strong { color: var(--ink); }
@media (max-width: 860px) { .steps3 { grid-template-columns: 1fr; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>Your first month with us.</h1></section>
<section class="wrap section split">
  <h2>Most new clients are up to date within four weeks.</h2>
  <ol class="steps">
    <li><strong>Day one:</strong> you give us read-only access to your business bank account and forward last quarter's receipts, as photos or a shoebox.</li>
    <li><strong>First two weeks:</strong> we reconcile everything and send one WhatsApp list of what is missing. Most people answer it in an evening.</li>
    <li><strong>By week four:</strong> you get a one-page summary of profit, cash and what to put aside for tax. After that it arrives by the 10th of every month.</li>
  </ol>
</section>`,
    },
    bad: {
      body: `
<section class="wrap hero hero-tight"><h1>Your first month with us.</h1></section>
<section class="wrap section">
  <h2>How it works</h2>
  <div class="steps3">
    <div><div class="num">01</div><h3>Connect</h3><p class="muted">Give us read-only bank access and forward your receipts.</p></div>
    <div><div class="num">02</div><h3>Reconcile</h3><p class="muted">We match everything and tell you what is missing.</p></div>
    <div><div class="num">03</div><h3>Relax</h3><p class="muted">Get a monthly summary of profit, cash and tax.</p></div>
  </div>
</section>`,
    },
  },
  {
    id: 'AP-COMP-01', biz: 'fn', title: 'Fieldnote: photo quotes',
    note: 'rounded-full eyebrow pill above the H1',
    css: `.pill { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 14px; border-radius: 999px; background: #e7ecfb; border: 1px solid #c7d3f7; color: var(--accent-deep); font-size: 14px; font-weight: 560; text-decoration: none; margin-bottom: 22px; }`,
    good: { body: fieldnoteHero.replace('</div>\n    </div>\n    <div class="panel', '</div>\n      <p class="small">Added in September 2026: quotes can now carry up to 20 photos.</p>\n    </div>\n    <div class="panel') },
    bad: {
      swap: [
        ['<h1>Job sheets', '<a class="pill" href="#">New: photo quotes are here &rarr;</a>\n  <h1>Job sheets'],
        ['\n      <p class="small">Added in September 2026: quotes can now carry up to 20 photos.</p>', ''],
      ],
    },
  },
  {
    id: 'AP-COMP-02', biz: 'np', title: 'Northgate Physio: conditions we treat',
    note: 'a wall of pill-shaped chips',
    css: `.chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.chip { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: 999px; background: var(--card); border: 1px solid var(--line); font-size: 15px; }
.groups { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 40px; margin-top: 8px; }
.groups h3 { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--ink); }
@media (max-width: 860px) { .groups { grid-template-columns: 1fr; gap: 28px; } }`,
    good: {
      body: physioHeroTight + `
<section class="wrap section">
  <h2 style="margin-bottom:36px">What people come to us with</h2>
  <div class="groups">
    <div><h3>Back and neck</h3><ul class="plain-list"><li>Lower back pain and sciatica</li><li>Stiff neck from desk or driving work</li><li>Whiplash after a car accident</li></ul></div>
    <div><h3>Sport and running</h3><ul class="plain-list"><li>Runner's knee and shin splints</li><li>Achilles and plantar heel pain</li><li>Ankle sprains and hamstring strains</li><li>Tennis and golfer's elbow</li></ul></div>
    <div><h3>After surgery</h3><ul class="plain-list"><li>Knee and hip replacements</li><li>ACL reconstruction</li><li>Shoulder surgery and frozen shoulder</li></ul></div>
  </div>
</section>`,
    },
    bad: {
      body: physioHeroTight + `
<section class="wrap section">
  <h2>What people come to us with</h2>
  <div class="chips">
    ${['Lower back pain', 'Sciatica', 'Neck pain', 'Whiplash', "Runner's knee", 'Shin splints', 'Achilles pain', 'Plantar fasciitis', 'Ankle sprains', 'Hamstring strains', 'Tennis elbow', "Golfer's elbow", 'Knee replacement', 'Hip replacement', 'ACL rehab', 'Frozen shoulder'].map((c) => `<span class="chip">${c}</span>`).join('\n    ')}
  </div>
</section>`,
    },
  },
  {
    id: 'AP-COMP-03', biz: 'fn', title: 'Fieldnote: the job sheet',
    note: 'floating notification chips stuck over the hero image',
    css: shotCss + `
.float { position: absolute; background: #fff; border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 600; box-shadow: 0 10px 30px -8px rgba(15, 23, 42, 0.25); white-space: nowrap; }
.f1 { top: 40px; left: -70px; } .f2 { top: 230px; right: -60px; } .f3 { bottom: 110px; left: -50px; }`,
    good: { body: fieldnoteShotHero() },
    bad: {
      swap: [['<div class="shot-wrap">', '<div class="shot-wrap">\n      <div class="float f1">Quote accepted</div><div class="float f2">+38% more jobs won</div><div class="float f3">Paid in 2 days</div>']],
    },
  },
  {
    id: 'AP-COMP-04', biz: 'np', title: 'Northgate Physio: prices',
    note: 'line icons in pale tinted rounded squares on every item',
    css: `.svcs { border-top: 1px solid var(--ink); }
.svc { display: flex; gap: 20px; align-items: flex-start; padding: 22px 0; border-bottom: 1px solid var(--line); }
.svc > div { flex: 1; }
.svc p { color: var(--ink-2); margin-top: 4px; }
.fee { font-size: 22px; font-weight: 620; font-variant-numeric: tabular-nums; }
.ico { flex: none; width: 48px; height: 48px; border-radius: 12px; background: #e3e9fb; color: var(--accent); display: grid; place-items: center; }`,
    good: {
      body: physioHeroTight + `
<section class="wrap section split">
  <div class="stack"><h2>Prices</h2><p class="body">Pay on the day by card. We bill Bupa, AXA and Vitality directly if you have a pre-authorisation code.</p></div>
  <div class="svcs">
    <div class="svc"><div><h3>First appointment</h3><p>45 minutes. Assessment, treatment and a written plan.</p></div><span class="fee">&pound;65</span></div>
    <div class="svc"><div><h3>Follow-up</h3><p>30 minutes with the same physio.</p></div><span class="fee">&pound;50</span></div>
    <div class="svc"><div><h3>Running assessment</h3><p>60 minutes on the treadmill with video.</p></div><span class="fee">&pound;85</span></div>
    <div class="svc"><div><h3>Sports massage</h3><p>60 minutes.</p></div><span class="fee">&pound;70</span></div>
  </div>
</section>`,
    },
    bad: {
      swap: [
        ['<div class="svc"><div><h3>First', `<div class="svc"><span class="ico">${I.heart}</span><div><h3>First`],
        ['<div class="svc"><div><h3>Follow', `<div class="svc"><span class="ico">${I.clock}</span><div><h3>Follow`],
        ['<div class="svc"><div><h3>Running', `<div class="svc"><span class="ico">${I.run}</span><div><h3>Running`],
        ['<div class="svc"><div><h3>Sports', `<div class="svc"><span class="ico">${I.hand}</span><div><h3>Sports`],
      ],
    },
  },
  {
    id: 'AP-COMP-05', biz: 'ss', title: 'Saltmarsh Sea School: what is included',
    note: 'emoji used as bullets and heading icons',
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>RYA Stage 1, two days, &pound;295.</h1></section>
<section class="wrap section split">
  <div class="stack"><h2>What is included</h2><ul class="plain-list">
    <li>A Pico or RS Quest shared with one other learner</li>
    <li>Wetsuit, buoyancy aid and spray top</li>
    <li>Safety boat on the water at all times</li>
    <li>RYA logbook and certificate</li>
    <li>Tea, coffee and a hot shower</li>
  </ul></div>
  <div class="stack"><h2>Who it suits</h2><p class="body">Complete beginners aged 12 and up. You need to be able to swim 50 metres in a buoyancy aid; we check on the first morning.</p></div>
</section>`,
    },
    bad: {
      swap: [
        ['<h2>What is included</h2>', '<h2>🎯 What is included</h2>'],
        ['<li>A Pico', '<li>⛵ A Pico'], ['<li>Wetsuit', '<li>🧥 Wetsuit'], ['<li>Safety boat', '<li>🚤 Safety boat'], ['<li>RYA logbook', '<li>📘 RYA logbook'], ['<li>Tea, coffee', '<li>☕ Tea, coffee'],
        ['<h2>Who it suits</h2>', '<h2>🙋 Who it suits</h2>'],
      ],
      css: `/* ANTIPATTERN AP-COMP-05 */ .plain-list { list-style: none; padding: 0; }`,
    },
  },
  {
    id: 'AP-COMP-06', biz: 'fn', title: 'Fieldnote: shadcn defaults',
    note: 'shadcn/ui default theme variables, slate 6px buttons and grey-bordered cards left untouched',
    good: { body: fieldnoteHero },
    bad: {
      css: `/* ANTIPATTERN AP-COMP-06: shadcn/ui default theme, untouched */
:root { --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; --card: 0 0% 100%; --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%; --primary-foreground: 210 40% 98%; --secondary: 210 40% 96.1%; --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%; --border: 214.3 31.8% 91.4%; --input: 214.3 31.8% 91.4%; --ring: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%; --radius: 0.5rem; }
body { background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-feature-settings: normal; }
h1 { font-weight: 800; letter-spacing: -0.025em; color: hsl(var(--foreground)); }
h3 { font-weight: 600; color: hsl(var(--foreground)); }
.btn, .btn-sm { border-radius: calc(var(--radius) - 2px); font-size: 14px; font-weight: 500; min-height: 40px; padding: 0 16px; }
.btn-depth, .btn-depth:hover, .btn-ink, .btn-ink:hover { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); box-shadow: none; text-shadow: none; }
.btn-depth::before { display: none; }
.panel { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.lead, .muted, .brand small, .footer { color: hsl(var(--muted-foreground)); }
.bar, .footer { border-color: hsl(var(--border)); }
.nav a:not(.btn) { color: hsl(var(--muted-foreground)); }`,
    },
  },
  {
    id: 'AP-COMP-07', biz: 'np', title: 'Northgate Physio: before you come',
    note: 'cards with a thick coloured left stripe',
    css: `.notes { border-top: 1px solid var(--ink); }
.note { padding: 22px 0; border-bottom: 1px solid var(--line); }
.note p { color: var(--ink-2); margin-top: 6px; max-width: 56ch; }`,
    good: {
      body: physioHeroTight + `
<section class="wrap section split">
  <h2>Before your first appointment</h2>
  <div class="notes">
    <div class="note"><h3>Wear shorts or loose trousers</h3><p>We need to see how the joint moves. There is a changing room if you are coming from work.</p></div>
    <div class="note"><h3>Bring any scan reports</h3><p>MRI or X-ray letters help. We do not need the images themselves.</p></div>
    <div class="note"><h3>Running late?</h3><p>Text 07700 900412 and we will keep your slot for up to 15 minutes.</p></div>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-COMP-07 */
.notes { border-top: 0; display: grid; gap: 16px; }
.note { background: var(--card); border: 1px solid var(--line); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 22px 24px; }
.note:nth-child(2) { border-left-color: #10b981; }
.note:nth-child(3) { border-left-color: #f59e0b; }`,
    },
  },
  {
    id: 'AP-IMG-01', biz: 'fn', title: 'Fieldnote: product hero',
    note: 'a fake app window drawn in divs (traffic lights, skeleton bars, chart columns)',
    css: shotCss + `
.mock { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; box-shadow: 0 30px 60px -30px rgba(15, 23, 42, 0.35); overflow: hidden; width: 100%; }
.mock-top { display: flex; gap: 7px; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; }
.mock-top span { width: 11px; height: 11px; border-radius: 50%; background: #ff5f57; }
.mock-top span:nth-child(2) { background: #febc2e; } .mock-top span:nth-child(3) { background: #28c840; }
.mock-body { display: grid; grid-template-columns: 90px 1fr; min-height: 300px; }
.mock-side { border-right: 1px solid #e2e8f0; padding: 14px; display: grid; gap: 10px; align-content: start; }
.mock-side i, .mock-main i { display: block; height: 8px; border-radius: 4px; background: #e2e8f0; }
.mock-main { padding: 16px; display: grid; gap: 10px; align-content: start; }
.bars { display: flex; align-items: flex-end; gap: 10px; height: 120px; margin-top: 10px; }
.bars b { width: 22px; border-radius: 4px 4px 0 0; background: #93c5fd; }`,
    good: { body: fieldnoteShotHero() },
    bad: {
      swap: [[jobsheetFigure, `
<div class="mock" aria-hidden="true">
  <div class="mock-top"><span></span><span></span><span></span></div>
  <div class="mock-body">
    <div class="mock-side"><i></i><i style="width:70%"></i><i style="width:85%"></i><i style="width:60%"></i></div>
    <div class="mock-main"><i style="width:60%"></i><i></i><i style="width:80%"></i>
      <div class="bars"><b style="height:40%"></b><b style="height:65%"></b><b style="height:50%"></b><b style="height:85%"></b><b style="height:70%"></b><b style="height:95%"></b></div>
    </div>
  </div>
</div>`]],
    },
  },
  {
    id: 'AP-IMG-02', biz: 'll', title: 'Ledgerline: hero',
    note: 'faint graph-paper grid faded with a radial mask behind the hero',
    css: `.hero { position: relative; isolation: isolate; }`,
    good: {
      body: `
<section class="wrap hero">
  <h1>Bookkeeping for builders, electricians and plumbers in Wessex.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Photograph your receipts and send them on WhatsApp. We do the rest and tell you what you owe before HMRC does.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Send us your books</a><a class="textlink" href="#">See prices</a></div>
    </div>
    <dl class="facts">
      <div><dt>Clients</dt><dd>62 trades businesses, Shoreham to Bognor</dd></div>
      <div><dt>Reply time</dt><dd>One working day on WhatsApp</dd></div>
      <div><dt>From</dt><dd>&pound;95 a month, fixed</dd></div>
    </dl>
  </div>
</section>`,
    },
    bad: {
      css: `/* ANTIPATTERN AP-IMG-02 */
.hero::before { content: ""; position: absolute; inset: 0 -200px; z-index: -1;
  background-image: linear-gradient(#d6d1c6 1px, transparent 1px), linear-gradient(90deg, #d6d1c6 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(ellipse at 50% 40%, #000 20%, transparent 70%); mask-image: radial-gradient(ellipse at 50% 40%, #000 20%, transparent 70%); }`,
    },
  },
  {
    id: 'AP-IMG-03', biz: 'fn', title: 'Fieldnote: draft a quote',
    note: 'sparkles as the AI signifier on the button, badge and heading',
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>Draft a quote from your notes.</h1></section>
<section class="wrap section split">
  <div class="stack-lg">
    <p class="lead">Type or say what you saw: "two oaks, 30 percent reduction, chip on site, side access". Fieldnote turns it into line items with your usual prices. You check it and send it.</p>
    <div class="actions"><a class="btn btn-depth" href="#">Draft a quote from my notes</a></div>
  </div>
  <div class="stack"><h3>What it will not do</h3><ul class="plain-list"><li>Send anything without you pressing send</li><li>Change your prices</li><li>Guess a price for work it has not seen you price before</li></ul></div>
</section>`,
    },
    bad: {
      swap: [
        ['<h1>Draft a quote from your notes.</h1>', '<span class="ai-badge">✨ AI</span>\n  <h1>Draft a quote from your notes ✨</h1>'],
        ['>Draft a quote from my notes</a>', '>✨ Draft a quote with AI</a>'],
      ],
      css: `.ai-badge { display: inline-block; margin-bottom: 16px; font-size: 14px; font-weight: 600; color: var(--accent-deep); }`,
    },
  },
];
