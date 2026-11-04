# P1 New core loop — design

> Status: Approved (lead, delegated by owner 2026-11-03) · Phase: P1 · Date: 2026-11-03
> **Scope source:** GDD §11 row "P1 New core loop". **Behavior source:** the mechanic specs `docs/specs/mechanics/MEC-001`, `-002`, `-003`, `-006`, `-007`, `-008` (they win over this document for any rule). **Base:** P0 design `docs/superpowers/specs/2026-11-03-p0-foundation-design.md` (§3 architecture incl. §3 HazardFamily, §4 core API; treated as fixed).
> This document owns only what no MEC file owns: module layout, the sim step order, the session flow, the scene flow, test strategy, playtest protocol and the PR breakdown.

## 1. Goal, scope and exit criteria
Turn the P0 port into the GDD v0.2 loop: 30 levels in 6 biomes with length reset and a 1 s transition, energy orbs and 4 skills, a 2-slot loadout, permanent checkpoints with energy carry-over, save v2, and a local run log for the playtest.

In scope: MEC-001 (length reset), MEC-002 (P1 mango rules), MEC-003 (30 levels, existing obstacle families only), MEC-006, MEC-007, MEC-008, local death-cause and run log, greybox Home / Loadout / Results-lite screens.

Exit criteria (GDD §11):
1. `npm test` and `npm run typecheck` pass; `npm run build` succeeds; no console errors on desktop and phone browsers.
2. Every rule ID of the six MEC files has at least one test named with that ID, or is listed as manual in §10.4.
3. **Playtest gate:** 5 testers; ≥ 3 of them replay ≥ 3 times unprompted; skills used in ≥ 50 % of runs (measured from the run log, §11). If it fails, iterate P1.

Precondition: P0 exit criteria passed (P0 design §1).

## 2. Decisions taken for this design
| # | Decision (lead, 2026-11-03) | Rejected |
|---|---|---|
| P1-D1 | Pure `src/session/` module wires save, sim and run log; scenes stay thin | logic in Phaser scenes; `src/meta` as an event reducer importing core |
| P1-D2 | The sim step order lives in `docs/ARCHITECTURE.md` "Sim step order" (text in §5, copied there in PR 1); `sim.ts` is one explicit list of calls, no hooks | step order inside MEC-006; skill hook/plugin system |
| P1-D3 | `rottenRock`, `snipWall`, `rubble` are HazardFamily entries (P0 design §3 HazardFamily) with no warn phase, excluded from the director cap | separate state lists per mechanic |
| P1-D4 | Separate Phaser scenes: Boot → Home → Loadout → Game + Hud → Results; Pause overlay gets "Quit" | one scene with internal panels |
| P1-D5 | Run log buffered in memory, written at run end, on pause and on tab hidden | write on every record |
| P1-D6 | Fuzz extension with skills + test-only ASCII board helper `src/core/testing.ts` | fuzz only; recorded replays |
| P1-D7 | Challenge levels neutral in P1 (MEC-003 L9); fairness distances stay P0 (MEC-003 L10) | GDD §5.2 challenge values now |
Mechanic-level lead decisions are recorded in §11 of each MEC file.

## 3. Architecture
P0 layout (P0 design §3) plus:
```
config/balance.json        v2 keys (§6)
src/core/
  balance.ts               extended Balance type + parseBalance v2 checks (§6)
  level.ts                 1-based formulas, familyRow                          MEC-003
  transition.ts            startLevelUp(), levelStart()                         MEC-003
  snake.ts                 + resetLength(), cutTail()                           MEC-001
  mango.ts                 counters, rot, deferred placement                    MEC-002
  reserved.ts              isReserved(), the single MEC-002-R2 list            MEC-002
  ramp.ts                  rampTick()                                            MEC-008
  energy.ts                gains, orbs                                           MEC-006
  skills.ts                useSkill checks, unlockedSkills, slotCount, mid-run unlocks   MEC-006/007 (file name fixed by MEC-006 §7, MEC-007 §3)
  skills/slowmo.ts · tailSnip.ts · shield.ts · mangoRain.ts                       MEC-006
  hazards/rottenRock.ts · snipWall.ts · rubble.ts   HazardFamily implementations  MEC-002/006
  sim.ts                   createSim(balance, seed, options?), step list (§5)
  testing.ts               test-only: simFromAscii(); NOT exported from index.ts
src/meta/
  save.ts                  v2 envelope, migrations[1], per-field validation      MEC-008-R12
  progression.ts           applyLevelReached, applyRunWon, carryEnergy, nextMilestone   MEC-008
  loadout.ts               sanitizeLoadout                                       MEC-007-R4
  runLog.ts                RunLog load/append/flush, summarizeLog                MEC-003-R18..R21
src/session/               NEW. Pure TS. Imports only src/core/index.ts and src/meta/index.ts
  session.ts               createSession(deps) → Session (§8)
  index.ts
src/game/
  scenes/HomeScene.ts · LoadoutScene.ts · ResultsScene.ts     new
  scenes/BootScene.ts · GameScene.ts · HudScene.ts            changed
  input/skillKeys.ts       pure key → slot map (MEC-007-R14)
  text.ts                  new text keys (MEC files §8)
```
Rules (extend P0 §3):
- `src/meta` still never imports `src/core`. Meta functions take plain config slices typed structurally in meta (e.g. `CheckpointsConfig`, `UnlockTable<Id>`); the core `Balance` groups satisfy them.
- `src/session` imports only the two `index.ts` files; it never imports Phaser, `window`, `document`, `localStorage`, `Math.random`, `Date` or `performance`. Time (`now`) and seeds come in through `SessionDeps`. The P0 boundary test adds `src/session`.
- `src/game` imports `src/session` for everything run-related; it imports `src/core` only for types and pure HUD helpers (`quota`, `isChallenge`, …).
- Sim state is plain JSON-serializable data and `sim.clone()` exists (P0 design §3/§4). P1 adds no closures or class instances to the state.

## 4. Core API delta (by reference)
| Item | Defined in |
|---|---|
| `createSim(balance, seed, options?)`, `SimOptions`, `Loadout`, `RangeError` rule | MEC-003 §7 |
| `useSkill(slot)`, `SkillId`, skill/energy events, snapshot fields, causes `snipWall`/`rubble` | MEC-006 §7 |
| `ate`, `rotted`, `mangoDeferred`, `rottenRocks` snapshot, counters | MEC-002 §7 |
| `shrunk`, `length`, `minLength`, `boardFull` removed | MEC-001 §7 |
| `levelUp` (extended), `transitionEnd`, `runWon`, level snapshot fields, pure exports | MEC-003 §7 |
| `skillUnlocked`, `slotUnlocked`, `unlockedSkills`, `slotCount`, `sanitizeLoadout` | MEC-007 §7 |
| `rampEnded`, `rampActive`, `rampMangoesLeft`, meta progression functions | MEC-008 §7 |

**HazardFamily additions (P1).** P1 builds on the P0 registry (`FAMILIES` ordered, keys `FamilyKey`; members spawn / update / solidAt / bfsWallAt / reservedAt / breakable / snapshot). Names follow the one vocabulary used from P0 on (P2 design §4); P1 uses or adds these members:
- `cause: CauseKey` — cause when the head enters a solid cell.
- `capClass: 'small' | 'big' | 'modifier' | 'none'` (+ `maxActiveKey`) — `small` for rock/fence, `big` for maze/terrain, `none` for `rottenRock`, `snipWall`, `rubble` (created by mechanics, never by the director; no separate `directorSpawned` flag).
- `onLevelEnd(s): void` — level transition (MEC-003-R7 step 1): every entry goes to crumble / fade-out.
- `onBreak(s, x, y): void` — Shield (MEC-006-R26); only on families with `breakable: true` (`rubble` is not).
- Registry order (deterministic iteration, collision cause lookup, snapshot order): `rock, fence, maze, terrain, rottenRock, snipWall, rubble`.

## 5. Moved to docs/ARCHITECTURE.md 'Sim step order'

## 6. Balance config v2
`config/balance.json` keeps the P0 groups and changes them as the MEC §9 tables say. Owners:
| Group | Owner |
|---|---|
| `snake` | MEC-001 §9 |
| `mango` | MEC-002 §9 |
| `level` (incl. `level.table`), `speed`, `director`, `terrain.maxActive`, `log` | MEC-003 §9 |
| `energy`, `skills.<id>.{cost, durationMs, …}` | MEC-006 §9 |
| `loadout`, `skills.<id>.unlockLevel` | MEC-007 §9 |
| `checkpoints` | MEC-008 §9 |
| `rock`, `fence`, `maze`, `terrain` (other keys), `hazard`, `fairness`, `flow` | P0 design §6 (unchanged) |
Removed keys: `director.weights`, `level.unlock`, `level.needPerLevel`, `rock.shapePoolByLevel`, `terrain.maxActiveLate`, `terrain.lateLevel` (MEC-003 §9), and `fence.poolAfterUnlock` (the P0 fence tiers, replaced by `fenceShapes`, MEC-003-R14).
`level.table` format: `{from, to, weights: Partial<Record<'rock'|'fence'|'terrain'|'maze', number>>, rockShapes: string[], fenceShapes: string[], rottenRocks: boolean}[]`.
`parseBalance` runs every check listed in the MEC §9 notes plus MEC-001-R6, MEC-003-R12/R14/R16. The P0 parity-table test is replaced by a v2 table test that pins each MEC §9 value.

## 7. Meta
- **Save v2** (MEC-008 §3, R12): one key `mango-snake.save`; `migrations[1]` v1 → v2; per-field validation. The save type lives in meta: `SaveDataV2 = {bestScore, settings: {sound}, bestLevel, fullClear, unlockedCheckpoints, carriedEnergy, lastLoadout: readonly [string | null, string | null]}`. Skill ids are validated against `loadout.order`, passed in as data.
- **Progression** (MEC-008 §7): pure functions over `SaveDataV2` and `CheckpointsConfig`.
- **Loadout** (MEC-007-R4): `sanitizeLoadout<Id extends string>(saved, bestLevel, table)`.
- **Run log** (MEC-003-R18..R21): own key `mango-snake.log`; `RunLog` keeps an in-memory buffer; `appendRecord` never touches storage; `flushLog(store, log)` writes the whole log (errors swallowed). `summarizeLog(log)` computes the §11 playtest metrics.

## 8. Session flow
```ts
interface SessionDeps { balance: Balance; store: KeyValueStore; newSeed(): number; now(): number }
createSession(deps): Session
```
| Call (from scenes) | Does |
|---|---|
| `homeModel()` | `{checkpoints, defaultStart, carriedEnergy, nextMilestone, showLoadout}` (MEC-008-R4/R11, MEC-007-R1) |
| `loadoutModel()` | `{unlocked, slotCount, selection}` (MEC-007-R3/R6) |
| `confirmLoadout(l)` | saves `lastLoadout` (MEC-007-R9) |
| `startRun(startLevel)` | throws `RangeError` unless `startLevel` is 1 or in `unlockedCheckpoints`; reads `bestLevel = max(1, save.bestLevel)` and loadout = `sanitizeLoadout(lastLoadout, bestLevel, …)` **before** R1 updates the save (MEC-008-R5, MEC-007-R10); then MEC-008-R5 (consume carry) + R1 (start level reached), save, `createSim`, log `run_start` |
| `frame(ms)` | `sim.advance(ms)`, drains events, processes them (below), returns them for rendering |
| `pause()` / `hidden()` | provisional carry (MEC-008-R7) + `flushLog` |
| `quit()` | ends the run with cause `quit` |
| `summary()` | `RunSummary` for Results after the run is over |

Event processing: `levelUp` → `applyLevelReached` (save at once if changed; one `checkpoint_unlocked` record per new checkpoint) + `level_up` record; `runWon` → `applyRunWon`; `skillUsed` → `skill_used` record; `died` / `runWon` / `quit` → run end: `carryEnergy`, `bestScore`, `run_end` record, save + `flushLog`. Every record gets `t = deps.now()` and `runId`.
`RunSummary = {won, cause: CauseKey | 'clear' | 'quit', level, startLevel, levelsCleared, score, bestScore, newBest, carriedEnergy}`.

The P0 game layer keeps the frame clamp, fractional carry, countdown and pause (P0 §4, §7.1); it calls `session.frame(intMs)` instead of `sim.advance`.

## 9. Game layer (greybox)
- **Flow:** Boot (parse balance, `createSession`) → Home → Loadout (only if `showLoadout`) → Game + Hud (countdown 1.5 s) → Results → Play again (no loadout, MEC-007-R2; same start level as the run that just ended, so an L1 farming run repeats at L1) or Home. P0's "any turn input in ready/over starts a run" and the "Play" overlay card are removed; Home and Results replace them.
- **Home:** buttons and stepper per MEC-008 §8; `?debug=1` adds "Export log" (MEC-003-R21).
- **Loadout:** MEC-007 §8.
- **Hud additions:** level/biome label (MEC-003 §8), energy bar and 2 skill buttons (MEC-006 §8), next-checkpoint hint and ramp hint (MEC-008 §8), banners/tooltips per MEC §8 (challenge banner off).
- **Pause overlay:** Resume (countdown, P0) and Quit (→ `session.quit()` → Results).
- **Results-lite:** fields of `RunSummary`; cause text from `text.ts`; Play again / Home. No marbles (P4).
- **Input:** `skillKeys.ts` maps `J`/`Q` → 0, `K`/`E` → 1, ignores auto-repeat; skill input dropped during countdown, pause and over (MEC-007-R14/R15).
- Board rendering adds orbs, rain mangoes, snip wall, rubble, rotten rock crumble and biome ground tint (MEC §8). No art assets.

## 10. Test strategy
1. **Unit tests per rule ID (TDD):** every test name starts with the rule ID (`MEC-006-R21 …`). Core, meta and session tests run in Vitest `node`.
2. **ASCII board helper** (`src/core/testing.ts`, test-only): `simFromAscii(balance, rows, opts)` builds a Sim from a picture of the board (rows describe the top-left region; the rest is empty) plus explicit snake cells, through `simFromState` and the same JSON state shape `sim.clone()` copies. Legend: `.` empty · `M` mango · `G` golden mango · `o` orb · `m` rain mango · `#` rock solid · `w` rock warning · `F` fence solid · `R` rotten rock · `S` snip wall · `u` rubble. Terrain and mazes are built through `opts.extraState` (plain state objects), not the picture. Snake: `opts.snake` (head first), `opts.dir`.
3. **Fuzz extension** (own code, seeded): per seed a random start level from {1, 4, 12, 26}, random start energy 0…50, random valid loadout for `bestLevel` 30, random turns and `useSkill` calls; `npm run test:fuzz` runs 200 seeds (MEC-003 §10, MEC-006-R6) × 30 s sim time (if it exceeds 60 s wall time on the dev machine, shorten the sim time per seed, never the seed count); `npm test` runs 20 seeds × 10 s. Invariants after every 1 ms step: energy in [0, `energy.max`]; snake length ≥ `minLength`; no snake step and no death during the transition; at most one snake step per step; no two objects on one cell in violation of MEC-002-R2; rain progress per cast ≤ its budget; nothing moves after `over`. Determinism: same inputs → same `JSON.stringify(exportState(sim))` for chunking 1 / 7 / 16 / 1000 ms (`exportState` / `simFromState` are internal to `sim.ts`, used by `testing.ts` and tests, not exported from `index.ts`).
4. **Meta tests:** save v1→v2 migration, per-field fixes, progression, sanitize table test (best levels 1–30), run log ring buffer and `summarizeLog`.
5. **Session tests:** in-memory store and fake clock; real sims with fixed seeds and scripted `turn`/`useSkill` inputs: carry consumed at start and written at end/pause; best level and checkpoints saved mid-run; log records and flush points; quit path.
6. **Boundary test:** P0 test extended to `src/session`.
7. **Manual (recorded in `docs/PLAYTEST.md`):** scenes and flows, skill feedback, phone run with no console errors, MEC-007 manual item, MEC feedback sections §8.

## 11. Playtest protocol
- Build: `npm run build`, served over LAN (`vite preview --host`) or a static host; testers open with `?debug=1`.
- Session: each tester plays unprompted for up to 15 min with a fresh save; the observer only notes comments.
- Data: "Export log" per tester → pasted into the `docs/PLAYTEST.md` entry. `summarizeLog` reports runs per session, runs started from Results vs Home, levels reached, death-cause distribution, share of runs with ≥ 1 `skill_used`, checkpoint starts.
- Gate: §1 exit criterion 3. Also record whether checkpoint starts felt fair (GDD §6.4 risk) and causes > 40 % (input for P2).

## 12. Delivery (one PR each, in this order)
| # | Branch | Content |
|---|---|---|
| 1 | `feat/p1-balance-v2` | balance v2 + parseBalance checks, 1-based `level.ts`, family table, ARCHITECTURE "Sim step order", HazardFamily P1 members (types only) |
| 2 | `feat/p1-meta` | save v2 + migration, progression, sanitizeLoadout, runLog |
| 3 | `feat/p1-reset-transition` | length reset, level transition, run win, no board-full win, `simFromAscii` |
| 4 | `feat/p1-mango` | MEC-002 (counters, rotten rock family, deferred placement, reserved list) |
| 5 | `feat/p1-energy` | energy, orbs, golden energy, `SimOptions.startEnergy`, speed ramp |
| 6 | `feat/p1-skills-a` | skill framework, loadout validation, mid-run unlocks, Slow-mo, Tail Snip + snip wall |
| 7 | `feat/p1-skills-b` | Shield + rubble, Mango Rain, skill fuzz |
| 8 | `feat/p1-session` | `src/session`, boundary test, DECISIONS entry for the new module |
| 9 | `feat/p1-scenes` | Home, Loadout, Results-lite, Hud additions, pause Quit, skill input |
| 10 | `chore/p1-playtest` | debug export, `summarizeLog` report, PLAYTEST protocol entry |
Details: `docs/superpowers/plans/2026-11-03-p1-core-loop.md`.

## 13. Risks and open items
- P0 is still being finalized; if the P0 HazardFamily or snapshot names change, PR 1 adapts the names (§4) without changing behavior.
- Checkpoint starts pair slow speed with later-biome obstacles (GDD §6.4): measured in the playtest.
- Fuzz runtime on CI machines: the sim time per seed can drop; the seed count stays 200 (§10.3).
- localStorage writes of a 500-entry log on low-end phones: written only at run end / pause / hidden (P1-D5).
- OPEN items from STATUS (portals, session targets, reason to come back) do not block P1.

## 14. Out of scope for P1
New obstacle families and challenge-level content (P2), MEC-004 fairness changes (P2), art, juice and new sounds beyond the MEC §8 greybox (P3), marbles, results economy, skins, shop (P4), analytics SDK and network (P5), settings screen and optional D-pad setting.
