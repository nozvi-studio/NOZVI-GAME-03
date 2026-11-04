# MEC-006 — Energy orbs, energy bar and the 4 skills

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- GDD: §2.1 (in-run loop), §3 (skill buttons, "nope"), §3b (staged unlocks), §4 (death unless a skill prevents it), §5.3 (fairness), §6.1–6.3 (energy, skill rules, skill list), §7 (balance), §10.4 (feedback, P3), §12 (`skill_used`).
- Builds on the P0 core API (`docs/superpowers/specs/2026-11-03-p0-foundation-design.md` §4): 1 ms fixed step, seeded RNG, events, snapshot.
- Related: MEC-001 (snake step, length reset), MEC-002 (mango placement, rot), MEC-003 (levels, level up), MEC-004 (obstacles, `reserved`, `nearHead`, BFS), MEC-007 (loadout, slots, unlocks), MEC-008 (start energy, carry-over, speed ramp, save).

## 2. Player-facing summary
- From level 2, glowing energy orbs pop up on free cells; each lasts 8 s (blinks in its last 2 s). Eating one gives +15 energy and does not grow the snake.
- A golden mango also gives +10 energy. The energy bar holds 100, never refills by itself and is kept from level to level.
- Two skill buttons (slot 1 left, slot 2 right) fire the equipped skills if the bar has enough energy. Too little energy = "nope" shake.
- Slow-mo (40): the snake moves slower for 4 s, but the board's timers do not slow down.
- Tail Snip (30): cuts off the back half of the snake; the cut part turns into a rock wall for 3 s.
- Shield (50): for 5 s, the first obstacle you headbutt breaks and you survive, with a short "bonk" stop; rubble lands in the next cell ahead. Mango Rain (80): 6–10 extra mangoes rain down over 6 s.

## 3. State & data
Core state (added to the sim, all integers in sim ms unless noted):
- `energy` (0…`energy.max`), `orbs: {x, y, ageMs}[]`, `orbSpawnMs` (time since the last orb spawn attempt; starts counting when the run first reaches the orb level).
- `loadout: [SkillId | null, SkillId | null]` (from createSim options, MEC-007). `SkillId = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain'`.
- `slowmo: {leftMs} | null`, `shield: {leftMs} | null`.
- `snipWalls: {cells: {x, y}[], state: 'solid' | 'crumble', leftMs}[]` (at most one in `solid`, R14) and `rubble: {x, y, state: 'solid' | 'crumble', leftMs}[]` (a list: a recast Shield can break again while older rubble exists). After their solid life they crumble for `hazard.crumbleMs` (450) like MEC-004 hazards: in every state they are `reserved` (MEC-002-R2) and BFS walls; only `solid` cells kill. Implementation: two HazardFamily entries `snipWall` and `rubble` with no warn phase, not director-spawned, excluded from the director cap (P1 design §4); the state shapes above are their family state.
- `rain: {castId, leftMs, elapsedMs, drops, dropped} | null`, `rainMangoes: {x, y, ageMs, castId}[]`, `rainBudgets: {castId, left}[]` (a budget is removed when its cast has ended and no mango of that cast is left).
- `bonkMs` is not stored: the bonk pause is done through the tick accumulator (R27).
Save fields: none owned here. Start energy and carry-over are MEC-008; unlocks and last loadout are MEC-007.

## 4. Rules
**Energy and orbs**
- MEC-006-R1: `energy` starts at `options.startEnergy` (MEC-008). createSim throws a `RangeError` (MEC-003 §7) unless it is an integer in [0, `energy.max`].
- MEC-006-R2: Every energy gain is clamped to `energy.max`; the part above the cap is lost. There is no passive regeneration and no energy loss over time.
- MEC-006-R3: Energy is kept across level-ups within a run (MEC-003 never resets it).
- MEC-006-R4: Orbs exist only while the current level ≥ `energy.orbFromLevel` (2), in every run (not only the first). `orbSpawnMs` counts from 0 at the first step at which the level is ≥ 2 (so a checkpoint start at L4 sees its first orb 6 s in).
- MEC-006-R5: When `orbSpawnMs` reaches `energy.orbSpawnIntervalMs` (6000), it resets to 0 and one spawn attempt is made. The attempt is skipped (no event) if `orbs.length ≥ energy.orbMax` (2) or no candidate cell exists. There is no catch-up spawn.
- MEC-006-R6: Orb candidate cells = the MEC-002 "good" set: in bounds, not `reserved` (the single list in MEC-002-R2), BFS-reachable from the head (MEC-004 `reachable`), and not `nearHead(x, y, mango.nearHeadDist)`. Orbs never use the MEC-002 "any cell" fallback. The cell is chosen with `rng.pick` over candidates in row-major order. Emits `orbSpawned {x, y}`.
- MEC-006-R7: An orb expires when `ageMs ≥ energy.orbLifeMs` (8000): removed, emits `orbExpired {x, y}`. The snapshot exposes `leftMs`; the game blinks it when `leftMs ≤ energy.orbBlinkMs` (2000).
- MEC-006-R8: When the snake step puts the head on an orb cell, the orb is removed, `energy += energy.orbGain` (15, clamped), emits `orbEaten {x, y, gained}` and, if `gained > 0`, `energyChanged`. The snake does not grow (tail moves as in a normal step), and score, progress and mango counters do not change.
- MEC-006-R9: Eating a golden mango adds `energy.goldenGain` (10, clamped by R2) on top of its MEC-002-R5 reward, at any level, including level 1; emits `energyChanged {source: 'golden'}` if the gain is > 0. Rain mangoes are never golden (R31).
- MEC-006-R10: `orbSpawnMs` and orb `ageMs` keep counting through a level up (MEC-003-R9).

**Skill activation (all skills)**
- MEC-006-R11: `sim.useSkill(slot)` is evaluated synchronously at the current sim time, before the next 1 ms step. It is not buffered: a rejected press is never retried, and presses do not touch the turn queue (MEC-001).
- MEC-006-R12: If `status !== 'playing'` the call is a no-op with no event (same as `turn`).
- MEC-006-R13: Checks in this order; the first failure emits `skillRejected {slot, skill, reason}` and spends nothing: `empty` (slot has no skill) → `active` (an effect of the same skill is active, R14) → `energy` (`energy < cost`) → `noTarget` (skill precondition fails, R20).
- MEC-006-R14: "Active" means: Slow-mo while `slowmo` ≠ null; Shield while `shield` ≠ null; Tail Snip while a snip wall is in `solid` state; Mango Rain while `rain` ≠ null. Different skills may be active at the same time.
- MEC-006-R15: On success: `energy -= cost`, emit `energyChanged {delta: -cost, source: 'skill'}` then `skillUsed {slot, skill, level, energyBefore, energyAfter}`, then apply the effect in the same call.
- MEC-006-R16: Effect timers (`slowmo.leftMs`, `shield.leftMs`, each snip wall's and rubble cell's `leftMs`, `rain`, rain mango `ageMs`) count sim ms and keep counting through a MEC-003 level up. When a timer reaches 0 the effect ends and emits `skillEnded {skill, reason: 'timeout'}` (Shield may also end with `'consumed'`).

**Slow-mo**
- MEC-006-R17: Effective tick = `round(baseTickMs × max(slowmo ? skills.slowmo.tickFactor : 1, curFactor))` (tickFactor 1.6), where `curFactor` is the MEC-003-R22 level-up slowdown factor (1 when none); the two never stack, and `baseTickMs` is the tick MEC-003/MEC-008 give for this step (level tick or speed-ramp tick). It is recomputed every step, so a level-up or ramp change during Slow-mo applies at once. `snapshot.tickMs` shows the effective tick.
- MEC-006-R18: Whenever the effective tick changes, the tick accumulator is clamped to `min(acc, effectiveTick)`, so ending Slow-mo causes at most one immediate snake step, never two in a row. `tickAlpha = clamp(acc / effectiveTick, 0, 1)`.
- MEC-006-R19: Slow-mo changes nothing else: rot timers, hazard/terrain timers, the director, orb and rain timers keep running in sim time (the GDD side effect). Duration `skills.slowmo.durationMs` (4000).

**Tail Snip**
- MEC-006-R20: Precondition: snake length L > `skills.tailSnip.minLength` (3); otherwise `noTarget`.
- MEC-006-R21: Keep `K = max(minLength, ceil(L / 2))` cells from the head; cut the last `L − K` cells (L 4→cut 1, 5→2, 6→3, 7→3, 10→5). The snake keeps its head, direction and turn queue; growth continues from K. `snapshot.tailFrom` becomes the new tail cell (no tail interpolation for the cut).
- MEC-006-R22: Every cut cell becomes a solid snip-wall cell for `skills.tailSnip.wallLifeMs` (3000), then crumbles (MEC-004 `hazard.crumbleMs`, not solid). Exception: a cut cell equal to the head's next cell (head + first queued direction, or current direction if the queue is empty) is dropped from the wall. Emits `tailSnipped {cut, cells}` (cells = wall cells).
- MEC-006-R23: Snip-wall cells are solid: entering one kills the snake with cause `snipWall` (unless Shield, R26). In every state they are walls for BFS and `reserved` for all placement (§3). They appear without a warning and are exempt from GDD §5.3 rules 1–3 (lead decision, §11: GDD §6.3 names the wall as the skill's price).

**Shield (Headbutt)**
- MEC-006-R24: Duration `skills.shield.durationMs` (5000). Breakable = every solid obstacle cell of the P1 families: rock/pebble, fence, terrain raised cell (`up`), maze hedge, rotten rock, snip-wall cell. Never breakable: board edge (`wall`), own body (`self`), rubble.
- MEC-006-R25: The MEC-001 collision order is unchanged: `wall` → `self` → solid cell. At the solid-cell stage, check the solid family first, then `headHit` (MEC-004-R6). Shield also applies to mover and area hits during family updates (MEC-004-R8). A cell in warning state is not solid and does not consume the shield.
- MEC-006-R26: When the new head cell is a breakable solid cell and Shield is active: that one cell is removed (rotten rock removed; hazard cell removed from its hazard; terrain cell removed from its terrain for the rest of the terrain's life; snip-wall cell removed); the head moves into it normally (eating rules apply, growth none since no mango can be there); the shield is consumed (`shield = null`, `skillEnded {skill: 'shield', reason: 'consumed'}`); emits `shieldBroke {x, y, family, rubble}`. P2 extension (approved P2 design §20 item 11): a breakable mover hit follows the same rules through the family's `onBreak`, with bonk (R27) and rubble (R28); the rubble direction is the head's direction for entry and the mover's direction for an update-time hit (MEC-004-R6/R8). An area hit consumes Shield and emits the same events with `rubble: null`, without `onBreak`, bonk or rubble, regardless of the family's `breakable` flag.
- MEC-006-R27: Bonk: after the break the tick accumulator is set to `−skills.shield.bonkPauseTicks × effectiveTick` (3 ticks), so the next snake step happens 4 ticks after the break. Turns may be queued during the bonk. Skills may also be used during the bonk, under the normal `useSkill` rules (owner, 2026-11-04).
- MEC-006-R28: Rubble: "behind the broken obstacle" = the cell one step beyond it in the head's movement direction (broken cell + current direction). Rubble is placed there only if that cell is in bounds and not `reserved` (so never on the snake, a mango, an orb, a rain mango, or another obstacle); otherwise `rubble: null` in the event. Rubble is solid for `skills.shield.rubbleLifeMs` (1500), cause `rubble`, not breakable; in every state a BFS wall and reserved (§3). It is exempt from §5.3 rules 1–3 (lead decision, §11); the bonk pause (R27) still gives the player 4 ticks to react.

**Mango Rain**
- MEC-006-R29: On cast: `drops = dropsMin + rng.int(dropsMax − dropsMin + 1)` (6–10). Drop `i` (0-based) happens when `rain.elapsedMs ≥ i × floor(durationMs / drops)` (first drop in the cast call itself). The rain ends at `durationMs` (6000); undropped drops are impossible by construction.
- MEC-006-R30: Each drop picks a cell from the R6 candidate set (same "good" rules, no fallback) with `rng.pick`; emits `rainDrop {x, y}`. No candidate → `rainDropSkipped {}` and the drop is lost.
- MEC-006-R31: A rain mango is never golden and never rots into a rock. It lives `skills.mangoRain.mangoLifeMs` (8000), blinks in its last `mangoBlinkMs` (2000), then vanishes with `rainMangoExpired {x, y}` (no `rotted` event, no rock). Rain mangoes outlive the 6 s cast window.
- MEC-006-R32: Eating a rain mango: the snake grows by 1 (MEC-001 eating step), score += `mango.points.normal`. Progress +1 only if its cast budget `left > 0` (then `left -= 1`); budget at cast = `floor(need(levelAtCast) × skills.mangoRain.barCapFraction)` (L1: 2, L30: 6). Emits `ate {x, y, golden: false, source: 'rain', points, progressGain}` (event shape: MEC-002 §7).
- MEC-006-R33: Rain mangoes do not change the MEC-002-R3 counters (`eatenInLevel`, `eatenInRun`) and do not trigger a new regular mango. The regular mango keeps existing and rotting normally (MEC-002-R11).
- MEC-006-R34: Rain progress may complete the level bar; level-up then follows MEC-003. The rain, its remaining drops, existing rain mangoes and the cast budget continue in the new level (timers keep running).

**Step order (extends P0 §4)**
- MEC-006-R35: The 1 ms step order (incl. where skill effects, orbs and rain run) is defined once in `docs/ARCHITECTURE.md` "Sim step order". `useSkill` and `turn` run between steps (R11), never inside one.

## 5. Edge cases
1. Energy is 100 and an orb is eaten: orb removed, `orbEaten {gained: 0}`, no `energyChanged`.
2. Press while Slow-mo is active, with enough energy for Slow-mo: `skillRejected {reason: 'active'}`, no spend.
3. Both `active` and `energy` fail: reason `active` (R13 order) so the HUD can show the effect, not "need energy".
4. Tail Snip at length 4 right after a level-up: cuts 1 cell, which becomes a 1-cell wall.
5. Snake in a tight loop, head about to enter the old tail cell: that cell is the head's next cell, so it is dropped from the wall (R22); no instant death.
6. Head loops back into its own snip wall: death, cause `snipWall` (or Shield breaks it).
7. Shield active, head hits the board edge or itself: death with the normal cause; shield is not consumed (run is over).
8. Shield active, head hits rubble from an earlier shield: death, cause `rubble`.
9. Shield breaks a fence cell and the cell beyond is the regular mango: no rubble (R28); the mango stays.
10. Shield breaks the last cell before the edge: beyond is out of bounds, no rubble.
11. Shield expires during the bonk pause (cannot happen: it was consumed by the break). Shield expires with no hit: `skillEnded {reason: 'timeout'}`.
12. Slow-mo ends during the bonk pause: the negative accumulator is kept; R18 clamp does not raise it.
13. Mango Rain on a nearly full board: some drops are skipped; energy is not refunded.
14. Level-up during Slow-mo: the effective tick uses the larger of the Slow-mo and slowdown factors (R17), never their product; the Slow-mo timer keeps running.
15. Level up while a snip wall or rubble exists: snip walls and rubble survive a level up and end by their own lifetime.
16. A skill press right after a level up is accepted like any other press (no `busy` reason).
17. Death with effects active: everything freezes with `status: 'over'`; `snapshot.energy` at death is what MEC-008 carries over.
18. P1 has no permanent level layouts (MEC-003-R15), so orbs and rain mangoes are never displaced in P1. If P2 adds layouts, the P2 spec defines displacement.
19. Two `useSkill` calls in the same ms: processed in call order; the second sees the first's spend.

## 6. Interactions with other mechanics
- **MEC-001 snake:** eating a rain mango uses the normal grow step; an orb uses the normal move step. Tail Snip shortens without changing direction or queue. The length reset on level-up (MEC-001) also applies to a snake grown by rain.
- **MEC-002 mango:** MEC-002-R2 is the single `reserved` list (it includes orbs, rain mangoes, snip walls and rubble). Golden mango gives +10 energy (R9). Rain mangoes are separate objects and do not affect rot time or golden gating (R33, MEC-002-R11).
- **MEC-003 levels:** rain progress counts toward the quota. Orb, rain and effect timers keep running through a level up, skill presses are accepted, snip wall and rubble survive. Energy is never reset by a level-up.
- **MEC-004 obstacles:** hazard placement uses the MEC-002-R2 `reserved` list; BFS `reachable` adds snip walls and rubble (every state) as walls (orbs and rain mangoes are not walls). Fairness rule 3 still targets the regular mango only. New cause keys: `snipWall`, `rubble`.
- **MEC-008 checkpoints:** provides `startEnergy`; reads `snapshot.energy` at death. Base tick (incl. speed ramp) comes from MEC-008 and is multiplied per R17 (Slow-mo and the MEC-003-R22 slowdown, larger factor wins). Whether rain mangoes advance the speed ramp is MEC-008's rule; the `ate` event carries `source` for it.
- **MEC-007 loadout:** provides `loadout`; mid-run unlocks may fill an empty slot (MEC-007).

## 7. Core API changes
```ts
type SkillId = 'slowmo' | 'tailSnip' | 'shield' | 'mangoRain';
interface Sim { /* P0 API */ useSkill(slot: 0 | 1): void; }
```
- `createSim` and `SimOptions`: defined once in MEC-003 §7; this spec owns the `startEnergy` validation (R1) and the `SkillId` type.
- `CauseKey` adds `snipWall | rubble`.
- `SimEvent` adds: `energyChanged {energy, delta, source: 'orb' | 'golden' | 'skill'}`, `orbSpawned {x, y}`, `orbEaten {x, y, gained}`, `orbExpired {x, y}`, `skillUsed {slot, skill, level, energyBefore, energyAfter}`, `skillRejected {slot, skill: SkillId | null, reason: 'empty' | 'active' | 'energy' | 'noTarget'}`, `skillEnded {skill, reason: 'timeout' | 'consumed'}`, `tailSnipped {cut, cells}`, `shieldBroke {x, y, family, rubble: {x, y} | null}`, `rainDrop {x, y}`, `rainDropSkipped {}`, `rainMangoExpired {x, y}`. The `ate` event shape (incl. `source`) is defined in MEC-002 §7.
- `SimSnapshot` adds: `energy`, `energyMax`, `orbs: {x, y, leftMs}[]`, `skills: {slot, id: SkillId | null, cost, affordable, active, leftMs}[2]` (`leftMs` of the active effect, else 0), `snipWall: {x, y, state: 'solid' | 'crumble', leftMs}[]` (cells of all snip walls), `rubble: {x, y, state: 'solid' | 'crumble', leftMs}[]`, `rainMangoes: {x, y, leftMs}[]`, `rain: {leftMs, dropsLeft} | null`, `slowmo: {leftMs} | null`, `shield: {leftMs} | null`.
- Main functions carry `// MEC-006` comments (`src/core/energy.ts`, `src/core/skills.ts`).

## 8. Feedback in P1 (greybox only)
- Orb: cyan circle with outline; blinks (shape on/off, not color only) when `leftMs ≤ 2000`. Rain mango: normal mango shape with a small droplet mark; blinks the same way.
- Energy bar in the HUD under the level bar, number `energy/100`. Skill buttons: icon letter + cost; glow when affordable; grey when not; ring of remaining time while active.
- Snip wall: rock tile with a tail-stripe mark. Rubble: small dark grey tile. Slow-mo: blue board tint. Shield: outline ring on the head.
- Text keys: `hud.energy`, `skill.slowmo.name`, `skill.tailSnip.name`, `skill.shield.name`, `skill.mangoRain.name`, `skill.reject.energy` ("Need {cost} energy"), `skill.reject.active` ("Already on!"), `skill.reject.noTarget` ("Too short to snip"), `tip.orb.first` ("Energy orb! Fuel for skills"), `death.snipWall`, `death.rubble`.
- Sounds (synth): `orb` soft zap; `skillSlowmo`, `skillSnip`, `skillShield`, `skillRain` one cast tone each; `shieldBreak` crack; `nope` short low buzz. Haptics: orb 8 ms, cast 20 ms (GDD §10.4).
- "Nope": on `skillRejected` with reason `active | energy | noTarget`, the button shakes 200 ms and plays `nope`; reason `empty` gives no feedback (no button is drawn for an empty slot). The orb tooltip shows once, on the first `orbSpawned` when the saved best level was < 2.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `energy.max` | 100 | GDD §6.1 |
| `energy.orbGain` | 15 | GDD §6.1 |
| `energy.goldenGain` | 10 | GDD §6.1 |
| `energy.orbSpawnIntervalMs` | 6000 | GDD §6.1 |
| `energy.orbMax` | 2 | GDD §6.1 |
| `energy.orbLifeMs` | 8000 | GDD §6.1 |
| `energy.orbBlinkMs` | 2000 | GDD §6.1 |
| `energy.orbFromLevel` | 2 | GDD §3b |
| `skills.slowmo.cost` / `.durationMs` / `.tickFactor` | 40 / 4000 / 1.6 | GDD §6.3 |
| `skills.tailSnip.cost` / `.minLength` / `.wallLifeMs` | 30 / 3 / 3000 | GDD §6.3 |
| `skills.shield.cost` / `.durationMs` / `.rubbleLifeMs` | 50 / 5000 / 1500 | GDD §6.3 |
| `skills.shield.bonkPauseTicks` | 3 | lead decision (with the hit tick = 4 ticks, GDD §5.3 rule 1) |
| `skills.mangoRain.cost` / `.durationMs` | 80 / 6000 | GDD §6.3 |
| `skills.mangoRain.dropsMin` / `.dropsMax` | 6 / 10 | GDD §6.3 |
| `skills.mangoRain.barCapFraction` | 0.5 | GDD §6.3 |
| `skills.mangoRain.mangoLifeMs` / `.mangoBlinkMs` | 8000 / 2000 | lead decision (= base rot time / orb blink, GDD §7, §6.1) |
`parseBalance` checks: all values positive integers except `tickFactor` (> 1) and `barCapFraction` (0 < x ≤ 1); `dropsMin ≤ dropsMax`; `orbBlinkMs < orbLifeMs`; `mangoBlinkMs < mangoLifeMs`. Snip wall / rubble crumble reuse `hazard.crumbleMs`.

## 10. Acceptance tests
- MEC-006-R1 start energy from options; non-integer or > max throws
- MEC-006-R2 gains clamp at 100; no change over 60 s with no pickups
- MEC-006-R4 no orb ever spawns on level 1; first orb at 6000 ms after reaching level 2
- MEC-006-R5 attempt skipped at 2 orbs with no catch-up spawn
- MEC-006-R6 fuzz: orbs never on reserved, unreachable or near-head cells (200 seeds)
- MEC-006-R7 orb expires at 8000 ms; leftMs reported
- MEC-006-R8 orb gives +15, no growth, no progress, no score
- MEC-006-R9 golden mango gives +10 energy on level 1
- MEC-006-R10 orb timers keep running through a level up
- MEC-006-R11 rejected press is not retried; turn queue unchanged by useSkill
- MEC-006-R13 rejection reasons and their order (empty, active, energy, noTarget)
- MEC-006-R15 success spends cost and emits energyChanged then skillUsed
- MEC-006-R16 slow-mo timer keeps running through a level up
- MEC-006-R17 slow-mo tick = round(base × 1.6) incl. ramp during effect; Slow-mo and the slowdown do not stack: the larger factor wins
- MEC-006-R18 ending slow-mo causes at most one immediate step
- MEC-006-R19 rot and hazard timers unchanged by slow-mo
- MEC-006-R21 cut counts for lengths 3…10
- MEC-006-R22 cut cell in the head's next cell is not a wall; wall crumbles after 3000 ms
- MEC-006-R23 entering snip wall kills with cause snipWall; snip wall blocks BFS
- MEC-006-R25 shield never saves from wall or self; warning cells do not consume it
- MEC-006-R26 shield breaks each breakable family once and is consumed
- MEC-006-R27 next step 4 ticks after the break
- MEC-006-R28 rubble beyond the broken cell; skipped on reserved or out-of-bounds cells; kills with cause rubble
- MEC-006-R29 drop count 6–10 and schedule over 6000 ms, deterministic per seed
- MEC-006-R31 rain mango vanishes at 8000 ms without rock
- MEC-006-R32 rain progress capped at floor(need × 0.5) per cast; extras give score only
- MEC-006-R34 rain continues after a level-up with its budget
- MEC-006-R35 determinism: same seed + same timed turn/useSkill calls → same snapshot hash, any advance chunking

## 11. Lead decisions & escalations
**(a) Lead decisions**
- Orbs appear from level 2 in every run, not only the first run (one rule; L1 stays the teaching level).
- Orb attempts every 6 s are skipped when 2 orbs exist or no cell is fair; no catch-up (simple, predictable rate).
- Orbs and rain drops use the MEC-002 "good" cell set with no fallback (never in pockets or at the head).
- Orbs, rain mangoes, snip wall and rubble are `reserved` for all placement; snip wall and rubble are BFS walls (consistent with how rocks work).
- Skill presses are evaluated at once, never buffered; a press right after a level up is evaluated like any other (no hidden delayed spends).
- Tail Snip is "active" while its wall is solid (one wall at a time; matches the GDD "same skill active" rule).
- Cut size = keep `max(3, ceil(L/2))` (back half rounded down, min length 3); length ≤ 3 is `noTarget` with no spend.
- A cut cell in the head's next cell is not walled (prevents an unreactable death from the player's own skill).
- Shield breaks every P1 solid obstacle incl. maze hedge and snip wall; rubble is not breakable (one readable rule: "rubble is dust, always solid").
- "Behind" = the cell beyond the broken one in the movement direction; a 3-tick bonk pause makes that forced turn fair (4-tick warning).
- Rubble is not placed on reserved cells (never destroys a mango or orb).
- Rain mangoes are never golden, never rot into rocks and vanish after 8 s (a paid skill should not create rocks).
- Rain bar budget is per cast, fixed at cast time, may finish the level and carries over a level-up (simple, still ≤ 50% of any bar).
- Rain mangoes do not change MEC-002 eaten counters (the regular mango's rot pace is not affected by a skill).
- Effect timers keep running through a level up (nothing is frozen, MEC-003-R9).
- Effective tick is rounded to whole ms and the accumulator is clamped on change (determinism, no double steps).
- Snip walls and rubble use the MEC-004 hazard state rules (reserved and BFS wall in every state, solid only in `solid`), and rubble is a list (a recast Shield can leave a second rubble cell).
- (lead, 2026-11-03) **Snip wall and Shield rubble are exempt from GDD §5.3 fairness rules 1–3.** GDD §6.3 is the more specific rule: they are the skill's price. The 3-tick bonk pause (R27) stays as specified. Replaces the former owner escalation.
- Lead review 2026-11-03: orbs from L2 in every run and Slow-mo `round(base × 1.6)` accepted.
**(b) Escalate to owner**
- None.
