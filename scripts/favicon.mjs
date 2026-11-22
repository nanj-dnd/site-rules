// Flat letter favicons: one letter, one colour, on one colour. No gradients,
// no sheen, no metal. Renders with the site's own Google font.
// usage:
//   node favicon.mjs --letter a --bg '#0a0a0a' --fg '#ffffff' --font 'EB Garamond' --weight 500 --out icons
// options:
//   --italic            italic letter
//   --size 0.9          letter height relative to the tile (default 0.62 of the tile for caps-height)
//   --dx 0 --dy 0       nudge in px on the 512 tile
//   --border '#e5e5e5'  hairline ring, for white tiles that vanish on white tabs
//   --dot '#0088ff'     a small round accent dot, bottom right
//   --name icon         file prefix (icon-32.png, icon-180.png, icon-512.png)
// The 32 and 512 are rounded squares; the 180 apple-touch-icon is full bleed
// because iOS rounds it itself (transparent corners turn black there).
import fs from 'node:fs';
import path from 'node:path';
import { launch } from './cdp.mjs';

const a = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2), v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) a[k] = true; else { a[k] = v; i++; }
}
const opt = {
  letter: a.letter || 'a', bg: a.bg || '#0a0a0a', fg: a.fg || '#ffffff', font: a.font || 'EB Garamond',
  weight: a.weight || '500', italic: !!a.italic, size: parseFloat(a.size || '0.62'),
  dx: +(a.dx || 0), dy: +(a.dy || 0), border: a.border || '', dot: a.dot || '', name: a.name || 'icon',
};
const out = a.out || 'icons';
fs.mkdirSync(out, { recursive: true });

const fam = opt.font.replace(/ /g, '+');
const html = `<!doctype html><link href="https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${opt.italic ? 1 : 0},${opt.weight}&display=block" rel="stylesheet"><body></body>`;

const c = await launch();
await c.send('Page.navigate', { url: 'data:text/html,' + encodeURIComponent(html) });
const result = await c.ev(`(async () => {
  const o = ${JSON.stringify(opt)};
  const font = (o.italic ? 'italic ' : '') + o.weight + ' 100px "' + o.font + '"';
  await document.fonts.load(font, o.letter);
  if (!document.fonts.check(font, o.letter)) return { error: 'font did not load: ' + o.font };
  function tile(rounded) {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    x.fillStyle = o.bg; x.beginPath(); rounded ? x.roundRect(0, 0, S, S, 112) : x.rect(0, 0, S, S); x.fill();
    if (o.border) { x.strokeStyle = o.border; x.lineWidth = 14; x.beginPath(); rounded ? x.roundRect(7, 7, S - 14, S - 14, 105) : x.rect(7, 7, S - 14, S - 14); x.stroke(); }
    // Size the letter by its real ink height, then centre its ink box.
    x.font = font; let m = x.measureText(o.letter);
    const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const px = Math.round(100 * (S * o.size) / inkH);
    const f2 = (o.italic ? 'italic ' : '') + o.weight + ' ' + px + 'px "' + o.font + '"';
    x.font = f2; m = x.measureText(o.letter);
    const w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const tx = S / 2 - w / 2 + m.actualBoundingBoxLeft + o.dx - (o.dot ? 22 : 0);
    const ty = S / 2 - h / 2 + m.actualBoundingBoxAscent + o.dy;
    x.fillStyle = o.fg; x.fillText(o.letter, tx, ty);
    if (o.dot) { x.fillStyle = o.dot; x.beginPath(); x.arc(S - 109, S - 135, 31, 0, Math.PI * 2); x.fill(); }
    return cv;
  }
  function scaled(src, n) {
    // Step down in halves so small sizes stay crisp.
    let cur = src;
    while (cur.width / 2 >= n) { const c2 = document.createElement('canvas'); c2.width = c2.height = cur.width / 2; const g = c2.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c2.width, c2.height); cur = c2; }
    const c3 = document.createElement('canvas'); c3.width = c3.height = n; const g = c3.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, n, n);
    return c3.toDataURL('image/png');
  }
  const r = tile(true), sq = tile(false);
  return { 512: r.toDataURL('image/png'), 32: scaled(r, 32), 180: scaled(sq, 180) };
})()`);
c.close();
if (result.error) { console.error(result.error); process.exit(1); }
for (const n of ['32', '180', '512']) {
  const f = path.join(out, `${opt.name}-${n}.png`);
  fs.writeFileSync(f, Buffer.from(result[n].split(',')[1], 'base64'));
  console.log(f);
}
process.exit(0);
