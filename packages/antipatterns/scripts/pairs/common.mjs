// Shared page shell for the synthetic pairs. Five fictional UK businesses keep the content concrete.
export const BIZ = {
  hp: { name: 'Harbour &amp; Pine', tag: 'Joinery, Merewick', nav: ['Kitchens', 'Recent work', 'Prices'], cta: 'Book a survey', legal: 'Harbour &amp; Pine Joinery Ltd', place: 'Unit 4, Quay Road, Merewick MW19 8TX' },
  fn: { name: 'Fieldnote', tag: 'Job sheets for tree surgeons', nav: ['How it works', 'Pricing', 'Sign in'], cta: 'Try it for 30 days', legal: 'Fieldnote Software Ltd', place: 'Made in Ashby Vale' },
  np: { name: 'Northgate Physio', tag: 'Kingsport', nav: ['Treatments', 'Prices', 'Find us'], cta: 'Book online', legal: 'Northgate Physiotherapy Ltd', place: '41 Northgate Road, Kingsport KP2 0AB' },
  ss: { name: 'Saltmarsh Sea School', tag: 'Dinghy sailing, Wessex', nav: ['Courses', 'Dates', 'Kit list'], cta: 'See dates', legal: 'Saltmarsh Sea School CIC', place: 'Merewick Hard, Merewick Harbour' },
  ll: { name: 'Ledgerline', tag: 'Bookkeeping for trades, Easthope', nav: ['Services', 'Prices', 'About'], cta: 'Send us your books', legal: 'Ledgerline Bookkeeping Ltd', place: '18 Bridge Street, Easthope EP11 1NX' },
};

export function header(key) {
  const b = BIZ[key];
  return `<div class="wrap"><header class="bar">
    <a class="brand" href="#">${b.name} <small>${b.tag}</small></a>
    <nav class="nav" aria-label="Main">${b.nav.map((n) => `<a href="#">${n}</a>`).join('')}<a class="btn btn-ink btn-sm" href="#">${b.cta}</a></nav>
  </header></div>`;
}

export function footer(key, year = 2026) {
  const b = BIZ[key];
  return `<div class="wrap"><footer class="footer"><span>&copy; ${year} ${b.legal}</span><span>${b.place}</span></footer></div>`;
}

export function page({ id, kind, title, biz, css = '', body, script = '', note = '', noFooter = false, headExtra = '', footerHtml = null }) {
  const label = kind === 'bad' ? `<!-- ANTIPATTERN ${id}: ${note} -->\n` : `<!-- FIX for ${id}: ${note} -->\n`;
  return `<!doctype html>
${label}<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} (${id} ${kind})</title>
<link rel="stylesheet" href="../_shared/good.css">${headExtra}
${css.trim() ? `<style>\n${css.trim()}\n</style>` : ''}
</head>
<body>
${header(biz)}
<main>
${body.trim()}
</main>
${footerHtml !== null ? footerHtml : noFooter ? '' : footer(biz)}
${script.trim() ? `<script>\n${script.trim()}\n</script>` : ''}
</body>
</html>
`;
}

// Apply [from, to] replacements and fail loudly if a replacement does not match.
export function swap(src, pairs, id) {
  let out = src;
  for (const [a, b] of pairs) {
    if (!out.includes(a)) throw new Error(`${id}: bad replacement did not match: ${a.slice(0, 80)}`);
    out = out.split(a).join(b);
  }
  return out;
}
