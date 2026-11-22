// Wheel-scrolls a page in headless Chrome and reports frame timing and
// main-thread cost. Run it before and after a change and compare.
// usage: node scrolltest.mjs <url> [extraCss]
//   p50 ~16.7ms and few frames over 20ms means the browser keeps up. If the
//   numbers are good and it still "feels choppy", the fix is perceptual
//   (smooth scrolling, gentler easing), not performance.
import { launch, sleep } from './cdp.mjs';

const [url, extraCss = ''] = process.argv.slice(2);
if (!url) { console.error('usage: node scrolltest.mjs <url> [extraCss]'); process.exit(1); }

const c = await launch();
await c.send('Performance.enable');
await c.viewport(1440, 900);
await c.goto(url, 3000);
if (extraCss) await c.ev(`(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(extraCss)};document.head.appendChild(s)})()`);
await sleep(400);
await c.ev(`window.__d=[];(function f(t){if(window.__l)window.__d.push(t-window.__l);window.__l=t;requestAnimationFrame(f)})(performance.now())`);
const m0 = (await c.send('Performance.getMetrics')).metrics;
for (let i = 0; i < 160; i++) {
  c.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 60 });
  await sleep(16);
}
await sleep(300);
const m1 = (await c.send('Performance.getMetrics')).metrics;
const d = (await c.ev('window.__d')).slice(2).sort((a, b) => a - b);
const g = (m, k) => m.find(x => x.name === k)?.value || 0;
const ms = k => Math.round((g(m1, k) - g(m0, k)) * 1000);
console.log(JSON.stringify({
  frames: d.length,
  p50: +d[d.length >> 1].toFixed(1), p95: +d[Math.floor(d.length * 0.95)].toFixed(1), max: +d.at(-1).toFixed(1),
  over20ms: d.filter(x => x > 20).length, over34ms: d.filter(x => x > 34).length,
  layoutMs: ms('LayoutDuration'), styleMs: ms('RecalcStyleDuration'), scriptMs: ms('ScriptDuration'), taskMs: ms('TaskDuration'),
  scrolledTo: await c.ev('Math.round(scrollY)'),
  smoothScroll: await c.ev("document.documentElement.classList.contains('lenis')"),
}));
c.close();
process.exit(0);
