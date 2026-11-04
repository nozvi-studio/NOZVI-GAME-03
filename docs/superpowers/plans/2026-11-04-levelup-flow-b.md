# Level-up Flow B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A level up no longer stops the game: no `transition` phase, no level-up crumble, all timers keep running, skills can always be cast, and a tiered, linearly easing slowdown (MEC-003-R22) gives the player time to read the non-blocking "Level N" banner.

**Architecture:** The pure core (`src/core`) loses the transition branch of `stepMs`, `levelStart`, every `HazardFamily.onLevelEnd` hook and the `busy` skill rejection. A new pure module `src/core/slowdown.ts` owns the slowdown state (`SimState.levelUpSlow`), its tier lookup and its per-ms countdown; `effectiveTick` takes `max(Slow-mo factor, slowdown factor)` over the MEC-008 base tick. The director skips while a slowdown is active, so its `firstSpawnMs` timer starts when the slowdown ends. The game layer only changes the level-up banner duration.

**Tech Stack:** TypeScript strict, Vitest, Phaser 3 (HUD only), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-04-levelup-flow-b-design.md` (owner-approved 2026-11-04). Affected mechanic specs: MEC-001-R9/R11, MEC-002-R8/R10/EC4, MEC-003-R7..R11 (+ new R22), MEC-006-R10/R13/R16/R17/R35/EC15, `docs/ARCHITECTURE.md` "Sim step order".

## Owner answers (2026-11-04)
1. **Rotten rock lifetime:** keep MEC-002-R7 (5000 ms life, then 450 ms crumble). Only the level-up crumble is removed. The spec rule 5 sentence was a lead error and is corrected.
2. **Level-up banner duration:** use `ui.bannerMs` (1800 ms), like every other HUD banner. `level.transitionMs` no longer drives anything; Task 6 removes it.

## Global Constraints
- English only in files (AGENTS §0). Conventional Commits. Work on one task branch from `version/v0.1` (e.g. `feat/levelup-flow-b`), merge back with `git merge --no-ff` after the full suite and typecheck pass (AGENTS §6).
- `src/core` stays pure: no Phaser, DOM, `Math.random`, `Date`, `performance` (boundary test).
- No magic numbers: the slowdown tiers live in `config/balance.json` `levelUpSlowdown.tiers` and are validated by `parseBalance`.
- Test names start with the requirement ID (`MEC-003-R22 …`); the main implementing function carries a `// MEC-0xx-Rn` comment.
- Minimal test runs while working: `npx vitest run <file>`; on Windows, if Vitest fails to start, use `npx vitest run --configLoader native --pool threads --maxWorkers 2 <file>`.
- Before every commit: full `npm test`, then `npm run typecheck` (sequentially); both must pass. `npm run test:fuzz` in Task 8.
- Every commit adds one line under `## [Unreleased]` in `CHANGELOG.md`.
- No push, no dependency installs, no edits to `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.
- Determinism: the RNG draw order must not change. `rngFrom(s.rng)` and the sim's `rng` share `s.rng`, so moving the mango placement from `startLevelUp` to `eatRegular` (Task 3) keeps the draw order (no other RNG draws happen between the two places).

## File Structure
| File | Responsibility | Task |
|---|---|---|
| `config/balance.json` | new `levelUpSlowdown.tiers` (6-15 x1.4/1000 ms, 16-30 x1.6/1500 ms) | 1 |
| `src/core/balance.ts` | `SlowdownTier` type, `Balance.levelUpSlowdown`, SPEC entry, tier validation; drop the transition-covers-crumble check | 1, 4 |
| `src/core/slowdown.ts` (new) | MEC-003-R22: `slowdownTier`, `startLevelUpSlow`, `levelUpSlowTick`, `levelUpSlowFactor` | 2 |
| `src/core/types.ts` | `LevelUpSlow`; `SimState.levelUpSlow`; snapshot `levelUpSlow`; remove `phase`, `transitionLeftMs`, `transitionEnd`, reason `busy`, `HazardFamily.onLevelEnd` | 2, 3, 4 |
| `src/core/skills.ts` | `effectiveTick` max rule; remove `busy` rejection | 2, 3 |
| `src/core/sim.ts` | `initialState.levelUpSlow`; `stepMs` without transition branch, slowdown tick at step 7a; snapshot fields | 2, 3 |
| `src/core/transition.ts` | level-up chain only: no phase, no crumble, no mango placement; director reset + slowdown start | 3, 4 |
| `src/core/snake.ts` | regular mango placed after any level-clear check (no phase test) | 3 |
| `src/core/skills/mangoRain.ts` | new `checkLevelClear` signature | 3 |
| `src/core/hazards/{rock,fence,maze,terrain,rottenRock,snipWall,rubble,timed}.ts` | remove `onLevelEnd` / `endTimedLevel` | 4 |
| `src/core/hazards/director.ts` | skip while `levelUpSlow !== null` | 5 |
| `config/balance.json`, `src/core/balance.ts` | `level.transitionMs` removed; banner keeps `ui.bannerMs` | 6 |
| `src/game/text.ts` | remove `skill.reject.busy` | 3 |
| `tests/core/slowdown.test.ts` (new) | MEC-003-R22 balance, unit and integration tests | 1, 2, 3, 5 |
| `tests/core/*.test.ts`, `tests/qa/*.qa.test.ts`, `tests/support/p1fuzz.ts`, `tests/core/fuzz.test.ts`, `tests/game/text.test.ts` | rewritten/deleted tests (each named in its task) | 3, 4 |
| `docs/specs/mechanics/MEC-001/002/003/006*.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/CODEMAP.md` | rules and maps | 2, 7 |

## Task order and why it differs from the suggested order
1. Balance tiers (as suggested).
2. Slowdown module + `effectiveTick` **without** wiring it to the level up. While the transition still exists, starting a slowdown at a level up would overlap the freeze; unit tests drive the state directly.
3. Remove the freeze **and** wire the slowdown start into the level up. These must land together: the re-level, "x1.4 at 6" and ramp tests need a sim that keeps stepping after a level up. Mango placement moves here too, because removing `phase` forces the `snake.ts` change.
4. Remove the level-up crumble (as suggested).
5. Director first spawn after the slowdown (as suggested).
6. HUD banner (as suggested).
7. Specs, ARCHITECTURE, DECISIONS (as suggested).
8. Fuzz + browser QA checklist (as suggested).

---

### Task 1: Balance config and validation for `levelUpSlowdown.tiers`

**Files:**
- Modify: `config/balance.json:3-4` (insert a line after the `level` block, before `"mango"`)
- Modify: `src/core/balance.ts:8-14` (types), `:101-104` (SPEC, after `level`), `:176-177` (cross-checks, after the `goldenRotFactor` check)
- Create: `tests/core/slowdown.test.ts`

**Interfaces:**
- Produces: `export interface SlowdownTier { from: number; to: number; factor: number; easeMs: number }`; `Balance.levelUpSlowdown: { tiers: SlowdownTier[] }`.
- Consumes: `parseBalance(json: unknown): Balance`; test helper `loadBalance(mutate?: (j: any) => void): Balance` from `tests/support/balance.ts`.

- [ ] **Step 1: Write the failing test** — create `tests/core/slowdown.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';

const b = loadBalance();

describe('MEC-003-R22 level-up slowdown config', () => {
  it('MEC-003-R22 balance has tiers 6-15 x1.4 / 1000 ms and 16-30 x1.6 / 1500 ms', () => {
    expect(b.levelUpSlowdown.tiers).toEqual([
      { from: 6, to: 15, factor: 1.4, easeMs: 1000 },
      { from: 16, to: 30, factor: 1.6, easeMs: 1500 },
    ]);
  });
  it('MEC-003-R22 parseBalance rejects unsorted, overlapping, out-of-range or non-slowing tiers', () => {
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].from = 15; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].from = 1; })).toThrow(/levelUpSlowdown.tiers\[0\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].to = 31; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].factor = 1; })).toThrow(/levelUpSlowdown.tiers\[0\].factor/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].easeMs = 0; })).toThrow(/levelUpSlowdown.tiers\[0\].easeMs/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers = []; })).not.toThrow();
  });
});
```
- [ ] **Step 2: Run it** — `npx vitest run tests/core/slowdown.test.ts`. Expected: FAIL, `Cannot read properties of undefined (reading 'tiers')`.
- [ ] **Step 3: Implement.** In `config/balance.json`, after the `"level": {…}` block (line 13, ends `] },`) insert:
```json
  "levelUpSlowdown": { "tiers": [ { "from": 6, "to": 15, "factor": 1.4, "easeMs": 1000 }, { "from": 16, "to": 30, "factor": 1.6, "easeMs": 1500 } ] },
```
In `src/core/balance.ts`, above `export interface Balance`:
```ts
/** MEC-003-R22 one slowdown tier, by the level just reached. */
export interface SlowdownTier { from: number; to: number; factor: number; easeMs: number }
```
In `interface Balance`, after the `level` line: `  levelUpSlowdown: { tiers: SlowdownTier[] };`
In `SPEC`, after the `level: {…}` entry: `  levelUpSlowdown: { tiers: listOf({ from: 'int+', to: 'int+', factor: 'num+', easeMs: 'int+' }) },`
In `parseBalance`, after the `goldenRotFactor` check:
```ts
  // MEC-003-R22 slowdown tiers are sorted, disjoint, inside 2..maxLevel and actually slow down.
  let prevTo = 1;
  for (const [i, t] of b.levelUpSlowdown.tiers.entries()) {
    const path = 'levelUpSlowdown.tiers[' + i + ']';
    if (t.from <= prevTo || t.to < t.from || t.to > b.level.maxLevel) fail(path, 'must be sorted, disjoint and inside 2..maxLevel');
    if (t.factor <= 1) fail(path + '.factor', 'must be > 1');
    prevTo = t.to;
  }
```
- [ ] **Step 4: Run it** — `npx vitest run tests/core/slowdown.test.ts tests/core/balance.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** Add to `CHANGELOG.md` `[Unreleased]` → `### Added`: `- feat(core): levelUpSlowdown tiers in balance config with validation (MEC-003-R22).` Run `npm test` then `npm run typecheck`; both pass. `git add config/balance.json src/core/balance.ts tests/core/slowdown.test.ts CHANGELOG.md && git commit -m "feat(core): level-up slowdown tiers in balance config"`.

---

### Task 2: Slowdown state, countdown and `effectiveTick` max rule

**Files:**
- Create: `src/core/slowdown.ts`
- Modify: `src/core/types.ts:95-118` (`SimState`, add field after `slowmo`), `:126-170` (`SimSnapshot`, add field after `slowmo`), new `LevelUpSlow` interface next to `RottenRock` (line 33)
- Modify: `src/core/sim.ts:41` (`initialState`), `:64-67` (`stepMs` step 7a), `:81` (snapshot)
- Modify: `src/core/skills.ts:1-5` (import), `:68-72` (`effectiveTick`)
- Modify: `docs/CODEMAP.md` `src/core/` row (add `slowdown.ts (MEC-003-R22 level-up slowdown)`)
- Test: `tests/core/slowdown.test.ts`

**Interfaces:**
- Produces:
  - `export interface LevelUpSlow { factor: number; easeMs: number; leftMs: number }` (types.ts)
  - `SimState.levelUpSlow: LevelUpSlow | null`; `SimSnapshot.levelUpSlow: LevelUpSlow | null`
  - `export function slowdownTier(b: Balance, level: number): { factor: number; easeMs: number } | null`
  - `export function startLevelUpSlow(s: SimState, b: Balance): void`
  - `export function levelUpSlowTick(s: SimState): void`
  - `export function levelUpSlowFactor(s: SimState): number`
  - `effectiveTick(s: SimState, b: Balance): number` (same signature, new rule)
- Consumes: `baseTickMs(s, b)` from `src/core/ramp.ts`; `levelTickMs`, `quota` from `src/core/level.ts`; `simFromAscii`, `SQUARE` from `src/core/testing.ts`; `exportState` from `src/core/sim.ts`.

- [ ] **Step 1: Write the failing tests** — append to `tests/core/slowdown.test.ts` (add the imports at the top of the file):
```ts
import { exportState } from '../../src/core/sim';
import { effectiveTick } from '../../src/core/skills';
import { levelUpSlowFactor, levelUpSlowTick, slowdownTier, startLevelUpSlow } from '../../src/core/slowdown';
import { simFromAscii, SQUARE } from '../../src/core/testing';
import { levelTickMs } from '../../src/core/level';
import type { SimState } from '../../src/core/types';

const at = (extra: Partial<SimState>, startLevel = 1): SimState => exportState(simFromAscii(b, [], {
  snake: SQUARE, quiet: true, options: { startLevel, bestLevel: 30, startEnergy: 100, loadout: ['slowmo', null] },
  extraState: { rampActive: false, ...extra },
}));

describe('MEC-003-R22 slowdown state', () => {
  it('MEC-003-R22 no slowdown for levels 2-5; x1.4 for 6 and 15; x1.6 for 16 and 30', () => {
    for (const n of [2, 3, 4, 5]) expect(slowdownTier(b, n)).toBeNull();
    for (const n of [6, 15]) expect(slowdownTier(b, n)).toEqual({ factor: 1.4, easeMs: 1000 });
    for (const n of [16, 30]) expect(slowdownTier(b, n)).toEqual({ factor: 1.6, easeMs: 1500 });
  });
  it('MEC-003-R22 startLevelUpSlow sets the tier of the current level, or null', () => {
    const s = at({ level: 6 }); startLevelUpSlow(s, b);
    expect(s.levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1000 });
    s.level = 5; startLevelUpSlow(s, b); expect(s.levelUpSlow).toBeNull();
  });
  it('MEC-003-R22 curFactor falls linearly and ends exactly at easeMs', () => {
    const s = at({ level: 6, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
    expect(levelUpSlowFactor(s)).toBe(1.4);
    for (let i = 0; i < 500; i++) levelUpSlowTick(s);
    expect(levelUpSlowFactor(s)).toBeCloseTo(1.2, 12);
    expect(effectiveTick(s, b)).toBe(Math.round(levelTickMs(b, 6) * 1.2));
    for (let i = 0; i < 499; i++) levelUpSlowTick(s);
    expect(s.levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1 });
    levelUpSlowTick(s);
    expect(s.levelUpSlow).toBeNull();
    expect(levelUpSlowFactor(s)).toBe(1);
    expect(effectiveTick(s, b)).toBe(levelTickMs(b, 6));
  });
  it('MEC-006-R17 Slow-mo and the slowdown do not stack: the larger factor wins', () => {
    const full = at({ level: 6, slowmo: { leftMs: 100 }, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
    expect(effectiveTick(full, b)).toBe(Math.round(levelTickMs(b, 6) * b.skills.slowmo.tickFactor));
    const high = at({ level: 16, slowmo: { leftMs: 100 }, levelUpSlow: { factor: 2, easeMs: 1000, leftMs: 1000 } });
    expect(effectiveTick(high, b)).toBe(Math.round(levelTickMs(b, 16) * 2));
    const none = at({ level: 16, slowmo: null, levelUpSlow: null });
    expect(effectiveTick(none, b)).toBe(levelTickMs(b, 16));
  });
  it('MEC-003-R22 the slowdown multiplies the MEC-008 ramp tick while the ramp is active', () => {
    const s = at({ rampActive: true, rampEaten: 0, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } }, 12);
    expect(effectiveTick(s, b)).toBe(Math.round(levelTickMs(b, 1) * 1.4));
  });
  it('MEC-003-R22 snapshot exposes levelUpSlow and a fresh run has none', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, quiet: true, extraState: { levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 7 } } });
    expect(sim.snapshot().levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 7 });
    expect(at({}).levelUpSlow).toBeNull();
  });
  it('MEC-003-R22 the sim counts the slowdown down once per ms', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true,
      extraState: { level: 6, rampActive: false, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 3 } } });
    sim.advance(1); expect(sim.snapshot()).toMatchObject({ levelUpSlow: { leftMs: 2 }, tickMs: Math.round(levelTickMs(b, 6) * (1 + 0.4 * 2 / 1000)) });
    sim.advance(2); expect(sim.snapshot()).toMatchObject({ levelUpSlow: null, tickMs: levelTickMs(b, 6) });
  });
});
```
- [ ] **Step 2: Run it** — `npx vitest run tests/core/slowdown.test.ts`. Expected: FAIL, `Failed to resolve import "../../src/core/slowdown"`.
- [ ] **Step 3: Implement.** In `src/core/types.ts` next to `RottenRock`:
```ts
/** MEC-003-R22 active level-up slowdown; leftMs counts sim ms down to 0. */
export interface LevelUpSlow { factor: number; easeMs: number; leftMs: number }
```
Add `levelUpSlow: LevelUpSlow | null;` to `SimState` (after `slowmo`) and `levelUpSlow: LevelUpSlow | null;` to `SimSnapshot` (after `slowmo`).
Create `src/core/slowdown.ts`:
```ts
// src/core/slowdown.ts — level-up slowdown tiers and easing (MEC-003-R22). Pure; no Phaser.
import type { Balance } from './balance';
import type { SimState } from './types';

// MEC-003-R22 tier of the level just reached; null when that level has no slowdown.
export function slowdownTier(b: Balance, level: number): { factor: number; easeMs: number } | null {
  const t = b.levelUpSlowdown.tiers.find(r => level >= r.from && level <= r.to);
  return t ? { factor: t.factor, easeMs: t.easeMs } : null;
}

// MEC-003-R22 a level up (re)starts the slowdown with the new level's tier.
export function startLevelUpSlow(s: SimState, b: Balance): void {
  const t = slowdownTier(b, s.level);
  s.levelUpSlow = t ? { factor: t.factor, easeMs: t.easeMs, leftMs: t.easeMs } : null;
}

// MEC-003-R22 one sim ms; the slowdown ends exactly easeMs ms after the level up.
export function levelUpSlowTick(s: SimState): void {
  if (s.levelUpSlow && --s.levelUpSlow.leftMs <= 0) s.levelUpSlow = null;
}

// MEC-003-R22 curFactor = 1 + (factor - 1) * leftMs / easeMs.
export function levelUpSlowFactor(s: SimState): number {
  const w = s.levelUpSlow;
  return w ? 1 + (w.factor - 1) * w.leftMs / w.easeMs : 1;
}
```
In `src/core/skills.ts` add `import { levelUpSlowFactor } from './slowdown';` and replace `effectiveTick`:
```ts
// MEC-006-R17 / MEC-003-R22 max(Slow-mo, level-up slowdown) on the live level/ramp tick; never stacked.
export function effectiveTick(s: SimState, b: Balance): number {
  const base = baseTickMs(s, b);
  const f = Math.max(s.slowmo ? b.skills.slowmo.tickFactor : 1, levelUpSlowFactor(s));
  return f === 1 ? base : Math.round(base * f);
}
```
In `src/core/sim.ts`: `initialState` adds `levelUpSlow: null,` after `slowmo: null,`; import `levelUpSlowTick` from `./slowdown`; in `stepMs` insert after `skillTimers(s, b, ctx);`:
```ts
  // MEC-003-R22 step 7a: the slowdown eases before the speed is computed.
  levelUpSlowTick(s);
```
In `snapshotOf` add `levelUpSlow: c.levelUpSlow,` after `slowmo: c.slowmo,`. Update the `src/core/` row of `docs/CODEMAP.md` (add `slowdown.ts (level-up slowdown, MEC-003-R22)` and `MEC-003-R22` to its requirement IDs).
- [ ] **Step 4: Run it** — `npx vitest run tests/core/slowdown.test.ts tests/core/slowmo.test.ts tests/core/ramp.test.ts`. Expected: PASS (no level up starts a slowdown yet, so existing tests are unchanged).
- [ ] **Step 5: Commit.** CHANGELOG `### Added`: `- feat(core): level-up slowdown state and Slow-mo max rule in effectiveTick (MEC-003-R22, MEC-006-R17).` Full `npm test`, `npm run typecheck`. `git commit -m "feat(core): level-up slowdown state and effective tick max rule"` (files: `src/core/slowdown.ts src/core/types.ts src/core/sim.ts src/core/skills.ts tests/core/slowdown.test.ts docs/CODEMAP.md CHANGELOG.md`).

---

### Task 3: Remove the level-up freeze and start the slowdown at a level up

**Files:**
- Modify: `src/core/types.ts:46` (`skillRejected` reason union: drop `'busy'`), `:64` (delete `transitionEnd` event), `:107-108` and `:159-160` (delete `phase`, `transitionLeftMs`)
- Modify: `src/core/transition.ts:1-46` (whole file, see Step 3)
- Modify: `src/core/sim.ts:13` (drop `levelStart` import), `:44` (drop `phase`, `transitionLeftMs`), `:54-60` (delete transition branch), `:101-102` (drop snapshot `phase`, `transitionLeftMs`)
- Modify: `src/core/skills.ts:42,45` (drop `busy`)
- Modify: `src/core/snake.ts:70-74`
- Modify: `src/core/skills/mangoRain.ts` (the `checkLevelClear(s, b, ctx, false)` call → `checkLevelClear(s, b, ctx)`)
- Modify: `src/game/text.ts:43` (delete `'skill.reject.busy': 'Not now!',`), `tests/game/text.test.ts:54` (delete `'skill.reject.busy',`)
- Modify: `tests/support/p1fuzz.ts:98-99`, `tests/core/fuzz.test.ts:36`
- Modify tests (listed in Step 5)
- Test: `tests/core/slowdown.test.ts`, `tests/core/transition.test.ts`

**Interfaces:**
- Produces: `startLevelUp(s: SimState, b: Balance, ctx: StepCtx): void`; `checkLevelClear(s: SimState, b: Balance, ctx: StepCtx): void` (the `fromRegularMango` parameter is removed; `levelStart` is deleted).
- Consumes: `startLevelUpSlow(s, b)` (Task 2); `placeMango(s, b, rng)` from `src/core/mango.ts`.

- [ ] **Step 1: Write the failing tests** — append to `tests/core/slowdown.test.ts` (add `import { restoreSim, stateOf } from '../../src/core/sim';` and `import { quota } from '../../src/core/level';`, and `import { circle } from '../../src/core/testing';` to the existing testing import):
```ts
// Snake on row 8 heading right, regular mango one cell ahead, one mango short of the quota.
const upAt = (level: number, extra: Partial<SimState> = {}) => {
  const sim = simFromAscii(b, [], { snake: [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], quiet: true,
    options: { bestLevel: 30, startEnergy: 100, loadout: ['slowmo', null] },
    extraState: { level, progress: quota(b, level) - 1, rampActive: false,
      mango: { x: 5, y: 8, golden: false, totalMs: 8000, leftMs: 8000 }, ...extra } });
  sim.advance(levelTickMs(b, level));
  return sim;
};
const curTick = (level: number, factor: number, easeMs: number, leftMs: number) =>
  Math.round(levelTickMs(b, level) * (1 + (factor - 1) * leftMs / easeMs));

describe('MEC-003-R22 slowdown at a level up', () => {
  it('MEC-003-R22 no slowdown when reaching levels 2-5', () => {
    for (const from of [1, 2, 3, 4]) {
      const sim = upAt(from); expect(stateOf(sim)).toMatchObject({ level: from + 1, levelUpSlow: null });
      sim.advance(1); expect(sim.snapshot().tickMs).toBe(levelTickMs(b, from + 1));
    }
  });
  it('MEC-003-R22 x1.4 / 1000 ms when reaching 6 and 15', () => {
    for (const from of [5, 14]) {
      const sim = upAt(from); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1000 });
      sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(from + 1, 1.4, 1000, 999));
    }
  });
  it('MEC-003-R22 x1.6 / 1500 ms when reaching 16', () => {
    const sim = upAt(15); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.6, easeMs: 1500, leftMs: 1500 });
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(16, 1.6, 1500, 1499));
  });
  it('MEC-003-R22 ease midpoint and exact end in sim time', () => {
    const sim = upAt(5);
    sim.advance(500); expect(sim.snapshot().tickMs).toBe(curTick(6, 1.4, 1000, 500));
    sim.advance(499); expect(stateOf(sim).levelUpSlow).toEqual({ factor: 1.4, easeMs: 1000, leftMs: 1 });
    sim.advance(1); expect(stateOf(sim).levelUpSlow).toBeNull();
    expect(sim.snapshot().tickMs).toBe(levelTickMs(b, 6));
  });
  it('MEC-003-R22 a level up during an active slowdown restarts it with the new tier', () => {
    const first = upAt(5); first.advance(200);
    const s = exportState(first), head = s.snake[0]!;
    expect(s.levelUpSlow!.leftMs).toBe(800);
    s.progress = quota(b, 6) - 1; s.mango = { x: head.x + 1, y: head.y, golden: false, totalMs: 8000, leftMs: 8000 };
    const sim = restoreSim(b, s);
    for (let n = 0; stateOf(sim).level === 6 && n < 400; n++) sim.advance(1);
    expect(stateOf(sim)).toMatchObject({ level: 7, levelUpSlow: { factor: 1.4, easeMs: 1000, leftMs: 1000 } });
  });
  it('MEC-006-R17 Slow-mo during a level-up slowdown uses the larger factor', () => {
    const sim = upAt(5); sim.useSkill(0); sim.advance(1);
    expect(sim.snapshot().tickMs).toBe(Math.round(levelTickMs(b, 6) * b.skills.slowmo.tickFactor));
  });
  it('MEC-003-R22 / MEC-008-R8 a level up ends the checkpoint ramp, then the slowdown multiplies the level tick', () => {
    const sim = simFromAscii(b, [], { snake: [[4, 8], [3, 8], [2, 8], [1, 8], [0, 8]], quiet: true,
      options: { startLevel: 12 }, extraState: { progress: quota(b, 12) - 1, mango: { x: 5, y: 8, golden: false, totalMs: 8000, leftMs: 8000 } } });
    sim.advance(levelTickMs(b, 1));
    expect(stateOf(sim)).toMatchObject({ level: 13, rampActive: false, levelUpSlow: { leftMs: 1000 } });
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(curTick(13, 1.4, 1000, 999));
  });
  it('MEC-006-R13 a skill cast right after a level up is accepted (no busy rejection)', () => {
    const sim = upAt(5); sim.drainEvents(); sim.useSkill(0);
    const types = sim.drainEvents().map(e => e.type);
    expect(types).toContain('skillUsed'); expect(types).not.toContain('skillRejected');
  });
});
```
- [ ] **Step 2: Run it** — `npx vitest run tests/core/slowdown.test.ts`. Expected: FAIL; e.g. `MEC-003-R22 x1.4 …` gets `levelUpSlow: null` and the Slow-mo cast gets `skillRejected` (reason `busy`).
- [ ] **Step 3: Implement.** Replace `src/core/transition.ts` with:
```ts
import type { Balance } from './balance';
import { FAMILIES } from './hazards/registry';
import { biome, introducedAt, isChallenge, quota } from './level';
import { rampOnLevelUp } from './ramp';
import { applyMidRunUnlocks } from './skills';
import { startLevelUpSlow } from './slowdown';
import { resetLength } from './snake';
import type { SimState, StepCtx } from './types';

// MEC-003-R7 the level-up chain runs inside the eating step; the game never stops (Flow B).
export function startLevelUp(s: SimState, b: Balance, ctx: StepCtx): void {
  const from = s.snake.length;
  const removed = resetLength(s, b.snake.start.length);
  const cleared = s.levelTimeMs, oldBiome = biome(b, s.level);
  s.progress -= quota(b, s.level); s.level += 1; s.levelsCleared += 1;
  s.eatenInLevel = 0; s.levelTimeMs = 0;
  for (const f of FAMILIES) f.onLevelEnd(s, ctx);
  // MEC-003-R11 the director restarts with the new level's formulas; MEC-003-R22 slowdown (re)starts.
  s.spawnInMs = b.director.firstSpawnMs; s.mazeCooldownMs = 0;
  startLevelUpSlow(s, b);
  ctx.emit({ type: 'shrunk', from, to: s.snake.length, removed });
  const unlocked = introducedAt(b, s.level);
  ctx.emit({ type: 'levelUp', level: s.level, biome: biome(b, s.level), challenge: isChallenge(b, s.level),
    biomeChanged: biome(b, s.level) !== oldBiome, ...(unlocked ? { unlocked } : {}), clearedLevelTimeMs: cleared });
  rampOnLevelUp(s, ctx);
  applyMidRunUnlocks(s, b, ctx);
}

// MEC-003-R5/R6 after any mango: the final clear wins; earlier clears start the level-up chain.
export function checkLevelClear(s: SimState, b: Balance, ctx: StepCtx): void {
  if (s.progress < quota(b, s.level)) return;
  if (s.level === b.level.maxLevel) {
    s.mango = null;
    s.levelsCleared = b.level.maxLevel; s.status = 'over'; s.outcome = { won: true };
    ctx.emit({ type: 'runWon', score: s.score, timeMs: s.timeMs });
  } else startLevelUp(s, b, ctx);
}
```
(The `onLevelEnd` loop stays until Task 4.) In `src/core/snake.ts` replace lines 70-74 with:
```ts
  // MEC-003-R5/R6 the final clear wins; earlier clears reset length and level up without stopping.
  s.progress += progressGain;
  checkLevelClear(s, b, ctx);
  s.tailFrom = { ...(s.snake[s.snake.length - 1] as Cell) };
  // MEC-002-R8(b) the next regular mango is placed after the chain, so cells freed by the reset are candidates.
  if (s.status === 'playing') placeMango(s, b, rng);
```
In `src/core/skills/mangoRain.ts` change the call to `checkLevelClear(s, b, ctx)`. In `src/core/sim.ts` delete the `levelStart` import, the `phase: 'playing', transitionLeftMs: 0,` initial fields (keep `levelTimeMs: 0, timeMs: 0,`), the whole `if (s.phase === 'transition') {…}` block with its comment, and the snapshot `phase: s.phase,` and `transitionLeftMs: s.transitionLeftMs,` fields. In `src/core/types.ts` delete `phase` and `transitionLeftMs` from `SimState` and `SimSnapshot`, the `| { type: 'transitionEnd'; level: number }` member, and `'busy' |` from the `skillRejected` reason. In `src/core/skills.ts` change the reject type to `'empty' | 'active' | 'energy' | 'noTarget'` and delete `if (s.phase === 'transition') return reject('busy');`. In `src/game/text.ts` delete `'skill.reject.busy': 'Not now!',`; in `tests/game/text.test.ts:54` delete `'skill.reject.busy',`.
In `tests/support/p1fuzz.ts` replace lines 98-99 with:
```ts
      // MEC-003-R22 an active slowdown always sits inside its ease window
      if (s.levelUpSlow && (s.levelUpSlow.leftMs < 1 || s.levelUpSlow.leftMs > s.levelUpSlow.easeMs)) bad(`t=${t}: slowdown leftMs ${s.levelUpSlow.leftMs}`);
```
In `tests/core/fuzz.test.ts:36` replace the test with `it('MEC-003-R22 fuzz: level-up slowdown stays inside its ease window', () => { expect(only(/slowdown/)).toEqual([]); });`.
- [ ] **Step 4: Run it** — `npx vitest run tests/core/slowdown.test.ts`. Expected: PASS.
- [ ] **Step 5: Rewrite or delete every test that pinned the freeze.** Each item says what and why.
  - `tests/core/transition.test.ts` "MEC-003-R7 transition lasts 1000 ms…" → **rewrite** (rule R7 no longer has a transition):
    ```ts
    it('MEC-003-R7 no freeze: the snake steps one level-2 tick after the level up', () => {
      const sim = levelUpSim(); sim.advance(140);
      expect(types(sim)).toEqual(['ate', 'shrunk', 'levelUp']);
      expect(sim.snapshot()).toMatchObject({ level: 2, progress: 0, length: 4, levelUpSlow: null });
      sim.advance(137); expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 0 });
      sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 6, y: 0 });
    });
    ```
  - same file "MEC-001-R9 snake does not step during transition…" → **rewrite** (MEC-001-R9 now says the snake keeps stepping):
    ```ts
    it('MEC-001-R9 the snake keeps stepping through a level up and applies a queued turn on its next step', () => {
      const sim = levelUpSim(); sim.advance(140); sim.turn(0, 1);
      sim.advance(138); expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 1 });
    });
    ```
  - same file "MEC-003-R9 rot timer, director timer and levelTimeMs do not advance…" → **rewrite** (spec rule 9: no timer is frozen):
    ```ts
    it('MEC-003-R9 rot, director and levelTimeMs keep running after a level up', () => {
      const sim = levelUpSim(); sim.advance(140);
      const before = exportState(sim), age = sim.snapshot().mango!.ageMs;
      sim.advance(100);
      expect(sim.snapshot().mango!.ageMs).toBe(age + 100);
      expect(stateOf(sim)).toMatchObject({ spawnInMs: before.spawnInMs - 100, levelTimeMs: before.levelTimeMs + 100, timeMs: before.timeMs + 100 });
    });
    ```
  - same file "MEC-003-R10 turns queued during transition are applied afterwards" → **delete** (covered by the rewritten MEC-001-R9 test above and the MEC-006-R13 cast test in `slowdown.test.ts`).
  - same file "MEC-003-R11 first spawn of each level is 2500 ms after transition end" → **rewrite** (no transition end; levels 2-5 have no slowdown):
    ```ts
    it('MEC-003-R11 without a slowdown the first spawn is firstSpawnMs after the level up', () => {
      const sim = simFromAscii(b, ['.....M'], { snake: [[4, 0], [3, 0], [2, 0], [1, 0]], extraState: { progress: 3 } });
      sim.advance(140);
      expect(exportState(sim)).toMatchObject({ spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0 });
      circle(sim, b.director.firstSpawnMs - 1); expect(exportState(sim).spawnInMs).toBe(1);
      circle(sim, 1); expect(sim.snapshot().hazards.length).toBeGreaterThan(0);
    });
    ```
  - `tests/core/level.test.ts` "MEC-003-R7 eating selects the next level speed for after the transition" → **rename** to `'MEC-003-R7 eating selects the next level speed from the next step'` and change `sim.advance(1001);` to `sim.advance(1);` (expected `138` unchanged).
  - `tests/core/energy.test.ts` "MEC-006-R3 energy is kept across a level up and the transition" → **rename** to `'MEC-006-R3 energy is kept across a level up'`; replace lines 66-69 with:
    ```ts
        sim.advance(140); expect(sim.snapshot()).toMatchObject({ energy: 50, level: 2 });
        sim.drainEvents();
    ```
    (the following `circle(sim, 5999)` / `circle(sim, 1)` orb lines stay: the orb timer starts at L2 either way).
  - same file "MEC-006-R10 orb timers frozen during level transition" → **rewrite** (MEC-006-R10 amended: never frozen):
    ```ts
    it('MEC-006-R10 orb timers keep running through a level up', () => {
      const sim = simFromAscii(b, ['...M'], { snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true,
        options: { startLevel: 4 }, extraState: { progress: 4, orbs: [{ x: 14, y: 14, ageMs: 0 }] } });
      sim.advance(141); const before = exportState(sim);
      expect(before.level).toBe(5);
      sim.advance(100);
      expect(exportState(sim)).toMatchObject({ orbSpawnMs: before.orbSpawnMs + 100, orbs: [{ x: 14, y: 14, ageMs: before.orbs[0]!.ageMs + 100 }] });
    });
    ```
  - `tests/core/mango.test.ts` "MEC-002-R10 rot and retry timers do not advance during the transition" → **delete** (the rule is retired; rot running after a level up is pinned by the rewritten MEC-003-R9 test).
  - `tests/core/slowmo.test.ts` "MEC-006-R16 slow-mo timer is frozen in the transition and ends at 5000 ms" → **rewrite**:
    ```ts
    it('MEC-006-R16 slow-mo timer keeps running through a level up', () => {
      const sim = mk({ progress: 3 }, ['...M']); sim.useSkill(0); sim.drainEvents();
      sim.advance(224); expect(sim.snapshot()).toMatchObject({ level: 2, slowmo: { leftMs: 3776 } });
      sim.advance(1000); expect(sim.snapshot().slowmo).toEqual({ leftMs: 2776 });
    });
    ```
  - same file "MEC-006-R17 slow-mo tick = round(base x 1.6) including level-up" → change `sim.advance(1001);` to `sim.advance(1);` (expected `221` unchanged; L2 has no slowdown).
  - `tests/core/skills.test.ts` "MEC-006-R13 rejection reasons and their order (empty, busy, active, energy, noTarget)" → **rename** to `'MEC-006-R13 rejection reasons and their order (empty, active, energy, noTarget)'` and delete the two `expect(reason(mk(…, { phase: 'transition', … })…)).toBe('busy');` lines (reason removed).
  - `tests/core/testing.test.ts:42-43` → replace both `{ type: 'transitionEnd', level: 2 }` with `{ type: 'rampEnded', level: 2 }` (event removed; the test only checks `emit`).
  - `tests/core/mangoRain.test.ts` "MEC-002-R8 level up from a rain mango keeps the regular mango and its timer" → **rewrite** body:
    ```ts
      const sim = levelUpRain({ mango: { x: 12, y: 12, golden: false, totalMs: 8000, leftMs: 8000 - 860 } });
      sim.advance(140); expect(sim.snapshot().mango).toMatchObject({ x: 12, y: 12, ageMs: 1000 });
      sim.advance(100); expect(sim.snapshot().mango).toMatchObject({ x: 12, y: 12, ageMs: 1100 });
    ```
  - same file "MEC-006-EC15 snip wall and rubble crumble at the level transition" → delete only the `phase: 'transition',` key from its `toMatchObject` (crumble is still active until Task 4 rewrites this test).
  - same file "MEC-006-R35 during transition only crumble, fade-out and transition timers advance" → **delete** (the transition branch of the step order is removed); delete the `norm` helper too if no other test uses it.
  - `tests/core/tailSnip.test.ts` "MEC-003-R8 level-up crumbles snip walls…" → delete only the line `expect(sim.snapshot().phase).toBe('transition');` (Task 4 rewrites the test).
  - `tests/core/ramp.test.ts` "MEC-008-R8 ramp ends on the first level up before 5 mangoes" → drop `phase: 'transition', ` from the `toMatchObject` and change `sim.advance(1000 + 131);` to `sim.advance(131);` (L5 has no slowdown, so the next step is one L5 tick = 132 ms after the level up).
  - `tests/qa/task3-sim-level.qa.test.ts` "QA-T3-20 level up transitions at exact quota" → **delete** (asserts `phase`/`transitionLeftMs`; quota and event order are covered by `tests/core/level.test.ts` MEC-003-R7 and `tests/core/transition.test.ts`).
  - `tests/qa/p1-task4-mangoes.qa.test.ts` "QA-P1T4-15 … rotten rocks crumble immediately at level transition" → **delete** (asserts `phase`; the crumble rule is retired in Task 4). "QA-P1T4-20 … rot and retry timers freeze during level transition" → **delete** (rule retired).
  - `tests/qa/p1-task5-energy.qa.test.ts` "QA-P1T5-05 …" → delete the two `phase` assertion lines (99 and 104) and the comment words "and level transition" in the title. "QA-P1T5-13 … orb spawn and life timers freeze during level transition" → **delete** (rule retired; replaced by the core MEC-006-R10 rewrite).
  - `tests/qa/p1-task6-skills.qa.test.ts` "QA-P1T6-08 … useSkill during transition phase emits skillRejected busy" → **delete** (reason removed). "QA-P1T6-11 …" → delete the `sBusy` and `sBusyEnergy` blocks and rename to `'QA-P1T6-11 MEC-006-R13 rejection priority order: empty > active > energy > noTarget'`. "QA-P1T6-17 …" → delete the two `phase` lines (375, 379); the expected L2 tick 221 is unchanged. "QA-P1T6-20 … Slow-mo duration freezes during level transition" → **delete** (rule retired; replaced by the core MEC-006-R16 rewrite).
  - `tests/qa/p1-task7-shield-rain.qa.test.ts` "QA-P1T7-02 …" → delete the busy block (lines 65-76) and rename to `'QA-P1T7-02 MEC-006-R13 shield rejection order and conditions (active, energy)'`. "QA-P1T7-04 … shield timer freezes during level transition" → **delete** (rule retired). "QA-P1T7-21 … rubble and snip wall crumble immediately on level transition start" → **delete** (asserts `phase`; the crumble rule is retired in Task 4; replaced by Task 4's survival tests). "QA-P1T7-30 … continue across transition" → rename the end of the title to "continue across a level up"; if it advances a fixed 1000 ms "transition" wait before an assertion, remove that wait.
  - `tests/qa/p1-task4-mangoes.qa.test.ts` "QA-P1T4-05" (comment at line 161 "After transition ends") → expected to pass unchanged; if it fails only because of the 1000 ms wait, delete the wait and the comment.
- [ ] **Step 6: Run** `npm test` then `npm run typecheck`. Expected: PASS. Any remaining failure that references `phase`, `transition`, `transitionEnd` or `busy` is a test this list missed: apply the same rule (retired rule → delete; surviving rule → remove the freeze-only assertion) and name it in the commit body.
- [ ] **Step 7: Commit.** CHANGELOG `### Changed`: `- feat(core): level up no longer freezes the sim; skills castable and timers running during level up; slowdown starts at level up (MEC-003-R7..R11/R22, MEC-006-R13).` `git commit -m "feat(core): remove level-up freeze and start the slowdown at level up"` with the list of deleted tests in the body.

---

### Task 4: Remove the level-up crumble

**Files:**
- Modify: `src/core/types.ts:204` (delete `onLevelEnd` from `HazardFamily`)
- Modify: `src/core/hazards/rock.ts:8`, `fence.ts:8`, `maze.ts:8` (delete the `onLevelEnd` line), `terrain.ts:19-25`, `rottenRock.ts:21-24`, `snipWall.ts:25-28`, `rubble.ts:20-23` (delete the hook and its comment), `timed.ts:5-11` (delete `endTimedLevel`) and the now unused `endTimedLevel` imports in rock/fence/maze
- Modify: `src/core/transition.ts` (delete `for (const f of FAMILIES) f.onLevelEnd(s, ctx);` and the `FAMILIES` import)
- Modify: `src/core/balance.ts:176` (delete the `level.transitionMs` must-cover-crumble check)
- Modify tests (Step 5)

**Interfaces:**
- Produces: `HazardFamily<T>` without `onLevelEnd`. `level.transitionMs` keeps its meaning only as the banner duration (Task 6).
- Consumes: `cellSolidCause(s, x, y)` from `src/core/cells.ts`.

- [ ] **Step 1: Write the failing test** — in `tests/core/transition.test.ts` replace "MEC-003-R7 all hazards and rotten rocks are non-solid from t = 0 and gone by t = 500" with:
```ts
  it('MEC-003-R8 obstacles survive a level up, also families not enabled in the new level, and keep their own lifetimes', () => {
    const sim = simFromAscii(b, ['.....M', '#FwRSu'], {
      snake: [[4, 0], [3, 0], [2, 0], [1, 0]], quiet: true, extraState: {
        progress: 3, terrains: [{ family: 'terrain', t: 1, lifeMs: 10000, cells: [{ x: 9, y: 9, delay: 0, up: true, vis: 'up' }] }],
      },
    });
    const before = exportState(sim);
    sim.advance(140);
    const s = stateOf(sim);
    expect(s.level).toBe(2);
    expect(s.hazards.map(h => h.state)).toEqual(before.hazards.map(h => h.state));
    expect(cellSolidCause(s, 0, 1)).not.toBeNull();
    expect(cellSolidCause(s, 1, 1)).not.toBeNull();
    expect(s.rottenRocks[0]).toMatchObject({ state: 'solid', leftMs: b.mango.rottenRockLifeMs - 140 });
    expect(s.snipWalls[0]).toMatchObject({ state: 'solid', leftMs: b.skills.tailSnip.wallLifeMs - 140 });
    expect(s.rubble[0]).toMatchObject({ state: 'solid', leftMs: b.skills.shield.rubbleLifeMs - 140 });
    expect(s.terrains).toHaveLength(1);
    expect(s.terrains[0]!.t).toBeLessThan(s.terrains[0]!.lifeMs);
  });
```
(`F` is a fence at L2, where fences are not enabled: it keeps working.)
- [ ] **Step 2: Run it** — `npx vitest run tests/core/transition.test.ts -t "MEC-003-R8"`. Expected: FAIL, hazard states become `crumble` and `cellSolidCause(s, 0, 1)` is `null`.
- [ ] **Step 3: Implement** the deletions listed under Files. After them, `src/core/transition.ts` no longer imports `FAMILIES`, and `src/core/balance.ts` no longer has the line `if (b.level.transitionMs < Math.max(b.hazard.crumbleMs, b.terrain.fadeOutMs)) …`.
- [ ] **Step 4: Run it** — `npx vitest run tests/core/transition.test.ts`. Expected: the new test PASSES; "MEC-001-R5 next mango may be placed on a cell freed by the reset" FAILS on its last line (rocks no longer crumble).
- [ ] **Step 5: Rewrite or delete the crumble tests.**
  - `tests/core/transition.test.ts` "MEC-001-R5 …" → replace the last line with `expect(sim.snapshot().hazards.every(h => h.state === 'solid')).toBe(true);` (rocks stay; the mango still goes to a cell freed by the reset because solid rocks are reserved).
  - `tests/core/tailSnip.test.ts` "MEC-003-R8 level-up crumbles snip walls and clears them during transition" → **rewrite**:
    ```ts
    it('MEC-003-R8 snip walls survive a level up and end by their own lifetime', () => {
      const sim = simFromAscii(b, [...Array<string>(10).fill(''), '........M'], {
        snake: line(6), quiet: true, options, extraState: { progress: 3 },
      });
      sim.useSkill(1); sim.advance(140);
      expect(sim.snapshot().level).toBe(2);
      expect(sim.snapshot().snipWall.length).toBeGreaterThan(0);
      expect(sim.snapshot().snipWall.every(c => c.state === 'solid' && c.leftMs === b.skills.tailSnip.wallLifeMs - 140)).toBe(true);
    });
    ```
  - `tests/core/mangoRain.test.ts` "MEC-006-EC15 snip wall and rubble crumble at the level transition" → **rewrite** (EC15 amended):
    ```ts
    it('MEC-006-EC15 snip wall and rubble survive a level up', () => {
      const sim = levelUpRain({ mango: { ...FAR },
        snipWalls: [{ family: 'snipWall', cells: [{ x: 9, y: 9 }], state: 'solid', leftMs: 3000 }],
        rubble: [{ family: 'rubble', x: 8, y: 8, state: 'solid', leftMs: 1500 }] });
      sim.advance(140);
      expect(sim.snapshot()).toMatchObject({
        snipWall: [{ x: 9, y: 9, state: 'solid', leftMs: 2860 }], rubble: [{ x: 8, y: 8, state: 'solid', leftMs: 1360 }] });
    });
    ```
  - `tests/core/level.test.ts` "MEC-003-R12 parseBalance rejects transitionMs below crumble or fade-out time" → **rewrite** (the check is removed; `transitionMs` is only the banner time):
    ```ts
    it('MEC-003-R7 level.transitionMs is a positive banner time and no longer tied to crumble', () => {
      expect(() => loadBalance(j => j.level.transitionMs = 1)).not.toThrow();
      expect(() => loadBalance(j => j.level.transitionMs = 0)).toThrow(/level.transitionMs/);
    });
    ```
  - `tests/qa/p1-task6-skills.qa.test.ts` "QA-P1T6-30 MEC-006-EC15 / MEC-003-R7 Level transition causes active snipWall to crumble immediately" → **delete** (rule retired; replaced by the tailSnip and mangoRain rewrites).
  - Natural lifecycle tests stay unchanged (they do not involve a level up): MEC-002-R7 rotten rock, MEC-004 timed lifecycle, MEC-006-R22 snip wall, MEC-006-R28 rubble, QA-P1T4-13/14, QA-P1T6-28/29, QA-P1T7-18, QA-T5-01..07.
- [ ] **Step 6: Run** `npm test` then `npm run typecheck`. Expected: PASS.
- [ ] **Step 7: Commit.** CHANGELOG `### Changed`: `- feat(core): obstacles, rotten rocks, terrain, snip walls and rubble survive a level up; no level-up crumble (MEC-003-R8, MEC-006-EC15).` `git commit -m "feat(core): remove level-up crumble"`.

---

### Task 5: Director first spawn after the slowdown ends

**Files:**
- Modify: `src/core/hazards/director.ts:28-31`
- Test: `tests/core/slowdown.test.ts`

**Interfaces:**
- Consumes: `SimState.levelUpSlow` (Task 2); `upAt` helper (Task 3).
- Produces: `updateDirector(s: SimState, b: Balance, rng: Rng): void` (same signature; skips while a slowdown is active).

- [ ] **Step 1: Write the failing test** — append to the `'MEC-003-R22 slowdown at a level up'` describe in `tests/core/slowdown.test.ts`:
```ts
  it('MEC-003-R11 the first-spawn timer starts when the slowdown ends', () => {
    const sim = upAt(5);
    expect(exportState(sim)).toMatchObject({ level: 6, spawnInMs: b.director.firstSpawnMs, mazeCooldownMs: 0 });
    sim.advance(1000);
    expect(stateOf(sim).levelUpSlow).toBeNull();
    expect(exportState(sim).spawnInMs).toBe(b.director.firstSpawnMs);
    sim.advance(1);
    expect(exportState(sim).spawnInMs).toBe(b.director.firstSpawnMs - 1);
  });
```
- [ ] **Step 2: Run it** — `npx vitest run tests/core/slowdown.test.ts -t "MEC-003-R11"`. Expected: FAIL, `expected 1500 to be 2500`.
- [ ] **Step 3: Implement** — in `updateDirector`, after the `if (s.mango === null) return;` line:
```ts
  // MEC-003-R11 / MEC-003-R22 the first-spawn timer of a level starts when its slowdown ends.
  if (s.levelUpSlow !== null) return;
```
- [ ] **Step 4: Run** `npx vitest run tests/core/slowdown.test.ts tests/core/director.test.ts tests/core/transition.test.ts`. Expected: PASS (levels 2-5 have no slowdown, so the Task 3 MEC-003-R11 test is unchanged).
- [ ] **Step 5: Commit.** CHANGELOG `### Changed`: `- feat(core): director first spawn starts when the level-up slowdown ends (MEC-003-R11).` Full `npm test`, `npm run typecheck`. `git commit -m "feat(core): director waits for the level-up slowdown"`.

---

### Task 6: Level-up banner stays on `ui.bannerMs`; retire `level.transitionMs`

Owner answer 2: the level-up banner keeps today's `showBanner` default (`ui.bannerMs`, 1800 ms). It is already a non-interactive text object, so it never blocks input. After Tasks 3-4, `level.transitionMs` has no reader left, so it is removed.

**Files:**
- Modify: `config/balance.json` (delete `level.transitionMs`), `src/core/balance.ts` (type field + validation), any test helper or test that sets or reads it (find with `grep -rn transitionMs src tests`)
- Test: `tests/core/level.test.ts`

**Interfaces:**
- Produces: `Balance.level` without `transitionMs`.
- Consumes: nothing new; `HudScene.showBanner` unchanged.

- [ ] **Step 1: Write the failing test** in `tests/core/level.test.ts` (replaces the Task 4 rewrite "MEC-003-R7 level.transitionMs is a positive banner time ..."):
```ts
  it('MEC-003-R7 balance has no level.transitionMs (no level-up freeze; banner uses ui.bannerMs)', () => {
    const b = loadBalance();
    expect('transitionMs' in b.level).toBe(false);
    expect(b.ui.bannerMs).toBeGreaterThan(0);
  });
```
- [ ] **Step 2: Run** `npx vitest run tests/core/level.test.ts -t "MEC-003-R7"`. Expected: FAIL (`expected true to be false`).
- [ ] **Step 3: Implement.** Delete `"transitionMs": 1000` from `config/balance.json` `level`; delete `transitionMs` from the `level` type and its check in `src/core/balance.ts`. Run `grep -rn transitionMs src tests` and delete every remaining reference. If a `src/` reference is still live (not dead code left by Tasks 3-4), stop and report it to the lead instead of deleting it.
- [ ] **Step 4: Run** `npx vitest run tests/core/level.test.ts tests/boundary.test.ts` and `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit.** CHANGELOG `### Changed`: `- chore(core): remove level.transitionMs; level-up banner uses ui.bannerMs (MEC-003-R7).` Full `npm test`, `npm run typecheck`. `git commit -m "chore(core): retire level.transitionMs"`.

---

### Task 7: Specs, ARCHITECTURE and DECISIONS

**Files:**
- Modify: `docs/specs/mechanics/MEC-003-levels-biomes.md` (state table line 24; R7-R11 lines 41-48; edge cases 79/81; tests list 146-150; add R22 after R21)
- Modify: `docs/specs/mechanics/MEC-001-snake.md:39,41` (R9, R11)
- Modify: `docs/specs/mechanics/MEC-002-mango.md:38,40` and EC4 (R8, R10, EC4)
- Modify: `docs/specs/mechanics/MEC-006-energy-skills.md:39,44,47,50,76` (R10, R13, R16, R17, R35), EC15, tests list 156-175
- Modify: `docs/ARCHITECTURE.md:21-45` "Sim step order"
- Modify: `docs/DECISIONS.md` (append), `docs/STATUS.md`, `docs/README.md` (P1-LEVELUP-B spec status → Approved)

**Interfaces:** none (docs only).

- [ ] **Step 1: MEC-003.** Delete the `phase` row of the state table; add a row `levelUpSlow | {factor, easeMs, leftMs} \| null | R22`. Replace R7-R11 with:
  - **R7 Sequence (no freeze).** Inside the eating step: eat resolves → length reset (MEC-001-R4) → `level += 1`, `levelsCleared += 1`, `progress` = overflow, `eatenInLevel = 0`, `levelTimeMs = 0` → director timer `director.firstSpawnMs`, maze cooldown 0 (R11) → slowdown starts (R22) → emit `shrunk`, `levelUp` → ramp end (MEC-008-R8) → unlocks (MEC-007-R12) → if the regular mango was eaten, MEC-002-R8(b) places the next one. The sim keeps stepping; the HUD shows "Level N" for `ui.bannerMs` as a non-blocking overlay.
  - **R7.1** retired (a warning maze keeps its own lifecycle).
  - **R8 What stays.** Every hazard, rotten rock, terrain piece, snip wall and rubble keeps its state and ends by its own lifetime rules (MEC-002-R7, MEC-004, MEC-006-R22/R28). Hazards of a family not enabled in the new level keep working until they end.
  - **R9 Nothing is frozen.** Mango rot and retry, director, maze cooldown, `levelTimeMs`, orbs, skills and rain timers keep counting through a level up.
  - **R10 Input.** `turn()` and skill casts are accepted at all times; there is no `busy` rejection.
  - **R11 Level start.** At a level up the director timer is set to `director.firstSpawnMs` and the maze cooldown to 0; the director does not count while a slowdown (R22) is active, so the first spawn comes `firstSpawnMs` after the slowdown ends (immediately counted for levels without a slowdown). At run start for `startLevel` the timer is `firstSpawnMs` and there is no slowdown.
  - **R22 Level-up slowdown.** Tiers by the level just reached, `levelUpSlowdown.tiers` (2-5 none; 6-15 x1.4 / 1000 ms; 16-30 x1.6 / 1500 ms). `curFactor = 1 + (factor − 1) × leftMs / easeMs`, `leftMs` falls by 1 per sim ms and the slowdown ends at 0. A level up during a slowdown restarts it with the new tier. The effective tick is MEC-006-R17's `max` rule over the MEC-008 base tick.
  Update edge case 2 ("maze warning at level up keeps warning") and 4 ("the next mango is placed at t = 0 and its rot timer starts at once; from a rain mango, the regular mango stays and its timer keeps running"). Replace the R7/R9/R10/R11 test names with the new test names from Tasks 3-5, plus the R22 names in `tests/core/slowdown.test.ts`.
- [ ] **Step 2: MEC-001.** R9 → "**Level up does not stop the snake.** The snake keeps stepping through a level up; the tick accumulator is not reset (MEC-006-R18 clamps it when the effective tick changes)." R11: delete the sentence "Death is impossible during the transition (R9; …)".
- [ ] **Step 3: MEC-002.** R8: replace "(frozen during the transition, R10)" with "(its timer keeps running)". R10 → "**No pause at level up.** `ageMs` and `retryMs` keep counting through a level up (MEC-003-R9). Slow-mo does not slow `ageMs` (MEC-006-R19)." EC4: the "reserved crumbling cells" clause is removed; the next mango is placed after the reset with the normal MEC-002-R2 reserved list.
- [ ] **Step 4: MEC-006.** R10: "orb timers keep counting through a level up". R13: order `empty → active → energy → noTarget` (no `busy`). R16: drop "and do not advance during a MEC-003 level transition". R17: "effective tick = `round(baseTickMs × max(slowmo ? tickFactor : 1, curFactor))` where `curFactor` is the MEC-003-R22 level-up slowdown factor (1 when none); the two never stack." R35: drop "and the transition branch". EC15: "snip walls and rubble survive a level up and end by their own lifetime." Update the matching test-name list lines (R10, R13, R16, R35).
- [ ] **Step 5: ARCHITECTURE "Sim step order".** Delete step 3 (transition branch) and renumber; add step "7a. Level-up slowdown: `leftMs −= 1`, null at 0 (MEC-003-R22)"; step 5 director: "skipped while `mango = null` (MEC-003-R13) or while a level-up slowdown is active (MEC-003-R11)"; step 8: `eff = round(base × max(slowmo ? tickFactor : 1, curFactor))`; step 12.4: "the level-up chain (MEC-003-R7: director reset, slowdown start, events), then, if the regular mango was eaten, place the next one (MEC-002-R8)"; delete "sets the tick accumulator to 0 for the transition, MEC-001-R9". Remove the "To be copied…" banner line if it is still there.
- [ ] **Step 6: DECISIONS.** Append `## 2026-11-04 Level-up flow B implementation choices` with: the accumulator is kept (assumption A); no slowdown at a checkpoint start (B); director skip instead of a summed timer (keeps "starts when the slowdown ends" exact, also with an empty mango slot); rotten rock lifetime kept per MEC-002-R7 (owner answer 1); level-up banner uses ui.bannerMs (owner answer 2); extra amended rules (C).
- [ ] **Step 7: Verify** — `git grep -n "transitionEnd\|transitionLeftMs\|reason \`busy\`\|onLevelEnd" -- docs src tests` returns only historical entries in `docs/DECISIONS.md`, `CHANGELOG.md` released sections and old plans/specs under `docs/superpowers/`. Then `npm test` and `npm run typecheck` (docs-only, both still pass).
- [ ] **Step 8: Commit.** CHANGELOG `### Docs`: `- docs(spec): level-up flow B rules in MEC-001/002/003/006 and ARCHITECTURE step order (MEC-003-R22).` Update `docs/STATUS.md`. `git commit -m "docs(spec): level-up flow B rules and step order"`.

---

### Task 8: Fuzz and browser verification

**Files:**
- Modify: `docs/STATUS.md` (result), `CHANGELOG.md` only if a fix is needed
- No production code unless a check fails (then: `superpowers:systematic-debugging`, a new failing test first, separate `fix:` commit)

- [ ] **Step 1: Fuzz.** `npm run test:fuzz`. Expected: PASS, including `MEC-003-R22 fuzz: level-up slowdown stays inside its ease window` and `MEC-006-R35 determinism …` (any advance chunking gives the same hash with the slowdown active).
- [ ] **Step 2: Full suite.** `npm test` then `npm run typecheck`. Expected: PASS.
- [ ] **Step 3: agy browser QA checklist** (hand to the QA worker; run `npm run dev`, Chrome desktop 1280×800 and a phone viewport 390×844 with touch; use `?debug=1` and a checkpoint start where needed). For each item record pass/fail with a screenshot or short clip in the QA report:
  1. L1→L2: the snake never stops at the level up; "Level 2 · Fresh start!" shows over the board and disappears after about 1 s; no console errors.
  2. While the banner is visible, a swipe (phone) and an arrow key (desktop) turn the snake at its next step.
  3. While the banner is visible, a skill button / J-K key casts the skill (no "Not now!" tip ever appears).
  4. L5→L6 (start at checkpoint L4 or play up): the snake is visibly slower right after the level up and returns to normal speed within about 1 s; no stutter or double step.
  5. L15→L16 (checkpoint L12 or later): slower for about 1.5 s, easing smoothly.
  6. Rocks, fences, terrain, rotten rocks, snip walls and rubble present at a level up stay on the board, keep their look, and disappear only at their normal time.
  7. The mango present when a rain mango causes the level up stays and keeps rotting (its rot ring keeps moving).
  8. After L6+ level ups, no new obstacle warning appears before about 1 s + 2.5 s; after L2-L5 level ups, none before about 2.5 s.
  9. Slow-mo cast right after an L6 level up: speed is the slower of the two, never slower than Slow-mo alone.
  10. Banner readability on the phone viewport with a four-line level-up banner (biome change + new obstacle + checkpoint): note whether 1 s is readable (feeds open question 2).
  11. Pause during the slowdown and resume: the slowdown continues where it stopped (sim time), banner state is not stuck.
- [ ] **Step 4: Triage.** Any fail → bug ticket with the requirement ID; fix on the same branch with a failing test first.
- [ ] **Step 5: Finish.** Update `docs/STATUS.md` (Now/Next/Blockers/Last session), merge the task branch into `version/v0.1` with `git merge --no-ff` after `npm test` + `npm run typecheck`, then refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

---

## Self-review

### Spec coverage
| Spec rule | Task(s) | Tests |
|---|---|---|
| 1 No freeze; banner overlay for `ui.bannerMs`; input always | 3, 6 | MEC-003-R7 no freeze; MEC-001-R9 keeps stepping; MEC-003-R7 no transitionMs; QA 1-3 |
| 2 Slowdown tiers, linear ease, restart on re-level | 1, 2, 3 | MEC-003-R22 config, tier, ease midpoint/exact end, x1.4 at 6/15, x1.6 at 16, restart; fuzz window |
| 3 Slow-mo max rule, no stacking (MEC-006-R17) | 2, 3, 7 | MEC-006-R17 larger factor wins (unit + integration); QA 9 |
| 4 Ramp interaction | 2, 3 | MEC-003-R22 multiplies ramp tick; MEC-003-R22 / MEC-008-R8 level up ends ramp then slows level tick |
| 5 Old obstacles stay; disabled families keep working | 4 | MEC-003-R8 obstacles survive (fence at L2); MEC-003-R8 snip walls; MEC-006-EC15; QA 6 |
| 6 Director first spawn after slowdown end | 3, 5 | MEC-003-R11 without slowdown; MEC-003-R11 timer starts when slowdown ends; QA 8 |
| 7 Mango stays; reserved-crumbling rule removed | 3, 4, 7 | MEC-002-R8 rain level up keeps mango; MEC-001-R5 freed cell; QA 7 |
| 8 Skills castable at any time | 3 | MEC-006-R13 cast after level up; R13 order without busy; QA 3 |
| 9 Timers not frozen | 3 | MEC-003-R9 timers run; MEC-006-R10 orbs; MEC-006-R16 slow-mo; QA 11 |

### Type consistency
- `LevelUpSlow { factor; easeMs; leftMs }` is used identically in `types.ts`, `slowdown.ts`, `sim.ts` snapshot, tests and the fuzz invariant.
- `SlowdownTier { from; to; factor; easeMs }` in `balance.ts` matches `config/balance.json` keys and the SPEC entry.
- `startLevelUp(s, b, ctx)` and `checkLevelClear(s, b, ctx)` lose `fromRegularMango` in Task 3; both callers (`snake.ts`, `skills/mangoRain.ts`) are updated in the same task.
- `skillRejected.reason` loses `'busy'` in `types.ts`, `skills.ts` and the text key in the same task.
- `HazardFamily.onLevelEnd` is removed from the interface and all seven families in the same task (Task 4); the call site in `transition.ts` is removed there too.
- `showBanner(text)` unchanged; `Balance.level.transitionMs` removed in Task 6.

### Placeholder scan
No "TBD", "TODO", "similar to Task N" or unspecified code. Line numbers refer to `version/v0.1` at 00a232c; if a file shifted, locate by the quoted code. Task 3 Step 6 and the QA-P1T4-05 / QA-P1T7-30 items give an explicit rule for any freeze-only assertion this list missed, instead of guessing hidden lines.
