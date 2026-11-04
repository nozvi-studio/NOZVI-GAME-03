# MEC-001 — Snake: movement, growth, self-collision, length reset

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- Defines how the snake moves, grows, dies on its own body or the board edge, and how its length resets on level up.
- GDD: §2.1 (in-run loop), §3 (controls), §4 (fail conditions, run win), §5.2 (length reset, owner decision A), §6.3 (Tail Snip min length), §7 (start length 4).
- Base behavior: P0 design §5 "MEC-001 Snake" (prototype port). This spec keeps P0 behavior unless a rule below changes it.
- Related: MEC-002 (mango placement, golden mango), MEC-003 (level up, run win), MEC-004 (solid cells, fairness), MEC-006 (Tail Snip, Mango Rain), MEC-008 (checkpoint start).

## 2. Player-facing summary
- Steer with swipes, D-pad or keys; up to 3 turns are buffered; no instant reverse (unchanged from P0).
- Each mango makes the snake 1 segment longer.
- When the level bar fills, the snake pops back to 4 segments, keeping its head where it is ("Fresh start!").
- Hitting the board edge, your own body or a solid obstacle ends the run.
- Tail Snip (a skill) can cut the snake down, but never below 3 segments.

## 3. State & data
Core state (`src/core/snake.ts`), extending P0:
| Field | Type | Meaning |
|---|---|---|
| `cells` | `Cell[]` | head first (P0) |
| `dir` | `Dir` | current direction (P0) |
| `queue` | `Dir[]` | buffered turns, max `snake.maxQueuedTurns` (P0) |
| `startLength` | number | `snake.start.length` (P1: 4) |
| `minLength` | number | absolute minimum length = `skills.tailSnip.minLength` (3, key owned by MEC-006; Tail Snip is the only operation that shortens the snake besides the reset) |

No save fields. Length is never persisted.

## 4. Rules
- **MEC-001-R1 Port.** Turn queue, step order, eating detection, tail-inclusion rule for self-collision, and cause order `wall → self → solid cell cause` are exactly P0 design §5 MEC-001.
- **MEC-001-R2 Start.** Every run (any start level, MEC-008) starts with cells (8,8), (7,8), (6,8), (5,8), direction right, empty queue. Start length = 4 (GDD §7).
- **MEC-001-R3 Growth.** Eating any mango (normal, golden, Mango Rain) grows the snake by exactly 1 segment (no tail pop that step). Golden grows +1, not +2 (GDD §5.2 "Golden mangoes still grow +1").
- **MEC-001-R4 Length reset.** In the snake step where an eaten mango makes `progress ≥ need` and the level is below 30 (MEC-003-R6), after growth, the snake keeps its first `startLength` cells (head and the 3 segments directly behind it, in order) and drops the rest. Head cell and `dir` are unchanged. The turn queue is unchanged.
- **MEC-001-R5 Reset order.** Within that step the order is: move head → eat (score, growth, progress) → length reset (R4) → MEC-003 level-up sequence → MEC-002 places the next mango. Dropped cells are free for that placement.
- **MEC-001-R6 Reset never grows.** A level up only happens on an eating step, and eating grows first, so the length before reset is always ≥ `minLength + 1` = 4 = `startLength`. To keep this true for any tuning, `parseBalance` requires `snake.start.length ≤ skills.tailSnip.minLength + 1`.
- **MEC-001-R7 Minimum length.** No operation may leave the snake shorter than `minLength` (3). The core exposes `cutTail(keep)` which sets length to `max(minLength, keep)` and returns the removed cells (tail end first). If the length is already ≤ `minLength`, it removes nothing and returns `[]`.
- **MEC-001-R8 Below start length is allowed.** After a Tail Snip the snake may be shorter than `startLength` (3 segments). It grows normally from there; the next level up resets it to `startLength` per R4 (R6 guarantees it is ≥ 4 at that moment).
- **MEC-001-R9 Level up does not stop the snake.** The snake keeps stepping through a level up; the tick accumulator is not reset (MEC-006-R18 clamps it when the effective tick changes). `turn()` calls are queued with the R1 rules (max 3, no reverse, no repeat).
- **MEC-001-R10 No board-full win.** If MEC-002 cannot place a mango, the run does **not** end; the snake keeps moving and MEC-002-R9 retries the placement (retry timing and the `mangoDeferred` event are MEC-002's). P0's `boardFull` event and its `won` outcome are removed; the only run win is the level-30 clear (MEC-003-R6, GDD §4).
- **MEC-001-R11 Death.** On death: status `over`, outcome `{won: false, cause}`, emit `died` (P0). Nothing moves afterwards.

## 5. Edge cases
1. **Golden mango fills the bar with 1 to spare** (progress `need − 1` + 2): growth +1, progress overflow 1 carries into the new level (MEC-003-R5), length resets to 4. The overflow does not add length.
2. **Turns buffered just before the level-up step:** the queue survives the reset; the first queued turn is used on the next step (R9).
3. **Level-up step with the mango on the cell the tail is leaving:** impossible, the mango is never placed on a snake cell (MEC-002). Self-collision on the level-up step is checked before the reset, with the P0 eating rule (tail included); the reset never saves the snake from a collision in the same step.
4. **Tail Snip at length 3:** `cutTail` would remove nothing (R7); MEC-006-R20 rejects the cast as `noTarget` with no energy spent.
5. **Tail Snip at length 4:** keep is clamped to 3; exactly one segment is removed (also MEC-006-R21).
6. **Level up while a Tail Snip wall exists:** the wall survives and ends by its own lifetime (MEC-003-R8).
7. **Level-30 clear:** no reset (R4 excludes L30); the run ends as a win with the snake frozen at its current length.
8. **No free cell for the mango** (R10): the snake keeps moving; nothing grows; MEC-004 director does not spawn while the mango slot is empty (MEC-003-R13).
9. **Mango Rain mango eaten on the level-up step:** same as any mango; reset applies after its growth.
10. **Checkpoint start (MEC-008):** identical start cells and length; the speed ramp changes only the tick.

## 6. Interactions with other mechanics
- **MEC-002 Mango:** eating detection and next-mango placement order per R5; golden mango grows +1 (R3); placement failure: R10 here (no win), retry in MEC-002-R9.
- **MEC-003 Levels:** triggers the reset (R4); the snake keeps stepping through a level up (R9); L30 clear ends the run (no reset).
- **MEC-004 Obstacles:** solid cells cause death with P0 cause order; fairness rules use `cells` (head, front lane, body).
- **MEC-006 Energy/skills:** Tail Snip owns its cost, the keep formula (MEC-006-R21), the `noTarget` rejection at length ≤ 3 (MEC-006-R20) and its temporary wall; it calls `cutTail(keep)`, which enforces R7. Mango Rain growth follows R3. Slow-mo changes only the tick (MEC-003/MEC-008), not this spec.
- **MEC-007 Loadout:** no interaction.
- **MEC-008 Checkpoints:** start state R2 for every start level.

## 7. Core API changes
- `SimSnapshot` adds `length: number` (= `snake.length`, convenience for HUD/tests) and `minLength: number`.
- `SimEvent` adds `shrunk {from: number, to: number, removed: Cell[]}`, emitted only on the length reset (R4), before `levelUp`. A Tail Snip cut is reported by MEC-006's `tailSnipped` event instead (no duplicate event).
- `SimEvent` removes `boardFull`; `outcome.won = true` only from MEC-003-R6. (`mangoDeferred` is defined by MEC-002 §7.)
- Internal (not public): `cutTail(keep: number): Cell[]` in `snake.ts`, used by MEC-006.
- `createSim` options: none owned by MEC-001 (`SimOptions` is defined once, in MEC-003 §7).

## 8. Feedback in P1 (greybox)
- Length reset: the dropped segments fade out over 250 ms (game layer, cosmetic) while the level-up banner shows `banner.freshStart` = "Fresh start!" under `banner.levelUp` (MEC-003 §8).
- Sound: reuse P0 `level` arpeggio for the reset (no new sound).
- `mangoDeferred` feedback: MEC-002 §8.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `snake.start` | `[[8,8],[7,8],[6,8],[5,8]]` | GDD §7 start length 4; layout extends P0 start one cell left (lead decision L1) |
| `snake.startDir` | `[1,0]` | P0 |
| `snake.maxQueuedTurns` | 3 | GDD §3 / P0 |
Read, owned elsewhere: `skills.tailSnip.minLength` (3, MEC-006 §9); `mango.placeRetryMs` (250, MEC-002 §9).
`startLength` is derived from `snake.start.length` (no separate key, one source of truth).

## 10. Acceptance tests
- `MEC-001-R1 turn queue keeps P0 rules (max 3, no reverse, no repeat)`
- `MEC-001-R2 every run starts with 4 cells at (8,8)..(5,8) facing right`
- `MEC-001-R2 checkpoint start at L12 uses the same 4 start cells`
- `MEC-001-R3 golden mango grows exactly 1 segment`
- `MEC-001-R4 level up keeps head and 3 following cells and direction`
- `MEC-001-R4 length 9 before level up becomes 4 after`
- `MEC-001-R5 next mango may be placed on a cell freed by the reset`
- `MEC-001-R6 parseBalance rejects start.length greater than minLength + 1`
- `MEC-001-R7 cutTail never leaves fewer than 3 cells`
- `MEC-001-R7 cutTail at length 3 returns an empty array`
- `MEC-001-R8 snake at length 3 grows and resets to 4 on next level up`
- `MEC-001-R9 the snake keeps stepping through a level up and applies a queued turn on its next step`
- `MEC-001-R10 failed mango placement does not end the run and the snake keeps moving`
- `MEC-001-R10 boardFull event and won outcome never occur before the L30 clear`
- `MEC-001-R11 snake never moves after died` (P0 fuzz invariant kept)
- `MEC-001-EC1 golden overflow carries progress but not length`

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Start layout `(8,8)…(5,8)`: extends P0's start one cell toward the tail, so the head position, direction and front lane (8 free cells to the right) stay as in P0.
- **L2** Reset keeps the head plus the 3 segments behind it (not a straight line): no teleporting segments, so the shrink reads as a "pop" and cannot place body cells on hazards.
- **L3** Board full is no longer a win; placement retries every 250 ms (MEC-002-R9): GDD §4 defines the only run win as clearing L30, and with the length reset a full board can only come from hazards, which must not pay out as a win.
- **L4** Tail Snip conflict (min length 3 < start length 4) resolved by allowing lengths below start (R8) and proving the reset never has to grow the snake (R6); the minimum stays 3 as in GDD §6.3, so no GDD rule changes. Snip at length 4 removes only 1 cell (a weak but legal use); at length 3 MEC-006 rejects it.
- **L5** Golden overflow progress carries over but its growth is absorbed by the reset: matches P0 overflow and GDD "reset to start length".
- Lead review 2026-11-03: L1–L5 accepted (board full is not a win; retry every 250 ms).
### Escalate to owner
- None.
