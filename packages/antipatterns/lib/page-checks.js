/*
 * In-page checks for ai-design-antipatterns.
 * Injected into a rendered page by lib/engine.mjs. Defines window.__AP with
 *   run(spec)            -> Promise<{ [ruleId]: { hits, evidence[] } }>
 *   extractText()        -> { text, lines, headings }
 *   snapshotPointer()    -> signature used by the cursor-glow check
 *   snapshotScroll()     -> signature used by the parallax check
 * Each check returns { hits: number, evidence: string[] }. A rule fires when hits > 0.
 * Plain browser JavaScript on purpose (no build step, works in any Chromium).
 */
(() => {
  if (window.__AP) return;

  // ---------- colour helpers ----------
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const colourCache = new Map();

  function toRGBA(str) {
    if (!str) return { r: 0, g: 0, b: 0, a: 0 };
    if (colourCache.has(str)) return colourCache.get(str);
    let v;
    const m = str.match(/^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
    if (m) {
      let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      v = { r: +m[1], g: +m[2], b: +m[3], a };
    } else if (str === 'transparent') {
      v = { r: 0, g: 0, b: 0, a: 0 };
    } else {
      // Anything else (oklch, lab, color(), hsl, named): let canvas convert it.
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillStyle = str;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      v = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    colourCache.set(str, v);
    return v;
  }

  function toHSL({ r, g, b, a }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l, a };
  }

  const COLOUR_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color|hwb)\([^()]*\)|#[0-9a-fA-F]{3,8}\b|\btransparent\b/g;
  const coloursIn = (s) => (s.match(COLOUR_RE) || []).map(toRGBA);
  const isChromatic = (c, minS = 0.25) => {
    const h = toHSL(c);
    return c.a >= 0.15 && h.s >= minS && h.l >= 0.12 && h.l <= 0.92;
  };
  const dist = (a, b) => Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

  function hueSpread(hues) {
    if (hues.length < 2) return 0;
    const hs = [...hues].sort((x, y) => x - y);
    let maxGap = 360 - hs[hs.length - 1] + hs[0];
    for (let i = 1; i < hs.length; i++) maxGap = Math.max(maxGap, hs[i] - hs[i - 1]);
    return 360 - maxGap;
  }
  function meanHue(hues) {
    let x = 0, y = 0;
    for (const h of hues) { x += Math.cos((h * Math.PI) / 180); y += Math.sin((h * Math.PI) / 180); }
    let m = (Math.atan2(y, x) * 180) / Math.PI;
    return m < 0 ? m + 360 : m;
  }

  function splitTop(s) {
    const out = []; let depth = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

  // ---------- element helpers ----------
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'TITLE']);
  function visible(el) {
    if (SKIP.has(el.tagName)) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  let _els = null;
  const els = () => (_els ||= [...document.body.querySelectorAll('*')].filter(visible));
  const text = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  function desc(el, extra) {
    if (!el || !el.tagName) return String(el);
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [];
    if (cls.length) s += '.' + cls.join('.');
    const t = text(el).slice(0, 50);
    if (t) s += ` "${t}${text(el).length > 50 ? '...' : ''}"`;
    return extra ? `${s} :: ${extra}` : s;
  }
  // Computed styles for an element and its ::before / ::after when they render.
  function styleLayers(el) {
    const out = [{ el, cs: getComputedStyle(el), pseudo: '' }];
    for (const p of ['::before', '::after']) {
      const cs = getComputedStyle(el, p);
      if (cs.content && cs.content !== 'none' && cs.display !== 'none') out.push({ el, cs, pseudo: p });
    }
    return out;
  }
  function layerSize(layer) {
    const r = layer.el.getBoundingClientRect();
    if (!layer.pseudo) return { w: r.width, h: r.height };
    const cs = layer.cs;
    let w = px(cs.width), h = px(cs.height);
    if (!w || cs.width === 'auto') w = cs.position === 'absolute' || cs.position === 'fixed' ? r.width - px(cs.left) - px(cs.right) : r.width;
    if (!h || cs.height === 'auto') h = cs.position === 'absolute' || cs.position === 'fixed' ? r.height - px(cs.top) - px(cs.bottom) : 0;
    return { w: Math.max(0, w), h: Math.max(0, h) };
  }
  function effectiveBg(el) {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = toRGBA(getComputedStyle(n).backgroundColor);
      if (c.a > 0.5) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  const radiusPx = (cs, w) => {
    const v = cs.borderTopLeftRadius;
    if (v.endsWith('%')) return (parseFloat(v) / 100) * w;
    return px(v);
  };
  const hasBox = (cs, el) => {
    const bg = toRGBA(cs.backgroundColor);
    const border = px(cs.borderTopWidth) > 0 && toRGBA(cs.borderTopColor).a > 0.05;
    const parentBg = el.parentElement ? effectiveBg(el.parentElement) : { r: 255, g: 255, b: 255, a: 1 };
    const bgDiffers = bg.a > 0.04 && (bg.a < 0.99 || dist(bg, parentBg) > 4);
    return bgDiffers || border || cs.boxShadow !== 'none' || cs.backgroundImage !== 'none';
  };
  const isMono = (cs) => /mono|courier|consolas|menlo|monaco|ui-monospace|sfmono|jetbrains|fira code/i.test(cs.fontFamily);
  const trackingEm = (cs) => (cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing) / Math.max(1, px(cs.fontSize)));
  const isUpper = (cs, t) => cs.textTransform === 'uppercase' || (t === t.toUpperCase() && /[A-Z]{2}/.test(t));

  // Elements that sit just before a heading (kickers, eyebrows).
  function headingLeadIns(h, lookback = 2) {
    const out = [];
    let sib = h.previousElementSibling, n = 0;
    while (sib && n < lookback) { out.push(sib); sib = sib.previousElementSibling; n++; }
    if (!h.previousElementSibling && h.parentElement) {
      let p = h.parentElement.previousElementSibling; n = 0;
      while (p && n < lookback) { out.push(p); p = p.previousElementSibling; n++; }
    }
    return out.filter((e) => visible(e));
  }
  const withDescendants = (e, depth = 3) => {
    const out = [e];
    const walk = (n, d) => { if (d > depth) return; for (const c of n.children) { out.push(c); walk(c, d + 1); } };
    walk(e, 1);
    return out.filter(visible);
  };

  function parseShadows(v) {
    if (!v || v === 'none') return [];
    return splitTop(v).map((part) => {
      const colour = (part.match(COLOUR_RE) || ['rgba(0,0,0,0)'])[0];
      const rest = part.replace(colour, '');
      const nums = (rest.match(/-?[\d.]+px/g) || []).map(px);
      return { colour: toRGBA(colour), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, inset: /inset/.test(part) };
    });
  }

  const PLACEHOLDER_COMPANIES = /\b(?:Acme(?: Corp| Inc)?|Globex|Initech|Hooli|Umbrella(?: Corp)?|Stark Industries|Wayne Enterprises|Soylent|Vandelay|Pied Piper|Cyberdyne|Massive Dynamic|Contoso|Northwind|Fabrikam|Tyrell|Aperture|TechCorp|TechStart|StartupXYZ|InnovateCo|Lorem(?: Inc)?|Company ?[A-Z]\b|Logoipsum|Logo ?Ipsum)\b/;
  const PLACEHOLDER_PEOPLE = /\b(?:Sarah Johnson|Sarah Chen|John Doe|Jane Doe|Jane Smith|John Smith|Alex Chen|Alex Johnson|Michael Chen|Michael Brown|Emily Davis|Emily Rodriguez|Emily Chen|David Kim|David Chen|Marcus Johnson|Marcus Chen|Lisa Wang|James Wilson|Jessica Lee|Maria Garcia|Priya Patel|Olivia Martinez)\b/;

  // ---------- checks ----------
  const checks = {};
  const R = () => ({ hits: 0, evidence: [] });
  const add = (res, el, why) => { res.hits++; if (res.evidence.length < 6) res.evidence.push(desc(el, why)); };

  checks.gradientHueShift = (p) => {
    const res = R();
    for (const el of els()) for (const L of styleLayers(el)) {
      // Brand-approved gradients (a brand's approved signature gradient) opt out explicitly; see gradientPolicy in rules.json.
      if (el.closest && el.closest('[data-approved-gradient]')) continue;
      const bi = L.cs.backgroundImage;
      if (!bi || !bi.includes('gradient')) continue;
      for (const layer of splitTop(bi)) {
        if (!/gradient\(/.test(layer)) continue;
        const raw = coloursIn(layer).filter((c) => isChromatic(c, p.minSaturation));
        // hard-stop stripes (one colour, then paper) are a drawing technique, not a gradient
        if (raw.length && raw.every((c) => dist(c, raw[0]) < 8) && coloursIn(layer).some((c) => !isChromatic(c, p.minSaturation) && c.a > 0.5)) continue;
        const chroma = raw.map(toHSL);
        if (chroma.length < 2) {
          // A single chromatic stop in the violet band fading to white or clear is still the AI violet look.
          if (chroma.length === 1 && chroma[0].h >= 250 && chroma[0].h <= 300 && chroma[0].s > 0.5) {
            add(res, el, `${L.pseudo}violet gradient ${layer.slice(0, 90)}`);
          }
          continue;
        }
        const hues = chroma.map((c) => c.h);
        const spread = hueSpread(hues);
        const mean = meanHue(hues);
        // Indigo/violet is the AI default even as a tonal ramp; pinks and magentas (300 to 330) only count when the hue actually shifts.
        const inVioletBand = (mean >= 250 && mean <= 300) || (mean > 300 && mean <= 330 && spread >= p.aiBandMinSpread);
        const aiBand = hues.every((h) => h >= p.aiBand[0] && h <= p.aiBand[1]) && hues.some((h) => h >= 250 && h <= 340) && spread >= p.aiBandMinSpread;
        if (spread > p.maxHueSpread || aiBand || inVioletBand) {
          add(res, el, `${L.pseudo}hue spread ${Math.round(spread)}deg, mean hue ${Math.round(mean)}: ${layer.slice(0, 90)}`);
        }
      }
    }
    return res;
  };

  checks.gradientText = () => {
    const res = R();
    for (const el of els()) {
      const cs = getComputedStyle(el);
      if ((cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text') && cs.backgroundImage.includes('gradient')) {
        add(res, el, 'background-clip:text with ' + cs.backgroundImage.slice(0, 70));
      }
    }
    return res;
  };

  checks.glowBlob = (p) => {
    const res = R();
    for (const el of els()) for (const L of styleLayers(el)) {
      const cs = L.cs;
      const { w, h } = layerSize(L);
      const t = L.pseudo ? '' : text(el);
      if (t.length > 4) continue;
      const blur = (cs.filter.match(/blur\(([\d.]+)px\)/) || [])[1];
      if (blur && +blur >= p.minBlurPx && w >= p.minSizePx && h >= p.minSizePx) { add(res, el, `${L.pseudo}filter ${cs.filter}`); continue; }
      const abs = cs.position === 'absolute' || cs.position === 'fixed';
      const bi = cs.backgroundImage;
      if (abs && /radial-gradient/.test(bi) && w >= p.minSizePx && h >= p.minSizePx) {
        const cols = coloursIn(bi);
        if (cols.some((c) => isChromatic(c, 0.3)) && cols.some((c) => c.a < 0.1)) { add(res, el, `${L.pseudo}radial glow ${bi.slice(0, 70)}`); continue; }
      }
      const bg = toRGBA(cs.backgroundColor);
      if (abs && isChromatic(bg, 0.3) && radiusPx(cs, w) >= w / 2 - 1 && w >= p.minSizePx && (px(cs.opacity) < 0.7 || bg.a < 0.6)) add(res, el, `${L.pseudo}translucent coloured orb`);
    }
    return res;
  };

  checks.meshBackground = (p) => {
    const res = R();
    const vw = window.innerWidth;
    for (const el of els()) for (const L of styleLayers(el)) {
      // Brand-approved gradients (a brand's approved signature gradient) opt out explicitly; see gradientPolicy in rules.json.
      if (el.closest && el.closest('[data-approved-gradient]')) continue;
      const bi = L.cs.backgroundImage;
      if (!bi || !bi.includes('gradient')) continue;
      const { w, h } = layerSize(L);
      if (w < p.minWidthRatio * vw || h < p.minHeightPx) continue;
      const layers = splitTop(bi).filter((l) => /gradient\(/.test(l));
      const chromaLayers = layers.filter((l) => coloursIn(l).some((c) => isChromatic(c, 0.25)));
      const hues = chromaLayers.flatMap((l) => coloursIn(l).filter((c) => isChromatic(c, 0.25)).map((c) => toHSL(c).h));
      if (layers.some((l) => /conic-gradient/.test(l)) && hueSpread(hues) > 60) add(res, el, `${L.pseudo}rainbow conic gradient background`);
      else if (chromaLayers.length >= p.minLayers && hueSpread(hues) > 20) add(res, el, `${L.pseudo}${chromaLayers.length} coloured gradient layers, hue spread ${Math.round(hueSpread(hues))}deg`);
      else if (chromaLayers.length >= 1 && hueSpread(hues) > 60) add(res, el, `${L.pseudo}multi-hue background, spread ${Math.round(hueSpread(hues))}deg`);
    }
    return res;
  };

  checks.glowEverywhere = (p) => {
    const res = R();
    for (const el of els()) for (const L of styleLayers(el)) {
      const cs = L.cs;
      const glows = [...parseShadows(cs.boxShadow), ...parseShadows(cs.textShadow).map((s) => ({ ...s, spread: 0 }))].filter((s) =>
        !s.inset && Math.abs(s.x) <= 2 && Math.abs(s.y) <= 4 && s.blur >= p.minBlurPx && s.colour.a >= 0.2 && toHSL(s.colour).s >= p.minSaturation);
      const drop = (cs.filter.match(/drop-shadow\([^)]*\)[^)]*\)/g) || []).filter((d) => { const c = coloursIn(d)[0]; return c && isChromatic(c, p.minSaturation); });
      if (glows.length || drop.length) add(res, el, `${L.pseudo}coloured glow shadow`);
    }
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.gradientBorder = (p) => {
    const res = R();
    for (const el of els()) for (const L of styleLayers(el)) {
      const cs = L.cs;
      if (cs.borderImageSource && cs.borderImageSource.includes('gradient')) { add(res, el, `${L.pseudo}border-image gradient`); continue; }
      const layers = splitTop(cs.backgroundImage || '').filter((l) => /gradient\(/.test(l));
      const bw = px(cs.borderTopWidth);
      if (layers.length && bw > 0 && toRGBA(cs.borderTopColor).a < 0.05 && /border-box/.test(cs.backgroundOrigin + cs.backgroundClip)) { add(res, el, `${L.pseudo}padding-box/border-box gradient border`); continue; }
      const mc = cs.maskComposite || cs.webkitMaskComposite || '';
      if (layers.length && mc && !/^(add|source-over)(,\s*(add|source-over))*$/.test(mc)) add(res, el, `${L.pseudo}mask-composite gradient ring`);
    }
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.glassText = (p) => {
    const res = R();
    for (const el of els()) {
      const cs = getComputedStyle(el);
      const bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
      if (!/blur/.test(bf)) continue;
      const blurPx = parseFloat((bf.match(/blur\(([\d.]+)px\)/) || [0, 0])[1]);
      if (!(blurPx > 0)) continue;
      const bg = toRGBA(cs.backgroundColor);
      if (bg.a >= p.maxBgAlpha) continue;
      // A mostly opaque frosted sticky header is a common, legible pattern; only flag see-through ones.
      const bar = /^(HEADER|NAV)$/.test(el.tagName) || el.closest('header,nav');
      if (bar && (cs.position === 'fixed' || cs.position === 'sticky' || el.closest('header,nav') !== el) && bg.a >= 0.6) continue;
      if (text(el).length >= p.minTextChars) add(res, el, `backdrop-filter ${bf}, bg alpha ${bg.a.toFixed(2)}`);
    }
    return res;
  };

  checks.allCentred = (p) => {
    const res = R();
    const blocks = els().filter((e) => /^(H1|H2|H3|H4|P|LI|BLOCKQUOTE)$/.test(e.tagName) && text(e).length >= 3 && !e.closest('nav,footer,button,header nav'));
    if (blocks.length < p.minBlocks) return res;
    const centred = blocks.filter((e) => getComputedStyle(e).textAlign === 'center');
    const ratio = centred.length / blocks.length;
    if (ratio >= p.ratio) { res.hits = 1; res.evidence.push(`${centred.length} of ${blocks.length} text blocks centred (${Math.round(ratio * 100)}%)`); }
    return res;
  };

  function sig(e) { return e.tagName + '|' + (typeof e.className === 'string' ? e.className.trim().split(/\s+/).sort().join(' ') : ''); }

  checks.identicalCards = (p) => {
    const res = R();
    const seen = new Set();
    for (const parent of els()) {
      if (parent.closest('nav,footer')) continue;
      const kids = [...parent.children].filter(visible);
      if (kids.length < p.minCards) continue;
      const groups = new Map();
      for (const k of kids) { const s = sig(k); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(k); }
      for (const g of groups.values()) {
        if (g.length < p.minCards) continue;
        const ok = g.filter((k) => {
          // decorative icon: an svg / icon font / emoji, not a photo or avatar
          const hasIcon = k.querySelector('svg,i,[class*="icon"]') || /^\p{Extended_Pictographic}/u.test(text(k));
          const hasHead = k.querySelector('h2,h3,h4,h5');
          const hasBody = k.querySelector('p') || text(k).length > 25;
          return hasIcon && hasHead && hasBody && !k.querySelector('img') && text(k).length < 260;
        });
        if (ok.length < p.minCards) continue;
        const ws = ok.map((k) => k.getBoundingClientRect().width), hs = ok.map((k) => k.getBoundingClientRect().height);
        const close = (arr) => (Math.max(...arr) - Math.min(...arr)) / Math.max(...arr) <= p.sizeTolerance;
        if (close(ws) && close(hs) && !seen.has(parent)) {
          seen.add(parent);
          add(res, parent, `${ok.length} identical icon + heading + blurb cards`);
        }
      }
    }
    return res;
  };

  checks.bentoGrid = (p) => {
    const res = R();
    for (const el of els()) {
      const cs = getComputedStyle(el);
      if (!/grid/.test(cs.display)) continue;
      const kids = [...el.children].filter(visible);
      if (kids.length < p.minTiles) continue;
      const spans = kids.filter((k) => {
        const c = getComputedStyle(k);
        return [c.gridColumnStart, c.gridColumnEnd, c.gridRowStart, c.gridRowEnd].some((v) => /span\s*([2-9])/.test(v)) ||
          (/^\d+$/.test(c.gridColumnEnd) && /^\d+$/.test(c.gridColumnStart) && +c.gridColumnEnd - +c.gridColumnStart >= 2) ||
          (/^\d+$/.test(c.gridRowEnd) && /^\d+$/.test(c.gridRowStart) && +c.gridRowEnd - +c.gridRowStart >= 2);
      });
      const ws = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().width / 8)));
      const hs = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().height / 8)));
      const tiles = kids.filter((k) => { const c = getComputedStyle(k); return radiusPx(c, k.getBoundingClientRect().width) >= p.minRadiusPx && hasBox(c, k); });
      if ((spans.length >= 1 || (ws.size >= 2 && hs.size >= 2)) && tiles.length / kids.length >= 0.75) add(res, el, `${kids.length} rounded tiles, ${spans.length} spanning`);
    }
    return res;
  };

  checks.templateOrder = (p) => {
    const res = R();
    let sections = [...document.querySelectorAll('section, header, footer, main > div, body > div > section')].filter(visible);
    sections = sections.filter((s) => !sections.some((o) => o !== s && o.contains(s) && o.tagName === 'SECTION'));
    const cats = [];
    const has = (s, re) => re.test(text(s).slice(0, 600));
    const head = (s) => [...s.querySelectorAll('h1,h2,h3')].map(text).join(' | ');
    for (const s of sections) {
      let c = null;
      if (s.querySelector('h1')) c = 'hero';
      else if (has(s, /\b(trusted by|used by|loved by (?:teams|companies)|teams at|companies like|as seen (?:in|on)|backed by)\b/i)) c = 'logos';
      else if (/\b(testimonials?|what (?:our )?(?:customers|clients|users|people) (?:are )?say(?:ing)?|loved by|hear from|wall of love)\b/i.test(head(s))) c = 'testimonials';
      else if (/\b(pricing|plans?|simple,? transparent)\b/i.test(head(s)) || s.querySelectorAll('[class*="price"],[class*="plan"]').length >= 2) c = 'pricing';
      else if (/\b(faq|frequently asked|questions)\b/i.test(head(s)) || s.querySelectorAll('details').length >= 3) c = 'faq';
      else if (/\b(ready to|get started|start (?:your )?free|join (?:thousands|today|now)|sign up)\b/i.test(head(s))) c = 'cta';
      else if (/\b(features?|everything you need|why choose|capabilities|what you get|why us|built for)\b/i.test(head(s))) c = 'features';
      if (c && !cats.includes(c)) cats.push(c);
    }
    const canon = ['hero', 'logos', 'features', 'testimonials', 'pricing', 'faq', 'cta'];
    const idx = cats.map((c) => canon.indexOf(c));
    // longest increasing subsequence
    const lis = [];
    for (const v of idx) { let i = lis.findIndex((x) => x >= v); if (i === -1) lis.push(v); else lis[i] = v; }
    if (lis.length >= p.minMatches) { res.hits = 1; res.evidence.push(`section order: ${cats.join(' > ')} (${lis.length} of 7 template steps in order)`); }
    return res;
  };

  checks.uniformRadius = (p) => {
    const res = R();
    const boxes = els().filter((e) => {
      if (e === document.body || e === document.documentElement) return false;
      const r = e.getBoundingClientRect();
      if (r.width * r.height < 2000) return false;
      const cs = getComputedStyle(e);
      return e.tagName === 'IMG' || hasBox(cs, e);
    });
    if (boxes.length < p.minBoxes) return res;
    const big = boxes.filter((e) => radiusPx(getComputedStyle(e), e.getBoundingClientRect().width) >= p.minRadiusPx);
    if (big.length / boxes.length >= p.ratio) { res.hits = 1; res.evidence.push(`${big.length} of ${boxes.length} boxes have radius >= ${p.minRadiusPx}px`); }
    return res;
  };

  const TW_GREYS = ['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a','#020617',
    '#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827','#030712',
    '#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b','#09090b',
    '#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717','#0a0a0a'].map(toRGBA);
  const DEFAULT_FONTS = /^(inter|inter var|inter variable|geist|geist sans|ui-sans-serif|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|arial|helvetica|helvetica neue|sans-serif)$/i;

  checks.defaultTypeStack = (p) => {
    const res = R();
    const first = (el) => getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/["']/g, '');
    const h1 = document.querySelector('h1') || document.body;
    const fonts = [first(document.body), first(h1)];
    if (!fonts.every((f) => DEFAULT_FONTS.test(f))) return res;
    const samples = els().filter((e) => /^(P|H1|H2|H3|H4|LI|SPAN|A)$/.test(e.tagName) && ownText(e).length > 2);
    if (samples.length < 3) return res;
    const grey = samples.filter((e) => { const c = toRGBA(getComputedStyle(e).color); return TW_GREYS.some((g) => dist(c, g) <= 6); });
    const ratio = grey.length / samples.length;
    if (ratio >= p.minGreyRatio) { res.hits = 1; res.evidence.push(`font "${fonts[0]}" with Tailwind grey text on ${Math.round(ratio * 100)}% of text`); }
    return res;
  };

  checks.monoCapsKicker = (p) => {
    const res = R();
    for (const h of document.querySelectorAll('h1,h2,h3')) {
      if (!visible(h)) continue;
      for (const c of headingLeadIns(h, 1)) {
        if (/^H[1-6]$/.test(c.tagName) || c.closest('nav')) continue;
        if (text(c).length === 0 || text(c).length > p.maxChars) continue;
        const hit = withDescendants(c).find((e) => {
          const t = text(e); if (!t || t.length > p.maxChars) return false;
          const cs = getComputedStyle(e);
          return isMono(cs) || (isUpper(cs, t) && trackingEm(cs) >= p.minTrackingEm);
        });
        if (hit) { add(res, hit, `kicker above "${text(h).slice(0, 40)}"`); break; }
      }
    }
    return res;
  };

  checks.accentWordHeadline = (p) => {
    const res = R();
    for (const h of document.querySelectorAll('h1,h2')) {
      if (!visible(h)) continue;
      const base = toRGBA(getComputedStyle(h).color);
      for (const s of h.querySelectorAll('span,em,strong,mark,b,i')) {
        if (!text(s)) continue;
        const cs = getComputedStyle(s);
        const c = toRGBA(cs.color);
        const hcs = getComputedStyle(h);
        const fam = (x) => x.fontFamily.split(',')[0].trim().replace(/["']/g, '').toLowerCase();
        if (c.a < 0.5 || dist(c, base) >= p.minColourDistance || (cs.backgroundClip === 'text' || cs.webkitBackgroundClip === 'text')) {
          add(res, s, `colour ${cs.color} inside heading coloured ${hcs.color}`);
          break;
        }
        if (fam(cs) !== fam(hcs) || (cs.fontStyle === 'italic' && hcs.fontStyle !== 'italic' && /serif|fraunces|instrument|playfair|georgia|times|garamond|newsreader|lora/i.test(cs.fontFamily) && !/sans/i.test(cs.fontFamily.split(',')[0]))) {
          add(res, s, `accent word in ${cs.fontStyle} "${fam(cs)}" inside "${fam(hcs)}" heading`);
          break;
        }
      }
    }
    return res;
  };

  function isPill(e, maxChars) {
    const t = text(e);
    if (!t || t.length > maxChars) return false;
    const r = e.getBoundingClientRect();
    if (r.height < 14 || r.height > 48) return false;
    const cs = getComputedStyle(e);
    const rad = radiusPx(cs, r.width);
    if (rad < r.height / 2 - 1.5) return false;
    const bg = toRGBA(cs.backgroundColor);
    const border = px(cs.borderTopWidth) > 0 && toRGBA(cs.borderTopColor).a > 0.05;
    return bg.a > 0.04 || border || cs.backgroundImage !== 'none';
  }

  checks.eyebrowPill = (p) => {
    const res = R();
    for (const h of document.querySelectorAll('h1,h2')) {
      if (!visible(h)) continue;
      for (const c of headingLeadIns(h, p.lookback)) {
        if (c.closest('nav') || /^H[1-6]$/.test(c.tagName) || text(c).length > p.maxChars) continue;
        const pill = withDescendants(c).find((e) => !/^(BUTTON|INPUT)$/.test(e.tagName) && isPill(e, p.maxChars) && e.getBoundingClientRect().width < 0.9 * (e.parentElement || document.body).getBoundingClientRect().width);
        if (pill) { add(res, pill, `pill above "${text(h).slice(0, 40)}"`); break; }
      }
    }
    return res;
  };

  checks.chipWall = (p) => {
    const res = R();
    const counted = new Set();
    for (const parent of els()) {
      const chips = [];
      for (const k of parent.children) {
        const cand = isPill(k, 32) && k.getBoundingClientRect().height <= p.maxChipHeightPx ? k : [...k.children].find((g) => isPill(g, 32) && g.getBoundingClientRect().height <= p.maxChipHeightPx);
        if (cand && !/^(BUTTON|INPUT)$/.test(cand.tagName)) chips.push(cand);
      }
      if (chips.length >= p.minChips && !chips.some((c) => counted.has(c))) { chips.forEach((c) => counted.add(c)); add(res, parent, `${chips.length} pill chips`); }
    }
    return res;
  };

  checks.floatingChips = (p) => {
    const res = R();
    for (const el of els()) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute') continue;
      if (el.closest('nav') || el.matches('[role="tooltip"],[class*="skip"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.right < 0) continue;
      const t = text(el);
      if (!t || t.length < 3 || /^[\d\s+]+$/.test(t) || t.length > 80 || r.width > p.maxChipWidthPx || r.height > p.maxChipHeightPx) continue;
      const bg = toRGBA(cs.backgroundColor);
      if (cs.boxShadow !== 'none' || bg.a > 0.5) add(res, el, 'absolutely positioned chip over content');
    }
    if (res.hits < p.minChips) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.tintedIconSquares = (p) => {
    const res = R();
    for (const el of els()) {
      const r = el.getBoundingClientRect();
      if (r.width < p.minSizePx || r.width > p.maxSizePx || Math.abs(r.width - r.height) > 3) continue;
      if (/^(A|BUTTON)$/.test(el.tagName)) continue;
      const inner = el.querySelector('svg,i,img') || (/^\p{Extended_Pictographic}/u.test(text(el)) && text(el).length <= 3);
      if (!inner) continue;
      const cs = getComputedStyle(el);
      const bg = toRGBA(cs.backgroundColor);
      const parentBg = effectiveBg(el.parentElement || document.body);
      if (!((bg.a > 0.04 && dist(bg, parentBg) > 6) || cs.backgroundImage.includes('gradient'))) continue;
      if (radiusPx(cs, r.width) < 4) continue;
      add(res, el, `${Math.round(r.width)}px tinted icon tile`);
    }
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.emojiBullets = (p) => {
    const res = R();
    const EMOJI = /^\s*\p{Extended_Pictographic}/u;
    for (const el of els()) {
      if (!/^(LI|H1|H2|H3|H4|H5|DT|BUTTON)$/.test(el.tagName)) continue;
      const own = text(el);
      if (EMOJI.test(own)) { add(res, el, 'starts with emoji'); continue; }
      if (el.tagName === 'LI') { const b = getComputedStyle(el, '::before').content; if (b && /\p{Extended_Pictographic}/u.test(b)) add(res, el, 'emoji bullet via ::before'); }
    }
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  const SHADCN = {
    '--primary': ['222.2 47.4% 11.2%', '240 5.9% 10%', '0 0% 9%', 'oklch(0.205 0 0)', 'hsl(222.2 47.4% 11.2%)'],
    '--foreground': ['222.2 84% 4.9%', '240 10% 3.9%', '0 0% 3.9%', 'oklch(0.145 0 0)'],
    '--muted-foreground': ['215.4 16.3% 46.9%', '240 3.8% 46.1%', '0 0% 45.1%', 'oklch(0.556 0 0)'],
    '--border': ['214.3 31.8% 91.4%', '240 5.9% 90%', '0 0% 89.8%', 'oklch(0.922 0 0)'],
    '--secondary': ['210 40% 96.1%', '240 4.8% 95.9%', '0 0% 96.1%', 'oklch(0.97 0 0)'],
    '--ring': ['222.2 84% 4.9%', '240 5.9% 10%', '0 0% 3.9%', 'oklch(0.708 0 0)', '240 10% 3.9%'],
    '--destructive': ['0 84.2% 60.2%', 'oklch(0.577 0.245 27.325)'],
    '--radius': ['0.5rem', '0.625rem'],
  };
  checks.shadcnDefaults = (p) => {
    const res = R();
    const root = getComputedStyle(document.documentElement);
    const norm = (s) => s.trim().replace(/\s+/g, ' ');
    const matched = Object.entries(SHADCN).filter(([k, vals]) => vals.includes(norm(root.getPropertyValue(k))));
    const darkBtn = ['rgb(15, 23, 42)', 'rgb(24, 24, 27)', 'rgb(23, 23, 23)', 'rgb(9, 9, 11)', 'rgb(10, 10, 10)'];
    const btn = [...document.querySelectorAll('button,a[class*="btn"],a[class*="button"],[role="button"]')].filter(visible).find((b) => {
      const c = getComputedStyle(b);
      return darkBtn.includes(c.backgroundColor) && ['6px', '8px', '10px'].includes(c.borderTopLeftRadius) && c.fontSize === '14px' && c.fontWeight === '500';
    });
    const cardBorders = ['rgb(226, 232, 240)', 'rgb(228, 228, 231)', 'rgb(229, 229, 229)', 'rgb(235, 235, 235)'];
    const card = els().find((e) => { const c = getComputedStyle(e); return cardBorders.includes(c.borderTopColor) && px(c.borderTopWidth) === 1 && ['8px', '12px', '14px'].includes(c.borderTopLeftRadius) && e.getBoundingClientRect().width > 200; });
    if (matched.length >= p.minVarMatches) { res.hits++; res.evidence.push(`shadcn default theme variables: ${matched.map(([k]) => k).join(', ')}`); }
    if (btn && card) { res.hits++; res.evidence.push(desc(btn, 'default slate/zinc 14px button') ); res.evidence.push(desc(card, 'default grey-bordered card')); }
    return res;
  };

  checks.fakeUi = (p) => {
    const res = R();
    for (const el of els()) {
      const kids = [...el.children].filter(visible);
      // traffic-light window chrome
      if (kids.length >= 3 && kids.slice(0, 3).every((k) => {
        const r = k.getBoundingClientRect(); const cs = getComputedStyle(k);
        return !text(k) && Math.abs(r.width - r.height) <= 1 && r.width >= 6 && r.width <= 18 && radiusPx(cs, r.width) >= r.width / 2 - 0.5 && toRGBA(cs.backgroundColor).a > 0.2;
      })) { add(res, el, 'window traffic-light dots'); continue; }
      // fake chart columns
      const bars = kids.filter((k) => !text(k) && k.children.length === 0 && toRGBA(getComputedStyle(k).backgroundColor).a > 0.1);
      if (bars.length >= p.minChartBars) {
        const ws = bars.map((b) => Math.round(b.getBoundingClientRect().width));
        const hs = new Set(bars.map((b) => Math.round(b.getBoundingClientRect().height / 4)));
        if (Math.max(...ws) - Math.min(...ws) <= 2 && hs.size >= 3) { add(res, el, `${bars.length} fake chart bars`); continue; }
      }
    }
    // skeleton text bars
    for (const el of els()) {
      const leaves = [...el.querySelectorAll('*')].filter((k) => {
        if (k.children.length || text(k) || !visible(k) || k.tagName === 'HR' || k.tagName === 'IMG' || k.tagName === 'svg') return false;
        const r = k.getBoundingClientRect();
        return r.height >= 4 && r.height <= 16 && r.width >= 20 && toRGBA(getComputedStyle(k).backgroundColor).a > 0.05;
      });
      if (leaves.length >= p.minSkeletonBars && ![...el.children].some((c) => [...c.querySelectorAll('*')].filter((k) => leaves.includes(k)).length >= p.minSkeletonBars)) {
        add(res, el, `${leaves.length} skeleton placeholder bars`);
      }
    }
    return res;
  };

  checks.gridDotBackdrop = (p) => {
    const res = R();
    const vw = window.innerWidth;
    for (const el of els()) for (const L of styleLayers(el)) {
      const cs = L.cs;
      const bi = cs.backgroundImage;
      if (!bi || !bi.includes('gradient')) continue;
      const { w, h } = layerSize(L);
      if (w < p.minWidthRatio * vw || h < 120) continue;
      if (/%/.test(cs.backgroundSize) && !/repeating/.test(bi)) continue;
      const sizes = (cs.backgroundSize.match(/[\d.]+px/g) || []).map(px);
      const repeating = /repeating-(linear|radial)-gradient/.test(bi);
      const smallTile = sizes.length && sizes.every((s) => s > 0 && s <= p.maxTilePx);
      if (smallTile || repeating) add(res, el, `${L.pseudo}tiled ${/radial/.test(bi) ? 'dot' : 'line'} pattern ${cs.backgroundSize}`);
    }
    return res;
  };

  checks.sparkles = () => {
    const res = R();
    // Only UI chrome (headings, buttons, links, badges), not user content such as chat or message demos.
    for (const el of els()) {
      if (!/^(H1|H2|H3|H4|BUTTON|A|LABEL)$/.test(el.tagName) && !(el.tagName === 'SPAN' && text(el).length <= 24)) continue;
      if (/[\u2728\u2726\u2727]/.test(ownText(el) || (el.tagName !== 'SPAN' ? text(el) : ''))) add(res, el, 'sparkle character');
    }
    for (const s of document.querySelectorAll('svg')) {
      const label = [s.getAttribute('class'), s.getAttribute('aria-label'), s.getAttribute('data-icon'), s.getAttribute('data-lucide'), s.closest('[class*="sparkle"]') ? 'sparkle' : ''].join(' ');
      if (/sparkle|wand/i.test(label)) add(res, s, 'sparkles icon');
    }
    return res;
  };

  checks.fadeUpEverything = (p) => {
    const res = R();
    for (const el of els()) {
      const cls = typeof el.className === 'string' ? el.className : '';
      const cs = getComputedStyle(el);
      if (el.matches('[data-aos],[data-animate],[data-reveal],[data-motion],[data-scroll-reveal],[data-sal]') ||
        /(?:^|\s)(?:reveal|fade-?up|fade-?in-?up|animate-on-scroll|aos-[\w-]+|scroll-reveal|slide-?up|js-reveal|motion-fade)(?:\s|$)/i.test(cls) ||
        (cs.opacity === '0' && (cs.transform !== 'none' || cs.translate !== 'none') && text(el).length > 0) ||
        /fade|rise|reveal|slide-?up|enter/i.test(cs.animationName) && cs.animationName !== 'none') {
        add(res, el, 'scroll entrance animation');
      }
    }
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  const ms = (v) => (v || '0s').split(',').map((x) => (x.trim().endsWith('ms') ? parseFloat(x) : parseFloat(x) * 1000));
  checks.staggerSiblings = (p) => {
    const res = R();
    for (const parent of els()) {
      const kids = [...parent.children].filter(visible);
      if (kids.length < p.minSiblings) continue;
      const delays = kids.map((k) => { const c = getComputedStyle(k); return Math.max(...ms(c.transitionDelay), ...ms(c.animationDelay)); });
      const distinct = new Set(delays.filter((d) => d > 0));
      let increasing = true;
      for (let i = 1; i < delays.length; i++) if (!(delays[i] > delays[i - 1])) increasing = false;
      if (distinct.size >= p.minSiblings - 1 && increasing) add(res, parent, `sibling delays ${delays.map((d) => Math.round(d) + 'ms').join(', ')}`);
    }
    return res;
  };

  function hoverRules() {
    const out = [];
    const walk = (rules) => {
      for (const r of rules) {
        if (r.cssRules && !(r instanceof CSSStyleRule)) { walk(r.cssRules); continue; }
        if (!(r instanceof CSSStyleRule) || !r.selectorText.includes(':hover')) continue;
        const st = r.style;
        const tf = [st.transform, st.translate, st.scale, st.cssText].join(' ');
        const lift = /scale\(\s*(?:1\.0[2-9]|1\.[1-9]|[2-9])/i.test(tf) || /translateY\(\s*-/.test(tf) || /translate\(\s*[^,]+,\s*-/.test(tf) ||
          /translate3d\(\s*[^,]+,\s*-/.test(tf) || /(?:^|;)\s*translate:\s*\S+\s+-/.test(st.cssText) || /(?:^|;)\s*scale:\s*(?:1\.0[2-9]|1\.[1-9])/.test(st.cssText) ||
          /--tw-translate-y:\s*(?:-|calc\([^)]*-)/.test(st.cssText) || /--tw-scale-[xy]:\s*1(?:0[2-9]|[1-9]\d)%/.test(st.cssText);
        if (lift) out.push(r.selectorText);
        if (r.cssRules && r.cssRules.length) walk(r.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (_) { /* cross-origin */ } }
    return out;
  }
  checks.hoverLift = (p) => {
    const res = R();
    const targets = new Set();
    for (const sel of hoverRules()) {
      for (const part of sel.split(',')) {
        const base = part.replace(/:hover/g, '').replace(/:focus(-visible|-within)?/g, '').trim() || '*';
        try {
          for (const el of document.querySelectorAll(base)) {
            if (el.matches('a,button,[role="button"],input,select,textarea,summary,label') || !visible(el)) continue;
            if (el.closest('a,button') && el.closest('a,button') !== el) continue;
            targets.add(el);
          }
        } catch (_) { /* invalid selector */ }
      }
    }
    for (const el of targets) add(res, el, 'lifts or scales on hover');
    if (res.hits < p.minCount) return { hits: 0, evidence: res.evidence };
    return res;
  };

  function hasReducedMotionRule() {
    const walk = (rules) => { for (const r of rules) { if (r.media && /prefers-reduced-motion/.test(r.media.mediaText)) return true; if (r.cssRules && walk(r.cssRules)) return true; } return false; };
    for (const sh of document.styleSheets) { try { if (walk(sh.cssRules)) return true; } catch (_) { /* cross-origin */ } }
    return false;
  }
  function infiniteAnims() {
    return document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming().iterations === Infinity && a.effect.target);
  }
  const isSpinner = (t) => t.closest && t.closest('[role="progressbar"],[aria-busy="true"],[class*="spinner"],[class*="loader"],[class*="loading"]');
  const keyframeText = (a) => { try { return JSON.stringify(a.effect.getKeyframes()); } catch (_) { return ''; } };

  checks.infiniteDecor = (p) => {
    const res = R();
    const targets = new Map();
    for (const a of infiniteAnims()) {
      const t = a.effect.target;
      if (isSpinner(t)) continue;
      const tr = t.getBoundingClientRect && t.getBoundingClientRect();
      if (tr && (tr.width < 16 || tr.height < 16)) continue;
      const key = t; if (!targets.has(key)) targets.set(key, a);
    }
    for (const [t, a] of targets) add(res, t, `infinite animation "${a.animationName || a.id || 'waapi'}"${a.effect.pseudoElement ? ' on ' + a.effect.pseudoElement : ''}`);
    if (res.hits >= p.minCount || (res.hits >= 1 && !hasReducedMotionRule())) return res;
    return { hits: 0, evidence: res.evidence };
  };

  checks.logoMarquee = (p) => {
    const res = R();
    for (const a of infiniteAnims()) {
      const t = a.effect.target;
      if (!/translate|transform|left|margin/.test(keyframeText(a))) continue;
      const kids = [...t.children].filter(visible);
      const items = kids.filter((k) => k.querySelector('img,svg') || k.tagName === 'IMG' || k.tagName === 'svg' || (text(k).length > 0 && text(k).length <= 28));
      if (items.length >= p.minItems && /translate|X/i.test(keyframeText(a))) add(res, t, `${items.length} items scrolling forever`);
    }
    return res;
  };

  checks.typewriter = async (p) => {
    const res = R();
    const heads = [...document.querySelectorAll('h1,h2')].filter(visible).slice(0, 4);
    const before = heads.map(text);
    for (const h of heads) {
      for (const e of withDescendants(h, 3).concat(h.nextElementSibling ? [h.nextElementSibling] : [])) {
        const cs = getComputedStyle(e);
        const after = getComputedStyle(e, '::after');
        if (/steps\(/.test(cs.animationTimingFunction) || /blink|caret|type|cursor/i.test(cs.animationName) || /blink|caret|type|cursor/i.test(after.animationName)) { add(res, e, `caret or steps() animation near "${text(h).slice(0, 30)}"`); break; }
      }
    }
    await new Promise((r) => setTimeout(r, p.observeMs));
    heads.forEach((h, i) => { if (text(h) !== before[i]) add(res, h, `headline text changed: "${before[i].slice(0, 30)}" -> "${text(h).slice(0, 30)}"`); });
    return res;
  };

  checks.spinningHero = (p) => {
    const res = R();
    for (const a of infiniteAnims()) {
      const t = a.effect.target; const r = t.getBoundingClientRect();
      if (r.width < p.minSizePx || r.height < p.minSizePx) continue;
      if (/rotate/i.test(keyframeText(a))) add(res, t, 'large element rotating forever');
    }
    for (const c of document.querySelectorAll('canvas')) {
      const r = c.getBoundingClientRect();
      if (r.width < 300 || r.top > 1000) continue;
      let gl = null; try { gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (_) { gl = null; }
      if (gl) add(res, c, 'WebGL canvas in the hero');
    }
    return res;
  };

  const TRUSTED_RE = /\b(trusted by|used by|loved by|backed by|teams at|companies like|as seen (?:in|on)|powering|featured in|trusted by (?:over|more than))\b/i;
  checks.trustedByLogos = (p) => {
    const res = R();
    // Real logo strips use the clients' logo files; typed-out wordmarks and placeholder names are the tell.
    const rowItems = (row) => [...row.children].filter(visible).filter((k) => !k.querySelector('img,svg') && k.tagName !== 'IMG' && k.tagName !== 'svg' && !k.querySelector('a') && k.tagName !== 'A' && text(k).length > 0 && text(k).length <= 24);
    for (const label of els()) {
      const t = text(label);
      if (!t || t.length > 90 || !TRUSTED_RE.test(t) || label.children.length > 3 || label.closest('footer,nav')) continue;
      const cands = [label.nextElementSibling, label.nextElementSibling && label.nextElementSibling.firstElementChild, label.parentElement && label.parentElement.nextElementSibling].filter(Boolean);
      const row = cands.find((r) => rowItems(r).length >= p.minItems);
      if (row) { add(res, row, `"${t.slice(0, 40)}" + ${rowItems(row).length} logos`); break; }
    }
    if (!res.hits) for (const row of els()) {
      const items = [...row.children].filter(visible).filter((k) => text(k).length <= 30 || (k.getAttribute && k.getAttribute('alt')));
      if (items.length >= p.minItems && items.filter((k) => PLACEHOLDER_COMPANIES.test(text(k) || (k.getAttribute && (k.getAttribute('alt') || '')))).length >= 2) { add(res, row, 'row of placeholder company names'); break; }
    }
    return res;
  };

  const STAT_RE = /^\s*(?:[<>~]?\s*[$\u00a3\u20ac]?\s*[\d.,]+\s*(?:\+|x|\u00d7|%|[kKmMbB]\+?|bn\+?|\/7)|24\/7|[\d.]+\s*\/\s*(?:5|10)|[\d.,]+[kKmMbB]?\+)\s*$/;
  checks.inflatedStats = (p) => {
    const res = R();
    for (const el of els()) {
      const t = ownText(el) || (el.children.length === 0 ? text(el) : '');
      if (!t || t.length > 12 || !STAT_RE.test(t)) continue;
      if (px(getComputedStyle(el).fontSize) < p.minFontPx) continue;
      add(res, el, 'big unsourced stat');
    }
    if (res.hits < p.minStats) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.avatarStack = (p) => {
    const res = R();
    for (const parent of els()) {
      const kids = [...parent.children].filter(visible);
      const av = kids.filter((k) => { const r = k.getBoundingClientRect(); return Math.abs(r.width - r.height) <= 2 && r.width >= 18 && r.width <= 64 && radiusPx(getComputedStyle(k), r.width) >= r.width * 0.45; });
      if (av.length < p.minAvatars) continue;
      let overlaps = 0;
      for (let i = 1; i < av.length; i++) if (av[i].getBoundingClientRect().left < av[i - 1].getBoundingClientRect().right - 2) overlaps++;
      if (overlaps >= p.minAvatars - 1) add(res, parent, `${av.length} overlapping avatars`);
    }
    return res;
  };

  checks.placeholderTestimonials = (p) => {
    const res = R();
    const ctxEls = [...document.querySelectorAll('blockquote,figure,figcaption,cite,[class*="testimonial"],[class*="review"],[class*="quote"]')].filter(visible);
    for (const e of ctxEls) {
      const t = text(e.closest('figure,[class*="testimonial"],[class*="review"],li,article') || e);
      if (PLACEHOLDER_PEOPLE.test(t) || PLACEHOLDER_COMPANIES.test(t) || /\b(?:CEO|CTO|COO|Founder|Co-founder|Head of \w+|VP of \w+|Product Manager|Marketing (?:Director|Manager))\s*(?:at|@|,)\s*(?:Company|Startup|TechCo|Inc\.?)\b/.test(t)) {
        add(res, e, `placeholder name or company: ${(t.match(PLACEHOLDER_PEOPLE) || t.match(PLACEHOLDER_COMPANIES) || [''])[0]}`);
        break;
      }
    }
    const starCards = new Set();
    for (const el of els()) {
      const t = ownText(el);
      const svgStars = el.children.length >= 5 && [...el.children].slice(0, 5).every((c) => c.tagName === 'svg');
      if (/\u2605{5}|\u2b50{5}/.test(t) || (svgStars && /star/i.test(el.innerHTML))) {
        const card = el.closest('figure,article,li,blockquote,[class*="card"],[class*="testimonial"]') || el.parentElement;
        if (card) starCards.add(card);
      }
    }
    if (starCards.size >= p.minFiveStarCards) { res.hits++; res.evidence.push(`${starCards.size} five-star quote cards`); }
    return res;
  };

  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const isNeon = (c) => { if (c.a < 0.5) return false; const h = toHSL(c); return h.s >= 0.75 && h.l >= 0.45 && h.l <= 0.75 && ((h.h >= 70 && h.h <= 195) || (h.h >= 255 && h.h <= 335)); };
  checks.darkNeon = (p) => {
    const res = R();
    const vw = window.innerWidth, vh = window.innerHeight;
    // the dominant canvas: what sits under the middle of the first viewport
    const probe = document.elementFromPoint(vw / 2, Math.min(vh - 10, 400)) || document.body;
    const bg = effectiveBg(probe);
    if (lum(bg) > p.maxBgLuminance) return res;
    for (const el of els()) {
      const cs = getComputedStyle(el);
      const why = [];
      if (ownText(el) && isNeon(toRGBA(cs.color))) why.push('neon text ' + cs.color);
      if (px(cs.borderTopWidth) > 0 && isNeon(toRGBA(cs.borderTopColor))) why.push('neon border');
      if ([...parseShadows(cs.boxShadow), ...parseShadows(cs.textShadow)].some((s) => s.blur >= 8 && isNeon({ ...s.colour, a: Math.max(s.colour.a, 0.6) }))) why.push('neon glow');
      if (why.length) add(res, el, why.join(', '));
    }
    if (res.hits < p.minNeon) return { hits: 0, evidence: res.evidence };
    res.evidence.unshift(`dark canvas ${`rgb(${bg.r}, ${bg.g}, ${bg.b})`}`);
    return res;
  };

  checks.numberedSteps = (p) => {
    const res = R();
    const nums = els().filter((e) => /^(?:0\d|step\s*0?\d)\.?$/i.test(ownText(e) || (e.children.length === 0 ? text(e) : '')) && (px(getComputedStyle(e).fontSize) >= p.minFontPx || isMono(getComputedStyle(e))));
    // group by grandparent so one section's 01/02/03 counts together
    const groups = new Map();
    for (const n of nums) { const g = n.parentElement && n.parentElement.parentElement || document.body; groups.set(g, (groups.get(g) || []).concat(n)); }
    for (const [g, list] of groups) if (list.length >= p.minSteps) add(res, g, `${list.length} zero-padded step numbers (${list.map(text).join(', ')})`);
    return res;
  };

  checks.stripeCards = (p) => {
    const res = R();
    const colours = new Set(); let left = 0;
    for (const el of els()) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 60) continue;
      const sides = { left: [cs.borderLeftWidth, cs.borderLeftColor], top: [cs.borderTopWidth, cs.borderTopColor] };
      for (const [side, [w, c]] of Object.entries(sides)) {
        const wpx = px(w); const col = toRGBA(c);
        const other = side === 'left' ? px(cs.borderRightWidth) : px(cs.borderBottomWidth);
        if (wpx >= p.minStripePx && other < wpx && isChromatic(col, 0.3)) { add(res, el, `${wpx}px ${side} stripe ${c}`); colours.add(c); if (side === 'left') left++; break; }
      }
    }
    // One consistent top rule (GOV.UK style) is a system choice; side stripes or a colour per card is the tell.
    if (res.hits < p.minCount || (colours.size < 2 && left < p.minCount)) return { hits: 0, evidence: res.evidence };
    return res;
  };

  checks.templateLeftovers = (p) => {
    const res = R();
    const t = document.body.innerText;
    const year = new Date().getFullYear();
    for (const m of t.matchAll(/(?:©|copyright|\(c\))\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/gi)) {
      if (+m[1] < year - p.maxCopyrightAgeYears) { res.hits++; res.evidence.push(`stale copyright "${m[0]}" (now ${year})`); }
    }
    const pats = [/lorem ipsum/i, /\[your [a-z ]+\]/i, /\byour (?:company|brand|business) name\b/i, /\bYourBrand\b|\bYourLogo\b|\bLogoipsum\b/, /\bedit with lovable\b/i, /\bmade with (?:lovable|bolt|v0)\b/i, /\bbuilt with v0\b/i, /\bjohn@example\.com\b|\bhello@example\.com\b/i];
    for (const re of pats) { const m = t.match(re); if (m) { res.hits++; res.evidence.push(`placeholder text "${m[0]}"`); } }
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (/lovable\.dev\/projects|utm_source=lovable|bolt\.new\/~|v0\.dev\/chat|v0\.app\/chat|\/\/(www\.)?example\.com|mailto:[^@]+@example\.com/i.test(h) && visible(a)) add(res, a, 'builder or placeholder link ' + h.slice(0, 60));
    }
    const gen = document.querySelector('meta[name="generator"]');
    if (gen && /lovable|bolt|v0/i.test(gen.content)) { res.hits++; res.evidence.push('generator meta: ' + gen.content); }
    return res;
  };

  // ---------- node-orchestrated helpers ----------
  let keyCounter = 0;
  const keyOf = (el) => (el.__apKey ||= ++keyCounter);
  function pointerSnapshot() {
    const out = {};
    for (const el of [document.documentElement, document.body, ...els()]) {
      const i = keyOf(el);
      const parts = [];
      for (let k = 0; k < el.style.length; k++) { const n = el.style[k]; if (n.startsWith('--')) parts.push(n + '=' + el.style.getPropertyValue(n)); }
      for (const L of styleLayers(el)) {
        if (/radial-gradient/.test(L.cs.backgroundImage) || /blur/.test(L.cs.filter)) parts.push(L.pseudo + L.cs.backgroundImage + L.cs.transform + L.cs.left + L.cs.top + L.cs.translate);
      }
      if (parts.length) out[i + ':' + desc(el).slice(0, 80)] = parts.join('|');
    }
    return out;
  }
  function scrollSnapshot() {
    const out = {};
    for (const el of els()) {
      const i = keyOf(el);
      const cs = getComputedStyle(el);
      if (text(el).length > 0 && !el.matches('[aria-hidden="true"]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 60 || r.height < 60) continue;
      let pinned = false;
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const ps = getComputedStyle(n).position; if (ps === 'fixed' || ps === 'sticky') { pinned = true; break; } }
      out[i + ':' + desc(el).slice(0, 80)] = { y: r.top + window.scrollY, transform: cs.transform, timeline: cs.animationTimeline || '', pos: pinned ? 'fixed' : cs.position };
    }
    return out;
  }

  window.__AP = {
    async run(spec) {
      _els = null;
      const out = {};
      for (const { id, check, params } of spec) {
        const fn = checks[check];
        if (!fn) { out[id] = { hits: 0, evidence: [], error: 'unknown check ' + check }; continue; }
        try { out[id] = await fn(params || {}); } catch (e) { out[id] = { hits: 0, evidence: [], error: String(e && e.message || e) }; }
      }
      return out;
    },
    extractText() {
      const t = document.body ? document.body.innerText : '';
      return { text: t, title: document.title };
    },
    pointerSnapshot() { _els = null; return pointerSnapshot(); },
    scrollSnapshot() { _els = null; return scrollSnapshot(); },
  };
})();
