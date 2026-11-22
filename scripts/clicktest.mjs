// Records a click frame by frame and lays the frames out on one sheet, so you
// can see flicker the eye misses: an icon spinning through an x, a panel that
// snaps open then crawls, a button that jumps or flashes on press.
// usage: node clicktest.mjs <url> <css-selector> [index=0] [out=click.png]
import { launch, sleep } from './cdp.mjs';

const [url, sel, idx = '0', out = 'click.png'] = process.argv.slice(2);
if (!url || !sel) { console.error('usage: node clicktest.mjs <url> <css-selector> [index] [out.png]'); process.exit(1); }

const c = await launch();
await c.viewport(1440, 900);
await c.goto(url, 2500);
const q = `document.querySelectorAll(${JSON.stringify(sel)})[${+idx}]`;
if (!(await c.ev(`!!${q}`))) { console.error(`no element matches ${sel} [${idx}]`); c.close(); process.exit(1); }
await c.ev(`window.scrollTo(0, ${q}.getBoundingClientRect().top + scrollY - 260)`);
await sleep(1600);
const r = await c.ev(`(() => { const r = ${q}.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })()`);
const cx = r.x + r.w / 2, cy = r.y + r.h / 2;

const frames = [];
const t0 = Date.now();
c.on(m => {
  if (m.method !== 'Page.screencastFrame') return;
  frames.push({ t: Date.now() - t0, data: m.params.data });
  c.send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
});
await c.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
await sleep(400);
await c.send('Page.startScreencast', { format: 'jpeg', quality: 80, everyNthFrame: 1 });
await sleep(200);
const tClick = Date.now() - t0;
await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
await sleep(90);
await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
await sleep(1100);
await c.send('Page.stopScreencast');

// Crop around the element (and the space below it, where panels open) and
// lay out up to 24 evenly spaced frames, each labelled with ms after the press.
const pick = frames.length <= 24 ? frames : Array.from({ length: 24 }, (_, i) => frames[Math.round(i * (frames.length - 1) / 23)]);
const cropX = Math.max(0, r.x - 40), cropY = Math.max(0, r.y - 40);
const cropW = Math.min(1440 - cropX, r.w + 80), cropH = Math.min(900 - cropY, r.h + 300);
const cellW = Math.min(cropW, 420), k = cellW / cropW, cellH = Math.round(cropH * k);
const cols = Math.max(1, Math.min(4, Math.floor(1720 / (cellW + 12))));
const cells = pick.map(f => `<figure><div style="width:${cellW}px;height:${cellH}px;background:url(data:image/jpeg;base64,${f.data}) ${-cropX * k}px ${-cropY * k}px/${1440 * k}px auto no-repeat"></div><figcaption>${f.t - tClick} ms</figcaption></figure>`).join('');
const html = `<style>body{margin:0;padding:16px;background:#f2f2f2;font:13px system-ui}main{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:12px}figure{margin:0}figure div{border:1px solid #ccc;background-color:#fff}figcaption{color:#555;padding-top:4px}</style><main>${cells}</main>`;
await c.send('Page.navigate', { url: 'about:blank' }); await sleep(300);
await c.ev(`document.open(); document.write(${JSON.stringify(html)}); document.close(); true`);
await sleep(500);
const size = await c.ev(`({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`);
await c.viewport(size.w, Math.min(size.h, 900));
await c.shot(out, { x: 0, y: 0, width: size.w, height: size.h }, { captureBeyondViewport: true });
console.log(`${frames.length} frames over ${frames.length ? frames.at(-1).t - frames[0].t : 0} ms, sheet: ${out}`);
c.close();
process.exit(0);
