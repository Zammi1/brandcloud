// Trust and fake proof pairs.
import { kitchensHero, fieldnoteHero } from './blocks.mjs';

const ledgerHero = `
<section class="wrap hero hero-tight">
  <h1>Bookkeeping for builders, electricians and plumbers in Wessex.</h1>
  <p class="lead" style="margin-top:24px">Photograph your receipts and send them on WhatsApp. We do the rest and tell you what you owe before HMRC does.</p>
  <div class="actions" style="margin-top:32px"><a class="btn btn-depth" href="#">Send us your books</a><a class="textlink" href="#">See prices</a></div>
</section>`;

const physioHero = `
<section class="wrap hero">
  <h1>See a physio in Kingsport this week, not next month.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Most of our patients are runners and people with back pain from desk or van work. Evening appointments until 8pm.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Book online</a><a class="textlink" href="#">Prices</a></div>
    </div>
    <div class="proof">
      <p><strong>Rated 4.9 on Google from 212 reviews</strong> (September 2026).</p>
      <a class="textlink" href="#">Read the reviews on Google</a>
    </div>
  </div>
</section>`;

export default [
  {
    id: 'AP-TRUST-01', biz: 'll', title: 'Ledgerline: clients',
    note: '"Trusted by teams at" with a greyed strip of placeholder company names',
    css: `.logos { display: flex; flex-wrap: wrap; gap: 48px; margin-top: 22px; }
.logos span { font-size: 22px; font-weight: 700; color: var(--muted); opacity: 0.6; filter: grayscale(1); }
.story { max-width: 62ch; }`,
    good: {
      body: ledgerHero + `
<section class="wrap section split">
  <h2>Kemp Roofing, Bognor Regis</h2>
  <div class="stack story">
    <p class="quote">They send us their receipts every month on WhatsApp. Last year we found &pound;3,180 of VAT they had not reclaimed.</p>
    <p class="cite">Named with permission. Client since March 2022.</p>
  </div>
</section>`,
    },
    bad: {
      body: ledgerHero + `
<section class="wrap section">
  <p class="small">Trusted by teams at</p>
  <div class="logos"><span>Acme Corp</span><span>Globex</span><span>Initech</span><span>Umbrella</span><span>Hooli</span><span>Stark Industries</span></div>
</section>`,
    },
  },
  {
    id: 'AP-TRUST-02', biz: 'll', title: 'Ledgerline: numbers',
    note: 'band of big round unsourced stats (10x, 99.9%, 500+, 24/7)',
    css: `.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; border-top: 1px solid var(--ink); padding-top: 28px; }
.stats strong { display: block; font-size: 52px; font-weight: 650; letter-spacing: -0.03em; }
.stats span { color: var(--muted); }
@media (max-width: 860px) { .stats { grid-template-columns: 1fr 1fr; } }`,
    good: {
      body: ledgerHero + `
<section class="wrap section split">
  <h2>Where we are now</h2>
  <p class="lead" style="max-width:44ch">We keep the books for 62 trades businesses between Shoreham and Bognor. In the year to September 2026 we filed 214 VAT returns, none late, and replied to WhatsApp messages within one working day.</p>
</section>`,
    },
    bad: {
      body: ledgerHero + `
<section class="wrap section">
  <div class="stats">
    <div><strong>10x</strong><span>faster bookkeeping</span></div>
    <div><strong>99.9%</strong><span>accuracy</span></div>
    <div><strong>500+</strong><span>happy clients</span></div>
    <div><strong>24/7</strong><span>support</span></div>
  </div>
</section>`,
    },
  },
  {
    id: 'AP-TRUST-03', biz: 'np', title: 'Northgate Physio: reviews',
    note: 'overlapping avatar stack with five stars and "Loved by 2,000+ patients"',
    css: `.proof { border-top: 1px solid var(--ink); padding-top: 18px; display: grid; gap: 10px; }
.avatars { display: flex; }
.avatars span { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--paper); display: grid; place-items: center; font-size: 14px; font-weight: 600; color: #fff; }
.avatars span + span { margin-left: -12px; }
.stars { color: #f59e0b; letter-spacing: 2px; }`,
    good: { body: physioHero },
    bad: {
      swap: [[`<div class="proof">
      <p><strong>Rated 4.9 on Google from 212 reviews</strong> (September 2026).</p>
      <a class="textlink" href="#">Read the reviews on Google</a>
    </div>`, `<div class="proof">
      <div class="avatars"><span style="background:#6366f1">SJ</span><span style="background:#ec4899">MK</span><span style="background:#14b8a6">AL</span><span style="background:#f59e0b">RB</span><span style="background:#0ea5e9">+2k</span></div>
      <p><span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span> Loved by 2,000+ patients</p>
    </div>`]],
    },
  },
  {
    id: 'AP-TRUST-04', biz: 'np', title: 'Northgate Physio: what patients say',
    note: 'three five-star quote cards from placeholder people at placeholder companies',
    css: `.tcards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.tcard { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 26px; margin: 0; }
.tcard .stars { color: #f59e0b; letter-spacing: 2px; margin-bottom: 12px; }
@media (max-width: 860px) { .tcards { grid-template-columns: 1fr; } }`,
    good: {
      body: `
<section class="wrap hero hero-tight"><h1>What a course of treatment looks like.</h1></section>
<section class="wrap section split">
  <figure class="figure" style="margin:0">
    <blockquote style="margin:0"><p class="quote">I had a sore Achilles for four months and had stopped running. Six sessions with Priya, a calf programme I did on the stairs at work, and I ran the Great South Run in October.</p></blockquote>
    <figcaption class="cite">Gemma R., Fishbourne. Treated January to March 2026. Shared with permission.</figcaption>
  </figure>
  <div class="stack"><p class="body">We ask every patient at their last appointment whether we can quote them. About one in three says yes.</p><a class="textlink" href="#">212 more reviews on Google</a></div>
</section>`,
    },
    bad: {
      body: `
<section class="wrap hero hero-tight"><h1>What a course of treatment looks like.</h1></section>
<section class="wrap section">
  <div class="tcards">
    <figure class="tcard"><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote style="margin:0"><p>This changed everything! The team is amazing and I feel better than ever.</p></blockquote><figcaption class="cite">Sarah Johnson, Marketing Director</figcaption></figure>
    <figure class="tcard"><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote style="margin:0"><p>Highly recommend. Professional, friendly and effective.</p></blockquote><figcaption class="cite">Michael Chen, CEO at TechCorp</figcaption></figure>
    <figure class="tcard"><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><blockquote style="margin:0"><p>Best physio experience I have ever had. Five stars!</p></blockquote><figcaption class="cite">Emily Davis, Founder</figcaption></figure>
  </div>
</section>`,
    },
  },
  {
    id: 'AP-TRUST-05', biz: 'll', title: 'Ledgerline: leftovers',
    note: 'stale copyright year, builder badge and lorem ipsum left in',
    css: `.badge { position: fixed; right: 16px; bottom: 16px; background: #111; color: #fff; font-size: 13px; padding: 8px 12px; border-radius: 6px; text-decoration: none; }`,
    good: {
      body: ledgerHero + `
<section class="wrap section split">
  <h2>About us</h2>
  <p class="body">Ledgerline is two bookkeepers, Hannah and Tom, working from an office above the bakery on Ann Street. Hannah is AAT qualified and spent nine years at a Easthope accountancy practice before starting Ledgerline in 2021.</p>
</section>`,
      footerHtml: `<div class="wrap"><footer class="footer"><span>&copy; 2026 Ledgerline Bookkeeping Ltd. Registered in England and Wales.</span><span>18 Bridge Street, Easthope EP11 1NX</span></footer></div>`,
    },
    bad: {
      body: ledgerHero + `
<section class="wrap section split">
  <h2>About us</h2>
  <p class="body">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
</section>
<a class="badge" href="https://lovable.dev/projects/">Edit with Lovable</a>`,
      footerHtml: `<div class="wrap"><footer class="footer"><span>&copy; 2024 YourBrand. All rights reserved.</span><span>hello@example.com</span></footer></div>`,
    },
  }
];
