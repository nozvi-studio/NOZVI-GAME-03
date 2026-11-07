# MEC-008 — Checkpoints: milestone start levels, energy carry-over, speed ramp, unlocks, save v2

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03

## 1. Purpose & links
- After a player has reached a milestone level, new runs can start at a later level at L1 speed, with part of the last run's energy, so a death feels like progress and farming energy pays off.
- GDD: §2.1, §3b (staged skill unlocks), §4 (after a death), §6.1 (start energy), §6.4 (checkpoints, owner decisions), §7 (checkpoint row), §8.4 (save data), §10.3 (Home screen), §12 (`checkpoint_unlocked`, `run_start`).
- DECISIONS 2026-11-03 "Checkpoints are milestone start levels for new runs".
- Related: MEC-001 (start state), MEC-003 (levels, `startLevel`, run log), MEC-006 (energy, skills), MEC-007 (loadout), MEC-009 (P4 rewards use `levelsCleared`).

## 2. Player-facing summary
- Reach L10, 15, 20, 25 or clear L30 to unlock a later start level (L4, 6, 8, 10, 12) for all future runs. Unlocks are permanent.
- Home offers "Play from checkpoint L__" (highest by default) and "Play from L1".
- Half of the energy you hold when a run ends (max 50) is saved and becomes your next run's start energy.
- A checkpoint run starts slow and speeds up to that level's normal speed over the first 5 mangoes.
- Skills unlock by the best level you have ever reached, so checkpoint runs always have your skills.

## 3. State & data
Core state (`src/core/sim.ts`): `startLevel` (MEC-003), `rampEaten` (mangoes eaten while the ramp is active), `rampActive` (boolean).
Meta (`src/meta/progression.ts`, pure): milestone and unlock logic over the save data.
Save fields (envelope v2, R12):
| Field | Type | Default | Meaning |
|---|---|---|---|
| `bestScore` | int ≥ 0 | 0 | P0 field, unchanged |
| `settings.sound` | boolean | true | P0 field, unchanged |
| `bestLevel` | int 0…30 | 0 | highest level ever reached (R1); 0 = never played |
| `fullClear` | boolean | false | L30 cleared at least once |
| `unlockedCheckpoints` | int[] (1…30), ascending, unique | [] | unlocked start levels |
| `carriedEnergy` | int 0…50 | 0 | start energy of the next run |
| `lastLoadout` | `[SkillId \| null, SkillId \| null]` | `[null, null]` | owned by MEC-007 (shape and validation); MEC-008 only adds it to the envelope |
Unlocked skills are **not** stored: they are derived from `bestLevel` by MEC-007's `unlockedSkills(balance, bestLevel)` (R10).

## 4. Rules
- **MEC-008-R1 Reached.** Level n is "reached" when it becomes the current level: the run's start level at run start, or the new level of a `levelUp` event. `bestLevel = max(bestLevel, n)` is saved immediately each time.
- **MEC-008-R2 Milestones.** `checkpoints.milestones` = `[{reach 10, start 4}, {reach 15, start 6}, {reach 20, start 8}, {reach 25, start 10}, {reach 30, start 12, requiresClear true}]`. A milestone unlocks when `bestLevel ≥ reach`, or, if `requiresClear`, when the run wins (MEC-003-R6) and sets `fullClear = true`.
- **MEC-008-R3 Permanence.** Unlocking adds `start` to `unlockedCheckpoints` and saves immediately (mid-run, before the run ends). Entries are never removed, also if the config milestones later change.
- **MEC-008-R4 Start choice.** If `unlockedCheckpoints` is empty, Home shows only "Play" (start L1). Otherwise Home shows a primary "Play from checkpoint L{s}" with `s` = highest unlocked by default, a ◀ ▶ stepper over all unlocked checkpoints, and a secondary "Play from L1". The selection is not saved; Home always defaults to the highest.
- **MEC-008-R5 Run start.** The game layer reads `startEnergy = carriedEnergy`, then sets `carriedEnergy = 0` and saves, then calls `createSim(balance, seed, {startLevel, startEnergy, loadout, bestLevel})` (`SimOptions`, MEC-003 §7; `loadout` and `bestLevel` per MEC-007-R10), with `bestLevel = max(1, save.bestLevel)` read before R1 updates it for this run. The start state is MEC-001-R2 + level `startLevel`, progress 0, score 0, MEC-002-R3 counters 0 (golden gating restarts per run).
- **MEC-008-R6 Carry-over.** When a run ends (death, L30 clear or quit from pause), `carriedEnergy = min(50, floor(energy × 0.5))` using the energy at that moment (MEC-006 snapshot `energy`), and is saved. The value is used whatever level the next run starts at, including L1.
- **MEC-008-R7 Provisional carry.** Whenever the game layer pauses a run (pause button, keys, tab hidden, window blur), it saves `carriedEnergy` with the R6 formula from the current energy. Closing the game mid-run therefore behaves like ending the run at the last pause; R6 overwrites it at the real run end.
- **MEC-008-R8 Speed ramp.** Let `T1 = levelTickMs(1)` (140), `Ts = levelTickMs(startLevel)`, `d = T1 − Ts`, `R = checkpoints.rampMangoes` (5), `k = rampEaten`. While `rampActive`, the live tick (before MEC-006 Slow-mo) is `rampTick(k) = T1 − floor((2·d·k + R) / (2·R))` (linear, rounded half up, integer ms). `rampActive` starts true; `rampEaten` += 1 for every mango eaten (normal, golden, Mango Rain). The ramp ends (`rampActive = false`, live tick = `levelTickMs(level)`) when `k ≥ R` or on the first level up, whichever comes first. A start at L1 has `d = 0`, so the ramp has no effect.
- **MEC-008-R9 Ramp timing.** The new tick applies from the next snake step after the eating step (P0 speed update order).
- **MEC-008-R10 Skill unlocks.** Skill unlocks depend only on the saved `bestLevel` (GDD §6.4): unlocked skills = MEC-007's `unlockedSkills(balance, bestLevel)` with the unlock levels in `skills.<id>.unlockLevel` (MEC-007 §9: 3 / 6 / 11 / 16, GDD §3b). Because R1 saves `bestLevel` at every level reached, an unlock earned mid-run is permanent even if the run ends a moment later, and a checkpoint start always has every skill earned so far. Mid-run unlock events and slot filling are MEC-007-R12.
- **MEC-008-R11 Next milestone hint.** The HUD shows "Next checkpoint at L{reach}" for the lowest milestone not yet unlocked, "Next checkpoint: clear L30" for the `requiresClear` milestone, and nothing when all are unlocked.
- **MEC-008-R12 Save v2 and migration.** Current save version becomes 2. `migrations[1]` maps `{version 1, data {bestScore, settings {sound}}}` to v2 by keeping both P0 fields and adding every other §3 field with its default. Loading v2 validates **per field**: a missing or invalid field gets its default and the rest is kept (`carriedEnergy` and `bestLevel` are floored and clamped into range; non-integer and out-of-range checkpoints are dropped and the array is de-duplicated and sorted; a `lastLoadout` that is not a 2-element array of skill ids or `null` becomes `[null, null]`, deeper fixes are MEC-007-R4/R5). Envelope-level problems (unparsable JSON, missing `version`/`data`, future version) keep the P0 rule: full defaults.

## 5. Edge cases
1. **Reaching L10 and L15 in one run:** two separate unlocks and banners at the two `levelUp` events.
2. **Death before the first mango at a checkpoint start:** tick was 140; carry uses the energy at death (R6).
3. **Clearing the start level in fewer than 5 mangoes** (golden gives progress 2): the ramp ends at that level up; the next level uses its normal tick (GDD "later levels use their normal speed").
4. **Full clear:** `fullClear = true`, L12 unlocked, carry = 50% of the energy at the clear (max 50).
5. **Quit from the pause overlay:** ends the run (MEC-003-R20 `quit`); R6 applies.
6. **Run start with carry 50 then closing the tab before any pause event:** the tab-hidden event pauses first (P0 flow), so R7 saves the current carry; if the browser is killed without any event, the carry is lost (it was consumed at R5). Accepted.
7. **Corrupt save: `carriedEnergy` = 999 / −5 / 12.7:** 50 / 0 / 12.
8. **`unlockedCheckpoints` contains 5 after a config change:** kept and offered (R3 permanence) because 5 is an integer in 1…30.
9. **Checkpoint start at L12:** no introduction banner for rotten rocks (MEC-003 EC7); skills are all unlocked because L12 requires a full clear (`bestLevel` 30).
10. **Slow-mo during the ramp:** Slow-mo multiplies `rampTick(k)` (MEC-006 owns the multiplier).
11. **v1 save with `bestScore` 120:** migrates to v2 with `bestScore` 120, `bestLevel` 0, no checkpoints; Home shows only "Play".
12. **Saved `lastLoadout` holds a skill locked at the saved `bestLevel`:** MEC-007 sanitizing decides; MEC-008 only stores the field.
13. **Mango Rain mangoes during the ramp:** each one counts as an eaten mango (MEC-006 `ate.source = 'rain'` is not filtered), so Rain shortens the warm-up.

## 6. Interactions with other mechanics
- **MEC-001:** same start cells and length for every start level.
- **MEC-002:** golden gating counts regular mangoes from the run start (MEC-002-R5, GDD §7 "after 3 eaten in the run"), so a checkpoint run waits 3 mangoes for golden. Rotten rocks follow the start level's table row (a start at L12 has them from the first mango).
- **MEC-003:** `startLevel` option, `levelUp`/`runWon` drive R1–R3; run log records `run_start` and `checkpoint_unlocked`; `levelsCleared` excludes skipped levels (GDD §6.4 rewards, MEC-009).
- **MEC-004:** a checkpoint start uses that level's family table row (MEC-003-R15) from the first second; the GDD §6.4 fairness risk is measured in the P1 playtest.
- **MEC-006:** provides `energy` at run end; validates `startEnergy` (MEC-006-R1: integer in [0, `energy.max`]); R6 guarantees ≤ 50. Slow-mo multiplies the ramp tick (MEC-006-R17).
- **MEC-007:** derives unlocked skills and slot count from the saved `bestLevel`; owns `lastLoadout`, the slot-2 unlock and mid-run unlock events.

## 7. Core API changes
- Uses `SimOptions.startLevel`, `startEnergy` and `bestLevel` (defined once in MEC-003 §7). `startEnergy` validation is MEC-006-R1. The core does not know which checkpoints are unlocked (the game layer only offers unlocked ones).
- `SimSnapshot` adds `rampActive: boolean` and `rampMangoesLeft: number` (`max(0, R − rampEaten)` while active, else 0).
- `SimEvent` adds `rampEnded {level}` (emitted once when R8 ends the ramp; not emitted for a start at L1).
- `src/meta` adds pure `progression.ts`: `applyLevelReached(data, level, balance) → {data, newCheckpoints}`, `applyRunWon(data, balance)`, `carryEnergy(energy, balance)`, `nextMilestone(data, balance)`, and `save.ts` gets `migrations[1]` + per-field v2 validation.

## 8. Feedback in P1 (greybox)
- Home: buttons `home.playCheckpoint` "Play from checkpoint L{s}", `home.playL1` "Play from L1", `home.play` "Play"; stepper arrows; a small line `home.carry` "Start energy: {e}" when `carriedEnergy > 0`.
- In run: `banner.checkpoint` "Next run starts at L{s}!" with `tip.checkpoint` "Checkpoints are permanent. Your saved energy comes with you." on the first unlock (skill unlock tooltips are MEC-007's); HUD `hud.nextCheckpoint` per R11; while `rampActive`, HUD shows `hud.ramp` "Warming up {n}".
- Sounds: reuse P0 `level` for checkpoint unlock and skill unlock; `rampEnded` reuses `go`.
- P3b-3 restyle: see docs/superpowers/plans/2026-11-07-p3b-3-menus.md (copy and layout only; rules unchanged).

## 9. Tuning
| Key | Value | Source |
|---|---|---|
| `checkpoints.milestones` | `[{reach:10,start:4},{reach:15,start:6},{reach:20,start:8},{reach:25,start:10},{reach:30,start:12,requiresClear:true}]` | GDD §6.4 |
| `checkpoints.carryRatio` | 0.5 | GDD §6.4 |
| `checkpoints.carryMax` | 50 | GDD §6.4 |
| `checkpoints.rampMangoes` | 5 | GDD §6.4 |
| `save.version` (code constant) | 2 | lead decision L6 |
Ramp start tick is `speed.startMs` (140, MEC-003 §9); skill unlock levels are `skills.<id>.unlockLevel` (MEC-007 §9). No separate keys here.

## 10. Acceptance tests
- `MEC-008-R1 bestLevel updates on run start and on every levelUp`
- `MEC-008-R2 reaching L10 unlocks start L4; reaching L30 without clearing does not unlock L12`
- `MEC-008-R2 runWon unlocks L12 and sets fullClear`
- `MEC-008-R3 unlocked checkpoints are saved mid-run and never removed`
- `MEC-008-R4 home defaults to the highest unlocked checkpoint and offers L1`
- `MEC-008-R5 run start consumes carriedEnergy and passes it as startEnergy`
- `MEC-008-R6 carry of 37 energy is 18, of 100 is 50, of 0 is 0`
- `MEC-008-R7 pausing saves the provisional carry`
- `MEC-008-R8 ramp from L4 gives ticks 140 139 138 136 135 134`
- `MEC-008-R8 ramp from L12 gives ticks 140 136 131 127 122 118`
- `MEC-008-R8 ramp ends on the first level up before 5 mangoes`
- `MEC-008-R8 start at L1 keeps tick 140 and emits no rampEnded`
- `MEC-008-R10 bestLevel saved at L11 mid-run gives slowmo tailSnip shield on the next loadout even after an immediate death`
- `MEC-008-R8 rain mangoes advance the ramp`
- `MEC-008-R11 next milestone hint is L10, then L15, then clear L30, then hidden`
- `MEC-008-R12 v1 save migrates to v2 keeping bestScore and sound`
- `MEC-008-R12 invalid carriedEnergy alone is reset to default without losing bestLevel`
- `MEC-008-R12 future version still loads full defaults`

## 11. Lead decisions & escalations
### Lead decisions
- **L1** "Reached" = level entered (current level), and the L30 milestone needs the clear: GDD §6.4 says "Reach (best ever)" but labels L30 "(full clear)"; entering L10 is the natural reading for the others.
- **L2** Carry is consumed at run start and rewritten at run end and on every pause: closing the game cannot replay or keep an old carry, yet the carry still "survives closing the game" (GDD §6.4).
- **L3** A run win and a quit also carry energy with the same formula: one rule for every run end is easier to read; GDD only names death.
- **L4** Ramp counts every eaten mango and ends at the first level up: matches "first 5 mangoes eaten" and "later levels use their normal speed"; rounding half up in integer arithmetic keeps ticks integer and deterministic.
- **L5** Stepper to pick any unlocked checkpoint, default highest, not remembered: GDD says "default: highest", which implies a choice; not remembering keeps the default true.
- **L6** One save bump v1 → v2 for all P1 fields, with per-field validation: a single bad field must not wipe checkpoints and best level.
- **L7** Checkpoints are stored explicitly (permanence must survive future milestone config changes); unlocked skills stay derived from `bestLevel` as MEC-007 specifies (GDD §6.4 ties them to the best level), so GDD §8.4's "unlocked skills" is satisfied by the saved `bestLevel`.
- **L8** Mango Rain mangoes count toward the 5-mango ramp: GDD says "first 5 mangoes eaten" without exceptions; spending 80 energy to warm up faster is a fair trade.
- **L9** (lead, 2026-11-03) GDD §8.4 "unlocked skills" is derived from `bestLevel`, not stored (same decision as MEC-007 §11).
- Lead review 2026-11-03: L1–L8 accepted (ramp formula R8, energy carry on death, win and quit).
### Escalate to owner
- None.
