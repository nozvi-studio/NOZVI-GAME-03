# MOT-3 In-run Event Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the five sound-only sim events (`shieldBroke`, `skillUnlocked`, `runWon`, `landed`, `rampEnded`) real visual feedback and add the three feedback moments GDD 10.4 lacks (mango spawn pop, snake turn tilt, golden mango sparkle).

**Architecture:** Every event stays one row in `mapJuice` (`src/game/juice/juiceMap.ts`). New visuals are new `BoardVisual` members played by `GameScene.playBoardFx` through `Effects` (`ringPulse`, `sparkle`, `turnTilt`). Three moments are not sim events (hazard cells, a turn, a mango respawn), so `GameScene`/`HudScene` derive them from snapshot changes with pure helpers in a new `src/game/juice/derived.ts` and feed them through the same `JuicePlayer.handleBatch` as extra `JuiceInput` members. All numbers live in a new `balance.juice.events` block. Pure curves (`mangoGrow`, `turnTilt`) extend MOT-0 `src/game/motion/curves.ts`. No new tween path: nothing here calls `scene.tweens.add` (the existing `ScreenFx` keeps its own).

**Tech Stack:** TypeScript strict, Phaser 3.90 (Graphics, no new GameObjects), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-motion-3-run-event-feedback-design.md` (read it first; this plan implements its sections 2-8 and 11). MOT-3-R14 (quota fill pulse) moved to MOT-4-R8 and is NOT in this plan.

## Global Constraints
- Windows test flags: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <pattern>`; full suite `npm test -- --configLoader native --pool threads --maxWorkers 2`; `npm run typecheck`. Run only the touched tests while working; full suite + typecheck (sequentially) before the final merge (AGENTS 6b).
- English only; Conventional Commits; every commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and adds one line under `## [Unreleased]` in `CHANGELOG.md` in the same commit; no push.
- Branch: `feat/motion-3-run-event-feedback` created from `version/v0.3` (after the `plan/motion-3` docs branch is merged there). Never commit to `master`/`dev`.
- No magic numbers: every duration, count, scale and alpha is a `balance.juice.events` key (Task 1). Colours are existing `ColorId` tokens only (`colors.ts`); no new colour id, no hex literal.
- No Phaser import in `curves.ts`, `juiceMap.ts`, `derived.ts` (types only). `Effects` imports curves from `../motion/curves`, not from the `../motion` index.
- All feedback is render-side: the sim, its RNG and `session.turn` timing are untouched (spec R5). Render-only randomness (sparkle position) never uses the sim RNG.
- Particle, float and spark caps hold: new bursts go through `Effects.burst` (`juice.perf.maxParticles`, `trimOldest`), rings capped by `ringMax`, stars by `sparkleMax` and counted inside `maxParticles`.
- Reduced motion is decided inside `mapJuice` with `ctx.reduced` (spec R4/R15). Sound and haptics follow user settings only. Light mode only.
- Test names carry `MOT-3-Rn`. Before editing a symbol run `node .gitnexus/run.cjs status` and GitNexus `impact` on `mapJuice`, `JuicePlayer`, `Effects`, `drawMango`, `drawSnake` (AGENTS 2c).

## Spec ambiguities and rulings (lead may veto before execution)
| # | Ambiguity | Ruling in this plan |
|---|---|---|
| A1 | R9 "bomb-class flag in `balance.hazards`": no `balance.hazards` block exists and the sim `landed` event only fires for `TimedKey` (`rock`, `fence`, `maze`; bombs have their own `landed` field, no event). | Flag lives at `juice.events.landShakeFamilies: { rock: true, fence: false, maze: false }` (a rock drop is the only heavy timed landing). No family name is hard-coded in code. |
| A2 | R6 needs the shield slot, but `mapJuice` is pure per event. | `JuiceCtx` gets optional `shieldSlot`; `JuicePlayer` remembers it from the last `skillUsed` shield (spec section 5). |
| A3 | R8 needs the snake head, which a `runWon` event does not carry. | `JuiceCtx` gets optional `head` (cell coords); `JuicePlayer` fills it from a new optional dep `headCell()` that `HudScene` backs with `gameScene.snapshot().snake[0]`. |
| A4 | R7 "from the board centre to the energy bar": `sparks.from` is in cell units. | `from = ((cols-1)/2, (rows-1)/2)` from `balance.board`. |
| A5 | R11 `mangoGrow(timeMs, bornAt, ms, s)` also needs `popFromScale`. | Signature gets a fifth parameter `from`. `drawMango` takes the ready scale (`grow: number`) instead of `bornAt`, so it needs no config. |
| A6 | R12 "first body segment scales" vs "same channel as `gulp`" (`gulp` only scales the head disc). | `drawSnake` gets one optional `bulge` argument that adds a single disc on the first body point. The head tilt is `CapyHead.update(..., tiltDeg)`. Rapid turns restart the ease at full amplitude (no accumulation). |
| A7 | R11 puff position and R9 cells are not on events. | New `JuiceInput` members `mangoSpawned`, `landedAt`, `turned`, emitted by `GameScene`/`HudScene` on the scene event `derived-juice` / built in `HudScene.onEvents` (`derived.ts` helpers are pure and tested). |
| A8 | Spec lists lifetimes only for some bursts; sparkle ring radius, star thickness and puff/shield life need keys too. | Added keys `shieldBurstLifeMs` 480, `spawnPuffLifeMs` 300, `sparkleRingRadius` 0.47, `sparkleThickness` 0.06 (cells). Win bursts reuse `bursts.golden`; all other bursts reuse `bursts.eat.speed` / `bursts.dust`. |

## File map
- Create: `src/game/juice/derived.ts` (pure derivation helpers), tests `tests/core/balanceJuiceEvents.test.ts`, `tests/game/juiceDerived.test.ts`, `tests/game/effectsMot3.test.ts`, `tests/game/juiceMapMot3.test.ts`, `tests/game/snakeBulge.test.ts`.
- Modify: `src/core/balance.ts` (type, schema, cross-checks), `config/balance.json`, `src/game/motion/curves.ts` (+`mangoGrow`, `turnTilt`), `src/game/juice/types.ts`, `src/game/juice/juiceMap.ts`, `src/game/juice/JuicePlayer.ts`, `src/game/render/effects.ts`, `src/game/render/mango.ts`, `src/game/render/snake.ts`, `src/game/art/capyHead.ts`, `src/game/scenes/GameScene.ts`, `src/game/scenes/HudScene.ts`, `docs/GDD.md` (10.4), `docs/CODEMAP.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `CHANGELOG.md`.
- Update existing tests: `tests/game/mango.test.ts`, `tests/game/hazardArt.test.ts`, `tests/game/effectsCaps.test.ts` (new required `EffectCaps` keys), `tests/game/juicePlayer.test.ts` (new cases), `tests/game/motionCurves.test.ts` (new cases).

---

### Task 1: `balance.juice.events` config, schema and validator

**Files:** Modify `src/core/balance.ts` (type near line 96-114 `juice: {...}`; schema near line 232-250 `juice: {...}`; cross-checks after the `flashAlphaMax` check near line 383), `config/balance.json` (line ~113 `"perf"`); Test `tests/core/balanceJuiceEvents.test.ts`

**Interfaces:** Produces `Balance['juice']['events']` with every key of spec section 8 plus A1/A8 keys: `shieldBreakBurst, shieldBurstLifeMs, ringScale, ringMs, ringMax, shieldShakeFactor, shieldShakeMs, unlockPopFactor, unlockExtraMs, winGlowMs, winBurstCount, winCornerBurst, landDust, landCellsMax, landShakePx, landShakeMs, landShakeFamilies{rock,fence,maze}, goFlashAlpha, goFlashMs, spawnPuffCount, spawnPuffLifeMs, turnTiltDeg, turnMs, turnBodyBulge, sparkleEveryMs, sparkleLifeMs, sparkleRadius, sparkleRingRadius, sparkleThickness, sparkleMax`.

- [ ] **Step 1: Write the failing test** `tests/core/balanceJuiceEvents.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { loadBalance } from '../support/balance';

const withEvents = (patch: Record<string, unknown>) => (j: any) => { j.juice.events = { ...j.juice.events, ...patch }; };

describe('MOT-3 balance.juice.events', () => {
  it('MOT-3-R3 config exposes the spec numbers', () => {
    const e = loadBalance().juice.events;
    expect(e.shieldBreakBurst).toBe(14); expect(e.ringScale).toBe(2.2); expect(e.ringMs).toBe(320); expect(e.ringMax).toBe(4);
    expect(e.shieldShakeFactor).toBe(0.4); expect(e.shieldShakeMs).toBe(160);
    expect(e.unlockPopFactor).toBe(1.2); expect(e.unlockExtraMs).toBe(140);
    expect(e.winGlowMs).toBe(1200); expect(e.winBurstCount).toBe(24); expect(e.winCornerBurst).toBe(6);
    expect(e.landDust).toBe(4); expect(e.landCellsMax).toBe(4); expect(e.landShakePx).toBe(2); expect(e.landShakeMs).toBe(120);
    expect(e.goFlashAlpha).toBe(0.2); expect(e.goFlashMs).toBe(260); expect(e.spawnPuffCount).toBe(5);
    expect(e.turnTiltDeg).toBe(10); expect(e.turnMs).toBe(140); expect(e.turnBodyBulge).toBe(1.06);
    expect(e.sparkleEveryMs).toBe(700); expect(e.sparkleLifeMs).toBe(420); expect(e.sparkleRadius).toBe(0.2); expect(e.sparkleMax).toBe(3);
    expect(e.landShakeFamilies).toEqual({ rock: true, fence: false, maze: false });
  });
  it('MOT-3-R2 rejects winGlowMs longer than the run-over hold (juice.death.totalMs)', () => {
    expect(() => loadBalance(withEvents({ winGlowMs: 1401 }))).toThrow(/juice\.events\.winGlowMs/);
  });
  it('MOT-3-R2 rejects burst counts above the particle cap', () => {
    expect(() => loadBalance(withEvents({ shieldBreakBurst: 301 }))).toThrow(/juice\.events\.shieldBreakBurst/);
    expect(() => loadBalance(withEvents({ winBurstCount: 290, winCornerBurst: 6 }))).toThrow(/juice\.events\.winBurstCount/);
    expect(() => loadBalance(withEvents({ landDust: 100, landCellsMax: 4 }))).toThrow(/juice\.events\.landDust/);
    expect(() => loadBalance(withEvents({ sparkleMax: 301 }))).toThrow(/juice\.events\.sparkleMax/);
  });
  it('MOT-3 rejects non-integer counts, negative values and scales that cannot animate', () => {
    expect(() => loadBalance(withEvents({ shieldBreakBurst: 1.5 }))).toThrow(/juice\.events\.shieldBreakBurst/);
    expect(() => loadBalance(withEvents({ landShakePx: -1 }))).toThrow(/juice\.events\.landShakePx/);
    expect(() => loadBalance(withEvents({ ringScale: 1 }))).toThrow(/juice\.events\.ringScale/);
    expect(() => loadBalance(withEvents({ turnBodyBulge: 1 }))).toThrow(/juice\.events\.turnBodyBulge/);
    expect(() => loadBalance(withEvents({ unlockPopFactor: 0.9 }))).toThrow(/juice\.events\.unlockPopFactor/);
    expect(() => loadBalance(withEvents({ landShakeFamilies: { rock: 1, fence: false, maze: false } }))).toThrow(/juice\.events\.landShakeFamilies\.rock/);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/balanceJuiceEvents` -> FAIL (`events` undefined).
- [ ] **Step 3: Implement.**
  - `config/balance.json`: replace the line `    "perf": { "maxParticles": 300, "maxFloats": 6, "maxSparks": 12 }` with
```json
    "perf": { "maxParticles": 300, "maxFloats": 6, "maxSparks": 12 },
    "events": {
      "shieldBreakBurst": 14, "shieldBurstLifeMs": 480, "ringScale": 2.2, "ringMs": 320, "ringMax": 4,
      "shieldShakeFactor": 0.4, "shieldShakeMs": 160, "unlockPopFactor": 1.2, "unlockExtraMs": 140,
      "winGlowMs": 1200, "winBurstCount": 24, "winCornerBurst": 6,
      "landDust": 4, "landCellsMax": 4, "landShakePx": 2, "landShakeMs": 120, "landShakeFamilies": { "rock": true, "fence": false, "maze": false },
      "goFlashAlpha": 0.2, "goFlashMs": 260, "spawnPuffCount": 5, "spawnPuffLifeMs": 300,
      "turnTiltDeg": 10, "turnMs": 140, "turnBodyBulge": 1.06,
      "sparkleEveryMs": 700, "sparkleLifeMs": 420, "sparkleRadius": 0.2, "sparkleRingRadius": 0.47, "sparkleThickness": 0.06, "sparkleMax": 3
    }
```
  - `src/core/balance.ts` type: after the line `    perf: { maxParticles: number; maxFloats: number; maxSparks: number };` add
```ts
    events: {
      shieldBreakBurst: number; shieldBurstLifeMs: number; ringScale: number; ringMs: number; ringMax: number;
      shieldShakeFactor: number; shieldShakeMs: number; unlockPopFactor: number; unlockExtraMs: number;
      winGlowMs: number; winBurstCount: number; winCornerBurst: number;
      landDust: number; landCellsMax: number; landShakePx: number; landShakeMs: number; landShakeFamilies: Record<'rock' | 'fence' | 'maze', boolean>;
      goFlashAlpha: number; goFlashMs: number; spawnPuffCount: number; spawnPuffLifeMs: number;
      turnTiltDeg: number; turnMs: number; turnBodyBulge: number;
      sparkleEveryMs: number; sparkleLifeMs: number; sparkleRadius: number; sparkleRingRadius: number; sparkleThickness: number; sparkleMax: number;
    };
```
  - Schema: after `    perf: { maxParticles: 'int+', maxFloats: 'int+', maxSparks: 'int+' },` add
```ts
    events: {
      shieldBreakBurst: 'int0', shieldBurstLifeMs: 'int+', ringScale: 'num+', ringMs: 'int+', ringMax: 'int+',
      shieldShakeFactor: 'prob', shieldShakeMs: 'int+', unlockPopFactor: 'num+', unlockExtraMs: 'int0',
      winGlowMs: 'int+', winBurstCount: 'int0', winCornerBurst: 'int0',
      landDust: 'int0', landCellsMax: 'int+', landShakePx: 'num0', landShakeMs: 'int+', landShakeFamilies: { rock: 'bool', fence: 'bool', maze: 'bool' },
      goFlashAlpha: 'prob', goFlashMs: 'int+', spawnPuffCount: 'int0', spawnPuffLifeMs: 'int+',
      turnTiltDeg: 'num0', turnMs: 'int+', turnBodyBulge: 'num+',
      sparkleEveryMs: 'int+', sparkleLifeMs: 'int+', sparkleRadius: 'prob', sparkleRingRadius: 'prob', sparkleThickness: 'prob', sparkleMax: 'int+',
    },
```
  - Cross-checks: directly after the line `  if (b.juice.reduced.flashAlphaMax > 0.25) fail('juice.reduced.flashAlphaMax', 'must be <= 0.25 (no big flashes)');` add
```ts
  // MOT-3-R2 event feedback stays inside the particle budget and the run-over hold.
  const ev = b.juice.events, pf = b.juice.perf;
  if (ev.winGlowMs > jd.totalMs) fail('juice.events.winGlowMs', 'must be <= juice.death.totalMs');
  if (ev.shieldBreakBurst > pf.maxParticles) fail('juice.events.shieldBreakBurst', 'must be <= juice.perf.maxParticles');
  if (ev.winBurstCount + 4 * ev.winCornerBurst > pf.maxParticles) fail('juice.events.winBurstCount', 'head + 4 corner bursts must be <= juice.perf.maxParticles');
  if (ev.landDust * ev.landCellsMax > pf.maxParticles) fail('juice.events.landDust', 'landDust * landCellsMax must be <= juice.perf.maxParticles');
  if (ev.sparkleMax > pf.maxParticles) fail('juice.events.sparkleMax', 'must be <= juice.perf.maxParticles');
  if (ev.ringScale <= 1) fail('juice.events.ringScale', 'must be > 1');
  if (ev.turnBodyBulge <= 1) fail('juice.events.turnBodyBulge', 'must be > 1');
  if (ev.unlockPopFactor < 1) fail('juice.events.unlockPopFactor', 'must be >= 1');
```
- [ ] **Step 4:** Re-run the test -> PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(balance): MOT-3 balance.juice.events block and validator` + CHANGELOG line.

---

### Task 2: Pure curves `mangoGrow`/`turnTilt` and the mango pop-in (R11 scale)

**Files:** Modify `src/game/motion/curves.ts` (append), `src/game/render/mango.ts` (`drawMango` signature line ~22 and `const grow` line ~29), `src/game/scenes/GameScene.ts` (`draw`, the `drawMango(...)` call ~line 201, import); Update tests `tests/game/motionCurves.test.ts`, `tests/game/mango.test.ts`, `tests/game/hazardArt.test.ts`

**Interfaces:** Produces `mangoGrow(timeMs: number, bornAt: number, ms: number, s: number, from: number): number` and `turnTilt(elapsedMs: number, ms: number, deg: number, s: number): number` (both in `curves.ts`, re-exported by `src/game/motion/index.ts`); `drawMango(g, s, cell, p, look, time, reduced, grow: number)` where `grow` replaces the old `bornAt` (reduced still forces scale 1).

- [ ] **Step 1: Write the failing tests.** Append to `tests/game/motionCurves.test.ts` (add `mangoGrow, turnTilt` to the existing import from `../../src/game/motion/curves`):
```ts
describe('MOT-3 curves', () => {
  it('MOT-3-R11 mangoGrow is 0.85 at birth, overshoots 1 and is exactly 1 at the end', () => {
    expect(mangoGrow(500, 500, 240, 1.7, 0.85)).toBeCloseTo(0.85, 10);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(k => mangoGrow(500 + 240 * k, 500, 240, 1.7, 0.85)))).toBeGreaterThan(1);
    expect(mangoGrow(740, 500, 240, 1.7, 0.85)).toBeCloseTo(1, 10);
    expect(mangoGrow(9999, 500, 240, 1.7, 0.85)).toBeCloseTo(1, 10);
    expect(mangoGrow(100, 500, 240, 1.7, 0.85)).toBeCloseTo(0.85, 10); // clamps before birth
  });
  it('MOT-3-R12 turnTilt starts at +-deg and returns to 0 at turnMs', () => {
    expect(turnTilt(0, 140, 10, 1.7)).toBeCloseTo(10, 10);
    expect(turnTilt(0, 140, -10, 1.7)).toBeCloseTo(-10, 10);
    expect(turnTilt(140, 140, 10, 1.7)).toBeCloseTo(0, 10);
    expect(turnTilt(999, 140, 10, 1.7)).toBeCloseTo(0, 10);
    expect(turnTilt(70, 140, 10, 1.7)).toBeLessThan(10);
  });
});
```
  In `tests/game/mango.test.ts` add `import { mangoGrow } from '../../src/game/motion/curves';` and replace the three `drawMango` calls that pass a birth time: line 28 `drawMango(graphics, snapshot, 30, LIGHT, DEFAULT_LOOK, 500, false, 0);` -> `..., 500, false, 1);` (expect stays `[[1, 1]]`); lines 32-35 become
```ts
  it('MOT-3-R11 a newly appeared mango starts at popFromScale and is drawn at the grow the scene computes', () => {
    const m = loadBalance().motion, { graphics, scales } = graphicsProbe();
    const grow = mangoGrow(500, 500, m.popInMs, m.overshoot, m.popFromScale);
    drawMango(graphics, createSim(loadBalance(), 1).snapshot(), 30, LIGHT, DEFAULT_LOOK, 500, false, grow);
    expect(scales[0]![0]).toBeCloseTo(m.popFromScale, 10);
    expect(scales[0]![1]).toBeCloseTo(m.popFromScale, 10);
  });
```
  line 39 `..., 500, true, 500);` -> `..., 500, true, 0.5);` (expect `[[1, 1]]` still: reduced forces 1); line 49 `..., 500, true, 0);` -> `..., 500, true, 1);`. In `tests/game/hazardArt.test.ts` line 134 `drawMango(p.g, s, 30, LIGHT, look, 0, true, 0);` -> `..., 0, true, 1);`.
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/motionCurves tests/game/mango tests/game/hazardArt` -> FAIL (exports missing).
- [ ] **Step 3: Implement.** Append to `src/game/motion/curves.ts`:
```ts
/** MOT-3-R11 mango pop-in scale: `from` -> 1 with a back overshoot over `ms`; clamps before birth and after the end. */
export const mangoGrow = (timeMs: number, bornAt: number, ms: number, s: number, from: number): number =>
  lerp(from, 1, backOut((timeMs - bornAt) / ms, s));
/** MOT-3-R12 head tilt in degrees: starts at `deg` (signed) and eases to 0 over `ms`; the back undershoot is the bounce. */
export const turnTilt = (elapsedMs: number, ms: number, deg: number, s: number): number => deg * (1 - backOut(elapsedMs / ms, s));
```
  In `src/game/render/mango.ts` change the signature tail `reduced: boolean, bornAt: number): void {` to `reduced: boolean, grow: number): void {` and replace the line `  const grow = reduced ? 1 : Math.min(1, Math.max(0, time - bornAt) / 220);` with
```ts
  const scale = reduced ? 1 : grow; // MOT-3-R11 the scene computes `grow` with mangoGrow (balance.motion popInMs/popFromScale/overshoot)
```
  and change `.scaleCanvas(grow, grow);` to `.scaleCanvas(scale, scale);`. In `GameScene.ts` add `import { mangoGrow } from '../motion/curves';` and change the call to
```ts
    const mo = this.balance.motion;
    drawMango(this.layers.mango, snapshot, cell, p, this.look, time, this.reduced, mangoGrow(time, this.mangoBornAt, mo.popInMs, mo.overshoot, mo.popFromScale));
```
- [ ] **Step 4:** Re-run the three test files -> PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(motion): MOT-3-R11 mangoGrow and turnTilt curves, mango pop uses balance.motion` + CHANGELOG line.

---

### Task 3: Pure derivation helpers `derived.ts` and the new input/visual types

**Files:** Create `src/game/juice/derived.ts`; Modify `src/game/juice/types.ts` (union members, `JuiceCtx`); Test `tests/game/juiceDerived.test.ts`

**Interfaces:** Consumes `HazardView`, `MangoView`, `SimEvent`, `TimedKey`, `Dir` from `../../core`. Produces in `types.ts`: `BoardVisual` gains `{ kind: 'ringPulse'; x: number; y: number; color: ColorId; scale: number; ms: number }`, `{ kind: 'sparkle'; x: number; y: number; color: ColorId; lifeMs: number }`, `{ kind: 'turnTilt'; dx: number; dy: number; deg: number; ms: number }`; `JuiceInput` gains `{ type: 'landedAt'; hazardType: TimedKey; cells: Pt[] }`, `{ type: 'turned'; dx: number; dy: number }`, `{ type: 'mangoSpawned'; x: number; y: number; golden: boolean }`; `JuiceCtx` gains optional `shieldSlot?: 0 | 1 | null; head?: Pt | null`. Produces in `derived.ts`: `landedCells(hazards: readonly HazardView[], type: TimedKey, max: number): Pt[]`, `isTurn(dir: Pt, dx: number, dy: number): boolean`, `mangoSpawnInput(hadMango: boolean, events: readonly SimEvent[], mango: Pt & { golden: boolean } | null): JuiceInput | null`, `SparkleClock`, `newSparkleClock(): SparkleClock`, `sparkleStep(c: SparkleClock, dtMs: number, everyMs: number, active: boolean, mango: Pt | null, radius: number): Pt | null`.

- [ ] **Step 1: Write the failing test** `tests/game/juiceDerived.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { isTurn, landedCells, mangoSpawnInput, newSparkleClock, sparkleStep } from '../../src/game/juice/derived';

const cell = (x: number, y: number, on = true) => ({ x, y, on, ageMs: 0 });
const hz = (type: 'rock' | 'fence' | 'maze', state: 'warn' | 'solid', t: number, cells = [cell(1, 1)]) =>
  ({ type, state, t, warnMs: 1000, lifeMs: 9000, cells }) as never;

describe('MOT-3-R9 landedCells', () => {
  it('returns the cells of the most recently landed hazard of that type, only `on` cells, capped', () => {
    const list = [hz('rock', 'solid', 5000, [cell(0, 0)]), hz('rock', 'solid', 1200, [cell(2, 2), cell(3, 2, false), cell(4, 2), cell(5, 2)]), hz('fence', 'solid', 1100, [cell(9, 9)])];
    expect(landedCells(list, 'rock', 2)).toEqual([{ x: 2, y: 2 }, { x: 4, y: 2 }]);
    expect(landedCells(list, 'fence', 4)).toEqual([{ x: 9, y: 9 }]);
  });
  it('ignores hazards still in warn and returns [] when none landed', () => {
    expect(landedCells([hz('rock', 'warn', 500)], 'rock', 4)).toEqual([]);
    expect(landedCells([], 'maze', 4)).toEqual([]);
  });
});
describe('MOT-3-R12 isTurn', () => {
  it('true only when the new direction differs from the head direction', () => {
    expect(isTurn({ x: 1, y: 0 }, 0, 1)).toBe(true);
    expect(isTurn({ x: 1, y: 0 }, 1, 0)).toBe(false);
  });
});
describe('MOT-3-R11 mangoSpawnInput', () => {
  const m = { x: 3, y: 4, golden: false };
  const ate = { type: 'ate', x: 1, y: 1, golden: false, points: 1, progressGain: 1, source: 'mango' } as never;
  const rain = { type: 'ate', x: 1, y: 1, golden: false, points: 1, progressGain: 1, source: 'rain' } as never;
  it('spawns after a mango ate / rot event, or when a mango appears from nothing', () => {
    expect(mangoSpawnInput(true, [ate], m)).toEqual({ type: 'mangoSpawned', x: 3, y: 4, golden: false });
    expect(mangoSpawnInput(true, [{ type: 'rotted', x: 0, y: 0, leftRock: true } as never], { ...m, golden: true })).toEqual({ type: 'mangoSpawned', x: 3, y: 4, golden: true });
    expect(mangoSpawnInput(false, [], m)).toMatchObject({ type: 'mangoSpawned' });
  });
  it('does not spawn without a mango, on rain eats, or on an ordinary frame', () => {
    expect(mangoSpawnInput(true, [ate], null)).toBeNull();
    expect(mangoSpawnInput(true, [rain], m)).toBeNull();
    expect(mangoSpawnInput(true, [], m)).toBeNull();
  });
});
describe('MOT-3-R13 sparkleStep', () => {
  const mg = { x: 5, y: 5 };
  it('emits one point every `everyMs` on the ring, deterministically', () => {
    const a = newSparkleClock(), b = newSparkleClock();
    const pa: unknown[] = [], pb: unknown[] = [];
    for (let i = 0; i < 20; i++) { pa.push(sparkleStep(a, 100, 700, true, mg, 0.47)); pb.push(sparkleStep(b, 100, 700, true, mg, 0.47)); }
    expect(pa).toEqual(pb);
    const pts = pa.filter(Boolean) as { x: number; y: number }[];
    expect(pts.length).toBe(2);
    for (const p of pts) expect(Math.hypot(p.x - 5, p.y - 5)).toBeCloseTo(0.47, 10);
    expect(pts[0]).not.toEqual(pts[1]);
  });
  it('is silent and resets when inactive or without a mango', () => {
    const c = newSparkleClock();
    expect(sparkleStep(c, 600, 700, true, mg, 0.47)).toBeNull();
    expect(sparkleStep(c, 600, 700, false, mg, 0.47)).toBeNull(); expect(c.acc).toBe(0);
    expect(sparkleStep(c, 800, 700, true, null, 0.47)).toBeNull();
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/juiceDerived` -> FAIL (module missing).
- [ ] **Step 3: Implement.** Create `src/game/juice/derived.ts`:
```ts
// MOT-3 pure derivations: feedback triggers the sim does not emit as events. No Phaser; render-only counters never touch the sim RNG.
import type { HazardView, SimEvent, TimedKey } from '../../core';
import type { JuiceInput, Pt } from './types';

/** MOT-3-R9 cells of the hazard of `type` that landed most recently (smallest t - warnMs among non-warn), only `on` cells, at most `max`. */
export function landedCells(hazards: readonly HazardView[], type: TimedKey, max: number): Pt[] {
  let best: HazardView | null = null;
  for (const h of hazards) {
    if (h.type !== type || h.state === 'warn') continue;
    if (best === null || h.t - h.warnMs < best.t - best.warnMs) best = h;
  }
  if (best === null) return [];
  return best.cells.filter(c => c.on).slice(0, max).map(c => ({ x: c.x, y: c.y }));
}

/** MOT-3-R12 a turn is feedback-worthy when the requested direction differs from the head direction. */
export const isTurn = (dir: Pt, dx: number, dy: number): boolean => dx !== dir.x || dy !== dir.y;

/** MOT-3-R11 a mango (re)appeared: after a mango eat or a rot, or when it goes from absent to present. */
export function mangoSpawnInput(hadMango: boolean, events: readonly SimEvent[], mango: (Pt & { golden: boolean }) | null): JuiceInput | null {
  if (mango === null) return null;
  const respawn = events.some(e => (e.type === 'ate' && e.source === 'mango') || e.type === 'rotted');
  return respawn || !hadMango ? { type: 'mangoSpawned', x: mango.x, y: mango.y, golden: mango.golden } : null;
}

const GOLDEN_ANGLE = 2.399963229728653; // radians; spreads successive stars around the ring without randomness
export interface SparkleClock { acc: number; n: number }
export const newSparkleClock = (): SparkleClock => ({ acc: 0, n: 0 });
/** MOT-3-R13 advance by dtMs; returns the ring point (cell units) when a star is due, else null. Inactive or no mango resets the timer. */
export function sparkleStep(c: SparkleClock, dtMs: number, everyMs: number, active: boolean, mango: Pt | null, radius: number): Pt | null {
  if (!active || mango === null) { c.acc = 0; return null; }
  c.acc += dtMs;
  if (c.acc < everyMs) return null;
  c.acc -= everyMs;
  const a = c.n++ * GOLDEN_ANGLE;
  return { x: mango.x + Math.cos(a) * radius, y: mango.y + Math.sin(a) * radius };
}
```
  In `src/game/juice/types.ts`: change the first import to `import type { Balance, CauseKey, SimEvent, TimedKey } from '../../core';`; append to the `BoardVisual` union (after the `biomeSweep` member, replacing its trailing `;` with a newline `|`):
```ts
  | { kind: 'ringPulse'; x: number; y: number; color: ColorId; scale: number; ms: number }
  | { kind: 'sparkle'; x: number; y: number; color: ColorId; lifeMs: number }
  | { kind: 'turnTilt'; dx: number; dy: number; deg: number; ms: number };
```
  Replace `export interface JuiceCtx { balance: Balance; sound: boolean; haptics: boolean; reduced: boolean }` with
```ts
export interface JuiceCtx {
  balance: Balance; sound: boolean; haptics: boolean; reduced: boolean;
  /** MOT-3-R6 slot of the last shield cast (JuicePlayer remembers it); null/undefined = unknown. */
  shieldSlot?: 0 | 1 | null;
  /** MOT-3-R8 snake head in cell coords for a run-won burst; null/undefined = skip the head burst. */
  head?: Pt | null;
}
```
  Replace `export type JuiceInput = SimEvent | { type: 'checkpointUnlocked'; level: number };` with
```ts
/** Derived inputs (not sim events): checkpoint save growth, hazard cells of a landing, a snake turn, a mango (re)spawn (MOT-3, see derived.ts). */
export type JuiceInput = SimEvent
  | { type: 'checkpointUnlocked'; level: number }
  | { type: 'landedAt'; hazardType: TimedKey; cells: Pt[] }
  | { type: 'turned'; dx: number; dy: number }
  | { type: 'mangoSpawned'; x: number; y: number; golden: boolean };
```
- [ ] **Step 4:** Re-run the test -> PASS. `npm run typecheck` (existing `mapJuice` switch has a `default` so the new union members compile).
- [ ] **Step 5: Commit** `feat(juice): MOT-3 derived input helpers and new board visuals/inputs` + CHANGELOG line.

---

### Task 4: `mapJuice` rows for shield break, skill unlocked, run won, ramp ended (R6, R7, R8, R10) and `dedupeBumps`

**Files:** Modify `src/game/juice/juiceMap.ts` (the `case 'rampEnded'`, `'shieldBroke'`, `'skillUnlocked'`, `'runWon'` lines at the end of the `switch`; add helpers above `mapJuice`); Test `tests/game/juiceMapMot3.test.ts`

**Interfaces:** Consumes Task 1 `juice.events`, Task 3 `ringPulse`, `ctx.shieldSlot`, `ctx.head`. Produces `dedupeBumps(list: readonly ScreenVisual[]): ScreenVisual[]` (keeps the first position of each `barBump` target, with the largest scale). The four sound-only `case` lines keep their sound ids (existing `legacy sounds keep their mapping` test stays green).

- [ ] **Step 1: Write the failing test** `tests/game/juiceMapMot3.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { dedupeBumps, mapJuice } from '../../src/game/juice/juiceMap';
import { loadBalance } from '../support/balance';

const b = loadBalance(), j = b.juice, e = j.events;
const on = { balance: b, sound: true, haptics: true, reduced: false };
const red = { ...on, reduced: true };
const kinds = (c: { board: { kind: string }[]; screen: { kind: string }[] }) => [...c.board, ...c.screen].map(v => v.kind);
const broke = { type: 'shieldBroke', x: 4, y: 6, family: 'rock' } as const;

describe('MOT-3-R6 shield break', () => {
  it('burst, ring, shake, tintEnd and an icon pop on the remembered slot; sound kept', () => {
    const c = mapJuice(broke, { ...on, shieldSlot: 1 });
    expect(c.board).toEqual([
      { kind: 'tintEnd', fadeMs: j.skill.tintFadeMs },
      { kind: 'burst', x: 4, y: 6, color: 'shield', count: e.shieldBreakBurst, speed: j.bursts.eat.speed, lifeMs: e.shieldBurstLifeMs },
      { kind: 'ringPulse', x: 4, y: 6, color: 'shield', scale: e.ringScale, ms: e.ringMs },
      { kind: 'shake', amplitudePx: j.death.shakePx * e.shieldShakeFactor, ms: e.shieldShakeMs }]);
    expect(c.screen).toEqual([{ kind: 'iconPop', slot: 1, color: 'shield', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs }]);
    expect(c.sounds).toEqual(['shieldBreak']);
  });
  it('no icon pop when the slot is unknown', () => {
    expect(mapJuice(broke, on).screen).toEqual([]);
  });
  it('MOT-3-R15 reduced: keeps tintEnd and one capped flash; no burst, ring, shake or pop', () => {
    const c = mapJuice(broke, { ...red, shieldSlot: 1 });
    expect(c.board).toEqual([{ kind: 'tintEnd', fadeMs: j.skill.tintFadeMs }]);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'shield', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]);
    expect(c.sounds).toEqual(['shieldBreak']);
  });
  it('MOT-3-R15 sound and haptics settings still gate sounds', () => {
    expect(mapJuice(broke, { ...on, sound: false }).sounds).toEqual([]);
  });
});

describe('MOT-3-R7 skill unlocked', () => {
  const unlocked = (slot: 0 | 1 | null) => ({ type: 'skillUnlocked', skill: 'slowmo', slot }) as const;
  it('slot given: bigger/longer icon pop in the skill colour plus sparks from the board centre', () => {
    const c = mapJuice(unlocked(0), on);
    expect(c.screen).toEqual([
      { kind: 'iconPop', slot: 0, color: 'slowmo', scale: j.skill.iconPopScale * e.unlockPopFactor, ms: j.skill.iconPopMs + e.unlockExtraMs },
      { kind: 'sparks', from: { x: (b.board.cols - 1) / 2, y: (b.board.rows - 1) / 2 }, count: j.orb.sparkCount, ms: j.orb.sparkMs, staggerMs: j.orb.sparkStaggerMs, color: 'slowmo' }]);
    expect(c.sounds).toEqual(['unlock']); expect(c.board).toEqual([]);
  });
  it('slot null: sparks only', () => {
    expect(kinds(mapJuice(unlocked(null), on))).toEqual(['sparks']);
  });
  it('MOT-3-R15 reduced: sound only', () => {
    const c = mapJuice(unlocked(0), red);
    expect(kinds(c)).toEqual([]); expect(c.sounds).toEqual(['unlock']);
  });
});

describe('MOT-3-R8 run won', () => {
  const won = { type: 'runWon', score: 9, timeMs: 1 } as const;
  it('long glow, gold head burst, four corner bursts, gold flash, snake pop; total particles within the cap', () => {
    const c = mapJuice(won, { ...on, head: { x: 7, y: 8 } });
    expect(kinds(c)).toEqual(['levelGlow', 'burst', 'burst', 'burst', 'burst', 'burst', 'snakePop', 'flash']);
    expect(c.board[0]).toEqual({ kind: 'levelGlow', alpha: j.level.glowAlpha, ms: e.winGlowMs });
    expect(c.board[1]).toMatchObject({ x: 7, y: 8, color: 'gold', count: e.winBurstCount });
    const corners = c.board.slice(2, 6).map(v => [(v as { x: number }).x, (v as { y: number }).y]);
    expect(corners).toEqual([[0, 0], [b.board.cols - 1, 0], [0, b.board.rows - 1], [b.board.cols - 1, b.board.rows - 1]]);
    expect(c.board.filter(v => v.kind === 'burst').reduce((n, v) => n + (v as { count: number }).count, 0)).toBeLessThanOrEqual(j.perf.maxParticles);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'gold', alpha: j.skill.flashAlpha, ms: j.skill.flashMs }]);
    expect(e.winGlowMs).toBeLessThanOrEqual(j.death.totalMs); expect(c.sounds).toEqual(['biome']);
  });
  it('without a head the head burst is skipped', () => {
    expect(mapJuice(won, on).board.filter(v => v.kind === 'burst').length).toBe(4);
  });
  it('MOT-3-R15 reduced: capped soft glow only', () => {
    const c = mapJuice(won, { ...red, head: { x: 1, y: 1 } });
    expect(c.board).toEqual([{ kind: 'levelGlow', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]); expect(c.screen).toEqual([]);
  });
});

describe('MOT-3-R10 ramp ended (GO)', () => {
  const go = { type: 'rampEnded', level: 4 } as const;
  it('food-coloured flash, snake pop and a level-bar bump; sound kept', () => {
    const c = mapJuice(go, on);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'food', alpha: e.goFlashAlpha, ms: e.goFlashMs },
      { kind: 'barBump', target: 'levelBar', scale: j.barBump.scale, ms: j.barBump.ms }]);
    expect(c.board).toEqual([{ kind: 'snakePop', ms: j.level.popMs }]); expect(c.sounds).toEqual(['go']);
  });
  it('MOT-3-R15 reduced: one flash at flashAlphaMax for softMs, no pop or bump', () => {
    const c = mapJuice(go, red);
    expect(c.screen).toEqual([{ kind: 'flash', color: 'food', alpha: j.reduced.flashAlphaMax, ms: j.reduced.softMs }]); expect(c.board).toEqual([]);
  });
});

describe('MOT-3 dedupeBumps', () => {
  const bump = (target: 'levelBar' | 'score', scale: number) => ({ kind: 'barBump', target, scale, ms: 160 }) as const;
  it('keeps one bump per target with the largest scale at the first position and passes other visuals through', () => {
    const flash = { kind: 'flash', color: 'food', alpha: 0.2, ms: 100 } as const;
    expect(dedupeBumps([bump('levelBar', 1.1), flash, bump('score', 1.15), bump('levelBar', 1.3)]))
      .toEqual([bump('levelBar', 1.3), flash, bump('score', 1.15)]);
    expect(dedupeBumps([])).toEqual([]);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/juiceMapMot3` -> FAIL.
- [ ] **Step 3: Implement** in `src/game/juice/juiceMap.ts`. Add the import `ScreenVisual` already imported; add below `trimOldest`:
```ts
/** MOT-3 one bump per HUD target per batch: keep the first position, with the largest scale (R10 and a level-up can both bump the level bar). */
export function dedupeBumps(list: readonly ScreenVisual[]): ScreenVisual[] {
  const out: ScreenVisual[] = [];
  for (const v of list) {
    if (v.kind !== 'barBump') { out.push(v); continue; }
    const i = out.findIndex(o => o.kind === 'barBump' && o.target === v.target);
    if (i < 0) out.push(v);
    else if (v.scale > (out[i] as Extract<ScreenVisual, { kind: 'barBump' }>).scale) out[i] = v;
  }
  return out;
}
const boardCentre = (b: Balance): { x: number; y: number } => ({ x: (b.board.cols - 1) / 2, y: (b.board.rows - 1) / 2 });
```
  Inside `mapJuice`, after `const screen = ...` add `const e = j.events;`. Replace the four case lines:
```ts
    case 'rampEnded': // MOT-3-R10 "GO" cue
      if (r) screen({ kind: 'flash', color: 'food', alpha: cap, ms: soft });
      else {
        screen({ kind: 'flash', color: 'food', alpha: e.goFlashAlpha, ms: e.goFlashMs });
        board({ kind: 'snakePop', ms: j.level.popMs });
        screen({ kind: 'barBump', target: 'levelBar', scale: j.barBump.scale, ms: j.barBump.ms });
      }
      cue.sounds = ['go']; break;
    case 'shieldBroke': // MOT-3-R6
      board({ kind: 'tintEnd', fadeMs: j.skill.tintFadeMs });
      if (r) screen({ kind: 'flash', color: 'shield', alpha: cap, ms: soft });
      else {
        board({ kind: 'burst', x: ev.x, y: ev.y, color: 'shield', count: e.shieldBreakBurst, speed: j.bursts.eat.speed, lifeMs: e.shieldBurstLifeMs });
        board({ kind: 'ringPulse', x: ev.x, y: ev.y, color: 'shield', scale: e.ringScale, ms: e.ringMs });
        board({ kind: 'shake', amplitudePx: j.death.shakePx * e.shieldShakeFactor, ms: e.shieldShakeMs });
        if (ctx.shieldSlot != null) screen({ kind: 'iconPop', slot: ctx.shieldSlot, color: 'shield', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs });
      }
      cue.sounds = ['shieldBreak']; break;
    case 'skillUnlocked': { // MOT-3-R7 (the unlock banner stays as it is)
      const color = SKILL_COLOR[ev.skill];
      if (!r) {
        if (ev.slot !== null) screen({ kind: 'iconPop', slot: ev.slot, color, scale: j.skill.iconPopScale * e.unlockPopFactor, ms: j.skill.iconPopMs + e.unlockExtraMs });
        screen({ kind: 'sparks', from: boardCentre(ctx.balance), count: j.orb.sparkCount, ms: j.orb.sparkMs, staggerMs: j.orb.sparkStaggerMs, color });
      }
      cue.sounds = ['unlock']; break;
    }
    case 'runWon': { // MOT-3-R8 plays once and must finish inside the run-over hold (validator: winGlowMs <= juice.death.totalMs)
      if (r) board({ kind: 'levelGlow', alpha: cap, ms: soft });
      else {
        const { cols, rows } = ctx.balance.board, g = j.bursts.golden;
        board({ kind: 'levelGlow', alpha: j.level.glowAlpha, ms: e.winGlowMs });
        if (ctx.head) board({ kind: 'burst', x: ctx.head.x, y: ctx.head.y, color: 'gold', count: e.winBurstCount, speed: g.speed, lifeMs: g.lifeMs });
        for (const [x, y] of [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]] as const)
          board({ kind: 'burst', x, y, color: 'gold', count: e.winCornerBurst, speed: g.speed, lifeMs: g.lifeMs });
        board({ kind: 'snakePop', ms: j.level.popMs });
        screen({ kind: 'flash', color: 'gold', alpha: j.skill.flashAlpha, ms: j.skill.flashMs });
      }
      cue.sounds = ['biome']; break;
    }
```
  Note the order of `kinds()` in the run-won test is board visuals first (glow, 5 bursts, snakePop) then screen (flash), matching `[...board, ...screen]`.
- [ ] **Step 4:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/juiceMapMot3 tests/game/juiceMap` -> PASS (the old file still checks the kept sounds). `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(juice): MOT-3-R6/R7/R8/R10 visuals for shield break, unlock, win and GO` + CHANGELOG line.

---

### Task 5: `mapJuice` rows for derived inputs (R9 landing dust, R11 spawn puff, R12 turn tilt)

**Files:** Modify `src/game/juice/juiceMap.ts` (new `case` lines before `default`); Test `tests/game/juiceMapMot3.test.ts` (append)

**Interfaces:** Consumes Task 3 `JuiceInput` members `landedAt`, `turned`, `mangoSpawned` and the `turnTilt` visual. `case 'landed'` stays `sounds = ['land']` (visuals come from `landedAt`).

- [ ] **Step 1: Write the failing test.** Append to `tests/game/juiceMapMot3.test.ts`:
```ts
describe('MOT-3-R9 hazard landed', () => {
  const at = (hazardType: 'rock' | 'fence', n: number) => ({ type: 'landedAt', hazardType, cells: Array.from({ length: n }, (_, i) => ({ x: i, y: 2 })) }) as const;
  it('a rock-coloured dust burst per cell (capped), plus a short shake for flagged families', () => {
    const c = mapJuice(at('rock', 6), on);
    const bursts = c.board.filter(v => v.kind === 'burst');
    expect(bursts.length).toBe(e.landCellsMax);
    expect(bursts[0]).toEqual({ kind: 'burst', x: 0, y: 2, color: 'rock', count: e.landDust, speed: j.bursts.dust.speed, lifeMs: j.bursts.dust.lifeMs });
    expect(c.board.at(-1)).toEqual({ kind: 'shake', amplitudePx: e.landShakePx, ms: e.landShakeMs });
    expect(c.sounds).toEqual([]); // the 'land' sound stays on the sim `landed` event
  });
  it('unflagged family: dust only, no shake', () => {
    expect(kinds(mapJuice(at('fence', 2), on))).toEqual(['burst', 'burst']);
  });
  it('the sim landed event keeps its sound and adds no visual', () => {
    const c = mapJuice({ type: 'landed', hazardType: 'rock' }, on);
    expect(c.sounds).toEqual(['land']); expect(kinds(c)).toEqual([]);
  });
  it('MOT-3-R15 reduced: no dust, no shake', () => {
    expect(kinds(mapJuice(at('rock', 3), red))).toEqual([]);
  });
});
describe('MOT-3-R11 mango spawn puff', () => {
  it('a normal spawn puffs in food colour; golden skips the puff; reduced skips it', () => {
    expect(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: false }, on).board).toEqual(
      [{ kind: 'burst', x: 2, y: 3, color: 'food', count: e.spawnPuffCount, speed: j.bursts.eat.speed, lifeMs: e.spawnPuffLifeMs }]);
    expect(kinds(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: true }, on))).toEqual([]);
    expect(kinds(mapJuice({ type: 'mangoSpawned', x: 2, y: 3, golden: false }, red))).toEqual([]);
  });
});
describe('MOT-3-R12 snake turn', () => {
  it('a tilt toward the new direction; none when reduced; no sound or haptic', () => {
    const c = mapJuice({ type: 'turned', dx: 0, dy: 1 }, on);
    expect(c.board).toEqual([{ kind: 'turnTilt', dx: 0, dy: 1, deg: e.turnTiltDeg, ms: e.turnMs }]);
    expect(c.sounds).toEqual([]); expect(c.haptic).toBeNull();
    expect(kinds(mapJuice({ type: 'turned', dx: 0, dy: 1 }, red))).toEqual([]);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/juiceMapMot3` -> the new cases FAIL.
- [ ] **Step 3: Implement.** In `mapJuice` before `default: break;` add:
```ts
    case 'landedAt': // MOT-3-R9 cells were derived from the snapshot (derived.ts landedCells); the 'land' sound is on the sim event
      if (!r) {
        for (const c of ev.cells.slice(0, e.landCellsMax))
          board({ kind: 'burst', x: c.x, y: c.y, color: 'rock', count: e.landDust, speed: j.bursts.dust.speed, lifeMs: j.bursts.dust.lifeMs });
        if (e.landShakeFamilies[ev.hazardType]) board({ kind: 'shake', amplitudePx: e.landShakePx, ms: e.landShakeMs });
      }
      break;
    case 'mangoSpawned': // MOT-3-R11 (a golden mango skips the puff: its sparkle, R13, marks it)
      if (!r && !ev.golden) board({ kind: 'burst', x: ev.x, y: ev.y, color: 'food', count: e.spawnPuffCount, speed: j.bursts.eat.speed, lifeMs: e.spawnPuffLifeMs });
      break;
    case 'turned': // MOT-3-R12
      if (!r) board({ kind: 'turnTilt', dx: ev.dx, dy: ev.dy, deg: e.turnTiltDeg, ms: e.turnMs });
      break;
```
- [ ] **Step 4:** Re-run `tests/game/juiceMapMot3 tests/game/juiceMap` -> PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(juice): MOT-3-R9/R11/R12 rows for landing dust, spawn puff and turn tilt` + CHANGELOG line.

---

### Task 6: `JuicePlayer` remembers the shield slot, supplies the head and dedupes bumps

**Files:** Modify `src/game/juice/JuicePlayer.ts` (`JuiceDeps`, class field, `handleBatch` loop lines ~32-50); Test `tests/game/juicePlayer.test.ts` (append)

**Interfaces:** Consumes `mapJuice` ctx `shieldSlot`/`head`, `dedupeBumps`. Produces optional dep `JuiceDeps.headCell?: () => Pt | null`; `handleBatch` plays the batch's screen visuals once, after `dedupeBumps`. `handle`/`handleBatch` signatures unchanged (derived inputs go through the same `handleBatch`).

- [ ] **Step 1: Write the failing test.** Append to `tests/game/juicePlayer.test.ts` (add `import type { BoardVisual, ScreenVisual } from '../../src/game/juice/types';` at the top; `make`, `j` already exist in the file):
```ts
describe('MOT-3 JuicePlayer', () => {
  const cast = { type: 'skillUsed', slot: 1, skill: 'shield', level: 3, energyBefore: 90, energyAfter: 40 } as const;
  it('MOT-3-R6 the shield slot of the last cast is used by the later shield break (even in a later batch)', () => {
    const seen: ScreenVisual[] = [];
    const m = make({ screen: { play: v => { seen.push(v); } } });
    m.p.handleBatch([cast]); seen.length = 0;
    m.p.handleBatch([{ type: 'shieldBroke', x: 1, y: 1, family: 'rock' }]);
    expect(seen).toEqual([{ kind: 'iconPop', slot: 1, color: 'shield', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs }]);
  });
  it('MOT-3-R6 a break with no remembered cast plays no icon pop', () => {
    const seen: ScreenVisual[] = [];
    make({ screen: { play: v => { seen.push(v); } } }).p.handleBatch([{ type: 'shieldBroke', x: 1, y: 1, family: 'rock' }]);
    expect(seen).toEqual([]);
  });
  it('MOT-3-R8 the head burst uses headCell(); a null head skips it', () => {
    const seen: BoardVisual[] = [];
    const won = { type: 'runWon', score: 1, timeMs: 1 } as const;
    make({ board: { playBoardFx: l => { seen.push(...l); } }, headCell: () => ({ x: 7, y: 8 }) }).p.handleBatch([won]);
    expect(seen.filter(v => v.kind === 'burst').length).toBe(5); expect(seen[1]).toMatchObject({ kind: 'burst', x: 7, y: 8, color: 'gold' });
    seen.length = 0;
    make({ board: { playBoardFx: l => { seen.push(...l); } }, headCell: () => null }).p.handleBatch([won]);
    expect(seen.filter(v => v.kind === 'burst').length).toBe(4);
  });
  it('MOT-3 one level-bar bump per batch: rampEnded + levelUp', () => {
    const m = make();
    m.p.handleBatch([{ type: 'rampEnded', level: 3 }, { type: 'levelUp', level: 3, biome: 0, biomeChanged: false } as never]);
    expect(m.log.screen.filter(k => k === 'barBump').length).toBe(1);
  });
  it('MOT-3-R9/R12 derived inputs enter through handleBatch like any event', () => {
    const m = make();
    m.p.handleBatch([{ type: 'turned', dx: 1, dy: 0 }, { type: 'landedAt', hazardType: 'rock', cells: [{ x: 1, y: 1 }] }, { type: 'mangoSpawned', x: 2, y: 2, golden: false }]);
    expect(m.log.board).toEqual(['turnTilt', 'burst', 'shake', 'burst']);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/juicePlayer` -> new cases FAIL.
- [ ] **Step 3: Implement** in `src/game/juice/JuicePlayer.ts`: change the types import to `import type { BoardVisual, JuiceInput, Pt, ScreenVisual } from './types';`, import `dedupeBumps` with `mapJuice`: `import { dedupeBumps, deathTimeline, mapJuice } from './juiceMap';`; add to `JuiceDeps` after `reduced: () => boolean;`:
```ts
  /** MOT-3-R8 snake head in cell coords, read only when a run is won (HudScene backs it with the Game snapshot). */
  headCell?: () => Pt | null;
```
  add the field `private shieldSlot: 0 | 1 | null = null;` after `private card`. Replace the body of `handleBatch` between `let haptic...` and the final `if (haptic !== null)` with:
```ts
    let haptic: number | number[] | null = null, dying: Parameters<typeof pickDeathLine>[0] | null = null;
    const screens: ScreenVisual[] = [];
    for (const ev of list) {
      const head = ev.type === 'runWon' ? this.d.headCell?.() ?? null : null; // only a win needs the head
      const cue = mapJuice(ev, { balance: this.d.balance, sound: s.sound, haptics: s.haptics, reduced, shieldSlot: this.shieldSlot, head });
      if (ev.type === 'skillUsed' && ev.skill === 'shield') this.shieldSlot = ev.slot; // MOT-3-R6 remembered for the later break
      for (const n of cue.sounds) this.d.synth.play(n);
      if (cue.haptic !== null) haptic = cue.haptic;
      if (cue.board.length) this.d.board.playBoardFx(cue.board);
      screens.push(...cue.screen);
      if (cue.death && !this.dying && dying === null) dying = cue.death.cause;
    }
    for (const v of dedupeBumps(screens)) this.d.screen.play(v); // MOT-3: one bump per HUD target per batch
```
  (keep the existing `if (haptic !== null) this.d.synth.buzz(haptic); if (dying !== null) this.startDeath(dying);` lines after it). Remove the unused `BoardVisual` import if the compiler flags it.
- [ ] **Step 4:** Run `tests/game/juicePlayer tests/game/juiceMap tests/game/juiceMapMot3` -> PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** `feat(juice): MOT-3 JuicePlayer shield slot, head cell and per-batch bump dedupe` + CHANGELOG line.

---

### Task 7: `Effects` ring pulse, golden sparkle and turn tilt (R6, R12, R13 render state)

**Files:** Modify `src/game/render/effects.ts` (imports, `EffectCaps`, fields, `burst` trim line, `update`, `draw`, `reset`); Test `tests/game/effectsMot3.test.ts` (new), `tests/game/effectsCaps.test.ts` (extend the `make` caps)

**Interfaces:** Consumes `cubicOut`, `lerp`, `sineInOut`, `turnTilt` from `../motion/curves`, `trimOldest`. Produces `EffectCaps` extra required keys `ringMax: number; sparkleMax: number; overshoot: number; sparkleRadius: number; sparkleThickness: number` and `Effects` members: `ringPulse(gx, gy, color, scale, ms): void`, `sparkle(gx, gy, color, lifeMs): void`, `clearSparkles(): void`, `turnTilt(dx, dy, deg, ms): void`, readable `turnDeg: number` (current head tilt, degrees) and `turnBulge: number` (0..1, positive part of the same ease). `burst` now trims to `maxParticles - stars alive`. `reset()` clears rings, stars and tilt. Reduced motion makes `ringPulse`, `sparkle` and `turnTilt` no-ops.

- [ ] **Step 1: Write the failing test** `tests/game/effectsMot3.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { Effects, type EffectCaps } from '../../src/game/render/effects';
import { LIGHT } from '../../src/game/render/palette';
import { turnTilt } from '../../src/game/motion/curves';
import { DrawObject, sceneHarness } from '../support/scene';

const caps: EffectCaps = { maxParticles: 10, maxFloats: 2, gulpMs: 100, ringMax: 2, sparkleMax: 3, overshoot: 1.7, sparkleRadius: 0.2, sparkleThickness: 0.06 };
const make = (reduced = false) => new Effects(sceneHarness().scene as never, new DrawObject() as never, 20, reduced, caps);
const priv = (fx: Effects) => fx as unknown as { rings: unknown[]; stars: unknown[]; particles: unknown[] };

describe('MOT-3 Effects', () => {
  it('MOT-3-R2 rings never exceed ringMax (oldest dropped)', () => {
    const fx = make();
    for (let i = 0; i < 6; i++) fx.ringPulse(1, 1, 0xff0000, 2.2, 320);
    expect(priv(fx).rings.length).toBe(2);
  });
  it('MOT-3-R13 stars never exceed sparkleMax and burst trims to maxParticles minus live stars', () => {
    const fx = make();
    for (let i = 0; i < 9; i++) fx.sparkle(2, 2, 0xffcc00, 420);
    expect(priv(fx).stars.length).toBe(3);
    for (let i = 0; i < 40; i++) fx.burst(1, 1, 0xffffff, 10);
    expect(priv(fx).particles.length).toBeLessThanOrEqual(caps.maxParticles - 3);
  });
  it('MOT-3-R13 a star dies after its life and clearSparkles removes all at once', () => {
    const fx = make();
    fx.sparkle(2, 2, 0xffcc00, 420); fx.update(421); expect(priv(fx).stars.length).toBe(0);
    fx.sparkle(2, 2, 0xffcc00, 420); fx.sparkle(3, 3, 0xffcc00, 420); fx.clearSparkles(); expect(priv(fx).stars.length).toBe(0);
  });
  it('MOT-3-R13 a live star draws two crossed rects; a ring draws one stroked circle', () => {
    const fx = make(), g = new DrawObject();
    fx.sparkle(2, 2, 0xffcc00, 420); fx.update(210); fx.draw(g as never, LIGHT);
    expect(g.commands.filter(c => c[0] === 'fillRect').length).toBe(2);
    fx.ringPulse(1, 1, 0xff0000, 2.2, 320); g.clear(); fx.draw(g as never, LIGHT);
    expect(g.commands.filter(c => c[0] === 'strokeCircle').length).toBe(1);
  });
  it('MOT-3-R12 turn tilt starts at +-deg toward the new direction and returns to 0 at turnMs', () => {
    const fx = make();
    fx.turnTilt(1, 0, 10, 140); expect(fx.turnDeg).toBeCloseTo(10, 10); expect(fx.turnBulge).toBeCloseTo(1, 10);
    fx.update(70); expect(fx.turnDeg).toBeCloseTo(turnTilt(70, 140, 10, 1.7), 10);
    fx.update(70); expect(fx.turnDeg).toBeCloseTo(0, 10); expect(fx.turnBulge).toBeCloseTo(0, 10);
    fx.turnTilt(-1, 0, 10, 140); expect(fx.turnDeg).toBeCloseTo(-10, 10);
    fx.turnTilt(0, -1, 10, 140); expect(fx.turnDeg).toBeCloseTo(-10, 10); // up tilts left like left; down tilts right
    fx.turnTilt(0, 1, 10, 140); expect(fx.turnDeg).toBeCloseTo(10, 10);
  });
  it('MOT-3-R12 a rapid second turn restarts the ease from full amplitude', () => {
    const fx = make();
    fx.turnTilt(1, 0, 10, 140); fx.update(100); fx.turnTilt(0, 1, 10, 140);
    expect(fx.turnDeg).toBeCloseTo(10, 10); fx.update(140); expect(fx.turnDeg).toBeCloseTo(0, 10);
  });
  it('MOT-3-R15 reduced motion: ring, sparkle and tilt are no-ops', () => {
    const fx = make(true);
    fx.ringPulse(1, 1, 1, 2, 100); fx.sparkle(1, 1, 1, 100); fx.turnTilt(1, 0, 10, 140);
    expect(priv(fx).rings.length).toBe(0); expect(priv(fx).stars.length).toBe(0); expect(fx.turnDeg).toBe(0);
  });
  it('MOT-3 reset clears rings, stars and tilt', () => {
    const fx = make();
    fx.ringPulse(1, 1, 1, 2, 100); fx.sparkle(1, 1, 1, 100); fx.turnTilt(1, 0, 10, 140); fx.reset();
    expect(priv(fx).rings.length).toBe(0); expect(priv(fx).stars.length).toBe(0); expect(fx.turnDeg).toBe(0); expect(fx.turnBulge).toBe(0);
  });
});
```
  In `tests/game/effectsCaps.test.ts` change the `make` caps literal `{ maxParticles: 5, maxFloats: 2, gulpMs: 100 }` to `{ maxParticles: 5, maxFloats: 2, gulpMs: 100, ringMax: 4, sparkleMax: 3, overshoot: 1.7, sparkleRadius: 0.2, sparkleThickness: 0.06 }`.
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/effectsMot3 tests/game/effectsCaps` -> FAIL.
- [ ] **Step 3: Implement** in `src/game/render/effects.ts`:
  - imports: add `import { cubicOut, lerp, sineInOut, turnTilt } from '../motion/curves';`
  - after `interface FloatScore ...` add
```ts
interface Ring { x: number; y: number; life: number; max: number; scale: number; color: number }
interface Star { x: number; y: number; life: number; max: number; color: number }
const RING_RADIUS_CELL = 0.5; // start radius of a ring pulse in cells
const RING_WIDTH_CELL = 0.08;
```
  - `export interface EffectCaps { maxParticles: number; maxFloats: number; gulpMs: number; ringMax: number; sparkleMax: number; overshoot: number; sparkleRadius: number; sparkleThickness: number }`
  - fields (after `private sweepMoving = false;`):
```ts
  private rings: Ring[] = [];
  private stars: Star[] = [];
  /** MOT-3-R12 current head tilt in degrees (signed) and the ease it follows. */
  turnDeg = 0;
  private turnAmp = 0;
  private turnElapsed = 0;
  private turnMs = 1;
  /** MOT-3-R12 0..1 strength of the first-body-segment bulge (the positive part of the tilt ease). */
  get turnBulge(): number { return this.turnAmp === 0 ? 0 : Math.max(0, this.turnDeg / this.turnAmp); }
```
  - methods (after `sweep(...)`):
```ts
  /** MOT-3-R6 expanding ring in board space; capped by caps.ringMax (oldest dropped). */
  ringPulse(gx: number, gy: number, color: number, scale: number, ms: number): void {
    if (this.reduced) return;
    this.rings.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell, life: ms, max: ms, scale, color });
    trimOldest(this.rings, this.caps.ringMax);
  }
  /** MOT-3-R13 one 4-point star; at most sparkleMax alive, counted inside maxParticles (burst trims around them). */
  sparkle(gx: number, gy: number, color: number, lifeMs: number): void {
    if (this.reduced) return;
    this.stars.push({ x: (gx + 0.5) * this.cell, y: (gy + 0.5) * this.cell, life: lifeMs, max: lifeMs, color });
    trimOldest(this.stars, this.caps.sparkleMax);
    trimOldest(this.particles, Math.max(0, this.caps.maxParticles - this.stars.length));
  }
  clearSparkles(): void { this.stars = []; }
  /** MOT-3-R12 tilt toward the new direction (right/down clockwise, left/up counter-clockwise); a new turn restarts the ease. */
  turnTilt(dx: number, dy: number, deg: number, ms: number): void {
    if (this.reduced) return;
    this.turnAmp = deg * (dx !== 0 ? Math.sign(dx) : Math.sign(dy));
    this.turnElapsed = 0; this.turnMs = ms; this.turnDeg = this.turnAmp;
  }
```
  - in `burst`, replace `trimOldest(this.particles, this.caps.maxParticles);` with `trimOldest(this.particles, Math.max(0, this.caps.maxParticles - this.stars.length));`
  - in `update(dt)`, after `this.floats.length = n;` add
```ts
    n = 0;
    for (const r of this.rings) { r.life -= dt; if (r.life > 0) this.rings[n++] = r; }
    this.rings.length = n; n = 0;
    for (const s of this.stars) { s.life -= dt; if (s.life > 0) this.stars[n++] = s; }
    this.stars.length = n;
    if (this.turnAmp !== 0) {
      this.turnElapsed = Math.min(this.turnMs, this.turnElapsed + dt);
      this.turnDeg = turnTilt(this.turnElapsed, this.turnMs, this.turnAmp, this.caps.overshoot);
    }
```
  - in `draw(g, p)`, after the particles loop add
```ts
    for (const r of this.rings) {
      const k = 1 - r.life / r.max;
      g.lineStyle(this.cell * RING_WIDTH_CELL, r.color, 1 - k).strokeCircle(r.x, r.y, this.cell * RING_RADIUS_CELL * lerp(1, r.scale, cubicOut(k)));
    }
    for (const s of this.stars) {
      const f = 1 - s.life / s.max, arm = this.cell * this.caps.sparkleRadius * sineInOut(1 - Math.abs(2 * f - 1)), w = this.cell * this.caps.sparkleThickness;
      g.fillStyle(s.color, 1).fillRect(s.x - arm, s.y - w / 2, arm * 2, w).fillRect(s.x - w / 2, s.y - arm, w, arm * 2);
    }
```
  - in `reset()` add `this.rings = []; this.stars = []; this.turnAmp = 0; this.turnDeg = 0; this.turnElapsed = 0;`.
- [ ] **Step 4:** Re-run both files -> PASS; `npm run typecheck` (expect `GameScene` to fail on the new required caps until Task 8; to keep the commit green, in this task also extend the `Effects` constructor call in `GameScene.ts` line ~68 with the Task 8 caps literal, see below).
  - `GameScene.ts`: replace `gulpMs: juice.gulpMs });` with
```ts
gulpMs: juice.gulpMs,
        ringMax: juice.events.ringMax, sparkleMax: juice.events.sparkleMax, overshoot: this.balance.motion.overshoot,
        sparkleRadius: juice.events.sparkleRadius, sparkleThickness: juice.events.sparkleThickness });
```
- [ ] **Step 5: Commit** `feat(render): MOT-3 Effects ring pulse, golden sparkle and turn tilt state` + CHANGELOG line.

---

### Task 8: Scene wiring (play the new visuals, derive landing / turn / spawn, golden sparkle driver)

**Files:** Modify `src/game/scenes/GameScene.ts` (imports; fields near line 36; `startRun` ~line 99; `turn` ~line 112; `update` ~line 136-148; `handleEvents` ~line 152; `playBoardFx` ~line 163), `src/game/scenes/HudScene.ts` (`JuicePlayer` construction ~line 65, listener block ~line 88-95, `onEvents` switch ~line 158)

**Interfaces:** Consumes Tasks 3, 6, 7. Produces the Phaser scene event `'derived-juice'` (payload `JuiceInput`) emitted by `GameScene` and forwarded by `HudScene` to `juice.handleBatch([input])`; `HudScene.onEvents` pushes a `landedAt` input after each sim `landed`. No new tween.
**Verification:** Phaser-bound, so no Vitest; `npm run typecheck` plus the browser eye-check below (listed explicitly).

- [ ] **Step 1: `GameScene.ts` edits.**
  - Imports: `import { isTurn, mangoSpawnInput, newSparkleClock, sparkleStep } from '../juice/derived';` and `import type { JuiceInput } from '../juice/types';` (extend the existing `BoardVisual` import from `'../juice/types'` instead if one exists).
  - Fields after `private mangoBornAt = 0;`: `private hadMango = false;` and `private sparkle = newSparkleClock();`
  - `startRun`: after `this.mangoBornAt = this.time.now;` add `this.hadMango = false; this.sparkle = newSparkleClock(); // MOT-3-R11 the first mango of a run pops with a puff`
  - `turn`: replace `if (result.forward) this.session.turn(dx, dy);` with
```ts
    if (result.forward) {
      const s = this.snapshot(); // MOT-3-R12 render-only cue; session.turn timing is untouched
      if (s && isTurn(s.dir, dx, dy)) this.events.emit('derived-juice', { type: 'turned', dx, dy } satisfies JuiceInput);
      this.session.turn(dx, dy);
    }
```
  - `update`: after `this.handleEvents(events);` add `this.derive(snapshot, events, dt);`
  - `handleEvents`: replace the two cases with
```ts
        case 'ate': this.capy.eat(this.time.now); this.mangoBornAt = this.time.now; this.effects.clearSparkles(); break;
        case 'rotted': this.mangoBornAt = this.time.now; this.effects.clearSparkles(); break;
```
  - new method before `playBoardFx`:
```ts
  /** MOT-3-R11/R13 feedback derived from snapshot changes: mango (re)spawn puff + pop clock, golden sparkle driver. Render-side only. */
  private derive(s: SimSnapshot, events: readonly SimEvent[], dt: number): void {
    const spawn = mangoSpawnInput(this.hadMango, events, s.mango);
    this.hadMango = s.mango !== null;
    if (spawn) { this.mangoBornAt = this.time.now; this.events.emit('derived-juice', spawn); }
    const e = this.balance.juice.events, live = !this.reduced && this.flow.status === 'playing';
    const pt = sparkleStep(this.sparkle, dt, e.sparkleEveryMs, live && s.mango?.golden === true, s.mango, e.sparkleRingRadius);
    if (pt) this.playBoardFx([{ kind: 'sparkle', x: pt.x, y: pt.y, color: 'gold', lifeMs: e.sparkleLifeMs }]);
  }
```
  - `playBoardFx` switch: add
```ts
      case 'ringPulse': this.effects.ringPulse(v.x, v.y, colorOf(v.color, p), v.scale, v.ms); break;
      case 'sparkle': this.effects.sparkle(v.x, v.y, colorOf(v.color, p), v.lifeMs); break;
      case 'turnTilt': this.effects.turnTilt(v.dx, v.dy, v.deg, v.ms); break;
```
- [ ] **Step 2: `HudScene.ts` edits.**
  - import `import { landedCells } from '../juice/derived';`
  - in the `new JuicePlayer({...})` literal, after `settings: () => this.session.save().settings, reduced: reduceMotion,` add
```ts
      headCell: () => { const s = this.gameScene.snapshot(); const h = s?.snake[0]; return h ? { x: h.x, y: h.y } : null; }, // MOT-3-R8
```
  - listener block: add `const derived = (i: JuiceInput): void => this.juice.handleBatch([i]);` next to `const flow = ...`; register `this.gameScene.events.on('derived-juice', derived);` after the `'sim-events'` registration line and `this.gameScene.events.off('derived-juice', derived);` in the SHUTDOWN handler.
  - `onEvents` switch: before `case 'skillUnlocked'` add
```ts
      case 'landed': { // MOT-3-R9 the sim event has no coordinates: read the landed cells from the current snapshot
        const s = this.gameScene.snapshot();
        const cells = s ? landedCells(s.hazards, e.hazardType, this.balance.juice.events.landCellsMax) : [];
        if (cells.length) batch.push({ type: 'landedAt', hazardType: e.hazardType, cells });
        break;
      }
```
- [ ] **Step 3:** Run `npm run typecheck`, then `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hud tests/game/boardScene tests/game/boot` (scene harness tests must stay green).
- [ ] **Step 4: Browser eye-check (cannot be unit tested; owner or QA agent).** `npm run dev`, open the game, check each and note pass/fail: (a) a new mango pops from small with a slight overshoot and a green-ish puff, no puff when golden; (b) with `?debug=1` or by playing to a golden mango, a gold star twinkles around the golden mango about every 0.7 s, max 3 at once, vanishing the instant it is eaten; (c) first level with rocks: a rock landing throws dust per cell and a tiny board shake, fence/maze dust only; (d) no console errors; (e) Settings > reduce motion on: none of (a)-(c) animate.
- [ ] **Step 5: Commit** `feat(game): MOT-3 wire derived landing, turn, spawn and golden sparkle feedback` + CHANGELOG line.

---

### Task 9: Snake turn render (head tilt and first-segment bulge, R12)

**Files:** Modify `src/game/render/snake.ts` (`drawSnake` signature line 17 and body after line 35), `src/game/art/capyHead.ts` (`update`), `src/game/scenes/GameScene.ts` (`draw`: the `drawSnake(...)` call ~line 203 and `this.capy.update(...)` ~line 204); Test `tests/game/snakeBulge.test.ts`

**Interfaces:** Produces `drawSnake(g, s, cell, p, gulp, drawFace = true, rim: number | null = null, bulge = 0)` (an extra disc of radius `cell * SNAKE_BODY_CELL / 2 * (1 + bulge)` on the first body point behind the head when `bulge > 0` and a body exists) and `CapyHead.update(s, now, cell, tiltDeg = 0)` (adds `tiltDeg` to the pose rotation). Consumes `Effects.turnDeg`, `Effects.turnBulge`, `juice.events.turnBodyBulge`.

- [ ] **Step 1: Write the failing test** `tests/game/snakeBulge.test.ts`
```ts
import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/core';
import { drawSnake, SNAKE_BODY_CELL } from '../../src/game/render/snake';
import { LIGHT } from '../../src/game/render/palette';
import { loadBalance } from '../support/balance';

function probe() {
  const circles: number[][] = [];
  const g = new Proxy({}, { get: (_o, m: string) => (...a: number[]) => { if (m === 'fillCircle') circles.push(a); return g; } }) as unknown as Phaser.GameObjects.Graphics;
  return { g, circles };
}
const snap = () => ({ ...createSim(loadBalance(), 1).snapshot(), snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }], tailFrom: { x: 2, y: 5 } }) as never;

describe('MOT-3-R12 turn bulge', () => {
  it('bulge 0 draws no extra disc; bulge > 0 adds one disc on the first body point with the scaled radius', () => {
    const a = probe(); drawSnake(a.g, snap(), 30, LIGHT, 0, false, null, 0);
    const b = probe(); drawSnake(b.g, snap(), 30, LIGHT, 0, false, null, 0.06);
    expect(b.circles.length).toBe(a.circles.length + 1);
    const extra = b.circles.at(-1)!;
    expect(extra[0]).toBeCloseTo((4 + 0.5) * 30, 10); expect(extra[1]).toBeCloseTo((5 + 0.5) * 30, 10);
    expect(extra[2]).toBeCloseTo(30 * SNAKE_BODY_CELL / 2 * 1.06, 10);
  });
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/snakeBulge tests/game/snakeRim` -> `snakeBulge` FAILS.
- [ ] **Step 3: Implement.** `snake.ts`: change the signature tail `drawFace = true, rim: number | null = null): void {` to `drawFace = true, rim: number | null = null, bulge = 0): void {` and after the line `  g.fillStyle(p.snake).fillCircle(headPt.x, headPt.y, cell * SNAKE_HEAD_CELL * (1 + 0.18 * gulp));` add
```ts
  // MOT-3-R12 one extra disc on the first body point behind the head (render-only; the head cell does not move)
  if (bulge > 0 && points.length > 2) g.fillStyle(p.snake).fillCircle(points[1]!.x, points[1]!.y, cell * SNAKE_BODY_CELL / 2 * (1 + bulge));
```
  `capyHead.ts`: change `update(s: SimSnapshot, now: number, cell: number): void {` to `update(s: SimSnapshot, now: number, cell: number, tiltDeg = 0): void {` and `.setAngle(pose.rotationDeg);` to `.setAngle(pose.rotationDeg + tiltDeg); // MOT-3-R12 turn tilt (0 when reduced: Effects never sets it)`.
  `GameScene.draw`: append `, this.effects.turnBulge * (this.balance.juice.events.turnBodyBulge - 1)` as the last argument of the `drawSnake(...)` call (after `this.look.snakeRim`), and change `this.capy.update(snapshot, time, cell);` to `this.capy.update(snapshot, time, cell, this.effects.turnDeg);`.
- [ ] **Step 4:** Re-run `tests/game/snakeBulge tests/game/snakeRim tests/game/capyPose tests/game/capyRig` -> PASS; `npm run typecheck`.
- [ ] **Step 5: Browser eye-check (the head tilt cannot be unit tested).** In `npm run dev`: turn at the fastest speed and under Slow-mo; the capy face tilts about 10 degrees toward the new direction and settles in about 140 ms with a small bounce, the first body segment swells slightly, the head cell never moves; rapid zig-zag turns do not accumulate drift; with reduce motion on nothing tilts.
- [ ] **Step 6: Commit** `feat(render): MOT-3-R12 capy head tilt and first-segment bulge on a turn` + CHANGELOG line.

---

### Task 10: Docs, full verification and merge

**Files:** Modify `docs/GDD.md` (section 10.4 table, lines ~236-245), `docs/CODEMAP.md` (juice rows ~27-33, `render/effects`, `motion/curves`, config note ~line 12), `docs/DECISIONS.md` (append), `docs/STATUS.md` (rewrite Now/Next/Last session, keep <= 60 lines), `CHANGELOG.md`

- [ ] **Step 1: GDD 10.4.** Add these rows to the table (before `Marble machine`), and extend the status line to mention MOT-3 (`numbers in balance.juice.events`):

| Event | Visual | Sound | Haptic |
|---|---|---|---|
| Shield breaks | shield-blue burst and expanding ring, short shake, board tint ends, shield icon pops | shield break | none |
| Skill unlocked | skill icon pops bigger, sparks fly from the board centre to the energy bar | unlock | none |
| Run won | long gold glow, gold bursts at the head and the four corners, gold flash, snake pop | biome jingle | none |
| Hazard lands | dust per landed cell, tiny shake for heavy rocks | land | none |
| Ramp ends (GO) | soft food-coloured flash, snake pop, level bar bump | go | none |
| Mango appears | pops in from 85% with a small overshoot, tiny puff (none for golden) | none | none |
| Snake turns | capy face tilts about 10 degrees toward the turn, first body segment swells, 140 ms | none | none |
| Golden mango waits | a gold 4-point star twinkles on its ring about every 0.7 s | none | none |

- [ ] **Step 2: CODEMAP.** Add a row `src/game/juice/derived.ts` (pure `landedCells`, `isTurn`, `mangoSpawnInput`, `sparkleStep`; MOT-3-R9/R11/R12/R13; test `tests/game/juiceDerived.test.ts`); update the `juiceMap.ts` row (`dedupeBumps`, MOT-3 rows), the `JuicePlayer.ts` row (shield slot, `headCell`, bump dedupe), the `types.ts` row (`ringPulse`, `sparkle`, `turnTilt`, derived inputs), the `render/effects` mention (ring pulse, sparkle, turn tilt) and the `motion/curves` mention (`mangoGrow`, `turnTilt`); in the config row add `juice.events = MOT-3 run-event numbers`. Run `grep -n "juice" docs/CODEMAP.md` first to edit the existing rows in place.
- [ ] **Step 3: DECISIONS** (append, dated 2026-11-10): (1) MOT-3 derives hazard cells, turns and mango respawn feedback on the render side and feeds them through `JuicePlayer.handleBatch` as extra `JuiceInput` members (no new sim events, spec R5); (2) rulings A1-A8 of this plan (landShakeFamilies on `rock`, `mangoGrow` fifth parameter, `drawMango` takes `grow`, `bulge` argument on `drawSnake`, `headCell` dep, extra config keys).
- [ ] **Step 4: STATUS + CHANGELOG.** Rewrite `docs/STATUS.md` Now/Next/Blockers/Last session (MOT-3 merged into `version/v0.3`; Next: MOT-4; Blocker: owner phone eye-check of Tasks 8-9 items, 60 fps on the P3a device checklist). Add the CHANGELOG line `docs: MOT-3 GDD 10.4 rows, CODEMAP, DECISIONS, STATUS`.
- [ ] **Step 5: Full verification (sequentially, evidence before claims).**
```bash
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
```
  Expected: all tests pass (previous count plus the new MOT-3 tests), typecheck clean. Then `grep -rn "scene.tweens.add\|this.tweens.add" src/game/render/effects.ts src/game/juice/derived.ts src/game/juice/juiceMap.ts` must print nothing (no new tween path), and `grep -rn "Math.random" src/game/juice` must print nothing (sparkle uses the golden-angle counter).
- [ ] **Step 6: Commit** the docs: `git add docs CHANGELOG.md && git commit -m "docs: MOT-3 GDD 10.4 rows, CODEMAP, DECISIONS, STATUS" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`.
- [ ] **Step 7: Merge into `version/v0.3`** (no PR, per AGENTS 6; only after tests + typecheck above passed and the owner eye-check items of Tasks 8-9 are accepted or logged in STATUS as the open blocker):
```bash
git checkout version/v0.3
git merge --no-ff feat/motion-3-run-event-feedback -m "Merge branch 'feat/motion-3-run-event-feedback' into version/v0.3"
```
  Then refresh the code graph in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`. Do not push.

---

## Self-review (spec coverage)
- R1-R5 (extend, budgets, config, reduced, no sim impact): Global Constraints + Tasks 1, 4-7; validator caps in Task 1; reduced tests in Tasks 4, 5, 7.
- R6 Task 4 (+ Task 6 slot memory, Task 7 ring); R7 Task 4; R8 Task 4 (+ Task 6/8 head); R9 Tasks 3, 5, 8 (landing derivation); R10 Task 4; R11 Tasks 2, 3, 5, 8; R12 Tasks 3, 5, 7, 9; R13 Tasks 3, 7, 8; R14 intentionally absent (moved to MOT-4-R8); R15 reduced rows in Tasks 4, 5 and Effects no-ops in Task 7.
- Spec section 5 plug-ins: `BoardVisual`/`JuiceInput` members (Task 3), `dedupeBumps` (Task 4), `JuicePlayer` (Task 6), `playBoardFx` cases + `Effects` (Tasks 7, 8), `mango.ts`/`snake.ts` (Tasks 2, 9). Section 7 tests: `mapJuice` rows, `dedupeBumps`, `mangoGrow`, tilt endpoints, sparkle determinism, config validation, Effects caps and `reset()` all have named tests. Section 11: GDD 10.4 rows and CODEMAP in Task 10; browser checks (shield readable on a 5" phone, win length, turn tilt at fastest speed and Slow-mo, sparkle in every biome palette, 60 fps) are listed in Tasks 8-9 and STATUS and need the owner's phone.
- Open browser-only item not covered by a numbered step: shield break readability, win-glow length and sparkle visibility per biome palette (trigger a shield break, win level 30 via debug, golden mango in each biome) are owner phone checks; recorded as the STATUS blocker in Task 10.
- Placeholder scan: no TBD/TODO; every code step has real code. Type consistency: `EffectCaps` keys (Task 7) match the `GameScene` literal; `turnDeg`/`turnBulge` (Task 7) are the names used in Task 9; `landedCells`, `isTurn`, `mangoSpawnInput`, `newSparkleClock`, `sparkleStep` (Task 3) match Task 8; `mangoGrow(timeMs, bornAt, ms, s, from)` (Task 2) matches its call; `JuiceDeps.headCell` (Task 6) matches `HudScene`.
