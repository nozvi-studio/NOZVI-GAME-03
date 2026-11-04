# MEC-003 — Levels & biomes: 30 levels, quotas, speed, transition, director, run log

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- Replaces P0's 10-level progression (P0 design §5 "MEC-003") with 30 levels in 6 biomes, the GDD v0.2 quota/speed/director formulas, an exact level transition, a data-driven per-level obstacle family table, the level-30 run win, and the local run log.
- GDD: §4 (run win), §5.1 (biomes), §5.2 (per-level rules), §5.3 rule 5 (one new family per level), §5.4 (rotten mango → rock), §7, §11 row P1 ("existing obstacle families only", "death causes logged locally"), §12 (analytics events).
- Related: MEC-001 (length reset, freeze), MEC-002 (mango, rot timer), MEC-004 (families, director, fairness), MEC-006 (energy, skills), MEC-007 (loadout), MEC-008 (start level, speed ramp).

## 2. Player-facing summary
- Clear 30 levels; every 5 levels you enter a new biome. (Every 5th level becomes a harder challenge level in P2; in P1 it plays like a normal level.)
- Each level needs a few more mangoes (4 at L1 → 13 at L30) and the snake gets faster (140 ms → 82 ms per step).
- On level up the board clears: obstacles crumble, the snake pops back to 4, and play resumes after about 1 second. Turns pressed meanwhile are kept.
- New obstacle types appear one at a time, with a banner the first time.
- Clearing level 30 wins the run.

## 3. State & data
Core state (`src/core/level.ts`, `src/core/sim.ts`):
| Field | Type | Meaning |
|---|---|---|
| `level` | 1…30 | current level, **1-based** in P1 (lead decision L1) |
| `progress`, `need` | number | bar progress and `quota(level)` (P0 names) |
| `eatenInLevel` | number | defined by MEC-002-R3; reset to 0 by R7 step 1 |
| `phase` | `'playing' \| 'transition'` | transition state (R7) |
| `transitionLeftMs` | number | ms left in the transition, 0 while playing |
| `levelTimeMs`, `timeMs` | number | sim ms in the current level (excluding transition) / since run start |
| `startLevel`, `levelsCleared` | number | from `createSim` options / levels cleared in this run |
Derived (pure functions, not stored): `biome(n)`, `isChallenge(n)`, `quota(n)`, `levelTickMs(n)`, `directorIntervalMs(n)`, `smallHazardCap(n)`, `familyRow(n)`.
Save fields: none here (best level, checkpoints: MEC-008). Local run log: separate storage key (R17).

## 4. Rules
### Structure and formulas (n = level, 1-based)
- **MEC-003-R1 Biomes.** `biome(n) = floor((n − 1) / 5) + 1` (1…6). `isChallenge(n) = (n mod 5 = 0)` → L5, 10, 15, 20, 25, 30.
- **MEC-003-R2 Quota.** `quota(n) = 4 + floor((n − 1) / 3)`. L1 = 4, L30 = 13, sum L1…L30 = 255.
- **MEC-003-R3 Speed.** `levelTickMs(n) = 140 − 2 × (n − 1)`. L1 = 140, L30 = 82. The live tick is `levelTickMs(level)` except during the MEC-008 ramp; MEC-006 Slow-mo multiplies the live tick.
- **MEC-003-R4 Director.** `directorIntervalMs(n) = max(1600, 5000 − 120 × n)`; `smallHazardCap(n) = min(10, 2 + floor(n / 3))`. On challenge levels: interval = `floor(directorIntervalMs(n) × director.challengeIntervalFactor)`, cap = `smallHazardCap(n) + director.challengeCapBonus`, both applied after the min/max clamps. The cap counts non-maze hazards (P0). **P1 config is neutral** (factor 1, bonus 0, lead decision L9), so challenge levels play like normal levels in P1 (L30: 1600 ms, cap 10); P2 sets the GDD §5.2 values (0.8 / +2 → L30: 1280 ms, cap 12) in config only.
### Progress, level up, run win
- **MEC-003-R5 Progress.** Eating adds progress (normal 1, golden 2; MEC-002). While `progress ≥ need` and level < 30: `progress −= need`, level += 1 (P0 overflow loop). At most one level up per step in practice (max overflow 1).
- **MEC-003-R6 Run win.** When `progress ≥ need` at level 30: `levelsCleared = 30`, status `over`, outcome `{won: true}`, emit `runWon`. No length reset, no transition. This is the only run win (MEC-001-R10).
### Level transition (all times in sim ms, t = 0 is the level-up step)
- **MEC-003-R7 Sequence.**
  1. t = 0, inside the eating step, in this order: eat resolves (MEC-001-R5) → length reset (MEC-001-R4) → `level += 1`, `levelsCleared += 1`, `progress` = overflow, `eatenInLevel = 0`, `levelTimeMs = 0` → every hazard in any state (warn, solid) and every rotten rock switches to `crumble` (cells off, not solid), every terrain sends all cells down and starts its fade-out → if the level up came from the regular mango, MEC-002-R8(b) places the next one (crumbling cells still count as reserved, MEC-002-R2; a level up from a rain mango keeps the regular mango) → `phase = 'transition'`, `transitionLeftMs = 1000` → emit `shrunk`, then `levelUp`.
  2. 0 < t < 1000: only `timeMs`, the transition timer, crumble timers (`hazard.crumbleMs`, 450 ms: hazards, rotten rocks, MEC-006 snip wall and rubble) and terrain fade-out (500 ms) advance. Removed objects disappear at t = 450 / 500. (Position in the 1 ms step: ARCHITECTURE "Sim step order", see MEC-006-R35.)
  3. t = 1000: `phase = 'playing'`, emit `transitionEnd`. The tick accumulator restarts at 0, so the first snake step happens at t = 1000 + live tick.
- **MEC-003-R8 What crumbles.** All MEC-004 hazards, rotten rocks and any MEC-006 temporary walls/rubble. Nothing temporary survives a level up.
- **MEC-003-R9 What is frozen** during the transition: snake (MEC-001-R9), mango rot timer and placement-retry timer (MEC-002-R10), director timer, maze cooldown, `levelTimeMs`, and every MEC-006 timer (orb spawn, orb life, active skill durations, rain mango life). `timeMs` keeps counting.
- **MEC-003-R10 Input during transition.** `turn()` is queued (no steering input lost). Skill casts are rejected by the sim without spending energy and are not buffered (MEC-006-R13 reason `busy`, event and feedback owned by MEC-006).
- **MEC-003-R11 Level start.** At transition end (and at run start for `startLevel`) the director timer is set to `director.firstSpawnMs` (2500) and the maze cooldown to 0.
- **MEC-003-R12 Transition length guard.** `parseBalance` requires `level.transitionMs ≥ max(hazard.crumbleMs, terrain.fadeOutMs)`.
- **MEC-003-R13 Empty mango slot.** While no mango is on the board (MEC-001-R10), the director does not spawn.
### Obstacle families per level (P1 = existing families only)
- **MEC-003-R14 Family table.** `level.table` is an ordered list of rows `{from, to, weights, rockShapes, fenceShapes, rottenRocks}`. Rows cover 1…30 exactly once (validated). A family is enabled on level n iff it has a weight > 0 in `familyRow(n).weights`. The director (MEC-004) uses those weights instead of P0's unlock levels; `rock.shapePoolByLevel` and the P0 fence tiers are replaced by `rockShapes` / `fenceShapes`. Unknown family keys or shape names fail `parseBalance`. P2 adds families by adding weight keys, shape lists and family parameter groups (data), plus the family's code.
- **MEC-003-R15 P1 table.**

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
  `run_start {startLevel, startEnergy, loadout, entry ('home' | 'results')}` · `level_up {level (new level), levelTimeMs (= levelUp.clearedLevelTimeMs)}` · `skill_used {skill, level, energyBefore}` (from MEC-006's event) · `checkpoint_unlocked {level (start level unlocked), reachedLevel}` (MEC-008) · `run_end {level, score, cause, durationMs (= sim timeMs), startLevel, levelsCleared, won}`. `marble_shot`, `skin_unlocked` and the `marbles` field of `run_end` start in P4.
- **MEC-003-R20 Causes.** `run_end.cause` is the death `CauseKey` (P0 list plus any key MEC-006 adds), `clear` for a run win, `quit` when the player quits from the pause overlay. `deathCounts` increments only for death causes.
- **MEC-003-R21 Export.** With the URL flag `?debug=1`, Home shows an "Export log" button that copies the log JSON to the clipboard (for `docs/PLAYTEST.md`). No network.

## 5. Edge cases
1. **Golden mango at `need − 1`:** level up with progress 1 in the new level (R5).
2. **Level up while a maze is warning:** it switches to crumble without ever landing (R7.1).
3. **Snake standing on a warning terrain cell at level up:** the cell goes down; no death possible during the transition (no solid cells, snake frozen).
4. **Mango at level up:** if the level up came from eating the regular mango, the next one is placed at t = 0 and its rot timer starts at t = 1000. If it came from a Mango Rain mango, the regular mango stays with its frozen timer (MEC-002-R8, EC4).
5. **Pause during the transition:** the game layer stops calling `advance`; the transition resumes where it stopped.
6. **Player quits during the transition:** logged as `quit` with the new level as `level`.
7. **Start at a checkpoint level (MEC-008):** no `levelUp` and no introduction banner for that level; R11 applies; `levelsCleared` starts at 0.
8. **Rotten rock rotting near the head:** P0 fairness: unfair → no rock (MEC-002-R6).
9. **Challenge interval rounding (P2 values):** `5000 − 120n` is a multiple of 40, so × 0.8 is an integer; `floor` is kept for safety. With the P1 factor 1 the interval is unchanged.
10. **Director wants a maze while a terrain is active (L26+):** P0 exclusion; it picks among the remaining options.

## 6. Interactions with other mechanics
- **MEC-001:** R7 calls the length reset; transition freeze MEC-001-R9; board full no longer wins.
- **MEC-002:** `eatenInLevel` resets each level (GDD §7 rot formula "eaten in level"); rot timer frozen in transitions; the family table enables rotten rocks (R17), MEC-002 owns their behavior and lifetime.
- **MEC-004:** director reads R4 interval/cap and the R14 table; hazards crumble on level up; fairness rules unchanged.
- **MEC-006:** energy and orbs persist across levels (GDD §6.1); its timers freeze in transitions; casts rejected in transitions; temporary walls crumble.
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
- `SimSnapshot` adds: `biome`, `challenge`, `phase`, `transitionLeftMs`, `levelTimeMs`, `timeMs`, `startLevel`, `levelsCleared`. `level` becomes 1-based.
- `SimEvent` changes: `levelUp {level, biome, challenge, biomeChanged, unlocked?: FamilyKey, clearedLevelTimeMs}` (extends P0 `levelUp`); new `transitionEnd {level}`, `runWon {score, timeMs}`. `FamilyKey = 'rock' | 'fence' | 'terrain' | 'maze' | 'rottenRock'` (P2 extends).
- Pure exports from `src/core/index.ts`: `quota`, `levelTickMs`, `biome`, `isChallenge` (for HUD and tests).

## 8. Feedback in P1 (greybox)
- `levelUp`: banner `banner.levelUp` "Level {n}" + `banner.freshStart`; if `biomeChanged`: `banner.biome.{1..6}` ("Mango Orchard" … "Storm Garden"); if `unlocked`: P0 family banner text key `banner.new.{family}` (adds `rottenRock`: "Rotten mangoes turn to rock!").
- **Challenge banner and HUD marker are OFF in P1** (lead decision L9): the game layer ignores `levelUp.challenge`; no `banner.challenge.*` keys exist yet. P2 adds `banner.challenge.{5,10,…,30}` ("Rock rain" … "Final storm") and the level-label marker (color + "!" icon, not color only).
- HUD: "L{n} · Biome {b}" and the quota bar `progress/need`.
- Board: greybox ground tint per biome (6 flat colors in the game layer's palette, not config).
- Sounds: reuse P0 `level` for level up and biome change; `runWon` reuses `level` played twice. No new assets.

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `level.maxLevel` / `level.perBiome` | 30 / 5 (P0 key `maxLevel` kept, now 1-based last level) | GDD §5.1 |
| `level.needBase` / `level.needStepLevels` | 4 / 3 | GDD §5.2 |
| `level.transitionMs` | 1000 | GDD §5.2 "≈1 s" |
| `level.table` | R15 rows | GDD §5.1/§5.4 + lead decisions L4–L6 |
| `speed.startMs` / `speed.msPerLevel` / `speed.minMs` | 140 / 2 / 82 | GDD §5.2 (minMs = L30 value, safety clamp) |
| `director.intervalBaseMs` / `intervalPerLevelMs` / `intervalMinMs` | 5000 / 120 / 1600 | GDD §5.2 |
| `director.capBase` / `capPerLevels` / `capMax` | 2 / 3 / 10 | GDD §5.2 |
| `director.challengeIntervalFactor` / `challengeCapBonus` | **1 / 0 in P1** (P2: 0.8 / 2, GDD §5.2) | lead decision L9 |
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
- `MEC-003-R5 overflow progress carries into the next level`
- `MEC-003-R6 clearing L30 ends the run with won true and emits runWon without levelUp`
- `MEC-003-R7 transition lasts 1000 ms and first snake step is at 1000 + tick`
- `MEC-003-R7 all hazards and rotten rocks are non-solid from t = 0 and gone by t = 500`
- `MEC-003-R9 rot timer, director timer and levelTimeMs do not advance during transition`
- `MEC-003-R10 turns queued during transition are applied afterwards`
- `MEC-003-R11 first spawn of each level is 2500 ms after transition end`
- `MEC-003-R12 parseBalance rejects transitionMs below crumble or fade-out time`
- `MEC-003-R13 director does not spawn while no mango is on the board`
- `MEC-003-R14 table rows must cover 1..30 without gaps or overlaps`
- `MEC-003-R15 L1 spawns only single rocks; maze never spawns before L26`
- `MEC-003-R16 parseBalance rejects a level that introduces two families`
- `MEC-003-R17 familyRow enables rottenRocks from L12 only` (rock behavior tests: MEC-002 §10)
- `MEC-003-R18 run log keeps the last 500 entries and cumulative deathCounts`
- `MEC-003-R19 run_end record has level score cause durationMs startLevel levelsCleared won`
- `MEC-003-R20 quit and clear do not increment deathCounts`
- Determinism (P0 fuzz) extended: 200 seeds × random turns, start levels 1, 4, 12, 26.

## 11. Lead decisions & escalations
### Lead decisions
- **L1** Core `level` becomes 1-based: every GDD formula, checkpoint and log field is 1-based; P0's 10-level functions are rewritten in P1 anyway, so this avoids a permanent off-by-one layer.
- **L2** Director restarts at 2500 ms each level and maze cooldown resets: the board was just cleared, so each level opens with a short calm that shows the shrink and new banner.
- **L3** Snake frozen for the whole 1000 ms transition, turns queued, skill casts rejected: freezing makes "no input lost" exact and stops deaths on a board that is changing.
- **L4** Biome 4–5 reuse biome-3 families plus the existing complex fence shapes (T, Z, F, U, plus) from L13/L16: GDD puts "complex fences" in biome 4; biome 5 gets new families only in P2.
- **L5** Rotten rocks start at L12 (not L11) and last 5000 ms: L11 already introduces rising ground (GDD §5.3 rule 5); 5000 ms is shorter than a small rock's 6000–10000 ms, matching "for a short time".
- **L6** Terrain max active = 1 on every level: GDD §5.1 allows only one big terrain event; P0's 2-terrain late rule was prototype behavior.
- **L7** Run log is a separate 500-entry ring buffer with a debug export: enough for 5 testers × many runs, never risks the save.
- **L8** Challenge multipliers apply after the clamps: keeps challenge levels denser even at the floor (L25, L30) once P2 enables them.
- **L9** (lead, 2026-11-03) Challenge levels are P2 scope (GDD §11): P1 ships the code path and config keys with neutral values (`challengeIntervalFactor = 1`, `challengeCapBonus = 0`) and the challenge banner/HUD marker OFF. `isChallenge` and `levelUp.challenge` exist from P1 so P2 is a config + text change. Replaces former escalation E1.
- **L10** (lead, 2026-11-03) Fairness distances stay at P0 values in P1 (near-head 4, front lane 4 cells). 4 is stricter than GDD §5.3 rule 2's 3 cells, so it complies; any change belongs to the P2 MEC-004 spec.
- Lead review 2026-11-03: L1–L8 accepted (1-based levels, 1000 ms transition, rotten rocks from L12 with 5000 ms life, rising ground max 1, run log key `mango-snake.log`).
### Escalate to owner
- None.
