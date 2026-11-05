# MEC-016 — Mango-thief bird

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2b · Date: 2026-11-05

## 1. Purpose & links
- Defines the **bird** modifier family: a shadow appears on the regular mango; if the mango is not eaten before the shadow ends, the bird takes it and a new mango is placed elsewhere. Never lethal.
- GDD: §5.1 (biome 5), §5.4 row "Mango-thief bird", §7.
- Framework: MEC-004 (registry, `capClass: 'modifier'`, director R9, verification R17). Design: P2 design §8, §10, §11. Plan Task 8 (TR-B6).
- Related: MEC-002 (mango placement, rot timer, golden mango), MEC-003 (quota, deferred mango R13).

## 2. Player-facing summary
- **From level 22:** sometimes a bird's shadow appears on the mango and shrinks for 3 s. Eat the mango before it is gone or the bird takes it; a new mango appears elsewhere.
- The bird only comes when you can still make it in time. It never hurts you and never touches a golden mango.

## 3. State & data
`SimState.families.bird = { target: { x, y, leftMs } | null }`.
Descriptor: `{key: 'bird', cause: null, capClass: 'modifier', maxActiveKey: 'bird.maxActive', breakable: false}`; never solid, BFS wall, reserved or `headHit`. Save fields: none.

## 4. Rules
- **MEC-016-R1 Target condition.** `birdCanTarget(s, b)` is true only when: a mango exists, it is not golden, no target is set, a BFS path from head to mango exists, the sum of `baseTickMs(s, b)` along that path (scaled by the mud factor on mud path cells, §11 L3) plus `bird.marginMs ≤ bird.shadowMs`, and the mango's rot time left `> bird.shadowMs`. Otherwise `spawn` returns `null` and the director tries another option (TR-B6). **Provisional default (OQ-B5): the bird only spawns when the mango is reachable in time; no "impossible" shadow is ever shown — provisional, owner review at end of P2.**
- **MEC-016-R2 Shadow.** On spawn, `target = {x, y, leftMs: bird.shadowMs}` on the mango cell. `leftMs` counts down 1 per ms (sim time). The mango's own rot timer keeps running under the shadow.
- **MEC-016-R3 Steal.** When `leftMs` reaches 0 and the mango is still the target: emit `mangoStolen {x, y}`, clear the target, set `s.mango = null` and call `placeMango` (fresh rot timer). No rotten rock; eaten counters, quota progress, score and energy unchanged. If placement defers (MEC-003-R13), the deferred path applies unchanged. **Provisional default (OQ-B4): a stolen mango costs nothing besides the lost time — provisional, owner review at end of P2.**
- **MEC-016-R4 Leave on eat.** If the target mango is eaten, rots or otherwise changes (no mango or a mango at another cell), the target is cleared with no event.
- **MEC-016-R5 Never lethal.** `cause: null`; no cell is ever solid, BFS wall, reserved or a head hit because of the bird.
- **MEC-016-R6 Modifier cap.** `capClass: 'modifier'`: offered regardless of the small cap; at most `bird.maxActive` (1) target (`count` = 1 while a target is set).
- **MEC-016-R7 Introduction.** `level.table` rows L22…30 get `bird: 2`; bird is introduced at L22.
- **Level up (flow B).** No level-end hook; a target alive across a level up keeps running.

## 5. Edge cases
1. **Mango rots before the shadow ends:** impossible by R1 (rot time left > `shadowMs`).
2. **Golden mango appears:** golden mangoes are never targeted.
3. **Mango eaten on the last ms:** family updates run before snake movement in each ms, so the steal on the final shadow ms comes before that ms's move; an eat in any earlier ms wins and no steal follows (lead ruling 2026-11-05, DECISIONS).
4. **Slow-mo:** the shadow is sim time; R1 uses the base tick, so Slow-mo only makes it harder if the player chooses it.
5. **Board full at steal:** deferred mango placement (MEC-003-R13).

## 6. Interactions with other mechanics
- **MEC-002:** mango placement and rot timer unchanged; no rock from a steal.
- **MEC-003:** quota unchanged by a steal.
- **MEC-004:** `modifier` cap class; fuzz skips I1–I3/I5 for modifiers and adds the invariant "bird target was reachable in time at spawn".

## 7. Core API changes
- `FamilyKey` adds `bird`. Event `mangoStolen {x, y}` (TR-B8). Grid helper `bfsDistance(s, from, to): number | null` (added if missing). `placeMango` used from `mango.ts`.
- Module `src/core/hazards/bird.ts` (`bird`, `birdCanTarget`).

## 8. Feedback (greybox)
- Shadow ellipse on the target mango, shrinking with `leftMs / shadowMs`. Text keys `banner.new.bird`, `toast.mangoStolen` (OQ-B6, provisional, owner review at end of P2).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `bird.shadowMs` | 3000 | P2 design §10 |
| `bird.marginMs` | 600 | lead (plan Task 8) |
| `bird.maxActive` | 1 | P2 design §10 |
| table weight `bird` | 2 on L22…30 | P2 design §11 |

## 10. Acceptance tests
- `MEC-016-R1 bird targets only a regular mango reachable in time with enough rot time`
- `MEC-016-R2 rot timer keeps running under the shadow`
- `MEC-016-R3 an uneaten mango is taken at shadow end: no rock, counters unchanged, new mango placed`
- `MEC-016-R4 eating the target mango cancels the bird`
- `MEC-016-R5 bird never kills and is never solid`
- `MEC-016-R6 bird is outside the small cap, max 1`
- `MEC-016-R7 bird is introduced at L22 only`
- Fuzz: `MEC-016-R1 bird target was reachable in time at spawn` (solo `bird: 22` and full table).

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Bird is a director option that returns `null` when no mango qualifies (TR-B6).
- **L2** The director emits `hazardIncoming {family: 'bird'}` on spawn; the family does not emit it.
- **L3** MEC-016-R1 reachable-in-time estimate scales the base tick by the mud factor on mud path cells. The director already skips spawns during the level-up slowdown, so that slowdown needs no additional factor in this estimate.
### Escalate to owner
- OQ-B4 steal cost and OQ-B5 shadow visibility: provisional, owner review at end of P2.
- OQ-B6 strings: provisional, owner review at end of P2.
