# UI D3 U0 — QA tool, boards, tokens — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** give the D3 redesign its visual source of truth (boards for every screen), its colour and shape tokens, and a repeatable screenshot tool.

**Architecture:** boards are static HTML/CSS in `docs/design/mockups/d3/` built on the approved direction A sketch; tokens are a pure `d3` group in `src/game/uiTokens.ts` with contrast tests; the QA tool is one Node script that drives headless Chrome over DevTools (no dependency).

**Tech Stack:** HTML/CSS/inline SVG, TypeScript strict, Vitest, Node 24 (built-in `fetch` and `WebSocket`).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` (§4, §6, §7, §7b, §8). Roadmap: `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md`.

## Global Constraints
- Branch `feat/ui-d3-u0-boards-tokens` from `version/v0.3`. English only. Conventional Commits. A CHANGELOG line per commit.
- No new npm dependency. No change under `src/core/`, `src/meta/`, `config/balance.json`.
- Hex literals only in `src/game/uiTokens.ts` (and the board HTML/CSS, which is not shipped).
- Windows Vitest flags: `--configLoader native --pool threads --maxWorkers 2`.
- Boards are drawn at 360x640 CSS px (the 9:16 canvas) and, for Home, in-run and Results, also at 390x844.
- Do not change game scenes in this phase.

---

### Task 1: Screenshot tool

**Files:**
- Create: `tools/qa/shot.mjs`
- Modify: `docs/PLAYTEST.md` (one "How to capture" paragraph under the latest entry heading block), `docs/CODEMAP.md` (tools row)

**Interfaces:**
- Produces: CLI `node tools/qa/shot.mjs <step>...` with steps `size:W,H[,DPR]`, `media:light|dark`, `go:URL`, `wait:MS`, `tap:X,Y`, `swipe:X1,Y1,X2,Y2`, `key:Name`, `shot:FILE`, `eval:JS`. Env `CHROME_PATH` overrides the browser path. Exit code 1 on any failed step.

- [ ] **Step 1: Write the script**

```js
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
```

- [ ] **Step 2: Run it against the dev server**

Start `npm run dev` in another terminal (default port 5173), then:

Run: `node tools/qa/shot.mjs size:360,640 media:light "go:http://localhost:5173/" wait:3500 shot:tmp/qa/home-360.png size:390,844 wait:800 shot:tmp/qa/home-390.png`
Expected: exit code 0; both PNGs exist; `home-360.png` is 720x1280 and shows the Home screen. `tmp/` must be git-ignored: check `git status --short` shows nothing new; if `tmp/` shows up, add the line `tmp/` to `.gitignore`.

- [ ] **Step 3: Check the failure path**

Run: `node tools/qa/shot.mjs bogus:1`
Expected: prints `Error: shot: unknown step bogus:1`, exit code 1, no Chrome process left (`tasklist | findstr chrome` shows no new headless instance).

- [ ] **Step 4: Document and commit**

Add to `docs/PLAYTEST.md` a short "How to capture" paragraph: the command from Step 2, the three standard sizes (360x640, 390x844, 412x915), `media:dark` for the OS dark check, and that keys use DOM names (`ArrowUp`). Add `tools/qa/shot.mjs` to the tools row of `docs/CODEMAP.md`.

```bash
git add tools/qa/shot.mjs docs/PLAYTEST.md docs/CODEMAP.md CHANGELOG.md .gitignore
git commit -m "chore(qa): headless Chrome screenshot tool (tools/qa/shot.mjs)"
```

---

### Task 2: D3 tokens

**Files:**
- Modify: `src/game/uiTokens.ts` (add the `d3` group inside `TOKENS`, before `danger`)
- Test: `tests/game/d3Tokens.test.ts` (create)

**Interfaces:**
- Consumes: `contrastRatio` from `src/game/render/biomePalette.ts`, `toInt` from `src/game/uiTokens.ts`.
- Produces: `TOKENS.d3` exactly as below; later phases import nothing else for D3 colours. `type D3Tone = keyof typeof TOKENS.d3.tone`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/game/d3Tokens.test.ts
import { expect, it } from 'vitest';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { TOKENS, toInt } from '../../src/game/uiTokens';

const D = TOKENS.d3;
const cr = (a: string, b: string): number => contrastRatio(toInt(a), toInt(b));
const mid = (face: readonly string[]): string => face[Math.floor(face.length / 2)]!;

it('D3-R1 every d3 colour is a valid #RRGGBB', () => {
  const all: string[] = [...D.bg.stops, D.ink, D.inkDeep, D.text, D.white, D.logo.mango, D.logo.mangoLine,
    ...Object.values(D.tone).flatMap((t) => [...t.face, t.line, t.lip, t.text]),
    ...Object.values(D.snake), ...Object.values(D.outline), ...Object.values(D.outlineStorm),
    ...D.biomes.flatMap((b) => [...b.bg, b.frame, ...b.cells])];
  for (const c of all) expect(() => toInt(c)).not.toThrow();
});
it('D3-R2 plain text reaches 4.5:1 on the middle stop of its surface', () => {
  for (const [name, t] of Object.entries(D.tone)) {
    if (t.outlined) continue;
    expect(cr(t.text, mid(t.face)), name).toBeGreaterThanOrEqual(4.5);
  }
});
it('D3-R2 outlined display type reaches 4.5:1 between fill and outline', () => {
  for (const [name, t] of Object.entries(D.tone)) {
    if (!t.outlined) continue;
    expect(cr(t.text, t.line), name).toBeGreaterThanOrEqual(4.5);
  }
  expect(cr(D.white, D.inkDeep)).toBeGreaterThanOrEqual(4.5);
  expect(cr(D.logo.mango, D.logo.mangoLine)).toBeGreaterThanOrEqual(4.5);
});
it('D3-R2 board outlines reach 3:1 on both cells of every biome', () => {
  D.biomes.forEach((b, i) => {
    const set = i === D.stormIndex ? D.outlineStorm : D.outline;
    for (const [part, c] of Object.entries(set)) for (const cell of b.cells) {
      expect(cr(c, cell), `biome ${i + 1} ${part} on ${cell}`).toBeGreaterThanOrEqual(3);
    }
  });
});
it('D3-R4 six biomes, one hue per ground (cells differ, no grid colour)', () => {
  expect(D.biomes.length).toBe(6);
  for (const b of D.biomes) { expect(b.bg.length).toBe(3); expect(b.cells[0]).not.toBe(b.cells[1]); }
});
it('D3-R1 shape numbers are positive and ordered', () => {
  const s = D.shape;
  expect(s.lineBig).toBeGreaterThan(s.line);
  expect(s.lipBig).toBeGreaterThan(s.lipSkill); expect(s.lipSkill).toBeGreaterThan(s.lip);
  expect(s.pressedLip).toBeLessThan(s.lip);
  expect(s.pressedGloss).toBeGreaterThan(0); expect(s.pressedGloss).toBeLessThan(1);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/game/d3Tokens.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL, `Cannot read properties of undefined (reading 'bg')` (no `TOKENS.d3` yet).

- [ ] **Step 3: Add the tokens**

Insert into `TOKENS` in `src/game/uiTokens.ts`, on the line before `danger:`:

```ts
  // D3-R1/R4 "Juicy" visual language (spec 2026-11-10-ui-d3-juicy-design.md §4). Mock px for shape numbers.
  d3: {
    bg: { stops: ['#7FD8FF', '#3FB2F2', '#1F86D8'], centerY: 0.38, rayAlpha: 0.13, rayDeg: 9 },
    ink: '#145A9C', inkDeep: '#0F4578', text: '#173B63', white: '#FFFFFF',
    logo: { mango: '#FFD93B', mangoLine: '#8A4500' },
    tone: {
      primary: { face: ['#8DF06A', '#3FC23D', '#2EA634'], line: '#17661F', lip: '#114F18', text: '#FFFFFF', outlined: true },
      secondary: { face: ['#FFF6D6', '#FFE08A', '#FFE08A'], line: '#A86A10', lip: '#7D4D08', text: '#6B3F05', outlined: false },
      danger: { face: ['#FF8A8A', '#F04B4B', '#F04B4B'], line: '#9C1F3F', lip: '#7A1430', text: '#FFFFFF', outlined: true },
      light: { face: ['#FFFFFF', '#E6F1FA', '#E6F1FA'], line: '#145A9C', lip: '#0F4578', text: '#173B63', outlined: false },
      skillA: { face: ['#B48CFF', '#7A47E6', '#7A47E6'], line: '#3B1F7A', lip: '#2A1459', text: '#FFFFFF', outlined: true },
      skillB: { face: ['#FFC457', '#FF8A1F', '#FF8A1F'], line: '#8A4A12', lip: '#6E390B', text: '#FFFFFF', outlined: true },
      off: { face: ['#E9F1F7', '#C9D6E2', '#C9D6E2'], line: '#6F8499', lip: '#566B80', text: '#3F5266', outlined: false },
      ribbon: { face: ['#FF5A7A', '#FF5A7A', '#FF5A7A'], line: '#9C1F3F', lip: '#0F4578', text: '#FFFFFF', outlined: true },
      track: { face: ['#0F4578', '#0F4578', '#0F4578'], line: '#0B3560', lip: '#0B3560', text: '#FFFFFF', outlined: true },
      mango: { face: ['#FFE36B', '#FFAB1A', '#FFAB1A'], line: '#8A4500', lip: '#8A4500', text: '#FFFFFF', outlined: true },
      energy: { face: ['#8FF0FF', '#22B8E6', '#22B8E6'], line: '#0B5E7A', lip: '#0B5E7A', text: '#FFFFFF', outlined: true },
    },
    shape: { line: 3, lineBig: 4, lip: 4, lipSkill: 6, lipBig: 8, pressedLip: 1, glossTop: 0.55, glossBottom: 0.08, glossFrac: 0.36,
      pressedGloss: 0.5, radiusBig: 28, radiusPanel: 22, selectedRing: 4, selectedLift: 2 },
    snake: { body: '#6F7DFF', head: '#7F8CFF', belly: '#CFD6FF', blush: '#FF8FB1', tongue: '#FF5A7A', eye: '#1C1447' },
    outline: { snake: '#2B2F9E', mango: '#8A4500', rock: '#4A5563', warn: '#C81E1E' },
    outlineStorm: { snake: '#7CF2D4', mango: '#FFF3C4', rock: '#D5DCE6', warn: '#FF9A9A' },
    stormIndex: 5,
    biomes: [
      { bg: ['#7FD8FF', '#3FB2F2', '#1F86D8'], frame: '#1D6B2A', cells: ['#A6E25A', '#93D648'] },
      { bg: ['#8FE8D8', '#3CC4B4', '#1C9A8E'], frame: '#7A6A1C', cells: ['#E3E07A', '#D2D062'] },
      { bg: ['#B9C8FF', '#7F92F0', '#5565D6'], frame: '#2C5D8F', cells: ['#D6F1FF', '#BFE6FA'] },
      { bg: ['#FFD9A0', '#F5A65B', '#DB7A35'], frame: '#6B4A2B', cells: ['#E9D3A6', '#D9BF8A'] },
      { bg: ['#A8E6A0', '#5CC46A', '#2F9E4E'], frame: '#9C4A2A', cells: ['#F6C9A0', '#EDB583'] },
      { bg: ['#6A5ACD', '#41358F', '#241C5C'], frame: '#15103A', cells: ['#4A3F86', '#41377A'] },
    ],
  },
```

Add below the `TOKENS` declaration: `export type D3Tone = keyof typeof TOKENS.d3.tone;`

- [ ] **Step 4: Run the test and the token-related suites**

Run: `npx vitest run tests/game/d3Tokens.test.ts tests/game/menuTokens.test.ts tests/game/hudTokens.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: PASS. If a contrast assertion fails, the message names the tone or biome; darken that outline or text colour until it passes and update the spec table (§4) in the same commit.

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/game/uiTokens.ts tests/game/d3Tokens.test.ts CHANGELOG.md
git commit -m "feat(ui): D3 tokens - tones, shape numbers, biome table, contrast tests (D3-R1, R2, R4)"
```

---

### Task 3: D3 boards

This is a design task done by the lead (it needs visual judgement and a screenshot loop), not by a text-only subagent.

**Files:**
- Create: `docs/design/mockups/d3/d3.css`, `docs/design/mockups/d3/boards.html`, `docs/design/mockups/d3/png/<Board>-360.png` (and `-390.png` for Home, Game, Results)
- Reference (read, do not edit): `docs/design/mockups/d3/directions.html` section A (classes `.a`, `.chip`, `.round`, `.play`, `.sec`, `.bar`, `.skill`, `.cost`, the snake, mango and board SVG)

**Interfaces:**
- Produces: one `<section class="board" id="<Board>">` per board; each phone frame is `<div class="phone a" data-size="360x640">`. The board ids are the names U3..U6 plans cite: `Boot`, `Home`, `Game`, `GameDpad`, `GameLocked`, `GameHint`, `Pause`, `Countdown`, `Banners`, `Death`, `Results`, `ResultsFirstRun`, `Loadout`, `Settings`, `States`, `Biomes`.

- [ ] **Step 1: Extract the shared CSS**

Move the direction A rules from `directions.html` into `d3.css` under one `.a` scope and replace literal colours with CSS variables named after the tokens (`--tone-primary-face-0`, `--ink`, `--ink-deep`, `--text`, ...), with values copied from Task 2. Fonts: the same three `@font-face` rules, loaded from `../../../../public/fonts/*.woff2` (the boards are opened through the dev server at `/docs/design/mockups/d3/boards.html` or by file path). Add generic classes: `.panel` (light face, 3 px ink outline, 4 px lip, radius 22), `.ribbon`, `.btn.primary|secondary|danger|light`, `.toggle`, `.row`.

- [ ] **Step 2: Build the boards**

One board per item, each at 360x640; content is fixed by the spec sections in brackets:

| Board | Content |
|---|---|
| `Boot` | background, logo, loading bar (mango fill) [D3-R10] |
| `Home` | from section A; add "Start from L1" and the Loadout entry as secondary chips under "Start at L10" [D3-R11]; also at 390x844 |
| `Game` | from section A, biome 1, two skills affordable [D3-R9, R12..R14]; also at 390x844 with the spare height split above and below the bottom group |
| `GameDpad` | D-pad in the centre of the bottom group, energy bar above it [D3-R9] |
| `GameLocked` | no skill unlocked: two locked slots (`off` tone, lock glyph), skill B unaffordable variant beside it [D3-R9, R14] |
| `GameHint` | waiting for first input: finger glyph with a swipe arc, hint text; one frame with the swipe trail and the chevron at the head [D3-R25, R26] |
| `Pause` | scrim 50% ink, panel: "Paused", level and biome line, checkpoint chip, Resume, Settings, Quit run [D3-R15] |
| `Countdown` | scrim 28%, digit "3" in mango yellow display type [D3-R15] |
| `Banners` | level-up banner, biome banner with tagline, tip card, skill pill, all inside the banner strip above the board [D3-R16] |
| `Death` | vignette, RUN OVER ribbon over a panel with a death line [D3-R17] |
| `Results` | panel: SCORE count, Best chip, LEVEL, BIOME, EATEN, new checkpoint line, energy saved; "Play again" and "Home" in the lower 45% [D3-R18]; also at 390x844 |
| `ResultsFirstRun` | same panel with score 0 and the first-run line; no empty area [D3-R18] |
| `Loadout` | two slots on top (one selected with the yellow ring), skill cards with icon, name, cost chip, pick state; Back button [D3-R19, R21] |
| `Settings` | Back, title, one panel with Sound, Haptics, On-screen D-pad, Reduced motion rows (icon tile, label, hint, toggle); no Board theme card [D3-R19, R3] |
| `States` | one primary, secondary, light, danger, round and skill button in each state: rest, pressed, disabled, selected, attention; a tap burst frame; a denied frame with the red cost badge [D3-R21..R24] |
| `Biomes` | six 170 px mini boards with their screen background, frame, cells, snake, mango, rock and warn tile from the spec table [D3-R4] |

Rules while drawing: every tappable element at least 48x48 CSS px; text never under 12 px; primary actions in the lower 45%; use only token colours; real strings from `src/game/text.ts` (grep the key, do not invent copy).

- [ ] **Step 3: Capture and self-review**

Run (dev server on 5173; Vite serves the repo root files under `/docs/...` only if `server.fs` allows it, otherwise open by `file:///` path):

`node tools/qa/shot.mjs size:1200,900,1 "go:file:///D:/Working/ASOL/NOZVI/NOZVI-GAME-03/docs/design/mockups/d3/boards.html" wait:1200 "eval:document.getElementById('Home').scrollIntoView();1" shot:docs/design/mockups/d3/png/Home-360.png`

Repeat per board id. Look at every PNG and check: no overlap, no clipped text, consistent outline widths, the board is the visual focus in `Game`, the head reads at arm's length (zoom the PNG to 50%). Fix and recapture until clean.

- [ ] **Step 4: Commit**

```bash
git add docs/design/mockups/d3 CHANGELOG.md
git commit -m "docs(design): D3 boards for all screens, states and biomes"
```

---

### Task 4: Docs and owner gate

**Files:**
- Modify: `docs/design/UI-MOCKUPS.md`, `docs/README.md`, `docs/CODEMAP.md`, `docs/STATUS.md`

- [ ] **Step 1: Rewrite `UI-MOCKUPS.md` for D3**

Sections: (1) what this is: D3 boards are the visual source of truth, D2 files stay as history and are not to be copied; (2) rules for agents: tokens from `TOKENS.d3`, numbers from the boards, strings from `text.ts`; (3) token summary linking to the spec §4 instead of repeating the table; (4) screen map: board id -> scene/file -> phase (from the roadmap file structure table); (5) how to refresh the PNGs (Task 3 Step 3 command).

- [ ] **Step 2: Update the maps and status**

`docs/README.md`: UI-MOCKUPS row now says "D3 boards (`docs/design/mockups/d3/`), D2 kept as history"; add a row for the three plan files. `docs/CODEMAP.md`: `docs/design/` row mentions `mockups/d3`. `docs/STATUS.md`: Now = "U0 done, boards await the owner's eye-check; U1 next".

- [ ] **Step 3: Full verification and merge**

Run: `npm test` then `npm run typecheck`
Expected: all tests pass (previous count plus the 6 new ones), no type errors.

```bash
git add docs CHANGELOG.md
git commit -m "docs(ui): UI-MOCKUPS rewritten for D3, maps and status"
git checkout version/v0.3 && git merge --no-ff feat/ui-d3-u0-boards-tokens
```

- [ ] **Step 4: Owner gate**

Open `docs/design/mockups/d3/boards.html` for the owner and ask for an eye-check of all boards. Record the answers in `docs/DECISIONS.md` (one entry, "D3 boards approved" plus any change requested). Do not start U3..U6 screen work before this approval; U1 and U2 do not depend on it.
