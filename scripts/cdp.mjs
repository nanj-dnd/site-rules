// Tiny headless-Chrome driver over the DevTools protocol. No dependencies;
// needs Node 22+ (global WebSocket) and Chrome. Set CHROME=/path if it isn't found.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch() {
  const bin = CANDIDATES.find(p => fs.existsSync(p));
  if (!bin) throw new Error('Chrome not found. Set CHROME=/path/to/chrome');
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-rules-cdp-'));
  const proc = spawn(bin, ['--headless=new', `--remote-debugging-port=${port}`, '--window-size=1440,900',
    `--user-data-dir=${dir}`, '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

  let ws;
  for (let i = 0; i < 75 && !ws; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(x => x.type === 'page');
      if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
    } catch {}
    if (!ws) await sleep(200);
  }
  if (!ws) { proc.kill(); throw new Error('Chrome did not start'); }
  await new Promise(r => (ws.onopen = r));

  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? { error: m.error }); pending.delete(m.id); return; }
    if (m.method) listeners.forEach(fn => fn(m));
  };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
    return r.result?.value;
  };
  const viewport = (width, height, mobile = false) =>
    send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const goto = async (url, settle = 2800) => {
    await send('Page.navigate', { url });
    await sleep(800);
    await ev('document.fonts ? document.fonts.ready.then(() => true) : true');
    await sleep(settle);
  };
  const shot = async (file, clip, extra = {}) => {
    const r = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { scale: 1, ...clip } } : {}), ...extra });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  };
  const close = () => { try { ws.close(); } catch {} proc.kill(); setTimeout(() => fs.rmSync(dir, { recursive: true, force: true }), 300); };

  await send('Page.enable');
  await send('Runtime.enable');
  return { send, ev, viewport, goto, shot, close, on: fn => listeners.add(fn) };
}
