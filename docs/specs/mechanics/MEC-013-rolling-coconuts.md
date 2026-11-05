# MEC-013 — Rolling coconuts

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2b · Date: 2026-11-05

## 1. Purpose & links
- Defines the **rolling coconut** family: a full row or column is highlighted, then a coconut rolls across it one cell at a time. Only the head can be hit.
- GDD: §5.1 (biome 4), §5.3 (fairness), §5.4 row "Rolling coconuts", §6.3 (Shield, Slow-mo), §7.
- Framework: MEC-004 (registry R1–R3, Mover block R5, collision R6/R8, fairness R11–R14, level up R16 flow B, verification R17–R18). Design: P2 design §5, §8, §9, §10, §11. Plan: `docs/superpowers/plans/2026-11-04-p2b-movers-cycles-blasts.md` Tasks 3, 4 (TR-B3, TR-B4).
- Related: MEC-002 (mango), MEC-003 (table, introduction), MEC-006 (Shield break, rubble, bonk).

## 2. Player-facing summary
- **From level 16:** a row or column lights up with arrows for 1.5 s, then a coconut rolls fast along it from one edge to the other.
- The lane is never your head's row or column and never the cells right in front of you.
- A coconut that reaches your body or any obstacle shatters harmlessly. Only your head gets hit. A Shield breaks the coconut.
- Coconuts roll over mangoes and orbs without touching them.

## 3. State & data
`SimState.families.coconut` (JSON): `{ rolls: Roll[]; nextId: number }`.
`Roll = { id, lane: 'row' | 'col', index, mover: MoverState }` (`MoverState` = MEC-004 Mover block, plan Task 3: `path`, `pos` (-1 while warning), `t`, `warnMs`, `cellMs`, `state: 'warn' | 'move' | 'done'`).
Descriptor: `{key: 'coconut', cause: 'coconut', capClass: 'small', maxActiveKey: 'coconut.maxActive', breakable: true}`; `emitsIncoming` unset (the director emits `hazardIncoming`, see §11 L5).
Save fields: none.

## 4. Rules
- **MEC-013-R1 Lane choice.** `laneCandidates(s, b)` lists, in deterministic order rows 0…ROWS−1 then cols 0…COLS−1, each lane twice (`from: 'start'` then `'end'`), excluding: the head's row and column, every lane that contains a front-lane cell (`frontLane(head, dir, fairness.frontLaneCells)`), and lanes already rolling. Spawn draws up to `coconut.tries` lanes with `rng.int(remaining)` (without replacement); the first lane whose cells pass `candidateValid` (in bounds, not `reserved`, MEC-004-R11 with the lane exemption of TR-B3, no new BFS walls for R12) is used. The path is the lane's cells ordered from `from`.
- **MEC-013-R2 Telegraph.** The whole lane is shown with the roll direction for `coconut.warnMs` (1500 ≥ MEC-004-R13) before the coconut enters the first cell. Lane cells are `reserved` while warning and rolling (no mango, orb, rubble or other hazard is placed on them).
- **MEC-013-R3 Roll.** After the warning the coconut enters cell 0, then advances one cell per `coconut.cellMs` (90 ms, sim time: Slow-mo does not slow it, P2 design §9). After the last cell the roll ends and is removed. The coconut is not solid and not a BFS wall.
- **MEC-013-R4 Shatter.** If the next cell is solid (`solidCauseAt ≠ null`) or holds a body cell (snake index > 0), the coconut does not enter it: the roll ends and is removed (Mover `stop` mode). It never damages the body.
- **MEC-013-R5 Head hit / Shield.** The coconut moving onto the head calls `ctx.hitHead('coconut', x, y, 'mover', moverDir)`; the head moving onto a rolling coconut is a `headHit = 'mover'` (MEC-004-R6). Without Shield: death, cause `coconut`. With Shield: Shield is consumed, the coconut is removed (`onBreak`), bonk and rubble follow MEC-006-R26..R28.
- **MEC-013-R6 Cap.** Small-cap family, at most `coconut.maxActive` (2) rolls at once, at most one roll per lane (R1).
- **MEC-013-R7 Mangoes and orbs.** A coconut passes over a mango, golden mango, orb or rain mango without changing it. (Placement never puts a new one on a lane cell, R2.)
- **MEC-013-R8 Introduction.** `level.table` rows L16…30 get `coconut: 2` (the 16–25 row is split into 16–20 and 21–25). Coconut is introduced at L16 (MEC-003-R16).
- **Level up (MEC-004-R16, flow B).** No level-end hook: a warning or rolling coconut keeps its lifecycle through a level up and can still hit.

## 5. Edge cases
1. **Coconut lane crosses an existing mango:** allowed; an existing mango may lie on a lane and the roll leaves it unchanged (R7). No new mango is placed on a lane cell while the lane is reserved (R2).
2. **Snake turns into the lane during the warning:** allowed; the lane was fair at spawn. If the head is on the lane when the coconut arrives, the head is hit.
3. **Body crosses the lane:** the coconut shatters at the body (R4).
4. **Head moves onto the coconut's current cell:** `headHit` → death `coconut` or Shield break.
5. **A hazard becomes solid on a lane cell after spawn:** impossible for placed hazards (lane reserved); rubble from a Shield break may land on a lane only if not reserved, so it cannot either. A solid cell present for any other reason stops the coconut (R4).
6. **Level up during a roll:** the roll continues (flow B).
7. **Slow-mo:** the coconut still moves every 90 ms; the snake moves slower, so the player has more steps of reaction per coconut cell.

## 6. Interactions with other mechanics
- **MEC-002:** lanes reserved for placement; mango untouched by the roll.
- **MEC-003:** table rows and introduction (R8).
- **MEC-004:** Mover block, small cap, collision R6/R8, fairness (TR-B3 lane exemption for rule 2; rule 3 trivially holds, coconuts add no BFS walls), verification (TR-B4 mover invariants).
- **MEC-006:** Shield break with bonk and rubble; Slow-mo does not slow coconuts.

## 7. Core API changes
- `FamilyKey` and `CauseKey` add `coconut`. Event `moverHit {family: 'coconut', x, y}` (TR-B8).
- Modules: `src/core/hazards/blocks/mover.ts`, `src/core/hazards/coconut.ts` (`coconut`, `laneCandidates`), each main function with `// MEC-013-Rn`.
- Snapshot: `families.coconut = {path, cell, state, t, warnMs}[]`.

## 8. Feedback (greybox)
- Warning: lane highlight with arrows in roll direction, blinking 250 ms (reduced motion: solid outline). Rolling: brown circle. Text keys `banner.new.coconut`, `death.coconut` (strings provisional, OQ-B6, owner review at end of P2).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `coconut.warnMs` | 1500 | P2 design §10 |
| `coconut.cellMs` | 90 | P2 design §10 |
| `coconut.maxActive` | 2 | P2 design §10 |
| `coconut.tries` | 20 | lead (plan Task 4) |
| `level.table` weight `coconut` | 2 on L16…30 | P2 design §11 |
`parseBalance` checks: `warnMs ≥ 900` (MEC-004-R13), positive integers.

## 10. Acceptance tests
- `MEC-004-R5 mover warns for warnMs before the first cell`
- `MEC-004-R5 mover advances one cell per cellMs and ends after the last cell`
- `MEC-004-R5 stop mode ends on a body cell, wait mode waits for it`
- `MEC-004-R8 entering the head cell reports enter-head`
- `MEC-004-R5 moverDir points along the path`
- `MEC-013-R1 lanes exclude the head row/column and any lane with a front-lane cell`
- `MEC-013-R2 lane cells are reserved while warning and rolling`
- `MEC-013-R3 coconut rolls one cell per 90 ms after a 1500 ms warning and kills the head`
- `MEC-013-R4 coconut shatters on a body cell and on a solid cell`
- `MEC-013-R5 shield breaks a coconut that rolls into the head`
- `MEC-013-R6 one coconut per lane and at most coconut.maxActive`
- `MEC-013-R7 a coconut passes over the mango and orbs without changing them`
- `MEC-013-R8 coconut is introduced at L16 only`
- Fuzz (MEC-004-R17/R18): solo `coconut: 16` and full table; mover I1 = never enters a body cell, I3 = path shown ≥ `warnMs` before the first move (TR-B4).

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Lane exemption from rule 2 (TR-B3): the lane only has to avoid the head row/column and the front lane.
- **L2** Shatter uses Mover `stop` mode; the coconut never waits.
- **L3** Coconut timers run in sim time; Slow-mo does not slow them (P2 design §9).
- **L4** Flow B: no level-end hook (TR-B1).
- **L5** The director emits `hazardIncoming`; the family does not emit it itself (avoids a duplicate event; DECISIONS 2026-11-05 P2b Task 1).
### Escalate to owner
- Player-facing strings (OQ-B6): provisional, owner review at end of P2.
