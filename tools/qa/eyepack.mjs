// tools/qa/eyepack.mjs — owner eye-check screenshot pack (Playwright). Needs a dev server: `npx vite --port 5199`, then QA_BASE=http://localhost:5199/.
// Usage: node tools/qa/eyepack.mjs <outDir> [scenario ...]   (no scenario = all; names are the keys of `scenarios`).
// Sizes: 540x960 and 360x640 (EYEPACK_SIZES="540x960,360x640" to change; add @2 for device scale 2, e.g. 360x640@2).
// Every scenario opens a fresh browser context with a seeded save (or empty storage) and the `?debug=1` handle (window.__game) so that
// level jumps, skills and autopilot steering can reach states that are slow to reach by tapping. Console output, page errors and failed
// requests of every page are appended to <outDir>/console.log (tagged by scenario and size).
import {
  chromium, openPage, seedScript, veteran, settings, sleep, waitScene, play, tapAt, burst, session, snap, status, active,
  startPilot, stopPilot, hook, touchApi, startRun, tapUntilScene, HOME_GEAR, HOME_PICK, HOME_PLAY,
} from './eyepack-lib.mjs';

const out = process.argv[2] ?? 'tmp/qa/eyecheck';
const only = process.argv.slice(3);
const SIZES = (process.env.EYEPACK_SIZES ?? '540x960,360x640').split(',').map((s) => { const [a, d] = s.split('@'); return [...a.split('x').map(Number), Number(d ?? 1)]; });

const skipTo = (page, n) => session(page, `s.debugSkipTo(${n})`);
const spy = hook; // window.__ev records every sim event type seen by session.frame()
const seen = (page, type) => page.evaluate((t) => window.__ev.some((e) => e.type === t), type);
async function waitEvent(page, type, ms = 20000) {
  for (let t = 0; t < ms; t += 100) { if (await seen(page, type)) return true; await sleep(100); }
  return false;
}
const note = (tag, ...a) => console.log(tag, ...a);
const frames = async (o, prefix, n, gap = 0) => { for (let i = 1; i <= n; i++) { await o.shot(`${prefix}-${String(i).padStart(2, "0")}_${o.tag}.png`); if (gap) await sleep(gap); } };

const scenarios = {
  // Home / Loadout / Settings (U6) and the first-run Home.
  async menus(o, tag) {
    const { page } = o; await waitScene(page, 'Home'); await sleep(3000);
    await o.shot(`U6-home-veteran_${tag}.png`);
    await tapUntilScene(page, HOME_PICK, 'Loadout'); await sleep(1500);
    await o.shot(`U6-loadout_${tag}.png`);
    await tapAt(page, 0.5, 0.49); await sleep(700); await o.shot(`U6-loadout-tap-tailsnip_${tag}.png`); // pick Tail Snip (slot ring moves)
    await tapAt(page, 0.5, 0.31); await sleep(700); await o.shot(`U6-loadout-tap-slowmo_${tag}.png`);
    await page.goto(page.url()); await waitScene(page, 'Home'); await sleep(3000);
    await tapUntilScene(page, HOME_GEAR, 'Settings'); await sleep(1500);
    await o.shot(`U6-settings_${tag}.png`);
  },
  // U4c steer feedback: finger hint, swipe trail mid-drag, chevron after the swipe, level-up flash and mango-bar flash.
  async steer(o, tag) {
    const { page } = o; await play(page); await sleep(800);
    await o.shot(`U4c-wait-finger-hint-1_${tag}.png`); await sleep(500); await o.shot(`U4c-wait-finger-hint-2_${tag}.png`);
    const [w, h] = [page.viewportSize().width, page.viewportSize().height];
    await startPilot(page, { chase: false });
    const tc = await touchApi(page);
    // The trail fades within a few frames, so keep the finger moving (a slow curve, then a jitter) while the shots are taken.
    await tc.down(w * 0.5, h * 0.62);
    let stop = false;
    const drag = (async () => {
      for (let i = 0; !stop; i++) {
        const t = Math.min(i / 30, 1), x = w * (0.5 - 0.25 * t) + (i % 2), y = h * (0.62 - 0.14 * Math.sin(t * Math.PI / 2)) + (i % 2);
        await tc.move(x, y); await sleep(16);
      }
    })();
    await sleep(350); await o.shot(`U4c-swipe-trail-mid-drag-1_${tag}.png`);
    await sleep(150); await o.shot(`U4c-swipe-trail-mid-drag-2_${tag}.png`);
    stop = true; await drag; await tc.up();
    await frames(o, `U4c-swipe-after-chevron`, 4); note(tag, 'frames', JSON.stringify(await page.evaluate(() => window.__fr))); note(tag, 'pilot turns', JSON.stringify(await page.evaluate(() => window.__turns)), await status(page));
    await spy(page); const ok = await skipTo(page, 2); note(tag, 'level-up skipTo 2', ok);
    await frames(o, `U4c-levelup-flash`, 6);
    // Stretched variant: the real trail (120 ms) and chevron (160 ms) are gone before a SwiftShader screenshot (about 200 ms), so for
    // these shots ONLY the lifetimes are stretched to 1500 ms (runtime tweak of the loaded balance object; not a repo change).
    await page.evaluate(() => { const d = window.__game.registry.get('balance').motion.d3; d.trailMs = 1500; d.chevronMs = 1500; });
    const tc2 = await touchApi(page); stop = false;
    await tc2.down(w * 0.5, h * 0.62);
    const drag2 = (async () => { for (let i = 0; !stop; i++) { const t = Math.min(i / 20, 1); await tc2.move(w * (0.5 + 0.2 * t) + (i % 2), h * (0.62 - 0.1 * t)); await sleep(16); } })();
    await sleep(500); await o.shot(`U4c-swipe-trail-STRETCHED-1_${tag}.png`); await sleep(200); await o.shot(`U4c-swipe-trail-STRETCHED-2_${tag}.png`);
    stop = true; await drag2; await tc2.up(); await frames(o, `U4c-swipe-chevron-STRETCHED`, 3);
    await stopPilot(page);
  },
  // D-pad mode (finger hidden, round D-pad visible) on the waiting screen and mid-run.
  async dpad(o, tag) {
    const { page } = o; await play(page); await sleep(1000); await o.shot(`U4c-dpad-waiting_${tag}.png`);
    await startRun(page, 'ArrowUp'); await startPilot(page); await sleep(900); await o.shot(`U4c-dpad-playing_${tag}.png`); await stopPilot(page);
  },
  // Skill-ready gloss sweep: veteran save, full energy, both skills affordable; burst over the pulse period.
  async skillready(o, tag) {
    const { page } = o; await play(page); await sleep(500);
    await frames(o, `U4c-skill-ready-sweep`, 10, 150);
    await startRun(page); await startPilot(page); await sleep(500); await frames(o, `U4c-skill-ready-sweep-running`, 4, 150); await stopPilot(page);
  },
  // Reduced motion: waiting (static finger), run (no trail/sweep), skill pills, death.
  async reduced(o, tag) {
    const { page } = o; await play(page); await sleep(800); await o.shot(`MOT-reduced-waiting_${tag}.png`);
    await startRun(page); await startPilot(page); await sleep(700);
    await session(page, 's.useSkill(0)'); await sleep(500); await o.shot(`MOT-reduced-shield-active_${tag}.png`);
    await skipTo(page, 13); await frames(o, `MOT-reduced-levelup`, 3);
    await stopPilot(page); // let the snake hit a wall
    await waitEvent(page, 'shieldBroke', 8000).catch(() => {}); await frames(o, `MOT-reduced-shield-break-invuln`, 3);
    for (let i = 0; i < 40 && (await status(page)) !== 'over'; i++) await sleep(250);
    await sleep(900); await frames(o, `MOT-reduced-death`, 3, 300);
    await waitScene(page, 'Results', 20000).catch(() => {}); await sleep(2500); await o.shot(`MOT-reduced-results_${tag}.png`);
  },
  // Normal motion death card (+ two-line wrap check) and the first-run Results (empty storage).
  async death(o, tag) {
    const { page } = o; await play(page); await startRun(page, 'ArrowUp'); // no pilot: the snake runs into the top wall
    for (let i = 0; i < 40 && (await status(page)) !== 'over'; i++) await sleep(100);
    await frames(o, `U5-death-card`, 6, 200);
    for (let i = 0; i < 30 && !(await active(page)).includes('Results'); i++) await sleep(500);
    await sleep(500); await o.shot(`U5-results-first-run-early_${tag}.png`); await sleep(2500); await o.shot(`U5-results-first-run-rest_${tag}.png`);
  },
  // Results "won": pilot from L29 through the final clear (greedy pilot, may die: retried by the caller scenario list).
  async won(o, tag) {
    const { page } = o; await play(page); await startRun(page); await startPilot(page); await sleep(300);
    await spy(page); note(tag, 'skip to 30', await skipTo(page, 30));
    let won = false;
    for (let i = 0; i < 360; i++) { // up to ~3 min
      if ((await status(page)) === 'over') break; await sleep(500);
      if (i % 20 === 0) { const s = await snap(page); note(tag, 'L30 progress', s.progress, '/', s.need, s.status); }
    }
    const s = await snap(page); won = s.outcome?.won === true; note(tag, 'outcome', JSON.stringify(s.outcome));
    await sleep(1500); await o.shot(`U5-win-banner-or-card_${tag}.png`);
    for (let i = 0; i < 30 && !(await active(page)).includes('Results'); i++) await sleep(500);
    await sleep(500); await o.shot(`U5-results-${won ? 'won' : 'not-won'}-early_${tag}.png`); await sleep(3000); await o.shot(`U5-results-${won ? 'won' : 'not-won'}-rest_${tag}.png`);
  },
  // MEC-019 fixed terrain: crumble + warning cells + `Map: <name>` banner on L7 -> L8, and the invulnerable blink that follows it.
  async terrain(o, tag) {
    const { page } = o; await play(page);
    note(tag, 'terrain L7 before', (await snap(page)).fixedTerrain?.name);
    await o.shot(`MEC019-terrain-L7-before_${tag}.png`);
    await startRun(page); await startPilot(page); await spy(page);
    const ok = await skipTo(page, 8); note(tag, 'skipTo 8', ok);
    await frames(o, `MEC019-terrain-L7-L8`, 14);
    const s = await snap(page); note(tag, 'after', s.level, s.fixedTerrain?.name, JSON.stringify(s.invuln), s.status);
    await sleep(2500); await o.shot(`MEC019-terrain-L8-settled_${tag}.png`); await stopPilot(page);
  },
  // Level boards L13 and L28 (waiting state, then a moment into the run).
  async boards(o, tag) {
    const { page } = o; await play(page); await sleep(500);
    await o.shot(`U4b-board-${o.level}-waiting_${tag}.png`);
    await startRun(page); await startPilot(page); await sleep(1500); await o.shot(`U4b-board-${o.level}-running_${tag}.png`); await stopPilot(page);
  },
  // Skills: Shield active (ring + tint), two live skill pills, Shield break -> invulnerable blink (the "odd round dots" bug).
  async skills(o, tag) {
    const { page } = o; await play(page); await sleep(500);
    await o.shot(`U5-skills-ready_${tag}.png`);
    await startRun(page); await startPilot(page); await spy(page); await sleep(500);
    await session(page, 's.useSkill(0)'); await sleep(200); await frames(o, `SHIELD-active`, 3);
    await session(page, 's.useSkill(1)'); await sleep(200); await frames(o, `U5-two-skill-pills`, 3);
    await stopPilot(page); // no steering: the shielded snake bumps a wall
    const broke = await waitEvent(page, 'shieldBroke', 12000); note(tag, 'shieldBroke', broke);
    await frames(o, `INVULN-shield-break-blink`, 8);
    note(tag, 'invuln', JSON.stringify((await snap(page)).invuln));
  },
  // Incoming warning card + checkpoint card: pilot through L10..L12 and L25..L26 and shoot when the event fires.
  async cards(o, tag) {
    const { page } = o; await play(page); await startRun(page); await startPilot(page); await spy(page); await sleep(300);
    const grab = async (type, name, tries = 1) => {
      if (await waitEvent(page, type, 25000)) { await frames(o, name, 3); return true; } return false;
    };
    note(tag, 'skip to 10', await skipTo(page, 10)); await frames(o, `U5-cards-skipTo10`, 4);
    note(tag, 'skip to 11', await skipTo(page, 11)); await frames(o, `U5-cards-skipTo11`, 4);
    const inc = await grab('hazardIncoming', 'U5-incoming-card'); note(tag, 'hazardIncoming seen', inc);
    const evs = await page.evaluate(() => [...new Set(window.__ev.map((e) => e.type))]); note(tag, 'events seen', evs.join(','));
  },
};

// per-scenario config: query + save (null = empty storage / first run)
const cfg = {
  menus: { query: '?debug=1&motion=off', save: veteran() },
  steer: { query: '?debug=1', save: null },
  dpad: { query: '?debug=1', save: { bestScore: 0, bestLevel: 0, fullClear: false, unlockedCheckpoints: [], carriedEnergy: 0, lastLoadout: [null, null], settings: settings({ dpad: true }) } },
  skillready: { query: '?debug=1&level=12', save: veteran() },
  reduced: { query: '?debug=1&level=12', save: veteran({}, { reducedMotion: true }) },
  death: { query: '?debug=1', save: null },
  won: { query: '?debug=1&level=29', save: veteran() },
  terrain: { query: '?debug=1&level=7', save: veteran() },
  boards13: { query: '?debug=1&level=13', save: veteran(), run: 'boards', level: 'L13' },
  boards28: { query: '?debug=1&level=28', save: veteran(), run: 'boards', level: 'L28' },
  skills: { query: '?debug=1&level=12', save: veteran() },
  cards: { query: '?debug=1&level=9', save: veteran() },
};

const browser = await chromium.launch();
let failures = 0;
for (const name of Object.keys(cfg)) {
  if (only.length && !only.includes(name)) continue;
  for (const size of SIZES) {
    const tag = `${size[0]}`; const sz = `${size[0]}x${size[1]}`;
    let o;
    try {
      const c = cfg[name];
      o = await openPage(browser, out, size, c.query, `${name}@${sz}`, seedScript(c.save));
      o.level = c.level; o.tag = tag;
      await scenarios[c.run ?? name](o, tag);
    } catch (e) { failures++; console.error(`eyepack: ${name} ${size.join('x')} FAILED: ${e.message}`); try { await o?.shot(`FAILED-${name}_${tag}.png`); } catch { /* ignore */ } }
    finally { await o?.ctx.close(); }
  }
}
await browser.close();
process.exit(failures ? 1 : 0);
