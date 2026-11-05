# MEC-015 — Patrolling cat and chicken

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P2b · Date: 2026-11-05

## 1. Purpose & links
- Defines the **npc** family with two variants: **cat** (slow, long route) and **chicken** (fast, short route). The NPC walks a visible back-and-forth route and waits for the snake's body; only the head running into it kills.
- GDD: §5.1 (biome 5), §5.3, §5.4 row "Patrolling cat / chicken", §6.3, §7.
- Framework: MEC-004 (Mover block R5, collision R6/R8, fairness R11–R14, flow B R16, verification R17–R18). Design: P2 design §5, §8, §10, §11. Plan Tasks 3, 7 (TR-B3, TR-B4, TR-B5).

## 2. Player-facing summary
- **From level 21:** a short route lights up with arrows for 1.5 s; then a cat or a chicken walks it back and forth. Cats are slow, chickens are fast.
- The animal never walks into your snake: it stops and waits. Running your head into it ends the run; a Shield knocks it away.
- After 15–20 s the animal leaves at one end of its route.

## 3. State & data
`SimState.families.npc = { npcs: { id, variant: 'cat' | 'chicken', mover: MoverState }[]; nextId }` (Mover in `wait` mode, ping-pong, `lifeMs`).
Descriptor: `{key: 'npc', cause: 'cat', capClass: 'small', maxActiveKey: 'npc.maxActive', breakable: true}` with `causeAt` → the instance variant (`cat` | `chicken`). Save fields: none.

## 4. Rules
- **MEC-015-R1 Variant pick.** `pickWeighted` over `npc.variants.<v>.weight`. **Provisional default (OQ-B3): cat weight 1, chicken weight 1 — provisional, owner review at end of P2.**
- **MEC-015-R2 Route.** `len = rng.int(max − min + 1) + min` from the variant's `routeLen` (cat 5…8, chicken 3…5); `bend = rng.next() < 0.5 || len < 4 ? null : 2 + rng.int(len − 3)` (no bend draw for a straight route); start `rng.int(cols)`, `rng.int(rows)`; direction and turn from `rng.int(4)`; `routeCells(start, len, bend, dir, turn)` builds a straight or L route. An L keeps both legs at least 2 cells long (bend in [2, len − 2]); a draw whose turn is not perpendicular to the direction is rejected and retried within the same attempt budget. Up to `npc.tries` attempts. Valid when no route cell is solid and the route passes `candidateValid` with d = `fairness.nearHeadDist` (rule 2 for the whole route, TR-B3) and `wallCells: [route[0]]` (rule 3).
- **MEC-015-R3 Telegraph.** The route is shown with arrows for `npc.warnMs` (1500 ≥ MEC-004-R13) before the NPC enters cell 0. The whole route is `reserved` for the NPC's life.
- **MEC-015-R4 Ping-pong.** The NPC advances one cell per variant `cellMs`; at a route end it reverses. **Provisional default (OQ-B3): cat `cellMs` 400, chicken `cellMs` 220 — provisional, owner review at end of P2.**
- **MEC-015-R5 Wait rule.** If the next cell is solid or holds a body cell (index > 0), the NPC waits and retries each ms (Mover `wait` mode); it never enters the body. The NPC cell is a BFS wall; it is not solid.
- **MEC-015-R6 Leave.** `lifeMs = npc.lifeMs + rng.next() × npc.lifeRandMs` (15000…20000), counted per move interval from the first move (waiting consumes life). After it has elapsed, the NPC is removed when it sits at route end 0 or the last cell.
- **MEC-015-R7 Head hit / Shield.** Head moving into the NPC cell is `headHit = 'mover'`; the NPC moving onto the head calls `ctx.hitHead('npc', x, y, 'mover', moverDir)`. Without Shield: death with cause = variant (`cat` / `chicken`, via `causeAt`). With Shield: Shield consumed, NPC removed (`onBreak`), `shieldBroke.family = 'npc'`, bonk and rubble per MEC-006.
- **MEC-015-R8 Introduction.** `level.table` rows L21…30 get `npc: 2`; npc is introduced at L21. Small cap, `npc.maxActive` 1.
- **Level up (flow B).** No level-end hook; the NPC keeps patrolling.

## 5. Edge cases
1. **Snake body lies across the route:** the NPC waits in front of it as long as needed (life keeps running).
2. **Head stops next to the NPC and the NPC's next cell is the head:** the NPC moves in ⇒ head hit (the head is not "body").
3. **NPC waiting forever:** it still leaves when its life is over and it is at a route end; if it waits mid-route it stays until it can reach an end or the body moves.
4. **Mango on the route:** cannot happen (route reserved).
5. **Slow-mo:** NPC speed is sim time; not slowed.

## 6. Interactions with other mechanics
- **MEC-004:** Mover `wait` mode; per-cell cause via `causeAt` for the death cause (MEC-014 §11 L4).
- **MEC-006:** Shield knock-away; rubble and bonk.
- Fuzz extraction: route `warn` during the telegraph, NPC cell `mover` afterwards (TR-B4).

## 7. Core API changes
- `FamilyKey` adds `npc`; `CauseKey` adds `cat | chicken`. Event `moverHit {family: 'npc', x, y}`.
- Module `src/core/hazards/npc.ts` (`npc`, `routeCells`).

## 8. Feedback (greybox)
- Route highlight with arrows (blink 250 ms; reduced motion: solid outline); cat = grey square with ears, chicken = white circle with beak. Text keys `banner.new.npc`, `death.cat`, `death.chicken` (OQ-B6, provisional, owner review at end of P2).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `npc.warnMs` | 1500 | P2 design §10 |
| `npc.lifeMs` / `lifeRandMs` | 15000 / 5000 | P2 design §10 (15–20 s) |
| `npc.maxActive` / `tries` | 1 / 40 | lead |
| `npc.variants.cat` | weight 1, cellMs 400, routeLen [5, 8] | OQ-B3 provisional; route P2 design |
| `npc.variants.chicken` | weight 1, cellMs 220, routeLen [3, 5] | OQ-B3 provisional; route P2 design |
| table weight `npc` | 2 on L21…30 | P2 design §11 |

## 10. Acceptance tests
- `MEC-015-R1 variants follow config weights`
- `MEC-015-R2 routeCells builds straight and L routes`
- `MEC-015-R3 route is telegraphed for 1500 ms before the first move and respects rule 2`
- `MEC-015-R4 ping-pong reverses at the ends`
- `MEC-015-R5 an NPC waits for a body cell and the body is never hit`
- `MEC-015-R6 NPC leaves at a route end after its life`
- `MEC-015-R7 head moving into the NPC dies with the variant cause`
- `MEC-015-R7 shield knocks the NPC away`
- `MEC-015-R8 npc is introduced at L21 only`
- Fuzz (MEC-004-R17/R18): solo `npc: 21` and full table (TR-B4).

## 11. Lead decisions & escalations
### Lead decisions
- **L1** One family, two variants; cause per instance via `causeAt`.
- **L2** NPC cell is a BFS wall but not solid; head entering is a `headHit` (P2 design §8).
- **L3** Waiting consumes life (simpler; fixed by the mover test).
- **L4** Director emits `hazardIncoming`.
### Escalate to owner
- OQ-B3 speeds and weights: provisional, owner review at end of P2.
- OQ-B6 strings: provisional, owner review at end of P2.
