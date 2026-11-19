// tools/qa/eyepack-lib.mjs — Playwright helpers for the owner eye-check screenshot pack (see eyepack.mjs).
import { createRequire } from 'node:module';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

export const BASE = process.env.QA_BASE ?? 'http://localhost:5173/';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Open a fresh page (empty storage) at a given size; console, page errors and failed requests go to <outDir>/console.log. */
export async function openPage(browser, outDir, size, query, tag, init) {
  mkdirSync(outDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: size[2] ?? 1, hasTouch: true, isMobile: true });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const logf = join(outDir, 'console.log');
  const log = (lvl, t) => appendFileSync(logf, `${new Date().toISOString()} [${tag}] [${lvl}] ${t}\n`);
  page.on('console', (m) => log(m.type(), m.text()));
  page.on('pageerror', (e) => log('pageerror', e.stack ?? String(e)));
  page.on('requestfailed', (r) => log('requestfailed', `${r.url()} ${r.failure()?.errorText}`));
  await page.goto(BASE + query);
  // Direct DevTools capture: much quicker than page.screenshot under SwiftShader, which matters for transient effects (trail, chevron, flashes).
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, shot: async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(outDir, name), Buffer.from(r.data, 'base64')); return name;
  } };
}

export const active = (page) => page.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));
export const waitScene = (page, key, ms = 15000) => page.waitForFunction((k) => window.__game?.scene.isActive(k), key, { timeout: ms });
export const status = (page) => page.evaluate(() => window.__game.scene.getScene('Game')?.flow?.status ?? null);
export const session = (page, expr) => page.evaluate(`(() => { const s = window.__game.registry.get('session'); return ${expr}; })()`);
export const snap = (page) => session(page, 's.snapshot()');

/** Init script that seeds a save once per context (empty storage when `data` is null). */
export const seedScript = (data) => data === null ? '' :
  `if (!localStorage.getItem('mango-snake.save')) localStorage.setItem('mango-snake.save', ${JSON.stringify(JSON.stringify({ version: 3, data }))});`;
export const settings = (o = {}) => ({ sound: false, haptics: false, dpad: false, reducedMotion: null, boardTheme: null, ...o });
/** A veteran save: every skill unlocked, full carried energy, shield + slow-mo in the loadout. */
export const veteran = (o = {}, s = {}) => ({ bestScore: 1234, bestLevel: 28, fullClear: false, unlockedCheckpoints: [10, 20], carriedEnergy: 100,
  lastLoadout: ['shield', 'slowmo'], settings: settings(s), ...o });

/** Fractions of the canvas (the game letterboxes to a fixed 9:16 stage, so fractions are stable across sizes). */
export const at = (page, fx, fy) => { const v = page.viewportSize(); return [Math.round(v.width * fx), Math.round(v.height * fy)]; };
export const tapAt = async (page, fx, fy) => { const [x, y] = at(page, fx, fy); await page.touchscreen.tap(x, y); };
export const swipe = async (page, f1, f2, steps = 2) => {
  const [x1, y1] = at(page, ...f1), [x2, y2] = at(page, ...f2);
  await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps }); await page.mouse.up();
};
export const HOME_PLAY = [0.5, 0.703], HOME_GEAR = [0.894, 0.059], HOME_PICK = [0.73, 0.934], HOME_L1 = [0.25, 0.934];
export const DIR = { up: [[0.5, 0.55], [0.5, 0.42]], down: [[0.5, 0.45], [0.5, 0.58]], left: [[0.55, 0.5], [0.42, 0.5]], right: [[0.45, 0.5], [0.58, 0.5]] };

/** Wait until the active scene list differs from `before` (scene slides are slow under SwiftShader). */
const changed = async (page, before, ms = 9000) => { for (let t = 0; t < ms; t += 200) { if ((await active(page)).join() !== before) return true; await sleep(200); } return false; };
/** Tap once, wait for the scene to change; repeat only if nothing happened (taps during an entrance animation are ignored). */
export async function tapUntilScene(page, f, key, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const before = (await active(page)).join();
    if (before.includes(key)) return;
    await tapAt(page, ...f); await changed(page, before);
  }
  if (!(await active(page)).includes(key)) throw new Error(`tapUntilScene: ${key} never became active`);
}
export const LOADOUT_GO = [0.5, 0.92];
/** From Home press Play (and Go on the Loadout that veteran saves pass through) until the run is in the waiting state. */
export async function play(page, onLoadout) {
  await waitScene(page, 'Home'); await sleep(2500);
  for (let i = 0; i < 8; i++) {
    const sc = await active(page), before = sc.join();
    if (sc.includes('Game')) break;
    if (sc.includes('Loadout')) { if (onLoadout) { await onLoadout(page); onLoadout = null; } await tapAt(page, ...LOADOUT_GO); }
    else await tapAt(page, ...HOME_PLAY);
    await changed(page, before);
  }
  await page.waitForFunction(() => window.__game.scene.getScene('Game')?.flow?.status === 'waiting', null, { timeout: 15000 });
}
/** Burst of n screenshots as fast as the page allows (transient effects). */
export async function burst(o, prefix, n, gap = 0) {
  const names = []; for (let i = 1; i <= n; i++) { names.push(await o.shot(`${prefix}-${String(i).padStart(2, '0')}.png`)); if (gap) await sleep(gap); }
  return names;
}

/**
 * In-page autopilot (greedy: toward the mango around the snake body, hazards and terrain; prefers the roomiest neighbour) so a run
 * survives the slow headless frame rate while screenshots are taken. Steers through session.turn(); stop with stopPilot().
 * Not a real bot: it ignores moving hazards (coconuts, NPCs, bombs).
 */
export const startPilot = async (page, { chase = true, ms = 40 } = {}) => { await hook(page); return startPilot0(page, { chase, ms }); };
const startPilot0 = (page, { chase, ms }) => page.evaluate(({ chase, ms }) => {
  const W = 17, H = 17, D = [[0, -1], [1, 0], [0, 1], [-1, 0]], k = (x, y) => x + ',' + y;
  const s = window.__game.registry.get('session');
  window.__decide = () => {
    let n; try { n = s.snapshot(); } catch { return; }
    if (n.status !== 'playing' || !n.snake.length) return;
    const bad = new Set(), add = (c) => { if (c && Number.isInteger(c.x)) bad.add(k(c.x, c.y)); };
    n.snake.slice(0, -1).forEach(add);
    n.hazards.forEach((h) => h.cells.forEach(add)); n.terrains.forEach((t) => t.cells.forEach(add));
    n.fixedTerrain.cells.forEach(add); n.rottenRocks.forEach(add); n.snipWall.forEach(add);
    const f = n.families; // late-game families: closed/warned shrink ring, spikes, gates, coconut and NPC cells (their lanes are not predicted)
    f.shrink?.cells.forEach((c) => { if (c.on !== false) add(c); });
    f.spike.forEach((s) => s.cells.forEach(add)); f.gate.forEach((g) => { g.fence.forEach(add); g.gate.forEach(add); });
    [...f.coconut, ...f.npc].forEach((m) => add(m.cell)); f.bomb.forEach((b) => (b.cells ?? []).forEach(add));
    const hd = n.snake[0], back = k(hd.x - n.dir.x, hd.y - n.dir.y);
    const free = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !bad.has(k(x, y));
    const targets = new Set([...(chase && n.mango ? [k(n.mango.x, n.mango.y)] : []), ...n.rainMangoes.map((m) => k(m.x, m.y)), ...(chase ? n.orbs.map((m) => k(m.x, m.y)) : [])]);
    const room = (sx, sy) => { // flood-fill size from a cell (capped)
      const seen = new Set([k(sx, sy), k(hd.x, hd.y)]), q = [[sx, sy]]; let c = 0;
      while (q.length && c++ < 300) { const [x, y] = q.shift(); D.forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (free(a, b) && !seen.has(k(a, b))) { seen.add(k(a, b)); q.push([a, b]); } }); }
      return seen.size;
    };
    const dist = (sx, sy) => { // BFS steps to the nearest target (999 when none reachable)
      if (!targets.size) return 999;
      const seen = new Set([k(sx, sy), k(hd.x, hd.y)]); let f = [[sx, sy]];
      for (let d = 0; f.length && d < 40; d++) {
        if (f.some(([a, b]) => targets.has(k(a, b)))) return d;
        const g = []; f.forEach(([a, b]) => D.forEach(([ex, ey]) => { const c = a + ex, e = b + ey; if (free(c, e) && !seen.has(k(c, e))) { seen.add(k(c, e)); g.push([c, e]); } })); f = g;
      }
      return 999;
    };
    let best = null;
    for (const [dx, dy] of D) {
      const x = hd.x + dx, y = hd.y + dy; if (k(x, y) === back || !free(x, y)) continue;
      const r = room(x, y), score = (r < n.snake.length + 4 ? -1000 : 0) - dist(x, y) * 10 + Math.min(r, 60) / 10 + (dx === n.dir.x && dy === n.dir.y ? 1 : 0);
      if (!best || score > best.score) best = { dx, dy, score };
    }
    if (best && !(best.dx === n.dir.x && best.dy === n.dir.y)) { const ok = s.turn(best.dx, best.dy); window.__turns = (window.__turns ?? []).concat([[hd.x, hd.y, best.dx, best.dy, ok]]).slice(-12); }
  };
  window.__pilotOn = true;
}, { chase, ms });
export const stopPilot = (page) => page.evaluate(() => { window.__pilotOn = false; });
/**
 * Idempotent session.frame() hook: records every sim event type in window.__ev, and (while the pilot is on) runs the pilot before each
 * <= 30 ms slice of the frame, because under SwiftShader one frame can span several sim ticks.
 */
export const hook = (page) => page.evaluate(() => {
  if (window.__hooked) return; window.__hooked = true; window.__ev = [];
  const s = window.__game.registry.get('session'), orig = s.frame.bind(s);
  s.frame = (ms) => {
    window.__fr = (window.__fr ?? []).concat([[Math.round(ms), window.__pilotOn ? 1 : 0]]).slice(-30);
    const evs = []; let rest = ms;
    while (rest > 0) { const c = Math.min(rest, 30); if (window.__pilotOn) { try { window.__decide?.(); } catch (e) { console.error("pilot: " + e.message); window.__pilotOn = false; } } evs.push(...orig(c)); rest -= c; }
    for (const e of evs) window.__ev.push({ ...e, at: performance.now() });
    return evs;
  };
});
/** Start the run (the first input leaves the waiting state) with a key press: much cheaper than a synthetic swipe under SwiftShader. */
export const startRun = async (page, key = 'ArrowUp') => { await page.keyboard.press(key); };

/** Real touch events through CDP (the steer trail may only answer to touch pointers, not to page.mouse). */
export async function touchApi(page) {
  const c = await page.context().newCDPSession(page);
  // Mouse-type pointer events through CDP (no actionability waits). CDP touch events did not reach Phaser in this setup.
  let at = [0, 0];
  const m = (type, x, y, extra = {}) => { at = [x, y]; return c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...extra }); };
  return { down: (x, y) => m('mousePressed', x, y, { buttons: 1 }), move: (x, y) => m('mouseMoved', x, y, { buttons: 1 }), up: () => m('mouseReleased', at[0], at[1]) };
}
