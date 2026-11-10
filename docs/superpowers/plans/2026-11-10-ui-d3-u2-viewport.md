# UI D3 U2 Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The logical canvas stays 540 wide and gets a height chosen once at boot from the viewport aspect (960..1200), so tall phones are filled; remaining bands take the biome colour; a throwaway spike measures a render scale for sharpness.

**Architecture:** `HEIGHT` in `src/game/layout.ts` becomes a live `export let` with a setter; pure `viewHeight()` in `src/game/viewport.ts` computes it and `initViewport()` sets it before `new Phaser.Game`. Every `HEIGHT` read already sits inside a function (audited below); a guard test keeps it that way. Layout tests run at 960 and 1170.

**Tech Stack:** TypeScript strict, Phaser 3, Vitest (Windows flags: `--configLoader native --pool threads --maxWorkers 1`).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §6 (D3-R7, D3-R7b); roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` "U2".

## Global Constraints
- D3-R7: height = `clamp(round(540 * vh / vw), 960, 1200)`; scale mode stays FIT; a resize/rotation takes effect at the next page load (no live resize in U2).
- The board never grows (`BOARD` unchanged); spare height goes to spacing. Screen layouts are rebuilt in U3..U6; U2 only proves nothing is cut off or overlapping.
- No magic numbers: the 960/1200 bounds live in `layout.ts` `VIEW`.
- D3-R7b spike code is NOT merged without the owner's decision.
- Browser checks and screenshot passes are done by **agy** (owner 2026-11-10), launched via the `delegate-workers` skill; the lead reviews the images. agy never writes feature code (DECISIONS 2026-11-04). Do not run agy while the full test suite or fuzz runs (host RAM).
- Requirement IDs in test names (`D3-R7`, `D3-R7b`).

## Audit (lead, 2026-11-10)
`HEIGHT` is read in 15 files outside `layout.ts`: `hud/BannerLayer.ts`, `hud/CountdownOverlay.ts`, `hud/hudLayout.ts`, `hud/PauseOverlay.ts`, `juice/DeathCard.ts`, `juice/ScreenFx.ts`, `main.ts`, `scenes/ArtPreviewScene.ts`, `scenes/BootScene.ts`, `scenes/HomeScene.ts`, `scenes/LoadoutScene.ts`, `scenes/ResultsScene.ts`, `scenes/SettingsScene.ts`, `ui/artPreviewLayout.ts`, `ui/layout.ts`. Every use is inside a function or method body; none is a module-level `const` initialiser. So Task 2 only adds the guard; no call site needs rewriting. ES module live bindings make `import { HEIGHT }` see the new value.

---

### Task 1: `viewHeight`, live `HEIGHT`, `initViewport`, `setBandColor`

**Files:**
- Modify: `src/game/layout.ts`
- Create: `src/game/viewport.ts`
- Modify: `src/game/main.ts`
- Modify: `index.html` (page background)
- Test: `tests/game/viewport.test.ts`

**Interfaces:**
- Produces: `VIEW = { minH: 960, maxH: 1200 }`, `export let HEIGHT: number` (default 960), `setHeight(h: number): void` (layout.ts); `viewHeight(vw: number, vh: number): number`, `initViewport(win?: { innerWidth: number; innerHeight: number }): number`, `setBandColor(hex: string): void` (viewport.ts).

- [x] **Step 1: Write the failing test** `tests/game/viewport.test.ts`

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { HEIGHT, setHeight, VIEW } from '../../src/game/layout';
import { initViewport, setBandColor, viewHeight } from '../../src/game/viewport';

afterEach(() => setHeight(VIEW.minH));

describe('D3-R7 viewport height', () => {
  it('D3-R7 viewHeight follows the aspect and clamps to 960..1200', () => {
    expect(viewHeight(360, 640)).toBe(960);
    expect(viewHeight(390, 844)).toBe(1169);
    expect(viewHeight(412, 915)).toBe(1199);
    expect(viewHeight(360, 900)).toBe(1200);
    expect(viewHeight(800, 600)).toBe(960);
  });
  it('D3-R7 viewHeight falls back to 960 on a zero or missing size', () => {
    expect(viewHeight(0, 0)).toBe(960);
    expect(viewHeight(NaN, 800)).toBe(960);
  });
  it('D3-R7 initViewport sets the live HEIGHT binding', () => {
    expect(initViewport({ innerWidth: 390, innerHeight: 844 })).toBe(1169);
    expect(HEIGHT).toBe(1169);
  });
  it('D3-R7 setBandColor is a no-op without a document', () => {
    expect(() => setBandColor('#1F86D8')).not.toThrow();
  });
});
```

- [x] **Step 2: Run it, expect FAIL** (`setHeight`/`viewport` missing)

Run: `npx vitest run --configLoader native --pool threads --maxWorkers 1 tests/game/viewport.test.ts`

- [x] **Step 3: Implement**

`src/game/layout.ts` — replace `export const HEIGHT = 960;` with:

```ts
// D3-R7 logical canvas height bounds; the height is picked once at boot (src/game/viewport.ts).
export const VIEW = { minH: 960, maxH: 1200 } as const;
/** D3-R7 live binding: read it inside functions only (guard: tests/game/heightGuard.test.ts). */
export let HEIGHT: number = VIEW.minH;
export function setHeight(h: number): void { HEIGHT = h; }
```

`src/game/viewport.ts`:

```ts
// D3-R7 adaptive canvas height: 540 wide, height from the viewport aspect, set before new Phaser.Game.
import { setHeight, VIEW, WIDTH } from './layout';

export function viewHeight(vw: number, vh: number): number {
  if (!(vw > 0) || !(vh > 0)) return VIEW.minH;
  return Math.min(VIEW.maxH, Math.max(VIEW.minH, Math.round(WIDTH * vh / vw)));
}

export function initViewport(win: { innerWidth: number; innerHeight: number } | undefined =
  typeof window !== 'undefined' ? window : undefined): number {
  const h = win ? viewHeight(win.innerWidth, win.innerHeight) : VIEW.minH;
  setHeight(h);
  return h;
}

/** D3-R7 colour of the page bands around the canvas (outer stop of the current biome background). */
export function setBandColor(hex: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.background = hex;
  document.body.style.background = hex;
}
```

`src/game/main.ts`: add `import { initViewport } from './viewport';` and call `initViewport();` on the line before `new Phaser.Game({`. `height: HEIGHT` stays (it now reads the live value).

`index.html`: change `background: #F8F2E8;` to `background: #1F86D8;` (biome 1 outer stop, `TOKENS.d3.biomes[0].bg[2]`).

- [x] **Step 4: Run the test, expect PASS**; then `npm run typecheck`.

- [x] **Step 5: Commit**

```bash
git add src/game/layout.ts src/game/viewport.ts src/game/main.ts index.html tests/game/viewport.test.ts
git commit -m "feat(ui): adaptive canvas height from the viewport aspect (D3-R7)"
```

### Task 2: `HEIGHT` guard test

**Files:**
- Test: `tests/game/heightGuard.test.ts`

**Interfaces:**
- Consumes: `HEIGHT` as a live binding (Task 1).

- [x] **Step 1: Write the test** (same raw-glob style as `tests/game/navGuard.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

// D3-R7 HEIGHT is set at boot, so a module-level const computed from it would freeze the 960 default.
const sources = import.meta.glob('../../src/game/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const files = Object.entries(sources).map(([path, src]) => ({ path, src }));

/** Top-level (column 0) `const`/`let`/`export const` statements whose initialiser mentions HEIGHT. */
function offenders(src: string): string[] {
  const out: string[] = [];
  const re = /^(?:export\s+)?(?:const|let|var)\s[^\n]*?=([\s\S]*?);\s*$/gm;
  for (const m of src.matchAll(re)) {
    const init = m[1];
    if (/=>|function\b/.test(init.split('\n')[0])) continue; // arrow/function bodies are evaluated later
    if (/\bHEIGHT\b/.test(init)) out.push(m[0].split('\n')[0]);
  }
  return out;
}

describe('D3-R7 HEIGHT guard', () => {
  it('D3-R7 no module-level initialiser under src/game reads HEIGHT', () => {
    expect(files.length).toBeGreaterThan(20);
    const bad = files.flatMap(f => offenders(f.src).map(l => `${f.path}: ${l}`));
    expect(bad).toEqual([]);
  });
  it('D3-R7 guard catches a frozen HEIGHT constant', () => {
    expect(offenders('const Y = HEIGHT - 10;')).toHaveLength(1);
    expect(offenders('export const f = (): number => HEIGHT - 10;')).toHaveLength(0);
    expect(offenders('  const y = HEIGHT - 10;')).toHaveLength(0); // indented = inside a body
  });
});
```

- [x] **Step 2: Run it, expect PASS** (audit found no offender). If it lists a line, move that value into a function evaluated at scene create and re-run.

- [x] **Step 3: Commit**

```bash
git add tests/game/heightGuard.test.ts
git commit -m "test(ui): guard against module-level HEIGHT constants (D3-R7)"
```

### Task 3: Layout tests at 960 and 1170

**Files:**
- Test: `tests/game/twoHeights.test.ts`
- Modify (only if a test fails): the failing layout function in `src/game/hud/hudLayout.ts`, `src/game/ui/menuLayout.ts` or `src/game/ui/artPreviewLayout.ts`

**Interfaces:**
- Consumes: `setHeight`, `VIEW`, `HEIGHT` (Task 1); existing `hudLayout(dpad)`, `layoutColumn`, `homeColumn`, `loadoutColumn`, `settingsColumn`, `resultsColumn`, `bootColumn`, `previewRects`.

- [x] **Step 1: Write the test**

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { hudLayout } from '../../src/game/hud/hudLayout';
import { BOARD, HEIGHT, setHeight, VIEW, WIDTH } from '../../src/game/layout';
import { previewRects } from '../../src/game/ui/artPreviewLayout';
import { layoutColumn } from '../../src/game/ui/layout';
import { bootColumn, homeColumn, loadoutColumn, resultsColumn, settingsColumn } from '../../src/game/ui/menuLayout';

const MIN = 0.85; // balance.ui.minShrink
afterEach(() => setHeight(VIEW.minH));

describe.each([960, 1170])('D3-R7 layouts at HEIGHT %i', (h) => {
  it(`D3-R7 HUD fits inside the canvas below the board at ${h}`, () => {
    setHeight(h);
    for (const dpad of [false, true]) {
      const l = hudLayout(dpad);
      expect(l.chip.y).toBeGreaterThanOrEqual(BOARD.y + BOARD.size);
      for (const s of l.skills) {
        expect(l.chip.y + l.chip.h).toBeLessThanOrEqual(s.groupTop);
        expect(s.costY + s.costH).toBeLessThanOrEqual(HEIGHT);
      }
      if (l.dpad) expect(l.dpad.y + l.dpad.size).toBeLessThanOrEqual(HEIGHT);
    }
  });
  it(`D3-R7 every menu column fits without shrinking below minShrink at ${h}`, () => {
    setHeight(h);
    const specs = [
      homeColumn({ compact: false, stepper: true, extras: true, hint: true }, MIN),
      homeColumn({ compact: true, stepper: false, extras: false, hint: false }, MIN),
      loadoutColumn(MIN), loadoutColumn(MIN, true), settingsColumn(MIN),
      resultsColumn({ banner: true, energy: true }, MIN), resultsColumn({ banner: false, energy: false }, MIN),
      bootColumn(MIN),
    ];
    for (const s of specs) {
      const c = layoutColumn(s);
      expect(c.fits).toBe(true);
      expect(c.bottomY).toBeLessThanOrEqual(HEIGHT);
      expect(c.middleY).toBeGreaterThanOrEqual(0);
    }
  });
  it(`D3-R7 art preview boxes stay inside the canvas at ${h}`, () => {
    setHeight(h);
    const r = previewRects();
    for (const b of [...r.widgets, r.live, r.remotion]) {
      expect(b.x0).toBeGreaterThanOrEqual(0); expect(b.x1).toBeLessThanOrEqual(WIDTH);
      expect(b.y1).toBeLessThanOrEqual(HEIGHT);
    }
  });
  it(`D3-R7 the board never grows at ${h}`, () => {
    setHeight(h);
    expect(BOARD).toEqual({ x: 18, y: 152, size: 504 });
  });
});
```

- [x] **Step 2: Run it**

Run: `npx vitest run --configLoader native --pool threads --maxWorkers 1 tests/game/twoHeights.test.ts`
Expected: PASS. If a case fails, fix the layout function so spare height goes to spacing (never move content off-canvas, never grow `BOARD`), re-run, and note the fix in the commit body.

- [x] **Step 3: Commit**

```bash
git add tests/game/twoHeights.test.ts
git commit -m "test(ui): layouts fit at canvas heights 960 and 1170 (D3-R7)"
```

### Task 4: Browser pass at three sizes (agy)

**Files:**
- Modify: `docs/PLAYTEST.md` (entry written by the lead from agy's report)

- [x] **Step 1: Lead starts `npm run dev` in the background**, after no test run is active.
- [x] **Step 2: Delegate to agy** (skill `delegate-workers`). Brief: "Black-box browser QA on http://localhost:5173/ at 360x640, 390x844, 412x915 (DPR 1). Use `tools/qa/shot.mjs` (usage in docs/PLAYTEST.md 'How to capture'). Capture Home, in-run after the countdown, Pause (key Escape), Settings from Pause, Results after Quit run into `tmp/qa/u2/<screen>-<WxH>.png`. Report per image: the canvas fills the full height at 390x844 and 412x915 (no page bands), nothing cut off at the bottom, nothing overlapping, and any console error/warning (read with an `eval:` step on a `window.onerror` hook installed before navigation, or a manual browser session). Do not edit any file under src/ or tests/." Tap coordinates must be computed by agy from the canvas scale (`min(vw/540, vh/HEIGHT)`).
- [x] **Step 3: Lead reviews the 15 images** and agy's report. Code defects → a fix task for a Claude subagent, then repeat Step 2 for the affected screens. Known and accepted: Results first-run buttons missing in headless (U5), old layouts with extra space (U3..U6).
- [x] **Step 4: PLAYTEST entry** (date, branch, sizes, defects, verdict) and commit:

```bash
git add docs/PLAYTEST.md
git commit -m "docs(qa): U2 viewport browser pass at three sizes (D3-R7)"
```

### Task 5: Sharpness spike (D3-R7b, throwaway)

**Files (spike branch `spike/ui-d3-render-scale` from the U2 branch; not merged):**
- Modify: `src/game/main.ts` (canvas `WIDTH * R` x `HEIGHT * R`)
- Modify: every scene `create()` (camera zoom `R`, centred on the logical canvas)
- Modify: `docs/DECISIONS.md` (on the U2 branch, not the spike)

- [ ] **Step 1: Spike code** (Claude subagent, spike branch). In `main.ts`: `const R = Math.min(window.devicePixelRatio || 1, 2);` and `width: WIDTH * R, height: HEIGHT * R`. Add `export function applyRenderScale(scene: Phaser.Scene): void { scene.cameras.main.setZoom(R).centerOn(WIDTH / 2, HEIGHT / 2); }` in a new `src/game/renderScale.ts` and call it first in every scene `create()`. Input coordinates follow the camera through `pointer.worldX/worldY`; list any widget that reads `pointer.x` directly as a spike finding instead of fixing it.
- [ ] **Step 2: agy captures** Home and in-run at 390x844 DPR 3 on the U2 branch (`size:390,844,3`) and on the spike branch, into `tmp/qa/u2-spike/{before,after}-{home,run}.png`, and reports the average frame time over 10 s of a run (`eval:` on `game.loop.actualFps`, exposed by the spike under `?debug=1` only).
- [ ] **Step 3: Lead compares** crops of text edges and outlines, then appends to `docs/DECISIONS.md`: "D3-R7b render scale spike: captures, frame time before/after on the headless box (not representative of a phone GPU), input issues found, recommendation; decision: OWNER PENDING". Commit on the U2 branch:

```bash
git add docs/DECISIONS.md
git commit -m "docs(ui): D3-R7b render scale spike result, owner decision pending"
```

### Task 6: Docs, full verification, merge

**Files:**
- Modify: `docs/CODEMAP.md`, `docs/STATUS.md`, `CHANGELOG.md`

- [x] **Step 1: Maps.** `docs/CODEMAP.md`: add a row for `src/game/viewport.ts` (`viewHeight`, `initViewport`, `setBandColor`; D3-R7; tests `viewport.test.ts`, `heightGuard.test.ts`, `twoHeights.test.ts`); in the `src/game/` row note "`layout.ts` HEIGHT is a live value set at boot".
- [x] **Step 2: CHANGELOG** lines for Tasks 1-3 and 5 under `[Unreleased]`; STATUS "Now" D3 line: U2 merged, spike decision pending with owner, U3 next (waits for "D3 boards approved").
- [x] **Step 3: Full verification:** `npm run typecheck`, then `npx vitest run --configLoader native --pool threads --maxWorkers 1`. Both must pass.
- [x] **Step 4: Merge**

```bash
git add -A
git commit -m "docs(ui): U2 codemap, changelog, status"
git checkout version/v0.3 && git merge --no-ff feat/ui-d3-u2-viewport
node .gitnexus/run.cjs analyze --index-only --workers 2
```

(Run the last command in the background.)
