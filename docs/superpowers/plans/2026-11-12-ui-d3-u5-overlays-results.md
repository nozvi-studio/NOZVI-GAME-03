# UI D3 U5 — Overlays and Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Pause, Countdown, banners/tips/skill pills, the Death card and Results to the D3 boards (D3-R15..R18), and close the three owner items deferred from the pre-U4c review (pause glyph too small/thin, "... incoming" tip in mid-screen, Game over screen).

**Architecture:** Same split as U3/U4: every layout or content rule is a pure function in a model file (no Phaser, unit tested): `overlayModel.ts`, `banners.ts`, `resultsView.ts`, new `resultsLayout.ts`. Phaser views only place skin images (`card`, `chip`, `pillButton`, `skinTexture`) at the rects the models return. The D2 `drawCard` path disappears from the touched views.

**Tech Stack:** TypeScript strict, Phaser 3, Vitest (Windows: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <path>`), headless screenshots with `node tools/qa/shot.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §7 (D3-R15..R18), roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` U5. Visual reference: `docs/design/mockups/d3/boards.html` sections `Pause`, `Countdown`, `Banners`, `Death`, `Results`, `ResultsFirstRun` and `docs/design/mockups/d3/png/{Pause,Countdown,Banners,Death,Results,ResultsFirstRun}-360.png` (board = 360 mock px wide; `ui()` maps mock px to canvas px).

## Global Constraints
- Repository text in English. Requirement IDs (`D3-R15`..`D3-R18`, `U5-Rn` for the rulings below) in test names and one comment at each main implementing function.
- No magic numbers in logic: geometry in mock px lives in named `const M = {...}` blocks at the top of the view (existing pattern) or in `MENU` (`src/game/ui/menuMetrics.ts`); colours only from `TOKENS` / `TOKENS.d3` (`src/game/uiTokens.ts`). Timings stay in `config/balance.json` (`ui.bannerMs`, `juice`, `motion`); no new balance keys are expected.
- Kept behaviour (tests must stay green): MOT-2 Results sequence order and its 1500 ms cap (`resultsSeq`, `resultsTimeline`), tap-anywhere skip; Death card tap-skip (P3a-R7) and reduced-motion fade (P3a-R8); banner queue order (`levelUpBanners`), `bannerQueueMax`, UIFIX-R1/R2 strip rect and occlusion; Pause Settings handoff (`SETTINGS_CLOSED`); QA object names (`overlay-action`, `overlay-settings`, `overlay-quit`, `countdown`, `banner-title`, `banner-subtitle`, `tip`, `pill-0/1`, `death-card`, `death-line`, `results-*`, `RESULTS_BUTTONS`).
- No change to `src/core/`, `src/meta/`, gameplay numbers, or player-facing strings except the new keys listed in Task 2.
- Branch `feat/u5-overlays-results` from `version/v0.3`; tasks commit on it; merge back with `git merge --no-ff` after full `npm test` then `npm run typecheck` (sequential). Each commit adds one line under `## [Unreleased]` in `CHANGELOG.md`.

## Rulings (lead technical/visual, owner answers 2026-11-12 included)
- **U5-R1 (owner)** Pause glyph: bars drawn bigger and thicker: bar 7 x 22 mock px, gap 6, radius 3 (was 5 x 16, gap 4). Play triangle scaled the same way (half-height 11, back 8, tip 11).
- **U5-R2 (owner)** Hazard "incoming" warnings (`incomingBanner`: fence, maze, terrain) leave the dark mid-board tooltip and become a banner card in the top strip (new `BannerSpec` kind `incoming`, warn icon). They are appended to the queue (`enqueue`), never reset a running level-up queue. Tips (`tip()`) for skills and orbs keep their current placement.
- **U5-R3 (owner)** Results follows the D3 board: pink ribbon "GAME OVER" / "YOU WIN!" over one panel, blue rays background (no cream, no hill), "Play again" primary 72 px tall and "Home" light pill below it, both in the lower 45% of the screen. The round Home icon button is removed.
- **U5-R4** The capy head above the Results card is dropped (the board has none; the ribbon takes its place). `targets.head` is no longer set; `resultsTimeline` already skips missing targets (verify in Task 4 step 1).
- **U5-R5** The checkpoint banner, energy row and next-checkpoint row move inside the panel (board), so `resultsColumn` is replaced by `resultsLayout` (Task 4). Rows without a value are absent; the panel shrinks; it never leaves an empty slot (ResultsFirstRun board).
- **U5-R6** First run (`state === 'firstRun'`) adds the board's one-line help text under the progress row (`results.firstRunTip`).
- **U5-R7** Countdown checkpoint info becomes a butter chip ("Starting at L10", `countdown.checkpoint` text) at 372 mock px below the board top; the ramp line (`countdown.ramp`) stays as a small white outlined label under the chip so no information is lost.
- **U5-R8** If "Play again" cannot be built (`session.lastStartLevel() === null`), "Home" takes the primary slot and style; the screen is never without a primary action.

## File Structure
- Modify `src/game/hud/HudTop.ts` — pause glyph constants (U5-R1).
- Modify `src/game/hud/overlayModel.ts` — `PAUSE_MOCK` per Pause board; tones become skin tones.
- Modify `src/game/hud/PauseOverlay.ts` — `card()` panel, `chip()` butter chip, D3 title; drop `drawCard`.
- Modify `src/game/hud/CountdownOverlay.ts` — mango digit, chip + ramp label (U5-R7).
- Modify `src/game/hud/banners.ts` — `incoming` kind, `StripView` tone instead of fill/ink.
- Modify `src/game/hud/BannerLayer.ts` — strip card on `panel` skin, pills as skill-tone chips, `enqueue()`.
- Modify `src/game/scenes/HudScene.ts:181` — incoming warnings call `banners.enqueue`.
- Modify `src/game/juice/DeathCard.ts` — ribbon over panel.
- Modify `src/game/flow/resultsView.ts` — rows list, ribbon title, first-run tip.
- Create `src/game/flow/resultsLayout.ts` — pure panel/rows/buttons layout.
- Modify `src/game/scenes/ResultsScene.ts` — rebuilt on the layout.
- Modify `src/game/ui/menuMetrics.ts` (`MENU.results`), `src/game/ui/menuLayout.ts` (remove `resultsColumn`, `resultsCardTop` if unused).
- Modify `src/game/text.ts` — keys `results.firstRunTip`, `results.nextRunAt`.
- Tests: `tests/game/hudOverlay.test.ts`, `tests/game/hudBanners.test.ts`, `tests/game/resultsView.test.ts`, `tests/game/resultsSeq.test.ts`, new `tests/game/resultsLayout.test.ts`, `tests/game/deathLine.test.ts` (unchanged unless names move).
- Docs: `docs/PLAYTEST.md`, `docs/DECISIONS.md` (rulings), `docs/CODEMAP.md` (new file), `CHANGELOG.md`, `docs/STATUS.md`.

---

### Task 1: Results button check (no code change unless it reproduces)

**Files:** none, or a fix found by `superpowers:systematic-debugging`; evidence in `docs/PLAYTEST.md`.

- [ ] **Step 1: Reproduce in a real browser at 60 fps.** `npm run dev`, clear storage (`localStorage.clear()` in the console), play one run from Home and die in the first seconds (first run). Wait 15 s on Results. Record: are `results-again` and `results-home` visible and tappable? Repeat once with an existing save.
- [ ] **Step 2: Headless cross-check.** `node tools/qa/shot.mjs` with the Results flow used in U3 (`tmp/qa/u3/` scripts); dump `scene.children.list` names + `alpha` + `visible` of `results-again`/`results-home` after 13 s.
- [ ] **Step 3: Decide.** If both buttons show: write a PLAYTEST line "U5 Task 1: first-run Results buttons visible (browser + headless), the 2026-11-11 Motion lazy-alpha fix holds" and move on. If not: stop this plan, run `superpowers:systematic-debugging` (known suspects: `session.lastStartLevel()` returning `null` on a first run, which hides Play again at `ResultsScene.ts:163`; MOT-2 entrance leaving alpha 0), fix with a failing test first, commit `fix(results): ...`, then continue. U5-R8 covers the `null` case either way.

### Task 2: Results content model (pure)

**Files:**
- Modify: `src/game/flow/resultsView.ts`
- Modify: `src/game/text.ts`
- Test: `tests/game/resultsView.test.ts`

**Interfaces:**
- Produces: `ResultsRow` union and `ResultsView.rows`, `ResultsView.firstRunTip`, `ResultsView.ribbon`:

```ts
export type ResultsRow =
  | { kind: 'checkpoint'; level: number }          // butter chip "Next run starts at L{level}!"
  | { kind: 'energy'; value: number }              // bolt + "Energy saved" + value
  | { kind: 'next'; fill: number; level: number; requiresClear: boolean }; // flag + bar + "L{level}" chip
export interface ResultsView { /* existing fields kept */ rows: ResultsRow[]; firstRunTip: string | null; ribbon: 'results.youWin' | 'results.gameOver' }
```
Row order is fixed: checkpoint, energy, next (board). `energySaved`, `checkpointBanner`, `next` stay for one task so `ResultsScene` compiles; Task 5 removes them.

- [ ] **Step 1: Write the failing tests** (append to `tests/game/resultsView.test.ts`, reuse its existing `summary()` fixture helper):

```ts
describe('D3-R18 results rows', () => {
  it('D3-R18 orders rows checkpoint, energy, next and drops empty ones', () => {
    const v = resultsView(summary({ newCheckpoints: [10], carriedEnergy: 35, level: 10 }), { reach: 12, requiresClear: false }, 6);
    expect(v.rows.map(r => r.kind)).toEqual(['checkpoint', 'energy', 'next']);
    expect(v.rows[0]).toEqual({ kind: 'checkpoint', level: 10 });
  });
  it('D3-R18 first run keeps only next and adds the tip (U5-R6)', () => {
    const v = resultsView(summary({ firstRun: true, carriedEnergy: 0, newCheckpoints: [] }), { reach: 10, requiresClear: false }, 6);
    expect(v.rows.map(r => r.kind)).toEqual(['next']);
    expect(v.firstRunTip).toBe(t('results.firstRunTip'));
  });
  it('D3-R18 no milestone and nothing saved gives no rows and no tip', () => {
    const v = resultsView(summary({ carriedEnergy: 0, newCheckpoints: [] }), null, 6);
    expect(v.rows).toEqual([]); expect(v.firstRunTip).toBeNull();
  });
  it('U5-R3 ribbon text follows won', () => {
    expect(resultsView(summary({ won: true }), null, 6).ribbon).toBe('results.youWin');
    expect(resultsView(summary({ won: false }), null, 6).ribbon).toBe('results.gameOver');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (`rows` undefined): `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/resultsView.test.ts`
- [ ] **Step 3: Implement.** In `text.ts` add `'results.firstRunTip': 'Fill the bar with mangoes to level up. Each level brings new obstacles.'` and `'results.nextRunAt': 'Next run starts at L{level}!'` next to the other `results.*` keys. In `resultsView` build:

```ts
const rows: ResultsRow[] = [];
if (checkpoint) rows.push({ kind: 'checkpoint', level: Math.max(...s.newCheckpoints) });
if (s.carriedEnergy > 0) rows.push({ kind: 'energy', value: s.carriedEnergy });
if (nextMilestone) rows.push({ kind: 'next', fill: Math.min(1, s.level / nextMilestone.reach), level: nextMilestone.reach, requiresClear: nextMilestone.requiresClear });
// ...return { ...existing, rows, firstRunTip: state === 'firstRun' ? t('results.firstRunTip') : null, ribbon: s.won ? 'results.youWin' : 'results.gameOver' };
```
- [ ] **Step 4: Run, expect PASS** (same command), plus `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(results): D3-R18 row model and first-run tip` (with CHANGELOG line).

### Task 3: Results layout (pure)

**Files:**
- Create: `src/game/flow/resultsLayout.ts`
- Modify: `src/game/ui/menuMetrics.ts` (`MENU.results` gets the D3 numbers below)
- Test: `tests/game/resultsLayout.test.ts`

**Interfaces:**
- Consumes: `ResultsView` (Task 2).
- Produces:

```ts
export interface RY { y: number; h: number }               // mock px, screen top = 0
export interface ResultsLayout {
  ribbon: RY & { w: number }; panel: RY & { x: number; w: number };
  headline: number; scoreLabel: number; score: number; best: number; tiles: RY;  // y inside the screen
  rows: (RY & { kind: ResultsRow['kind'] })[]; tip: RY | null;
  primary: RY & { w: number; id: 'again' | 'home' }; secondary: (RY & { w: number }) | null;
}
export function resultsLayout(v: Pick<ResultsView, 'rows' | 'firstRunTip'>, hm: number, hasAgain: boolean): ResultsLayout;
```
`hm` = screen height in mock px (`HEIGHT / ui(1)`, 640..~780 for the 540 x 960..1200 canvas). Metrics (board `results()`): `T = round((hm - 640) * 0.5)` (0 at 640, 70 at 780), ribbon `{ y: T + 18, h: 72, w: 250 }`, panel `x 20, w 320, y T + 76`, padTop 22, headline 14 + 8 gap, score label, score 64, best chip 30 + 6, tiles 72 + 12 gap, rows (checkpoint 34, energy 24, next 26) with 10 gap, tip 36 + 14 gap, padBottom 14. Buttons: primary `{ w: 280, h: 72 }` at `y = T + 470` scaled as `py = round(hm * 0.734)` (470/640), secondary `{ w: 168, h: 48 }` at `py + 94`. If the panel bottom + 16 is below `py`, move the primary and secondary down to `panelBottom + 16` (never overlap); a test guards the worst case.

- [ ] **Step 1: Write the failing tests:**

```ts
import { describe, expect, it } from 'vitest';
import { resultsLayout } from '../../src/game/flow/resultsLayout';

const full = { rows: [{ kind: 'checkpoint', level: 10 }, { kind: 'energy', value: 35 }, { kind: 'next', fill: 1, level: 12, requiresClear: false }] as const, firstRunTip: null };
const first = { rows: [{ kind: 'next', fill: 0.2, level: 10, requiresClear: false }] as const, firstRunTip: 'tip' };

describe('D3-R18 results layout', () => {
  for (const hm of [640, 780]) {
    it(`D3-R18 buttons sit in the lower 45% and never overlap the panel (hm ${hm})`, () => {
      const l = resultsLayout(full as never, hm, true);
      expect(l.primary.y).toBeGreaterThanOrEqual(hm * 0.55 - 1);
      expect(l.primary.y).toBeGreaterThanOrEqual(l.panel.y + l.panel.h + 16);
      expect(l.secondary!.y + l.secondary!.h).toBeLessThanOrEqual(hm);
    });
  }
  it('D3-R18 rows keep board order and the panel shrinks without them (U5-R5)', () => {
    const a = resultsLayout(full as never, 640, true), b = resultsLayout({ rows: [], firstRunTip: null }, 640, true);
    expect(a.rows.map(r => r.kind)).toEqual(['checkpoint', 'energy', 'next']);
    expect(b.panel.h).toBeLessThan(a.panel.h); expect(b.rows).toEqual([]);
  });
  it('U5-R6 first run adds the tip below the rows', () => {
    const l = resultsLayout(first as never, 640, true);
    expect(l.tip).not.toBeNull(); expect(l.tip!.y).toBeGreaterThan(l.rows[0]!.y);
  });
  it('U5-R8 without Play again, Home is the primary and there is no secondary', () => {
    const l = resultsLayout(full as never, 640, false);
    expect(l.primary.id).toBe('home'); expect(l.secondary).toBeNull();
  });
  it('D3-R18 ribbon overlaps the panel top like the board', () => {
    const l = resultsLayout(full as never, 640, true);
    expect(l.ribbon.y + l.ribbon.h).toBeGreaterThan(l.panel.y);
  });
});
```
- [ ] **Step 2: Run, expect FAIL** (module missing).
- [ ] **Step 3: Implement** `resultsLayout` with the metrics above (store them in `MENU.results.d3 = { ... }`, read them from there; delete no old `MENU.results` key yet). Use a running `y` cursor down the panel; add `// D3-R18` comment on the function.
- [ ] **Step 4: Run, expect PASS**; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(results): D3-R18 pure layout` (CHANGELOG line; CODEMAP entry for `resultsLayout.ts`).

### Task 4: Results scene rebuild (U5-R3, R4, R8)

**Files:**
- Modify: `src/game/scenes/ResultsScene.ts`, `src/game/flow/resultsView.ts` (drop `energySaved`, `checkpointBanner`, `next` once unused), `src/game/ui/menuLayout.ts` (remove `resultsColumn`/`resultsCardTop` and their tests if no longer used), `src/game/ui/menuMetrics.ts` (remove dead `MENU.results` keys)
- Test: `tests/game/resultsSeq.test.ts`, `tests/game/resultsView.test.ts` (update fixtures for removed fields)

**Interfaces:**
- Consumes: `resultsView` rows (Task 2), `resultsLayout` (Task 3), `card`, `chip`, `pillButton`, `progressBar`, `titleText`, `butterChip` (`src/game/ui/menuWidgets.ts:116`), `skinTexture(host, 'ribbon', 'ribbon', ...)` as in `HudTop.ts:56-57`, the Home rays background used by `HomeScene` (grep `rays` in `src/game/scenes/HomeScene.ts` and reuse the same helper, dimmed per board `rays dim`).
- Produces: same `SeqTargets` keys as today except `head` (gone) and `banner` (now the checkpoint row target), so `resultsTimeline` and `runResultsSequence` stay unchanged.

- [ ] **Step 1: Check the timeline tolerates a missing `head`.** Read `src/game/flow/entranceOrder.ts` `resultsTimeline` and `resultsSeq.ts`; add a test in `tests/game/resultsSeq.test.ts`:

```ts
it('U5-R4 sequence runs without a head target and keeps the 1500 ms cap', () => {
  // build timeline as the existing tests do, delete targets.head, run, assert done() after cap and no throw
});
```
Write it by copying the nearest existing "cap" test in that file and deleting `head` from its targets. Run it; if it fails, make the sequence skip undefined targets (one guard in `runResultsSequence`).
- [ ] **Step 2: Rebuild `create()`** in this order: rays background; ribbon image pair (lip + rest) at `l.ribbon` with `titleText(..., t(v.ribbon), 32)` and stroke colour `TOKENS.d3.tone.ribbon.line`; `card()` at `l.panel`; headline text (14 mock, `TOKENS.d3.text`, wrap at panel w - 32); "SCORE" label; score (Lilita 64, kept as `this.scoreText` for the count-up); best `chip()` with gold tone when `v.bestChip.gold` (`chip` gains an optional `tone: SkinTone = 'light'` parameter; default keeps all other callers); three stat tiles as inset `card()`s 1/3 width with label + coloured value (`#D6336C`, `#A86A10`, `#1F86D8` → add as `TOKENS.d3.stat.{level,eaten,biome}`); rows by kind (checkpoint = `butterChip` full width with flag icon and `t('results.nextRunAt', { level })`; energy = bolt icon + `t('results.carryLabel')` + value right; next = flag + `progressBar(..., TOKENS.accent.orange)` + butter chip `L{level}`); first-run tip text. Wrap each element group in `captureGroup` with the existing target keys (`card`, `headline`, `scoreLabel`, `score`, `best`, `stat0..2`, `energy`, `banner`, `next`).
- [ ] **Step 3: Footer.** `primary`: `pillButton(..., t('playAgain'), RESULTS_BUTTONS.again, () => beginRun(this, last, 'results'), 'green', { navigates: true })` + `bigLabel`; `secondary`: `pillButton(..., t('home'), RESULTS_BUTTONS.home, home, 'cream', { navigates: true })` with the home icon left of the label. When `last === null` (U5-R8) the Home button is built in the primary rect with tone `'green'` and name `RESULTS_BUTTONS.home`. Keep `this.targets.again` / `this.targets.home`.
- [ ] **Step 4: Remove dead code** (`summaryBlock`, `row`, `banner`, `progress`, `hill`, `bgCream` import if unused, D2 `TONE_FILL`), the old `ResultsView` fields, `resultsColumn`/`resultsCardTop` and their tests if nothing else imports them (`grep -rn resultsColumn src tests`).
- [ ] **Step 5: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/results`, then `npm run typecheck`.
- [ ] **Step 6: Screenshot** Results normal / new best + checkpoint + energy / first run / won at 540 x 960 and 540 x 1170 with `node tools/qa/shot.mjs` into `tmp/qa/u5/`; compare with `Results-360.png`, `Results-390.png`, `ResultsFirstRun-360.png`. Check: no overlap, buttons in lower 45%, count-up still runs, tap skips the sequence.
- [ ] **Step 7: Commit** `feat(results): D3-R18 ribbon, panel and footer` (CHANGELOG).

### Task 5: Pause overlay and pause glyph (D3-R15, U5-R1)

**Files:**
- Modify: `src/game/hud/overlayModel.ts`, `src/game/hud/PauseOverlay.ts`, `src/game/hud/HudTop.ts:18-19`
- Test: `tests/game/hudOverlay.test.ts`

**Interfaces:**
- Produces: `PAUSE_MOCK` with the board values, `PauseView.buttons[].tone` unchanged (`'green' | 'cream' | 'danger'` maps to skins through `PILL_SKIN`).

- [ ] **Step 1: Write the failing test** in `tests/game/hudOverlay.test.ts`:

```ts
it('D3-R15 pause panel matches the board: 300 wide, title 40, chip then buttons', () => {
  const v = pauseView({ level: 3, biome: 1, hint: { key: 'hud.nextCheckpoint', level: 10 }, settingsAvailable: true }, t);
  const l = pauseLayout(v);
  expect(l.w).toBe(300);
  expect(l.chip).not.toBeNull();
  expect(l.buttons.map(b => b.id)).toEqual(['resume', 'settings', 'quit']);
  expect(l.buttons[0]!.y).toBeGreaterThan(l.chip!);
  expect(l.height).toBeLessThanOrEqual(408);
});
```
(Use the hint key the existing tests in this file use if `hud.nextCheckpoint` differs.)
- [ ] **Step 2: Run, expect FAIL** (w is 310).
- [ ] **Step 3: Implement.** `PAUSE_MOCK = { w: 300, padTop: 20, padBottom: 22, gap: 6, title: 44, subtitle: 20, chip: 30, chipMt: 12, resume: 66, resumeMt: 26, secondary: 52, secondaryMt: 22, quitMt: 16, titleSize: 40, subtitleSize: 15 }` (add `quitMt` to the stack row for quit). In `PauseOverlay`: scrim with `TOKENS.d3.inkDeep` at alpha `TOKENS.hud.pauseScrimAlpha` (0.5); `card()` panel replaces `drawCard` (rebuild the card container on `show()` because its height depends on the chip; destroy the previous one); title via `titleText(..., 40)`; subtitle in `TOKENS.d3.text`; chip via `butterChip` with the flag icon; Settings button gets the gear icon left of its label. Remove `uiTheme`/`themeOf` use (light only).
- [ ] **Step 4: Pause glyph (U5-R1).** `HudTop.ts` M: `pauseBarW: 7, pauseBarH: 22, pauseBarX: 10, pauseGap: 3, pauseRadius: 3, playHalf: 11, playBack: 8, playTip: 11` (bars at x -10..-3 and 3..10, centred). Add a test in `tests/game/hudTop*.test.ts` only if a pure helper exists; otherwise verify by screenshot (Step 6).
- [ ] **Step 5: Run** `npx vitest run ... tests/game/hudOverlay.test.ts tests/game/keyboardOverlay.test.ts`; `npm run typecheck`.
- [ ] **Step 6: Screenshot** pause open with and without the checkpoint chip, and the HUD top bar; compare with `Pause-360.png` / `Game-360.png`.
- [ ] **Step 7: Commit** `feat(hud): D3-R15 pause panel and bigger pause glyph` (CHANGELOG).

### Task 6: Countdown (D3-R15, U5-R7)

**Files:**
- Modify: `src/game/hud/CountdownOverlay.ts`, `src/game/uiTokens.ts` (`hud.countdown` → `TOKENS.d3.logo.mango` use)

- [ ] **Step 1:** Digit: colour `TOKENS.d3.logo.mango` (`#FFD93B` — confirm the path with `grep -n "logo:" src/game/uiTokens.ts`), stroke `TOKENS.d3.logo.mangoLine` 12 mock, shadow `0, 8` same colour, size 170 mock, top 186 mock below the screen top offset used today (`BOARD.y + BOARD.size / 2` stays as the centre if it is within 10 px of the board position; otherwise centre at `BOARD.y + ui(186 + 85 - 76)` — check in the screenshot). Scrim alpha `countScrimAlpha` 0.28 with `TOKENS.d3.inkDeep`.
- [ ] **Step 2:** Replace the card with `butterChip(scene, WIDTH / 2, BOARD.y + ui(M.chipTop), ...)` showing `card.title`, flag icon; the ramp text below it as a 14 mock white label with ink outline. Destroy and rebuild the chip on `tick` only when the title text changes.
- [ ] **Step 3:** Run `npx vitest run ... tests/game/hudOverlay.test.ts` (countdownCard tests unchanged) and `npm run typecheck`; screenshot a checkpoint start (`?debug=1&level=10`) and a fresh L1 start; compare with `Countdown-360.png`.
- [ ] **Step 4: Commit** `feat(hud): D3-R15 mango countdown and start chip` (CHANGELOG).

### Task 7: Banners, incoming warnings, skill pills (D3-R16, U5-R2)

**Files:**
- Modify: `src/game/hud/banners.ts`, `src/game/hud/BannerLayer.ts`, `src/game/scenes/HudScene.ts:181`, `src/game/hud/hudIcons.ts` (only if no `warn` icon exists: reuse `bolt`)
- Test: `tests/game/hudBanners.test.ts`

**Interfaces:**
- Produces: `BannerSpec` gains `| { kind: 'incoming'; text: string }`; `StripView` becomes `{ icon: StripIcon; title: string; sub: string | null; chip: string | null; tone: 'light' | 'butter' | 'mint' | 'warn' }`; `StripIcon` adds `'up' | 'warn'`; `BannerLayer.enqueue(spec: BannerSpec): void`.

- [ ] **Step 1: Failing tests:**

```ts
it('U5-R2 incoming warning is a strip card with the warn icon', () => {
  expect(bannerStrip({ kind: 'incoming', text: 'Fence incoming' })).toEqual({ icon: 'warn', title: 'Fence incoming', sub: null, chip: null, tone: 'butter' });
});
it('D3-R16 level-up uses the up icon on a light card; biome shows its label as a chip', () => {
  const lv = bannerStrip({ kind: 'levelUp', title: 'Level 4', subtitle: 'Fresh start!', chip: null });
  expect(lv.icon).toBe('up'); expect(lv.tone).toBe('light');
  const bi = bannerStrip({ kind: 'biome', label: 'BIOME 2', name: 'Rice Paddy', tagline: 'Fences and mud.' });
  expect(bi.chip).toBe('BIOME 2'); expect(bi.title).toBe('Rice Paddy');
});
```
Update the existing `fill`/`ink` assertions in this file to `tone`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement `bannerStrip`:** levelUp → `up`, light; challenge → `bolt`, butter; biome → `biome` icon replaced by the gold chip (`chip: s.label`), light; checkpoint → `flag`, mint; hint → `bolt`, light; incoming → `warn`, butter. Titles still pass through `clipLine`.
- [ ] **Step 4: `BannerLayer.render`:** draw the strip as a `panel` skin image of `r.w x r.h` (light) or a `chip`-kind skin in the `butter`/`mint` tone if those tones exist in `TOKENS.d3.tone` (check `skinSpec.ts`; if a tone is missing use `light` and tint only the icon); centre icon + text block (board: icon 22, gap 8, title Lilita 15, sub 12); the optional chip on the left of the text via `chip(..., 'gold')`. Pills: replace `drawCard` by a `chip`-kind skin per slot with a coloured border tone (slot A `skillA`, slot B `skillB`, as on the board) built once per text change (keep the `pillKeys` cache); place them side by side centred in the strip row as the board shows when two are live, stacked as today when the width does not fit (`w0 + w1 + 6 > r.w`).
- [ ] **Step 5: `enqueue`:** `enqueue(spec) { if (this.root.visible) this.queue.push(spec); else this.show([spec]); }` with `// U5-R2` comment; respect `bannerQueueMax` by dropping the new spec when the queue is full. In `HudScene.ts:181` replace `this.banners.tip(incomingBanner(e.family))` with `this.banners.enqueue({ kind: 'incoming', text: incomingBanner(e.family) })`.
- [ ] **Step 6:** Run `npx vitest run ... tests/game/hudBanners.test.ts`; `npm run typecheck`; screenshot level-up, biome change (`?debug=1&level=5` then "+1"), fence incoming (level where fences unlock per `banner.new.*`), two skill pills; compare with `Banners-360*.png`.
- [ ] **Step 7: Commit** `feat(hud): D3-R16 strip cards, incoming warnings in the strip` (CHANGELOG).

### Task 8: Death card (D3-R17)

**Files:**
- Modify: `src/game/juice/DeathCard.ts`
- Test: `tests/game/deathLine.test.ts` (unchanged, must stay green)

- [ ] **Step 1:** Layout per board (mock px): panel `x 36, w 288`, padding `42 / 18 / 20`, line Nunito 900 19, line-height 1.3; ribbon `w 260, h 76`, top = panel top - 40, centred; "RUN OVER" via `titleText(..., t('death.title').toUpperCase(), 34)` with stroke `TOKENS.d3.tone.ribbon.line`, centred on the ribbon. Vertical position: keep `layoutColumn` centring of the whole group (ribbon top to panel bottom).
- [ ] **Step 2:** Build the ribbon from `skinTexture(hostOf(scene), 'ribbon', 'ribbon', w, h, 'lip'|'rest', ui(1))` like `HudTop.ts:56-57`; panel via `card()`. Keep the container name `death-card`, text name `death-line`, depth, entrance tween, `armSkip`, `destroy`.
- [ ] **Step 3:** Run `npx vitest run ... tests/game/deathLine.test.ts`; `npm run typecheck`; screenshot a death (short line and a two-line line, e.g. coconut context) and compare with `Death-360.png`; check reduced motion (`?debug=1&motion=off`) still fades only.
- [ ] **Step 4: Commit** `feat(juice): D3-R17 RUN OVER ribbon over a panel` (CHANGELOG).

### Task 9: Screenshot pass, docs, merge

- [ ] **Step 1:** Full capture into `tmp/qa/u5/` at 540 x 960 and 540 x 1170: Pause (chip on/off), Countdown (L1, L10), level-up / biome / checkpoint / incoming / two pills, Death (short/long), Results (normal, full rows, first run, won, no Play again via a cleared `lastStart` if reachable). Console must be clean.
- [ ] **Step 2:** `docs/PLAYTEST.md` entry "U5 overlays + Results" with the shot list, findings and an owner eye-check list: pause glyph size, incoming card timing vs. level-up queue, Results button press feel, Death ribbon readability.
- [ ] **Step 3:** `docs/DECISIONS.md` entry with U5-R1..R8; `docs/CODEMAP.md` (`flow/resultsLayout.ts`); `docs/design/UI-MOCKUPS.md` mark Pause/Countdown/Banners/Death/Results as built.
- [ ] **Step 4:** Full `npm test` (if host load times out: `--maxWorkers 1`), then `npm run typecheck`; both pass.
- [ ] **Step 5:** `git checkout version/v0.3 && git merge --no-ff feat/u5-overlays-results`; rewrite `docs/STATUS.md` (U5 merged, next U6), refresh GitNexus in the background (`node .gitnexus/run.cjs analyze --index-only --workers 2`).
