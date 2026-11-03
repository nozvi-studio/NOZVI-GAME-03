# P2a Framework + Ground Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the P0/P1 hazard registry into the P2 family framework (generic collision, director, fairness rule 3, death context), add the fairness tooling (fuzz harness, escape check, bot report), and ship mud (L7) and ice (L13).

**Architecture:** Every obstacle is a stateless family module on one registry (`src/core/hazards/registry.ts`); collision, BFS, placement, Shield and the director only use composite queries. Ground tiles are a new building block (`blocks/groundTiles.ts`); mud changes the effective tick, ice blocks dequeuing turns. Fairness tooling clones the JSON sim state and runs a time-expanded BFS.

**Tech Stack:** TypeScript strict, Vitest, Phaser 3.90.0 (greybox only), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-p2-content-design.md` (P2a rows), `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md`, `docs/specs/mechanics/MEC-012-ground-tiles.md`.

**Precondition:** P1 exit criteria passed (GDD §11 P1 row: playtest with 5 testers recorded in `docs/PLAYTEST.md`, owner gate passed). If not, stop and tell the lead.

## Global Constraints
- English only in files (AGENTS §0). Conventional Commits. One task = one branch = one PR (AGENTS §6).
- `src/core` stays pure: no Phaser, DOM, `Math.random`, `Date`, `performance` (P0 boundary test).
- No new npm dependency; installing anything needs owner approval (AGENTS §8).
- No magic numbers in gameplay: every value below lives in `config/balance.json` and is validated by `parseBalance`.
- Fairness: `fairness.nearHeadDist` 4, `frontLaneCells` 4, `terrainNearHeadDist` **4** (raised from 3 in Task 3 — owner 2026-11-04; update `config/balance.json`, the parseBalance pin test and any terrain golden/fuzz expectations), `minWarnMs` 900, `minWarnTicks` 4, `escapeHorizonMs` 4000.
- Registry order: `rock, fence, maze, terrain, rottenRock, snipWall, rubble, mud, ice`.
- Mud: warn 1500, life 9000 + rand 3000, tries 40, maxActive 2, tickFactor 2. Ice: warn 1500, life 10000 + rand 4000, tries 40, maxActive 2.
- Effective tick = `round(baseTickMs × slowFactor × tileFactor)`.
- Test names start with the requirement ID (`MEC-004-R12 …`). Main functions carry a `// MEC-0xx-Rn` comment.
- `npm test` < 10 s; heavy fuzz only in `npm run test:fuzz` (mode `fuzz`); bot only in `npm run bot:report` (mode `bot`).
- Every PR: CHANGELOG `[Unreleased]` line; CODEMAP/docs map updates when structure changes; STATUS at session end.
- Do not change GDD rules. "P2 changes to P1 specs" (design §20) are applied to the P1 MEC files in the PR that implements them, with lead approval noted in the PR.

## Assumed P0/P1 surface (verify in Task 1)
The plan uses these names from P0 design §3/§4 and the P1 specs. If the landed code differs, Task 1 records the mapping in `docs/DECISIONS.md` and every later task uses the real names (same behavior).
```ts
// src/core/hazards/family.ts
export interface SpawnCtx { balance: Balance; rng: Rng; level: number; emit(e: SimEvent): void; }
export interface StepCtx extends SpawnCtx { snakeOn(x: number, y: number): boolean; }
export interface HazardFamily {
  readonly key: FamilyKey; readonly breakable: boolean;
  spawn(s: SimState, ctx: SpawnCtx): boolean;
  update(s: SimState, ctx: StepCtx): void;
  snapshot(s: SimState): unknown;
  solidAt(s: SimState, x: number, y: number): boolean;
  bfsWallAt(s: SimState, x: number, y: number): boolean;
  reservedAt(s: SimState, x: number, y: number): boolean;
}
// SimState (src/core/state.ts): snake {cells: Cell[]; dir: Dir; queue: Dir[]}, mango, level, families, director, shield, ...
// Sim (src/core/sim.ts): turn, advance, drainEvents, snapshot, useSkill, clone
// P1 state fields: rampActive, rampEaten (MEC-008), slowmo, shield, rubble, acc (MEC-006 step accumulator), status, outcome
// P1 per-family lists: hazards, terrains, rottenRocks, snipWalls, rubble (moved into `families` by Task 1 Step 0)
// P1 run log (src/meta/runLog.ts): emptyLog(): RunLog; appendRecord(log: RunLog, rec: LogRecord): RunLog
// Test support from P0/P1: tests/support/balance.ts loadBalance(): Balance (create it in Task 1 if missing:
//   parseBalance(config/balance.json)); soloTable(b, family) is added in Task 4 (one table row 1…30 with only that weight)
```
Tests live in `tests/` mirroring `src/` (if P0 colocated tests, follow P0; names unchanged).

## File map
| File | Responsibility | Task |
|---|---|---|
| `src/core/hazards/family.ts` | interface + descriptor fields, `TileKind`, `CapClass`, `HitCtx` | 1 |
| `src/core/hazards/registry.ts` | `FAMILIES` in fixed order | 1, 6, 7 |
| `src/core/hazards/queries.ts` | `solidCauseAt`, `bfsWall`, `reservedByFamilies`, `tileAt`, `headHitAt` | 1 |
| `src/core/hazards/collision.ts` | `resolveHeadCell`, `applyHeadHit`, `deathContext` | 2 |
| `src/core/hazards/director.ts` | options by capClass, maxActive, big exclusion, observer | 3 |
| `src/core/hazards/placement.ts` | `candidateValid`, `keepsMangoReachable` | 3 |
| `src/core/simInternal.ts` | `createSimInternal`, `restoreSim`, `stateOf`, `InternalOptions` | 4 |
| `src/core/fairness/timeline.ts` · `escape.ts` | timeline, `searchTimeline`, `escapeExists` | 4 |
| `tests/support/*.ts` | `buildState`, `fakeFamily`, fuzz harness | 1, 4 |
| `src/core/hazards/blocks/groundTiles.ts` | GroundTiles block | 5 |
| `src/core/hazards/mud.ts` · `ice.ts` | families | 6, 7 |
| `src/game/render/tiles.ts` | greybox tiles | 6, 7 |
| `tools/bot/*.ts` | bot policy, level runner, report | 8 |
| `src/meta/runLog.ts`, `src/game/text.ts` | run_end context, texts | 9 |

---

### Task 1: Registry descriptors and composite queries (no behavior change)

**Files:**
- Modify: `src/core/hazards/family.ts`, `src/core/hazards/registry.ts`, each family module (`rock.ts`, `fence.ts`, `maze.ts`, `terrain.ts`, `rottenRock.ts`, `snipWall.ts`, `rubble.ts`), `src/core/mango.ts` (reserved), `src/core/grid.ts` (BFS walls), `src/core/snake.ts` (solid stage), `src/core/skills.ts` (Shield breakable list)
- Create: `src/core/hazards/queries.ts`, `tests/support/buildState.ts`, `tests/support/fakeFamily.ts`, `tests/core/hazards/queries.test.ts`
- Docs: `docs/README.md` rows for P2-DESIGN, MEC-004, MEC-012 (Approved); `docs/CODEMAP.md` hazards row; GDD §2b MEC-012 row only with lead approval in the PR.

**Interfaces:**
- Produces:
```ts
export type TileKind = 'mud' | 'ice';
export type CapClass = 'small' | 'big' | 'modifier' | 'none';
export type HitKind = 'mover' | 'area';
export interface HitCtx { hitHead(family: FamilyKey, x: number, y: number, kind: HitKind, dir: Dir): void; }
export interface HazardFamily {               // P0 members + P2a (MEC-004-R2)
  readonly key: FamilyKey; readonly breakable: boolean;
  readonly cause: CauseKey | null; readonly capClass: CapClass; readonly maxActiveKey: string | null;
  spawn(s: SimState, ctx: SpawnCtx): Cell[] | null;
  update(s: SimState, ctx: StepCtx & HitCtx): void;
  snapshot(s: SimState): unknown;
  solidAt(s: SimState, x: number, y: number): boolean;
  bfsWallAt(s: SimState, x: number, y: number): boolean;
  reservedAt(s: SimState, x: number, y: number): boolean;
  count?(s: SimState): number;                // instances in any state (director, R9)
  tileAt?(s: SimState, x: number, y: number): TileKind | null;
  headHit?(s: SimState, x: number, y: number): HitKind | null;
  onBreak?(s: SimState, x: number, y: number): void;
  onLevelEnd?(s: SimState): void;
}
// queries.ts — fams defaults to FAMILIES
export function solidCauseAt(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): CauseKey | null;
export function solidFamilyAt(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): HazardFamily | null;
export function bfsWall(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): boolean;
export function reservedByFamilies(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): boolean;
export function tileAt(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): TileKind | null;
export function headHitAt(s: SimState, x: number, y: number, fams?: readonly HazardFamily[]): { family: HazardFamily; kind: HitKind } | null;
// tests/support
// buildState: createSimInternal(balance, seed ?? 1, {startLevel: level ?? 1}, {directorEnabled: false}) then overwrites
// snake (head first, then body; default body = 3 cells behind the head), dir, mango; `walls` become ONE real `rock`
// hazard instance in state 'solid' with every cell on and lifeMs 600000 (so clones/restores keep it).
export function buildState(o: { head?: [number, number]; body?: [number, number][]; dir?: Dir; level?: number; mango?: [number, number] | null; seed?: number; walls?: [number, number][] }): SimState;
export interface FakeSpec { key: FamilyKey; cause?: CauseKey | null; solid?: [number, number][]; wall?: [number, number][]; reserved?: [number, number][]; tile?: { kind: TileKind; cells: [number, number][] }; hit?: { kind: HitKind; cells: [number, number][] }; breakable?: boolean; capClass?: CapClass; count?: number }
export function fakeFamily(o: FakeSpec): HazardFamily;
export function withFamilies(s: SimState, specs: FakeSpec[], fn: () => void): void;   // uses __setFamiliesForTest
export function testCtx(s: SimState): SpawnCtx & HitCtx & { events: SimEvent[] };
// registry.ts test seam (documented test-only): export function __setFamiliesForTest(f: readonly HazardFamily[] | null): void;
```
- Existing descriptors: rock/fence/maze `{cause: same key, capClass: 'small', maxActiveKey: null, breakable: true}` (maze `capClass: 'big'`), terrain `{cause: 'ground', capClass: 'big', maxActiveKey: 'terrain.maxActive', breakable: true}`, rottenRock `{cause: 'rotten', capClass: 'none', breakable: true}`, snipWall `{cause: 'snipWall', capClass: 'none', breakable: true}`, rubble `{cause: 'rubble', capClass: 'none', breakable: false}`. Each existing `spawn` returns its cells or `null`. Each existing family gets `onBreak` (MEC-006-R26 per-family removal moved into the family) and `onLevelEnd` (MEC-003-R7 end state moved into the family).

**State migration (lead decision D3).** P0/P1 keep one list per family in `SimState`. Task 1 moves them into `SimState.families[key]` with no behavior change; families keep their instance order, and `snapshot()` keeps its P1 field names (built from `families`).

| P1 field | P2a location |
|---|---|
| `s.hazards` (rock / fence / maze instances, spawn order) | `s.families.rock`, `s.families.fence`, `s.families.maze` (each keeps relative spawn order; the director cap counts across them) |
| `s.terrains` | `s.families.terrain` |
| `s.rottenRocks` | `s.families.rottenRock` |
| `s.snipWalls` | `s.families.snipWall` |
| `s.rubble` | `s.families.rubble` |
| `instancesOf(s, key)` | `s.families[key]` (helper removed) |

Note: P0/P1 update all `s.hazards` in one spawn-ordered pass, so events (e.g. `landed`, `dust`) come out in spawn order. If per-family `update` in registry order would reorder events or RNG calls, keep one spawn-sequence-ordered pass over rock/fence/maze (store a spawn sequence number per instance) so output is identical. If a golden or determinism test changes, stop: the migration is wrong, not the test.

- [ ] **Step 0: Migrate state** — move the five lists into `families` per the table, update every reader (registry, cells/queries, director, snapshot, `exportState`/`simFromState`, tests/support builders). Run `npm test` and `npm run typecheck` → all existing P0/P1 tests, including golden-value and determinism tests, PASS unchanged. Commit `refactor(core): move per-family state lists into SimState.families (no behavior change)`.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/queries.test.ts
import { describe, it, expect } from 'vitest';
import { solidCauseAt, reservedByFamilies, bfsWall, tileAt, headHitAt } from '../../../src/core/hazards/queries';
import { FAMILIES } from '../../../src/core/hazards/registry';
import { buildState } from '../../support/buildState';
import { fakeFamily } from '../../support/fakeFamily';

describe('MEC-004 queries', () => {
  it('MEC-004-R1 registry order is rock fence maze terrain rottenRock snipWall rubble', () => {
    expect(FAMILIES.map(f => f.key)).toEqual(['rock', 'fence', 'maze', 'terrain', 'rottenRock', 'snipWall', 'rubble']);
  });
  it('MEC-004-R3 solidCauseAt returns the first family cause in registry order', () => {
    const a = fakeFamily({ key: 'rock', cause: 'rock', solid: [[3, 3]] });
    const b = fakeFamily({ key: 'fence', cause: 'fence', solid: [[3, 3], [4, 4]] });
    const s = buildState({});
    expect(solidCauseAt(s, 3, 3, [a, b])).toBe('rock');
    expect(solidCauseAt(s, 4, 4, [a, b])).toBe('fence');
    expect(solidCauseAt(s, 5, 5, [a, b])).toBeNull();
  });
  it('MEC-004-R3 tileAt and headHitAt return the first non-null family answer', () => {
    const t = fakeFamily({ key: 'rock', tile: { kind: 'mud', cells: [[2, 2]] }, hit: { kind: 'area', cells: [[6, 6]] } });
    const s = buildState({});
    expect(tileAt(s, 2, 2, [t])).toBe('mud');
    expect(headHitAt(s, 6, 6, [t])?.kind).toBe('area');
    expect(headHitAt(s, 2, 2, [t])).toBeNull();
  });
});
```
Also write (same file, exact names, expected values):
- `MEC-004-R3 reservedByFamilies is true if any family reserves the cell` → fake A reserves (1,1), B reserves (2,2): (1,1) true, (2,2) true, (3,3) false.
- `MEC-004-R3 bfsWall is true if any family bfsWallAt is true` → same shape with `wall`.
- `MEC-004-R4 BFS walls come from bfsWall and the body without its tail` → head (2,2), body (1,2),(0,2), fake wall column x = 4 for y 0…16: `reachable` contains (3,8), not (5,8); contains (0,2) (tail cell).
- `MEC-006-R24 shield breakable list equals families with breakable true` → `FAMILIES.filter(f => f.breakable).map(f => f.key)` equals `['rock','fence','maze','terrain','rottenRock','snipWall']`.

- [ ] **Step 2: Run** `npm test -- tests/core/hazards/queries.test.ts` → FAIL (module `queries` not found).
- [ ] **Step 3: Implement** (after Step 0) `queries.ts` (loops over `fams`, first match wins), descriptors and `Cell[] | null` returns in every family, `onBreak`/`onLevelEnd` moved into families; replace direct family checks in `mango.ts` (reserved = snake ∪ mango ∪ orbs ∪ rain mangoes ∪ `reservedByFamilies`), `grid.ts` (`bfsWall`), `snake.ts` (solid stage `solidFamilyAt`), `skills.ts` (Shield: `family.breakable`, `family.onBreak`), `level.ts` transition (`onLevelEnd` loop).
```ts
// src/core/hazards/queries.ts (core of the file)
export function solidFamilyAt(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): HazardFamily | null {
  for (const f of fams) if (f.solidAt(s, x, y)) return f;   // MEC-004-R3
  return null;
}
export const solidCauseAt = (s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES) =>
  solidFamilyAt(s, x, y, fams)?.cause ?? null;
```
- [ ] **Step 4: Run** `npm test` and `npm run typecheck` → all P0/P1 tests and the new ones PASS (no behavior change: P1 golden-value and determinism tests stay green with unchanged expected values; snapshot field names are unchanged).
- [ ] **Step 5: Commit** `refactor(core): route hazard queries through the family registry (MEC-004-R1-R4)`

---

### Task 2: Collision pipeline, head hits and death context

**Files:**
- Create: `src/core/hazards/collision.ts`, `tests/core/hazards/collision.test.ts`
- Modify: `src/core/snake.ts` (solid stage calls `resolveHeadCell`; captures `tileAt(head)` at step start), `src/core/sim.ts` (step ctx gets `hitHead`), `src/core/events.ts` (`died.context?: TileKind`), `docs/specs/mechanics/MEC-006-energy-skills.md` R25/R26 note (design §20 item 11, lead approval in PR)

**Interfaces:**
- Consumes: Task 1 queries and descriptors.
- Produces:
```ts
export type HeadCellResult =
  | { kind: 'clear' }
  | { kind: 'death'; cause: CauseKey }
  | { kind: 'broke'; family: FamilyKey }      // Shield broke a solid or mover cell (bonk + rubble follow MEC-006-R27/R28)
  | { kind: 'absorbed'; family: FamilyKey };  // Shield absorbed an area hit (no bonk, no rubble)
export function resolveHeadCell(s: SimState, x: number, y: number, ctx: SpawnCtx): HeadCellResult;   // MEC-004-R6
export function applyHeadHit(s: SimState, ctx: SpawnCtx, family: FamilyKey, x: number, y: number, kind: HitKind, dir: Dir): void; // MEC-004-R8
export function deathContext(s: SimState, headBefore: Cell): TileKind | undefined;                  // MEC-004-R15
```
`resolveHeadCell` applies the Shield effects itself for `'broke'` (family `onBreak`, Shield consumed, `skillEnded`, `shieldBroke`, MEC-006-R28 rubble in the head's direction, MEC-006-R27 bonk) and `'absorbed'` (Shield consumed, events, nothing else); the snake step then moves the head in. For `'death'` the snake step ends the run. `applyHeadHit` ends the run (`status = 'over'`, `died {cause, x, y, context}`) or consumes Shield (`skillEnded {skill:'shield', reason:'consumed'}`, `shieldBroke {x, y, family, rubble}`); for `kind = 'mover'` with breakable family it calls `onBreak`, places rubble per MEC-006-R28 using `dir` (the mover's direction) and sets the bonk accumulator per MEC-006-R27.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/collision.test.ts
import { describe, it, expect } from 'vitest';
import { resolveHeadCell, applyHeadHit } from '../../../src/core/hazards/collision';
import { buildState } from '../../support/buildState';
import { withFamilies, testCtx } from '../../support/fakeFamily';

describe('MEC-004 collision', () => {
  it('MEC-004-R6 headHit cell kills with the family cause; shield breaks a breakable one', () => {
    const fam = { key: 'rock' as const, cause: 'rock' as const, hit: { kind: 'mover' as const, cells: [[5, 8]] as [number, number][] }, breakable: true };
    const s = buildState({ head: [4, 8], dir: [1, 0] });
    withFamilies(s, [fam], () => {
      expect(resolveHeadCell(s, 5, 8, testCtx(s))).toEqual({ kind: 'death', cause: 'rock' });
      s.shield = { leftMs: 5000 };
      expect(resolveHeadCell(s, 5, 8, testCtx(s))).toEqual({ kind: 'broke', family: 'rock' });
      expect(s.shield).toBeNull();
    });
  });
  it('MEC-004-R8 area hit consumes shield without bonk or rubble', () => {
    const s = buildState({ head: [4, 8] });
    s.shield = { leftMs: 5000 };
    const ctx = testCtx(s);
    applyHeadHit(s, ctx, 'rock', 4, 8, 'area', [1, 0]);
    expect(s.status).toBe('playing');
    expect(s.shield).toBeNull();
    expect(s.rubble).toEqual([]);
    expect(s.acc).toBeGreaterThanOrEqual(0);
    expect(ctx.events.map(e => e.type)).toEqual(['skillEnded', 'shieldBroke']);
  });
});
```
`withFamilies(s, specs, fn)` (support) swaps the registry used by `queries` for the duration of `fn` through the module-level test seam `__setFamiliesForTest(fams | null)` exported from `registry.ts` (documented as test-only). `testCtx(s)` returns a `SpawnCtx` with a seeded RNG and an `events` array.
Also write:
- `MEC-004-R6 wall and self are checked before the solid stage` → head (16,8) moving right with a fake solid at nothing: cause `wall`; head into own body: cause `self` even with Shield.
- `MEC-004-R6 warning cells are passable` → P0 rock in warn at (5,8): result `clear`.
- `MEC-004-R8 mover hit without shield ends the run with the family cause` → status `over`, `died.cause = 'rock'`.
- `MEC-004-R8 mover hit with shield breaks it, bonk accumulator is -3 ticks, rubble beyond in mover direction` → `acc = -3 × effectiveTick`, rubble at (x + dir) when free.
- `MEC-004-R15 died context is ice when the fatal step started on active ice` → fake tile ice at head (4,8), rock solid at (5,8), step → `died.context = 'ice'`; same with mud → `'mud'`; no tile → property absent.
- [ ] **Step 2: Run** `npm test -- tests/core/hazards/collision.test.ts` → FAIL.
- [ ] **Step 3: Implement** `collision.ts`; in `snake.ts` replace the solid-cell stage by `resolveHeadCell` and pass `deathContext(s, headBefore)` to `died`; in `sim.ts` build the family step context with `hitHead: (f, x, y, k, dir) => applyHeadHit(s, ctx, f, x, y, k, dir)`, and stop updating later families in that ms once `status === 'over'`.
- [ ] **Step 4: Run** `npm test; npm run typecheck` → PASS (P1 hashes unchanged: no family uses `headHit` yet).
- [ ] **Step 5: Commit** `feat(core): generic head collision, head hits and death context (MEC-004-R6 R8 R15)`

---

### Task 3: Director by capClass, fairness rules 1–3 and level end

**Files:**
- Create: `src/core/hazards/placement.ts`, `tests/core/hazards/director.test.ts`, `tests/core/hazards/placement.test.ts`
- Modify: `src/core/hazards/director.ts`, every director family `spawn` (use `candidateValid`), `src/core/balance.ts` (fairness keys, R1/R13 validation), `config/balance.json` (`fairness.minWarnMs 900`, `minWarnTicks 4`, `escapeHorizonMs 4000`), golden-value tests whose seeded sequences change, `docs/DECISIONS.md` (rule 3 retroactive, lead decision MEC-004 L3), `docs/specs/mechanics/MEC-003-levels-biomes.md` R7 note (design §20 item 3)

**Interfaces:**
- Consumes: Task 1 queries, `reachable(s, extraWalls?)` (extend P0 BFS with an optional `Set<number>` of extra wall keys).
- Produces:
```ts
export interface CandidateOpts { nearDist: number; exemptNearHead?: boolean; wallCells: readonly Cell[]; extraFree?: readonly Cell[] }
export function candidateValid(s: SimState, balance: Balance, cells: readonly Cell[], o: CandidateOpts): boolean; // MEC-004-R10-R12
export function keepsMangoReachable(s: SimState, wallCells: readonly Cell[]): boolean;                             // MEC-004-R12
export interface SpawnObserver { spawned(family: FamilyKey, cells: readonly Cell[], before: SimState, after: SimState): void; }
export function directorOptions(s: SimState, balance: Balance, fams?: readonly HazardFamily[]): { family: HazardFamily; weight: number }[]; // MEC-004-R9
```
`extraFree` lets a candidate require additional cells to be in bounds and not reserved (ice ring, Task 7). The director clones `s` (`structuredClone`) before a spawn attempt only when `ctx.observer` is set.

- [ ] **Step 0: Raise `fairness.terrainNearHeadDist` 3 → 4 (owner 2026-11-04, MEC-004-R11)** — change `config/balance.json`; add test `MEC-004-R11 terrain cells never spawn within Manhattan distance 3 of the head`; update the parseBalance pin test and re-baseline any terrain golden expectations in the same commit (note the re-baseline in the PR).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/placement.test.ts
import { it, expect } from 'vitest';
import { candidateValid, keepsMangoReachable } from '../../../src/core/hazards/placement';
import { buildState } from '../../support/buildState';
import { loadBalance } from '../../support/balance';

it('MEC-004-R12 a fence that would cut off the mango is rejected', () => {
  const s = buildState({ head: [2, 8], dir: [0, -1], mango: [14, 8] });
  const wall = Array.from({ length: 17 }, (_, y) => ({ x: 10, y }));
  expect(keepsMangoReachable(s, wall)).toBe(false);
  expect(candidateValid(s, loadBalance(), wall, { nearDist: 4, wallCells: wall })).toBe(false);
  const gapped = wall.filter(c => c.y !== 3);
  expect(candidateValid(s, loadBalance(), gapped, { nearDist: 4, wallCells: gapped })).toBe(true);
});
it('MEC-004-R12 spawns are not blocked when the mango was already unreachable', () => {
  // the corner mango (16,16) is sealed by two wall cells before the candidate
  const s = buildState({ head: [2, 8], dir: [0, -1], mango: [16, 16], walls: [[15, 16], [16, 15]] });
  expect(keepsMangoReachable(s, [{ x: 8, y: 0 }])).toBe(true);
});
```
Also write:
- `MEC-004-R11 no new cell near the head or in the front lane` → head (8,8) dir right: cells (9,9) (Manhattan 2) and (12,8) (front lane 4) invalid; (8,13) valid.
- `MEC-004-R10 spawn returns null and changes nothing when no candidate is valid` → state with all cells reserved by a fake family: `rock.spawn` returns `null`, `JSON.stringify(s)` unchanged except RNG state.
- `MEC-004-R9 small cap counts all small families; modifier not counted; one big family at a time` → fakes: 2 small instances, cap 2 → no small options; a modifier with count 0 still offered; with a terrain instance alive, maze not offered.
- `MEC-004-R9 options follow registry order and table weights` → L11 row → `['rock','fence','terrain']` weights `[3,2,2]`.
- `MEC-004-R13 parseBalance rejects a warnMs below 900` → `rock.warnMs = 899` throws `/rock.warnMs/`.
- `MEC-004-R1 parseBalance rejects an unknown or capClass none weight key` → weights `{rottenRock: 1}` and `{lava: 1}` both throw.
- `MEC-004-R16 level end leaves no solid, lethal or active tile cell` → after a level-up step, for all 289 cells `solidCauseAt`, `headHitAt`, `tileAt` are null.
- [ ] **Step 2: Run** `npm test -- tests/core/hazards` → FAIL.
- [ ] **Step 3: Implement** `placement.ts`:
```ts
export function keepsMangoReachable(s: SimState, wallCells: readonly Cell[]): boolean { // MEC-004-R12
  const m = s.mango; if (!m) return true;
  const k = key(m.x, m.y);
  if (!reachable(s).has(k)) return true;            // already unreachable: do not block (L4)
  return reachable(s, new Set(wallCells.map(c => key(c.x, c.y)))).has(k);
}
```
`candidateValid`: every cell `inBounds && !reserved(s, x, y)`, `!nearHead` unless exempt, every `extraFree` cell in bounds and not reserved, then `keepsMangoReachable(s, o.wallCells)`. Director builds options with `directorOptions` (cap from MEC-003-R4, `count` from each family, `maxActive` from `maxActiveKey`), keeps P0 weighted pick/retry.
- [ ] **Step 4: Run** `npm test; npm run typecheck` → PASS after updating golden-value tests that pin exact seeded spawns (list them in the PR; each update must be explained by rule 3).
- [ ] **Step 5: Commit** `feat(core): director by capClass and fairness rule 3 for all families (MEC-004-R9-R13 R16)`

---

### Task 4: Clone/restore seam, escape check and fuzz harness

**Files:**
- Create: `src/core/simInternal.ts`, `src/core/fairness/timeline.ts`, `src/core/fairness/escape.ts`, `tests/support/fuzz.ts`, `tests/core/fairness/escape.test.ts`, `tests/core/fairness/familyFuzz.test.ts`
- Modify: `src/core/sim.ts` (honor `InternalOptions`), `docs/CODEMAP.md` (fairness + test-support rows; "test-support surfaces, not exported from index")

**Interfaces:**
- Consumes: Task 3 `SpawnObserver`, Task 1 queries.
- Produces:
```ts
export interface InternalOptions { directorEnabled?: boolean; freezeSnake?: boolean; observer?: SpawnObserver }
export function createSimInternal(balance: Balance, seed: number, options: SimOptions, internal: InternalOptions): Sim;
export function restoreSim(balance: Balance, state: SimState, internal?: InternalOptions): Sim;  // deep-copies state
export function stateOf(sim: Sim): SimState;                                                    // live reference, tests/tools only
export interface Timeline { tickMs: number; steps: number; lethal: Set<number>[]; ice: Set<number>[] }   // index k = after k ticks
export function buildTimeline(balance: Balance, state: SimState, steps: number): Timeline;     // MEC-004-R18 step 2
export interface SearchResult { reachedHorizon: boolean; firstMoveToHorizon: Dir | null; firstMoveToGoalSafe: Dir | null }
export function searchTimeline(tl: Timeline, state: SimState, goal?: Cell): SearchResult;     // MEC-004-R18 step 3
export function escapeExists(balance: Balance, state: SimState): boolean;                      // MEC-004-R18
// tests/support/fuzz.ts
export interface FuzzConfig { family: FamilyKey; mode: 'solo' | 'full'; startLevel: number; seeds: number; durationMs: number; escape: 'off' | 'sample' | 'all' }
export function runFamilyFuzz(c: FuzzConfig): string[];   // violation messages, empty = pass
```
`buildTimeline` restores a clone with `{directorEnabled: false, freezeSnake: true}` and advances `tickMs` ms per step, recording `solidCauseAt`/`headHitAt` (lethal) and `tileAt = 'ice'` for all cells. `tickMs` = the state's effective tick at the start. `steps = ceil(fairness.escapeHorizonMs / tickMs)` in `escapeExists`. `searchTimeline` is the BFS of MEC-004-R18 step 3 over `(x, y, dir, k, g)` where `g` = goal visited; `firstMoveToGoalSafe` = first move of a path that visits `goal` and still reaches the horizon.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/fairness/escape.test.ts
import { it, expect } from 'vitest';
import { escapeExists } from '../../../src/core/fairness/escape';
import { buildState } from '../../support/buildState';
import { loadBalance } from '../../support/balance';

it('MEC-004-R18 escapeExists is false in a dead-end corridor and true in open board', () => {
  const b = loadBalance();
  const open = buildState({ head: [8, 8], dir: [1, 0] });
  expect(escapeExists(b, open)).toBe(true);
  // corridor y = 8 from x = 9..12 closed at x = 13, walls above and below
  const walls: [number, number][] = [];
  for (let x = 9; x <= 13; x++) { walls.push([x, 7], [x, 9]); }
  walls.push([13, 8], [8, 7], [8, 9]);
  const trap = buildState({ head: [8, 8], body: [[7, 8], [6, 8], [5, 8]], dir: [1, 0], walls });
  expect(escapeExists(b, trap)).toBe(false);
});
```
Also write:
- `MEC-004-R18 body cells free up as the tail moves` → head boxed in by its own body only on 3 sides with tail adjacent: `true`.
- `MEC-004-R18 ice allows only straight moves` → a 3-cell ice line pointing into a solid wall (fake): `false`; same line with free exit: `true`.
- `MEC-004-R18 timeline sees a warning rock become lethal` → `buildState({level: 21})` (base tick 100, ramp off), one rock instance in `warn` at (10,12) with `t = warnMs − 900`: `lethal[9]` and every later step contain `key(10,12)`, `lethal[8]` does not.
```ts
// tests/core/fairness/familyFuzz.test.ts
import { describe, it, expect } from 'vitest';
import { runFamilyFuzz } from '../../support/fuzz';
const FUZZ = import.meta.env.MODE === 'fuzz';
const INTRO = { rock: 1, fence: 6, terrain: 11, maze: 26 } as const;
describe('MEC-004-R17 per-family fuzz', () => {
  for (const [family, level] of Object.entries(INTRO)) {
    it(`MEC-004-R17 fuzz invariants I1-I7 hold for ${family}`, () => {
      const runs = FUZZ
        ? (['solo', 'full'] as const).flatMap(mode => [level, 30].map(startLevel => ({ mode, startLevel })))
        : [{ mode: 'solo' as const, startLevel: level }];
      for (const r of runs) {
        const v = runFamilyFuzz({ family: family as never, ...r, seeds: FUZZ ? 200 : 3, durationMs: FUZZ ? 120000 : 30000, escape: FUZZ ? 'all' : 'sample' });
        expect(v).toEqual([]);
      }
    }, FUZZ ? 0 : 10000);
  }
});
```
Harness rules (implement exactly): random turns from a separate seeded RNG (seed + 1000003), one `turn` attempt every 100 ms with probability 0.35; `advance(1)` per ms; per ms extract cells from `snapshot()` into `warn | lethal | active` (hazard cells: `on` → lethal, warn/solid-not-on → warn; terrain `vis`; rotten rocks lethal; `tiles` on → active, warn → warn; snip walls and rubble ignored); I1 transition to lethal/active on a snake cell; I3 transition requires continuous warn ≥ 900 ms (rotten rock exempt); observer gives I2 (`nearHead` on returned cells), I4 (`keepsMangoReachable` on `before` was true ⇒ true on `after`), I5 (cells not reserved in `before`), escape (`escapeExists(before) ⇒ escapeExists(after)`, `sample` = first 3 spawns per seed); I6 on `died` with a family cause: cell was lethal in the previous ms; I7: same seed with `advance` chunks of 1 and 37 ms gives the same `JSON.stringify(snapshot())`.
- [ ] **Step 2: Run** `npm test -- tests/core/fairness` → FAIL.
- [ ] **Step 3: Implement** the seam, timeline, search (BFS queue of `[x, y, dirIndex, k, g]`, visited `Uint8Array(17 × 17 × 4 × (H + 1) × 2)`), harness.
Also add `soloTable(b: Balance, family: FamilyKey): Balance` to `tests/support/balance.ts` (deep copy; `level.table = [{from: 1, to: 30, weights: {[family]: 2}, rockShapes: ["single", "lineH", "lineV", "corner", "block"], fenceShapes: ["line", "L", "T", "Z", "F", "U", "plus"], rottenRocks: false}]`; weight 2 for every family except rock, which uses 3, matching MEC-003-R15).
- [ ] **Step 4: Run** `npm test` (< 10 s total) and `npm run test:fuzz` → PASS. If the smoke sample pushes `npm test` over 10 s, lower it to 2 seeds × 20 s and record that in `docs/DECISIONS.md` (lead-level tuning of MEC-004-R17). Any fuzz failure is a fairness bug: use `systematic-debugging`, fix the family, never relax the invariant without a lead decision.
- [ ] **Step 5: Commit** `test(core): escape check and per-family fairness fuzz harness (MEC-004-R17 R18)`

---

### Task 5: GroundTiles block and tile speed factor

**Files:**
- Create: `src/core/hazards/blocks/groundTiles.ts`, `tests/core/hazards/groundTiles.test.ts`
- Modify: `src/core/speed.ts` (or the P1 speed-update module: effective tick), `src/core/snapshot.ts` (`tiles`, `headTile`), `docs/specs/mechanics/MEC-006-energy-skills.md` R17 note (design §20 item 9)

**Interfaces:**
- Produces:
```ts
export interface TilePatch { id: number; state: 'warn' | 'active' | 'fade'; t: number; warnMs: number; lifeMs: number; cells: { x: number; y: number; on: boolean }[]; ring?: Cell[] }
export function newPatch(id: number, cells: readonly Cell[], warnMs: number, lifeMs: number, ring?: readonly Cell[]): TilePatch;
export function stepPatch(p: TilePatch, crumbleMs: number, snakeOn: (x: number, y: number) => boolean): boolean; // false = remove; MEC-012-R2
export function patchCellOn(p: TilePatch, x: number, y: number): boolean;
export function patchHas(p: TilePatch, x: number, y: number): boolean;     // any state
export function fadePatch(p: TilePatch): void;                             // MEC-012-R4
export function effectiveTick(baseTickMs: number, slowFactor: number, tileFactor: number): number; // MEC-004-R7
```
Speed update: `tileFactor = tileAt(s, head) === 'mud' ? balance.mud.tickFactor : 1` (mud key added in Task 6; until then the factor is always 1 and `effectiveTick` is tested directly).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/groundTiles.test.ts
import { it, expect } from 'vitest';
import { newPatch, stepPatch, effectiveTick } from '../../../src/core/hazards/blocks/groundTiles';

it('MEC-004-R5 GroundTiles cell under the snake stays warn until the snake leaves', () => {
  const p = newPatch(1, [{ x: 3, y: 3 }, { x: 4, y: 3 }], 1500, 9000);
  let under = true;
  const snakeOn = (x: number, y: number) => under && x === 3 && y === 3;
  for (let i = 0; i < 1500; i++) stepPatch(p, 450, snakeOn);
  stepPatch(p, 450, snakeOn);
  expect(p.state).toBe('active');
  expect(p.cells.map(c => c.on)).toEqual([false, true]);
  under = false; stepPatch(p, 450, snakeOn);
  expect(p.cells[0].on).toBe(true);
});
it('MEC-004-R7 effective tick on mud with slow-mo at base 128 is 410', () => {
  expect(effectiveTick(128, 1.6, 2)).toBe(410);
  expect(effectiveTick(128, 1, 2)).toBe(256);
  expect(effectiveTick(140, 1.6, 1)).toBe(224);
});
```
Also write: `MEC-012-R2 tile patch warns 1500 ms, is active for its life, fades 450 ms, then is removed` → states at t = 1499 warn, 1500 active, 1500 + 9000 fade, + 450 → `stepPatch` returns false; `MEC-012-R4 fadePatch turns every cell off at once`.
- [ ] **Step 2: Run** `npm test -- tests/core/hazards/groundTiles.test.ts` → FAIL.
- [ ] **Step 3: Implement**; `effectiveTick = Math.round(base * slow * tile)`; speed update uses it, keeping MEC-006-R18 clamp.
- [ ] **Step 4: Run** `npm test; npm run typecheck` → PASS (hashes unchanged).
- [ ] **Step 5: Commit** `feat(core): ground tile block and tile speed factor (MEC-004-R5 R7)`

---

### Task 6: Mud family (L7)

**Files:**
- Create: `src/core/hazards/mud.ts`, `tests/core/hazards/mud.test.ts`, `src/game/render/tiles.ts`
- Modify: `src/core/hazards/registry.ts` (append `mud`), `src/core/types.ts` (`FamilyKey` + `'mud'`), `src/core/balance.ts` (mud group validation), `config/balance.json` (mud group; table rows L7–30 `mud: 2`), `src/game/scenes/GameScene.ts` (call `drawTiles`), `src/game/text.ts` (`banner.new.mud`, `death.context.mud`), `tests/core/fairness/familyFuzz.test.ts` (`mud: 7`), `tests/core/hazards/queries.test.ts` (R1 order adds `'mud'`), `docs/specs/mechanics/MEC-002-mango.md` R2 note and `MEC-003` R15 note (design §20 items 1, 4)

**Interfaces:**
- Consumes: Tasks 1, 3, 5 (`candidateValid`, `newPatch`, `stepPatch`, `patchCellOn`, `patchHas`, `fadePatch`).
- Produces: `export const mud: HazardFamily` with `{key: 'mud', cause: null, capClass: 'small', maxActiveKey: 'mud.maxActive', breakable: false}`; state `s.families.mud = {patches: TilePatch[], nextId: number}`; `tileAt` → `'mud'` for on cells; `reservedAt` → any patch cell; `bfsWallAt`/`solidAt` false; `onLevelEnd` fades all; `drawTiles(g: Phaser.GameObjects.Graphics, tiles: SimSnapshot['tiles'], cellPx: number, timeMs: number): void`.
- Config added:
```json
"mud": { "warnMs": 1500, "lifeMs": 9000, "lifeRandMs": 3000, "tries": 40, "maxActive": 2, "tickFactor": 2,
  "shapePool": ["pair", "line3", "square", "plus"],
  "shapes": { "pair": [[0,0],[1,0]], "line3": [[0,0],[1,0],[2,0]], "square": [[0,0],[1,0],[0,1],[1,1]], "plus": [[1,0],[0,1],[1,1],[2,1],[1,2]] } }
```

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/mud.test.ts
import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { loadBalance, soloTable } from '../../support/balance';

it('MEC-012-R6 head on active mud doubles the tick: L7 256 ms, with slow-mo 410 ms', () => {
  const b = soloTable(loadBalance(), 'mud');
  const sim = createSimInternal(b, 7, { startLevel: 7 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false;   // P1 ramp off for this test (MEC-008 field names: rampActive, rampEaten)
  s.families.mud.patches.push({ id: 1, state: 'active', t: 0, warnMs: 1500, lifeMs: 9000,
    cells: [{ x: 9, y: 8, on: true }, { x: 10, y: 8, on: true }] });
  sim.advance(128);                 // head (8,8) → (9,8), onto mud
  expect(sim.snapshot().headTile).toBe('mud');
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(256);
  s.slowmo = { leftMs: 4000 };
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(410);
});
```
Also write:
- `MEC-012-R1 mud spawn picks shape, transforms and tries origins in P0 fence RNG order` → with a recorded fake RNG, the call sequence is `pick, int(4), next(<0.5 check), int(cols-w+1), int(rows-h+1), …, next(life)`.
- `MEC-012-R1 no tile cell spawns near the head or in the front lane` → 500 seeded spawns from head (8,8) dir right: no cell with Manhattan < 4 or in (9..12, 8).
- `MEC-012-R3 entering mud or ice never kills and never consumes shield` → head walks across an active patch with Shield: alive, `shield` still set.
- `MEC-012-R5 mango orbs and hazards are never placed on mud` → board where all free cells except one are mud: mango lands on the one free cell.
- `MEC-012-R6 leaving mud causes at most one immediate step` → after leaving, at most one snake step within the next 1 ms window.
- `MEC-012-R11 mud is introduced at L7 only` → `levelUp.unlocked` is `'mud'` for L7 and never another level; parseBalance accepts the table.
- `MEC-012-R12 died context is mud for deaths starting on mud` → head on active mud facing a solid rock: `died.context === 'mud'`.
- [ ] **Step 2: Run** `npm test -- tests/core/hazards/mud.test.ts` → FAIL.
- [ ] **Step 3: Implement** `mud.ts`:
```ts
export const mud: HazardFamily = {                       // MEC-012
  key: 'mud', cause: null, capClass: 'small', maxActiveKey: 'mud.maxActive', breakable: false,
  spawn(s, ctx) {                                         // MEC-012-R1
    const m = ctx.balance.mud;
    const shape = transform(m.shapes[ctx.rng.pick(m.shapePool)], ctx.rng);
    const { w, h } = shapeSize(shape);
    for (let i = 0; i < m.tries; i++) {
      const ox = ctx.rng.int(ctx.balance.board.cols - w + 1), oy = ctx.rng.int(ctx.balance.board.rows - h + 1);
      const cells = shape.map(([x, y]) => ({ x: ox + x, y: oy + y }));
      if (!candidateValid(s, ctx.balance, cells, { nearDist: ctx.balance.fairness.nearHeadDist, wallCells: [] })) continue;
      const st = s.families.mud;
      st.patches.push(newPatch(st.nextId++, cells, m.warnMs, m.lifeMs + ctx.rng.next() * m.lifeRandMs));
      ctx.emit({ type: 'hazardIncoming', family: 'mud' });
      return cells;
    }
    return null;
  },
  update(s, ctx) { const st = s.families.mud; st.patches = st.patches.filter(p => stepPatch(p, ctx.balance.hazard.crumbleMs, ctx.snakeOn)); },
  count: s => s.families.mud.patches.length,
  tileAt: (s, x, y) => s.families.mud.patches.some(p => patchCellOn(p, x, y)) ? 'mud' : null,
  reservedAt: (s, x, y) => s.families.mud.patches.some(p => patchHas(p, x, y)),
  solidAt: () => false, bfsWallAt: () => false,
  onLevelEnd: s => s.families.mud.patches.forEach(fadePatch),
  snapshot: s => s.families.mud.patches,
};
```
Then config, registry, speed update reading `balance.mud.tickFactor`, snapshot `tiles` (mud + later ice), greybox `drawTiles` (brown fill + 3 dots; warn: dashed outline blinking every 250 ms + drop icon; reduced motion: no blink, solid outline), texts.
- [ ] **Step 4: Run** `npm test; npm run typecheck; npm run test:fuzz` → PASS; `npm run dev`, play from L7 (`?debug=1` start-level picker from P1 if present, else checkpoint save edit in devtools): mud visible, slows head, no console errors.
- [ ] **Step 5: Commit** `feat(core): mud tiles from level 7 (MEC-012)`

---

### Task 7: Ice family (L13)

**Files:**
- Create: `src/core/hazards/ice.ts`, `tests/core/hazards/ice.test.ts`
- Modify: `registry.ts` (append `ice`), `types.ts` (`FamilyKey` + `'ice'`), `balance.ts`, `config/balance.json` (ice group; rows L13–30 `ice: 2`), `src/core/snake.ts` (dequeue rule), `src/game/render/tiles.ts` (ice look + head arrow), `text.ts` (`banner.new.ice`, `death.context.ice`), `familyFuzz.test.ts` (`ice: 13` + family invariants), `queries.test.ts` (R1 order ends `'mud', 'ice'`, matching MEC-004 §10), `docs/specs/mechanics/MEC-001-snake.md` R1 note (design §20 item 8)

**Interfaces:**
- Consumes: Tasks 1, 3 (`candidateValid` with `extraFree` and `wallCells`), 5.
- Produces: `export const ice: HazardFamily` `{key: 'ice', cause: null, capClass: 'small', maxActiveKey: 'ice.maxActive', breakable: false}`; `export function iceRing(cells: readonly Cell[]): Cell[]` (4-neighbours not in the patch, row-major order); `reservedAt` = patch cells ∪ ring (any state); `bfsWallAt` = patch cells (any state); `tileAt` = `'ice'` for on cells. Snake step: `const onIce = tileAt(s, head.x, head.y) === 'ice'; if (!onIce && s.snake.queue.length) s.snake.dir = s.snake.queue.shift()!;` (MEC-012-R9).
- Config added:
```json
"ice": { "warnMs": 1500, "lifeMs": 10000, "lifeRandMs": 4000, "tries": 40, "maxActive": 2,
  "shapePool": ["line2", "line3", "line4", "square"],
  "shapes": { "line2": [[0,0],[1,0]], "line3": [[0,0],[1,0],[2,0]], "line4": [[0,0],[1,0],[2,0],[3,0]], "square": [[0,0],[1,0],[0,1],[1,1]] } }
```

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/ice.test.ts
import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { iceRing } from '../../../src/core/hazards/ice';
import { loadBalance, soloTable } from '../../support/balance';

it('MEC-012-R9 turns queued on ice are applied on the first step off the ice', () => {
  const b = soloTable(loadBalance(), 'ice');
  const sim = createSimInternal(b, 13, { startLevel: 13 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false;
  const cells = [9, 10, 11].map(x => ({ x, y: 8 }));
  s.families.ice.patches.push({ id: 1, state: 'active', t: 0, warnMs: 1500, lifeMs: 10000,
    cells: cells.map(c => ({ ...c, on: true })), ring: iceRing(cells) });
  const tick = sim.snapshot().tickMs;
  sim.advance(tick);                  // head → (9,8), on ice
  sim.turn(0, -1);                    // queued
  sim.advance(tick * 3);              // (10,8), (11,8), (12,8): straight
  expect(sim.snapshot().snake[0]).toEqual({ x: 12, y: 8 });
  sim.advance(tick);                  // first step starting off ice takes the turn
  expect(sim.snapshot().snake[0]).toEqual({ x: 12, y: 7 });
});
it('MEC-012-R7 ring of a 2-cell line has 6 cells', () => {
  expect(iceRing([{ x: 5, y: 5 }, { x: 6, y: 5 }])).toEqual([
    { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 4, y: 5 }, { x: 7, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }]);
});
```
Also write:
- `MEC-012-R7 ice candidate touching the edge or a reserved ring cell is rejected` → cells at x = 0: invalid; ring cell holding the mango: invalid.
- `MEC-012-R8 ice cells are BFS walls and ring cells are reserved` → `bfsWall(s, 10, 8)` true, `reservedByFamilies(s, 10, 7)` true, `bfsWall(s, 10, 7)` false.
- `MEC-012-R9 head on warning ice can turn` → patch in `warn`: the turn applies on the next step.
- `MEC-012-R10 fuzz: every slide exit is in bounds and holds no hazard mango orb or rain mango` → in `runFamilyFuzz` for `ice`, every ms: each ring cell of an active patch is in bounds and not `solidCauseAt`, not the mango, not an orb, not a rain mango.
- `MEC-012-R11 ice is introduced at L13 only`.
- `MEC-012-R12 died context is ice for deaths starting on ice` → slide into own body: `cause 'self'`, `context 'ice'`.
- `MEC-012-EC10 a mud patch never touches an ice patch` → fuzz (full table, L13 and L30): no mud cell 4-adjacent to an ice cell.
- [ ] **Step 2: Run** `npm test -- tests/core/hazards/ice.test.ts` → FAIL.
- [ ] **Step 3: Implement** `ice.ts` with the same spawn shape as `mud.ts` but `candidateValid(s, b, cells, { nearDist, wallCells: cells, extraFree: iceRing(cells) })` and `ring` stored in the patch; snake dequeue rule; render ice (light fill + 2 diagonal lines; warn dashed outline + snowflake; arrow ahead of the head while `headTile === 'ice'`).
- [ ] **Step 4: Run** `npm test; npm run typecheck; npm run test:fuzz` → PASS; manual run from L13: slide, queued turn after exit, no console errors.
- [ ] **Step 5: Commit** `feat(core): ice tiles from level 13 (MEC-012)`

---

### Task 8: Bot and death-cause report

**Files:**
- Create: `tools/bot/botConfig.ts`, `tools/bot/policy.ts`, `tools/bot/runLevel.ts`, `tools/bot/report.ts`, `tools/bot/report.test.ts`, `tests/tools/policy.test.ts`
- Modify: `package.json` (script `"bot:report": "vitest run --mode bot tools/bot/report.test.ts"`), Vitest config `include` adds `tools/**/*.test.ts`, `tsconfig.json` `include` adds `tools`, `docs/CODEMAP.md` (tools row: may import `src/core/index.ts`, `src/core/simInternal.ts`, `src/core/fairness/*`), `docs/DECISIONS.md` (bot through Vitest, no new dependency)

**Interfaces:**
- Consumes: Task 4 `createSimInternal`, `stateOf`, `buildTimeline`, `searchTimeline`.
- Produces:
```ts
export const BOT = { seeds: 5, timeoutMs: 120000, horizonMs: 1500, levels: { from: 1, to: 15 } } as const;  // botConfig.ts
export function chooseMove(balance: Balance, state: SimState): Dir;                                        // policy.ts
export interface LevelResult { level: number; seed: number; outcome: 'clear' | 'death' | 'timeout'; cause?: CauseKey; context?: TileKind; biome: number }
export function runLevel(balance: Balance, level: number, seed: number): LevelResult;                      // runLevel.ts
export function formatReport(results: readonly LevelResult[]): { markdown: string; warnings: string[] };   // report.ts
```
Policy: `tl = buildTimeline(balance, state, ceil(BOT.horizonMs / tick))`; `r = searchTimeline(tl, state, mango)`; move = `r.firstMoveToGoalSafe ?? r.firstMoveToHorizon ?? state.snake.dir`. `runLevel`: `createSimInternal(balance, seed, {startLevel: level}, {})`; at each snake step boundary (head cell changed or start) call `sim.turn(...chooseMove)`, then `advance(1)` until the head moves, `levelUp`, `runWon`, `died` or timeout. Report: table "Level | clear | death | timeout" and per biome "cause (context) | count | share"; warnings `WARN L{n} cleared by 0 seeds` and `WARN biome {b}: {cause} {pct}% of deaths (> 40%)` for family causes only; `wall`/`self` rows listed under "Player causes" with context split.

- [ ] **Step 1: Write the failing tests**
```ts
// tests/tools/policy.test.ts
import { it, expect } from 'vitest';
import { chooseMove } from '../../tools/bot/policy';
import { formatReport } from '../../tools/bot/report';
import { buildState } from '../support/buildState';
import { loadBalance } from '../support/balance';

it('MEC-004-R19 bot steers away from a wall it would hit next step', () => {
  const s = buildState({ head: [16, 8], dir: [1, 0], mango: [16, 2] });
  expect(chooseMove(loadBalance(), s)).toEqual([0, -1]);
});
it('MEC-004-R19 report warns on a family cause above 40% but not on self', () => {
  const r = (cause: string) => ({ level: 7, seed: 1, outcome: 'death' as const, cause: cause as never, biome: 2 });
  const { warnings } = formatReport([r('fence'), r('fence'), r('fence'), r('rock'), r('self'), r('self'), r('self'), r('self'), r('self')]);
  expect(warnings).toEqual([]);  // fence 33%, self ignored
  const w2 = formatReport([r('fence'), r('fence'), r('rock')]).warnings;
  expect(w2).toContain('WARN biome 2: fence 67% of deaths (> 40%)');
});
```
Also write: `MEC-004-R19 report warns when a level has no clear` → all results for L9 are deaths: warning `WARN L9 cleared by 0 seeds`.
`tools/bot/report.test.ts`: `it.skipIf(import.meta.env.MODE !== 'bot')('MEC-004-R19 bot report L1-15', ...)` runs `runLevel` for every level and seed, prints `markdown` and `warnings` with `console.log`, and never fails on warnings (only on thrown errors).
- [ ] **Step 2: Run** `npm test -- tests/tools` → FAIL.
- [ ] **Step 3: Implement** the four modules.
- [ ] **Step 4: Run** `npm test; npm run typecheck` → PASS; `npm run bot:report` → completes (expected ≤ 15 min), output pasted into the PR description.
- [ ] **Step 5: Commit** `test(tools): headless bot and death-cause report (MEC-004-R19)`

---

### Task 9: Run-log context, P2a exit check and docs

**Files:**
- Modify: `src/meta/runLog.ts` (`run_end.context?: 'ice' | 'mud'`), `tests/meta/runLog.test.ts`, `src/game/` run-end logging (pass `died.context`), death card text (append `death.context.*`), `docs/specs/mechanics/MEC-003-levels-biomes.md` R19 note (design §20 item 7), `docs/PLAYTEST.md` (P2a bot report entry), `docs/STATUS.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `died.context` (Task 2).
- Produces: `RunEndRecord` gains `context?: TileKind`; `deathCounts` unchanged (by cause).

- [ ] **Step 1: Write the failing test**
```ts
// tests/meta/runLog.test.ts (add)
it('MEC-003-R19 run_end keeps the death context and deathCounts stay per cause', () => {
  const log = emptyLog();
  const next = appendRecord(log, { type: 'run_end', runId: 1, t: 0, level: 13, score: 40, cause: 'self', context: 'ice',
    durationMs: 90000, startLevel: 12, levelsCleared: 1, won: false });
  expect(next.entries.at(-1)).toMatchObject({ cause: 'self', context: 'ice' });
  expect(next.deathCounts).toEqual({ self: 1 });
});
```
- [ ] **Step 2: Run** `npm test -- tests/meta/runLog.test.ts` → FAIL (type error / missing field).
- [ ] **Step 3: Implement** the field, game-layer pass-through, death text suffix.
- [ ] **Step 4: P2a exit verification** (`verification-before-completion`):
  - `npm test` (< 10 s), `npm run typecheck`, `npm run test:fuzz` → all PASS.
  - `npm run bot:report` → every level L1–15 cleared by ≥ 1 seed; any WARN lines copied into `docs/PLAYTEST.md` with a one-line triage each.
  - `npm run dev` on desktop and phone (`vite --host`): play L7 and L13 to the end, no console errors.
- [ ] **Step 5: Commit** `feat(meta): log death context; docs: P2a exit report`
- Docs: STATUS (Now: P2a done; Next: write MEC-013…017 + P2b plan), CHANGELOG line, README docs map statuses.

---

## Self-review notes (writing-plans)
- Spec coverage: MEC-004 R1–R4 (T1), R5 (T5), R6/R8/R15 (T2), R7 (T5/T6), R9–R13/R16 (T3), R14 (no-op rules: covered by family reviews; ice is the only steering effect, T7), R17–R18 (T4, families added in T6/T7), R19 (T8), R20 (no change). MEC-012 R1–R12 and EC10 (T5–T7). Design §20 items 1, 3, 4, 7, 8, 9, 11, 13 land in T1–T9; items 2, 5, 6, 10, 12 are covered by T1/T2 (registry-based BFS, breakable flag, step order) or belong to P2b/P2c (5, 6).
- Type names used across tasks: `HazardFamily`, `TileKind`, `HitKind`, `CapClass`, `candidateValid`, `SpawnObserver`, `createSimInternal`, `restoreSim`, `stateOf`, `buildTimeline`, `searchTimeline`, `escapeExists`, `TilePatch`, `effectiveTick`, `iceRing`, `chooseMove`, `runLevel`, `formatReport`.
- P1 field names (`rampActive`, `rampEaten`, `slowmo`, `shield`, `acc`, `rubble`) follow MEC-006/MEC-008 state; Task 1 verifies them with the other assumed names.
