# MOT-4 Hazard Telegraphs and HUD Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every hazard warning one shared "tightening pulse" derived from the snapshot's remaining warn time, add a hit beat on warn to live, and animate the in-run HUD numbers (score, quota, energy, skill ready, level title, chip) through the MOT-0 motion API.

**Architecture:** A pure `src/game/render/telegraph.ts` (`telegraphPulse`, `steadyPulse`, `TelegraphCtx`) turns `(remainingMs, warnMs)` into `{phase, hz, alpha, scale, urgent}` with no wall clock and no state. The nine draw functions call it instead of `blinkOn` / ad-hoc sines. A pure `hitBeat.ts` diffs two snapshots into beat edges and a small `HitBeats` registry plays them through `motion.snap`. `GameScene` owns one `HitBeats`, the previous snapshot and a `TelegraphCtx`. HUD behaviour is split into pure helpers (`hudMotion.ts`) and the Phaser views `HudTop` / `SkillButtons`, which only call `motionFor(scene)`.

**Tech Stack:** TypeScript strict, Phaser 3.90 (Graphics, MOT-0 `motionFor`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-motion-4-telegraph-hud-feedback-design.md` (read it first; this plan covers all of it). MOT-0 API: `src/game/motion/{curves,motionCore,motion,index}.ts`, `balance.motion` in `config/balance.json`.

## Global Constraints
- Branch: this plan file lives on `plan/motion-4`. Execute on `feat/motion-4-telegraph-hud` created from `version/v0.3` (Task 1 Step 1). One task = one commit; merge into `version/v0.3` with `--no-ff` in Task 13. Never push.
- Windows test flags: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <pattern>`; full suite `npm test -- --configLoader native --pool threads --maxWorkers 2`; `npm run typecheck`. Run only the touched tests while working (AGENTS 6b); full suite + typecheck sequentially before the merge.
- English only. Conventional Commits; every commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and adds one `## [Unreleased]` line to `CHANGELOG.md` in the same commit.
- Motion only reads snapshot values. It never changes the sim, a warn duration or a hit time. Sim code is touched in exactly one place (Task 5: two additive snapshot fields, no rule change).
- New code never calls `scene.tweens.add`; it uses `motionFor(scene)` (`snap`, `ease`, `release`, `popIn`, `slideIn`, `fadeIn`, `fadeOut`, `pulse`, `shake`). Old `scene.tweens` calls in the files touched here are migrated (Tasks 11, 12) or left only where stated.
- No magic numbers: every duration, scale, alpha floor and threshold is a `balance.motion` key (Task 2 adds the two the spec names but the key table omits). Mockup-px presentation constants stay in the existing `M` objects of `HudTop.ts` / `SkillButtons.ts`. No colour hex outside `boardParts.ts` / `uiTokens.ts` (reuse `PART.warn.dash`, `PART.stone.warnDash`, `RING.warn`, `TOKENS.danger`).
- `reduceMotion()` true: pulses static at full alpha and scale 1, no hit beat, no digit pop; the urgent hard-colour step still applies (spec section 4). Light mode only (no dark-theme work).
- Reduced-motion and warn-never-shorter rules: the warn is drawn for the full `warnMs`, gated on snapshot state and never on pulse phase (MOT-4-R3). `blinkOn` stays exported (its tests stay) but no draw function calls it after Task 8.
- Test names carry `MOT-4-Rn`. Before editing a symbol run `node .gitnexus/run.cjs status` (analyze if stale) and GitNexus `impact` on `drawWarn`, `drawHazards`, `drawTiles`, `drawMovers`, `drawCycles`, `drawBlasts`, `drawShrink`, `HudTop.apply`, `SkillButtons.apply` (AGENTS 2c). After the merge: `node .gitnexus/run.cjs analyze --index-only --workers 2` in the background.

## Confirmed facts (Task 1 locks them in tests)
**Direction of hazard `t` (the spec asked Task 1 to confirm): `t` counts ELAPSED warn ms, so `remainingMs = warnMs - t`.** Evidence:
- `src/core/hazards/timed.ts` `updateTimed`: `h.t += 1; if (h.state === 'warn' && h.t >= h.warnMs) { h.state = 'solid'; h.t = 0; }`. `makeTimed` starts at `t: 0`. `drawHazards` already computes `progress = ms / h.warnMs` with `ms = h.t`.
- `src/core/hazards/blocks/mover.ts` `stepMover`: `m.t += 1; if (m.state === 'warn') { if (m.t < m.warnMs) return 'keep'; ... }` (coconut and npc `t` is elapsed too).
- `src/core/hazards/blocks/groundTiles.ts`: `if (p.state === 'warn' && p.t >= p.warnMs)`; but the SNAPSHOT tile view exposes `leftMs` = REMAINING (`src/core/sim.ts` line 101: `Math.max(0, warnMs - p.t)`), with no `warnMs`.
- `bombSnapshot` (`src/core/hazards/bomb.ts` line 18): warn `leftMs = max(0, m.warnMs - m.t)` = REMAINING; count phase `leftMs` = `blast.countdownMs` remaining.
- `shrinkSnapshot` (`src/core/hazards/shrink.ts` line 47): `leftMs = max(0, end - a.t)` = REMAINING of the current phase.
- Terrain: `TerrainView.t` is elapsed level-terrain time; `drawTerrains` derives the per-cell elapsed warn time `ct` (elapsed) from it and `b.terrain`.
- **Gap found:** `GateView.gate[]` and `SpikeView.cells[]` expose only `vis`, no remaining time, and `HazardView`/tile views do not carry ids the hit-beat diff can use for hazards. Task 5 adds additive `warnLeftMs` to gate/spike cells; hazards are keyed by `type` + first cell.

| Family | Remaining source for `telegraphPulse(remainingMs, warnMs, cfg)` |
|---|---|
| Rock warn / fence / maze | `h.warnMs - ms` with `ms = h.state === 'warn' ? h.t : h.warnMs`; `warnMs = h.warnMs` |
| Rise tile (terrain) | `b.terrain.warnMs - ct`; `warnMs = b.terrain.warnMs` |
| Mud / ice tile | `tile.leftMs`; `warnMs = b.mud.warnMs` / `b.ice.warnMs` (via `TelegraphCtx.warnMs`) |
| Coconut / NPC lane | `c.warnMs - c.t`; `warnMs = c.warnMs` |
| Gate / spike cell | `cell.warnLeftMs` (Task 5); `warnMs = b.gate.warnMs` / `b.spike.warnMs` |
| Bomb warn | `b.leftMs`; `warnMs = b.bomb.warnMs` |
| Bomb count (outline) | `b.leftMs`; `warnMs = b.bomb.countdownMs` |
| Shrinking ring | warn: `ring.leftMs`, `warnMs = b.shrink.warnMs`; closed: steady; fade: `steadyPulse` at `telegraphHzStart` |

## Deviations from the spec (all small, all recorded in DECISIONS in Task 13)
1. Two extra `balance.motion` keys the spec prose uses but its table omits: `digitPopScale` (1.2, "1.2 to 1" in the bomb digit row) and `readyDipMs` (80, R11 "80 ms alpha dip"). Task 2.
2. Score tick-up runs through `motion.ease` on a proxy value, not `motion.countUp` on the Text: the P3a `HudTop.bump` kills tweens on the score Text, which would freeze a `countUp` mid-count. The curve is the same `cubicOut`; `countUpValue` is unchanged and still tested by MOT-0. `bump` itself moves onto `motion.snap` so every HUD motion on a target obeys kill-by-target.
3. `Motion` gains `snap(t, peak, ms, onDone?)` and `ease(proxy, to, ms, onUpdate)` (Task 4): MOT-0 has no generic "scale up and back" or "tween a number" primitive and R5/R7/R8/R9/R11 need both. No change to existing methods.
4. Hazards have no id in `HazardView`; the hit-beat key is `type` + first cell (cells of live hazards are unique by the reservation rules).

## File map
- Create `src/game/render/telegraph.ts` (pure pulse, steady pulse, ctx, key helpers), `src/game/render/hitBeat.ts` (`telegraphEdges`, `HitBeats`), `src/game/hud/hudMotion.ts` (pure HUD helpers), `tests/support/telegraph.ts` (`TEL` fixture)
- Create `tests/core/warnDirection.test.ts`, `tests/game/telegraph.test.ts`, `tests/game/hitBeat.test.ts`, `tests/game/hudMotion.test.ts`
- Modify `src/core/balance.ts`, `config/balance.json`, `tests/core/balanceMotion.test.ts` (Task 2)
- Modify `src/game/motion/motionCore.ts`, `tests/game/motionCore.test.ts` (Task 4)
- Modify `src/core/types.ts`, `src/core/hazards/blocks/cycleCells.ts`, `src/core/hazards/gate.ts`, `src/core/hazards/spike.ts`, `src/core/sim.ts`, `tests/core/hazards/cycleCells.test.ts` (Task 5)
- Modify `src/game/render/hazards.ts`, `tiles.ts`, `movers.ts`, `cycles.ts`, `blasts.ts`, `shrink.ts`; tests `tests/game/hazardArt.test.ts`, `tiles.test.ts`, `p2bRender.test.ts` (Tasks 6 to 8)
- Modify `src/game/scenes/GameScene.ts` (Task 9)
- Modify `src/game/hud/hudModel.ts`, `HudTop.ts`, `SkillButtons.ts`, `tests/game/hudModel.test.ts`, `tests/support/scene.ts` (Tasks 10 to 12)
- Modify `docs/CODEMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md`, MEC-004/013/014/017/018 section 8 (Task 13)

---

### Task 1: Confirm the direction of `t` and lock it with characterization tests

**Files:** Test `tests/core/warnDirection.test.ts` (no source change)

**Interfaces:** Consumes `makeTimed`, `updateTimed` (`src/core/hazards/timed.ts`), `bombSnapshot`, `shrinkSnapshot`. Produces nothing; documents the contract "hazard/coconut `t` = elapsed, bomb/shrink/tile `leftMs` = remaining" that Tasks 3 to 9 rely on.

- [ ] **Step 1: Branch.** `git checkout -b feat/motion-4-telegraph-hud version/v0.3`. The "Confirmed facts" section above is the recorded answer; the tests below make it executable.
- [ ] **Step 2: Write the test** `tests/core/warnDirection.test.ts`
```ts
import '../../src/core/simInternal'; // loads the hazard registry before the family modules (import cycle)
import { expect, it } from 'vitest';
import { bombSnapshot } from '../../src/core/hazards/bomb';
import { shrinkSnapshot } from '../../src/core/hazards/shrink';
import { makeTimed, updateTimed } from '../../src/core/hazards/timed';
import type { SimState, StepCtx } from '../../src/core/types';
import { loadBalance } from '../support/balance';

const b = loadBalance();

it('MOT-4-R1 a warning hazard t counts ELAPSED warn ms (remaining = warnMs - t) and resets to 0 on the live edge', () => {
  const h = makeTimed('rock', [{ x: 1, y: 1 }], 1000, 5000);
  const ctx = { snakeOn: () => false, emit: () => {}, balance: b } as unknown as StepCtx;
  for (let i = 0; i < 250; i++) updateTimed(h, ctx);
  expect(h.state).toBe('warn');
  expect(h.t).toBe(250);
  expect(h.warnMs - h.t).toBe(750);
  for (let i = 0; i < 750; i++) updateTimed(h, ctx);
  expect(h.state).toBe('solid');
  expect(h.t).toBeLessThan(5);
});

it('MOT-4-R1 a warning bomb snapshot leftMs is REMAINING warn ms', () => {
  const s = { families: { bomb: { bombs: [{ id: 1, x: 2, y: 2, t: 400, warnMs: 1000, landed: false, blast: null }] } } } as unknown as SimState;
  expect(bombSnapshot(s)[0]).toMatchObject({ state: 'warn', leftMs: 600 });
});

it('MOT-4-R1 a warning ring snapshot leftMs is REMAINING phase ms', () => {
  const s = { families: { shrink: { active: { t: 500, phase: 'warn', cells: [] } } } } as unknown as SimState;
  expect(shrinkSnapshot(s, b)).toMatchObject({ state: 'warn', leftMs: b.shrink.warnMs - 500 });
});
```
- [ ] **Step 3: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/warnDirection` -> PASS (characterization of existing behaviour; if any case fails, STOP and correct the "Confirmed facts" table and every later `remainingMs` expression before continuing).
- [ ] **Step 4: Commit.**
```bash
git add tests/core/warnDirection.test.ts CHANGELOG.md
git commit -m "test(motion): MOT-4 lock warn-time direction (t elapsed, leftMs remaining)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
CHANGELOG line (add before committing): `- test(motion): MOT-4 characterize warn-time direction for telegraph pulses`.

---

### Task 2: `balance.motion` additions and validator rules

**Files:** Modify `src/core/balance.ts` (`MotionBalance` ~line 20-27, schema `motion:` ~line 244-251, validator ~line 363-374); `config/balance.json` (`"motion"` block, line ~122); Test `tests/core/balanceMotion.test.ts`

**Interfaces:** Produces `MotionBalance.digitPopScale: number`, `MotionBalance.readyDipMs: number`. MOT-0 already has the other ten MOT-4 keys (`telegraphHzStart` ... `energyLowFrac`), `telegraphHzEnd > telegraphHzStart` and `telegraphSnapScale in (1,2)` validators and positive-number schema checks; this task adds only what is missing.

- [ ] **Step 1: Write the failing tests.** Append to `tests/core/balanceMotion.test.ts`:
```ts
describe('MOT-4 balance.motion', () => {
  it('MOT-4 config exposes the telegraph and HUD keys', () => {
    const m = loadBalance().motion;
    expect(m.telegraphHzStart).toBe(2); expect(m.telegraphHzEnd).toBe(6); expect(m.telegraphAlphaMin).toBe(0.55);
    expect(m.telegraphUrgentMs).toBe(300); expect(m.hudTickMs).toBe(360); expect(m.energyLowFrac).toBe(0.2);
    expect(m.digitPopScale).toBe(1.2); expect(m.readyDipMs).toBe(80);
  });
  it('MOT-4 rejects telegraphAlphaMin outside (0, 1), digitPopScale outside (1, 2), telegraphSnapScale outside (1, 2)', () => {
    expect(() => loadBalance(withMotion({ telegraphAlphaMin: 0 }))).toThrow(/motion\.telegraphAlphaMin/);
    expect(() => loadBalance(withMotion({ telegraphAlphaMin: 1 }))).toThrow(/motion\.telegraphAlphaMin/);
    expect(() => loadBalance(withMotion({ digitPopScale: 1 }))).toThrow(/motion\.digitPopScale/);
    expect(() => loadBalance(withMotion({ digitPopScale: 2 }))).toThrow(/motion\.digitPopScale/);
    expect(() => loadBalance(withMotion({ telegraphSnapScale: 1 }))).toThrow(/motion\.telegraphSnapScale/);
  });
  it('MOT-4 rejects non-positive telegraph and HUD durations', () => {
    for (const k of ['telegraphHzStart', 'telegraphUrgentMs', 'telegraphSnapMs', 'digitPopMs', 'hudTickMs', 'barEaseMs', 'barSpendMs', 'readyDipMs'])
      expect(() => loadBalance(withMotion({ [k]: 0 }))).toThrow(new RegExp(`motion\\.${k}`));
  });
});
```
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/balanceMotion` -> FAIL (`digitPopScale` undefined / not rejected).
- [ ] **Step 3: Implement.**
  - `src/core/balance.ts` `MotionBalance`: append to the last line `... barSpendMs: number; energyLowFrac: number;` the fields `digitPopScale: number; readyDipMs: number;` (new line right after).
  - Schema `motion:` block: after `energyLowFrac: 'prob',` add `digitPopScale: 'num+', readyDipMs: 'int+',` (same line is fine).
  - Validator, after the `telegraphSnapScale` line (~371) add:
```ts
  if (mo.telegraphAlphaMin <= 0 || mo.telegraphAlphaMin >= 1) fail('motion.telegraphAlphaMin', 'must be in (0, 1)');
  if (mo.digitPopScale <= 1 || mo.digitPopScale >= 2) fail('motion.digitPopScale', 'must be in (1, 2)');
```
  - `config/balance.json` line ~122: change the trailing `"barSpendMs": 160, "energyLowFrac": 0.2` to `"barSpendMs": 160, "energyLowFrac": 0.2,` and add a new line `    "digitPopScale": 1.2, "readyDipMs": 80` before the closing `}` of `motion`.
- [ ] **Step 4: Run** the same command -> PASS. Then `npm run typecheck`.
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(balance): MOT-4 digitPopScale and readyDipMs motion keys, alpha-min and pop-scale validators`.
```bash
git add src/core/balance.ts config/balance.json tests/core/balanceMotion.test.ts CHANGELOG.md
git commit -m "feat(balance): MOT-4 motion keys and validators

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Pure `telegraph.ts` (R1, R2, R3, R6) and the `TEL` test fixture

**Files:** Create `src/game/render/telegraph.ts`, `tests/support/telegraph.ts`; Test `tests/game/telegraph.test.ts`

**Interfaces:**
- Consumes `clamp01`, `cubicOut`, `lerp` (`src/game/motion/curves.ts`), `MotionBalance` / `Balance` types.
- Produces (all exported from `src/game/render/telegraph.ts`):
  - `type TelegraphCfg = Pick<MotionBalance, 'telegraphHzStart' | 'telegraphHzEnd' | 'telegraphAlphaMin' | 'telegraphScaleAmp' | 'telegraphUrgentMs'>`
  - `interface Pulse { phase: number; hz: number; alpha: number; scale: number; progress: number; urgent: boolean }`
  - `newPulse(): Pulse`
  - `telegraphPulse(remainingMs: number, warnMs: number, cfg: TelegraphCfg, reduced?: boolean, out?: Pulse): Pulse` (writes into `out`, returns it)
  - `steadyPulse(timeMs: number, cfg: TelegraphCfg, reduced?: boolean, out?: Pulse): Pulse`
  - `interface TelegraphCtx { cfg: TelegraphCfg; warnMs: { mud: number; ice: number; gate: number; spike: number; bomb: number; bombCount: number; shrink: number }; beat(key: string): number }`
  - `telegraphCtx(b: Balance, beat?: (key: string) => number): TelegraphCtx`
  - `hazardKey(h: { type: string; cells: readonly { x: number; y: number }[] }): string` -> `h:${type}:${x},${y}`
  - `cellKey(prefix: 'g' | 's', id: number, x: number, y: number): string` -> `${prefix}:${id}:${x},${y}`
- `tests/support/telegraph.ts` produces `TEL: TelegraphCtx` (`telegraphCtx(loadBalance())`).

- [ ] **Step 1: Write the failing test** `tests/game/telegraph.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { cellKey, hazardKey, steadyPulse, telegraphCtx, telegraphPulse } from '../../src/game/render/telegraph';
import { loadBalance } from '../support/balance';

const b = loadBalance(), cfg = b.motion;

describe('MOT-4 telegraphPulse', () => {
  it('MOT-4-R1 endpoints: progress 0 at full remaining time (start hz, bright), progress 1 at the hit (end hz)', () => {
    const a = telegraphPulse(1000, 1000, cfg);
    expect(a.progress).toBe(0); expect(a.hz).toBeCloseTo(cfg.telegraphHzStart, 10); expect(a.phase).toBe(0); expect(a.alpha).toBeCloseTo(1, 10);
    const z = telegraphPulse(0, 1000, cfg);
    expect(z.progress).toBe(1); expect(z.hz).toBeCloseTo(cfg.telegraphHzEnd, 10);
    expect(telegraphPulse(5000, 1000, cfg).progress).toBe(0); expect(telegraphPulse(-5, 1000, cfg).progress).toBe(1);
  });
  it('MOT-4-R1 hz and phase are monotone non-decreasing as the remaining time falls', () => {
    let hz = -1, phase = -1;
    for (let left = 1000; left >= 0; left -= 7) {
      const p = telegraphPulse(left, 1000, cfg);
      expect(p.hz).toBeGreaterThanOrEqual(hz); expect(p.phase).toBeGreaterThanOrEqual(phase); hz = p.hz; phase = p.phase;
    }
  });
  it('MOT-4-R1 pure: the same snapshot gives the same result, whatever the call order', () => {
    const lefts = [900, 100, 450, 0, 1000, 300, 301, 299];
    const first = lefts.map(l => JSON.stringify(telegraphPulse(l, 1000, cfg)));
    const second = [...lefts].reverse().map(l => JSON.stringify(telegraphPulse(l, 1000, cfg))).reverse();
    expect(second).toEqual(first);
  });
  it('MOT-4-R2 alpha never drops below telegraphAlphaMin and scale stays within 1 +/- amp for every ms of the warn', () => {
    for (let left = 0; left <= 1000; left++) {
      const p = telegraphPulse(left, 1000, cfg);
      expect(p.alpha).toBeGreaterThanOrEqual(cfg.telegraphAlphaMin - 1e-9); expect(p.alpha).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(p.scale - 1)).toBeLessThanOrEqual(cfg.telegraphScaleAmp + 1e-9);
    }
  });
  it('MOT-4-R6 urgent only in the last telegraphUrgentMs', () => {
    expect(telegraphPulse(cfg.telegraphUrgentMs, 1000, cfg).urgent).toBe(true);
    expect(telegraphPulse(cfg.telegraphUrgentMs + 1, 1000, cfg).urgent).toBe(false);
    expect(telegraphPulse(0, 1000, cfg).urgent).toBe(true);
  });
  it('MOT-4 reduced motion: static full alpha and scale 1, but the urgent colour step still applies', () => {
    const p = telegraphPulse(100, 1000, cfg, true);
    expect(p.alpha).toBe(1); expect(p.scale).toBe(1); expect(p.phase).toBe(0); expect(p.urgent).toBe(true);
  });
  it('MOT-4-R4 steadyPulse runs at the start rate regardless of progress (ring fade phase)', () => {
    const p = steadyPulse(1000, cfg);
    expect(p.hz).toBe(cfg.telegraphHzStart); expect(p.phase).toBeCloseTo(cfg.telegraphHzStart, 10); expect(p.urgent).toBe(false);
    expect(steadyPulse(1000, cfg, true).alpha).toBe(1);
  });
  it('MOT-4-R3 every fairness-covered family warns at least fairness.minWarnMs (the warn is never shortened by motion)', () => {
    for (const family of ['rock', 'fence', 'maze', 'terrain', 'mud', 'ice', 'coconut', 'gate', 'spike', 'npc', 'bomb'] as const)
      expect(b[family].warnMs, family).toBeGreaterThanOrEqual(b.fairness.minWarnMs);
  });
  it('MOT-4-R3 the pulse layer never hides a warn frame: alpha stays positive across each family full warn', () => {
    for (const warn of [b.rock.warnMs, b.bomb.warnMs, b.gate.warnMs, b.coconut.warnMs])
      for (let left = warn; left >= 0; left -= 10) expect(telegraphPulse(left, warn, cfg).alpha).toBeGreaterThan(0);
  });
  it('MOT-4 telegraphCtx reads the family warn times from balance and defaults the beat to 1', () => {
    const t = telegraphCtx(b);
    expect(t.warnMs).toEqual({ mud: b.mud.warnMs, ice: b.ice.warnMs, gate: b.gate.warnMs, spike: b.spike.warnMs,
      bomb: b.bomb.warnMs, bombCount: b.bomb.countdownMs, shrink: b.shrink.warnMs });
    expect(t.beat('h:rock:1,1')).toBe(1); expect(telegraphCtx(b, () => 1.1).beat('x')).toBe(1.1);
  });
  it('MOT-4-R5 beat keys: hazards by type and first cell, cycle cells by id and cell', () => {
    expect(hazardKey({ type: 'rock', cells: [{ x: 3, y: 4 }, { x: 4, y: 4 }] })).toBe('h:rock:3,4');
    expect(cellKey('g', 7, 2, 5)).toBe('g:7:2,5'); expect(cellKey('s', 1, 0, 0)).toBe('s:1:0,0');
  });
});
```
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/telegraph` -> FAIL (module missing).
- [ ] **Step 3: Implement** `src/game/render/telegraph.ts`
```ts
// MOT-4 pure hazard telegraph pulse: rhythm tightens from telegraphHzStart to telegraphHzEnd as the warn runs out (R1, R2, R6).
// No wall clock, no accumulated state: the same (remainingMs, warnMs) always gives the same result. Spec: 2026-11-10-motion-4-telegraph-hud-feedback-design.md.
import type { Balance } from '../../core';
import type { MotionBalance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';

export type TelegraphCfg = Pick<MotionBalance, 'telegraphHzStart' | 'telegraphHzEnd' | 'telegraphAlphaMin' | 'telegraphScaleAmp' | 'telegraphUrgentMs'>;
export interface Pulse { phase: number; hz: number; alpha: number; scale: number; progress: number; urgent: boolean }
export const newPulse = (): Pulse => ({ phase: 0, hz: 0, alpha: 1, scale: 1, progress: 0, urgent: false });

const wave = (phase: number): number => 0.5 + 0.5 * Math.cos(2 * Math.PI * phase);

/** MOT-4-R1 pulse for one warning. `out` is reused by draw code (allocation-free); reduced motion = static alpha 1 / scale 1 (urgent still set). */
export function telegraphPulse(remainingMs: number, warnMs: number, cfg: TelegraphCfg, reduced = false, out: Pulse = newPulse()): Pulse {
  const left = Math.min(Math.max(0, remainingMs), Math.max(0, warnMs));
  const progress = warnMs > 0 ? clamp01(1 - left / warnMs) : 1;
  const hz = lerp(cfg.telegraphHzStart, cfg.telegraphHzEnd, cubicOut(progress));
  out.progress = progress; out.hz = hz; out.urgent = left <= cfg.telegraphUrgentMs;
  if (reduced) { out.phase = 0; out.alpha = 1; out.scale = 1; return out; }
  // Closed form: elapsed seconds times the mean of the start rate and the current rate (hz never decreases, so phase never decreases).
  const phase = ((warnMs - left) / 1000) * (cfg.telegraphHzStart + hz) / 2, w = wave(phase);
  out.phase = phase; out.alpha = lerp(cfg.telegraphAlphaMin, 1, w); out.scale = 1 + cfg.telegraphScaleAmp * (2 * w - 1);
  return out;
}

/** MOT-4-R4 ring fade phase: a fixed-rate pulse on wall time (no warn to run out). */
export function steadyPulse(timeMs: number, cfg: TelegraphCfg, reduced = false, out: Pulse = newPulse()): Pulse {
  out.progress = 0; out.hz = cfg.telegraphHzStart; out.urgent = false;
  if (reduced) { out.phase = 0; out.alpha = 1; out.scale = 1; return out; }
  const phase = (timeMs / 1000) * cfg.telegraphHzStart, w = wave(phase);
  out.phase = phase; out.alpha = lerp(cfg.telegraphAlphaMin, 1, w); out.scale = 1 + cfg.telegraphScaleAmp * (2 * w - 1);
  return out;
}

/** Everything a draw function needs besides the snapshot: motion numbers, per-family warn lengths and the live hit-beat scale lookup. */
export interface TelegraphCtx {
  cfg: TelegraphCfg;
  warnMs: { mud: number; ice: number; gate: number; spike: number; bomb: number; bombCount: number; shrink: number };
  /** Current hit-beat / digit-pop scale for a beat key (1 when none is playing or under reduced motion). */
  beat(key: string): number;
}
export const telegraphCtx = (b: Balance, beat: (key: string) => number = () => 1): TelegraphCtx => ({
  cfg: b.motion,
  warnMs: { mud: b.mud.warnMs, ice: b.ice.warnMs, gate: b.gate.warnMs, spike: b.spike.warnMs, bomb: b.bomb.warnMs, bombCount: b.bomb.countdownMs, shrink: b.shrink.warnMs },
  beat,
});

/** MOT-4-R5 hazards carry no id in the snapshot: type + first cell is unique among live hazards (reserved cells). */
export const hazardKey = (h: { type: string; cells: readonly { x: number; y: number }[] }): string => `h:${h.type}:${h.cells[0]?.x},${h.cells[0]?.y}`;
export const cellKey = (prefix: 'g' | 's', id: number, x: number, y: number): string => `${prefix}:${id}:${x},${y}`;
```
and `tests/support/telegraph.ts`
```ts
import { telegraphCtx } from '../../src/game/render/telegraph';
import { loadBalance } from './balance';

/** Shared draw-test fixture: real balance, beat scale always 1. */
export const TEL = telegraphCtx(loadBalance());
```
- [ ] **Step 4: Run** the telegraph test -> PASS; `npm run typecheck`.
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(motion): MOT-4 pure telegraphPulse (remaining-time rhythm, alpha floor, urgent window) and TelegraphCtx`.
```bash
git add src/game/render/telegraph.ts tests/support/telegraph.ts tests/game/telegraph.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 pure telegraphPulse

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Motion adapter additions `snap` and `ease`

**Files:** Modify `src/game/motion/motionCore.ts` (interfaces lines ~7-18, returned object near `release`/`countUp`); Test `tests/game/motionCore.test.ts` (append; it already defines `target()`, `host()`, `make()` and `cfg`)

**Interfaces:**
- Consumes the existing private `rest`, `snapRest`, `play` helpers.
- Produces on `Motion`:
  - `snap(t: MotionTarget, peak: number, ms: number, onDone?: () => void): void` (scale `rest -> rest*peak -> rest`, half the time each; reduced motion: no motion, `onDone` called)
  - `ease(t: EaseTarget, to: number, ms: number, onUpdate: (v: number) => void): void` where `export interface EaseTarget { v: number }` (tweens `t.v` to `to` with `Cubic.easeOut`, calls `onUpdate(t.v)` each frame and `onUpdate(to)` at the end; `ms <= 0`, reduced motion or a full budget set the end value at once)

- [ ] **Step 1: Write the failing tests.** Append to `tests/game/motionCore.test.ts`:
```ts
it('MOT-4-R5 snap goes rest -> peak -> rest in two phases, ends exactly at rest and calls onDone', () => {
  const { m, h } = make(); const t = target(); let done = 0;
  m.snap(t, cfg.telegraphSnapScale, cfg.telegraphSnapMs, () => { done++; });
  expect(h.adds[0]).toMatchObject({ targets: t, scaleX: cfg.telegraphSnapScale, duration: cfg.telegraphSnapMs / 2 });
  (h.adds[0]!.onComplete as () => void)();
  expect(h.adds[1]).toMatchObject({ scaleX: 1, duration: cfg.telegraphSnapMs / 2 });
  (h.adds[1]!.onComplete as () => void)();
  expect(t.scaleX).toBe(1); expect(t.scaleY).toBe(1); expect(done).toBe(1); expect(m.liveCount()).toBe(0);
});
it('MOT-4-R5 snap kills the previous motion on the same target (kill-by-target) and does nothing under reduced motion', () => {
  const a = make(); const t = target(); a.m.snap(t, 1.1, 100); a.m.snap(t, 1.1, 100);
  expect(a.h.kills.filter(k => k === t).length).toBeGreaterThanOrEqual(2);
  const r = make({ reduced: () => true }); let done = 0; const u = target();
  r.m.snap(u, 1.1, 100, () => { done++; });
  expect(r.h.adds.length).toBe(0); expect(u.scaleX).toBe(1); expect(done).toBe(1);
});
it('MOT-4-R7 ease tweens a plain number with onUpdate and finishes exactly on the target', () => {
  const { m, h } = make(); const p = { v: 0 }; const seen: number[] = [];
  m.ease(p, 10, 200, v => { seen.push(v); });
  expect(h.adds[0]).toMatchObject({ targets: p, v: 10, duration: 200 });
  p.v = 4; (h.adds[0]!.onUpdate as () => void)(); (h.adds[0]!.onComplete as () => void)();
  expect(seen).toEqual([4, 10]); expect(p.v).toBe(10); expect(m.liveCount()).toBe(0);
});
it('MOT-4-R9 ease with ms 0, reduced motion or a full budget jumps to the target without a tween', () => {
  const z = make(); const p = { v: 0 }; let last = -1;
  z.m.ease(p, 5, 0, v => { last = v; }); expect(z.h.adds.length).toBe(0); expect(p.v).toBe(5); expect(last).toBe(5);
  const r = make({ reduced: () => true }); const q = { v: 0 };
  r.m.ease(q, 7, 220, v => { last = v; }); expect(r.h.adds.length).toBe(0); expect(q.v).toBe(7); expect(last).toBe(7);
  const full = make(); for (const t of Array.from({ length: cfg.maxTweens }, target)) full.m.pressDown(t);
  const n = full.h.adds.length, w = { v: 0 }; full.m.ease(w, 3, 220, v => { last = v; });
  expect(full.h.adds.length).toBe(n); expect(w.v).toBe(3); expect(last).toBe(3);
});
```
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/motionCore` -> FAIL (`m.snap is not a function`).
- [ ] **Step 3: Implement** in `src/game/motion/motionCore.ts`.
  - After `export interface TextTarget` add `export interface EaseTarget { v: number }`.
  - In `interface Motion` add the two signatures (as written in Interfaces) next to `release`.
  - In the returned object, after `release(t) { ... },` add:
```ts
    /** MOT-4-R5 one scale snap rest -> peak -> rest (half the time each); kill-by-target; no-op under reduced motion. */
    snap(t, peak, ms, onDone) {
      if (d.reduced()) { onDone?.(); return; }
      const r = rest(t), upMs = Math.round(ms / 2);
      const settle = (): void => {
        play(t, { scaleX: r.sx, scaleY: r.sy, duration: ms - upMs, ease: 'Sine.easeInOut' }, () => { snapRest(t); onDone?.(); });
      };
      play(t, { scaleX: r.sx * peak, scaleY: r.sy * peak, duration: upMs, ease: 'Quad.easeOut' }, settle);
    },
    /** MOT-4-R7/R9 tween a plain number (bars, score). The caller draws from onUpdate; the end value is always exact. */
    ease(t, to, ms, onUpdate) {
      if (d.reduced() || ms <= 0) { d.tweens.killTweensOf(t); live.delete(t); t.v = to; onUpdate(to); return; }
      play(t, { v: to, duration: ms, ease: 'Cubic.easeOut', onUpdate: () => onUpdate(t.v) }, () => { t.v = to; onUpdate(to); });
    },
```
- [ ] **Step 4: Run** the motionCore test -> PASS (MOT-0 tests unchanged); `npm run typecheck`. Also `grep -rn "scene.tweens.add\|this.tweens.add" src/game/motion` returns nothing.
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(motion): MOT-4 Motion.snap (scale beat) and Motion.ease (number tween) on the MOT-0 adapter`.
```bash
git add src/game/motion/motionCore.ts tests/game/motionCore.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 snap and ease adapter methods

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Additive `warnLeftMs` on gate and spike cell views (only sim-side change)

**Files:** Modify `src/core/hazards/blocks/cycleCells.ts` (append helper), `src/core/types.ts` (`GateView.gate` ~line 142, `SpikeView.cells` ~line 161), `src/core/hazards/gate.ts` (`gateSnapshot` lines 14-18), `src/core/hazards/spike.ts` (`spikeSnapshot` lines 9-14), `src/core/sim.ts` (line 98 call sites); Test `tests/core/hazards/cycleCells.test.ts`

**Interfaces:**
- Produces `cycleWarnLeft(p: CyclePhases, t: number): number` (remaining ms of the warn phase at cycle time `t`; 0 when `t < 0` or not in the warn phase; a cell held in warn by a snake under it therefore reads 0 = "at the hit").
- Produces `GateView.gate[i].warnLeftMs: number` and `SpikeView.cells[i].warnLeftMs: number`.
- Changes `gateSnapshot(s: SimState, b: Balance): GateView[]` and `spikeSnapshot(s: SimState, b: Balance): SpikeView[]` (both used only by `src/core/sim.ts`; `grep -rn "gateSnapshot\|spikeSnapshot" src tests` showed no other caller, and the registry `snapshot` slot is `snapshot(s)`-typed but sim.ts calls these two directly).

- [ ] **Step 1: Write the failing test.** Append to `tests/core/hazards/cycleCells.test.ts` (add `cycleWarnLeft` to its import from `blocks/cycleCells`):
```ts
it('MOT-4-R1 cycleWarnLeft is the remaining warn ms, 0 outside the warn phase and before the origin', () => {
  const p = { downMs: 1000, warnMs: 900, upMs: 500 };
  expect(cycleWarnLeft(p, -5)).toBe(0);
  expect(cycleWarnLeft(p, 500)).toBe(0);            // down
  expect(cycleWarnLeft(p, 1000)).toBe(900);         // first ms of warn
  expect(cycleWarnLeft(p, 1400)).toBe(500);
  expect(cycleWarnLeft(p, 1899)).toBe(1);
  expect(cycleWarnLeft(p, 1900)).toBe(0);           // up (or held in warn by the snake): at the hit
  expect(cycleWarnLeft(p, 2400 + 1100)).toBe(800);  // next cycle (period 2400)
});
```
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/hazards/cycleCells` -> FAIL.
- [ ] **Step 3: Implement.**
  - `cycleCells.ts`, append:
```ts
// MOT-4-R1 presentation helper: remaining ms of the warn phase at cycle time t (0 when not in warn; a snake-held cell reads 0 = at the hit).
export function cycleWarnLeft(p: CyclePhases, t: number): number {
  if (t < 0) return 0;
  const m = t % (p.downMs + p.warnMs + p.upMs);
  return m >= p.downMs && m < p.downMs + p.warnMs ? p.downMs + p.warnMs - m : 0;
}
```
  - `types.ts`: `gate: readonly { x: number; y: number; delay: number; vis: TerrainVis; warnLeftMs: number }[];` and `cells: readonly { x: number; y: number; delay: number; vis: TerrainVis; warnLeftMs: number }[];`.
  - `gate.ts`: import `cycleWarnLeft` with `stepCycleCell`, import `Balance` type from `'../balance'` (or the file's existing type import style), and replace `gateSnapshot`:
```ts
export function gateSnapshot(s: SimState, b: Balance): GateView[] {
  const g = b.gate, phases = { downMs: g.openMs, warnMs: g.warnMs, upMs: g.closedMs };
  return gates(s).map(({ id, t, lifeMs, state, fence, gate: cells }) => ({ id, t, lifeMs, state,
    fence: fence.map(c => ({ ...c })),
    gate: cells.map(({ x, y, delay, vis }) => ({ x, y, delay, vis, warnLeftMs: cycleWarnLeft(phases, t - g.landWarnMs - delay) })),
  }));
}
```
  - `spike.ts` (`cycleWarnLeft` import beside `cyclePhase`; `Balance` type import):
```ts
export function spikeSnapshot(s: SimState, b: Balance): SpikeView[] {
  return groups(s).map(({ id, t, lifeMs, ending, cells }) => ({ id, t, lifeMs, ending,
    cells: cells.map(({ x, y, delay, vis }) => ({ x, y, delay, vis, warnLeftMs: cycleWarnLeft(b.spike, s.levelTimeMs) })),
  }));
}
```
  - `sim.ts` line 98: `gate: gateSnapshot(s, b), spike: spikeSnapshot(s, b)`.
- [ ] **Step 4: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/hazards` (gate, spike, cycleCells; fix any `toEqual` on gate/spike views by adding `warnLeftMs`) then `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/core/sim` and `npm run typecheck`. Determinism/fuzz tests must stay green (the new field is derived, no state).
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(core): additive warnLeftMs on gate and spike cell snapshot views (presentation only, MOT-4)`.
```bash
git add src/core tests/core CHANGELOG.md
git commit -m "feat(core): MOT-4 warnLeftMs on gate and spike cell views

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Hazard family (rock warn, rise tile, fence, maze) uses the pulse (`hazards.ts`)

**Files:** Modify `src/game/render/hazards.ts` (`drawWarn` lines ~42-62, `drawTerrains` ~97-117, `drawHazards` ~120-142); Test `tests/game/hazardArt.test.ts` (call sites at lines ~41, 51, 60, 69-70, 82, 84, 94-95, 103, 111, 113)

**Interfaces:**
- Consumes `telegraphPulse`, `newPulse`, `TelegraphCfg`, `TelegraphCtx`, `hazardKey` (Task 3); `TEL` (Task 3).
- Produces new signatures:
  - `drawWarn(g, c: Cell, cell: number, ms: number, warnMs: number, look: BoardLook, kind: 'hazard' | 'rise', jitter: boolean, reduced: boolean, cfg: TelegraphCfg): void` (`ms` = ELAPSED warn ms; replaces the old `progress` argument with `warnMs`)
  - `drawTerrains(g, terrains, cell, look, b, reduced, tel: TelegraphCtx)`
  - `drawHazards(g, hazards, cell, look, b, reduced, tel: TelegraphCtx)` (live solid pieces are multiplied by `tel.beat(hazardKey(h))`)

- [ ] **Step 1: Update and add tests** in `tests/game/hazardArt.test.ts`. Add `import { TEL } from '../support/telegraph';` and `import { telegraphPulse } from '../../src/game/render/telegraph';`, then:
  - `drawWarn(p.g, {x:2,y:3}, 30, ms, 0.4, look, 'hazard', false, reduced)` becomes `drawWarn(p.g, { x: 2, y: 3 }, 30, ms, 1000, boardLook(3, theme), 'hazard', false, reduced, TEL.cfg)` (line ~41); line ~51 `drawWarn(..., 0, 0.5, ..., 'rise', false, true)` becomes `(..., 0, 1000, ..., 'rise', false, true, TEL.cfg)`; line ~60 likewise with `ms, 1000, ... reduced, TEL.cfg`.
  - Every `drawHazards(...)` and `drawTerrains(...)` call gets `, TEL` as the last argument.
  - If an existing assertion in this file encodes the OLD sine pulse (for example "alpha differs between ms values" or an exact alpha), rewrite it to read the expected alpha from `telegraphPulse(1000 - ms, 1000, TEL.cfg).alpha` (that is the new single source of truth) rather than deleting it.
  - Add new tests:
```ts
it('MOT-4-R2 the warn symbol (ring, dashes and the "!" bar+dot) is drawn at the dimmest pulse frame', () => {
  const dim = (() => { for (let ms = 0; ms < 1000; ms++) if (telegraphPulse(1000 - ms, 1000, TEL.cfg).alpha < TEL.cfg.telegraphAlphaMin + 0.02) return ms; return 0; })();
  const p = gfx(); drawWarn(p.g, { x: 2, y: 3 }, 30, dim, 1000, boardLook(1, 'light'), 'hazard', false, false, TEL.cfg);
  expect(p.count('strokeRoundedRect')).toBe(1); expect(p.count('lineBetween')).toBeGreaterThan(0);
  expect(p.count('fillCircle')).toBe(1);   // the "!" dot
});
it('MOT-4-R6 in the last telegraphUrgentMs the dash colour is the hard warn colour at alpha 1', () => {
  const p = gfx(); drawWarn(p.g, { x: 0, y: 0 }, 30, 1000 - TEL.cfg.telegraphUrgentMs, 1000, boardLook(1, 'light'), 'hazard', false, false, TEL.cfg);
  const dash = p.calls.find(c => c[0] === 'lineStyle' && c[2] === PART.warn.dash && c[3] === 1);
  expect(dash).toBeTruthy();
});
it('MOT-4-R5 a live rock is enlarged by the hit beat scale and returns to size at 1', () => {
  const look = boardLook(1, 'light'), live = rockHazard('solid');
  const sized = (k: number) => { const q = gfx(); drawHazards(q.g, live, 30, look, b, false, { ...TEL, beat: () => k }); return q.calls.find(c => c[0] === 'fillEllipse')!; };
  expect(sized(1.12)[3] as number).toBeGreaterThan(sized(1)[3] as number);
});
```
  (Use the file's existing `PART` import if present; otherwise import it from `../../src/game/render/boardParts`. `rockHazard`, `b` and `gfx` already exist in this test file; `calls[i]` is `[name, ...args]`, so `lineStyle` args are `[width, color, alpha]` at indices 1..3 and `fillEllipse(x, y, w, h)` width is index 3.)
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hazardArt` -> FAIL (signature mismatch, typecheck of tests or runtime).
- [ ] **Step 3: Implement** in `src/game/render/hazards.ts`.
  - Imports: add `import { newPulse, telegraphPulse, hazardKey, type TelegraphCfg, type TelegraphCtx } from './telegraph';` and, at module scope after the type aliases, `const SCRATCH = newPulse();`.
  - Replace `drawWarn` entirely:
```ts
// P3b1-R5 outline ring, dashes and the "!" / chevron never depend on colour or blink alone; MOT-4-R1/R2/R6 the rhythm now comes from the shared
// telegraphPulse(remaining, warnMs): it tightens toward the hit, only alpha/scale move, the symbol is always drawn, and the last
// telegraphUrgentMs steps to the hard colour at full alpha. `ms` is ELAPSED warn ms.
export function drawWarn(g: Graphics, c: Cell, cell: number, ms: number, warnMs: number, look: BoardLook, kind: 'hazard' | 'rise', jitter: boolean, reduced: boolean, cfg: TelegraphCfg): void {
  const p = telegraphPulse(warnMs - ms, warnMs, cfg, reduced, SCRATCH);
  const off = jitter && !reduced ? Math.sin(ms / 28) * cell * 0.04 : 0;
  const x = c.x * cell + off, y = c.y * cell, ring = cell * WARN.ring, inset = cell * WARN.inset, size = cell - 2 * inset;
  const hazard = kind === 'hazard', a = p.urgent ? 1 : p.alpha, hard = hazard ? PART.warn.dash : PART.stone.warnDash;
  g.lineStyle(ring, look.edge, 1).strokeRoundedRect(x - ring / 2, y - ring / 2, cell + ring, cell + ring, cell * WARN.radius + ring / 2);
  g.fillStyle(p.urgent ? hard : hazard ? PART.warn.fill : PART.stone.warnFill, (WARN.fillBase + WARN.fillGain * p.progress) * a + (hazard ? 0 : WARN.riseFillFloor))
    .fillRoundedRect(x + inset, y + inset, size, size, cell * WARN.tileRadius);
  g.lineStyle(Math.max(1, cell * WARN.dashWidth), hard, a);
  dashedRect(g, x + inset, y + inset, size, size, cell * WARN.dash);
  const s = p.scale, sc = (v: number): number => cell / 2 + (v - cell / 2) * s;   // scale the symbol about the cell centre
  if (hazard) {
    const k = bangGeometry(cell);
    g.fillStyle(PART.warn.bang, a).fillRoundedRect(x + sc(k.bar.x), y + sc(k.bar.y), k.bar.w * s, k.bar.h * s, k.bar.r * s).fillCircle(x + sc(k.dot.x), y + sc(k.dot.y), k.dot.r * s);
  } else {
    const [pa, apex, e] = chevronPoints(cell);
    g.lineStyle(cell * WARN.chevronWidth, PART.stone.chevron, a);
    g.lineBetween(x + sc(pa[0]), y + sc(pa[1]), x + sc(apex[0]), y + sc(apex[1])).lineBetween(x + sc(apex[0]), y + sc(apex[1]), x + sc(e[0]), y + sc(e[1]));
  }
}
```
  - `drawTerrains(g, terrains, cell, look, b, reduced, tel)`: replace the `drawWarn(...)` line in the `c.vis === 'warn'` branch with
```ts
        drawWarn(g, c, cell, Math.min(b.terrain.warnMs, Math.max(0, ct)), b.terrain.warnMs, look, 'rise', true, reduced, tel.cfg);
```
  - `drawHazards(g, hazards, cell, look, b, reduced, tel)`: add `const key = hazardKey(h);` after `const solid: PopCell[] = [];`; in the warn branch replace the `drawWarn` call with `drawWarn(g, c, cell, ms, h.warnMs, look, 'hazard', false, reduced, tel.cfg);`; change the solid `k` expression to
```ts
      solid.push({ x: c.x, y: c.y, k: (crumble ? crumbleK : reduced ? 1 : Math.min(1, 0.6 + c.ageMs / 250)) * (crumble ? 1 : tel.beat(key)) });
```
  Maze and fence reach the same `drawWarn` (warn cells) and `drawFence` post size `c.k` (beat scales posts). The `hedge` bars ignore `k` (no hit beat on maze bars; its warn pulse is the shared `drawWarn`).
- [ ] **Step 4: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hazardArt` -> PASS. `GameScene.ts` still calls the old signatures, so typecheck fails here until Task 9; run `npm run typecheck` in Task 9. (This is the plan's only intentional red typecheck window, Tasks 6 to 8; every task still passes its own test file.)
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(motion): MOT-4 rock/fence/maze/rise warn pulse from remaining time (tightening rhythm, alpha floor, urgent colour)`.
```bash
git add src/game/render/hazards.ts tests/game/hazardArt.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 hazard warn pulse

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ground tiles and coconut/NPC lanes use the pulse (`tiles.ts`, `movers.ts`)

**Files:** Modify `src/game/render/tiles.ts` (`drawTiles` lines ~10-46), `src/game/render/movers.ts` (`arrowTriangle` ~line 27, `drawLane` ~line 52-63, `drawMovers` ~line 76-100); Tests `tests/game/tiles.test.ts`, `tests/game/p2bRender.test.ts`

**Interfaces:**
- Consumes `telegraphPulse`, `newPulse`, `TelegraphCtx` (Task 3), `TEL`.
- Produces `drawTiles(g, tiles, cellPx, tel: TelegraphCtx, reducedMotion = false, look = DEFAULT_LOOK)` (the `timeMs` argument is gone: nothing in tiles uses wall time any more) and `drawMovers(g, snap, cellPx, tel: TelegraphCtx, reducedMotion = false)` (same). `arrowTriangle(c, d, cellPx, scale = 1)`.
- `blinkOn` and `WARN_BLINK_MS` in `movers.ts` stay exported for `tests/game/p2bRender.test.ts` (reduced-motion contract); the private `WARN_BLINK_MS` in `tiles.ts` is deleted.

- [ ] **Step 1: Update and add tests.**
  - `tests/game/tiles.test.ts`: add `import { TEL } from '../support/telegraph';` and in every `drawTiles(g, tiles, cellPx, timeMs, ...)` call replace the time argument by `TEL` (for example `drawTiles(g, tile('active'), 20, 0)` becomes `drawTiles(g, tile('active'), 20, TEL)`; a call that passed `(…, 20, 0, true)` becomes `(…, 20, TEL, true)`). Add:
```ts
it('MOT-4-R3 a warning tile is drawn on every frame of its warn (no blink-off frame), at alpha >= telegraphAlphaMin', () => {
  const warn = (leftMs: number): SimSnapshot['tiles'] => [{ family: 'mud', id: 1, state: 'warn', leftMs, cells: [{ x: 1, y: 2, on: false }] }];
  for (let left = 900; left >= 0; left -= 25) {
    const { g, calls } = graphics();
    drawTiles(g, warn(left), 20, TEL);
    expect(calls.filter(c => c === 'lineBetween').length).toBeGreaterThan(0);
  }
});
it('MOT-4-R6 a warning tile reaches full alpha in the last telegraphUrgentMs', () => {
  const g = gfx();
  drawTiles(g.g, [{ family: 'ice', id: 1, state: 'warn', leftMs: TEL.cfg.telegraphUrgentMs, cells: [{ x: 0, y: 0, on: false }] }], 20, TEL);
  expect(g.calls.find(c => c[0] === 'lineStyle')![3]).toBe(1);
});
```
  (`graphics()` and `gfx` helpers already exist/are importable in this file: it imports `gfx` from `../support/gfx`. The `graphics()` fake records method names only; ensure its method list includes `lineBetween`, as it does.)
  - `tests/game/p2bRender.test.ts`: add the `TEL` import and update each `drawMovers(g, snap, cell, time, reduced?)` call to `drawMovers(g, snap, cell, TEL, reduced?)` (find them with `grep -n "drawMovers" tests/game/p2bRender.test.ts`). Add:
```ts
it('MOT-4-R4 a warning lane keeps its arrows on every pulse frame and tightens toward the hit', () => {
  const lane = (t: number) => ({ families: { coconut: [{ id: 1, path: [{ x: 0, y: 0 }, { x: 1, y: 0 }], cell: null, state: 'warn', t, warnMs: 1000 }], npc: [], bird: null } }) as unknown as SimSnapshot;
  for (let t = 0; t <= 1000; t += 50) { const q = gfx(); drawMovers(q.g, lane(t), 20, TEL, false); expect(q.count('fillTriangle')).toBe(2); }
});
it('MOT-4 arrowTriangle scale shrinks and grows the arrow about its centre and defaults to 1', () => {
  const a = arrowTriangle({ x: 1, y: 1 }, { x: 1, y: 0 }, 20), b2 = arrowTriangle({ x: 1, y: 1 }, { x: 1, y: 0 }, 20, 2);
  expect(b2[0] - 30).toBeCloseTo((a[0] - 30) * 2, 10);
});
```
  (`SimSnapshot` and `gfx` imports: add if missing; cell (1,1) at 20 px has centre `(30, 30)`.)
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/tiles tests/game/p2bRender` -> FAIL.
- [ ] **Step 3: Implement.**
  - `movers.ts`: import `{ newPulse, telegraphPulse, type TelegraphCtx }` from `./telegraph`; add `const SCRATCH = newPulse();`; change `arrowTriangle` to `(c, d, cellPx, scale = 1)` with `len = cellPx * 0.24 * scale, wing = cellPx * 0.16 * scale`; replace `drawLane`:
```ts
// MOT-4-R4 lane warn: fill + arrows pulse with the shared tightening rhythm (remaining = warnMs - t); never hidden, outline kept under reduced motion.
function drawLane(g: Graphics, path: readonly Cell[], cellPx: number, tel: TelegraphCtx, reducedMotion: boolean, warn: boolean, t: number, warnMs: number): void {
  const p = warn ? telegraphPulse(warnMs - t, warnMs, tel.cfg, reducedMotion, SCRATCH) : null, a = p ? (p.urgent ? 1 : p.alpha) : 1, k = p ? p.scale : 1;
  const inset = cellPx * 0.08, size = cellPx - inset * 2, dirs = pathDirs(path);
  g.lineStyle(Math.max(1, cellPx * 0.06), LANE.line);
  path.forEach((c, i) => {
    g.fillStyle(LANE.fill, warn ? 0.45 * a : 0.18).fillRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);
    if (warn && reducedMotion) g.strokeRect(c.x * cellPx + inset, c.y * cellPx + inset, size, size);   // solid outline under reduced motion
    const [x1, y1, x2, y2, x3, y3] = arrowTriangle(c, dirs[i]!, cellPx, k);
    g.fillStyle(LANE.line, warn ? 0.9 * a : 0.5).fillTriangle(x1, y1, x2, y2, x3, y3);
  });
}
```
    and `drawMovers(g, snap, cellPx, tel, reducedMotion = false)`: coconut loop `drawLane(g, c.path, cellPx, tel, reducedMotion, c.state === 'warn', c.t, c.warnMs);` and npc loop `drawLane(g, n.path, cellPx, tel, reducedMotion, n.state === 'warn', n.t, n.warnMs);`. Remove the now-unused `timeMs` parameter.
  - `tiles.ts`: delete `const WARN_BLINK_MS = 250;`; import `{ newPulse, telegraphPulse, type TelegraphCtx }`; `const SCRATCH = newPulse();`; signature `drawTiles(g, tiles, cellPx, tel: TelegraphCtx, reducedMotion = false, look = DEFAULT_LOOK)`; delete the line `if (warning && !reducedMotion && Math.floor(timeMs / WARN_BLINK_MS) % 2 === 1) continue;`; add `const p = warning ? telegraphPulse(tile.leftMs, tel.warnMs[tile.family], tel.cfg, reducedMotion, SCRATCH) : null, a = p ? (p.urgent ? 1 : p.alpha) : 1, s = p ? p.scale : 1;` right after `const warning = ...`; in the warn branch use `g.lineStyle(Math.max(1, cellPx * 0.06), edge, a);`, size the ice cross `const radius = cellPx * 0.22 * s;`, and for the mud icon
```ts
        } else {
          const cx = x + cellPx * 0.5, cy = y + cellPx * 0.58;
          g.fillStyle(edge, a).fillCircle(cx, cy, cellPx * 0.14 * s)
            .fillTriangle(cx - cellPx * 0.14 * s, y + cellPx * 0.57, cx, cy - cellPx * 0.31 * s, cx + cellPx * 0.14 * s, y + cellPx * 0.57);
        }
```
    (original coordinates: circle at `(x+.5c, y+.58c)` r `.14c`; triangle `(x+.36c, y+.57c)`, apex `(x+.5c, y+.27c)`, `(x+.64c, y+.57c)`; the scaled version keeps those at `s = 1`).
- [ ] **Step 4: Run** the two test files -> PASS.
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(motion): MOT-4 ground tile and coconut/NPC lane warn pulses`.
```bash
git add src/game/render/tiles.ts src/game/render/movers.ts tests/game/tiles.test.ts tests/game/p2bRender.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 tile and lane warn pulse

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gate, spike, bomb and ring use the pulse and beat scale (`cycles.ts`, `blasts.ts`, `shrink.ts`)

**Files:** Modify `src/game/render/cycles.ts` (`drawLock`, `drawGates`, `drawSpikes`, `drawCycles`), `src/game/render/blasts.ts` (`drawDigit`, `drawBlasts`), `src/game/render/shrink.ts` (`drawShrink`); Tests: the files that import these (`grep -rln "drawCycles\|drawBlasts\|drawShrink" tests` returned only `tests/game/tiles.test.ts`, `tests/game/p2bRender.test.ts`, `tests/game/hazardArt.test.ts` for the earlier families; if no test imports these three, create `tests/game/telegraphRender.test.ts` below)

**Interfaces:**
- Consumes `telegraphPulse`, `steadyPulse`, `newPulse`, `TelegraphCtx` (Task 3), `cellKey`, `GateView/SpikeView.warnLeftMs` (Task 5), `tel.beat(key)`.
- Produces `drawCycles(g, snap, cellPx, tel, reducedMotion = false)`, `drawBlasts(g, snap, cellPx, tel, reducedMotion = false)`, `drawShrink(g, snap, cellPx, timeMs, tel, reducedMotion)`. Beat keys read: `g:${id}:${x},${y}`, `s:${id}:${x},${y}`, `b:${id}` (bomb body), `bd:${id}` (bomb digit), `r` (ring walls).

- [ ] **Step 1: Write the failing tests** in new `tests/game/telegraphRender.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { drawBlasts } from '../../src/game/render/blasts';
import { drawCycles } from '../../src/game/render/cycles';
import { drawShrink } from '../../src/game/render/shrink';
import { gfx } from '../support/gfx';
import { TEL } from '../support/telegraph';

const base = { families: { coconut: [], npc: [], bird: null, gate: [], spike: [], bomb: [], shrink: null } };
const snap = (over: Record<string, unknown>) => ({ families: { ...base.families, ...over } }) as unknown as SimSnapshot;
const gate = (vis: string, warnLeftMs: number) => snap({ gate: [{ id: 3, t: 0, lifeMs: 9, state: 'live', fence: [], gate: [{ x: 1, y: 1, delay: 0, vis, warnLeftMs }] }] });
const bomb = (state: string, leftMs: number) => snap({ bomb: [{ id: 9, x: 2, y: 2, state, leftMs, area: [{ x: 2, y: 2 }] }] });
const ring = (state: string, leftMs: number) => snap({ shrink: { state, leftMs, cells: [{ x: 0, y: 0, on: false }, { x: 1, y: 0, on: true }, { x: 2, y: 1, on: false }] } });

describe('MOT-4 greybox families', () => {
  it('MOT-4-R3 a warning gate bar is drawn on every frame of the warn (no blink-off frame)', () => {
    for (let left = 900; left >= 0; left -= 30) { const q = gfx(); drawCycles(q.g, gate('warn', left), 20, TEL); expect(q.count('fillRect')).toBeGreaterThan(0); }
  });
  it('MOT-4-R5 the gate closing beat widens the closed bar and returns to normal at scale 1', () => {
    const h = (k: number) => { const q = gfx(); drawCycles(q.g, gate('up', 0), 20, { ...TEL, beat: key => key === 'g:3:1,1' ? k : 1 }); return q.calls.find(c => c[0] === 'fillRect')![4] as number; };
    expect(h(1.12)).toBeGreaterThan(h(1));
  });
  it('MOT-4-R4 a warning spike shows its triangles and keeps the down dots as the dim phase', () => {
    const spike = snap({ spike: [{ id: 1, t: 0, lifeMs: 9, ending: false, cells: [{ x: 0, y: 0, delay: 0, vis: 'warn', warnLeftMs: 500 }] }] });
    const q = gfx(); drawCycles(q.g, spike, 20, TEL);
    expect(q.count('strokeTriangle')).toBe(3); expect(q.count('fillCircle')).toBe(3);
  });
  it('MOT-4-R4 bomb warn disc grows with the pulse scale and is never skipped; countdown digit pops with the beat', () => {
    for (let left = 900; left >= 0; left -= 30) { const q = gfx(); drawBlasts(q.g, bomb('warn', left), 20, TEL); expect(q.count('fillCircle')).toBe(1); }
    const w = (k: number) => { const q = gfx(); drawBlasts(q.g, bomb('count', 2500), 20, { ...TEL, beat: key => key === 'bd:9' ? k : 1 }); return q.calls.filter(c => c[0] === 'lineBetween'); };
    const small = w(1), big = w(1.2);
    expect(Math.abs((big[big.length - 1]![3] as number) - (big[big.length - 1]![1] as number))).toBeGreaterThanOrEqual(0);
    expect(big.length).toBe(small.length);
  });
  it('MOT-4-R4 ring: warn outline never hides, closed is a steady wall, fade pulses at the start rate', () => {
    for (const [state, left] of [['warn', 1500], ['warn', 100], ['closed', 4000], ['fade', 200]] as const) {
      const q = gfx(); drawShrink(q.g, ring(state, left), 20, 1234, TEL, false);
      expect(q.count('strokeRect'), state).toBe(2);   // the two non-wall cells keep an outline on every frame
      expect(q.count('fillRect'), state).toBeGreaterThanOrEqual(1);   // the wall cell
    }
    const a = gfx(); drawShrink(a.g, ring('warn', 1500), 20, 0, TEL, false);
    expect(a.count('fillTriangle')).toBe(4);   // corner arrows only in the warn phase
  });
});
```
  (The digit-pop assertion only checks the digit still draws all segments; `digitSegments` geometry is covered by existing tests, and the visual size check is in the Task 9 eye-check.)
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/telegraphRender` -> FAIL.
- [ ] **Step 3: Implement.**
  - `cycles.ts`: import `{ cellKey, newPulse, telegraphPulse, type TelegraphCtx }` and `import { blinkOn }` is deleted; `const SCRATCH = newPulse();`.
    - `drawLock(g, cx, cy, cellPx, k = 1, alpha = 1)`: `w = cellPx * 0.26 * k, h = cellPx * 0.2 * k`; both `fillStyle(WOOD.warn, alpha)` and `lineStyle(Math.max(1, cellPx * 0.05), WOOD.warn, alpha)`.
    - `drawGates(g, gates, cellPx, tel, reducedMotion)`: warn branch becomes
```ts
      } else if (c.vis === 'warn') {
        const p = telegraphPulse(c.warnLeftMs, tel.warnMs.gate, tel.cfg, reducedMotion, SCRATCH), a = alpha * (p.urgent ? 1 : p.alpha);
        g.fillStyle(WOOD.warn, a).fillRect(x, by, cellPx, bh);                                  // R3: drawn on every frame
        if (reducedMotion) g.lineStyle(Math.max(1, cellPx * 0.06), WOOD.bar).strokeRect(x + 1, by - 1, cellPx - 2, bh + 2);
        drawLock(g, x + cellPx / 2, y + cellPx * 0.7, cellPx, p.scale, a);
      } else {
        const hh = bh * tel.beat(cellKey('g', gate.id, c.x, c.y));                                // R5 closing beat, about the bar centre
        g.fillStyle(WOOD.bar, alpha).fillRect(x, y + cellPx / 2 - hh / 2, cellPx, hh);
      }
```
    - `drawSpikes(g, groups, cellPx, tel, reducedMotion)`: per cell
```ts
      const x = c.x * cellPx, y = c.y * cellPx, warn = c.vis === 'warn';
      if (c.vis === 'down' || warn) {                                   // the down dots stay under a warning: they are the dim phase
        g.fillStyle(SPIKE.edge, alpha);
        for (const [dx, dy] of [[0.3, 0.7], [0.5, 0.35], [0.7, 0.7]] as const) g.fillCircle(x + cellPx * dx, y + cellPx * dy, cellPx * 0.05);
        if (!warn) continue;
      }
      const p = warn ? telegraphPulse(c.warnLeftMs, tel.warnMs.spike, tel.cfg, reducedMotion, SCRATCH) : null;
      const a = p ? alpha * (p.urgent ? 1 : p.alpha) : alpha, k = p ? p.scale : tel.beat(cellKey('s', group.id, c.x, c.y));
      const m = cellPx * 0.12, step = (cellPx - m * 2) / 3, cx = x + cellPx / 2, cy = y + cellPx / 2;
      const sc = (v: number, o: number): number => o + (v - o) * k;     // scale about the cell centre
      for (let i = 0; i < 3; i++) {
        const x1 = x + m + step * i, x2 = x1 + step, top = y + cellPx * 0.2, base = y + cellPx - m;
        if (c.vis === 'up') g.fillStyle(SPIKE.fill, alpha).fillTriangle(sc(x1, cx), sc(base, cy), sc(x2, cx), sc(base, cy), sc((x1 + x2) / 2, cx), sc(top, cy));
        else g.lineStyle(Math.max(1, cellPx * 0.06), SPIKE.warn, a).strokeTriangle(sc(x1, cx), sc(base, cy), sc(x2, cx), sc(base, cy), sc((x1 + x2) / 2, cx), sc(top, cy));
      }
```
      (the loop is inside `for (const group of groups)` so `group.id` is in scope). `drawCycles(g, snap, cellPx, tel, reducedMotion = false)` forwards `tel`.
  - `blasts.ts`: import `{ newPulse, telegraphPulse, type TelegraphCtx }`, drop `blinkOn` from the movers import (keep `dashedRect`), `const SCRATCH = newPulse();`; `drawDigit(g, digit, cx, cy, cellPx, k = 1)` with `w = cellPx * 0.22 * k` and line width `Math.max(1.5, cellPx * 0.07 * k)`; `drawBlasts(g, snap, cellPx, tel, reducedMotion = false)`:
```ts
    if (b.state === 'warn') {
      const p = telegraphPulse(b.leftMs, tel.warnMs.bomb, tel.cfg, reducedMotion, SCRATCH), a = p.urgent ? 1 : p.alpha;   // R3: never skipped
      g.fillStyle(BOMB.warn, 0.55 * a).fillCircle(cx, cy, cellPx * 0.34 * p.scale);
      g.lineStyle(Math.max(1, cellPx * 0.06), BOMB.outline, a);
      if (reducedMotion) g.strokeRect(x + inset, y + inset, size, size);       // solid outline under reduced motion
      else dashedRect(g, x + inset, y + inset, size, size, cellPx * 0.12);
      continue;
    }
    ...active branch unchanged...
    const p = telegraphPulse(b.leftMs, tel.warnMs.bombCount, tel.cfg, reducedMotion, SCRATCH);
    g.lineStyle(Math.max(1, cellPx * 0.05), BOMB.outline, p.urgent ? 1 : p.alpha);
    for (const c of b.area) dashedRect(g, c.x * cellPx + 1, c.y * cellPx + 1, cellPx - 2, cellPx - 2, cellPx * 0.14);
    g.fillStyle(BOMB.body).fillCircle(cx, cy, cellPx * 0.4 * tel.beat(`b:${b.id}`));
    drawDigit(g, bombDigit(b.leftMs), cx, cy, cellPx, tel.beat(`bd:${b.id}`));
```
  - `shrink.ts`: import `{ newPulse, steadyPulse, telegraphPulse, type TelegraphCtx }`, drop `blinkOn`; `const SCRATCH = newPulse();`; signature `drawShrink(g, snap, cellPx, timeMs, tel, reducedMotion)`; replace `const blink = blinkOn(...)` with
```ts
  const p = ring.state === 'warn' ? telegraphPulse(ring.leftMs, tel.warnMs.shrink, tel.cfg, reducedMotion, SCRATCH)
    : ring.state === 'fade' ? steadyPulse(timeMs, tel.cfg, reducedMotion, SCRATCH) : null;            // closed: steady wall
  const a = p ? (p.urgent ? 1 : p.alpha) : 1, k = p ? p.scale : 1, wallK = tel.beat('r');
```
    the wall branch scales about the cell centre: `g.fillStyle(RING.wall, 0.9).fillRect(x + cellPx * (1 - wallK) / 2, y + cellPx * (1 - wallK) / 2, cellPx * wallK, cellPx * wallK);` (hatch lines unchanged); delete `if (!blink) continue;`; outline `g.lineStyle(line, RING.warn, a);`; replace `if (ring.state !== 'warn' || !blink) return;` by `if (ring.state !== 'warn') return;`; arrows use `len = cellPx * 0.24 * k, wing = cellPx * 0.16 * k` and `fillStyle(RING.arrow, 0.9 * a)`.
- [ ] **Step 4: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/telegraphRender tests/game/p2bRender` -> PASS. Check `grep -rn "blinkOn" src/game` now lists only its definition in `movers.ts` (spec R4: kept only as the static reduced-motion fallback).
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(motion): MOT-4 gate, spike, bomb and shrinking ring warn pulses, hit-beat and digit-pop scale hooks`.
```bash
git add src/game/render/cycles.ts src/game/render/blasts.ts src/game/render/shrink.ts tests/game/telegraphRender.test.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 gate/spike/bomb/ring telegraphs

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Hit-beat edges, `HitBeats`, and `GameScene` wiring (R5)

**Files:** Create `src/game/render/hitBeat.ts`; Test `tests/game/hitBeat.test.ts`; Modify `src/game/scenes/GameScene.ts` (imports ~line 15-25, fields ~line 28-45, `create` ~line 46-110, `update` ~line 133-150, `draw` ~line 183-200); Modify `tests/support/scene.ts` (see Step 5)

**Interfaces:**
- Consumes `Motion.snap` (Task 4), `hazardKey`, `cellKey`, `TelegraphCtx`, `telegraphCtx` (Task 3), `bombDigit` (`src/game/render/blasts.ts`), `motionFor`.
- Produces in `hitBeat.ts`: `type BeatKind = 'hit' | 'digit'`, `interface BeatEdge { key: string; kind: BeatKind }`, `telegraphEdges(prev: SimSnapshot | null, next: SimSnapshot): BeatEdge[]`, `class HitBeats { constructor(motion: Pick<Motion, 'snap'>, cfg: Pick<MotionBalance, 'telegraphSnapScale' | 'telegraphSnapMs' | 'digitPopScale' | 'digitPopMs'>); play(edges: readonly BeatEdge[]): void; scale(key: string): number; clear(): void }`.
- Edge rules (state edge in the snapshot, never a sim change): hazard `warn -> solid` (`hazardKey`); gate cell `warn -> up` (`g:` key); spike cell `warn -> up` (`s:`); bomb `warn -> count|active` (`b:${id}`, kind `hit`); bomb count digit change (`bd:${id}`, kind `digit`, only when both snapshots are in `count`); ring `warn -> closed` (`r`).

- [ ] **Step 1: Write the failing test** `tests/game/hitBeat.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { HitBeats, telegraphEdges } from '../../src/game/render/hitBeat';
import type { MotionTarget } from '../../src/game/motion/motionCore';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;
const snap = (over: Record<string, unknown>) => ({ hazards: [], families: { gate: [], spike: [], bomb: [], shrink: null }, ...over }) as unknown as SimSnapshot;
const rock = (state: string) => ({ type: 'rock', state, t: 0, warnMs: 1000, lifeMs: 9, cells: [{ x: 3, y: 4, on: state === 'solid', ageMs: 0 }] });

describe('MOT-4-R5 telegraphEdges', () => {
  it('a rock warn -> solid gives one hit edge, a steady state gives none, and no previous snapshot gives none', () => {
    expect(telegraphEdges(snap({ hazards: [rock('warn')] }), snap({ hazards: [rock('solid')] }))).toEqual([{ key: 'h:rock:3,4', kind: 'hit' }]);
    expect(telegraphEdges(snap({ hazards: [rock('warn')] }), snap({ hazards: [rock('warn')] }))).toEqual([]);
    expect(telegraphEdges(snap({ hazards: [rock('solid')] }), snap({ hazards: [rock('solid')] }))).toEqual([]);
    expect(telegraphEdges(null, snap({ hazards: [rock('solid')] }))).toEqual([]);
  });
  it('gate and spike cells: warn -> up per cell', () => {
    const gate = (vis: string) => snap({ families: { gate: [{ id: 3, gate: [{ x: 1, y: 1, vis }] }], spike: [{ id: 4, cells: [{ x: 2, y: 2, vis }] }], bomb: [], shrink: null } });
    expect(telegraphEdges(gate('warn'), gate('up'))).toEqual([{ key: 'g:3:1,1', kind: 'hit' }, { key: 's:4:2,2', kind: 'hit' }]);
    expect(telegraphEdges(gate('down'), gate('up'))).toEqual([]);
  });
  it('bomb lands (warn -> count) is a hit; a digit change while counting is a digit pop; an unchanged digit is nothing', () => {
    const bomb = (state: string, leftMs: number) => snap({ families: { gate: [], spike: [], bomb: [{ id: 9, state, leftMs }], shrink: null } });
    expect(telegraphEdges(bomb('warn', 5), bomb('count', 3000))).toEqual([{ key: 'b:9', kind: 'hit' }]);
    expect(telegraphEdges(bomb('count', 2001), bomb('count', 2000))).toEqual([]);          // ceil(2001/1000) = 3, ceil(2000/1000) = 2 -> digit changes
    expect(telegraphEdges(bomb('count', 2500), bomb('count', 2400))).toEqual([]);          // same digit 3
  });
  it('ring warn -> closed is one hit edge', () => {
    const ring = (state: string) => snap({ families: { gate: [], spike: [], bomb: [], shrink: { state, leftMs: 0, cells: [] } } });
    expect(telegraphEdges(ring('warn'), ring('closed'))).toEqual([{ key: 'r', kind: 'hit' }]);
    expect(telegraphEdges(ring('closed'), ring('fade'))).toEqual([]);
  });
});

describe('MOT-4-R5 HitBeats', () => {
  const fakeMotion = () => { const calls: { t: MotionTarget; peak: number; ms: number; done?: () => void }[] = [];
    return { calls, snap: (t: MotionTarget, peak: number, ms: number, done?: () => void) => { calls.push({ t, peak, ms, done }); t.setScale(peak); } }; };
  it('plays hit edges at telegraphSnapScale/Ms and digit edges at digitPopScale/Ms; scale() reads the live proxy and drops it on done', () => {
    const m = fakeMotion(), beats = new HitBeats(m, cfg);
    beats.play([{ key: 'h:rock:3,4', kind: 'hit' }, { key: 'bd:9', kind: 'digit' }]);
    expect(m.calls[0]).toMatchObject({ peak: cfg.telegraphSnapScale, ms: cfg.telegraphSnapMs });
    expect(m.calls[1]).toMatchObject({ peak: cfg.digitPopScale, ms: cfg.digitPopMs });
    expect(beats.scale('h:rock:3,4')).toBe(cfg.telegraphSnapScale); expect(beats.scale('nope')).toBe(1);
    m.calls[0]!.t.setScale(1); m.calls[0]!.done!();
    expect(beats.scale('h:rock:3,4')).toBe(1);
  });
  it('a repeated key reuses its proxy (kill-by-target) and clear() empties the registry', () => {
    const m = fakeMotion(), beats = new HitBeats(m, cfg);
    beats.play([{ key: 'r', kind: 'hit' }]); beats.play([{ key: 'r', kind: 'hit' }]);
    expect(m.calls[0]!.t).toBe(m.calls[1]!.t);
    beats.clear(); expect(beats.scale('r')).toBe(1);
  });
});
```
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hitBeat` -> FAIL.
- [ ] **Step 3: Implement** `src/game/render/hitBeat.ts`
```ts
// MOT-4-R5 hit beat: one scale snap on the warn -> live snapshot edge, played through motion.snap (kill-by-target, budget, reduced motion).
import type { SimSnapshot } from '../../core';
import type { MotionBalance } from '../../core/balance';
import type { Motion, MotionTarget } from '../motion/motionCore';
import { bombDigit } from './blasts';
import { cellKey, hazardKey } from './telegraph';

export type BeatKind = 'hit' | 'digit';
export interface BeatEdge { key: string; kind: BeatKind }

/** MOT-4-R5 pure snapshot diff: which hazards just went from warning to live, and which bomb digits just changed. Reads snapshots only. */
export function telegraphEdges(prev: SimSnapshot | null, next: SimSnapshot): BeatEdge[] {
  const out: BeatEdge[] = [];
  if (!prev) return out;
  const was = new Map<string, string>();
  for (const h of prev.hazards) was.set(hazardKey(h), h.state);
  for (const h of next.hazards) if (h.state === 'solid' && was.get(hazardKey(h)) === 'warn') out.push({ key: hazardKey(h), kind: 'hit' });
  const cycles = (prefix: 'g' | 's', a: readonly { id: number; cells: readonly { x: number; y: number; vis: string }[] }[], b: typeof a): void => {
    const before = new Map<string, string>();
    for (const g of a) for (const c of g.cells) before.set(cellKey(prefix, g.id, c.x, c.y), c.vis);
    for (const g of b) for (const c of g.cells) { const k = cellKey(prefix, g.id, c.x, c.y); if (c.vis === 'up' && before.get(k) === 'warn') out.push({ key: k, kind: 'hit' }); }
  };
  const gates = (s: SimSnapshot) => s.families.gate.map(g => ({ id: g.id, cells: g.gate }));
  cycles('g', gates(prev), gates(next));
  cycles('s', prev.families.spike, next.families.spike);
  const bombs = new Map(prev.families.bomb.map(b => [b.id, b]));
  for (const b of next.families.bomb) {
    const was2 = bombs.get(b.id);
    if (!was2) continue;
    if (was2.state === 'warn' && b.state !== 'warn') out.push({ key: `b:${b.id}`, kind: 'hit' });
    else if (was2.state === 'count' && b.state === 'count' && bombDigit(was2.leftMs) !== bombDigit(b.leftMs)) out.push({ key: `bd:${b.id}`, kind: 'digit' });
  }
  if (prev.families.shrink?.state === 'warn' && next.families.shrink?.state === 'closed') out.push({ key: 'r', kind: 'hit' });
  return out;
}

const proxy = (): MotionTarget => {
  const t: MotionTarget = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1,
    setScale(x, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a) { t.alpha = a; return t; }, setPosition(x, y = x) { t.x = x; t.y = y; return t; } };
  return t;
};

/** Live beats by key. Draw code reads `scale(key)` (1 when idle). Each beat is one MotionTarget proxy driven by motion.snap. */
export class HitBeats {
  private readonly live = new Map<string, MotionTarget>();
  constructor(private readonly motion: Pick<Motion, 'snap'>,
    private readonly cfg: Pick<MotionBalance, 'telegraphSnapScale' | 'telegraphSnapMs' | 'digitPopScale' | 'digitPopMs'>) {}
  play(edges: readonly BeatEdge[]): void {
    for (const e of edges) {
      const t = this.live.get(e.key) ?? proxy();
      this.live.set(e.key, t);
      const digit = e.kind === 'digit';
      this.motion.snap(t, digit ? this.cfg.digitPopScale : this.cfg.telegraphSnapScale, digit ? this.cfg.digitPopMs : this.cfg.telegraphSnapMs,
        () => { if (this.live.get(e.key) === t) this.live.delete(e.key); });
    }
  }
  scale(key: string): number { return this.live.get(key)?.scaleX ?? 1; }
  clear(): void { this.live.clear(); }
}
```
- [ ] **Step 4: Run** the hitBeat test -> PASS.
- [ ] **Step 5: Wire `GameScene`.**
  - Imports: `import { motionFor } from '../motion';`, `import { HitBeats, telegraphEdges } from '../render/hitBeat';`, `import { telegraphCtx, type TelegraphCtx } from '../render/telegraph';`.
  - Fields (near `private reduced = false;`): `private beats!: HitBeats; private tel!: TelegraphCtx; private prev: SimSnapshot | null = null;`.
  - In `create()` right after `this.reduced = reduceMotion();`: `this.prev = null; this.beats = new HitBeats(motionFor(this), this.balance.motion); this.tel = telegraphCtx(this.balance, key => this.beats.scale(key));`. In the existing `Phaser.Scenes.Events.SHUTDOWN` handler (line ~88-93) add `this.beats.clear();`.
  - In `update()` right after `const snapshot = this.snapshot()!;`: `this.beats.play(telegraphEdges(this.prev, snapshot)); this.prev = snapshot;` (`snapshot()` builds a fresh object per call, so retaining it is safe; under reduced motion `motion.snap` is a no-op, so no beat plays).
  - In `draw()` replace lines ~194-200 with:
```ts
    drawTiles(this.layers.ground, snapshot.tiles, cell, this.tel, this.reduced, this.look);
    drawTerrains(this.layers.terrain, snapshot.terrains, cell, this.look, this.balance, this.reduced, this.tel);
    drawHazards(this.layers.hazards, snapshot.hazards, cell, this.look, this.balance, this.reduced, this.tel);
    drawCycles(this.layers.hazards, snapshot, cell, this.tel, this.reduced);
    drawMovers(this.layers.hazards, snapshot, cell, this.tel, this.reduced);
    drawBlasts(this.layers.hazards, snapshot, cell, this.tel, this.reduced);
    drawShrink(this.layers.hazards, snapshot, cell, time, this.tel, this.reduced);
```
  - `tests/support/scene.ts` (`sceneHarness`, used by `tests/game/hud.test.ts` to run real `GameScene`/`HudScene`): `motionFor(scene)` reads `scene.sys.game.device.input.touch` and `scene.events.once`, and `DrawObject` must look like a `MotionTarget`. Make these harness edits: `DrawObject` add `scaleX = 1; scaleY = 1;` and change `setScale(v: number)` to `setScale(x: number, y = x): this { this.scale = x; this.scaleX = x; this.scaleY = y; return this; }`; `scene.sys` becomes `sys: { isActive: () => true, game: { device: { input: { touch: false } } } }`. Also make sure the `registry` holds a `balance` entry where `GameScene`/`HudScene` tests call `create()` (they already set `balance` for those scenes; if `hud.test.ts` fails with "Cannot read properties of undefined (reading 'motion')", `h.registry.set('balance', loadBalance())` before `create()`).
- [ ] **Step 6: Verify.** `npm run typecheck` (this closes the Tasks 6-8 window), then `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hud tests/game/hitBeat tests/game/boardScene` (fix harness gaps they report).
- [ ] **Step 7: Browser eye-check (NOT unit-testable; mark as done in the commit body).** `npm run dev`, open `http://localhost:5173/?debug=1&level=27` (ring), then levels 17/18/23 (gate, spike, bomb), level 4+ (rock/fence), 16 (coconut lane). Look at: (a) every warning pulses visibly FASTER near the hit (about 2 Hz at the start, about 6 Hz at the end); (b) the "!" / arrows / dashes / ring stay readable at the dimmest frame; (c) the last 300 ms goes to the hard red/orange at full strength; (d) the snap lines up with the solid hit (rock lands, gate closes, spike up, bomb lands, ring closes) and returns to normal size; (e) bomb digit pops on each change; (f) with Settings reduce-motion ON: no pulse, no snap, no digit pop, solid outlines, hard colour still steps at the end; (g) maze + bomb + ring together at 60 fps.
- [ ] **Step 8: Commit.** CHANGELOG: `- feat(motion): MOT-4 hit beat on warn-to-live edges and bomb digit pop (HitBeats, GameScene wiring)`.
```bash
git add src/game/render/hitBeat.ts src/game/scenes/GameScene.ts tests/game/hitBeat.test.ts tests/support/scene.ts CHANGELOG.md
git commit -m "feat(motion): MOT-4 hit beat edges and GameScene telegraph wiring

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Pure HUD helpers and `HudView` fields (`hudMotion.ts`, `hudModel.ts`)

**Files:** Create `src/game/hud/hudMotion.ts`; Test `tests/game/hudMotion.test.ts`; Modify `src/game/hud/hudModel.ts` (`HudView` interface lines 8-13, return object lines ~35-47), `tests/game/hudModel.test.ts` (line ~16 expected object)

**Interfaces:**
- Produces in `hudMotion.ts`:
  - `easeMsFor(prev: number, next: number, cfg: Pick<MotionBalance, 'barEaseMs' | 'barSpendMs'>): number` (spend = lower target = `barSpendMs`, otherwise `barEaseMs`)
  - `type ReadyEdge = 'pop' | 'dip' | null`; `skillReadyEdge(prev: SkillState | null, next: SkillState | null): ReadyEdge` (`off -> ready` = `'pop'`, `ready -> off` = `'dip'`)
  - `levelTitleChanged(prev: string | null, next: string): boolean` (false on first paint)
  - `type EnergyCue = 'low' | 'full' | 'none'`; `energyCue(fill: number, lowFrac: number): EnergyCue`
  - `type ChipTransition = 'in' | 'out' | 'cross' | 'none'`; `chipTransition(prev: string | null, next: string | null): ChipTransition` (arguments are chip KINDS: a new kind crosses, same kind with new text is `'none'`)
- Adds to `HudView` (Task 11 consumes): `scoreValue: number`, `quotaFill: number` (progress / need clamped; 0 at max level), `quotaBar: boolean` (false at max level), `quotaLast: boolean` (`need - progress === 1`, not at max).
- Deviation recorded: no `displayScore` helper; the score tick uses `motion.ease` + `Math.round` (see Deviations 2).

- [ ] **Step 1: Write the failing tests** `tests/game/hudMotion.test.ts`
```ts
import { describe, expect, it } from 'vitest';
import { chipTransition, easeMsFor, energyCue, levelTitleChanged, skillReadyEdge } from '../../src/game/hud/hudMotion';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;

describe('MOT-4 hudMotion', () => {
  it('MOT-4-R9 a spend eases in barSpendMs, a gain in barEaseMs', () => {
    expect(easeMsFor(0.8, 0.4, cfg)).toBe(cfg.barSpendMs); expect(easeMsFor(0.4, 0.8, cfg)).toBe(cfg.barEaseMs); expect(easeMsFor(0.4, 0.4, cfg)).toBe(cfg.barEaseMs);
  });
  it('MOT-4-R11 skillReadyEdge: off -> ready pops, ready -> off dips, everything else is quiet', () => {
    expect(skillReadyEdge('off', 'ready')).toBe('pop'); expect(skillReadyEdge('ready', 'off')).toBe('dip');
    for (const [a, b] of [['off', 'off'], ['ready', 'ready'], ['ready', 'active'], ['active', 'ready'], [null, 'ready'], ['ready', null]] as const) expect(skillReadyEdge(a, b)).toBeNull();
  });
  it('MOT-4-R12 level title: first paint never animates, a change does, the same title does not', () => {
    expect(levelTitleChanged(null, 'Level 1')).toBe(false); expect(levelTitleChanged('Level 1', 'Level 2')).toBe(true); expect(levelTitleChanged('Level 2', 'Level 2')).toBe(false);
  });
  it('MOT-4-R10 energyCue: low at or below the threshold, full at 1, else none', () => {
    expect(energyCue(0.2, cfg.energyLowFrac)).toBe('low'); expect(energyCue(0, cfg.energyLowFrac)).toBe('low');
    expect(energyCue(0.21, cfg.energyLowFrac)).toBe('none'); expect(energyCue(1, cfg.energyLowFrac)).toBe('full'); expect(energyCue(0.99, cfg.energyLowFrac)).toBe('none');
  });
  it('MOT-4-R13 chipTransition: appear, clear, kind change, same kind', () => {
    expect(chipTransition(null, 'ramp')).toBe('in'); expect(chipTransition('ramp', null)).toBe('out');
    expect(chipTransition('ramp', 'checkpoint')).toBe('cross'); expect(chipTransition('ramp', 'ramp')).toBe('none'); expect(chipTransition(null, null)).toBe('none');
  });
});
```
  and in `tests/game/hudModel.test.ts`: update the expected object at line ~16 to include `scoreValue: 44, quotaFill: 0.5, quotaBar: true, quotaLast: false` (snap has `progress 3`, `need 6`), and add
```ts
it('MOT-4-R8 quotaFill / quotaLast: fill = progress/need, last mango flagged, max level has no bar', () => {
  expect(hudView(snap({ progress: 5, need: 6 }), hint, b, t)).toMatchObject({ quotaFill: 5 / 6, quotaLast: true, quotaBar: true });
  expect(hudView(snap({ progress: 0, need: 6 }), hint, b, t)).toMatchObject({ quotaFill: 0, quotaLast: false });
  expect(hudView(snap({ level: 30, progress: 2, need: 8 }), hint, b, t)).toMatchObject({ quotaFill: 0, quotaLast: false, quotaBar: false });
});
```
  (If `snap()` does not take `level` overrides, reuse the call the existing "max level shows Max" test makes at line ~24 and add `toMatchObject` assertions to it.)
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hudMotion tests/game/hudModel` -> FAIL.
- [ ] **Step 3: Implement.** `src/game/hud/hudMotion.ts`:
```ts
// MOT-4 pure HUD motion decisions (what changed, which cue, how long); the Phaser views only play them. Spec section 6.
import type { MotionBalance } from '../../core/balance';
import type { SkillState } from './hudModel';

/** MOT-4-R9 a spend (target falls) eases faster than a gain. */
export const easeMsFor = (prev: number, next: number, cfg: Pick<MotionBalance, 'barEaseMs' | 'barSpendMs'>): number => next < prev ? cfg.barSpendMs : cfg.barEaseMs;

export type ReadyEdge = 'pop' | 'dip' | null;
/** MOT-4-R11 off -> ready pops, ready -> off dips; active transitions and first paint are quiet. */
export const skillReadyEdge = (prev: SkillState | null, next: SkillState | null): ReadyEdge =>
  prev === 'off' && next === 'ready' ? 'pop' : prev === 'ready' && next === 'off' ? 'dip' : null;

/** MOT-4-R12 the first paint of a run never animates. */
export const levelTitleChanged = (prev: string | null, next: string): boolean => prev !== null && prev !== next;

export type EnergyCue = 'low' | 'full' | 'none';
/** MOT-4-R10 low at or below energyLowFrac, full at exactly 1. */
export const energyCue = (fill: number, lowFrac: number): EnergyCue => fill >= 1 ? 'full' : fill <= lowFrac ? 'low' : 'none';

export type ChipTransition = 'in' | 'out' | 'cross' | 'none';
/** MOT-4-R13 arguments are chip kinds; a text-only change (ramp countdown) is quiet. */
export const chipTransition = (prev: string | null, next: string | null): ChipTransition =>
  prev === null ? (next === null ? 'none' : 'in') : next === null ? 'out' : prev !== next ? 'cross' : 'none';
```
  `hudModel.ts`: add to `HudView` `scoreValue: number; quotaFill: number; quotaBar: boolean; quotaLast: boolean;` and to the returned object (after `score: String(s.score), ...`): `scoreValue: s.score, quotaFill: max ? 0 : clamp01(s.progress / s.need), quotaBar: !max, quotaLast: !max && s.need - s.progress === 1,`.
- [ ] **Step 4: Run** the two test files -> PASS; `npm run typecheck`.
- [ ] **Step 5: Commit.** CHANGELOG: `- feat(hud): MOT-4 pure HUD motion helpers and score/quota view fields`.
```bash
git add src/game/hud/hudMotion.ts src/game/hud/hudModel.ts tests/game/hudMotion.test.ts tests/game/hudModel.test.ts CHANGELOG.md
git commit -m "feat(hud): MOT-4 pure HUD motion helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: `HudTop` motion (score tick, quota bar + pop, energy ease and cues, title, chip, bump/plantFlag onto motion)

**Files:** Modify `src/game/hud/HudTop.ts` (imports lines 1-11, constants `M` line ~14, fields ~line 23-31, constructor, `apply` lines ~51-67, `drawRow` ~69-88, `drawChip` ~89-100, `bump`/`plantFlag` ~106-122); Test `tests/game/hud.test.ts` (extend; it builds real HudTop through `sceneHarness`)

**Interfaces:**
- Consumes `motionFor`, `Motion.ease/snap/slideIn/fadeIn/fadeOut/pulse/popIn` (MOT-0 + Task 4), `energyCue`, `easeMsFor`, `levelTitleChanged`, `chipTransition` (Task 10), `HudView.scoreValue/quotaFill/quotaBar/quotaLast` (Task 10), `TOKENS.danger.text`.
- Produces: unchanged public API (`apply`, `point`, `bump`, `plantFlag`, `pauseButton`); `bump(target, scale, ms)` now plays through `motion.snap`.

- [ ] **Step 1: Write the failing tests** in `tests/game/hud.test.ts` (reuse its existing HudScene/HudTop construction helper; if it only builds `HudScene`, read `scene.top` the same way the existing HudTop assertions do). Cases, each with a recording `scene.tweens` in the harness (`tests/support/scene.ts` `tweens.add` currently discards; change it to `add: (v: Record<string, unknown>) => { (scene as any).adds?.push(v); return { stop: () => {} }; }` or give `sceneHarness()` an `adds: Record<string, unknown>[]` array it fills):
```ts
it('MOT-4-R7 a rising score ticks up through motion.ease; the first paint and a falling score jump', () => {
  const { top, adds } = hudTopFixture();                      // existing/new helper: real HudTop on sceneHarness, reduced motion off
  top.apply(view({ score: '10', scoreValue: 10 }), false, true);
  expect(top.scoreText()).toBe('10'); expect(adds.length).toBe(0);                  // first paint: no tween
  top.apply(view({ score: '40', scoreValue: 40 }), false, true);
  expect(adds.some(a => a.duration === cfg.hudTickMs)).toBe(true);
  (adds.find(a => a.duration === cfg.hudTickMs)!.onComplete as () => void)();
  expect(top.scoreText()).toBe('40');
});
it('MOT-4-R7 under reduced motion the score jumps with no tween', () => { /* same fixture with reduceMotion() mocked true: apply 10 then 40 -> scoreText '40', adds.length 0 */ });
it('MOT-4-R9 an energy spend eases in barSpendMs and a gain in barEaseMs; the bar redraws only while easing or on a target change', () => { /* adds contains duration barSpendMs after fill 0.8 -> 0.4, barEaseMs after 0.4 -> 0.8 */ });
it('MOT-4-R12 level title change slides in once; the first title does not animate', () => { /* apply title 'Level 1' (no tween), then 'Level 2' -> a tween with y offset / alpha on the title */ });
```
  Because `HudTop` text/graphics accessors are private, add a tiny read-only test seam: `scoreText(): string { return this.score.text; }` (public, documented "test seam"). `view(...)` is a local helper that spreads overrides over a full `HudView` literal.
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hud` -> FAIL.
- [ ] **Step 3: Implement** `HudTop.ts`.
  - Imports add: `import { motionFor } from '../motion'; import type { Motion } from '../motion';` (`Motion` is exported through `index.ts` via `export * from './motionCore'`), `import { chipTransition, easeMsFor, energyCue, levelTitleChanged, type EnergyCue } from './hudMotion';`.
  - Constants: extend `M` with `quotaBarH: 4, quotaBarInset: 14, quotaBarGap: 5` (mockup px; eye-check the bar does not touch the quota text).
  - Fields (replace `private fill = -1;` and `iconBase`): 
```ts
  private readonly motion: Motion; private readonly cfg: Balance['motion'];
  private readonly chipBox: Phaser.GameObjects.Container;
  private row: StatsRow | null = null; private quotaBar = false; private cueKey = '';
  private scoreTarget = -1; private scoreW = 0; private readonly scoreEase = { v: 0 };
  private quotaTarget = -1; private quotaShown = 0; private readonly quotaEase = { v: 0 };
  private energyTarget = -1; private energyShown = 0; private readonly energyEase = { v: 0 };
  private stopBolt: (() => void) | null = null; private stopQuota: (() => void) | null = null;
  private titleSeen: string | null = null; private chipKind: string | null = null;
```
    (import `Balance` type from `'../../core'`; remove the `iconBase` map and its two uses, and the old `fill` field).
  - Constructor, after `this.chipBase = this.chipIcon.scaleX;`: 
```ts
    this.motion = motionFor(scene); this.cfg = (scene.registry.get('balance') as Balance).motion;
    this.chipBox = scene.add.container(0, 0, [this.chipG, this.chipIcon, this.chipText]);   // one animated target: children keep world coordinates
```
  - `apply(v, paused, pauseEnabled)`:
```ts
    const th = uiTheme(themeOf(currentPalette()));
    const titleMoved = levelTitleChanged(this.titleSeen, v.levelTitle); this.titleSeen = v.levelTitle;
    this.level.setText(v.levelTitle).setColor(th.title); this.biome.setText(v.biomeName).setColor(th.soft);
    if (titleMoved) { this.motion.slideIn(this.level, 'down'); this.motion.slideIn(this.biome, 'down', 1); }   // R12: biome staggered by staggerMs
    this.done.setText(v.quota.done); this.total.setText(v.quota.total); this.energy.setText(v.energy.text);
    if (v.scoreValue !== this.scoreTarget) this.retargetScore(v.scoreValue);
    const w = (t: Phaser.GameObjects.Text): number => t.width / UI_SCALE;
    const row = statsRow({ quota: w(this.done) + w(this.total), score: this.scoreW, energy: w(this.energy) });
    const key = JSON.stringify(row) + String(v.quotaBar);
    this.quotaBar = v.quotaBar;
    this.syncBars(v.quotaFill, v.energy.fill);
    if (key !== this.rowKey) { this.rowKey = key; this.row = row; this.drawRow(row); }
    this.syncCues(v);
    this.drawChip(v.chip);
    // pause button block unchanged (pk / drawPause)
```
    (the old `this.score.setText(v.score)` line is removed: the score text is driven by `retargetScore`.)
  - New private methods:
```ts
  /** MOT-4-R7 rising score ticks via motion.ease (same cubicOut as countUp; ease, not countUp, so the P3a bump cannot freeze it). */
  private retargetScore(target: number): void {
    const first = this.scoreTarget < 0, from = this.scoreEase.v;
    this.scoreTarget = target;
    this.score.setText(String(target)); this.scoreW = this.score.width / UI_SCALE;          // layout uses the FINAL width
    this.scoreEase.v = first || target <= from ? target : from;
    if (first || target <= from) { this.motion.ease(this.scoreEase, target, 0, () => {}); return; }
    this.score.setText(String(Math.round(from)));
    this.motion.ease(this.scoreEase, target, this.cfg.hudTickMs, x => { this.score.setText(String(Math.round(x))); });
  }
  /** MOT-4-R8/R9 quota and energy fills ease; first paint and a falling quota (level-up reset) jump; a spend eases faster. */
  private syncBars(quota: number, energy: number): void {
    if (quota !== this.quotaTarget) {
      const jump = this.quotaTarget < 0 || quota < this.quotaTarget; this.quotaTarget = quota;
      if (this.quotaTarget >= 0 && !jump) this.bump('levelBar', this.cfg.releaseOvershoot, this.cfg.tapUpMs);   // R8 pill pop on a progress change
      this.motion.ease(this.quotaEase, quota, jump ? 0 : this.cfg.barEaseMs, x => { this.quotaShown = x; this.redrawRow(); });
    }
    if (energy !== this.energyTarget) {
      const first = this.energyTarget < 0, ms = first ? 0 : easeMsFor(this.energyTarget, energy, this.cfg); this.energyTarget = energy;
      this.motion.ease(this.energyEase, energy, ms, x => { this.energyShown = x; this.redrawRow(); });
    }
  }
  private redrawRow(): void { if (this.row) this.drawRow(this.row); }
  /** MOT-4-R10 low energy: bolt pulses; full: one bolt pop. R8: the mango icon pulses while one mango is left. Cues are additive, never the only signal. */
  private syncCues(v: HudView): void {
    const cue = energyCue(v.energy.fill, this.cfg.energyLowFrac), key = `${cue}|${v.quotaLast}`;
    if (key === this.cueKey) return;
    const prev = this.cueKey.split('|')[0]; this.cueKey = key;
    this.stopBolt?.(); this.stopBolt = null; this.stopQuota?.(); this.stopQuota = null;
    if (cue === 'low') this.stopBolt = this.motion.pulse(this.icons[2]!);
    else if (cue === 'full' && prev !== '' && prev !== 'full') this.motion.popIn(this.icons[2]!);
    if (v.quotaLast) this.stopQuota = this.motion.pulse(this.icons[0]!);
  }
```
  - `drawRow(r)`: remove the `fill` parameter; at its end replace the energy fill block with
```ts
    const bx = ui(r.energy.bar), bh = ui(M.bar), bw = ui(r.energy.barW), low = energyCue(this.energyShown, this.cfg.energyLowFrac) === 'low';
    g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(bx, cy - bh / 2, bw, bh, bh / 2);
    if (this.energyShown > 0) g.fillStyle(toInt(low ? TOKENS.danger.text : TOKENS.sky.energy)).fillRoundedRect(bx, cy - bh / 2, Math.max(bh, bw * this.energyShown), bh, bh / 2);   // R10 low = warn hue
    if (this.quotaBar) {          // R8 quota fill bar, none at the max level
      const qh = ui(M.quotaBarH), qx = ui(r.quota.x) + ui(M.quotaBarInset), qw = ui(r.quota.w) - 2 * ui(M.quotaBarInset), qy = y + h - qh - ui(M.quotaBarGap);
      g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(qx, qy, qw, qh, qh / 2);
      if (this.quotaShown > 0) g.fillStyle(toInt(TOKENS.hud.quota)).fillRoundedRect(qx, qy, Math.max(qh, qw * this.quotaShown), qh, qh / 2);
    }
```
    and delete the line `for (const i of this.icons) this.iconBase.set(i, i.scaleX);`.
  - `drawChip(chip)` (container-based transitions, R13):
```ts
  private drawChip(chip: HudView['chip']): void {
    const kind = chip?.kind ?? null, tr = chipTransition(this.chipKind, kind); this.chipKind = kind;
    if (chip === null) {
      if (tr === 'out') this.motion.fadeOut(this.chipBox); else if (this.chipKey === '') this.chipBox.setVisible(false);
      this.chipKey = ''; return;
    }
    const text = chip.text, icon = chipHasIcon(chip.kind);
    this.chipBox.setVisible(true); this.chipText.setVisible(true); this.chipIcon.setVisible(icon);
    const key = `${chip.kind}|${text}`;
    if (key !== this.chipKey) {
      this.chipKey = key; this.chipText.setText(text);
      const { cx, y, h } = this.l.chip, tw = this.chipText.width, pad = ui(M.chipPadL), ic = icon ? ui(M.chipIcon) : 0, gap = icon ? ui(M.chipGap) : 0;
      const w = pad + ic + gap + tw + ui(M.chipPadR), x = cx - w / 2;
      this.chipG.clear(); drawCard(this.chipG, x, y, w, h, h / 2, TOKENS.surface.card);
      this.chipIcon.setPosition(x + pad + ic / 2, y + h / 2); this.chipText.setPosition(x + pad + ic + gap, y + h / 2).setOrigin(0, 0.5);
    }
    if (tr === 'in') this.motion.slideIn(this.chipBox, 'down');                 // fade + slide in
    else if (tr === 'cross') { this.chipBox.setAlpha(0); this.motion.fadeIn(this.chipBox); }   // cross-fade over fadeMs
  }
```
  - `bump(target, scale, ms)` and `plantFlag(ms)` move onto motion:
```ts
  bump(target: HudTarget, scale: number, ms: number): void {
    const parts = target === 'score' ? [this.icons[1]!, this.score] : target === 'levelBar' ? [this.icons[0]!, this.done, this.total] : [this.icons[2]!, this.energy];
    for (const o of parts) this.motion.snap(o, scale, ms, target === 'score' ? undefined : () => { this.cueKey = ''; });   // re-arm the pulse cues a bump interrupted
  }
  plantFlag(ms: number): void {
    if (ms <= 0) return;          // reduced motion is gated in the mapper (ms 0)
    this.motion.popIn(this.chipIcon);
  }
  /** Test seam: the score text as drawn right now. */
  scoreText(): string { return this.score.text; }
```
    Delete the now-unused `this.scene.tweens` uses (the `scene` constructor property stays; `chipBase` is no longer read, delete it and its assignment).
- [ ] **Step 4: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/hud tests/game/hudViews tests/game/hudChip tests/game/hudLayout` -> PASS; `npm run typecheck`.
- [ ] **Step 5: Browser eye-check (not unit-testable).** `npm run dev`, start a run: score counts up smoothly in about 360 ms and a fast second pickup retargets instead of stalling; quota bar fills with an ease and the pill pops; at one mango left the mango icon pulses; energy bar eases up, drops faster on a cast; at 20% or less the bar is the red hue and the bolt pulses; at 100% one pop; title slides up with the biome line a beat later when a level changes; chip slides in on appear, fades on clear, cross-fades on kind change, ramp countdown text changes do not re-animate; the quota bar does not collide with the quota text on a 360 px phone width; reduce-motion ON: everything jumps (one soft fade for title/chip).
- [ ] **Step 6: Commit.** CHANGELOG: `- feat(hud): MOT-4 score tick-up, quota bar, energy easing and cues, title and chip transitions via motion API`.
```bash
git add src/game/hud/HudTop.ts tests/game/hud.test.ts tests/support/scene.ts CHANGELOG.md
git commit -m "feat(hud): MOT-4 HudTop number and bar motion

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: `SkillButtons` ready pop, dip and eased charge (R11)

**Files:** Modify `src/game/hud/SkillButtons.ts` (imports, `Slot`, constructor, `apply`/`draw`, `shake`); Test `tests/game/hud.test.ts` (extend) or new `tests/game/skillButtons.test.ts` using `sceneHarness`

**Interfaces:**
- Consumes `motionFor`, `Motion.release/ease/shake` (MOT-0 + Task 4), `skillReadyEdge`, `easeMsFor` (Task 10), `balance.motion.{barEaseMs,barSpendMs,readyDipMs,reducedPressAlpha}`.
- Produces: unchanged public API (`apply`, `point`, `shake`). `chargeSegment` in `gaugeGeometry.ts` is NOT touched (quantised steps stay; the caller interpolates `charge`).

- [ ] **Step 1: Write the failing tests** (new `tests/game/skillButtons.test.ts`, building `new SkillButtons(scene as never, layout, () => {}, balance)` on `sceneHarness()` with a recording `tweens.add`, `layout = hudLayout(...)` the same way `tests/game/hud.test.ts` obtains one):
```ts
it('MOT-4-R11 off -> ready pops the slot (scale to releaseOvershoot over tapUpMs) and keeps the glow stroke', () => {
  const { sb, adds, slotCommands } = fixture();
  sb.apply([skill('off', 0.5), null]); sb.apply([skill('ready', 1), null]);
  expect(adds.some(a => a.scaleX === b.motion.releaseOvershoot)).toBe(true);
  expect(slotCommands(0).some(c => c[0] === 'strokeCircle')).toBe(true);   // the existing M.glow ring
});
it('MOT-4-R11 ready -> off dips alpha for readyDipMs with no scale change', () => {
  const { sb, adds } = fixture();
  sb.apply([skill('ready', 1), null]); sb.apply([skill('off', 0.5), null]);
  expect(adds.some(a => a.duration === b.motion.readyDipMs && !('scaleX' in a))).toBe(true);
});
it('MOT-4-R11 the first paint, active and unchanged states do not animate; reduced motion pops nothing', () => { /* apply ready first -> adds.length 0; ready->active -> no pop; reduce on -> adds.length 0 */ });
it('MOT-4-R11 charge steps stay quantised but the shown charge eases over barEaseMs (spend: barSpendMs)', () => {
  const { sb, adds } = fixture();
  sb.apply([skill('off', 0.2), null]); sb.apply([skill('off', 0.6), null]);
  expect(adds.some(a => a.duration === b.motion.barEaseMs)).toBe(true);
  sb.apply([skill('off', 0.1), null]);
  expect(adds.some(a => a.duration === b.motion.barSpendMs)).toBe(true);
});
```
  (`skill(state, charge)` is a local `SkillView` builder `{ slot: 0, id: 'slowmo', cost: 40, state, ring: null, charge }`; `slotCommands(0)` reads the `skill-0-face` DrawObject via `h.find('skill-0-face').commands`.)
- [ ] **Step 2: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/skillButtons` -> FAIL.
- [ ] **Step 3: Implement** `SkillButtons.ts`.
  - Imports: `import { motionFor, type Motion } from '../motion'; import { easeMsFor, skillReadyEdge } from './hudMotion'; import type { SkillState } from './hudModel';` (remove the `reduceMotion` import if it becomes unused: `shake` no longer needs it, motion handles reduced).
  - `Slot` adds `state: SkillState | null; view: SkillView | null; chargeTarget: number; shownCharge: number; charge: { v: number }; dip: { v: number }`; the constructor initialises `state: null, view: null, chargeTarget: -1, shownCharge: 0, charge: { v: 0 }, dip: { v: 1 }`. Add `private readonly motion: Motion;` set in the constructor body: `this.motion = motionFor(scene);`.
  - `apply` unchanged. Replace `draw(slot, k)` with:
```ts
  private draw(slot: 0 | 1, k: SkillView | null): void {
    const s = this.slots[slot]!, cfg = this.b.motion;
    for (const o of [s.c, s.costG, s.cost, s.bolt]) o.setVisible(k !== null);
    const edge = skillReadyEdge(s.state, k?.state ?? null); s.state = k?.state ?? null; s.view = k;
    if (!k) { s.key = ''; return; }
    if (edge === 'pop') this.motion.release(s.c);                                         // 1 -> releaseOvershoot -> 1 over tapUpMs (R11)
    else if (edge === 'dip') { s.c.setAlpha(cfg.reducedPressAlpha); s.dip.v = cfg.reducedPressAlpha; this.motion.ease(s.dip, 1, cfg.readyDipMs, v => { s.c.setAlpha(v); }); }   // 80 ms alpha dip, no scale
    if (k.charge !== s.chargeTarget) {                                                    // eased charge between the quantised gauge steps
      const first = s.chargeTarget < 0, ms = first ? 0 : easeMsFor(s.chargeTarget, k.charge, cfg); s.chargeTarget = k.charge;
      this.motion.ease(s.charge, k.charge, ms, v => { s.shownCharge = v; this.paint(slot); });
    }
    this.paint(slot);
  }
  private paint(slot: 0 | 1): void {
    const s = this.slots[slot]!, k = s.view, r = this.l.skills[slot];
    if (!k) return;
    s.cost.setText(String(k.cost));
    const fill = k.state === 'active' ? 0 : Math.round(Math.min(1, Math.max(0, s.shownCharge)) * M.chargeSteps); // UIFIX-R12 quantised gauge steps
    // ...the rest of the old draw() body from `const key = ...` onward is unchanged (key string, redraw guard, face, glow, charge fill, ring, cost chip)
  }
```
    Under reduced motion `ease(..., ms)` jumps to the target, `release` does nothing but restore alpha, and the dip branch sets alpha then `ease` jumps back to 1 in the same call (no visible dip), so the ready state keeps only its static glow. A `dip` call is harmless then.
  - `shake(slot)`: `this.motion.shake(this.slots[slot]!.c);` (delete the old `scene.tweens` body and the `reduceMotion` guard: `motion.shake` already skips under reduced motion and uses the same `ui.hud.rejectShakeAmpPx/Ms` through `motionFor`'s `deps.shake`).
- [ ] **Step 4: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/skillButtons tests/game/hud tests/game/gaugeGeometry` -> PASS; `npm run typecheck`.
- [ ] **Step 5: Browser eye-check.** Collect energy: the gauge fills smoothly between steps, a cast drains slightly faster, reaching affordability pops the button once with the glow ring, spending dips alpha briefly, a rejected cast still shakes the button, reduce-motion shows none of it.
- [ ] **Step 6: Commit.** CHANGELOG: `- feat(hud): MOT-4 skill ready pop, spend dip and eased charge gauge; skill shake via motion adapter`.
```bash
git add src/game/hud/SkillButtons.ts tests/game/skillButtons.test.ts CHANGELOG.md
git commit -m "feat(hud): MOT-4 skill button ready cues

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Docs, full verification and merge into `version/v0.3`

**Files:** Modify `docs/CODEMAP.md`, `docs/DECISIONS.md`, `CHANGELOG.md` (only if a line is missing), MEC section 8 pointers (`docs/specs/mechanics/MEC-004*.md`, `MEC-013*`, `MEC-014*`, `MEC-017*`, `MEC-018*`), `docs/STATUS.md` (AGENTS 3.1), optionally the spec status line.

**Interfaces:** none (documentation and verification).

- [ ] **Step 1: CODEMAP.** In `docs/CODEMAP.md`: (a) in the `src/game/` module row keep the render/hud list but add `render/telegraph.ts` (pure telegraph pulse, TelegraphCtx), `render/hitBeat.ts` (snapshot edge diff + HitBeats), `hud/hudMotion.ts` (pure HUD motion helpers); (b) extend the existing `src/game/motion/` row with "`snap` / `ease` (MOT-4)"; (c) add a new row `src/game/render/telegraph.ts + hitBeat.ts + hud/hudMotion.ts` with Requirement IDs `MOT-4-R1..R13` and tests `tests/game/telegraph.test.ts, hitBeat.test.ts, telegraphRender.test.ts, hudMotion.test.ts, skillButtons.test.ts, tests/core/warnDirection.test.ts`; keep the file under ~80 lines and refresh the `Updated:` date to 2026-11-10.
- [ ] **Step 2: DECISIONS.** Append four entries to `docs/DECISIONS.md` in the file's existing heading style (`## 2026-11-10 - ...` with Context / Choice / Alternative / Consequence): (1) "MOT-4 two extra motion keys" (`digitPopScale`, `readyDipMs`; alternative: magic numbers in code, rejected by the no-magic-numbers rule); (2) "MOT-4 score tick through motion.ease" (alternative `motion.countUp` rejected: P3a `bump` kills the Text's tweens; `HudTop.bump` now uses `motion.snap`); (3) "MOT-4 hit-beat key and snap primitive" (hazards have no id, key = type + first cell; `Motion.snap` / `Motion.ease` added to the adapter); (4) "MOT-4 additive warnLeftMs" (presentation-only snapshot field on gate and spike cells; alternative: infer remaining time in the renderer from frame diffs, rejected: not replay-safe).
- [ ] **Step 3: MEC pointers.** `ls docs/specs/mechanics | grep -E "MEC-(004|013|014|017|018)"`; at the end of each file's section 8 (or the file end if it has none) add one line: `Telegraph rhythm, alpha floor, hit beat and digit pop are presentation only and live in docs/superpowers/specs/2026-11-10-motion-4-telegraph-hud-feedback-design.md (MOT-4); no rule change.`
- [ ] **Step 4: STATUS.** Rewrite `docs/STATUS.md` (<= 60 lines): Now = MOT-4 merged into `version/v0.3`; Next = owner browser eye-check (60 fps on a mid-range phone) and MOT-1..3 per their plans; Last session = this task list.
- [ ] **Step 5: Full verification (sequential).**
```bash
npm test -- --configLoader native --pool threads --maxWorkers 2
npm run typecheck
grep -rn "scene.tweens.add\|this.tweens.add" src/game/motion src/game/render src/game/hud
```
  Expected: tests and typecheck pass; the grep returns nothing for `src/game/motion` and `src/game/render`, and nothing in `src/game/hud` (the HUD `bump`/`shake`/`plantFlag` were migrated; `GameScene.shake` and juice/effects files are outside this plan and keep their P3a tweens). Also `grep -rn "blinkOn" src/game` lists only its definition in `src/game/render/movers.ts`.
- [ ] **Step 6: Exit-criteria checklist (spec section 9).** Confirm by test or eye-check: `telegraphPulse` and HUD helpers merged with tests (Tasks 3, 10); all nine telegraph families use it (hazards/terrain Task 6, tiles/lanes Task 7, gates/spikes/bombs/ring Task 8); score, quota, energy, skill ready, title and chip transitions run through the MOT-0 API (Tasks 11, 12); reduced motion verified (Task 3 unit, Tasks 9/11/12 eye-checks); no warn shorter than before (`MOT-4-R3` tests green); 60 fps eye-check on a mid-range phone (owner, listed in Task 9 Step 7).
- [ ] **Step 7: Commit docs.**
```bash
git add docs CHANGELOG.md
git commit -m "docs: MOT-4 CODEMAP, DECISIONS, MEC pointers and STATUS

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
  (CHANGELOG line: `- docs: MOT-4 CODEMAP, decisions, MEC section 8 pointers`.)
- [ ] **Step 8: Merge into the version branch (no PR, `--no-ff`) and refresh the index.**
```bash
git checkout version/v0.3
git merge --no-ff feat/motion-4-telegraph-hud -m "Merge branch 'feat/motion-4-telegraph-hud' into version/v0.3"
npm test -- --configLoader native --pool threads --maxWorkers 2 && npm run typecheck
node .gitnexus/run.cjs analyze --index-only --workers 2
```
  (Run the last command in the background; do not block on it. Do not push. If MOT-1/2/3 were merged first and `motionCore.ts`/`HudTop.ts` conflict, keep both sides: `Motion` additions are additive, and re-run the full suite.)

---

## Self-review
**Spec coverage.** R1 pure pulse from remaining time (Task 3). R2 tightens never hides, alpha floor, symbol always drawn (Tasks 3, 6, 7, 8 tests). R3 warn never shorter, gated on state not phase (Task 3 fairness test + "no blink-off frame" tests in Tasks 7, 8). R4 per-family mapping: rock/rise/fence/maze (Task 6), mud/ice and coconut/NPC lane (Task 7), gate/spike/bomb warn/bomb count/ring (Task 8); `blinkOn` retained only as the reduced fallback. R5 hit beat on the snapshot edge via `motion` with kill-by-target (Tasks 4, 9). R6 urgent window (Tasks 3, 6, 7). R7 score tick (Task 11, deviation 2). R8 quota fill, pop, last-mango pulse, no bar at max (Tasks 10, 11). R9 energy ease, spend faster, redraw only while easing (Task 11). R10 low/full cues (Tasks 10, 11). R11 skill ready pop/dip, eased charge, `chargeSegment` untouched (Task 12). R12 title slide with biome stagger, first paint quiet (Tasks 10, 11). R13 chip in/out/cross, `plantFlag` on `popIn` (Tasks 10, 11). Section 3 keys (Task 2; ten already existed from MOT-0, two added). Section 4 reduced motion (pulse static, urgent kept, snap/pop skipped, HUD jumps with one soft fade: Tasks 3, 4, 8, 11, 12). Section 5 performance (allocation-free `SCRATCH` pulses, tweens via `motion`, redraw guards kept). Section 6 testing (all named pure helpers; the browser-only items are explicit eye-check steps in Tasks 9, 11, 12). Section 7 files (all touched; `GameScene` for edges and the `warnLeftMs` additive fields called out). Task 1 confirms and records the direction of `t`.
**Placeholder scan.** Code appears in every code step. Steps that say "same fixture as above" in Task 11 (reduced score, energy spend, title) name the exact assertions and values; the executing agent writes them from the first case's fixture (a `hudTopFixture()` and `view()` helper to be added beside the first test, using `sceneHarness()` as `tests/game/hud.test.ts` already does).
**Type consistency.** `telegraphPulse(remaining, warn, cfg, reduced?, out?)`, `TelegraphCtx.warnMs.{mud,ice,gate,spike,bomb,bombCount,shrink}`, `tel.beat(key)` and the beat keys (`h:`, `g:`, `s:`, `b:`, `bd:`, `r`) are identical in Tasks 3, 6, 8, 9. `drawWarn(..., ms, warnMs, ..., reduced, cfg)` matches its three call sites (hazards, terrains, tests). `Motion.snap(t, peak, ms, onDone?)` / `Motion.ease(proxy, to, ms, onUpdate)` match Tasks 4, 9, 11, 12. `HudView.scoreValue/quotaFill/quotaBar/quotaLast` match Tasks 10, 11. `cycleWarnLeft`, `GateView.gate[].warnLeftMs`, `SpikeView.cells[].warnLeftMs` match Tasks 5, 8, 9.

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-11-10-motion-4-telegraph-hud-feedback.md`. Two execution options:
1. **Subagent-Driven (recommended)**: one fresh subagent per task with review between tasks (REQUIRED SUB-SKILL: superpowers:subagent-driven-development).
2. **Inline Execution**: execute tasks in one session with checkpoints (REQUIRED SUB-SKILL: superpowers:executing-plans).
