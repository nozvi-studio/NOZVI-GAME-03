# MEC-018 — Shrinking board

> Status: Approved (lead, delegated by owner 2026-11-03); OQ-C1 numbers provisional until the owner confirms · Phase: P2c · Date: 2026-11-05

## 1. Purpose & links
- Defines the shrinking board: the outer ring of the 17 x 17 board warns, closes for a while, then reopens. It is the biome 6 big event (from level 27).
- GDD: §5.1 (biome 6), §5.3 (fairness), §5.4 (catalogue, "Never use" list). Framework: MEC-004 (registry, `big` class R9, collision R6, fairness R11-R14, death context R15, level up R16). Design: P2 design §7, §10, §11, §12; plan P2c TR-C1..TR-C4.
- Related: MEC-002 (mango placement, displacement), MEC-003 (table, introduction R16, level up R8), MEC-006 (orbs, rain, Shield), MEC-012 (TimedCells rule, crumble), MEC-013 (coconut), MEC-015 (NPC routes).

## 2. Player-facing summary
- **From level 27:** the edge of the board flashes for 2 seconds, then the whole outer ring turns solid for about 6 seconds and opens again. The playable area is the inner 15 x 15.
- A ring cell never closes on your body or right in front of your head: it keeps flashing until you are clear. The ring never starts while a coconut is rolling or a cat/chicken route touches the edge.
- A mango on the edge is moved inward when the flashing starts (new timer, no rock). Orbs and rain mangoes on the edge just vanish.
- Touching a closed ring cell kills you (Shield does not help).

## 3. State & data
`SimState.families.shrink` (JSON, MEC-004 §3):
| Field | Type | Meaning |
|---|---|---|
| `active` | `ShrinkRing \| null` | the one ring instance, or none |
| `cooldownMs` | number | ms until a new ring may start (R10) |
`ShrinkRing = {state: 'warn' | 'closed' | 'fade', t, warnMs, closedMs, cells: {x, y, on}[]}`. `t` = ms since the warn start (until `fade`), then ms in `fade`. `on` = the cell is closed (solid).
Descriptor: `{cause: 'shrink', capClass: 'big', maxActiveKey: null (1), breakable: false}`.
Save fields: none.

## 4. Rules
- **MEC-018-R1 Start conditions.** `spawn` returns `null` (no state change) when any holds: `cooldownMs > 0`; a ring is active; a coconut is rolling or in warn (MEC-013); any NPC route cell (MEC-015) is on the ring; the ring cannot keep the regular mango reachable (R6, TR-C4). Otherwise it creates the ring (state `warn`, `t = 0`, all `on = false`), displaces/removes objects (R6, R7) and emits `hazardIncoming {family: 'shrink'}`. The director retries other options when `spawn` returns `null` (MEC-004-R9/R10).
- **MEC-018-R2 Ring and warn.** Ring cells = every cell with `x = 0`, `y = 0`, `x = 16` or `y = 16`: 64 cells on a 17 x 17 board. The ring warns for `shrink.warnMs` = 2000 (>= the MEC-004-R13 bound of 900; `parseBalance` checks it). The whole ring is shown as warning from `t = 0`.
- **MEC-018-R3 Close rule (TR-C3).** From `t >= warnMs`, a ring cell turns `on` at the first ms when no snake cell is on it and it is not `nearHead(x, y, fairness.nearHeadDist)` (MEC-004-R11). Until then it stays in warn (the P2 design §7 exemption: the cell waits instead of being excluded). A cell never turns `on` under the snake or within the near-head area; a closed cell stays closed.
- **MEC-018-R4 Closed time.** All cells share one deadline: the ring reopens at `t = warnMs + closedMs` (`shrink.closedMs` = 6000). A late-closing cell is therefore closed for less time, never longer.
- **MEC-018-R5 Reopen via crumble.** At `t = warnMs + closedMs` every cell turns `on = false` and state becomes `fade` for `hazard.crumbleMs` (450, as MEC-012-R2), then the ring is removed and `cooldownMs` starts (R10). Timers run in sim time (Slow-mo does not slow them, MEC-006-R19) and keep running through a level up (TR-C1, MEC-003-R8): there is no level-end hook (MEC-004-R16), so a closed ring survives a level up and reopens by its own lifecycle.
- **MEC-018-R6 Mango displacement.** At the warn start, a regular mango (including golden) on a ring cell is placed again by the normal MEC-002 placement with the ring reserved: fresh timer (`leftMs = totalMs`), no rotten rock. Event `mangoDisplaced {from, to}`. Rule 3 (MEC-004-R12): after the displacement `keepsMangoReachable(s, ring)` must hold, else `spawn` returns `null` and the state is unchanged (TR-C4). The ring is a BFS wall in every state.
- **MEC-018-R7 Orb and rain removal.** Energy orbs and rain mangoes on a ring cell at the warn start are removed (event `displaced`); energy and counters are unchanged. While the ring is active (warn, closed, fade) no mango, orb, rain mango, rubble or other hazard is placed on a ring cell (ring cells are `reserved` in every state).
- **MEC-018-R8 Cause `shrink`, not breakable.** A closed ring cell is solid with `cause = 'shrink'`. Head into it is death `shrink`; Shield does not break it (`resolveHeadCell` returns death, Shield stays set). Warn and fade cells are not solid. A snake body on a warn cell is never harmed (the cell does not close under it, R3).
- **MEC-018-R9 Big exclusivity.** `capClass: 'big'`: not offered while maze or terrain is active, and maze/terrain are not offered while a ring is active (including its fade). Max 1 ring (TR-C2). It does not count toward the small cap.
- **MEC-018-R10 Cooldown.** After the ring is removed, `cooldownMs = shrink.cooldownMs` (20000, provisional, OQ-C1); `spawn` returns `null` until it reaches 0. The cooldown ticks in sim time every step (like `maze.cooldownMs`) and is not reset by a level up.
- **MEC-018-R11 Introduction.** Shrink is introduced at L27 only (MEC-003-R16: L26 maze, L27 shrink). `level.table` rows L27..30 carry `shrink: 2` (provisional, OQ-C1); L30 "Final storm" keeps weight 2 too. Banner `banner.new.shrink` and death text `death.shrink` (section 8).

## 5. Edge cases
1. **Snake lies along the edge when the warn ends:** only the cells outside the body and near-head area close; the rest keep warning until the snake leaves them (R3). A ring with open cells has a gap, which is intended.
2. **Snake still on the ring at the reopen time:** its cells never closed; R4/R5 apply to closed cells only.
3. **Head steps onto a warn cell:** safe; the cell then cannot close while the body is on it.
4. **Level up while closed:** the ring survives and reopens on its own timer (R5); the next mango is placed off the ring (reserved).
5. **Mango thief bird (MEC-016) targets a mango on the ring:** the displacement at the warn start happens first; the bird re-evaluates the new mango.
6. **Another hazard solid already on a ring cell at the start:** the ring still starts; that cell is solid with its own cause until it ends (the ring does not replace it).
7. **No reachable mango before the start:** MEC-004-R12 does not reject (the mango was already unreachable).
8. **Terrain or maze already active at the offer time:** R9, never offered.
9. **Slow-mo and Shield:** no interaction; Slow-mo does not slow the lifecycle.

## 6. Interactions with other mechanics
- **MEC-002:** the mango is displaced and the ring is `reserved` (MEC-004-R3); mango placement and the fair-rock check treat the ring as BFS wall.
- **MEC-003:** table rows and introduction (R11); level up keeps the ring (R5); challenge row L30 includes shrink with weight 2.
- **MEC-004:** big cap (R9), fairness exemption for ring cells (R3 close rule, MEC-004-R11), reachability (R6), no death context for shrink, verification layers.
- **MEC-006:** orbs and rain mangoes are removed from the ring (R7); Shield is not consumed by shrink (R8).
- **MEC-013 / MEC-015:** start conditions (R1).
- **MEC-016:** bird re-targets the displaced mango.

## 7. Core API changes
- `FamilyKey` adds `shrink`; `CauseKey` adds `shrink`. `SimEvent` adds `mangoDisplaced {from: {x, y}, to: {x, y}}`; `displaced` (orb/rain removal) is emitted per object.
- `SimSnapshot` adds `shrink: {state: 'warn' | 'closed' | 'fade', leftMs, cells: {x, y, on}[]} | null`.
- `ringCells(cols, rows)` exported from `src/core/hazards/shrink.ts`; the family lives there with `// MEC-018-Rn` at each main function; registry order puts `shrink` last.

## 8. Feedback (greybox)
- Warn: the ring cells flash (dashed outline blink, not color only) with a small inward arrow in the corners; closed: solid dark-red wall with a diagonal hatch; fade: crumble like a rock. Reduced motion: no blink, static dashed outline.
- Text keys: `banner.new.shrink` "The board shrinks! The edge closes for a while.", `death.shrink` "You hit the closed edge." (MEC-004 §8).
- Sounds: reuse P0 `land` when the ring closes; no new assets.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `shrink.warnMs` | 2000 | P2 design §10 (>= 900, MEC-004-R13) |
| `shrink.closedMs` | 6000 | P2 design §10 |
| `shrink.cooldownMs` | 20000 | **provisional** (OQ-C1, owner to confirm; same role as `maze.cooldownMs`) |
| `level.table` `shrink` weight | 2 from L27 | **provisional** (OQ-C1); retuned in P2c Task 6 |
`parseBalance` checks: `warnMs >= 900`, `warnMs`, `closedMs`, `cooldownMs` positive integers, `shrink` weight only in rows with `from >= 27`.

## 10. Acceptance tests
- `MEC-018-R1 shrink does not start while a coconut rolls or an NPC route touches the ring`
- `MEC-018-R2 ring has 64 cells on a 17 x 17 board`
- `MEC-018-R3 ring cells close after 2000 ms except under the snake or near the head`
- `MEC-018-R5 all ring cells reopen at warn + closed and the family is removed after crumble`
- `MEC-018-R6 a mango on the ring is displaced off the ring with a fresh timer and no rock`
- `MEC-018-R7 orbs and rain mangoes on the ring are removed`
- `MEC-018-R8 shrink cells are not breakable`
- `MEC-018-R9 shrink is not offered while maze or terrain is active`
- `MEC-018-R10 shrink waits shrink.cooldownMs after it ends`
- `MEC-018-R11 shrink is introduced at L27 only`
- `MEC-018-R11 shrink has a banner and a death text`
- `MEC-003-R8 a closed ring survives a level up and reopens on its own timer`
- `MEC-018 fuzz: ring never closes on the snake or near the head; nothing collectible on an active ring` with invariants `MEC-018-I1` (a ring cell never closes on a snake cell or within `nearHead`), `MEC-018-I2` (no mango, orb or rain mango on a ring cell while active), `MEC-018-I3` (no cell closed after `warnMs + closedMs`), plus I1-I7 and the escape check solo and full table (MEC-004-R17/R18).

## 11. Lead decisions & escalations
### Lead decisions
- **L1** The ring cell waits instead of being excluded from near-head (TR-C3, P2 design §7): a hard exclusion would leave holes the player cannot see coming; waiting keeps the 2 s warning honest.
- **L2** No level-end hook: the ring outlives a level up (TR-C1); Flow B has no freeze or level-up crumble.
- **L3** Start conditions live in `spawn` (returns `null`), exclusivity in the director (TR-C2); the ring is a BFS wall in every state and rule 3 is checked after the mango displacement (TR-C4).
- **L4** One shared reopen deadline: late cells are closed for less time, never longer (TR-C3).
### Escalations (owner)
- **OQ-C1** Shrink frequency: provisional `cooldownMs` 20000 and weight 2 from L27; the owner confirms or changes after the P2c bot and playtest report.
