// tools/qa/shot.mjs — headless Chrome driver over DevTools (no dependency). See docs/PLAYTEST.md "How to capture".
// Steps: size wait until:<ms>,<js> go tap swipe down move up key shot eval media | log:<file> | burst:<prefix>,<n>,<gapMs> | levelup:<level> (debug). Console output is logged next to the shots.
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
  // Console hook: console.*, uncaught exceptions and browser log entries go to console.log next to the first screenshot
  // (or to the path of a `log:<file>` step). Errors and warnings are also echoed to stderr.
  const logLines = []; let logPath = null, logged = 0;
  const addLog = (level, text) => {
    const line = `${new Date().toISOString()} [${level}] ${text}`; logLines.push(line);
    if (level === 'error' || level === 'warning' || level === 'exception') console.error(`shot: ${level}: ${text}`);
  };
  const flushLog = () => {
    if (!logPath || logged >= logLines.length) return;
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, logLines.slice(logged).join('\n') + '\n'); logged = logLines.length;
  };
  const argText = (a) => a.value !== undefined ? String(typeof a.value === 'object' ? JSON.stringify(a.value) : a.value) : (a.description ?? a.type);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === 'Runtime.consoleAPICalled') addLog(d.params.type === 'warn' ? 'warning' : d.params.type, d.params.args.map(argText).join(' '));
    else if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; addLog('exception', `${e.exception?.description ?? e.text} (${e.url ?? ''}:${e.lineNumber ?? '?'})`); }
    else if (d.method === 'Log.entryAdded') addLog(d.params.entry.level, `${d.params.entry.text} ${d.params.entry.url ?? ''}`.trim());
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id; pending.set(i, (d) => (d.error ? rej(new Error(`${method}: ${d.error.message}`)) : res(d.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Runtime.enable'); await send('Log.enable');
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
    else if (k === 'log') { logPath = v; flushLog(); }
    else if (k === 'wait') await sleep(Number(v));
    else if (k === 'until') { // until:<timeoutMs>,<js expression>: poll every 100 ms until truthy (e.g. a scene is active); logs a note on timeout
      const cut2 = v.indexOf(','), limit = Number(v.slice(0, cut2)), expr = v.slice(cut2 + 1); let ok = false;
      for (let t = 0; t < limit && !ok; t += 100) {
        const r = await send('Runtime.evaluate', { expression: `(() => { try { return !!(${expr}); } catch { return false; } })()`, returnByValue: true });
        ok = r.result?.value === true; if (!ok) await sleep(100);
      }
      if (!ok) console.error(`shot: until timed out: ${expr}`);
    }
    else if (k === 'tap') { const [x, y] = nums(); await touch('touchStart', [{ x, y }]); await sleep(60); await touch('touchEnd', []); }
    else if (k === 'down') { const [x, y] = nums(); await touch('touchStart', [{ x, y }]); } // down/move/up: a drag with shots in between (trail)
    else if (k === 'move') { const [x, y] = nums(); await touch('touchMove', [{ x, y }]); }
    else if (k === 'up') await touch('touchEnd', []);
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
      logPath ??= join(dirname(v), 'console.log'); flushLog();
    } else if (k === 'burst') { // burst:<prefix>,<count>,<gapMs> -> <prefix>-01.png ... (short frame series for transient effects)
      const [prefix, count, gap] = v.split(','); mkdirSync(dirname(prefix), { recursive: true });
      for (let i = 1; i <= Number(count); i++) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`${prefix}-${String(i).padStart(2, '0')}.png`, Buffer.from(r.data, 'base64')); await sleep(Number(gap));
      }
      logPath ??= join(dirname(prefix), 'console.log'); flushLog();
    } else if (k === 'levelup') { // levelup:<level> debug level-up chain via window.__game (needs ?debug=1 and a running run); prints true/false
      const r = await send('Runtime.evaluate', { expression: `window.__game.registry.get('session').debugSkipTo(${Number(v)})`, returnByValue: true });
      console.log(JSON.stringify(r.result?.value ?? null));
    } else if (k === 'eval') {
      const r = await send('Runtime.evaluate', { expression: v, awaitPromise: true, returnByValue: true });
      console.log(JSON.stringify(r.result?.value ?? null));
    } else throw new Error(`shot: unknown step ${step}`);
  }
  flushLog(); ws.close();
} catch (e) { console.error(String(e)); code = 1; }
proc.kill();
process.exit(code);
