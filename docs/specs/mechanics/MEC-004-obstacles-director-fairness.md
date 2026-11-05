# MEC-004 — Obstacles: family framework, director and fairness

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2 (P2a framework; P0/P1 families ported earlier) · Date: 2026-11-03

## 1. Purpose & links
- Owns: the hazard-family registry and its contract, the shared lifecycle building blocks, the collision pipeline for obstacle cells, the director, the GDD §5.3 fairness rules for every family, BFS/placement semantics, death context, and the fairness verification layers (fuzz, escape check, bot report).
- Behavior of the P0 families (rock, fence, maze, terrain) is P0 design §5 "MEC-004" with the MEC-003-R14/R15 table; this spec does not repeat it.
- GDD: §4 (death), §5.1 (one big terrain event), §5.2 (director), §5.3 (fairness), §5.4 (catalogue, "Never use"), §5.5 (death distribution), §6.3 (Shield, Slow-mo), §7.
- Design: `docs/superpowers/specs/2026-11-03-p2-content-design.md` (P2-D1…D9); P0 design §3 `HazardFamily`, §4 time model, §5 MEC-004.
- Related: MEC-001 (snake step), MEC-002 (mango, `reserved`, rotten rock), MEC-003 (levels, table, level up, director formulas), MEC-006 (skills); step order: `docs/ARCHITECTURE.md` "Sim step order", MEC-008 (speed ramp), MEC-012…018 (families).

## 2. Player-facing summary
- Obstacles always warn (blink + icon + shape) before they can hurt you, never appear on or right in front of you, and never cut you off from the mango.
- Each new obstacle type arrives alone, with a one-line tip the first time.
- Moving obstacles show their whole path first. Only your head can be hit by things that move or explode.
- Ground tiles (mud, ice) never kill; they change how you move.

## 3. State & data
- `SimState.families: Record<FamilyKey, FamilyState>`: each family's own JSON state (P0 design §3). No family keeps state outside it, so `sim.clone()` copies everything.
- `SimState.director: {spawnInMs, mazeCooldownMs}` (P0/MEC-003-R11).
- Family descriptor (code constant per module, not state):
  | Field | Type | Meaning |
  |---|---|---|
  | `key` | `FamilyKey` | registry key, also the `level.table` weight key |
  | `cause` | `CauseKey \| null` | cause of death for its solid/hit cells (null: never lethal) |
  | `capClass` | `'small' \| 'big' \| 'modifier' \| 'none'` | director class (R8); `none` = created by another mechanic (rotten rock, snip wall, rubble) |
  | `maxActiveKey` | config path or null | max simultaneous instances (e.g. `terrain.maxActive`, `mud.maxActive`) |
  | `breakable` | boolean | Shield may break its solid/hit cells (MEC-006, P2 design §9) |
- Config: `fairness.*`, `hazard.crumbleMs`, family groups `rock`, `fence`, `maze`, `terrain` (P0 values as changed by MEC-003 §9), new family groups in MEC-012…018.
- Save fields: none.

## 4. Rules
### Registry
- **MEC-004-R1 Registry.** `src/core/hazards/registry.ts` exports `FAMILIES: readonly HazardFamily[]` in this fixed order: `rock, fence, maze, terrain, rottenRock, snipWall, rubble, mud, ice` (P2b appends `coconut, gate, spike, npc, bird, bomb`; P2c appends `shrink`). Every loop over families (update, queries, director options, snapshot) uses this order. `parseBalance` rejects a `level.table` weight key that is not a registry key with `capClass ≠ 'none'`.
- **MEC-004-R2 Interface.** P0 members (`key`, `spawn`, `update`, `snapshot`, `solidAt`, `bfsWallAt`, `reservedAt`, `breakable`) keep their P0 meaning, except that `spawn` now returns the new instance's own cells (`Cell[]`, without helper cells such as an ice ring) on success and `null` on failure (P0 returned a boolean; the director and the fairness harness need the cells). P2a adds the descriptor fields of §3 and these optional members (missing = never / no-op):
  - `tileAt(s, x, y): TileKind | null`: ground tile kind of an **active** tile cell (`'mud' | 'ice'`).
  - `headHit(s, x, y): 'mover' | 'area' | null`: the cell holds a lethal non-solid object for a head moving in (`'mover'`: a mover's cell; `'area'`: an active blast cell).
  - `onBreak(s, x, y): void`: Shield removes the object at that cell (R6).
  - Hits during `update` are not a member: the family calls the step-context callback `ctx.hitHead(family, x, y, kind, dir)` (R8), with `dir` = the mover's direction (any value for `'area'`).
- **MEC-004-R3 Composite queries.** Only these functions ask families (all in registry order):
  - `solidCauseAt(s, x, y)`: the `cause` of the first family whose `solidAt` is true, else null.
  - `bfsWall(s, x, y)`: true if any family's `bfsWallAt` is true.
  - `reservedByFamilies(s, x, y)`: true if any family's `reservedAt` is true. MEC-002-R2 `reserved` = snake cell ∪ regular mango ∪ orb ∪ rain mango ∪ `reservedByFamilies`.
  - `tileAt(s, x, y)`: the first non-null family `tileAt` (tiles never overlap, MEC-012).
  - `headHitAt(s, x, y)`: the first family whose `headHit` is non-null → `{family, cause, kind}`, else null.
- **MEC-004-R4 BFS.** `reachable(s)` is P0's BFS from the head with walls = snake body without its last cell ∪ `bfsWall`. Snake body handling and neighbor order are unchanged from P0.

### Building blocks
- **MEC-004-R5 Blocks.** Families build their lifecycle from these helpers in `src/core/hazards/blocks/` (pure functions on plain data):
  - **TimedCells**: P0 hazard lifecycle exactly (warn `warnMs` → solid `lifeMs` → crumble `hazard.crumbleMs` → removed; a cell turns `on` only when no snake cell is on it; first landing emits `landed`, each landing cell emits `dust`).
  - **CycleCells**: P0 terrain cycle with parameters `{startDelayMs, periodMs, warnMs, upMs, delayMs per cell, lifeMs, fadeOutMs}`; a cell that wants `up` while a snake cell is on it stays `warn`.
  - **GroundTiles**: warn `warnMs` → active `lifeMs` → fade `hazard.crumbleMs` → removed. A cell becomes active only when no snake cell is on it (it keeps warning until then, also after the patch's warn time). Active cells report a `TileKind`; tiles are never solid.
  - **Mover** (P2b, contract only): telegraph `warnMs` with the full path in the snapshot, then advance one cell per `cellMs` along the path; before each advance, if the next cell holds a snake **body** cell or a solid cell, the family's rule decides (wait or shatter, MEC-013/015); if it is the **head** cell, it calls `ctx.hitHead` (R8).
  - **AreaBlast** (P2b, contract only): area shown during a countdown, then active for exactly `levelTickMs(level)` ms (one base tick); when it becomes active and the head is inside, it calls `ctx.hitHead`; while active, `headHit` is true for its cells.

### Collision
- **MEC-004-R6 Snake-move collision.** For the new head cell, in this order (MEC-001-R1 order extended): `wall` → `self` → solid-cell stage: (a) `solidCauseAt`, (b) `headHitAt`. If (a), or (b) with kind `'mover'`, gives a cause:
  - Shield active and the family is `breakable` → MEC-006-R26/R27/R28 (the family's `onBreak` removes the object, bonk, rubble), the head moves in.
  - Otherwise → death with that cause.
  If (b) gives kind `'area'`: handled as an R8 area hit (Shield absorbs it once, the head moves in; otherwise death).
  Warning, crumbling and inactive cells are passable (P0).
- **MEC-004-R7 Speed with tiles.** In the speed update (`docs/ARCHITECTURE.md` "Sim step order"), effective tick = `round(baseTickMs × slowFactor × tileFactor)`, where `slowFactor` = `max(slowmo ? skills.slowmo.tickFactor : 1, levelUpSlowFactor(s))`, the MEC-006-R17 maximum of Slow-mo and the MEC-003-R22 level-up slowdown (lead ruling FB-1), and `tileFactor` = the factor MEC-012 gives for `tileAt(head)` (mud 2, otherwise 1). MEC-006-R18 (accumulator clamp on change) applies unchanged.
- **MEC-004-R8 Non-move hits.** When a family's `update` calls `ctx.hitHead(family, x, y, kind, dir)` (`kind: 'mover' | 'area'`):
  - `kind = 'mover'`: Shield active and family `breakable` → `onBreak` at that cell, Shield consumed (`skillEnded {reason: 'consumed'}`), `shieldBroke {x, y, family, rubble}` with MEC-006-R28 rubble (direction = the mover's direction), bonk per MEC-006-R27. Otherwise death with the family's `cause`.
  - `kind = 'area'`: Shield active → Shield consumed, `shieldBroke {x, y, family, rubble: null}`, no bonk, no rubble (P2-D5). Otherwise death with the family's `cause`.
  - The death happens inside that family's update; later families do not update in that ms (status `over`, P0).

### Director
- **MEC-004-R9 Options.** At each director spawn time (interval and cap from MEC-003-R4; first spawn from MEC-003-R11; no spawn without a regular mango, MEC-003-R13), options are built in registry order from the families with weight > 0 in `familyRow(level).weights` that pass their gate:
  - `small`: (count of instances of all `small` families in any state) < cap, and the family's own count < its `maxActive`.
  - `big` (terrain, maze, later shrink): no other `big` instance exists, the family's count < its `maxActive`, plus P0 family gates (maze cooldown ≤ 0).
  - `modifier` (bird): the family's count < its `maxActive`; not counted toward the cap.
  Weighted pick and retry exactly as P0 (new `total`, new `next()` per retry).
- **MEC-004-R10 Placement tries.** A family's `spawn` tries candidate placements (its own try count and RNG order). A candidate is valid only if all of its new cells are in bounds, not `reserved`, pass R11 (unless exempt) and pass R12. The first valid candidate is committed and its cells returned; if none is valid, `spawn` returns `null` (no state change, RNG already consumed as in P0).

### Fairness (GDD §5.3)
- **MEC-004-R11 Rule 2: never on or in front of the snake.** New cells are not `nearHead(x, y, d)` (P0 definition: Manhattan distance < d, or one of the `fairness.frontLaneCells` cells straight ahead in the current `dir`), with d = `fairness.nearHeadDist` (4), or `fairness.terrainNearHeadDist` (4 from P2a; 3 in P0/P1 for prototype parity) for CycleCells families (P0 terrain). Exempt: snip wall and rubble (MEC-006), shrink ring cells (they wait instead, MEC-018), blast area cells (MEC-017); never exempt: a mover's start cell and a bomb cell.
- **MEC-004-R12 Rule 3: reachability kept.** Before committing a candidate, if the regular mango exists and is in `reachable(s)`, the candidate's cells that will be BFS walls are added and `reachable` is recomputed; if the mango is no longer reachable, the candidate is invalid (counts as a failed try). If the mango was already unreachable before the candidate, R12 does not reject it. Applies to every director family, including the P0/P1 ones (behavior change, P2 design §20 item 13).
- **MEC-004-R13 Rule 1: warning time.** Every family that can become solid or lethal shows a warning of at least `max(fairness.minWarnMs, fairness.minWarnTicks × speed.startMs)` ms (900 with the config of §9). The tick is the L1 base tick `speed.startMs` (P2-D5, owner-approved 2026-11-04, GDD §5.3): Slow-mo and mud make the snake slower and do not lengthen warnings. `parseBalance` checks every family `warnMs`-type key listed in its MEC spec against this bound.
- **MEC-004-R14 Rules 4, 5 and "Never use".** Movers show their whole path (snapshot + highlight) for at least their `warnMs` before the first move (rule 4). One new family per level with a tooltip: MEC-003-R16 and `banner.new.{family}` (rule 5). No family may: change the snake's direction or position (ice only blocks turning, as listed in GDD §5.4), reverse or remap controls, hide any board cell, or become solid/lethal without the R13 warning.
- **MEC-004-R15 Death context.** `died` carries `context: 'ice' | 'mud'` when the head cell at the start of the fatal snake step (or at the hit, for R8) had `tileAt` = that kind; otherwise `context` is absent.
- **MEC-004-R16 Level up.** No family hook runs at a level up (`onLevelEnd` was removed by level-up flow B). Every instance keeps its state and ends by its own lifecycle (MEC-003-R8).

### Verification
- **MEC-004-R17 Layer 1, per-family fuzz.** For each director family F, two configurations: (solo) a test balance whose `level.table` has one row 1…30 with only F's weight (its normal value), run with `startLevel` = F's introduction level and = 30; (full) the shipped table, run with `startLevel` = F's introduction level and = 30. Random turns; `npm test` runs a smoke sample (solo at the introduction level, 3 seeds × 30 s per family, so the whole suite stays < 10 s as in P0 design §9); `npm run test:fuzz` runs every configuration with 200 seeds × 120 s. Checked every 1 ms step: (I1) no F cell becomes solid/active while a snake cell is on it; (I2) new F cells respect R11; (I3) every F cell warns ≥ R13 before solid/active (rotten rock exempt: the rotting mango is its warning); (I4) R12 holds after every spawn; (I5) no new cell was reserved at spawn; (I6) a death's cause matches a family that was solid/lethal at that cell; (I7) determinism under different `advance` chunking. Family specs add their own invariants.
- **MEC-004-R18 Layer 2, escape check.** `escapeExists(state, balance)` (test support, `src/core/fairness/escape.ts`):
  1. Horizon `H = ceil(fairness.escapeHorizonMs / effectiveTick)` snake steps.
  2. Timeline: a clone with the director off and no turns is advanced one tick at a time for H ticks; after each tick it records per cell `solid or headHit` (lethal) and `tileAt`.
  3. Search: BFS over states `(x, y, dir, k)`, k = 0…H. From `(x, y, dir, k)` the moves are straight/left/right (only straight if the cell is active ice at step k). The target cell must be in bounds, not lethal at k + 1, and not a body cell at k + 1, where body cell i (0 = head) is still occupied at step k + 1 if `i < length − (k + 1)`. Eating is ignored (no growth).
  4. Returns true if any state with k = H is reached.
  The check: for every director spawn, `escapeExists(before) ⇒ escapeExists(after)`; a spawn that breaks this is a fairness failure. Sampled in `npm test` (5 seeds per family), every spawn in `test:fuzz`.
- **MEC-004-R19 Layer 3, bot report.** P2 design §16; prints warnings, never fails CI. The human playtest (run log, MEC-003-R18/R19) is the gate for the 40% rule (P2 design §15).
- **MEC-004-R20 Board.** Board stays 17 × 17 (`board.cols/rows`); measured in P2c (P2 design §17).

## 5. Edge cases
1. **Mango already unreachable** (snake coiled around itself): R12 does not block spawns; MEC-002 handles the mango as before.
2. **Spawn needed while no mango exists:** no spawn (MEC-003-R13), so R12 always has a target.
3. **All candidates fail R12:** `spawn` returns false; the director retries other options (R9); nothing spawns this interval.
4. **Two families' `solidAt` true at one cell** (possible only through MEC-006 snip walls, which are cut from body cells regardless of `reserved`, e.g. on a warning rock cell that later lands): the first in registry order gives the cause; Shield breaks that family's cell only.
5. **Shield break of a mover** while the mover is the only thing in that cell: the mover is removed; rubble goes to the cell beyond in the **head's** direction for R6, the **mover's** direction for R8.
6. **Area hit and move hit in the same ms:** families update before the snake step (`docs/ARCHITECTURE.md` "Sim step order"), so an area hit kills first; a consumed Shield cannot save the following move.
7. **Death context when the head was on fading ice:** fading tiles are inactive, so no context.
8. **Level up during a blast or roll:** they survive the level up, keep their own lifecycle and can still hit (MEC-003-R8, R16).
9. **Escape check with an active Shield:** the search ignores skills (Shield never makes a state "escapable").
10. **Escape check false positive** from approximations (no growth, constant tick): a failing seed is triaged by hand; the fix is either the family rule or a documented exception in the family spec.

## 6. Interactions with other mechanics
- **MEC-001:** collision order extended at the solid-cell stage (R6); ice blocks dequeuing turns (MEC-012).
- **MEC-002:** `reserved` and the "good" set use R3/R4; rotten rock is the `rottenRock` registry family (`capClass none`).
- **MEC-003:** director formulas (R4), table and introduction rule (R14–R16), level-up rules R7-R11 and R22.
- **MEC-006:** Shield uses `breakable`/`onBreak` (R6, R8); snip wall and rubble are `capClass none` families exempt from R11–R13; Slow-mo factor in R7; step order amended in `docs/ARCHITECTURE.md` "Sim step order" (MEC-006-R35 points there) with "families update in registry order".
- **MEC-008:** the ramp gives `baseTickMs`; R13 uses `speed.startMs`, which bounds the ramp too.

## 7. Core API changes
```ts
type TileKind = 'mud' | 'ice';
type CapClass = 'small' | 'big' | 'modifier' | 'none';
interface HitCtx { hitHead(family: FamilyKey, x: number, y: number, kind: 'mover' | 'area', dir: Dir): void; }
interface HazardFamily {               // other P0 members unchanged (P0 design §3)
  spawn(s: SimState, ctx: SpawnCtx): Cell[] | null;   // was boolean in P0 (R2)
  readonly cause: CauseKey | null;
  readonly capClass: CapClass;
  readonly maxActiveKey: string | null;
  tileAt?(s: SimState, x: number, y: number): TileKind | null;
  headHit?(s: SimState, x: number, y: number): 'mover' | 'area' | null;
  onBreak?(s: SimState, x: number, y: number): void;
}
```
- `died {cause, x, y, context?: TileKind}`.
- `FamilyKey` and `CauseKey` grow per family spec (P2 design §14). `hazardIncoming.family: FamilyKey`.
- Test support (not exported from `src/core/index.ts`): `escapeExists`, `buildTimeline`, `runFamilyFuzz`.
- Main functions carry `// MEC-004-Rn` comments.

## 8. Feedback (greybox)
- Warnings: blink + icon + shape for every family (P0 style), never color only.
- Introduction tooltip: banner `banner.new.{family}` on `levelUp.unlocked` (MEC-003 §8).
- Death text: `death.{cause}` plus suffix `death.context.ice` (" You slid on the ice.") or `death.context.mud` (" You were stuck in mud.").

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `fairness.nearHeadDist` / `frontLaneCells` / `terrainNearHeadDist` | 4 / 4 / 4 | P0 (terrain 3 until P2a); terrain raised to 4 by owner 2026-11-04 so GDD rule 2's "3 cells" holds for every family |
| `fairness.minWarnMs` / `minWarnTicks` | 900 / 4 | GDD §5.3 rule 1 |
| `fairness.escapeHorizonMs` | 4000 | lead (≥ longest warn 2600 + 1.4 s margin) |
| `hazard.crumbleMs` | 450 | P0 |
| `rock.*`, `fence.*`, `maze.*`, `terrain.*` | P0 design §6 as changed by MEC-003 §9 | P0/P1 |
Fuzz seed counts (50 / 200) and the bot settings are test/tool constants, not balance keys.

## 10. Acceptance tests
- `MEC-004-R1 registry order is rock fence maze terrain rottenRock snipWall rubble mud ice`
- `MEC-004-R1 parseBalance rejects an unknown or capClass none weight key`
- `MEC-004-R3 solidCauseAt returns the first family cause in registry order`
- `MEC-004-R3 reserved includes every family reservedAt plus snake mango orbs rain mangoes`
- `MEC-004-R4 BFS walls come from bfsWall and the body without its tail`
- `MEC-004-R5 GroundTiles cell under the snake stays warn until the snake leaves`
- `MEC-004-R6 headHit cell kills with the family cause; shield breaks a breakable one`
- `MEC-004-R7 effective tick on mud with slow-mo at base 128 is 410`
- `MEC-004-R8 mover hit kills inside update; area hit consumes shield without bonk or rubble`
- `MEC-004-R9 small cap counts all small families; modifier not counted; one big family at a time`
- `MEC-004-R10 spawn returns null and changes nothing when no candidate is valid`
- `MEC-004-R11 no new cell near the head or in the front lane for any director family`
- `MEC-004-R12 a fence that would cut off the mango is rejected`
- `MEC-004-R12 spawns are not blocked when the mango was already unreachable`
- `MEC-004-R13 parseBalance rejects a warnMs below 900`
- `MEC-004-R15 died context is ice when the fatal step started on active ice`
- `MEC-003-R8 obstacles survive a level up, also families not enabled in the new level, and keep their own lifetimes` (covers R16)
- `MEC-004-R17 fuzz invariants I1-I7 hold for every director family`
- `MEC-004-R18 escapeExists is false in a dead-end corridor and true in open board`
- `MEC-004-R18 no director spawn removes the last escape`

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Fixed registry order is the only iteration order (determinism, single cause priority).
- **L2** Composite queries are the only way to ask families (no per-family branches in collision/BFS/placement).
- **L3** Fairness rule 3 applies to all director families including P0/P1 ones; seeded sequences change (P2 design §20 item 13).
- **L4** Rule 3 rejects only spawns that change "reachable" to "unreachable"; it does not try to fix a mango the snake already sealed off.
- **L5** Rule 1 is checked statically against `speed.startMs` (the slowest base tick), so it holds for every level and the ramp.
- **L6** Escape check uses a time-expanded BFS with documented approximations (no growth, constant tick) instead of brute-force simulation: fast enough for every spawn in `test:fuzz`.
- **L7** Area hits consume Shield without bonk or rubble (nothing was broken; the bonk exists to make rubble fair).
- **L8** `died.context` only for ground tiles; other attribution comes from `cause`.
### Escalate to owner
- None (FYIs are listed in the P2 design §21).
