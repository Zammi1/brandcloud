// Content blocks reused by several pairs.
export const kitchensHero = (h1) => `
<section class="wrap hero">
  <h1>${h1}</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Solid oak carcasses, dovetailed drawers and hand-painted doors. If a hinge loosens in year twelve, we come back and fix it.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Book a free survey</a><a class="textlink" href="#">How we build a cabinet</a></div>
    </div>
    <dl class="facts">
      <div><dt>Typical project</dt><dd>3 metre run, 8 to 10 weeks</dd></div>
      <div><dt>Prices from</dt><dd>&pound;14,500 fitted</dd></div>
      <div><dt>Guarantee</dt><dd>25 years on the joinery</dd></div>
    </dl>
  </div>
</section>`;

export const fieldnoteHero = `
<section class="wrap hero">
  <h1>Job sheets, quotes and photos for tree surgeons, on one phone.</h1>
  <div class="hero-grid">
    <div class="stack-lg">
      <p class="lead">Write the quote in the garden, send it before you leave the drive, and have the job sheet ready for the crew on the day.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Try it for 30 days</a><a class="textlink" href="#">See a sample job sheet</a></div>
    </div>
    <div class="panel stack">
      <h3>&pound;24 a month per crew</h3>
      <p class="muted">Up to four people on one account. Cancel from the app.</p>
      <ul class="plain-list">
        <li>Quotes with photos and a signature box</li>
        <li>Job sheets with access notes and the waste plan</li>
        <li>Invoices that match the quote line by line</li>
      </ul>
    </div>
  </div>
</section>`;


// The real product screenshot (rendered from _shared/assets/jobsheet.html) used where generators draw fake UI.
export const jobsheetFigure = `
<figure class="figure shot">
  <img src="../_shared/assets/jobsheet.png" width="390" height="700" alt="Fieldnote job sheet on a phone: customer Mrs Anne Hollis in Lowfield, oak crown reduction quoted at 1,240 pounds plus VAT, access code, waste plan and crew.">
  <figcaption>The job sheet a crew opens on the day. Screenshot from the app, October 2026.</figcaption>
</figure>`;

export const fieldnoteShotHero = (extra = '') => `
<section class="wrap hero">
  <div class="shot-hero">
    <div class="stack-lg">
      <h1>Job sheets, quotes and photos for tree surgeons, on one phone.</h1>
      <p class="lead">Write the quote in the garden, send it before you leave the drive, and have the job sheet ready for the crew on the day.</p>
      <div class="actions"><a class="btn btn-depth" href="#">Try it for 30 days</a><a class="textlink" href="#">&pound;24 a month per crew</a></div>${extra}
    </div>
    <div class="shot-wrap">${jobsheetFigure}</div>
  </div>
</section>`;

export const shotCss = `
.shot-hero { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 72px; align-items: center; }
.shot-wrap { position: relative; justify-self: center; width: 100%; max-width: 330px; }
.shot img { width: 100%; height: auto; border-radius: 6px; border: 1px solid var(--line); box-shadow: 0 1px 2px rgba(20, 18, 12, 0.08), 0 24px 40px -28px rgba(20, 18, 12, 0.45); }
@media (max-width: 860px) { .shot-hero { grid-template-columns: 1fr; gap: 40px; } .shot-wrap { max-width: 280px; } }`;
