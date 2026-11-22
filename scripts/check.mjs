// Screenshots a page at desktop and phone size and checks it against the
// site-rules rules. Look at the PNGs; read the report.
// usage: node check.mjs <url> <out-prefix>
//   writes <out-prefix>-desktop.png, -desktop-full.png, -phone.png, -phone-full.png
import { launch, sleep } from './cdp.mjs';

const [url, out = 'check'] = process.argv.slice(2);
if (!url) { console.error('usage: node check.mjs <url> <out-prefix>'); process.exit(1); }

// Runs inside the page. Returns rule findings.
const AUDIT = `(() => {
  const textOf = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const visible = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const els = [...document.body.querySelectorAll('*')].filter(e => !['SCRIPT','STYLE','NOSCRIPT','SVG'].includes(e.tagName) && textOf(e) && visible(e));
  const fonts = {};
  els.forEach(e => { const f = getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim(); fonts[f] = (fonts[f] || 0) + 1; });
  const caps = els.filter(e => {
    const s = getComputedStyle(e), t = textOf(e), letters = t.replace(/[^A-Za-z]/g, '');
    return s.textTransform === 'uppercase' || (letters.length >= 6 && letters === letters.toUpperCase());
  }).map(e => textOf(e).slice(0, 50));
  const spaced = els.filter(e => { const s = getComputedStyle(e); return parseFloat(s.letterSpacing) > parseFloat(s.fontSize) * 0.05; }).map(e => textOf(e).slice(0, 50));

  // Style rules carry .cssRules too (CSS nesting), so test the type first.
  const css = [], conditions = [];
  const walk = rules => { for (const r of rules) {
    if (r instanceof CSSKeyframesRule) { css.push(r); continue; }
    if (r instanceof CSSStyleRule) css.push(r);
    else if (r.conditionText) conditions.push(r.conditionText);
    if (r.cssRules && r.cssRules.length) walk(r.cssRules);
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch {} }
  const motion = [];
  const LAYOUT = /(^|[ ,])(width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*)( |,|$)/;
  for (const r of css) {
    if (r instanceof CSSKeyframesRule) {
      for (const k of r.cssRules) if (k.style.filter || k.style.backdropFilter) motion.push('keyframes ' + r.name + ' animates filter/blur');
      continue;
    }
    const s = r.style; if (!s) continue;
    const sel = r.selectorText || '';
    if (s.backdropFilter || s.webkitBackdropFilter) motion.push(sel + ': backdrop-filter');
    if (/blur\\(/.test(s.filter)) motion.push(sel + ': filter blur');
    const tp = s.transitionProperty || '';
    if (/(^|,\\s*)all(\\s*,|$)/.test(tp) || /^all\\b/.test(s.transition || '')) motion.push(sel + ': transition: all');
    if (/filter/.test(tp)) motion.push(sel + ': transitions filter');
    if (LAYOUT.test(' ' + tp.replace(/\\s+/g, ' ') + ' ')) motion.push(sel + ': transitions a layout property (' + tp + ')');
    if (/:active/.test(sel) && s.transform && s.transform !== 'none') motion.push(sel + ': moves on press');
  }
  const header = document.querySelector('[data-header], header');
  const hs = header && getComputedStyle(header);
  return {
    title: document.title,
    favicon: !!document.querySelector('link[rel~="icon"]'),
    appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    fonts,
    caps: [...new Set(caps)].slice(0, 12),
    letterSpaced: [...new Set(spaced)].slice(0, 8),
    motion: [...new Set(motion)].slice(0, 20),
    headerBorder: hs ? hs.borderBottomWidth !== '0px' && hs.borderBottomStyle !== 'none' : null,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    placeholders: (document.documentElement.outerHTML.match(/{{[A-Z_0-9]+}}/g) || []).slice(0, 10),
    reduceMotion: conditions.some(t => /prefers-reduced-motion/.test(t)),
    textCount: els.length,
    status: performance.getEntriesByType('navigation')[0]?.responseStatus || 0,
  };
})()`;

const c = await launch();
const errors = [];
c.on(m => {
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || 'exception');
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
});

const report = {};
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
  await c.viewport(w, h, mobile);
  await c.goto(url);
  await c.shot(`${out}-${name}.png`);
  // Scroll the whole page in steps so every reveal has a chance to fire.
  const total = await c.ev('document.documentElement.scrollHeight');
  for (let y = 0; y < total; y += Math.round(h * 0.6)) { await c.ev(`window.scrollTo(0, ${y})`); await sleep(260); }
  await sleep(1200);
  const reveals = await c.ev(`(() => { const a = document.querySelectorAll('[data-reveal]'); return { total: a.length, shown: [...a].filter(e => e.hasAttribute('data-shown')).length }; })()`);
  const audit = await c.ev(AUDIT);
  await c.ev('window.scrollTo(0, 0)'); await sleep(700);
  const height = await c.ev('document.documentElement.scrollHeight');
  await c.shot(`${out}-${name}-full.png`, { x: 0, y: 0, width: w, height: Math.min(height, 16000) }, { captureBeyondViewport: true });
  report[name] = { reveals, ...audit };
}
c.close();

const d = report.desktop, p = report.phone;
const issues = [];
if (d.status >= 400) issues.push(`the page returned HTTP ${d.status}: wrong URL?`);
if (!d.textCount) issues.push('no visible text: did the page load? (check the URL and that the server is running)');
const fontNames = Object.keys(d.fonts);
if (fontNames.length > 1) issues.push(`more than one typeface: ${fontNames.map(f => `${f} (${d.fonts[f]})`).join(', ')}`);
if (d.caps.length) issues.push(`all-caps text: ${d.caps.map(t => JSON.stringify(t)).join(', ')}`);
if (d.letterSpaced.length) issues.push(`wide letter-spacing (eyebrow-style): ${d.letterSpaced.map(t => JSON.stringify(t)).join(', ')}`);
d.motion.forEach(m => issues.push(`motion: ${m}`));
if (d.headerBorder) issues.push('header has a border line; use the soft fade instead');
if (!d.favicon) issues.push('no favicon link');
if (!d.appleIcon) issues.push('no apple-touch-icon');
if (!d.reduceMotion) issues.push('no prefers-reduced-motion rule found');
if (p.overflowX) issues.push('phone: page scrolls sideways');
if (d.placeholders.length) issues.push(`unfilled placeholders: ${d.placeholders.join(' ')}`);
for (const [n, r] of [['desktop', d], ['phone', p]]) if (r.reveals.shown < r.reveals.total) issues.push(`${n}: ${r.reveals.total - r.reveals.shown} of ${r.reveals.total} reveals never showed`);
[...new Set(errors)].forEach(e => issues.push(`console: ${e}`));

console.log(`title: ${JSON.stringify(d.title)} (should be the name only)`);
console.log(`fonts: ${fontNames.join(', ')}`);
console.log(`reveals: desktop ${d.reveals.shown}/${d.reveals.total}, phone ${p.reveals.shown}/${p.reveals.total}`);
console.log(issues.length ? `\n${issues.length} issue(s):\n- ` + issues.join('\n- ') : '\nno rule issues found');
console.log(`\nscreenshots: ${out}-desktop.png ${out}-desktop-full.png ${out}-phone.png ${out}-phone-full.png`);
process.exit(0);
