# UI D3 U4a In-run HUD Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The in-run screen gets the D3 layout: full-width board, D3 top bar (Pause, level ribbon, score chip, mango bar), and a bottom group (skill A/B as `skill` skins, energy bar, steer hint, checkpoint chip; D-pad variant) that uses the spare height on tall phones.

**Architecture:** One pure module `hud/d3HudLayout.ts` returns every in-run rect in D3 board px (360 wide) for a canvas height and the D-pad flag; `BOARD` becomes a live value set at boot from the same rule. Views convert with `d3()`/`d3m()` (DECISIONS 2026-11-11 "D3 layout unit"). The old `hudLayout`/`HUD_MOCK`/`statsRow` are removed in the last code task once every view has moved.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vitest (Windows: `npx vitest run --configLoader native --pool threads --maxWorkers 1 <path>`).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §6 D3-R9, §7 D3-R13, D3-R14, §7b D3-R21..R24, R28. Roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` U4 items 1-3. Boards: `docs/design/mockups/d3/boards.html` `game()` / `skillBtn()` and `png/Game-360.png`, `Game-390.png`, `GameDpad-360.png`, `GameLocked-360.png`, `GameLocked-360-2.png`.

**Split of U4 (lead ruling):** U4a = this plan (layout, HUD top, bottom group, skill buttons, D-pad placement, screen background). U4b = board art (D3-R12, roadmap U4 items 4-7). U4c = steer feedback, first-input hint glyph, value changes (D3-R25..R27, roadmap U4 items 8-10). Each is its own plan and merge.

## Global Constraints
- Branch `feat/ui-d3-u4a-hud-layout` from `version/v0.3`; merge back `--no-ff` after `npm test` and `npm run typecheck` (sequential).
- No change to `src/core/`, `src/meta/`, save format or gameplay numbers. Collision and grid are untouched: only the board's on-screen rect changes.
- D3 layout unit: tables in board px (360 wide); convert with `d3(px)` (canvas px), `d3m(px)` (mock size for widgets that call `ui()`), `d3Height()` (canvas height in board px) from `src/game/ui/layout.ts`.
- No hex literals outside `src/game/uiTokens.ts`; no magic numbers (tables in `d3HudLayout.ts` `D3_RUN`); timings from `balance.motion`.
- `HEIGHT` and `BOARD` are read only inside functions (guard tests).
- D3-R8: every tappable target >= 48 board px both axes. D3-R9: nothing cut off at heights 640..800 board px, spare height split around the bottom group.
- D3-R28 reduced motion honoured by every new effect (`tapBurst`/`denied` already honour it).
- Requirement IDs in test names and at implementing functions; CHANGELOG line per commit; CODEMAP updated in the last task.

## Lead rulings (board gaps)
- **R1 Locked slot:** a skill slot with no skill (`HudView.skills[i] === null`) shows an `off` skill button with the lock icon; a tap gives `denied()` and the existing "nope" sound, no cast.
- **R2 Wait prompt:** the `wait` chip kind ("Swipe to steer!") is drawn as white text in the hint slot under the energy bar; `ramp`/`checkpoint` kinds use the butter chip.
- **R3 D-pad chip:** in D-pad mode the chip shows `L{level}` (new key `hud.chipShort`) with the flag icon; the wait prompt is hidden in D-pad mode (the D-pad itself is the cue).
- **R4 D-pad toggle mid-run:** changing the D-pad setting (Settings overlay from Pause) re-places the bottom group at once (`place(l)` on each view); nothing is recreated.
- **R5 Biome name** is no longer under the level title (the banner shows it on biome change); the level ribbon keeps the `hudText.ts` label and challenge star.
- **R6 Screen background:** GameScene shows `screenBackground(scene, biome, true)` (rays at half alpha, board `rays dim`) and swaps it on a biome change.

## File structure
| Path | Action | Responsibility |
|---|---|---|
| `src/game/hud/d3HudLayout.ts` | create | `D3_RUN` table, `boardRect(hm)`, `d3HudLayout(hm, dpad)` pure rects |
| `src/game/layout.ts` | modify | `BOARD` becomes `export let` + `setBoard()` |
| `src/game/viewport.ts` | modify | `initViewport` also sets `BOARD` |
| `src/game/ui/backgroundSpec.ts`, `background.ts`, `uiTokens.ts` | modify | `dim` rays variant |
| `src/game/scenes/GameScene.ts` | modify | D3 background per biome |
| `src/game/hud/HudTop.ts` | rewrite | Pause, ribbon, score chip, mango bar |
| `src/game/hud/BottomGroup.ts` | create | energy bar, hint text, checkpoint chip |
| `src/game/hud/SkillButtons.ts` | rewrite | D3 skill buttons, gauge, cost badge, locked |
| `src/game/input/dpad.ts` | modify | D3 key positions + light key skin |
| `src/game/scenes/HudScene.ts` | modify | wiring, relayout on settings |
| `src/game/hud/hudModel.ts`, `text.ts` | modify | `chip.short` |
| `src/game/hud/hudLayout.ts` | modify | keep only strip/tip helpers, now on D3 rects |
| tests | create/modify | `d3HudLayout.test.ts`, `boardGuard` in `heightGuard.test.ts`, `hudModel.test.ts`, `backgroundSpec.test.ts`, existing hud tests |

---

### Task 1: Live board rect and the in-run layout table (D3-R9)

**Files:**
- Create: `src/game/hud/d3HudLayout.ts`
- Modify: `src/game/layout.ts`, `src/game/viewport.ts`
- Test: `tests/game/d3HudLayout.test.ts`, `tests/game/heightGuard.test.ts`

**Interfaces:**
- Produces:
  - `D3_RUN` (table below), `boardRect(hm: number): { x: number; y: number; size: number }` in board px.
  - `d3HudLayout(hm: number, dpad: boolean): D3HudLayout` in board px:
    ```ts
    export interface R { x: number; y: number; w: number; h: number }
    export interface D3HudLayout {
      board: R; pause: R; ribbon: R; score: { right: number; y: number; h: number };
      mango: { icon: R; bar: R; label: R };
      skills: readonly [R, R]; energy: { icon: R; bar: R; label: R };
      hint: R | null; chip: { cx: number; right: number | null; y: number; h: number; short: boolean };
      dpad: { up: R; left: R; right: R; down: R } | null;
    }
    ```
  - `layout.ts`: `export let BOARD: { x: number; y: number; size: number }` (canvas px) and `setBoard(b)`.

- [ ] **Step 1: Table.** `src/game/hud/d3HudLayout.ts` (numbers from boards.html `game()`; `tall` = the 390x844 board scaled by 360/390, board px height 780):

```ts
// D3-R9 in-run layout in D3 board px (360 wide). Pure, no Phaser.
export const D3_RUN = {
  short: { h: 640, top: 0 }, tall: { h: 780, top: 37 },
  side: 10, boardTop: 112, boardSize: 340,
  pause: { x: 12, y: 12, d: 48 }, ribbon: { w: 160, h: 51, y: 10 }, score: { right: 12, y: 14, h: 40 },
  mango: { y: 70, h: 34, side: 14, icon: 34, gap: 8, barH: 26, labelW: 44 },
  bottom: { block: 146, gapMin: 24, spareShare: 0.45 },
  skill: { d: 78, side: 22, sideDpad: 12, dyDpad: 62 },
  energy: { x: 112, dy: 8, h: 22, icon: 22, gap: 6, labelW: 24, xDpad: 16, rightDpad: 96 },
  hint: { dy: 42, h: 20, x: 100 },
  chip: { dy: 100, dyTall: 112, h: 36, hDpad: 30, rightDpad: 14, dyDpad: -3 },
  dpad: { key: 50, dx: 54, upDy: 30, midDy: 76, downDy: 122, gap: 8, block: 172 },
} as const;
```

- [ ] **Step 2: Failing tests** `tests/game/d3HudLayout.test.ts`:

```ts
import { expect, it } from 'vitest';
import { boardRect, d3HudLayout, type R } from '../../src/game/hud/d3HudLayout';

const HM = [640, 700, 780, 800];
const rects = (l: ReturnType<typeof d3HudLayout>): [string, R][] => {
  const out: [string, R][] = [['board', l.board], ['pause', l.pause], ['ribbon', l.ribbon], ['mangoBar', l.mango.bar],
    ['skillA', l.skills[0]], ['skillB', l.skills[1]], ['energyBar', l.energy.bar]];
  if (l.hint) out.push(['hint', l.hint]);
  if (l.dpad) for (const k of ['up', 'left', 'right', 'down'] as const) out.push([k, l.dpad[k]]);
  return out;
};
const overlap = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

it('D3-R9 board: 10 px sides, 340 wide, top 112 on 640 and 149 on 780', () => {
  expect(boardRect(640)).toEqual({ x: 10, y: 112, size: 340 });
  expect(boardRect(780).y).toBeCloseTo(149);
});
it('D3-R9 every rect is inside the canvas and nothing overlaps, D-pad on and off', () => {
  for (const hm of HM) for (const dpad of [false, true]) {
    const rs = rects(d3HudLayout(hm, dpad));
    for (const [k, r] of rs) { expect(r.x, k).toBeGreaterThanOrEqual(0); expect(r.x + r.w, k).toBeLessThanOrEqual(360); expect(r.y, k).toBeGreaterThanOrEqual(0); expect(r.y + r.h, `${hm} ${dpad} ${k}`).toBeLessThanOrEqual(hm); }
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) expect(overlap(rs[i]![1], rs[j]![1]), `${hm} ${dpad} ${rs[i]![0]}/${rs[j]![0]}`).toBe(false);
  }
});
it('D3-R8 Pause, skills and D-pad keys are at least 48 px', () => {
  for (const hm of HM) for (const dpad of [false, true]) {
    const l = d3HudLayout(hm, dpad), taps = [l.pause, l.skills[0], l.skills[1], ...(l.dpad ? [l.dpad.up, l.dpad.left, l.dpad.right, l.dpad.down] : [])];
    for (const r of taps) { expect(r.w).toBeGreaterThanOrEqual(48); expect(r.h).toBeGreaterThanOrEqual(48); }
  }
});
it('D3-R9 board anchors on 640: skills at y 476, energy bar 112..248, chip top 576', () => {
  const l = d3HudLayout(640, false);
  expect(l.skills[0]).toEqual({ x: 22, y: 476, w: 78, h: 78 });
  expect(l.skills[1].x + l.skills[1].w).toBe(338);
  expect(l.energy.bar.x).toBeGreaterThanOrEqual(112); expect(l.energy.bar.x + l.energy.bar.w + 6 + 24).toBeCloseTo(248);
  expect(l.chip.y).toBe(576); expect(l.chip.short).toBe(false); expect(l.hint).not.toBeNull();
});
it('D3-R9 spare height on tall screens goes around the bottom group, not into one band', () => {
  const short = d3HudLayout(640, false), tall = d3HudLayout(780, false);
  const gapAbove = (l: typeof short) => l.skills[0].y - (l.board.y + l.board.size);
  const gapBelow = (l: typeof short, hm: number) => hm - (l.chip.y + l.chip.h);
  expect(gapAbove(tall)).toBeGreaterThan(gapAbove(short));
  expect(gapBelow(tall, 780)).toBeGreaterThan(gapBelow(short, 640));
});
it('D3-R9 R3 D-pad mode: keys centred, energy bar above, short chip on the right', () => {
  const l = d3HudLayout(640, true);
  expect(l.dpad!.up.x + 25).toBe(180); expect(l.dpad!.left.x + 25).toBe(126); expect(l.dpad!.right.x + 25).toBe(234);
  expect(l.energy.bar.y + l.energy.bar.h).toBeLessThan(l.dpad!.up.y);
  expect(l.chip.short).toBe(true); expect(l.chip.right).toBe(14); expect(l.hint).toBeNull();
});
```

- [ ] **Step 3: Run** → FAIL (module not found).
- [ ] **Step 4: Implement** (below the table in the same file):

```ts
export interface R { x: number; y: number; w: number; h: number }
export interface D3HudLayout {
  board: R; pause: R; ribbon: R; score: { right: number; y: number; h: number };
  mango: { icon: R; bar: R; label: R };
  skills: readonly [R, R]; energy: { icon: R; bar: R; label: R };
  hint: R | null; chip: { cx: number; right: number | null; y: number; h: number; short: boolean };
  dpad: { up: R; left: R; right: R; down: R } | null;
}
const W = 360;
const topOff = (hm: number): number => { const D = D3_RUN; return D.short.top + (D.tall.top - D.short.top) * (hm - D.short.h) / (D.tall.h - D.short.h); };
// D3-R9 board rect in board px: full width minus the side padding, under the top bar.
export function boardRect(hm: number): { x: number; y: number; size: number } {
  const D = D3_RUN; return { x: D.side, y: D.boardTop + topOff(hm), size: D.boardSize };
}
const row = (x: number, y: number, w: number, h: number, iconW: number, gap: number, labelW: number): { icon: R; bar: R; label: R } => ({
  icon: { x, y: y + (h - iconW) / 2, w: iconW, h: iconW },
  bar: { x: x + iconW + gap, y, w: w - iconW - labelW - 2 * gap, h },
  label: { x: x + w - labelW, y, w: labelW, h },
});
// D3-R9 every in-run rect for a canvas `hm` board px tall, D-pad on or off.
export function d3HudLayout(hm: number, dpad: boolean): D3HudLayout {
  const D = D3_RUN, T = topOff(hm), b = boardRect(hm), be = b.y + b.size, u = (hm - D.short.h) / (D.tall.h - D.short.h);
  const M = D.mango, mrowY = T + M.y, mw = W - 2 * M.side;
  const mango = row(M.side, mrowY + (M.h - M.barH) / 2, mw, M.barH, M.icon, M.gap, M.labelW);
  mango.icon = { x: M.side, y: mrowY, w: M.icon, h: M.icon };
  const base = {
    board: { x: b.x, y: b.y, w: b.size, h: b.size },
    pause: { x: D.pause.x, y: T + D.pause.y, w: D.pause.d, h: D.pause.d },
    ribbon: { x: (W - D.ribbon.w) / 2, y: T + D.ribbon.y, w: D.ribbon.w, h: D.ribbon.h },
    score: { right: D.score.right, y: T + D.score.y, h: D.score.h }, mango,
  };
  const E = D.energy, S = D.skill;
  if (!dpad) {
    const spare = hm - be - D.bottom.block, g = be + Math.max(D.bottom.gapMin, Math.round(spare * D.bottom.spareShare));
    const ew = W - 2 * E.x;
    return { ...base,
      skills: [{ x: S.side, y: g, w: S.d, h: S.d }, { x: W - S.side - S.d, y: g, w: S.d, h: S.d }],
      energy: row(E.x, g + E.dy, ew, E.h, E.icon, E.gap, E.labelW),
      hint: { x: D.hint.x, y: g + D.hint.dy, w: W - 2 * D.hint.x, h: D.hint.h },
      chip: { cx: W / 2, right: null, y: g + D.chip.dy + (D.chip.dyTall - D.chip.dy) * Math.min(1, Math.max(0, u)), h: D.chip.h, short: false },
      dpad: null };
  }
  const P = D.dpad, spare = hm - be - P.gap - P.block, g = be + P.gap + Math.max(0, Math.round(spare * D.bottom.spareShare));
  const key = (cx: number, y: number): R => ({ x: cx - P.key / 2, y, w: P.key, h: P.key });
  return { ...base,
    skills: [{ x: S.sideDpad, y: g + S.dyDpad, w: S.d, h: S.d }, { x: W - S.sideDpad - S.d, y: g + S.dyDpad, w: S.d, h: S.d }],
    energy: row(E.xDpad, g, W - E.xDpad - E.rightDpad, E.h, E.icon, E.gap, E.labelW),
    hint: null,
    chip: { cx: W - D.chip.rightDpad, right: D.chip.rightDpad, y: g + D.chip.dyDpad, h: D.chip.hDpad, short: true },
    dpad: { up: key(W / 2, g + P.upDy), left: key(W / 2 - P.dx, g + P.midDy), right: key(W / 2 + P.dx, g + P.midDy), down: key(W / 2, g + P.downDy) } };
}
```

Check by hand (640, no D-pad): be 452, spare -6 → g 476; skills 476..554; energy bar row y 484; hint 518..538; chip 576..612. 640 D-pad: g 460; up 490..540, mid 536..586 (left 101..151, right 209..259: no overlap with up 155..205), down 582..632; skills 522..600 at x 12..90 / 270..348 (no overlap with left key 101.. or right key ..259). If a test fails on a real conflict, report the numbers; do not loosen the tests.

- [ ] **Step 5: Live BOARD.** `layout.ts`: replace the const with

```ts
/** D3-R9 live binding (canvas px), set by initViewport from boardRect; read inside functions only (guard: tests/game/heightGuard.test.ts). */
export let BOARD: { x: number; y: number; size: number } = { x: 15, y: 168, size: 510 };
export function setBoard(b: { x: number; y: number; size: number }): void { BOARD = b; }
```

`viewport.ts` `initViewport`: after `setHeight(h)`, `const r = boardRect(d3Height()); setBoard({ x: d3(r.x), y: d3(r.y), size: d3(r.size) });` (imports from `./hud/d3HudLayout` and `./ui/layout`; if this creates an import cycle that breaks tests, move `boardRect` + `D3_RUN` into `src/game/d3RunTable.ts` with no imports and re-export it from `d3HudLayout.ts`). Default value = `boardRect(640)` converted (x 15, y 168, size 510) so tests that never call initViewport get the short layout.
- [ ] **Step 6: Guard.** In `tests/game/heightGuard.test.ts` add the same top-level-initialiser check for `BOARD` (copy the HEIGHT rule with the identifier changed; test name `D3-R9 BOARD is never read in a module-level initialiser`). Fix any offender it finds by moving the read into a function.
- [ ] **Step 7: Run** the two test files, then the full suite (cell size changes 504/17 → 510/17 = 30; fix tests that pinned 504 or 29.65 only by reading `BOARD`/`cellPx` instead of literals) and `npm run typecheck`.
- [ ] **Step 8: Commit** `feat(ui): D3 in-run layout table and live board rect (D3-R9)` + CHANGELOG line.

### Task 2: Dim screen background in the run (R6)

**Files:**
- Modify: `src/game/uiTokens.ts` (`TOKENS.d3.bg.dimRays: 0.5`), `src/game/ui/backgroundSpec.ts`, `src/game/ui/background.ts`, `src/game/scenes/GameScene.ts`
- Test: `tests/game/backgroundSpec.test.ts`

**Interfaces:**
- Produces: `bgSpec(biome, w, h, dim = false)`, `bgKey(biome, w, h, dim = false)` (suffix `/dim`), `screenBackground(scene, biome, dim = false)`.

- [ ] **Step 1: Failing tests** (append):

```ts
it('D3-R9 R6 dim background halves the ray alpha and has its own key', () => {
  const a = bgSpec(1, 540, 960), d = bgSpec(1, 540, 960, true);
  expect(d.rayColor).not.toBe(a.rayColor);
  expect(d.rayColor).toBe(`rgba(255,255,255,${TOKENS.d3.bg.rayAlpha * TOKENS.d3.bg.dimRays})`);
  expect(bgKey(1, 540, 960, true)).toBe('d3/bg/1/540x960/dim');
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**: add `dimRays: 0.5` to `TOKENS.d3.bg`; `bgSpec(..., dim = false)` uses `b.rayAlpha * (dim ? b.dimRays : 1)`; `bgKey(..., dim = false)` appends `/dim` when dim; `screenBackground(scene, biome, dim = false)` passes it through.
- [ ] **Step 4: GameScene.** Replace both `this.cameras.main.setBackgroundColor(gameBackground(this.palette))` calls with a private `setBackground(biome)` that destroys the previous background image (field `bg?: Phaser.GameObjects.Image`) and calls `this.bg = screenBackground(this, biome, true)`; call it in `create()` with the run's starting biome (from the snapshot or `biome(balance, level)` as the scene already does for the board look) and where the board look is rebuilt on a biome change (line ~96). The image depth is -1000 so the board draws above it. Remove `gameBackground` from `hud/draw.ts` only if nothing else imports it (`boardScene.test.ts` does: update that test to assert the new behaviour or drop its `gameBackground` case).
- [ ] **Step 5: Run** backgroundSpec + boardScene tests, typecheck. **Step 6: Commit** `feat(ui): D3 dim background in the run, per biome (D3-R9)` + CHANGELOG.

### Task 3: HUD top bar (D3-R13)

**Files:**
- Rewrite: `src/game/hud/HudTop.ts`
- Modify: `src/game/scenes/HudScene.ts` (constructor args), `tests/game/hud*.test.ts` that construct HudTop
- Test: existing `hudModel.test.ts`, `hudText.test.ts`, `hudMotion.test.ts` must stay green

**Interfaces:**
- Consumes: `d3HudLayout(d3Height(), dpad)` (Task 1), skin kit (`skinTexture`, `hostOf`, kinds `round`/`chip`/`ribbon`/`bar`), `progressBar`, `chip` from `ui/widgets.ts`, `hudIconKey` (mango, star).
- Produces: `new HudTop(scene, l: D3HudLayout, onPause)`, unchanged public API: `pauseButton`, `apply(view: HudView)`, `point(t)`, `bump(t, k, ms)`, `plantFlag(ms)`, plus `place(l: D3HudLayout)` (no-op for the top bar; kept for symmetry with R4). `point('energyBar')` moves to BottomGroup (Task 4) — HudTop returns its own targets only (`score`, `levelBar`), and HudScene routes `energyBar`.

- [ ] **Step 1: Read** the current `HudTop.ts` fully, `hudMotion.ts` (chip transition, energy cue, title change) and the juice target names in `src/game/juice/types.ts` (`HudTarget`).
- [ ] **Step 2: Rewrite the drawing, keep the behaviour.** Every position comes from `l` via `d3()`:
  - Pause: light `round` skin (rest + lip, pressed face on press, like `roundIconButton`) of `l.pause.w`, the existing two-bar pause glyph in `TOKENS.d3.text`; hit area = the rect (48); feedback via `attachFeedback`/`bindPress` exactly as now; disabled alpha rule kept.
  - Ribbon: `ribbon` skin image `l.ribbon` (`skinTexture(host, 'ribbon', 'ribbon', w, h, 'rest', ui(1))`), level title text in `FONT_TITLE`, size `d3(22)` (put `ribbonFont: 22, ribbonStroke: 4` in `D3_RUN.ribbon`), white fill, stroke `TOKENS.d3.tone.ribbon.line`, centred on the ribbon face; challenge star rule from `hudText.ts` unchanged (text content comes from the view).
  - Score chip: light chip right-aligned at `360 - l.score.right`, height `l.score.h`, star icon (`hudIconKey('star')`, `d3(22)`) + score text `FONT_UI` 900 `d3(17)`; width grows with the text; the existing score count-up ease and `bump` keep working on the text/container.
  - Mango bar: mango icon image at `l.mango.icon`; `progressBar(scene, d3(bar.x), d3(bar.y), d3m(bar.w), d3m(bar.h), TOKENS.d3.tone.mango.face[0])` set from `view.quotaFill`; label `done/total` at `l.mango.label`, white `FONT_UI` 900 `d3(18)` with `setShadow(0, d3(2), TOKENS.d3.inkDeep, 0, false, true)` (numbers in `D3_RUN.mango`: `labelFont: 18, shadowY: 2`). The quota ease and the "last mango" pulse keep their current motion calls on the new objects.
  - Remove: biome subtitle (R5), stats pills, the old chip (moves to Task 4), energy pill (Task 4), `statsRow` use.
- [ ] **Step 3: Static draws once.** Images and skins are created in the constructor; `apply()` only sets text, crop and visibility (no `Graphics.clear()` redraw per frame). Keep the `rowKey`-style change guards.
- [ ] **Step 4: HudScene.** Build the layout with `const l = d3HudLayout(d3Height(), save.settings.dpad)`; pass `l` to `HudTop`. Keep the old `hudLayout(true)` only for the views not yet migrated (SkillButtons, dpad, BannerLayer) until Tasks 4-6.
- [ ] **Step 5: Tests.** Run every `tests/game/hud*.test.ts` and `juicePlayer.test.ts`; fix tests that construct HudTop with the old layout by passing `d3HudLayout(640, false)`; do not delete behaviour tests. Full suite + typecheck.
- [ ] **Step 6: Commit** `feat(ui): D3 HUD top - pause, level ribbon, score chip, mango bar (D3-R13)` + CHANGELOG.

### Task 4: Bottom group - energy bar, hint, checkpoint chip (D3-R9, R2, R3)

**Files:**
- Create: `src/game/hud/BottomGroup.ts`
- Modify: `src/game/hud/hudModel.ts` (chip `short`), `src/game/text.ts` (`'hud.chipShort': 'L{level}'`), `src/game/scenes/HudScene.ts`
- Test: `tests/game/hudModel.test.ts`

**Interfaces:**
- Consumes: `D3HudLayout.energy/hint/chip`, `butterChip(scene, cx, cy, wMock, hMock, text, fontMock, icon?)` from `ui/menuWidgets.ts` (takes 390 mock sizes: pass `d3m(...)`), `progressBar` (energy fill: pass `TOKENS.d3.tone.energy.face[0]`).
- Produces: `class BottomGroup { constructor(scene, l: D3HudLayout); apply(v: HudView): void; place(l: D3HudLayout): void; point(t: 'energyBar'): { x: number; y: number }; bump(...) same signature as HudTop.bump for 'energyBar' }`; `HudView.chip` gains `short: string` (empty for `wait`).

- [ ] **Step 1: Failing test** (`hudModel.test.ts`):

```ts
it('D3-R9 R3 chip has a short L<n> form for ramp and checkpoint, none for wait', () => {
  // build views with the helpers this file already uses for the ramp / checkpoint / wait cases, then:
  // expect(checkpointView.chip).toMatchObject({ kind: 'checkpoint', short: 'L10' });
  // expect(rampView.chip).toMatchObject({ kind: 'ramp', short: `L${startLevel}` });
  // expect(waitView.chip).toMatchObject({ kind: 'wait', short: '' });
});
```

Write it with this file's existing fixture helpers (open the file first; reuse the snapshot builders used by the current chip tests). For `ramp` the short form shows the run's start level; for `checkpoint` the hint level.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** in `hudModel.ts`: add `short` to the chip type and fill it with `t('hud.chipShort', { level })` (`ramp`: `s.startLevel`; `checkpoint`: `hint.level`; `wait`: `''`). Add the string to `text.ts` beside the other `hud.*` keys.
- [ ] **Step 4: BottomGroup.** Energy: bolt icon (`hudIconKey('bolt')`) at `energy.icon`, `progressBar` at `energy.bar` (energy tone), number label at `energy.label` (white, ink shadow, `d3(15)`); keep the energy ease and the orb "energy cue" motion that HudTop used (`energyCue` in `hudMotion.ts`) on the new bar/label. Hint: white text with ink shadow in `l.hint`, visible only when `v.chip?.kind === 'wait'` and `l.hint` exists (R2/R3). Chip: `butterChip` sized to the text (`l.chip.short` → text `v.chip.short`, height `l.chip.h`, right-aligned at `360 - l.chip.right`; else centred at `l.chip.cx`), shown for `ramp`/`checkpoint`; rebuild the chip only when its text changes (keep the `chipTransition` motion from `hudMotion.ts`). `place(l)` moves all three to the new rects (R4).
- [ ] **Step 5: HudScene.** Create `this.bottom = new BottomGroup(this, l)`; call `this.bottom.apply(view)` where `top.apply` is called; route the juice hud adapter: `point: t => t === 'energyBar' ? this.bottom.point(t) : this.top.point(t)`, same for `bump`.
- [ ] **Step 6: Run** hud tests, `juicePlayer.test.ts`, `effectsMot3.test.ts`; full suite; typecheck. **Step 7: Commit** `feat(ui): D3 bottom group - energy bar, steer hint, checkpoint chip (D3-R9)` + CHANGELOG.

### Task 5: Skill buttons on D3 skins (D3-R14, R21, R23, R24, R1)

**Files:**
- Rewrite: `src/game/hud/SkillButtons.ts`
- Modify: `src/game/uiTokens.ts` only if a needed colour token is missing (gauge track), `src/game/scenes/HudScene.ts`
- Test: `tests/game/gaugeGeometry.test.ts` (unchanged), new cases in `tests/game/hudViews.test.ts` or a new `tests/game/skillButtonsModel.test.ts` for the pure part below

**Interfaces:**
- Consumes: `D3HudLayout.skills`, skin kind `skill` with tones `skillA`/`skillB`/`off`, `tapBurst(scene, x, y, tone)`, `denied(scene, visual, badge?)` from `ui/touchFx.ts`, `drawIcon(g, 'lock', size, color)` from `ui/icons.ts`, `chargeSegment` from `hud/gaugeGeometry.ts`.
- Produces: `new SkillButtons(scene, l: D3HudLayout, onUse, balance)`; public `apply(skills)`, `point(slot)`, `shake(slot)` (now calls `denied` with the cost badge), `cast(slot)` (calls `tapBurst` at the button centre with the slot tone), `place(l)`; pure `skillLook(view: SkillView | null, slot: 0 | 1): { tone: 'skillA' | 'skillB' | 'off'; locked: boolean; badgeNo: boolean }` exported from `SkillButtons.ts` or a new `hud/skillLook.ts`.

- [ ] **Step 1: Failing test** for `skillLook`:

```ts
import { expect, it } from 'vitest';
import { skillLook } from '../../src/game/hud/skillLook';
const v = (state: 'off' | 'ready' | 'active', slot: 0 | 1 = 0) => ({ slot, id: 'shield' as const, cost: 50, state, ring: null, charge: 0.5 });
it('D3-R14 R1 tone by slot; off when unaffordable; locked when empty', () => {
  expect(skillLook(v('ready', 0), 0)).toEqual({ tone: 'skillA', locked: false, badgeNo: false });
  expect(skillLook(v('ready', 1), 1)).toEqual({ tone: 'skillB', locked: false, badgeNo: false });
  expect(skillLook(v('off', 1), 1)).toEqual({ tone: 'off', locked: false, badgeNo: true });
  expect(skillLook(v('active', 0), 0)).toEqual({ tone: 'skillA', locked: false, badgeNo: false });
  expect(skillLook(null, 1)).toEqual({ tone: 'off', locked: true, badgeNo: false });
});
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `src/game/hud/skillLook.ts`:

```ts
import type { SkillView } from './hudModel';
// D3-R14 / R1: slot A purple, slot B orange, `off` when not affordable (badge in danger colour) or locked (no skill in the slot).
export function skillLook(v: SkillView | null, slot: 0 | 1): { tone: 'skillA' | 'skillB' | 'off'; locked: boolean; badgeNo: boolean } {
  if (!v) return { tone: 'off', locked: true, badgeNo: false };
  if (v.state === 'off') return { tone: 'off', locked: false, badgeNo: true };
  return { tone: slot === 0 ? 'skillA' : 'skillB', locked: false, badgeNo: false };
}
```

- [ ] **Step 4: Rewrite the view** (read the current file first; keep its behaviours: pointer-down cast via `onUse` with `stopPropagation`, ready pop / dip edges from `skillReadyEdge`, eased charge, active countdown ring):
  - Face: `skill` skin image (lip + rest/pressed textures, size `d3(78)`), tone from `skillLook`; pressed texture while the pointer is down (D3-R22).
  - Icon: `hudIconKey(id, 'ink'|'off'|'active')` white on coloured faces — if the HUD icon tones have no white, add an `'on'` tone to `hudIcons.ts` (`TOKENS.d3.white`) and use it for `skillA`/`skillB`; locked shows `drawIcon(g, 'lock', d3(34), toInt(TOKENS.d3.tone.off.text))`.
  - Gauge: the R12 charge as an arc on the rim (`TOKENS.d3.tone.energy.face[1]`, width `d3(5)`), not a tank fill; active ring as today but in white.
  - Cost badge: white rounded rect, ink border `d3(3)`, `d3(13)` 900 text, bottom-right of the button (`right -4`, `bottom -6` board px, `min w 30`, `h 24`: put these in `D3_RUN.skill.badge`); `badgeNo` → danger face/line colours.
  - `shake(slot)` → `denied(scene, faceContainer, badgeImageOrText)`; locked tap → `onUse` is NOT called; call `denied` and let HudScene play the existing nope sound (add `onDenied?(slot)` callback, or route through `onUse` returning false — pick one, document it in the report).
  - `cast(slot)` → `tapBurst(scene, cx, cy, tone)`; HudScene calls it when `useSkill` succeeds (where it currently plays the cast sound).
  - `place(l)` moves both buttons (R4).
  - Redraw only on state/charge-step change (keep the key guard); no per-frame redraw.
- [ ] **Step 5: HudScene**: pass `l`; call `skills.cast(slot)` on a successful cast; locked/unaffordable path keeps the nope sound + haptic.
- [ ] **Step 6: Run** skill/hud/juice tests, full suite, typecheck. **Step 7: Commit** `feat(ui): D3 skill buttons - skins, rim gauge, cost badge, locked slots (D3-R14)` + CHANGELOG.

### Task 6: D-pad placement and relayout on settings (D3-R9, R4)

**Files:**
- Modify: `src/game/input/dpad.ts`, `src/game/scenes/HudScene.ts`
- Test: `tests/game/dpad.test.ts`, `tests/game/dpadStyle.test.ts`

**Interfaces:**
- Consumes: `D3HudLayout.dpad` (key rects, board px), `d3HudLayout(d3Height(), dpad)`.
- Produces: `createDpad(scene, keys: { up: R; left: R; right: R; down: R } (canvas px), onTurn)` returning `{ setHeading, setVisible, place(keys) }`.

- [ ] **Step 1:** Change `createDpad` to take the four key rects (convert board px with `d3()` in HudScene) instead of `{x, y, btn, step}`; buttons centred in their rects; radius = rect width / 2; keep `dpadStyle` states, chevrons, pointer-down turn, press scale. Face: light `round` skin texture (rest/lip) instead of `Graphics` circles; the heading glow and blocked alpha from `dpadStyle` stay (glow ring stays a Graphics stroke drawn once per state change). Add `place(keys)` that moves the four containers. Update `dpad.test.ts` to the new signature (same behaviour assertions).
- [ ] **Step 2: HudScene relayout (R4).** Keep the current `dpad` setting in a field. Always create the D-pad with the D-pad-mode rects (`d3HudLayout(hm, true).dpad`), visibility from the setting. In `applySettings()`, when `s.dpad` differs from the field: `const l = d3HudLayout(d3Height(), s.dpad); this.skills.place(l); this.bottom.place(l); this.top.place(l);` and update the field. `BannerLayer` keeps its own rects (board strip).
- [ ] **Step 3:** Run dpad/hud tests, full suite, typecheck. **Step 4: Commit** `feat(ui): D3 D-pad placement and live relayout on the D-pad setting (D3-R9)` + CHANGELOG.

### Task 7: Remove the D2 HUD layout; banners and tips on the new rects

**Files:**
- Modify: `src/game/hud/hudLayout.ts` (delete `HUD_MOCK`, `hudLayout`, `statsRow`, `Circle`/`SkillRect`/`HudLayout`; keep `STRIP_MOCK`, `bannerStripRect`, `stripRows`), `skillTipPlacement` now takes `D3HudLayout` and returns canvas px from `l.skills[slot]` (`d3()`), `src/game/hud/BannerLayer.ts`, `src/game/scenes/HudScene.ts` (debug buttons placement), `tests/game/hudLayout.test.ts`
- Test: `tests/game/hudLayout.test.ts`, `tests/game/hudBanners.test.ts`

- [ ] **Step 1:** Grep `HUD_MOCK|hudLayout\(|statsRow|HudLayout\b` in src and tests; migrate each remaining user to `D3HudLayout` (canvas px via `d3()`); `skillTipPlacement(l, slot, w, h, m)` keeps its clamp rule (never covers the board: `y >= BOARD.y + BOARD.size`) and uses `d3(l.skills[slot].x + l.skills[slot].w / 2)` / `d3(l.skills[slot].y)` for the anchor and group top.
- [ ] **Step 2:** Update `hudLayout.test.ts`: drop tests of deleted functions; keep/adjust the strip and tip tests (UIFIX-R1/R2 rules unchanged). Debug "+1"/"Key" buttons in HudScene: place them in the top-right under the score chip using `l.score` (debug only).
- [ ] **Step 3:** Full suite, typecheck. **Step 4: Commit** `refactor(ui): drop the D2 HUD layout; banners and tips on D3 rects` + CHANGELOG.

### Task 8: Screenshot pass, docs, merge

- [ ] **Step 1:** Full suite + typecheck (sequential).
- [ ] **Step 2: Lead captures** with `tools/qa/shot.mjs` (dev server; tap PLAY, wait for the countdown) at 360x640, 390x844, 412x915: in-run D-pad off; with `?debug=1&level=3` (two skills unlocked: check purple/orange buttons, cost badges, gauge); `?debug=1&level=1` (locked slots); D-pad on (set via Settings or a seeded save). Compare with `png/Game-360.png`, `Game-390.png`, `GameDpad-360.png`, `GameLocked-*.png`. Defects → fix task (Claude subagent) → recapture.
- [ ] **Step 3: Docs:** CODEMAP rows (`d3HudLayout.ts`, `BottomGroup.ts`, `skillLook.ts`, live `BOARD`), UI-MOCKUPS Game rows "U4a (built)", PLAYTEST entry, STATUS (rulings R1..R6 for the owner batch; owner eye-check: skill button feel, D-pad toggle mid-run).
- [ ] **Step 4: Final review** (Opus) over the branch; one fix wave; merge `--no-ff` into `version/v0.3`; full suite + typecheck after merge; GitNexus refresh in the background.
