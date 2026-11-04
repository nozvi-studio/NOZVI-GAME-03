# MEC-002 — Mangoes: placement, golden mango, rot timer, rotten mango → rock

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- Defines where the regular mango appears, how it rots, what eating it gives, when a rotten mango leaves a temporary rock, and the single list of `reserved` cells used by all placement in P1.
- GDD: §2.1 (in-run loop), §3b (first mango within reach, never next to the head), §5.2 (golden still grows +1), §5.4 row "Rotten mangoes → rocks", §6.1 (golden +10 energy), §7 rows "Mango rot time" and "Golden mango".
- Base behavior: P0 design §5 "MEC-002 Mangoes" (prototype port). This spec keeps P0 behavior unless a rule below changes it.
- Related: MEC-001 (eating step, growth, no board-full win), MEC-003 (level up, family table `rottenRocks` column), MEC-004 (hazards, `nearHead`, BFS `reachable`, crumble state), MEC-006 (energy, orbs, Mango Rain, Shield, step order: ARCHITECTURE "Sim step order" via MEC-006-R35), MEC-008 (golden gating per run, speed ramp counts mangoes).

## 2. Player-facing summary
- One mango is on the board at a time, always reachable and never right next to the head.
- Each mango slowly rots (ring around it). Eat it in time: +1 score, +1 bar, +1 length.
- Sometimes a golden mango appears: +3 score, +2 bar, +1 length, +10 energy, but it rots twice as fast.
- From level 12, a mango that rots leaves a rock on its cell for 5 s, then the rock crumbles. Before level 12 a rotten mango just disappears and a new one appears.
- The rot ring keeps running through a level up.
- Mango Rain mangoes (a skill) are extra mangoes; they never rot into rocks and never affect the regular mango.

## 3. State & data
Core state (`src/core/mango.ts`), extending P0:
| Field | Type | Meaning |
|---|---|---|
| `mango` | `{x, y, golden, ageMs, totalMs} \| null` | the regular mango (P0); `null` only while placement is deferred (R9) |
| `eatenInLevel` | number | regular mangoes eaten in the current level; reset by MEC-003-R7 step 1 and at run start (R3) |
| `eatenInRun` | number | regular mangoes eaten since run start (P0 `eaten`, renamed) (R3) |
| `retryMs` | number | ms since the last failed placement attempt; used only while `mango = null` (R9) |
| `rottenRocks` | `{x, y, state: 'solid' \| 'crumble', leftMs}[]` | temporary rocks (R7; P0 rocks were permanent cells); state of the HazardFamily `rottenRock` (no warn phase, not director-spawned, excluded from the cap; P1 design §4) |
No save fields.

## 4. Rules
- **MEC-002-R1 Port.** Placement candidates, the "good" set (reachable and not `nearHead(x, y, mango.nearHeadDist)`), the fallback to "any" candidate, golden roll, rot formula shape and the fair-rock check are P0 design §5 MEC-002, with the changes below.
- **MEC-002-R2 Reserved cells (single P1 list).** A cell is `reserved` for every placement (regular mango, MEC-004 hazards, MEC-006 orbs, rain drops, rubble) if it holds: a snake cell; the regular mango; a rotten rock in any state; any MEC-004 hazard cell in any state (P0); any terrain cell (P0); an orb; a rain mango; a snip-wall cell or rubble cell in any state (MEC-006 §3). Other MEC files reference this list and do not repeat it.
- **MEC-002-R3 Counters.** Eating the **regular** mango (normal or golden) does `eatenInRun += 1` and `eatenInLevel += 1`. Rain mangoes and orbs change neither counter (MEC-006-R8, R33). Both counters start at 0 for every run, whatever the start level (MEC-008-R5).
- **MEC-002-R4 Rot time.** At placement: `totalMs = floor(max(mango.rotMinMs, mango.rotBaseMs − mango.rotPerEatenMs × eatenInLevel) × (golden ? mango.goldenRotFactor : 1))`; `ageMs = 0`. Changed from P0: the formula uses `eatenInLevel` (GDD §7 "eaten in level"), not the run count.
- **MEC-002-R5 Golden.** At placement, the mango is golden with chance `mango.goldenChance` (0.15) only if `eatenInRun ≥ mango.goldenMinEaten` (3) (P0 gating, per run). Eating it gives score `mango.points.golden` (3), progress `mango.progress.golden` (2), growth +1 (MEC-001-R3) and energy `energy.goldenGain` (+10, MEC-006-R9). A normal mango gives `points.normal` (1), `progress.normal` (1), growth +1, no energy.
- **MEC-002-R6 Rot expiry.** When `ageMs ≥ totalMs` (checked at the "mango" position of ARCHITECTURE "Sim step order", before the snake step): the mango is removed. If `familyRow(level).rottenRocks` (MEC-003-R14/R15, true from L12) **and** the cell is fair (P0: reachable and not `nearHead(x, y, mango.nearHeadDist)`), a rotten rock is created on that cell (R7). Emit `rotted {x, y, leftRock}`. Then place the next mango (R8); the new rock is already reserved for that placement.
- **MEC-002-R7 Rotten rock.** Solid for `mango.rottenRockLifeMs` (5000), then `crumble` for `hazard.crumbleMs` (450, not solid), then removed. In both states it is `reserved` (R2) and a BFS wall (P0). Entering a solid one kills with cause `rotten` (P0 cause order) unless Shield breaks it (MEC-006-R24/R26). It does not count toward the director's small-hazard cap. It is never permanent in P1. Its timers run in sim time (Slow-mo does not slow them, MEC-006-R19); a level up does not change it: it keeps this lifetime (MEC-003-R8).
- **MEC-002-R8 When a mango is placed.** (a) At run start, after the snake is created; (b) in the eating step after eating the regular mango, after the MEC-001-R5 chain (reset and level-up included), so cells freed by the reset are candidates; (c) after a rot (R6); (d) by the retry (R9). Eating a rain mango never places or replaces the regular mango, also when it causes the level up: the regular mango then stays with its timer (its timer keeps running).
- **MEC-002-R9 Deferred placement.** If a placement finds no candidate (good or any), `mango = null`, `retryMs = 0`, emit `mangoDeferred {}` (once per empty period). Every `mango.placeRetryMs` (250) of playing time a new attempt is made; the first success ends the period (no event; the snapshot shows the mango). The run does not end (MEC-001-R10); the director does not spawn meanwhile (MEC-003-R13). A failed attempt consumes no RNG.
- **MEC-002-R10 No pause at level up.** `ageMs` and `retryMs` keep counting through a level up (MEC-003-R9). Slow-mo does not slow `ageMs` (MEC-006-R19).
- **MEC-002-R11 Rain mangoes.** Rain mangoes (MEC-006-R29–R34) are separate objects: they are `reserved` for the regular mango and the regular mango is reserved for them (R2); they never rot into rocks, never are golden, and do not change R3 counters or R4 rot time. Each one eaten counts as a mango for the MEC-008 speed ramp (MEC-008-R8).
- **MEC-002-R12 Orbs.** Orbs (MEC-006-R4–R8) and the regular mango never share a cell (R2). Orbs are not BFS walls, so they never make a mango unfair or unreachable.

## 5. Edge cases
1. **Mango rots in the same ms the head would enter it:** R6 runs before the snake step. The cell is in the head's front lane, so it is not fair: no rock; the head enters an empty cell (P0 order kept).
2. **Rot at L11 or lower:** `rotted {leftRock: false}`, new mango placed; no rock even if fair.
3. **Checkpoint start at L12:** rotten rocks from the first rot; no introduction banner (MEC-003 EC7).
4. **Level up from a rain mango:** the regular mango stays; its `totalMs` was computed with the old `eatenInLevel` and is not recomputed. The first regular mango placed in the new level uses `eatenInLevel = 0`. The next mango is placed after the reset with the normal R2 reserved list.
5. **Level up from the regular mango:** MEC-003-R7 resets `eatenInLevel` before R8(b), so the new level's first mango has the full 8000 ms (golden 4000).
6. **Placement fails at the level-up step:** deferred (R9); the retry timer keeps running and the first retry happens 250 ms later.
7. **Snip wall makes the mango unreachable:** at rot time the cell is not fair, so no rock. (Placement of a new mango already requires reachability for the "good" set.)
8. **Shield hits a rotten rock:** the rock is removed (MEC-006-R26); rubble follows MEC-006-R28.
9. **Golden mango that fills the bar with overflow:** MEC-001 EC1 / MEC-003-R5; energy +10 is still added.
10. **Two rots close together from L12:** each leaves its own 5000 ms rock; there is no cap on rotten rocks (P0 had none either).
11. **Rot formula floor never binds in P1:** max `eatenInLevel` before a level up is 12 (quota 13 at L28–30), so normal rot time is 8000…6200 ms (golden 4000…3100). This is a consequence of the GDD formula; tuning is a P2 concern (§9).

## 6. Interactions with other mechanics
- **MEC-001 Snake:** eating detection, growth +1 for every mango, tail-inclusion rule (P0); placement order MEC-001-R5; no board-full win MEC-001-R10.
- **MEC-003 Levels:** `rottenRocks` column enables R6 rocks; a level up resets `eatenInLevel`; rot and retry timers keep running and rotten rocks keep their lifetime (MEC-003-R8/R9); director paused while `mango = null`.
- **MEC-004 Obstacles:** hazard placement uses R2; fairness rule 3 (BFS to the current mango) skips the check while `mango = null` (no target).
- **MEC-006 Energy/skills:** golden +10 energy (MEC-006-R9); rain mangoes R11; orbs R12; Shield breaks rotten rocks; Slow-mo does not slow rot.
- **MEC-007 Loadout:** none.
- **MEC-008 Checkpoints:** R3 counters restart per run; every eaten mango (regular or rain) advances the speed ramp.

## 7. Core API changes
- `SimEvent.ate` becomes `ate {x, y, golden, points, progressGain, source: 'mango' | 'rain'}` (P0 `ate {x, y, golden, points}` + `progressGain` = progress added by this mango, after any MEC-006-R32 budget cap, and `source`). This spec is the single definition of `ate`; orbs use `orbEaten` (MEC-006).
- `SimEvent.rotted {x, y, leftRock}` unchanged (P0).
- New `SimEvent.mangoDeferred {}` (R9).
- `SimSnapshot.mango` keeps the P0 shape `{x, y, golden, leftMs, totalMs, ageMs} | null`.
- `SimSnapshot.rottenRocks` becomes `{x, y, state: 'solid' | 'crumble', leftMs}[]` (P0: cells only).
- `SimSnapshot` adds `eatenInLevel`, `eatenInRun`.
- `CauseKey` unchanged (`rotten` from P0).
- Main functions carry `// MEC-002` comments.

## 8. Feedback in P1 (greybox)
- Rot ring and throb below 30% as in P0; keeps running through a level up (it reads `ageMs`).
- Rotten rock: P0 rotten-rock greybox tile; in `crumble` it reuses the hazard crumble visual.
- Rotten rock introduction banner: `banner.new.rottenRock` (MEC-003 §8).
- `mangoDeferred`: no player-facing feedback (should not happen in normal play); logged to the console in dev builds only.
- Sounds: P0 `eat`, `golden`, `rot`. No new sounds.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `mango.rotBaseMs` / `rotPerEatenMs` / `rotMinMs` | 8000 / 150 / 4000 | GDD §7 (same as P0; now applied to `eatenInLevel`) |
| `mango.goldenRotFactor` | 0.5 | GDD §7 |
| `mango.goldenChance` / `goldenMinEaten` | 0.15 / 3 | GDD §7 |
| `mango.points` | `{normal: 1, golden: 3}` | GDD §7 |
| `mango.progress` | `{normal: 1, golden: 2}` | GDD §7 |
| `mango.nearHeadDist` | 3 | P0 |
| `mango.rottenRockLifeMs` | 5000 | lead decision L2 |
| `mango.placeRetryMs` | 250 | lead decision L3 |
Referenced, owned elsewhere: `energy.goldenGain` (MEC-006 §9), `hazard.crumbleMs` (P0 / MEC-004), `level.table[].rottenRocks` (MEC-003 §9).
`parseBalance` checks: `rotMinMs ≤ rotBaseMs`; `0 < goldenRotFactor ≤ 1`; `0 ≤ goldenChance ≤ 1`; `rottenRockLifeMs`, `placeRetryMs` positive integers.

## 10. Acceptance tests
- `MEC-002-R1 first mango is reachable and not near the head` (P0 kept)
- `MEC-002-R2 no placement ever uses a reserved cell` (fuzz invariant, extended with orbs, rain mangoes, snip walls, rubble, rotten rocks)
- `MEC-002-R3 rain mangoes and orbs do not change eatenInLevel or eatenInRun`
- `MEC-002-R4 rot time uses eatenInLevel: 8000 at level start, 7550 after 3, golden half`
- `MEC-002-R4 rot time returns to 8000 after a level up`
- `MEC-002-R5 no golden before 3 regular mangoes in the run, also at a checkpoint start`
- `MEC-002-R5 golden gives 3 score, 2 progress, 1 growth, 10 energy`
- `MEC-002-R6 rot below L12 leaves no rock; at L12 a fair rot leaves a rock; unfair rot leaves none`
- `MEC-002-R7 rotten rock is solid 5000 ms, crumbles 450 ms, then is removed`
- `MEC-002-R7 rotten rock kills with cause rotten only while solid`
- `MEC-002-R8 level up from a rain mango keeps the regular mango and its timer`
- `MEC-002-R9 no candidate defers the mango, emits mangoDeferred once, retries every 250 ms`
- `MEC-002-R10 slow-mo does not slow rot`; `MEC-003-R9 rot, director and levelTimeMs keep running after a level up`
- `MEC-002-R11 rain mango never becomes a rotten rock`

## 11. Lead decisions & escalations
### Lead decisions
- **L1** (lead, 2026-11-03) The rot formula uses "eaten in level" (GDD §7) because the snake resets per level; rain mangoes do not count. Golden gating stays per run (GDD §7 "after 3 eaten in the run").
- **L2** (lead, 2026-11-03) Rotten rocks from L12 (MEC-003 L5), solid 5000 ms then crumble; never permanent.
- **L3** (lead, 2026-11-03) Board full is not a win; placement retries every 250 ms of playing time.
- **L4** `reserved` is one list (R2) for all placement in P1, and all temporary obstacle cells are reserved and BFS walls in every state (as P0 hazards), solid only when `solid`.
- **L5** A level up caused by a rain mango does not replace the regular mango (fewer RNG calls, no surprise jump of the target the player is steering to).
- **L6** Rotten rocks have no cap and do not count toward the director cap (P0 behavior).
### Parked (later phases, not P1)
- Whether rain mangoes count as "mangoes" in the P4 marble formula (GDD §7 `floor(mangoes / 2)`) is decided in MEC-009 (P4). P1 logs `ate.source`, so both readings stay possible.
### Escalate to owner
- None.
