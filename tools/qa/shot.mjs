// tools/qa/shot.mjs — headless Chrome driver over DevTools (no dependency). See docs/PLAYTEST.md "How to capture".
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) { console.error('shot: no Chrome found; set CHROME_PATH'); process.exit(1); }

const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageSocket() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('shot: Chrome did not start');
}

let code = 0;
try {
  const ws = new WebSocket(await pageSocket());
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(`${method}: ${d.error.message}`)) : res(d.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  for (const step of process.argv.slice(2)) {
    const cut = step.indexOf(':'), k = step.slice(0, cut), v = step.slice(cut + 1);
    const nums = () => v.split(',').map(Number);
    if (k === 'size') {
      const [width, height, dpr = 2] = nums();
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: true });
      await send('Emulation.setTouchEmulationEnabled', { enabled: true });
    } else if (k === 'media') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });
    else if (k === 'go') await send('Page.navigate', { url: v });
    else if (k === 'wait') await sleep(Number(v));
    else if (k === 'tap') { const [x, y] = nums(); await touch('touchStart', [{ x, y }]); await sleep(60); await touch('touchEnd', []); }
    else if (k === 'swipe') {
      const [x1, y1, x2, y2] = nums();
      await touch('touchStart', [{ x: x1, y: y1 }]);
      for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: x1 + (x2 - x1) * i / 6, y: y1 + (y2 - y1) * i / 6 }]); await sleep(16); }
      await touch('touchEnd', []);
    } else if (k === 'key') {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: v, code: v });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: v, code: v });
    } else if (k === 'shot') {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      mkdirSync(dirname(v), { recursive: true }); writeFileSync(v, Buffer.from(r.data, 'base64'));
    } else if (k === 'eval') {
      const r = await send('Runtime.evaluate', { expression: v, awaitPromise: true, returnByValue: true });
      console.log(JSON.stringify(r.result?.value ?? null));
    } else throw new Error(`shot: unknown step ${step}`);
  }
  ws.close();
} catch (e) { console.error(String(e)); code = 1; }
proc.kill();
process.exit(code);
