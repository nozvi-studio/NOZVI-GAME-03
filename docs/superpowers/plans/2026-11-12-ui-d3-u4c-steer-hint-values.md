# UI D3 U4c — Steer Feedback, First-Input Hint, Value Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the in-run interaction feedback of D3-R25..R28: swipe trail + accepted-turn chevron, the touch first-input finger hint, and value-change cues (bar leading edge, skill-ready gloss sweep, mango bar full flash).

**Architecture:** Every rule is a pure function in a `*Model.ts` file (no Phaser, unit tested); thin Phaser views only draw what the models return. "Accepted" comes from the sim: `Session.turn` returns the `queueTurn` boolean and `GameScene` emits one `steer` event per accepted turn. All numbers live in `balance.motion.d3`.

**Tech Stack:** TypeScript strict, Phaser 3, Vitest (`npx vitest run --configLoader native --pool threads --maxWorkers 2 <path>` on Windows).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §7b (D3-R25..R28), roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` U4 items 8-11.

## Global Constraints
- Repository text in English; requirement IDs (`D3-R25`..`D3-R28`) in test names and a one-line comment at each main implementing function.
- No magic numbers: tuning lives in `config/balance.json` `motion.d3` (existing keys: `trailMs 120`, `trailPx 6`, `trailAlpha 0.5`, `chevronMs 160`, `edgePx 4`, `edgeAlpha 0.6`, `sweepMs 1100`, `sweepBand 0.18`, `sweepAlpha 0.45`, `ringFadeMs 120`). New keys are added to `MotionD3Balance` and the validator table in `src/core/balance.ts:284`.
- D3-R28 reduced motion (`reduceMotion()` from `src/game/render/palette.ts`): no trail, no finger loop (static glyph), no gloss sweep; chevron shows without the pop; flash and edge still show (colour changes, not motion).
- Limits (spec §7b): trail and chevron graphics are pooled / created once; no per-frame redraw of static UI; a graphics object is only redrawn while its effect is live.
- Gameplay timing is untouched: `session.turn` keeps its side effects and order; the only change is the return value.
- Branch `feat/u4c-steer-hint-values` from `version/v0.3`; merge back with `git merge --no-ff` after full `npm test` + `npm run typecheck`.
- Each commit adds one line under `## [Unreleased]` in `CHANGELOG.md`.

## Rulings (lead, technical/visual; listed for the owner batch)
- **C1** "Accepted" = `queueTurn` returned true. A turn during the countdown that the sim refuses (sim not `playing`) shows no chevron; the first input that starts movement in `waiting` does show one when the sim accepts it.
- **C2** The trail is drawn in game (canvas) coordinates from `pointer.x/y`, above the board and below the HUD scene, only for a pointer that started on the board (the existing swipe pointer).
- **C3** D-pad mode hides the finger hint, like the hint text (no hint slot); the D-pad keys are the affordance.
- **C4** The finger glyph is drawn with Graphics (circle tip + rounded body), not a new icon asset; U6 can replace it when the icon set is redrawn.

## File Structure
- Modify `src/session/session.ts` — `turn()` returns `boolean`.
- Modify `src/game/scenes/GameScene.ts` — emit `steer` on accepted turns; own the `SteerFx` view; feed trail points.
- Modify `src/game/input/swipe.ts` — report pointer points to the scene (`scene.trailPoint(x, y, t)`) while the swipe pointer is down.
- Create `src/game/render/steerFxModel.ts` — pure: trail buffer pruning, trail segment alpha, chevron pose.
- Create `src/game/render/steerFx.ts` — Phaser: one trail Graphics + one chevron Graphics.
- Create `src/game/hud/fingerHintModel.ts` — pure: finger pose at time t (loop or static).
- Modify `src/game/hud/BottomGroup.ts` — finger glyph beside the hint text.
- Create `src/game/ui/barEdgeModel.ts` — pure: leading-edge alpha, full-flash alpha.
- Modify `src/game/ui/widgets.ts` — `progressBar` gains `edge(now)` / `flash()` support.
- Modify `src/game/hud/HudTop.ts`, `src/game/hud/SkillButtons.ts` — edge, full flash, ready sweep.
- Modify `src/core/balance.ts`, `config/balance.json` — new `motion.d3` keys.
- Tests: `tests/session/sessionTurn.test.ts` (or the existing session test file found by `grep -l "turns" tests/session`), `tests/game/steerFxModel.test.ts`, `tests/game/fingerHintModel.test.ts`, `tests/game/barEdgeModel.test.ts`.
- Docs: `docs/CODEMAP.md` (new files), `CHANGELOG.md`, `docs/DECISIONS.md` (C1..C4), `docs/PLAYTEST.md` (screenshot pass), `docs/STATUS.md`.

---

### Task 1: Accepted-turn signal (D3-R25)

**Files:**
- Modify: `src/session/session.ts:30` (interface) and `:178` (impl)
- Modify: `src/game/scenes/GameScene.ts:129-138` (`turn`)
- Test: the session test file that covers `turns` (`grep -ln "turns" tests/session`), add a new `describe`.

**Interfaces:**
- Produces: `Session.turn(dx, dy): boolean` (true only when the sim queued the turn). `GameScene` emits `this.events.emit('steer', { dx, dy })` once per accepted turn (type `{ dx: Step; dy: Step }`).

- [ ] **Step 1: Write the failing test**

```ts
describe('D3-R25 session.turn reports acceptance', () => {
  it('D3-R25 returns true for a queued turn and false for a reverse or repeat', () => {
    const s = makeSession();            // use the factory the file already uses
    s.startRun(/* same args as the existing tests */);
    // start dir is balance.snake.startDir; pick a perpendicular step
    const [sx, sy] = balance.snake.startDir;
    const perp: [-1 | 0 | 1, -1 | 0 | 1] = sx !== 0 ? [0, 1] : [1, 0];
    expect(s.turn(perp[0], perp[1])).toBe(true);
    expect(s.turn(perp[0], perp[1])).toBe(false);           // same as last queued
    expect(s.turn(-perp[0] as -1 | 0 | 1, -perp[1] as -1 | 0 | 1)).toBe(false); // reverse of last queued
  });
  it('D3-R25 returns false with no run', () => {
    expect(makeSession().turn(0, 1)).toBe(false);
  });
});
```

Adapt `makeSession` / `startRun` to the helpers already in that file (read its first 40 lines). If the sim is not `playing` right after `startRun` in tests, advance it with the same helper the file uses before turning.

- [ ] **Step 2: Run it, expect FAIL** (`turn` returns `undefined`).

Run: `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/session -t "D3-R25"`

- [ ] **Step 3: Implement**

`src/session/session.ts` interface:
```ts
  /** MEC-003-R19 counts accepted turns; D3-R25 returns whether the sim queued it. */
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): boolean;
```
impl:
```ts
    turn(dx, dy) { // MEC-003-R19 turns, D3-R25 accepted flag
      if (!run || run.over || !run.sim.turn(dx, dy)) return false;
      run.turns++; return true;
    },
```
`GameScene.turn`:
```ts
    if (result.forward) {
      const s = this.snapshot(); // MOT-3-R12 render-only cue; session.turn timing is untouched
      if (s && isTurn(s.dir, dx, dy)) this.events.emit('derived-juice', { type: 'turned', dx, dy } satisfies JuiceInput);
      if (this.session.turn(dx, dy)) this.events.emit('steer', { dx, dy }); // D3-R25 accepted turns only
    }
```
Check `sim.turn` type in `src/core/sim.ts:138` already returns boolean (`queueTurn`); if the `Sim` interface types it `void`, change it to `boolean`.

- [ ] **Step 4: Run the test + `npm run typecheck`, expect PASS.** Fix any other caller/mocks of `Session.turn` the typecheck reports (test doubles returning void).

- [ ] **Step 5: Commit** — `feat(session): D3-R25 turn() reports acceptance` (+ CHANGELOG line).

---

### Task 2: Steer feedback model (pure, D3-R25/R28)

**Files:**
- Create: `src/game/render/steerFxModel.ts`
- Test: `tests/game/steerFxModel.test.ts`

**Interfaces:**
- Produces:
  - `interface TrailPt { x: number; y: number; t: number }`
  - `pushTrail(buf: TrailPt[], p: TrailPt, trailMs: number): void` — appends, then drops points older than `p.t - trailMs` (keeps at most one older point as the segment start). In-place, no allocation beyond the pushed point.
  - `pruneTrail(buf: TrailPt[], now: number, trailMs: number): void` — drops points with `t < now - trailMs`.
  - `segAlpha(t: number, now: number, c: Pick<MotionD3Balance,'trailMs'|'trailAlpha'>): number` — `trailAlpha * (1 - age/trailMs)`, clamped to 0..trailAlpha.
  - `chevronPose(elapsed: number, reduced: boolean, c: Pick<MotionD3Balance,'chevronMs'>, overshoot: number): { scale: number; alpha: number } | null` — null when `elapsed >= chevronMs`; reduced: scale 1, alpha `1 - u`; else scale from `backOut`-style pop (use `popScale` / existing curve from `src/game/motion/curves.ts`; pick the one `mangoGrow` uses) for the first half, alpha 1 then fading over the second half.
  - `trailOn(reduced: boolean): boolean` — `!reduced`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { chevronPose, pruneTrail, pushTrail, segAlpha, trailOn, type TrailPt } from '../../src/game/render/steerFxModel';
const c = { trailMs: 120, trailAlpha: 0.5, chevronMs: 160 };

describe('D3-R25 steer trail', () => {
  it('D3-R25 keeps only the last trailMs of the path', () => {
    const buf: TrailPt[] = [];
    for (let t = 0; t <= 300; t += 20) pushTrail(buf, { x: t, y: 0, t }, c.trailMs);
    expect(buf[buf.length - 1]!.t).toBe(300);
    expect(buf.filter(p => p.t < 300 - c.trailMs).length).toBeLessThanOrEqual(1);
  });
  it('D3-R25 prune empties the buffer once the finger stops', () => {
    const buf: TrailPt[] = [{ x: 0, y: 0, t: 0 }, { x: 5, y: 0, t: 10 }];
    pruneTrail(buf, 500, c.trailMs);
    expect(buf).toHaveLength(0);
  });
  it('D3-R25 segment alpha fades from trailAlpha to 0 with age', () => {
    expect(segAlpha(100, 100, c)).toBeCloseTo(0.5);
    expect(segAlpha(40, 100, c)).toBeCloseTo(0.25);
    expect(segAlpha(0, 200, c)).toBe(0);
  });
});

describe('D3-R25/R28 chevron', () => {
  it('D3-R25 lives chevronMs then disappears', () => {
    expect(chevronPose(0, false, c, 1.2)).not.toBeNull();
    expect(chevronPose(160, false, c, 1.2)).toBeNull();
  });
  it('D3-R25 pops above scale 1 early in its life', () => {
    const peak = Math.max(...[10, 20, 30, 40, 50, 60].map(e => chevronPose(e, false, c, 1.2)!.scale));
    expect(peak).toBeGreaterThan(1);
  });
  it('D3-R28 reduced motion: no pop, alpha fade only', () => {
    for (const e of [0, 40, 80, 120]) expect(chevronPose(e, true, c, 1.2)!.scale).toBe(1);
    expect(chevronPose(120, true, c, 1.2)!.alpha).toBeLessThan(chevronPose(0, true, c, 1.2)!.alpha);
  });
  it('D3-R28 reduced motion has no trail', () => {
    expect(trailOn(true)).toBe(false); expect(trailOn(false)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (module missing). `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/steerFxModel.test.ts`

- [ ] **Step 3: Implement**

```ts
// D3-R25/R28 pure steer feedback: trail buffer, segment alpha, chevron pose. No Phaser.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export interface TrailPt { x: number; y: number; t: number }

/** D3-R25 drop points older than the window, keeping one older point as the first segment start. */
export function pruneTrail(buf: TrailPt[], now: number, trailMs: number, keepAnchor = false): void {
  let i = 0;
  while (i < buf.length && buf[i]!.t < now - trailMs) i++;
  if (keepAnchor && i > 0 && i < buf.length) i--;
  if (i > 0) buf.splice(0, i);
}
/** D3-R25 append one finger point and keep the last trailMs of the path. */
export function pushTrail(buf: TrailPt[], p: TrailPt, trailMs: number): void {
  buf.push(p); pruneTrail(buf, p.t, trailMs, true);
}
/** D3-R25 alpha of a trail point by age: trailAlpha at the finger, 0 at trailMs. */
export const segAlpha = (t: number, now: number, c: Pick<MotionD3Balance, 'trailMs' | 'trailAlpha'>): number =>
  c.trailAlpha * clamp01(1 - (now - t) / c.trailMs);
/** D3-R28 no trail under reduced motion. */
export const trailOn = (reduced: boolean): boolean => !reduced;
/** D3-R25/R28 chevron at the head: pop to `overshoot` in the first half, fade in the second; reduced = fade only. */
export function chevronPose(elapsed: number, reduced: boolean, c: Pick<MotionD3Balance, 'chevronMs'>, overshoot: number):
  { scale: number; alpha: number } | null {
  if (elapsed >= c.chevronMs) return null;
  const u = clamp01(elapsed / c.chevronMs);
  if (reduced) return { scale: 1, alpha: 1 - u };
  const half = u < 0.5;
  const scale = half ? lerp(0.6, overshoot, cubicOut(u * 2)) : lerp(overshoot, 1, (u - 0.5) * 2);
  return { scale, alpha: half ? 1 : 1 - (u - 0.5) * 2 };
}
```
Overshoot argument = `balance.motion.overshoot` (existing token). If `clamp01/cubicOut/lerp` are not all exported from `src/game/motion/curves.ts`, use the ones `interactionModel.ts` imports (it imports these three from there).

- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(render): D3-R25 steer feedback model` (+ CHANGELOG).

---

### Task 3: Steer feedback view (D3-R25/R28)

**Files:**
- Create: `src/game/render/steerFx.ts`
- Modify: `src/game/input/swipe.ts` (feed points), `src/game/scenes/GameScene.ts` (own the view)
- Test: `tests/game/swipe.test.ts` (extend: the scene double receives trail points)

**Interfaces:**
- Consumes: Task 1 `'steer'` event; Task 2 functions.
- Produces: `class SteerFx { constructor(scene: Phaser.Scene, board: Phaser.GameObjects.Container, cell: number, cfg: MotionD3Balance, overshoot: number, reduced: boolean); point(x: number, y: number, now: number): void; endTrail(): void; chevron(dx: Step, dy: Step, now: number): void; setReduced(r: boolean): void; update(now: number, headCanvas: { x: number; y: number } | null): void; reset(): void }`. `GameScene.trailPoint(x: number, y: number): void` and `GameScene.trailEnd(): void` (called by swipe).

- [ ] **Step 1: Extend the swipe test (failing)**

Read `tests/game/swipe.test.ts` for its scene double. Add `trailPoint = vi.fn()` and `trailEnd = vi.fn()` to the double, then:
```ts
it('D3-R25 a board swipe reports every move point and ends the trail on release', () => {
  // use the file's helpers to press on the board zone, move twice, release
  expect(scene.trailPoint).toHaveBeenCalledTimes(2);
  expect(scene.trailEnd).toHaveBeenCalledTimes(1);
});
it('D3-R25 moves without a board press report nothing', () => {
  // move only
  expect(scene.trailPoint).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement**

`swipe.ts` — in `move`, right after the `pointer.id !== pointerId` guard and before the threshold logic: `scene.trailPoint(pointer.x, pointer.y);`. In `clear`: call `scene.trailEnd()` only when a pointer was active (`if (pointerId !== null) scene.trailEnd();` before resetting).

`steerFx.ts`:
```ts
import Phaser from 'phaser';
import type { MotionD3Balance } from '../../core/balance';
import type { Step } from '../../core';
import { TOKENS, toInt } from '../uiTokens';
import { chevronPose, pruneTrail, pushTrail, segAlpha, trailOn, type TrailPt } from './steerFxModel';

// D3-R25/R28 swipe trail (canvas space, above the board) + chevron at the head (board space). Two Graphics, created once.
export class SteerFx {
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly chev: Phaser.GameObjects.Graphics;
  private readonly buf: TrailPt[] = [];
  private chevAt = -1; private dir = { x: 0, y: 0 };
  constructor(private readonly scene: Phaser.Scene, board: Phaser.GameObjects.Container, private readonly cell: number,
    private readonly c: MotionD3Balance, private readonly overshoot: number, private reduced: boolean) {
    this.trail = scene.add.graphics().setName('steer-trail').setDepth(10);
    this.chev = scene.add.graphics().setName('steer-chevron'); board.add(this.chev);
  }
  setReduced(r: boolean): void { this.reduced = r; if (r) { this.buf.length = 0; this.trail.clear(); } }
  point(x: number, y: number, now: number): void { if (trailOn(this.reduced)) pushTrail(this.buf, { x, y, t: now }, this.c.trailMs); }
  endTrail(): void { /* points age out in update(); nothing to do */ }
  chevron(dx: Step, dy: Step, now: number): void { this.dir = { x: dx, y: dy }; this.chevAt = now; }
  reset(): void { this.buf.length = 0; this.chevAt = -1; this.trail.clear(); this.chev.clear(); }
  /** headBoard = head centre in board px (cell * (x + 0.5)), or null when there is no snake. */
  update(now: number, headBoard: { x: number; y: number } | null): void {
    if (this.buf.length) {                     // redraw only while live
      pruneTrail(this.buf, now, this.c.trailMs);
      this.trail.clear();
      for (let i = 1; i < this.buf.length; i++) {
        const a = this.buf[i - 1]!, b = this.buf[i]!;
        this.trail.lineStyle(this.c.trailPx, toInt(TOKENS.d3.white), segAlpha(b.t, now, this.c)).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
    if (this.chevAt < 0) return;
    const pose = chevronPose(now - this.chevAt, this.reduced, this.c, this.overshoot);
    this.chev.clear();
    if (!pose || !headBoard) { if (!pose) this.chevAt = -1; return; }
    const d = this.dir, p = { x: -d.y, y: d.x }, k = this.cell * 0.32 * pose.scale;
    const ox = headBoard.x + d.x * this.cell * 0.9, oy = headBoard.y + d.y * this.cell * 0.9;   // just ahead of the face
    this.chev.lineStyle(Math.max(2, this.cell * 0.14), toInt(TOKENS.d3.white), pose.alpha).beginPath()
      .moveTo(ox + (-d.x + p.x) * k, oy + (-d.y + p.y) * k).lineTo(ox + d.x * k * 0.6, oy + d.y * k * 0.6)
      .lineTo(ox + (-d.x - p.x) * k, oy + (-d.y - p.y) * k).strokePath();
  }
}
```
The chevron offset/size factors (0.9, 0.32, 0.14, 0.6) are drawing proportions; move them to a `const CHEV = { ahead: 0.9, half: 0.32, stroke: 0.14, tip: 0.6, minStroke: 2 } as const;` at the top of the file (same convention as `M` in `dpad.ts`). If `TOKENS.d3.white` is a string, `toInt` converts it (as used in `HomeScene.makeSweep`).

`GameScene.ts`:
- field `private steer!: SteerFx;`
- in `create()` after `this.effects = ...`: `this.steer = new SteerFx(this, this.board, cellPx(this.balance), this.balance.motion.d3, this.balance.motion.overshoot, this.reduced);` and `this.events.on('steer', (d: { dx: Step; dy: Step }) => this.steer.chevron(d.dx, d.dy, this.time.now));` (remove in SHUTDOWN with `this.events.off('steer')`).
- methods: `trailPoint(x: number, y: number): void { if (this.flow.status === 'playing' || this.flow.status === 'waiting' || this.flow.status === 'countdown') this.steer.point(x, y, this.time.now); }` and `trailEnd(): void { this.steer.endTrail(); }`.
- `recolor`: add `this.steer.setReduced(this.reduced);`. `startRun`: add `this.steer.reset();`.
- end of `draw()`: `const h = snapshot.snake[0]; this.steer.update(time, h ? { x: (h.x + 0.5) * cell, y: (h.y + 0.5) * cell } : null);` (check the snapshot field name for the snake array with `grep -n "snake:" src/core/types.ts`).
- Keyboard and D-pad need no change: they call `GameScene.turn`, which emits `steer`; they do not feed trail points (D3-R25 "chevron only").

- [ ] **Step 4: Run swipe + steerFxModel tests and `npm run typecheck`; expect PASS.**
- [ ] **Step 5: Browser check.** `npm run dev`, open `/?debug=1`, start a run: swipe on the board → white fading trail; each accepted turn → chevron ahead of the face; a reverse swipe → no chevron. With OS reduced motion on → no trail, chevron fades without pop. Capture with `node tools/qa/shot.mjs` into `tmp/qa/u4c/` (see that tool's header for args).
- [ ] **Step 6: Commit** — `feat(game): D3-R25 swipe trail and accepted-turn chevron` (+ CHANGELOG, CODEMAP entries for `render/steerFxModel.ts`, `render/steerFx.ts`).

---

### Task 4: First-input finger hint (D3-R26/R28)

**Files:**
- Create: `src/game/hud/fingerHintModel.ts`
- Modify: `src/game/hud/BottomGroup.ts`, `src/game/scenes/HudScene.ts` (pass `touch` + `reduced`, call `tick(now)`), `src/core/balance.ts`, `config/balance.json`
- Test: `tests/game/fingerHintModel.test.ts`; `tests` for balance validation pick up the new keys automatically (run `-t balance`).

**Interfaces:**
- New balance keys in `motion.d3`: `"hintLoopMs": 1400, "hintTravelPx": 44` (validator: `hintLoopMs: 'int+', hintTravelPx: 'num+'`).
- Produces: `fingerPose(t: number, reduced: boolean, c: Pick<MotionD3Balance,'hintLoopMs'|'hintTravelPx'>): { dx: number; alpha: number; press: boolean }` and `fingerShown(touch: boolean, hasHintSlot: boolean, waiting: boolean): boolean`.
- `BottomGroup.setTouch(touch: boolean, reduced: boolean): void`, `BottomGroup.tick(now: number): void`.

Loop shape over one `hintLoopMs` period: 0-15% fade in at dx 0 (press false), 15-25% press (press true), 25-70% travel dx 0 → hintTravelPx with cubicOut (press true), 70-85% release + fade out, 85-100% hidden (alpha 0). Reduced: `{ dx: 0, alpha: 1, press: false }` always.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { fingerPose, fingerShown } from '../../src/game/hud/fingerHintModel';
const c = { hintLoopMs: 1000, hintTravelPx: 40 };
describe('D3-R26 finger hint', () => {
  it('D3-R26 travels from 0 to hintTravelPx and loops', () => {
    expect(fingerPose(0, false, c).dx).toBe(0);
    expect(fingerPose(700, false, c).dx).toBeCloseTo(40);
    expect(fingerPose(1000, false, c).dx).toBe(fingerPose(0, false, c).dx);
  });
  it('D3-R26 is pressed while travelling and hidden at the end of the loop', () => {
    expect(fingerPose(400, false, c).press).toBe(true);
    expect(fingerPose(950, false, c).alpha).toBe(0);
  });
  it('D3-R26 touch only, with a hint slot, while waiting', () => {
    expect(fingerShown(true, true, true)).toBe(true);
    expect(fingerShown(false, true, true)).toBe(false);
    expect(fingerShown(true, false, true)).toBe(false);   // C3 D-pad mode
    expect(fingerShown(true, true, false)).toBe(false);
  });
  it('D3-R28 reduced motion shows a static glyph', () => {
    for (const t of [0, 300, 700, 950]) expect(fingerPose(t, true, c)).toEqual({ dx: 0, alpha: 1, press: false });
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the model:

```ts
// D3-R26/R28 pure first-input finger hint: pose in a looping swipe, static under reduced motion.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut } from '../motion/curves';
const PH = { inEnd: 0.15, pressEnd: 0.25, travelEnd: 0.7, outEnd: 0.85 } as const;   // loop phase fractions

export function fingerPose(t: number, reduced: boolean, c: Pick<MotionD3Balance, 'hintLoopMs' | 'hintTravelPx'>):
  { dx: number; alpha: number; press: boolean } {
  if (reduced) return { dx: 0, alpha: 1, press: false };
  const u = (((t % c.hintLoopMs) + c.hintLoopMs) % c.hintLoopMs) / c.hintLoopMs;
  if (u < PH.inEnd) return { dx: 0, alpha: u / PH.inEnd, press: false };
  if (u < PH.pressEnd) return { dx: 0, alpha: 1, press: true };
  if (u < PH.travelEnd) return { dx: c.hintTravelPx * cubicOut(clamp01((u - PH.pressEnd) / (PH.travelEnd - PH.pressEnd))), alpha: 1, press: true };
  if (u < PH.outEnd) return { dx: c.hintTravelPx, alpha: 1 - (u - PH.travelEnd) / (PH.outEnd - PH.travelEnd), press: false };
  return { dx: c.hintTravelPx, alpha: 0, press: false };
}
/** D3-R26 C3: touch devices, only where the hint text has a slot, only while the run waits. */
export const fingerShown = (touch: boolean, hasHintSlot: boolean, waiting: boolean): boolean => touch && hasHintSlot && waiting;
```
Note test `fingerPose(700)` sits on the boundary `travelEnd`; `u = 0.7` enters the `outEnd` branch where dx = hintTravelPx — passes. Test `fingerPose(1000).dx === fingerPose(0).dx` is 0 = 0.

Add the two keys to `MotionD3Balance`, the validator table (`src/core/balance.ts:284`) and `config/balance.json` `motion.d3`.

`BottomGroup`: add fields `private finger: Phaser.GameObjects.Graphics; private touch = false; private reduced = false; private fingerOn = false;`. Build the glyph once in the constructor (Graphics, C4): white circle tip radius `d3(7)` with `T.inkDeep` 2-px outline, rounded rect body `d3(12) x d3(18)` below it; name `'first-input-finger'`, hidden. Place it left of the hint text: `x = hint.x - d3(FINGER.gap) - hintTextWidth/2`, same y + `d3(FINGER.dy)`; keep `FINGER = { tip: 7, bodyW: 12, bodyH: 18, gap: 18, dy: 6, pressScale: 0.88 } as const` beside `D3_RUN` usage. In `syncHint`, set `this.fingerOn = fingerShown(this.touch, !!this.l.hint, show)` and `finger.setVisible(this.fingerOn)`. `tick(now)`: if `!this.fingerOn` return; `const p = fingerPose(now, this.reduced, cfg.d3)`; `finger.setPosition(baseX + d3(p.dx), baseY).setAlpha(p.alpha).setScale(p.press ? FINGER.pressScale : 1)`. Store `baseX/baseY` in `placeHint()`.
`HudScene`: after creating BottomGroup call `bottom.setTouch(this.touch, reduceMotion())`; on `settings-closed` call it again; in `update(time)` call `bottom.tick(time)` (find the existing per-frame `update`; if HudScene has none, add `update(time: number): void { this.bottom?.tick(time); }`).

- [ ] **Step 4: Run model + balance tests + typecheck; expect PASS.**
- [ ] **Step 5: Browser check** with touch emulation (shot.mjs mobile mode or DevTools device mode): finger loops beside "Swipe to steer!" until the first accepted swipe, then disappears; desktop mouse → text only; D-pad on → no finger.
- [ ] **Step 6: Commit** — `feat(hud): D3-R26 first-input finger hint` (+ CHANGELOG, CODEMAP).

---

### Task 5: Value changes — bar edge, mango full flash, skill-ready sweep (D3-R27/R28)

**Files:**
- Create: `src/game/ui/barEdgeModel.ts`
- Modify: `src/game/ui/widgets.ts` (`progressBar`), `src/game/hud/HudTop.ts`, `src/game/hud/BottomGroup.ts`, `src/game/hud/SkillButtons.ts`, `src/core/balance.ts`, `config/balance.json`
- Test: `tests/game/barEdgeModel.test.ts`

**Interfaces:**
- New balance key `motion.d3.flashMs: 260` (validator `'int+'`).
- Produces:
  - `edgeAlpha(msSinceMove: number, c: Pick<MotionD3Balance,'edgeAlpha'>, fadeMs: number): number` — `edgeAlpha` at 0, linear to 0 at `fadeMs` (use `motion.fadeMs`), 0 after.
  - `flashAlpha(elapsed: number, flashMs: number): number` — 1 → 0 linear over `flashMs`, 0 after.
  - `quotaFilled(prev: number, next: number): boolean` — `prev < 1 && next >= 1`.
  - `readySweep(edge: ReadyEdge, reduced: boolean): boolean` — `edge === 'pop' && !reduced`.
  - `progressBar(...)` return type gains `edge(now: number): void` and `flash(now: number): void`; `set()` records the last move time when the crop changes.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { edgeAlpha, flashAlpha, quotaFilled, readySweep } from '../../src/game/ui/barEdgeModel';
describe('D3-R27 value changes', () => {
  it('D3-R27 leading edge is bright while moving and fades after the fill stops', () => {
    expect(edgeAlpha(0, { edgeAlpha: 0.6 }, 200)).toBeCloseTo(0.6);
    expect(edgeAlpha(100, { edgeAlpha: 0.6 }, 200)).toBeCloseTo(0.3);
    expect(edgeAlpha(250, { edgeAlpha: 0.6 }, 200)).toBe(0);
  });
  it('D3-R27 mango bar flashes once when it fills', () => {
    expect(quotaFilled(0.8, 1)).toBe(true);
    expect(quotaFilled(1, 1)).toBe(false);
    expect(quotaFilled(1, 0)).toBe(false);
    expect(flashAlpha(0, 260)).toBe(1); expect(flashAlpha(260, 260)).toBe(0);
  });
  it('D3-R27/R28 ready sweep on off->ready only, never under reduced motion', () => {
    expect(readySweep('pop', false)).toBe(true);
    expect(readySweep('dip', false)).toBe(false);
    expect(readySweep('pop', true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**

```ts
// D3-R27/R28 pure value-change cues: bar leading edge, full flash, skill-ready sweep gate.
import type { MotionD3Balance } from '../../core/balance';
import type { ReadyEdge } from '../hud/hudMotion';
import { clamp01 } from '../motion/curves';
export const edgeAlpha = (ms: number, c: Pick<MotionD3Balance, 'edgeAlpha'>, fadeMs: number): number => c.edgeAlpha * (1 - clamp01(ms / fadeMs));
export const flashAlpha = (elapsed: number, flashMs: number): number => 1 - clamp01(elapsed / flashMs);
export const quotaFilled = (prev: number, next: number): boolean => prev < 1 && next >= 1;
export const readySweep = (edge: ReadyEdge, reduced: boolean): boolean => edge === 'pop' && !reduced;
```
(`ui/` importing a type from `hud/hudMotion` is type-only; if a boundary test forbids it, move `ReadyEdge` usage by declaring `edge: 'pop' | 'dip' | null`.)

`progressBar` in `widgets.ts`: add two Graphics children created once: `edgeG` (white rect `ui(motion.d3.edgePx)` wide × `fh`, alpha 0) and `flashG` (white rounded rect over the fill area, alpha 0). Keep `lastPx`, `movedAt`, `flashAt`. In `set`: if `px !== lastPx` set `movedAt = scene.time.now`, `lastPx = px`, and position `edgeG.x = pad + px - edgeW`. `edge(now)`: `edgeG.setAlpha(px > 0 ? edgeAlpha(now - movedAt, cfg.d3, cfg.fadeMs) : 0)` — only when alpha changes (skip work once it is 0 and `now - movedAt > fadeMs`). `flash(now)`: `flashAt = now`; the alpha update rides the same `edge(now)` call: `flashG.setAlpha(flashAt < 0 ? 0 : flashAlpha(now - flashAt, cfg.d3.flashMs))`, set `flashAt = -1` when it hits 0. Read `cfg` with `motionCfgFor(scene)` (as `touchFx.ts` does).
`HudTop`: in the quota update (line ~124) keep the previous target; `if (quotaFilled(prev, quota)) this.mangoBar.flash(this.scene.time.now)`; add `tick(now) { this.mangoBar.edge(now); }`. `BottomGroup.tick(now)` also calls `this.bar.edge(now)` (before the finger early-return). `HudScene.update` calls `top.tick(time)` too.
`SkillButtons.draw`: after computing `edge`, `if (readySweep(edge, reduceMotion())) this.sweep(slot, this.scene.time.now)`. Add one sweep band per slot created once in the constructor, clipped to the round face with a geometry mask of the face circle; band drawing = the slice loop from `HomeScene.makeSweep` (copy it into a small exported helper `glossBand(scene, w, h, d3cfg): Phaser.GameObjects.Graphics` in `src/game/ui/touchFx.ts`, and make `HomeScene.makeSweep` call it — no duplicate code). Position per frame with `sweepX(elapsed, cfg.d3.sweepMs, faceW, faceW * cfg.d3.sweepBand)` from `src/game/flow/sweepModel.ts`; hide when it returns null. Add `SkillButtons.tick(now)`, called from `HudScene.update`. The existing MOT-4 `pop` (ready dip/pop) stays as is.

- [ ] **Step 4: Run model tests, `tests/game/hudMotion.test.ts`, Home tests (`-t "D3-R21"`), typecheck; expect PASS.**
- [ ] **Step 5: Browser check** (`/?debug=1&level=3`): eat mangoes → mango bar edge glows then fades, full bar flashes once at level-up; collect an orb until slow-mo becomes affordable → one gloss sweep on the button; reduced motion → no sweep, edge and flash still show. Screenshots to `tmp/qa/u4c/`.
- [ ] **Step 6: Commit** — `feat(hud): D3-R27 bar edge, full flash, skill-ready sweep` (+ CHANGELOG, CODEMAP).

---

### Task 6: Screenshot pass, docs, merge (roadmap U4 item 11)

**Files:** `docs/PLAYTEST.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `CHANGELOG.md`, `docs/CODEMAP.md`.

- [ ] **Step 1:** `node tools/qa/shot.mjs` for biomes 1..6 (`?debug=1&level=1,6,11,16,21,26`), D-pad on and off, touch emulation on the waiting screen; save under `tmp/qa/u4c/`. Look at each image: trail/chevron visible on every biome ground (white on light ground: if the chevron is unreadable on a biome, add a 1-px `T.inkDeep` under-stroke in `SteerFx` and note it), finger not overlapping skill buttons at 960 and 1170 heights.
- [ ] **Step 2:** Console clean in a normal run (no errors).
- [ ] **Step 3:** DECISIONS: one entry "U4c rulings C1..C4" (text from the Rulings section). PLAYTEST: U4c entry with screenshot paths and an owner eye-check list (trail feel, chevron size, finger loop speed `hintLoopMs`, sweep on ready, flash). STATUS: U4c merged, next = U5 plan.
- [ ] **Step 4:** Full `npm test` then `npm run typecheck` (sequentially; on host load use `--maxWorkers 1`). Both pass.
- [ ] **Step 5:** `git checkout version/v0.3 && git merge --no-ff feat/u4c-steer-hint-values`; re-run the full suite + typecheck on the merge; background `node .gitnexus/run.cjs analyze --index-only --workers 2`.
