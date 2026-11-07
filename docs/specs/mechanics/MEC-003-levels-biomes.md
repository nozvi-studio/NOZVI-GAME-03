# MEC-003 — Levels & biomes: 30 levels, quotas, speed, level up, director, run log

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- Replaces P0's 10-level progression (P0 design §5 "MEC-003") with 30 levels in 6 biomes, the GDD v0.2 quota/speed/director formulas, an exact level-up sequence and slowdown, a data-driven per-level obstacle family table, the level-30 run win, and the local run log.
- GDD: §4 (run win), §5.1 (biomes), §5.2 (per-level rules), §5.3 rule 5 (one new family per level), §5.4 (rotten mango → rock), §7, §11 row P1 ("existing obstacle families only", "death causes logged locally"), §12 (analytics events).
- Related: MEC-001 (length reset), MEC-002 (mango, rot timer), MEC-004 (families, director, fairness), MEC-006 (energy, skills), MEC-007 (loadout), MEC-008 (start level, speed ramp).

## 2. Player-facing summary
- Clear 30 levels; every 5 levels you enter a new biome. (Every 5th level becomes a harder challenge level in P2; in P1 it plays like a normal level.)
- Each level needs a few more mangoes (4 at L1 → 13 at L30) and the snake gets faster (140 ms → 82 ms per step).
- On level up the snake pops back to 4 and keeps moving; obstacles stay until they end by their own lifetime. From level 6 the snake is briefly slower and eases back to the new speed (R22).
- New obstacle types appear one at a time, with a banner the first time.
- Clearing level 30 wins the run.

## 3. State & data
Core state (`src/core/level.ts`, `src/core/sim.ts`):
| Field | Type | Meaning |
|---|---|---|
| `level` | 1…30 | current level, **1-based** in P1 (lead decision L1) |
| `progress`, `need` | number | bar progress and `quota(level)` (P0 names) |
| `eatenInLevel` | number | defined by MEC-002-R3; reset to 0 by R7 step 1 |
| `levelUpSlow` | `{factor, easeMs, leftMs} \| null` | level-up slowdown, null when none (R22) |
| `levelTimeMs`, `timeMs` | number | sim ms in the current level / since run start |
| `startLevel`, `levelsCleared` | number | from `createSim` options / levels cleared in this run |
Derived (pure functions, not stored): `biome(n)`, `isChallenge(n)`, `quota(n)`, `levelTickMs(n)`, `directorIntervalMs(n)`, `smallHazardCap(n)`, `familyRow(n)`.
Save fields: none here (best level, checkpoints: MEC-008). Local run log: separate storage key (R17).

## 4. Rules
### Structure and formulas (n = level, 1-based)
- **MEC-003-R1 Biomes.** `biome(n) = floor((n − 1) / 5) + 1` (1…6). `isChallenge(n) = (n mod 5 = 0)` → L5, 10, 15, 20, 25, 30.
- **MEC-003-R2 Quota.** `quota(n) = 4 + floor((n − 1) / 3)`. L1 = 4, L30 = 13, sum L1…L30 = 255.
- **MEC-003-R3 Speed.** `levelTickMs(n) = 140 − 2 × (n − 1)`. L1 = 140, L30 = 82. The live tick is `levelTickMs(level)` except during the MEC-008 ramp; the effective tick also applies the level-up slowdown (R22) and Slow-mo by the MEC-006-R17 max rule.
- **MEC-003-R4 Director.** `directorIntervalMs(n) = max(1600, 5000 − 120 × n)`; `smallHazardCap(n) = min(10, 2 + floor(n / 3))`. On challenge levels: interval = `floor(directorIntervalMs(n) × director.challengeIntervalFactor)`, cap = `smallHazardCap(n) + director.challengeCapBonus`, both applied after the min/max clamps. The cap counts non-maze hazards (P0). **P1 config was neutral** (factor 1, bonus 0, lead decision L9). **P2c sets the GDD §5.2 values in config only: `director.challengeIntervalFactor` 0.8, `director.challengeCapBonus` 2** (L30: 1280 ms, cap 12; L25: 1600 ms, cap 12; L5: 3520 ms, cap 5). A challenge level changes nothing else: mango quota and snake speed stay as in R2/R3 (OQ-C3, provisional default).
### Progress, level up, run win
- **MEC-003-R5 Progress.** Eating adds progress (normal 1, golden 2; MEC-002). While `progress ≥ need` and level < 30: `progress −= need`, level += 1 (P0 overflow loop). At most one level up per step in practice (max overflow 1).
- **MEC-003-R6 Run win.** When `progress ≥ need` at level 30: `levelsCleared = 30`, status `over`, outcome `{won: true}`, emit `runWon`. No length reset, no level up. This is the only run win (MEC-001-R10).
### Level up (all times in sim ms, t = 0 is the level-up step)
- **MEC-003-R7 Sequence (no freeze).** Inside the eating step: eat resolves (MEC-001-R5) → length reset (MEC-001-R4) → `level += 1`, `levelsCleared += 1`, `progress` = overflow, `eatenInLevel = 0`, `levelTimeMs = 0` → director timer `director.firstSpawnMs`, maze cooldown 0 (R11) → slowdown starts (R22) → emit `shrunk`, `levelUp` → ramp end (MEC-008-R8) → unlocks (MEC-007-R12) → if the regular mango was eaten, MEC-002-R8(b) places the next one. The sim keeps stepping; the HUD shows "Level N" for `ui.bannerMs` as a non-blocking overlay. The tick accumulator is kept (not reset).
- **MEC-003-R7.1** retired (a warning maze keeps its own lifecycle).
- **MEC-003-R8 What stays.** Every hazard, rotten rock, terrain piece, snip wall and rubble keeps its state and ends by its own lifetime rules (MEC-002-R7, MEC-004, MEC-006-R22/R28). Hazards of a family not enabled in the new level keep working until they end.
- **MEC-003-R9 Nothing is frozen.** Mango rot and retry, director (except while a slowdown is active, R11), maze cooldown, `levelTimeMs`, orbs, skills and rain timers keep counting through a level up.
- **MEC-003-R10 Input.** `turn()` and skill casts are accepted at all times; there is no `busy` rejection.
- **MEC-003-R11 Level start.** At a level up the director timer is set to `director.firstSpawnMs` (2500) and the maze cooldown to 0; the director does not count while a slowdown (R22) is active, so the first spawn comes `firstSpawnMs` after the slowdown ends (counted at once for levels without a slowdown). At run start for `startLevel` the timer is `firstSpawnMs` and there is no slowdown.
- **MEC-003-R12 Banner length.** The level-up banner lasts `ui.bannerMs` (value in §9). `level.transitionMs` was removed together with the level-up freeze, so there is no transition length guard.
- **MEC-003-R13 Empty mango slot.** While no mango is on the board (MEC-001-R10), the director does not spawn.
### Obstacle families per level (P1 = existing families only)
- **MEC-003-R14 Family table.** `level.table` is an ordered list of rows `{from, to, weights, rockShapes, fenceShapes, rottenRocks}`. Rows cover 1…30 exactly once (validated). A family is enabled on level n iff it has a weight > 0 in `familyRow(n).weights`. The director (MEC-004) uses those weights instead of P0's unlock levels; `rock.shapePoolByLevel` and the P0 fence tiers are replaced by `rockShapes` / `fenceShapes`. Unknown family keys or shape names fail `parseBalance`. P2 adds families by adding weight keys, shape lists and family parameter groups (data), plus the family's code.
- **MEC-003-R15 P1 table.** P2 extends weight keys and introductions via MEC-012-R11 and MEC-013-R8; the shipped numbers live in `config/balance.json` (mud from L7, ice from L13, coconut from L16). The P2 coconut table splits the former L16–25 row into L16–20 and L21–25. The table below records the P1 baseline. **P2c challenge rows (TR-C5):** L5, 10, 15, 20, 25 and 30 get their own rows (`from === to`; neighbours split, e.g. 7–9 / 10 / 11, 13–14 / 15, 16–19 / 20, 21–24 / 25, 27–29 / 30), keeping the neighbour row's shape lists and `rottenRocks`. Starting weights (P2 design §12): L5 "Rock rain" rock 5 (all shapes) · L10 "Fence field" fence 4, mud 2, rock 2 · L15 "Thin ice" ice 4, terrain 2, rock 2, fence 1 · L20 "Avalanche" coconut 4, rock 3, spike 2, gate 1 · L25 "Pet chaos" npc 4, bomb 2, bird 2, rock 1 · L30 "Final storm" every family 2. `parseBalance` rejects a table where `introducedAt(b, n)` is a multiple of 5 (a challenge row never introduces a family). Shrink (MEC-018) is introduced at L27 with weight 2 (provisional, OQ-C1). The shipped numbers stay in `config/balance.json`; per-biome tuning is P2c Task 6.

  | Levels | Biome | weights | rockShapes | fenceShapes | rottenRocks | Introduces |
  |---|---|---|---|---|---|---|
  | 1–2 | 1 | rock 3 | single | — | no | rock |
  | 3–4 | 1 | rock 3 | single, lineH, lineV | — | no | — |
  | 5 | 1 (challenge) | rock 3 | + corner, block | — | no | — |
  | 6 | 2 | rock 3, fence 2 | all 5 | line | no | fence |
  | 7–10 | 2 | rock 3, fence 2 | all 5 | line, L | no | — |
  | 11 | 3 | rock 3, fence 2, terrain 2 | all 5 | line, L | no | terrain |
  | 12 | 3 | rock 3, fence 2, terrain 2 | all 5 | line, L | **yes** | rottenRock |
  | 13–15 | 3 | rock 3, fence 2, terrain 2 | all 5 | line, L, T, Z | yes | — |
  | 16–25 | 4–5 | rock 3, fence 2, terrain 2 | all 5 | line, L, T, Z, F, U, plus | yes | — |
  | 26–30 | 6 | rock 3, fence 2, terrain 2, maze 2 | all 5 | all 7 | yes | maze |
  Line-fence length uses `5 + rng.int(1 + min(4, n − fenceFirstLevel))` with `fenceFirstLevel` = first level whose row has a fence weight (6). Terrain max active = 1 on every level (GDD §5.1 "one big terrain event at a time"); P0's maze/terrain exclusion stays.
- **MEC-003-R16 One introduction per level.** A family (or `rottenRocks`) is "introduced" on the first level where it becomes enabled. `parseBalance` rejects a table that introduces 2+ in one level (GDD §5.3 rule 5). `levelUp.unlocked` carries the introduced key.
- **MEC-003-R17 Rotten rocks.** `familyRow(level).rottenRocks` switches rotten rocks on per level (P1 table: from L12). What a rotting mango does in either case, the rock's lifetime and its crumble are MEC-002-R6/R7.
### Local run log
- **MEC-003-R18 Log store.** `src/meta/runLog.ts` (pure) keeps `{version: 1, nextRunId, entries[], deathCounts}` under its own key `mango-snake.log` (separate from the save, so log errors never touch progress). `entries` is a ring buffer of the last `log.maxEntries` (500) records; `deathCounts` is cumulative per cause and never trimmed. Load/save follow the P0 save rules (never throws, storage errors swallowed).
- **MEC-003-R19 Records (P1 subset of GDD §12).** The session layer (`src/session`) appends, with `t` = wall-clock ms supplied by the game layer and `runId`:
  `run_start {startLevel, startEnergy, loadout, entry ('home' | 'results')}` · `level_up {level (new level), levelTimeMs (= levelUp.clearedLevelTimeMs)}` · `skill_used {skill, level, energyBefore}` (from MEC-006's event) · `checkpoint_unlocked {level (start level unlocked), reachedLevel}` (MEC-008) · `run_end {level, score, cause, durationMs (= sim timeMs), startLevel, levelsCleared, won, turns, context?}`; `context` (`'ice' | 'mud'`) is present only when the death carried a ground-tile context (MEC-004-R15, MEC-012-R12) and `deathCounts` stay per cause; `turns` is the number of turns the MEC-001 queue accepted during the run (dropped same-direction, reverse or queue-full inputs are not counted), so a log tells "no input" from "input lost". Records written before this field existed have no `turns` and stay valid; readers treat it as optional. `marble_shot`, `skin_unlocked` and the `marbles` field of `run_end` start in P4.
- **MEC-003-R20 Causes.** `run_end.cause` is the death `CauseKey` (P0 list plus any key MEC-006 adds), `clear` for a run win, `quit` when the player quits from the pause overlay. `deathCounts` increments only for death causes.
- **MEC-003-R21 Export.** With the URL flag `?debug=1`, Home shows an "Export log" button that copies the log JSON to the clipboard (for `docs/PLAYTEST.md`). No network.
  - **Debug start level:** `?debug=1&level=N` (integer 1..maxLevel) makes Play start the run at level N (Loadout still shown). Without `debug=1`, or with an invalid N, the param is ignored. Such runs write no best level, checkpoint or full-clear progress; carried energy and best score behave as in a normal run.
  - **Debug skip buttons:** with `debug=1`, the HUD shows "+1" (next level) and "Key" (next key level: every challenge level plus every level that introduces a family or rotten rocks, `keyLevels` in `src/core/level.ts`; currently 1, 5, 6, 7, 10, 11, 12, 13, 15, 16, 17, 18, 20, 21, 22, 23, 25, 26, 27, 30). A press runs one normal level-up chain into the target (banners, family intro, length reset; intermediate levels are not replayed) via `Session.debugSkipTo`. The first skip of a normal run converts it to a debug run: a `debug_skip {from, to}` record is logged, the run is excluded from `summarizeLog` and `deathCauseReport`, and later level-ups write no progress (progress already written at the normal start stays). Buttons hide when no further target exists.
- **MEC-003-R22 Level-up slowdown.** Tiers by the level just reached, `levelUpSlowdown.tiers` (tier values in §9). `curFactor = 1 + (factor − 1) × leftMs / easeMs`, `leftMs` falls by 1 per sim ms and the slowdown ends at 0. A level up during a slowdown restarts it with the new tier. The effective tick is MEC-006-R17's `max` rule over the MEC-008 base tick. Implementation: `src/core/slowdown.ts`.

## 5. Edge cases
1. **Golden mango at `need − 1`:** level up with progress 1 in the new level (R5).
2. **Level up while a maze is warning:** it keeps warning and lands by its own lifecycle (R8).
3. **Snake standing on a warning terrain cell at level up:** the terrain is not cleared at a level up and keeps its own lifecycle (R8); the cell follows the terrain rules (MEC-004).
4. **Mango at level up:** if the level up came from eating the regular mango, the next one is placed at t = 0 and its rot timer starts at once. If it came from a Mango Rain mango, the regular mango stays and its timer keeps running (MEC-002-R8, EC4).
5. **Pause during a level up:** the game layer stops calling `advance`; the slowdown and banner resume where they stopped.
6. **Player quits during a level up:** logged as `quit` with the new level as `level`.
7. **Start at a checkpoint level (MEC-008):** no `levelUp` and no introduction banner for that level; R11 applies and there is no slowdown; `levelsCleared` starts at 0.
8. **Rotten rock rotting near the head:** P0 fairness: unfair → no rock (MEC-002-R6).
9. **Challenge interval rounding (P2 values):** `5000 − 120n` is a multiple of 40, so × 0.8 is an integer; `floor` is kept for safety. With the P1 factor 1 the interval is unchanged.
10. **Director wants a maze while a terrain is active (L26+):** P0 exclusion; it picks among the remaining options.

## 6. Interactions with other mechanics
- **MEC-001:** R7 calls the length reset; the snake keeps stepping (MEC-001-R9); board full no longer wins.
- **MEC-002:** `eatenInLevel` resets each level (GDD §7 rot formula "eaten in level"); rot timer keeps running through a level up; the family table enables rotten rocks (R17), MEC-002 owns their behavior and lifetime.
- **MEC-004:** director reads R4 interval/cap and the R14 table; hazards survive a level up and the director skips while the slowdown is active (R11); fairness rules unchanged.
- **MEC-006:** energy and orbs persist across levels (GDD §6.1); its timers keep running through a level up; casts are accepted; temporary walls survive.
- **MEC-007:** the loadout is fixed for the whole run; logged in `run_start`.
- **MEC-008:** provides `startLevel` and the speed ramp; consumes `levelUp`/`runWon` for best level and checkpoint unlocks.

## 7. Core API changes
- **`SimOptions` is defined here only** (MEC-006/007/008 reference it):
  ```ts
  type Loadout = readonly [SkillId | null, SkillId | null];          // SkillId: MEC-006 §7
  interface SimOptions {
    startLevel?: number;   // integer 1…30, default 1            (MEC-003, MEC-008)
    startEnergy?: number;  // integer 0…energy.max, default 0    (validated by MEC-006-R1)
    loadout?: Loadout;     // default [null, null]               (validated by MEC-007-R11)
    bestLevel?: number;    // integer 1…30, default 1            (MEC-007; game passes max(1, save.bestLevel))
  }
  createSim(balance: Balance, seed: number, options?: SimOptions): Sim;
  ```
  Omitted options take these defaults, so the P0 call `createSim(balance, seed)` stays valid (a fresh L1 run). Every validation failure throws a `RangeError` with a readable message (one error type for all options).
- `SimSnapshot` adds: `biome`, `challenge`, `levelUpSlow`, `levelTimeMs`, `timeMs`, `startLevel`, `levelsCleared`. `level` becomes 1-based.
- `SimEvent` changes: `levelUp {level, biome, challenge, biomeChanged, unlocked?: FamilyKey, clearedLevelTimeMs}` (extends P0 `levelUp`); new `runWon {score, timeMs}`. `FamilyKey = 'rock' | 'fence' | 'terrain' | 'maze' | 'rottenRock'` (P2 extends).
- Pure exports from `src/core/index.ts`: `quota`, `levelTickMs`, `biome`, `isChallenge` (for HUD and tests).

## 8. Feedback in P1 (greybox)
- `levelUp`: banner `banner.levelUp` "Level {n}" + `banner.freshStart`; if `biomeChanged`: `banner.biome.{1..6}` ("Mango Orchard" … "Storm Garden"); if `unlocked`: P0 family banner text key `banner.new.{family}` (adds `rottenRock`: "Rotten mangoes turn to rock!").
- **Challenge banner and HUD marker (ON from P2c; OFF in P1, lead decision L9). Implemented in `src/game/hud/banners.ts` (`levelUpBanners`) and `src/game/hudText.ts` (`levelTitle`, star suffix) with strings in `text.ts`:** when `levelUp.challenge` is true the game layer shows `banner.challenge.{5,10,15,20,25,30}` = "Challenge: <name>!" with the names Rock rain, Fence field, Thin ice, Avalanche, Pet chaos, Final storm (OQ-C2, provisional wording). The HUD marker is a small star next to the level number for the whole challenge level (shape, not color only). The banner is also shown when a run starts on a challenge level.
- HUD: "L{n} · Biome {b}" and the quota bar `progress/need`.
- Board: greybox ground tint per biome (6 flat colors in the game layer's palette, not config).
- Sounds: reuse P0 `level` for level up and biome change; `runWon` reuses `level` played twice. No new assets.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `level.maxLevel` / `level.perBiome` | 30 / 5 (P0 key `maxLevel` kept, now 1-based last level) | GDD §5.1 |
| `level.needBase` / `level.needStepLevels` | 4 / 3 | GDD §5.2 |
| `ui.bannerMs` | 1800 | level-up banner length (R12); `level.transitionMs` was removed |
| `levelUpSlowdown.tiers` | 6-15: x1.4 / 1000 ms; 16-30: x1.6 / 1500 ms | owner 2026-11-04 (R22) |
| `level.table` | R15 rows | GDD §5.1/§5.4 + lead decisions L4–L6 |
| `speed.startMs` / `speed.msPerLevel` / `speed.minMs` | 140 / 2 / 82 | GDD §5.2 (minMs = L30 value, safety clamp) |
| `director.intervalBaseMs` / `intervalPerLevelMs` / `intervalMinMs` | 5000 / 120 / 1600 | GDD §5.2 |
| `director.capBase` / `capPerLevels` / `capMax` | 2 / 3 / 10 | GDD §5.2 |
| `director.challengeIntervalFactor` / `challengeCapBonus` | **0.8 / 2 from P2c** (1 / 0 in P1) | GDD §5.2; lead decision L9 |
| `director.firstSpawnMs` | 2500 | P0, now per level (L2) |
| `director.weights`, `level.unlock`, `level.needPerLevel`, `rock.shapePoolByLevel` | removed, replaced by `level.table` and the formulas above | R14 |
| `terrain.maxActive` | 1 (`maxActiveLate`, `lateLevel` removed) | GDD §5.1 |
| `log.maxEntries` | 500 | lead decision L7 |
Read, owned elsewhere: `mango.rottenRockLifeMs` (5000, MEC-002 §9); `fairness.*` stays at the P0 values (P0 design §6, lead decision L10; owner from P2: MEC-004).

## 10. Acceptance tests
- `MEC-003-R1 biome of L1 L5 L6 L30 is 1 1 2 6 and challenge levels are 5 10 15 20 25 30`
- `MEC-003-R2 quota L1 is 4, L30 is 13, total is 255`
- `MEC-003-R3 tick L1 is 140 ms and L30 is 82 ms`
- `MEC-003-R4 with P1 config interval L1 4880, L29 1600, L30 1600; cap L1 2, L29 10, L30 10`
- `MEC-003-R4 with factor 0.8 and bonus 2 (test balance) challenge L30 is 1280 ms and cap 12, L29 unchanged`
- `MEC-003-R4 shipped config uses challenge factor 0.8 and bonus 2`
- `MEC-003-R15 challenge rows L5 10 15 20 25 30 exist and introduce no family`
- `MEC-003-R8 a closed ring survives a level up and reopens on its own timer`
- `MEC-003-R5 overflow progress carries into the next level`
- `MEC-003-R6 clearing L30 ends the run with won true and emits runWon without levelUp`
- `MEC-003-R7 no freeze: the snake steps one level-2 tick after the level up`
- `MEC-003-R7 balance has no level.transitionMs (no level-up freeze; banner uses ui.bannerMs)` (R12)
- `MEC-003-R8 obstacles survive a level up, also families not enabled in the new level, and keep their own lifetimes`
- `MEC-003-R8 snip walls survive a level up and end by their own lifetime`
- `MEC-003-R9 rot, director and levelTimeMs keep running after a level up`
- `MEC-006-R13 a skill cast right after a level up is accepted (no busy rejection)` (R10)
- `MEC-003-R11 without a slowdown the first spawn is firstSpawnMs after the level up`
- `MEC-003-R11 the first-spawn timer starts when the slowdown ends`
- R22: all names in `tests/core/slowdown.test.ts` (config and validation, no slowdown for levels 2-5, tier factors, linear ease and exact end, restart on a level up during a slowdown, ramp interaction, Slow-mo max rule)
- `MEC-003-R13 director does not spawn while no mango is on the board`
- `MEC-003-R14 table rows must cover 1..30 without gaps or overlaps`
- `MEC-003-R15 L1 spawns only single rocks; maze never spawns before L26`
- `MEC-003-R16 parseBalance rejects a level that introduces two families`
- `MEC-003-R17 familyRow enables rottenRocks from L12 only` (rock behavior tests: MEC-002 §10)
- `MEC-003-R18 run log keeps the last 500 entries and cumulative deathCounts`
- `MEC-003-R19 run_end record has level score cause durationMs startLevel levelsCleared won`
- `MEC-003-R19 run_end turns counts only turns accepted by the MEC-001 queue`
- `MEC-003-R20 quit and clear do not increment deathCounts`
- Determinism (P0 fuzz) extended: 200 seeds × random turns, start levels 1, 4, 12, 26.

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Core `level` becomes 1-based: every GDD formula, checkpoint and log field is 1-based; P0's 10-level functions are rewritten in P1 anyway, so this avoids a permanent off-by-one layer.
- **L2** Director restarts at 2500 ms each level and maze cooldown resets: the board was just cleared, so each level opens with a short calm. Flow B (2026-11-04): the calm is counted from the end of the level-up slowdown (R11).
- **L3** (superseded 2026-11-04 by level-up flow B) The 1000 ms freeze and crumble were removed: the snake keeps moving with a slowdown (R22) and nothing is rejected.
- **L4** Biome 4–5 reuse biome-3 families plus the existing complex fence shapes (T, Z, F, U, plus) from L13/L16: GDD puts "complex fences" in biome 4; biome 5 gets new families only in P2.
- **L5** Rotten rocks start at L12 (not L11) and last 5000 ms: L11 already introduces rising ground (GDD §5.3 rule 5); 5000 ms is shorter than a small rock's 6000–10000 ms, matching "for a short time".
- **L6** Terrain max active = 1 on every level: GDD §5.1 allows only one big terrain event; P0's 2-terrain late rule was prototype behavior.
- **L7** Run log is a separate 500-entry ring buffer with a debug export: enough for 5 testers × many runs, never risks the save.
- **L8** Challenge multipliers apply after the clamps: keeps challenge levels denser even at the floor (L25, L30) once P2 enables them.
- **L9** (lead, 2026-11-03) Challenge levels are P2 scope (GDD §11): P1 ships the code path and config keys with neutral values (`challengeIntervalFactor = 1`, `challengeCapBonus = 0`) and the challenge banner/HUD marker OFF. `isChallenge` and `levelUp.challenge` exist from P1 so P2 is a config + text change. Replaces former escalation E1.
- **L10** (lead, 2026-11-03) Fairness distances stay at P0 values in P1 (near-head 4, front lane 4 cells). 4 is stricter than GDD §5.3 rule 2's 3 cells, so it complies; any change belongs to the P2 MEC-004 spec.
- Lead review 2026-11-03: L1–L8 accepted (1-based levels, level-up freeze (removed later by flow B), rotten rocks from L12 with 5000 ms life, rising ground max 1, run log key `mango-snake.log`).
### Escalate to owner
- None.
