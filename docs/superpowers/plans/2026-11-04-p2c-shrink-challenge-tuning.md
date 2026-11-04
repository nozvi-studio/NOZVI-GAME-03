# P2c Shrinking Board, Challenge Levels and Biome Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish GDD milestone P2: add the shrinking board (L27, MEC-018), turn on challenge levels (L5, 10, 15, 20, 25, 30: own table rows, interval × 0.8, cap + 2, banners and HUD marker), tune director weights per biome, measure the board size, and pass the P2 exit (all 30 levels playable to the end; no death cause > 40%; fairness tests pass).

**Architecture:** Shrink is one more registry family (`src/core/hazards/shrink.ts`, `capClass: 'big'`, exclusive with maze and terrain) built on the P0 TimedCells rule with a "wait while under the snake or near the head" close condition. Challenge levels and tuning are config-only (`config/balance.json` `level.table` rows and `director.*`) plus validation in `parseBalance`. Measurement uses the P2a bot (`tools/bot/`) and a new pure death-cause helper in `src/meta/runLog.ts` on top of `summarizeLog`.

**Tech Stack:** TypeScript strict, Vitest, Phaser 3.90.0 (greybox only), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-p2-content-design.md` (P2c rows: §1, §3, §10 MEC-018, §11 L27, §12, §13, §15, §16, §17, §20 items 4–6), `docs/specs/mechanics/MEC-003-levels-biomes.md` (R4, R14–R16, §8, §9), `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` (R9, R11, R16–R20), `docs/superpowers/specs/2026-11-04-levelup-flow-b-design.md` (no `onLevelEnd`, no freeze, no level-up crumble). MEC-018 is written in Task 1 (P2-D1).

**Precondition:** P2b exit passed (layers 1–2 green for coconut, gate, spike, npc, bird, bomb; bot report L16–25 in `docs/PLAYTEST.md`). If not, stop and tell the lead.

## Open questions (owner)
| # | Question | Provisional default |
|---|---|---|
| OQ-C1 | Shrink lifecycle numbers besides warn 2000 / closed 6000: how often may it happen? | `shrink.cooldownMs` 20000 (same role as `maze.cooldownMs`); weight 2 from L27 |
| OQ-C2 | Challenge banner wording and HUD marker look. | `banner.challenge.{n}` = "Challenge: <name>!" with the names of P2 design §12; HUD marker = a small star next to the level number for the whole level |
| OQ-C3 | Does a challenge level change the mango quota or speed? | No: only director interval × 0.8 and cap + 2 (GDD §5.2, MEC-003-R4) |
| OQ-C4 | Human playtest size for the P2 exit (P1 gate was reduced to 2 testers, DECISIONS 2026-11-04). | Same as the P1 gate: 2 testers, ≥ 30 runs in total that reach biome 4 or later at least 10 times; owner confirms or raises |
| OQ-C5 | When a death cause is > 40% in the playtest, may the lead tune weights and re-test, or does the owner decide? | Lead tunes (config-only PR with bot report, P2 design §13) and re-runs the playtest; owner decides only if two tuning rounds fail |

## Technical rulings (lead-level, decided in this plan)
- **TR-C1 No level-end hook.** Flow B removed `onLevelEnd` (MEC-004-R16). A closed shrink ring survives a level up and reopens by its own lifecycle.
- **TR-C2 Big-event exclusivity** is enforced in the director through the P2a `directorOptions` rule "one `capClass: 'big'` family active at a time" (maze, terrain, shrink). The shrink-specific start conditions (no rolling coconut, no NPC route on the ring) live in `shrink.spawn` (returns `null`), so the director retries other options.
- **TR-C3 Ring cell close rule.** A ring cell closes when no snake cell is on it and it is outside `nearHead(fairness.nearHeadDist)` (P2 design §7 exemption: it waits instead of being excluded). Until then it stays `warn`. All cells reopen together (crumble) at `warnStart + warnMs + closedMs`, so late cells are closed for less time, never longer.
- **TR-C4 Rule 3 for shrink.** The ring is a BFS wall in every state, so the spawn is checked with `keepsMangoReachable(s, ring)` after the mango displacement; the displaced mango is placed off the ring by the normal placement (reserved cells include the ring).
- **TR-C5 Challenge rows** are ordinary `level.table` rows with `from === to`. `parseBalance` gains one check: `introducedAt(b, n)` is never a multiple of 5 (P2 design §12). No schema change.
- **TR-C6 40% metric.** `summarizeLog().causeShare` divides by all ended runs (including `clear` and `quit`). The exit metric needs shares of deaths only, split into family causes and player causes. A new pure helper `deathCauseReport(log)` in `src/meta/runLog.ts` builds on `summarizeLog` (`causes`) and excludes `clear` and `quit`. It is the single source for the gate verdict.
- **TR-C7 Board-size metric** lives in the bot tool (`tools/bot/boardSize.ts`), not in `src/core`: median BFS-reachable free cells sampled once per second of bot play at L25 and L30.

## Global Constraints
- English only in files. Conventional Commits. One task = one branch from the current version branch, merged with `--no-ff` after `npm test` + `npm run typecheck`.
- `src/core` stays pure. No new npm dependency.
- No magic numbers: every value lives in `config/balance.json`, validated by `parseBalance`.
- Registry order after P2c: `rock, fence, maze, terrain, rottenRock, snipWall, rubble, mud, ice, coconut, gate, spike, npc, bird, bomb, shrink`.
- Tuning changes are config-only commits with the bot report attached in the commit body or `docs/PLAYTEST.md` (P2 design §13).
- Board stays 17 × 17 unless §17 triggers and the owner approves (P2-D8).
- Test names start with the requirement ID; minimal tests while working, full suite before commit/merge.

## File Structure
| File | Responsibility | Task |
|---|---|---|
| `docs/specs/mechanics/MEC-018-shrinking-board.md` | shrink rules | 1 |
| `src/core/types.ts` | `FamilyKey`/`CauseKey` + `shrink`, `mangoDisplaced` event | 2 |
| `src/core/hazards/shrink.ts` | shrink family (L27) | 2, 3 |
| `src/core/balance.ts`, `config/balance.json` | `shrink` group, challenge rows, director challenge keys, tuned weights | 2, 4, 6 |
| `src/game/render/shrink.ts`, `src/game/scenes/HudScene.ts`, `src/game/text.ts` | ring visuals, challenge banner + HUD marker | 3, 5 |
| `src/meta/runLog.ts` | `deathCauseReport` (40% metric) | 7 |
| `tools/bot/boardSize.ts`, `tools/bot/report.test.ts` | board-size metric, full L1–30 run | 6 |
| `tests/...` | unit, fairness, fuzz | 2–8 |

---

### Task 1: MEC-018 spec and MEC-003 data notes

**Files:**
- Create: `docs/specs/mechanics/MEC-018-shrinking-board.md`
- Modify: `docs/specs/mechanics/MEC-003-levels-biomes.md` (R4 challenge values, R14/R15 challenge rows, §8 banners on, §9 tuning), `docs/README.md` (MEC-018 row), `docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` §6 link

**Interfaces:**
- Consumes: P2 design §10 MEC-018, §12, OQ-C1…C3 defaults, TR-C1…C5.
- Produces requirement IDs: MEC-018-R1 start conditions, R2 ring warn 2000, R3 close rule (TR-C3), R4 closed time, R5 reopen via crumble, R6 mango displacement, R7 orb/rain removal, R8 cause `shrink` not breakable, R9 big exclusivity, R10 cooldown, R11 introduction L27; MEC-003-R4 challenge factor 0.8 / bonus 2, MEC-003-R14 challenge rows (TR-C5), MEC-003 §8 banners and HUD marker.

- [ ] **Step 1: Write MEC-018** (sections 1–11, template of MEC-012) and the MEC-003 edits; acceptance test names in §10 equal the names in Tasks 2–5.
- [ ] **Step 2: Check links** — `grep -n "MEC-018" docs/README.md docs/specs/mechanics/MEC-004-obstacles-director-fairness.md` → one hit each.
- [ ] **Step 3: Commit** `docs: MEC-018 shrinking board spec and MEC-003 challenge rules for P2c`

---

### Task 2: Shrink family core (L27)

**Files:**
- Create: `src/core/hazards/shrink.ts`, `tests/core/hazards/shrink.test.ts`
- Modify: `src/core/types.ts`, `src/core/hazards/registry.ts` (append `shrink`), `src/core/sim.ts` (init `families.shrink`), `src/core/balance.ts`, `config/balance.json` (group; L27–30 rows add `shrink: 2`), `tests/core/hazards/queries.test.ts` (R1 order), `tests/core/fairness/familyFuzz.test.ts` (`shrink: 27`)

**Interfaces:**
- Consumes: P2a `HazardFamily`, `keepsMangoReachable`, `directorOptions` (big exclusivity), `reservedByFamilies`; P2b `families.coconut.rolls`, `families.npc.npcs`, `moverCell`; P1 mango placement `placeMango(s, b, rng)`; `nearHead` (`grid.ts`).
- Produces:
```ts
export type FamilyKey = /* P2b keys */ | 'shrink';
export type CauseKey  = /* P2b keys */ | 'shrink';
// SimEvent
| { type: 'mangoDisplaced'; from: Cell; to: Cell | null }
export interface ShrinkCell { x: number; y: number; closed: boolean }
export interface ShrinkState { active: { t: number; phase: 'warn' | 'closed' | 'crumble'; cells: ShrinkCell[] } | null; cooldownMs: number }
export function ringCells(cols: number, rows: number): Cell[];            // outer ring, row-major (64 cells on 17 × 17)
export const shrink: HazardFamily;   // {key:'shrink', cause:'shrink', capClass:'big', maxActiveKey:'shrink.maxActive', breakable:false}
```
Lifecycle: spawn ⇒ `phase 'warn'`, `t = 0`; MEC-018-R6/R7 at spawn: if the regular mango is on the ring, remove it and call `placeMango` (fresh timer, no rock), emit `mangoDisplaced`; remove orbs and rain mangoes on the ring (emit P1 `orbExpired` / `rainMangoExpired` with no energy change). `t ≥ warnMs` ⇒ `phase 'closed'`; each ms every open cell closes when `!ctx.snakeOn(x, y)` and not `nearHead` (TR-C3). `t ≥ warnMs + closedMs` ⇒ `crumble` (all cells open) ⇒ removed after `hazard.crumbleMs`, `cooldownMs = shrink.cooldownMs`. `solidAt` → closed cells; `bfsWallAt` and `reservedAt` → every ring cell while `active`; `count` → `active ? 1 : 0`. Spawn returns `null` when `cooldownMs > 0`, a coconut is rolling or warning, or an NPC route touches the ring (MEC-018-R1), or `keepsMangoReachable(s, ring)` fails after displacement (TR-C4; the displacement is only applied when the spawn succeeds — compute on a candidate placement first).
- Config:
```json
"shrink": { "warnMs": 2000, "closedMs": 6000, "cooldownMs": 20000, "maxActive": 1 }
```

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/hazards/shrink.test.ts
import { it, expect } from 'vitest';
import { shrink, ringCells } from '../../../src/core/hazards/shrink';
import { solidCauseAt, bfsWall } from '../../../src/core/hazards/queries';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { buildState } from '../../support/buildState';
import { testCtx } from '../../support/fakeFamily';
import { loadBalance, soloTable } from '../../support/balance';

it('MEC-018-R2 ring has 64 cells on a 17 x 17 board', () => {
  const r = ringCells(17, 17);
  expect(r).toHaveLength(64);
  expect(r.every(c => c.x === 0 || c.y === 0 || c.x === 16 || c.y === 16)).toBe(true);
});
it('MEC-018-R3 ring cells close after 2000 ms except under the snake or near the head', () => {
  const b = soloTable(loadBalance(), 'shrink');
  const sim = createSimInternal(b, 27, { startLevel: 27 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 1, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 9 }, { x: 0, y: 10 }];
  s.dir = { x: 1, y: 0 };
  expect(shrink.spawn(s, testCtx(s))).not.toBeNull();
  sim.advance(b.shrink.warnMs);
  expect(solidCauseAt(s, 16, 16)).toBe('shrink');
  expect(solidCauseAt(s, 0, 9)).toBeNull();     // body on it
  expect(solidCauseAt(s, 0, 5)).toBeNull();     // Manhattan 4 from head (1,8)
  expect(bfsWall(s, 0, 9)).toBe(true);
});
it('MEC-018-R5 all ring cells reopen at warn + closed and the family is removed after crumble', () => {
  const b = soloTable(loadBalance(), 'shrink');
  const sim = createSimInternal(b, 27, { startLevel: 27 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  shrink.spawn(s, testCtx(s));
  sim.advance(b.shrink.warnMs + b.shrink.closedMs);
  expect(solidCauseAt(s, 16, 16)).toBeNull();
  sim.advance(b.hazard.crumbleMs);
  expect(s.families.shrink.active).toBeNull();
  expect(s.families.shrink.cooldownMs).toBeGreaterThan(0);
});
it('MEC-018-R6 a mango on the ring is displaced off the ring with a fresh timer and no rock', () => {
  const b = loadBalance();
  const s = buildState({ head: [8, 8], dir: [1, 0], mango: [0, 3], level: 27 });
  s.mango!.leftMs = 1000;
  const ctx = testCtx(s);
  shrink.spawn(s, ctx);
  const m = s.mango!;
  expect(m.x === 0 || m.y === 0 || m.x === 16 || m.y === 16).toBe(false);
  expect(m.leftMs).toBe(m.totalMs);
  expect(s.families.rottenRock).toEqual([]);
  expect(ctx.events.find(e => e.type === 'mangoDisplaced')).toMatchObject({ from: { x: 0, y: 3 } });
});
```
Also write:
- `MEC-018-R1 shrink does not start while a coconut rolls or an NPC route touches the ring` → each case: `spawn` returns `null`, state unchanged.
- `MEC-018-R7 orbs and rain mangoes on the ring are removed` → orb at (0,5), rain mango at (16,2): both gone after spawn, energy unchanged.
- `MEC-018-R8 shrink cells are not breakable` → Shield head into a closed ring cell: death cause `shrink`, Shield still set before the step (`resolveHeadCell` → `death`).
- `MEC-018-R9 shrink is not offered while maze or terrain is active` → `directorOptions` at L27 with a terrain instance: no `shrink`, no `maze`.
- `MEC-018-R10 shrink waits shrink.cooldownMs after it ends` → `spawn` returns `null` until cooldown 0.
- `MEC-018-R11 shrink is introduced at L27 only`.
- `MEC-003-R8 a closed ring survives a level up and reopens on its own timer` (TR-C1).
- [ ] **Step 2: Run** `npx vitest run tests/core/hazards/shrink.test.ts` → FAIL.
- [ ] **Step 3: Implement**
```ts
// src/core/hazards/shrink.ts — MEC-018
export function ringCells(cols: number, rows: number): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) out.push({ x, y });
  return out;
}
const onRing = (b: Balance, x: number, y: number) => x === 0 || y === 0 || x === b.board.cols - 1 || y === b.board.rows - 1;
export const shrink: HazardFamily = {
  key: 'shrink', cause: 'shrink', capClass: 'big', maxActiveKey: 'shrink.maxActive', breakable: false,
  spawn(s, ctx) {                                                       // MEC-018-R1/R6/R7
    const b = ctx.balance, st = s.families.shrink;
    if (st.active || st.cooldownMs > 0) return null;
    if (s.families.coconut.rolls.length) return null;
    if (s.families.npc.npcs.some(n => n.mover.path.some(c => onRing(b, c.x, c.y)))) return null;
    const ring = ringCells(b.board.cols, b.board.rows);
    const trial = structuredClone(s);
    displaceFromRing(trial, b, ctx.rng.clone());                        // TR-C4 check on a copy
    if (!keepsMangoReachable(trial, ring)) return null;
    displaceFromRing(s, b, ctx.rng, ctx.emit);
    st.active = { t: 0, phase: 'warn', cells: ring.map(c => ({ ...c, closed: false })) };
    ctx.emit({ type: 'hazardIncoming', family: 'shrink' });
    return ring;
  },
  update(s, ctx) {                                                      // MEC-018-R3/R4/R5/R10
    const b = ctx.balance, st = s.families.shrink;
    if (!st.active) { if (st.cooldownMs > 0) st.cooldownMs--; return; }
    const a = st.active; a.t++;
    if (a.phase !== 'crumble' && a.t >= b.shrink.warnMs + b.shrink.closedMs) { a.phase = 'crumble'; a.cells.forEach(c => (c.closed = false)); }
    else if (a.phase !== 'crumble' && a.t >= b.shrink.warnMs) {
      a.phase = 'closed';
      const h = s.snake[0]!;
      for (const c of a.cells) if (!c.closed && !ctx.snakeOn(c.x, c.y)
        && !nearHead(h, s.dir, c.x, c.y, b.fairness.nearHeadDist, b.fairness.frontLaneCells)) c.closed = true;
    }
    if (a.phase === 'crumble' && a.t >= b.shrink.warnMs + b.shrink.closedMs + b.hazard.crumbleMs) {
      st.active = null; st.cooldownMs = b.shrink.cooldownMs;
    }
  },
  count: s => (s.families.shrink.active ? 1 : 0),
  solidAt: (s, x, y) => !!s.families.shrink.active?.cells.some(c => c.closed && c.x === x && c.y === y),
  bfsWallAt: (s, x, y) => !!s.families.shrink.active && s.families.shrink.active.phase !== 'crumble' && onRingCell(s, x, y),
  reservedAt: (s, x, y) => !!s.families.shrink.active && onRingCell(s, x, y),
  snapshot: s => s.families.shrink.active,
};
```
`displaceFromRing(s, b, rng, emit?)` removes ring orbs/rain mangoes and re-places a ring mango (sets `s.mango = null`, then `placeMango`; the ring is reserved because the caller sets `active` only after — so `displaceFromRing` passes the ring as extra reserved cells to `placeMango` through its existing `extraReserved` parameter; add that optional parameter if P1 lacks it). If `Rng` has no `clone()`, use `structuredClone` of the RNG state inside `trial` (the RNG state is part of `SimState`), and pass `trial`'s RNG. The cooldown decrement while inactive also ticks during level-up slowdown (real time).
- [ ] **Step 4: Run** `npx vitest run tests/core/hazards/shrink.test.ts tests/core/hazards/queries.test.ts tests/core/fairness`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(core): shrinking board from level 27 (MEC-018)`

---

### Task 3: Shrink fairness invariants and greybox

**Files:**
- Modify: `tests/support/fuzz.ts` (shrink invariants), `tests/core/fairness/familyFuzz.test.ts`
- Create: `src/game/render/shrink.ts`; Modify: `src/game/scenes/GameScene.ts`, `src/game/text.ts` (`banner.new.shrink`, `death.shrink`), `tests/game/text.test.ts`

**Interfaces:**
- Consumes: Task 2 snapshot `families.shrink`.
- Produces: `export function drawShrink(g: Phaser.GameObjects.Graphics, snap: SimSnapshot, cellPx: number, timeMs: number, reducedMotion: boolean): void`; fuzz invariants `MEC-018-I1` (a ring cell never closes on a snake cell or within `nearHead`), `MEC-018-I2` (no mango, orb or rain mango on a ring cell while active), `MEC-018-I3` (no cell closed after `warnMs + closedMs`).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/fairness/shrinkFuzz.test.ts
import { it, expect } from 'vitest';
import { runFamilyFuzz } from '../../support/fuzz';
it('MEC-018 fuzz: ring never closes on the snake or near the head; nothing collectible on an active ring', () => {
  expect(runFamilyFuzz({ family: 'shrink', mode: 'solo', startLevel: 27, seeds: 3, durationMs: 30000, escape: 'sample' })).toEqual([]);
}, 10000);
```
```ts
// tests/game/text.test.ts (add)
it('MEC-018-R11 shrink has a banner and a death text', () => {
  expect(t('banner.new.shrink')).toBe('The board is shrinking!');
  expect(t('death.shrink')).toBe('Squeezed by the closing border.');
});
```
- [ ] **Step 2: Run** `npx vitest run tests/core/fairness/shrinkFuzz.test.ts tests/game/text.test.ts` → FAIL (invariants not implemented → harness has no `shrink` rules / texts missing).
- [ ] **Step 3: Implement** the three invariants in `runFamilyFuzz` (checked every ms from `snapshot().families.shrink`), texts, `drawShrink` (warn: ring outline blinking every 250 ms + inward arrows on the four sides; closed: hatched dark cells; still-warning cells keep blinking; reduced motion: solid outline, no blink).
- [ ] **Step 4: Run** the two test files → PASS; `npm run dev` from L27 (debug picker): ring warns, closes around the snake, reopens; no console errors. Before commit `npm test`, `npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(game): shrink ring visuals and fairness invariants (MEC-018)`

---

### Task 4: Challenge levels in config and validation

**Files:**
- Modify: `config/balance.json` (`director.challengeIntervalFactor` 0.8, `challengeCapBonus` 2, table rows), `src/core/balance.ts` (TR-C5 check), `tests/core/balance.test.ts`, `tests/core/level.test.ts`, golden-value tests that pin L5/10/… sequences (re-baseline, list in commit body)

**Interfaces:**
- Consumes: `isChallenge(b, n)`, `directorIntervalMs`, `smallHazardCap`, `introducedAt` (`src/core/level.ts`).
- Produces: shipped table (P2 design §12 starting weights; `rottenRocks` and shapes follow the surrounding rows):

| from–to | weights |
|---|---|
| 1–2 | rock 3 |
| 3–4 | rock 3 |
| 5–5 | **rock 5** (all rock shapes) |
| 6–6 | rock 3, fence 2 |
| 7–9 | rock 3, fence 2, mud 2 |
| 10–10 | **fence 4, mud 2, rock 2** |
| 11–11 | rock 3, fence 2, mud 2, terrain 2 |
| 12–12 | rock 3, fence 2, mud 2, terrain 2 (rotten on) |
| 13–14 | rock 3, fence 2, mud 2, terrain 2, ice 2 |
| 15–15 | **ice 4, terrain 2, rock 2, fence 1** |
| 16–16 | rock 3, fence 2, mud 2, terrain 2, ice 2, coconut 2 |
| 17–17 | … + gate 2 |
| 18–19 | … + spike 2 |
| 20–20 | **coconut 4, rock 3, spike 2, gate 1** |
| 21–21 | 18–19 row + npc 2 |
| 22–22 | … + bird 2 |
| 23–24 | … + bomb 2 |
| 25–25 | **npc 4, bomb 2, bird 2, rock 1** |
| 26–26 | 23–24 row + maze 2 |
| 27–29 | … + shrink 2 |
| 30–30 | **every family 2** (rock, fence, mud, terrain, ice, coconut, gate, spike, npc, bird, bomb, maze, shrink) |

Fence shape lists per row stay as in the current table (L6 `line`; L7–12 `line, L`; L13–15 `line, L, T, Z`; L16+ all).

- [ ] **Step 1: Write the failing tests**
```ts
// tests/core/level.test.ts (add)
import { isChallenge, directorIntervalMs, smallHazardCap, introducedAt, familyRow } from '../../src/core/level';
import { loadBalance } from '../support/balance';

it('MEC-003-R4 challenge levels use interval x 0.8 and cap + 2', () => {
  const b = loadBalance();
  expect(isChallenge(b, 10)).toBe(true);
  expect(directorIntervalMs(b, 10)).toBe(Math.floor(Math.max(1600, 5000 - 120 * 10) * 0.8));
  expect(smallHazardCap(b, 10)).toBe(Math.min(10, 2 + Math.floor(10 / 3)) + 2);
  expect(directorIntervalMs(b, 11)).toBe(Math.max(1600, 5000 - 120 * 11));
});
it('MEC-003-R14 challenge rows follow P2 design §12', () => {
  const b = loadBalance();
  expect(familyRow(b, 5).weights).toEqual({ rock: 5 });
  expect(familyRow(b, 20).weights).toEqual({ coconut: 4, rock: 3, spike: 2, gate: 1 });
  expect(Object.keys(familyRow(b, 30).weights)).toHaveLength(13);
});
it('MEC-003-R16 no family is introduced on a challenge level', () => {
  const b = loadBalance();
  for (const n of [5, 10, 15, 20, 25, 30]) expect(introducedAt(b, n)).toBeUndefined();
  expect([1, 6, 7, 11, 12, 13, 16, 17, 18, 21, 22, 23, 26, 27].map(n => introducedAt(b, n)))
    .toEqual(['rock', 'fence', 'mud', 'terrain', 'rottenRock', 'ice', 'coconut', 'gate', 'spike', 'npc', 'bird', 'bomb', 'maze', 'shrink']);
});
```
```ts
// tests/core/balance.test.ts (add)
it('MEC-003-R16 parseBalance rejects a table that introduces a family on a challenge level', () => {
  const raw = structuredClone(rawBalance());
  raw.level.table.find((r: { from: number }) => r.from === 25).weights.shrink = 1;   // shrink first enabled at L25
  expect(() => parseBalance(raw)).toThrow(/challenge level 25 introduces shrink/);
});
```
(`rawBalance()` = the parsed JSON file before validation, helper in `tests/support/balance.ts`; add it if missing.)
- [ ] **Step 2: Run** `npx vitest run tests/core/level.test.ts tests/core/balance.test.ts` → FAIL.
- [ ] **Step 3: Implement** the table and director keys in `config/balance.json`; in `parseBalance` after the table checks:
```ts
for (let n = 5; n <= b.level.maxLevel; n += 5) {                    // MEC-003-R16, TR-C5
  const k = introducedAt(b, n);
  if (k) throw new Error(`level.table: challenge level ${n} introduces ${k}`);
}
```
Re-baseline golden-value tests that pin seeded spawns on L5, 10, 15, 20, 25, 30 (each change explained by "challenge row + multipliers" in the commit body). Rows between challenge levels must make the 30 row keep every family introduced before (no family disappears after a challenge row except by the row's own weights; `introducedAt` counts "first enable", so a family absent from a challenge row is not re-introduced afterwards — covered by the R16 test).
- [ ] **Step 4: Run** the two files; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(config): challenge levels 5-30 with interval x0.8 and cap +2 (MEC-003-R4 R14 R16)`

---

### Task 5: Challenge banners and HUD marker

**Files:**
- Modify: `src/game/scenes/HudScene.ts` (remove the P1 "challenge flag ignored" branch, lead decision L9 superseded), `src/game/text.ts`, `tests/game/text.test.ts`, `tests/game/hud.test.ts` (or the existing HUD logic test file), `docs/specs/mechanics/MEC-003-levels-biomes.md` §8 note

**Interfaces:**
- Consumes: `levelUp {challenge: boolean, level}` event, `SimSnapshot.challenge`.
- Produces: pure helper `export function levelUpLines(e: { level: number; challenge: boolean; unlocked?: string; biomeChanged: boolean }, t: (k: string) => string): string[]` in `src/game/hudText.ts` (extracted from `HudScene` so it is unit-testable); HUD marker drawn while `snapshot.challenge`.
- Texts (OQ-C2):
```ts
'banner.challenge.5': 'Challenge: Rock rain!', 'banner.challenge.10': 'Challenge: Fence field!',
'banner.challenge.15': 'Challenge: Thin ice!', 'banner.challenge.20': 'Challenge: Avalanche!',
'banner.challenge.25': 'Challenge: Pet chaos!', 'banner.challenge.30': 'Challenge: Final storm!',
'hud.challenge': '★',
```

- [ ] **Step 1: Write the failing test**
```ts
// tests/game/hudText.test.ts
import { it, expect } from 'vitest';
import { levelUpLines } from '../../src/game/hudText';
import { t } from '../../src/game/text';
it('MEC-003 §8 a challenge level up shows the challenge banner after the level line', () => {
  const lines = levelUpLines({ level: 20, challenge: true, biomeChanged: false }, t);
  expect(lines).toContain('Challenge: Avalanche!');
  expect(levelUpLines({ level: 19, challenge: false, biomeChanged: false }, t).some(l => l.startsWith('Challenge'))).toBe(false);
});
```
- [ ] **Step 2: Run** `npx vitest run tests/game/hudText.test.ts` → FAIL.
- [ ] **Step 3: Implement** `levelUpLines` (existing level/biome/unlock lines unchanged, then `banner.challenge.{level}` when `challenge`), use it in `HudScene`, draw the marker next to the level label while `snapshot.challenge`.
- [ ] **Step 4: Run** `npx vitest run tests/game`; `npm run typecheck`; `npm run dev`: reach L5 → banner + star; L6 → star gone. Before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(game): challenge level banners and HUD marker (MEC-003 §8)`

---

### Task 6: Full bot run, per-biome tuning and board-size check

**Files:**
- Create: `tools/bot/boardSize.ts`, `tests/tools/boardSize.test.ts`
- Modify: `tools/bot/botConfig.ts` (`levels: { from: 1, to: 30 }`, `seeds: 20`, `timeoutMs: 180000` per P2 design §16), `tools/bot/report.test.ts` (prints board-size lines for L25 and L30), `config/balance.json` (weights only), `docs/PLAYTEST.md`, `docs/DECISIONS.md` (tuning rationale)

**Interfaces:**
- Consumes: P2a `runLevel`, `formatReport`, `createSimInternal`, `stateOf`, `reachable` (`grid.ts`).
- Produces:
```ts
export function reachableFreeCells(s: SimState): number;                      // BFS-reachable cells from the head, excluding walls
export function median(xs: readonly number[]): number;
export interface BoardSizeResult { level: number; medianReachable: number; boardCells: number; share: number; clearRate: number }
export function boardSizeVerdict(r25: BoardSizeResult, r30: BoardSizeResult, clear21to25: number, clear26to30: number): { escalate: boolean; reasons: string[] };   // P2 design §17
```

- [ ] **Step 1: Write the failing tests**
```ts
// tests/tools/boardSize.test.ts
import { it, expect } from 'vitest';
import { median, boardSizeVerdict, reachableFreeCells } from '../../tools/bot/boardSize';
import { buildState } from '../support/buildState';

const r = (level: number, share: number, clearRate: number) => ({ level, medianReachable: share * 289, boardCells: 289, share, clearRate });
it('MEC-004-R20 median of an even list is the mean of the middle two', () => {
  expect(median([4, 1, 3, 2])).toBe(2.5);
});
it('MEC-004-R20 board-size escalates on reachable share < 40% or L26-30 clear rate < half of L21-25', () => {
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.5, 0.5), 0.8, 0.5).escalate).toBe(false);
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.39, 0.5), 0.8, 0.5).reasons).toContain('L30 median reachable 39% < 40%');
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.5, 0.3), 0.8, 0.3).reasons).toContain('L26-30 clear rate 30% < half of L21-25 (80%)');
});
it('MEC-004-R20 reachableFreeCells counts the open board minus the snake body', () => {
  expect(reachableFreeCells(buildState({ head: [8, 8], body: [[7, 8], [6, 8], [5, 8]] }))).toBe(289 - 3);
});
```
- [ ] **Step 2: Run** `npx vitest run tests/tools/boardSize.test.ts` → FAIL.
- [ ] **Step 3: Implement** `boardSize.ts` (`reachableFreeCells` = size of the P0 `reachable(s)` set minus the head cell; P0 BFS treats body cells except the tail as walls, so an open board with a 4-cell snake gives 289 − 3; percent strings rounded to whole numbers). In `report.test.ts` (mode `bot`), sample `reachableFreeCells` once per 1000 ms of each L25 and L30 run and print `boardSizeVerdict`.
- [ ] **Step 4: Tune** — loop (config-only, P2 design §13):
  1. `npm run bot:report` (L1–30 × 20 seeds; may take > 30 min; run in background).
  2. For each biome WARN `> 40%` on a family cause: lower that family's weight in the biome's non-challenge rows by 1 (min 1) or raise the other families' weights; for `cleared by 0 seeds`: lower the strongest family weight in that row. Each biome should still feel harder than the previous one: check the bot clear rate per biome is non-increasing from biome 1 to 6 at its first level; if it increases, raise weights of the newest families of that biome.
  3. Re-run; stop when no family WARN remains or after 3 rounds (then list remaining WARNs for the owner in `docs/PLAYTEST.md`).
  4. Record each round (changes + resulting table) in `docs/PLAYTEST.md` "P2c tuning" and one entry in `docs/DECISIONS.md`.
  5. Board size: if `boardSizeVerdict(...).escalate` after tuning, add an owner escalation to STATUS "Blockers" (do not change the board, P2-D8).
- [ ] **Step 5: Run** `npm test` (golden tests that pin weights updated only where tuning changed rows), `npm run typecheck` → PASS. Commit `chore(config): per-biome director tuning from bot report (P2 design §13 §17)` with the final bot summary in the body.

---

### Task 7: Death-cause metric for the 40% rule

**Files:**
- Modify: `src/meta/runLog.ts`, `src/meta/index.ts` (export), `tests/meta/runLog.test.ts`, `src/game/scenes/HomeScene.ts` debug summary (print the report next to `summarizeLog`)

**Interfaces:**
- Consumes: `summarizeLog(log, sessionGapMs): LogSummary` (`causes` per run_end cause, including `clear` and `quit`), `RunLog`, `appendRecord`, `emptyLog`.
- Produces:
```ts
export const PLAYER_CAUSES = ['wall', 'self'] as const;
export const NON_DEATH_CAUSES = ['clear', 'quit'] as const;
export interface DeathCauseReport {
  deaths: number;
  familyShare: Record<string, number>;              // family cause → share of all deaths (0..1, 3 decimals)
  playerShare: Record<string, number>;              // 'wall' | 'self' (with ':ice' / ':mud' context keys) → share
  over40: string[];                                 // family causes with share > 0.4  → exit failure
  review: string[];                                 // player causes with share > 0.4  → tuning review only
}
/** P2 design §15 / TR-C6: 40% rule on deaths only (clear and quit excluded). */
export function deathCauseReport(log: RunLog, sessionGapMs: number, limit = 0.4): DeathCauseReport;
```

- [ ] **Step 1: Write the failing test**
```ts
// tests/meta/runLog.test.ts (add)
import { deathCauseReport, emptyLog, appendRecord } from '../../src/meta/runLog';
const end = (runId: number, cause: string, context?: 'ice' | 'mud') => ({ type: 'run_end' as const, runId, t: runId * 1000, level: 20,
  score: 10, cause, durationMs: 60000, startLevel: 16, levelsCleared: 1, won: cause === 'clear', ...(context ? { context } : {}) });
const start = (runId: number) => ({ type: 'run_start' as const, runId, t: runId * 1000 - 500, startLevel: 16, entry: 'home' as const });

it('P2-EXIT no death cause > 40%: shares count deaths only and split family vs player causes', () => {
  let log = emptyLog();
  const causes = ['coconut', 'coconut', 'bomb', 'self', 'wall', 'clear', 'quit'];
  causes.forEach((c, i) => { log = appendRecord(log, start(i + 1)); log = appendRecord(log, end(i + 1, c, c === 'self' ? 'ice' : undefined)); });
  const r = deathCauseReport(log, 600000);
  expect(r.deaths).toBe(5);
  expect(r.familyShare).toEqual({ coconut: 0.4, bomb: 0.2 });
  expect(r.playerShare).toEqual({ 'self:ice': 0.2, wall: 0.2 });
  expect(r.over40).toEqual([]);                 // exactly 40% passes
  log = appendRecord(log, start(9)); log = appendRecord(log, end(9, 'coconut'));
  expect(deathCauseReport(log, 600000).over40).toEqual(['coconut']);   // 3/6 = 50%
});
```
- [ ] **Step 2: Run** `npx vitest run tests/meta/runLog.test.ts` → FAIL.
- [ ] **Step 3: Implement**: walk `log.entries` for `run_end` records once per `runId` (same dedupe as `summarizeLog`), skip `NON_DEATH_CAUSES`, key player causes as `cause` or `cause:context`, family causes by `cause`; shares rounded like `summarizeLog` (`Math.round(n / d × 1000) / 1000`); `over40` / `review` sorted by share descending. Reuse `summarizeLog(log, gap).causes` for the per-cause totals of family causes and assert in the test that `familyShare` keys ⊆ `Object.keys(summarizeLog(...).causes)`. Show `over40` and `review` lines in the HomeScene debug summary.
- [ ] **Step 4: Run** `npx vitest run tests/meta`; `npm run typecheck`; before commit `npm test` → PASS.
- [ ] **Step 5: Commit** `feat(meta): death-cause report for the P2 40% rule`

---

### Task 8: P2 exit verification (fuzz, fairness per family, bot, browser QA, playtest metric)

**Files:**
- Modify: `tests/core/fairness/familyFuzz.test.ts` (final `INTRO` incl. `shrink: 27`), `docs/PLAYTEST.md` (P2 exit entry), `docs/STATUS.md`, `CHANGELOG.md`, `docs/README.md` (MEC-018 Implemented), `docs/GDD.md` §2b MEC-004 status (lead approval)

**Interfaces:**
- Consumes: everything above; P2a/P2b harness; `deathCauseReport`.

- [ ] **Step 1: Fairness test per family** — final map and full-table escape test:
```ts
const INTRO = { rock: 1, fence: 6, mud: 7, terrain: 11, ice: 13, coconut: 16, gate: 17, spike: 18,
  npc: 21, bird: 22, bomb: 23, maze: 26, shrink: 27 } as const;
```
```ts
// tests/core/fairness/fullTable.test.ts
import { it, expect } from 'vitest';
import { runFamilyFuzz } from '../../support/fuzz';
it('MEC-004-R17 full shipped table at L30 keeps invariants I1-I7 and escape for every family', () => {
  expect(runFamilyFuzz({ family: 'shrink', mode: 'full', startLevel: 30, seeds: 3, durationMs: 30000, escape: 'sample' })).toEqual([]);
}, 10000);
```
Run `npx vitest run tests/core/fairness` → PASS.
- [ ] **Step 2: Suites** — `npm test` (PASS, < 10 s target; record actual time), then `npm run typecheck` (PASS), then `npm run test:fuzz` (every family, solo + full, intro level and L30, 200 seeds × 120 s; PASS). Any failure: `systematic-debugging`; no invariant relaxed without a lead decision.
- [ ] **Step 3: Bot report** — `npm run bot:report` (L1–30 × 20 seeds): every level cleared by ≥ 1 seed (exit item 1, bot part); paste into `docs/PLAYTEST.md` "P2 exit bot report" with the board-size verdict.
- [ ] **Step 4: agy browser QA checklist** (delegate to agy; phone 390 × 844 and desktop 1280 × 800; `npm run dev`; debug start-level picker):
  1. L5, 10, 15, 20, 25, 30: challenge banner with the right name, star marker visible for the whole level, gone on the next level.
  2. L27: banner "The board is shrinking!"; ring outline blinks ≥ 2 s; cells under the snake or near the head keep blinking and close later; the ring reopens after ~6 s.
  3. Mango on the ring at warn start moves inside with a full timer; no rotten rock appears.
  4. No shrink while a coconut lane is highlighted or rolling, or while an NPC route touches the edge (L30, watch several cycles).
  5. Shield into a closed ring cell: death "Squeezed by the closing border." (not breakable).
  6. Level up while the ring is closed: it stays closed and reopens on time (flow B).
  7. L30 for 2 minutes: every family can appear; never maze + terrain + shrink at the same time.
  8. Reduced motion on: no blinking, warnings readable by shape/icon.
  9. Both viewports: HUD and banners not clipped; devtools console has no errors or warnings.
  agy reports pass/fail per item with screenshots; lead triages.
- [ ] **Step 5: Human playtest + 40% metric** — owner and testers (OQ-C4) play the build; each exports the run log from the HomeScene debug panel; the lead merges the logs and runs:
```ts
// one-off check in a Vitest file under tests/playtest/ (mode 'playtest', skipped otherwise) or in the debug panel
import { summarizeLog, deathCauseReport } from '../../src/meta';
const s = summarizeLog(log, balance.log.sessionGapMs);
const r = deathCauseReport(log, balance.log.sessionGapMs);
console.log(s.levelsReached, r.familyShare, r.playerShare, r.over40, r.review);
```
  Exit verdict in `docs/PLAYTEST.md`: (1) `levelsReached` shows L30 reached and cleared at least once (bot + human, exit item 1); (2) `r.over40` is empty (exit item 2); `r.review` entries get a one-line tuning note (not an exit failure, P2 design §15). If `over40` is not empty: Task 6 tuning loop on that biome, then re-playtest (OQ-C5).
- [ ] **Step 6: Docs and commit** — STATUS (Now: P2 exit passed / pending items; Next: merge `version/v0.x` → `dev`, P3), CHANGELOG line, README statuses. Commit `test: P2 exit verification, bot report and playtest metric`.

---

## Self-review (writing-plans)

| Spec item (P2 design / GDD) | Task |
|---|---|
| §3 P2c: shrinking board (MEC-018) | 1, 2, 3 |
| §3 P2c: challenge rows and multipliers | 4 |
| §12 banners `banner.challenge.{5…30}` + HUD marker | 5 |
| §12 a challenge row never introduces a family (validation) | 4 (TR-C5) |
| §13 per-biome weights, big events exclusive | 4, 6, 2 (TR-C2) |
| §15 40% rule scope (family causes gate, wall/self review, context split) | 7, 8 |
| §16 bot L1–30 × 20 seeds, 180 s | 6, 8 |
| §17 board-size measurement and escalation rule | 6 |
| §1 exit 1: all 30 levels playable to the end | 6, 8 Steps 3 and 5 |
| §1 exit 2: no death cause > 40% (`summarizeLog` + `deathCauseReport`) | 7, 8 Step 5 |
| §1 exit 3: fairness tests for every family | 3, 8 Steps 1–2 |
| §1 exit 4: tests, typecheck, no console errors | 8 Steps 2 and 4 |
| §20 items 4, 5, 6 (MEC-003 rows, challenge config, banners) | 1, 4, 5 |
| Flow B: no onLevelEnd; ring survives level up | TR-C1, 2, 8 Step 4 item 6 |

Type names used across tasks: `ShrinkState`, `ShrinkCell`, `ringCells`, `shrink`, `levelUpLines`, `reachableFreeCells`, `median`, `BoardSizeResult`, `boardSizeVerdict`, `DeathCauseReport`, `deathCauseReport`, `PLAYER_CAUSES`, `NON_DEATH_CAUSES`.
