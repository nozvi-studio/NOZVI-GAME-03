# MEC-014 — Gates and spike traps

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2b · Date: 2026-11-05

## 1. Purpose & links
- Defines two cycle families: **gate** (a fence line or U whose middle/mouth cells open and close on a rhythm) and **spike** (small groups of cells that pop up on one global beat).
- GDD: §5.1 (biome 4), §5.3, §5.4 rows "Fences, complex" and "Spike traps", §6.3, §7.
- Framework: MEC-004 (registry, TimedCells and CycleCells blocks R5, collision R6, fairness R11–R14, flow B R16, verification R17–R18). Design: P2 design §5, §8, §9, §10, §11. Plan Tasks 5, 6 (TR-B5).
- Related: P0 fence shapes and terrain cycle (MEC-004 terrain), MEC-006 (Shield).

## 2. Player-facing summary
- **Gates (from level 17):** a fence appears with one or two gate cells in it. The gates stay open, blink for a moment, then close for a shorter time, and open again. A gate never closes on your snake: it waits until you are through.
- **Spikes (from level 18):** small spike spots appear on the floor. All spikes on the board pop up together on one beat, after a short blinking warning. A spike never pops up under your snake.
- A Shield breaks one closed gate cell or one raised spike for good.

## 3. State & data
`SimState.families.gate = { gates: GateInstance[]; nextId }`; `GateInstance = { id, t, lifeMs, fence: TimedCell[], gate: CycleCell[], state: 'warn' | 'live' | 'crumble' }`.
`SimState.families.spike = { groups: { id, t, lifeMs, cells: CycleCell[], ending: boolean }[]; nextId }`.
`CycleCell = { x, y, delay, up, vis: 'down' | 'warn' | 'up' }`; `CyclePhases = { downMs, warnMs, upMs }` (block `blocks/cycleCells.ts`).
Descriptors: gate `{cause: 'gate', capClass: 'small', maxActiveKey: 'gate.maxActive', breakable: true}` plus `causeAt` (per-cell cause, TR-B5); spike `{cause: 'spike', capClass: 'small', maxActiveKey: 'spike.maxActive', breakable: true}`.
Save fields: none.

## 4. Rules
### Gate
- **MEC-014-R1 Gate shape.** Shape from `gate.shapePool` (`rng.pick`): `line` of length in `gate.lineLen` (5…7) with 1–2 middle cells as gate cells, or the P0 `U` (3 × 3 opening) with its 1–2 mouth cells as gate cells; transformed and placed with origin tries like P0 fences, up to `gate.tries`. Valid per `candidateValid` with d = `fairness.nearHeadDist` and `wallCells` = fence cells only.
- **MEC-014-R2 Gate cycle.** Lifecycle: `warn` for `gate.landWarnMs` (1500; fence cells warn, gate cells shown open) → `live` for `lifeMs = gate.lifeMs + rng.next() × gate.lifeRandMs` → `crumble` for `hazard.crumbleMs` → removed. In `live`, gate cells cycle with `CyclePhases = {downMs: gate.openMs, warnMs: gate.warnMs, upMs: gate.closedMs}` ("down" = open), time `t − landWarnMs − delay`. `closedMs < openMs` (checked by `parseBalance`). **Provisional default (OQ-B1): open 2400 ms, warn 900 ms, closed 1500 ms, life 14000 + rand 4000 ms — provisional, owner review at end of P2.**
- **MEC-014-R3 Gate waits for snake.** A gate cell turns `up` (closed) only when no snake cell is on it; until then it stays `warn`. Fence cells turn solid only when free (TimedCells rule).
- **MEC-014-R4 Gate BFS / reserved.** Fence cells: cause `fence` (via `causeAt`), BFS walls in every state. Closed gate cells: solid, cause `gate`, never BFS walls. All gate-instance cells are `reserved` in every state. `solidCauseAt` and the collision death cause prefer `causeAt` over `cause` when present (§11 L4).
### Spike
- **MEC-014-R5 Spike shape.** Group shape from `spike.shapePool` (`single`, `pairH`, `pairV`), placed like mud (MEC-012-R1 RNG order) with `candidateValid` d = `fairness.nearHeadDist`, `wallCells: []` (spikes are not BFS walls). Life `spike.lifeMs + rng.next() × spike.lifeRandMs`.
- **MEC-014-R6 Global beat.** Every spike uses `cyclePhase({downMs, warnMs, upMs}, s.levelTimeMs)` (delay 0), so all groups rise together. A new group stays `down` until it has been shown for `spike.showMs` (1500 ≥ MEC-004-R13), even if the beat says `up`. After `lifeMs` the group is `ending` and is removed at the first beat `down`, never mid-`up`. `levelTimeMs` restarts at a level up; a group alive across it follows the new beat from 0 (which is `down`), so nothing pops up without warning. **Provisional default (OQ-B2): down 1800, warn 900, up 900 (beat 3600 ms), life 12000 + rand 4000 ms — provisional, owner review at end of P2.**
- **MEC-014-R7 Spike waits.** A spike cell turns `up` only when no snake cell is on it; until then it stays `warn`. Up spikes are solid (cause `spike`), not BFS walls; all group cells are `reserved`.
### Both
- **MEC-014-R8 Shield.** The head entering a closed gate cell, a solid fence cell or an up spike with Shield breaks that one cell (`onBreak`): it stays removed for the rest of its instance's life. Bonk and rubble per MEC-006-R26..R28.
- **MEC-014-R9 Introductions.** `level.table` rows L17…30 get `gate: 2`; L18…30 get `spike: 2`. Gate is introduced at L17, spike at L18.
- **MEC-014-R10 U-trap escape.** A gate spawn must never remove the last escape: rule 3 (MEC-004-R12) counts fence cells as walls, and the per-family escape check (MEC-004-R18) treats closed gate cells as timed solids, so `escapeExists(before) ⇒ escapeExists(after)` holds for U-trap gates.
- **Level up (flow B).** No level-end hook; instances keep their lifecycle.

## 5. Edge cases
1. **Snake parked in a gate cell:** the gate stays `warn` until the snake leaves (R3), then closes for its remaining `up` time.
2. **Gate cell broken by Shield:** that gap stays open for the rest of the gate's life.
3. **U mouth closed with the head inside the U:** the mouth reopens after `closedMs`; escape check (R10) guarantees a timeline exit.
4. **Spike group spawned during an `up` beat:** stays down until `showMs` passed and then follows the beat (R6).
5. **Level up during a spike `up` phase:** the new beat starts at `down`; raised spikes drop (no danger appears without warning).
6. **Slow-mo:** cycles run in sim time; fewer snake steps fit in a phase.

## 6. Interactions with other mechanics
- **MEC-003:** table and introductions (R9); `levelTimeMs` drives the spike beat.
- **MEC-004:** CycleCells block (terrain refactor keeps the P0 sequence), `causeAt` (TR-B5), rule 3 and escape check (R10).
- **MEC-006:** Shield break of one cell; Slow-mo does not slow cycles (MEC-006 R24 note, design §20 item 10).

## 7. Core API changes
- `FamilyKey` adds `gate | spike`; `CauseKey` adds `gate | spike`. Optional `HazardFamily.causeAt?(s, x, y): CauseKey | null` (TR-B5).
- Modules: `src/core/hazards/blocks/cycleCells.ts` (`cyclePhase`, `stepCycleCell`), `src/core/hazards/gate.ts`, `src/core/hazards/spike.ts`; `terrain.ts` uses the block.

## 8. Feedback (greybox)
- Gate: fence cells as P0 fence; open = dashed bar, warn = blinking bar + lock icon, closed = solid bar. Spike: down = small dots, warn = blinking triangles, up = solid triangles. Reduced motion: no blink, solid outline. Text keys `banner.new.gate`, `banner.new.spike`, `death.gate`, `death.spike` (OQ-B6, provisional, owner review at end of P2).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `gate.landWarnMs` | 1500 | lead |
| `gate.openMs` / `warnMs` / `closedMs` | 2400 / 900 / 1500 | OQ-B1 provisional |
| `gate.lifeMs` / `lifeRandMs` | 14000 / 4000 | OQ-B1 provisional |
| `gate.maxActive` / `tries` | 1 / 40 | lead |
| `gate.lineLen` / `shapePool` | `[5, 7]` / `["line", "U"]` | P2 design §10 |
| `spike.downMs` / `warnMs` / `upMs` | 1800 / 900 / 900 | OQ-B2 provisional |
| `spike.showMs` | 1500 | lead (rule 1) |
| `spike.lifeMs` / `lifeRandMs` | 12000 / 4000 | OQ-B2 provisional |
| `spike.maxActive` / `tries` | 2 / 40 | lead |
| `spike.shapePool` / `shapes` | `["single","pairH","pairV"]` / single `[[0,0]]` · pairH `[[0,0],[1,0]]` · pairV `[[0,0],[0,1]]` | P2 design §10 |
| table weights | `gate: 2` L17…30, `spike: 2` L18…30 | P2 design §11 |
`parseBalance`: `gate.warnMs`, `gate.landWarnMs`, `spike.warnMs`, `spike.showMs` ≥ 900; `gate.closedMs < gate.openMs`.

## 10. Acceptance tests
- `MEC-004-R5 cyclePhase walks down warn up and repeats`
- `MEC-004-R5 a cycle cell under the snake stays warn until the snake leaves`
- `MEC-004-R5 terrain keeps its P0 sequence after moving to CycleCells`
- `MEC-004-R3 solidCauseAt prefers a family causeAt over its cause`
- `MEC-014-R1 gate spawn makes a line of 5-7 or a U with 1-2 gate cells`
- `MEC-014-R2 gate cells close for closedMs and open for openMs with a 900 ms warning`
- `MEC-014-R3 a gate cell under the snake keeps warning and closes after the snake leaves`
- `MEC-014-R4 fence cells are BFS walls with cause fence; a closed gate cell has cause gate and is no BFS wall`
- `MEC-014-R6 all spike groups pop up on the same global beat`
- `MEC-014-R6 a new group stays down until it was shown for showMs`
- `MEC-014-R6 a group ends on a down phase after its life`
- `MEC-014-R7 a spike under the snake keeps warning until the snake leaves`
- `MEC-014-R8 shield breaks one closed gate cell for the rest of the gate's life`
- `MEC-014-R8 shield breaks one up spike for the rest of the group's life`
- `MEC-014-R9 gate is introduced at L17 only`
- `MEC-014-R9 spike is introduced at L18 only`
- `MEC-014-R10 a gate spawn never removes the last escape (U trap)`
- Fuzz (MEC-004-R17/R18): solo `gate: 17`, `spike: 18` and full table.

## 11. Lead decisions & escalations
### Lead decisions
- **L1** One family `gate` owns fence and gate cells (TR-B5).
- **L2** Spikes share one global beat from `levelTimeMs`; new groups wait `showMs` before rising.
- **L3** Closed gate cells and up spikes are not BFS walls (they reopen); the escape check covers timing.
- **L4** `causeAt` is preferred over `cause` in `solidCauseAt` **and** in the collision death cause / `died.cause` (`resolveHeadCell`, `applyHeadHit`), so a fence-cell death reports `fence` (DECISIONS 2026-11-05 P2b Task 1).
- **L5** The director emits `hazardIncoming`; families do not emit it themselves.
### Escalate to owner
- OQ-B1 gate rhythm and OQ-B2 spike beat: provisional, owner review at end of P2.
- OQ-B6 strings: provisional, owner review at end of P2.
