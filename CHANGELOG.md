# Changelog
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: SemVer (0.x until first public release).

## [Unreleased]
- feat(audio): P3a synth SFX: soft two-stage energy zap, distinct per-skill casts, biome jingle, checkpoint fanfare; `SFX_TONES` exported (P3a-R2, R3, R5, R6).
- feat(config): P3a `balance.juice` block (bursts, haptics, death <= 1.5 s, reduced-motion and perf caps) with validation (P3a-R7, R8, R11).
- fix(hud): restore the design-pinned `pausedText` string (P0 design §7.5) and its test pins; banner reset clears the pop scale; MEC-003/MEC-007 text-key references and the DECISIONS 2026-11-07 P3b-2 ramp chip note updated.
- fix(hud): P3b-2 final review: banner cards stack from the measured title height and long challenge titles shrink to fit; the Warming up chip shows only for checkpoint starts (MEC-008-R8); per-frame HUD redraws cached; banner hide() also hides the tip. The old level-up white flash overlay was removed with the greybox HUD (juice is owned by P3a).
- P3b-2 in-run HUD and overlays: D2 HUD (level + biome, quota, score, energy pills, skill buttons, checkpoint chip), optional D-pad (Settings), pause (Resume / Settings / Quit run), countdown, banner queue, skill pills; haptics follow the Settings toggle; fix: starting a run while one is active logs it as quit; `abandonedRuns` helper.
- P3b-3 menu screens: D2 Boot/Home/Loadout/Results, new Settings scene, settings saved immediately, balance-driven skill cards.
- feat(game): P3b-1 board art: biome grounds (checker + grid), light/dark board themes, D2 rocks/crumble/warn tiles (ring + dashes + shape), fences, hedges, mud/ice/rising stone, mango icon; pure `biomePalette`/`boardParts`.
- feat(game): P3-0 UI foundation: D2 tokens, mockup layout, self-hosted fonts (Nunito, Lilita One), settings in save v3, widget kit; palette follows the OS live while theme/motion settings are unset.
- docs: import D2 UI mockups (32 boards: static HTML primary, .dc.html source + canvas.json, PNG for reference only) and `docs/design/UI-MOCKUPS.md` (tokens, board-to-code map, agent rules) for P3 screens
- fix(game): capy SVGs load as base64 data URLs (Phaser treats data: URLs as base64); body feet no longer clipped
- feat(game): debug capy art preview page (`?debug=1&artPreview=1`)
- feat(game): capy face on the snake head (Boot rasterises capy SVGs; idle/eat/dead on the board)
- feat(game): capy face pose state machine (idle breath/blink, eat, dead droop; reduced motion) and `ui.capy` balance
- feat(game): pure capy SVG rig (12 expressions, 2 body poses) on the ART-001 anchors
- docs: P3c capy character design spec (layered SVG per Figma + outline, idle/eat/dead motion, preview page); ART-001 v3, ART-002 demoted to fallback; Figma capy reference added
- docs: ART-002 capy master still brief and `assets/raw/master/capy/specs/` (body and head spec JSON for agent-sprite-forge via Codex CLI, acceptance checklist, Remotion motion test)
- docs: ART-001 character coordinate system draft (capy reference, anchors, action list, asset folders, no-API-key production routes); assets/work git-ignored; v2 applies owner answers (GDD outline, head + body, 256/384 px, 12 fps, Remotion route)
- feat(game): run start waits for the first direction input after the countdown (new `waiting` flow phase, wait hint on the HUD, reverse input ignored; owner 2026-11-06, MEC-001-R2)
- feat(game): debug "+1" and "Key" level-skip buttons in the HUD (`?debug=1` only); `Sim.debugSkipTo`, `Session.debugSkipTo`, `keyLevels`/`nextKeyLevel`, `debug_skip` log record marks the run debug (MEC-003-R21)
- fix(core): Shield breaks without leaving rubble (MEC-006-R28, owner 2026-11-06); bonk pause stays, `shieldBroke` loses its `rubble` field
- docs: P2 exit check entry in PLAYTEST (agy QA 9/10 + banner fix, reduced fuzz pass) and STATUS after P2c
- fix(game): challenge banner shows on run start (HudScene shows runStartLines in create(); Hud launches after Game's newRun)
- fix: P2c final review fix-ups (debug run marker excluded from deathCauseReport/summarizeLog, bot board-size verdict skipped on partial level ranges, MEC-018 R7 event names)
### Added
- fix(core): shrink waits while another hazard holds a ring cell (MEC-018-R1); full-table fuzz I5 now clean
- test: P2 exit fairness per family and full-table L30 fuzz (`tests/core/fairness/fullTable.test.ts`)
- feat(game): debug start level `?debug=1&level=N` (N 1..30) for browser QA; the run writes no best level, checkpoint or full-clear progress (MEC-003-R21)
- chore(config): per-biome director tuning from the L1-30 bot report (fence 1 in L11-14, coconut 1 in L16-19 rows) and feat(tools): board-size check (`tools/bot/boardSize.ts`, MEC-004-R20); bot defaults L1-30, 20 seeds, 180 s (P2 design sections 13, 16, 17)
- feat(meta): deathCauseReport (deaths only, family vs player causes, over40 and review lists) for the P2 40% rule; included in the debug __summarize output (TR-C6)
- feat(game): challenge level banners (levelUpLines) and HUD star marker (levelLabel) in src/game/hudText.ts; text OQ-C2 provisional (MEC-003 §8)
- feat(config): challenge levels 5-30 get their own table rows (P2 design section 12 weights), director interval x0.8 and cap +2 on challenge levels; parseBalance rejects a challenge level that introduces a family (MEC-003-R4 R15 R16)
- feat(game): shrink ring greybox (blink outline, arrows, hatched closed cells) and fairness invariants MEC-018-I1..I3 in the family fuzz harness (MEC-018)
- feat(core): shrinking board family from level 27: outer ring warns 2000 ms, closes up to 6000 ms (waits under the snake and near the head), reopens via crumble; mangoDisplaced event, ring displaces mango/orbs/rain mangoes (MEC-018)
- docs: MEC-018 shrinking board spec and MEC-003 challenge rules for P2c (OQ-C1..C3 provisional defaults)
- fix(core): head entering an NPC now emits moverHit (family npc) once, with and without Shield (MEC-015-R7)
- fix(game): P2b review fix-ups (chicken beak follows NpcView.dir, spike warn never blinks to empty, shield area-hit guard, bot level range env overrides)
- feat(game): greybox visuals and texts for P2b families (coconut, gate, spike, npc, bird, bomb); bomb blast now hits at most once on the Shield-absorb path too (MEC-017-R3)
- feat(core): mango-thief bird from level 22; NPC L routes keep both legs >= 2 cells (MEC-016, MEC-015-R2)
- feat(core): area-blast block and timed bombs from level 23 (MEC-017); registry init guard for undefined families; modifier families without a fuzz invariant now fail
- feat(core): patrolling cat and chicken from level 21 (MEC-015)
- feat(core): spike traps on a global beat from level 18 (MEC-014)
- feat(core): cycle-cell block and gates from level 17 (MEC-014)
- feat(core): rolling coconuts from level 16 (MEC-013)
- feat(core): mover building block (MEC-004-R5)
- feat(core): P2b family and cause keys, mover/blast/steal events, per-cell cause (MEC-004-R3)
- feat(meta): log death context on run_end and show it on Results; docs: P2a exit report (MEC-003-R19, MEC-012-R12)
- refactor: shared spawnGroundPatch, bot report ignores unknown cause, test and docs cleanups from P2a reviews
- test(tools): headless bot and death-cause report (MEC-004-R19)
- feat(core): ice tiles from level 13 (MEC-012)
- feat(core): mud tiles from level 7 (MEC-012)
- feat(core): ground tile block and tile speed factor (MEC-004-R5 R7)
- test(core): escape check and per-family fairness fuzz harness (MEC-004-R17 R18)
- feat(core): generic head collision, head hits and death context (MEC-004-R6 R8 R15)
- feat(core): level-up slowdown state and Slow-mo max rule in effectiveTick (MEC-003-R22, MEC-006-R17).
- feat(core): levelUpSlowdown tiers in balance config with validation (MEC-003-R22).
### Changed
- feat(core): director by capClass and fairness rule 3 for all families (MEC-004-R9-R13)
- refactor(core): route hazard queries through the family registry and move per-family state lists into SimState.families without behavior changes (MEC-004-R1-R4).
- chore(core): remove level.transitionMs; level-up banner uses ui.bannerMs (MEC-003-R7).
- feat(core): director first spawn starts when the level-up slowdown ends (MEC-003-R11).
- feat(core): level up no longer freezes the sim; skills castable and timers running during level up; slowdown starts at level up (MEC-003-R7..R11/R22, MEC-006-R13).
- feat(core): obstacles, rotten rocks, terrain, snip walls and rubble survive a level up; no level-up crumble (MEC-003-R8, MEC-006-EC15).
- chore(log): `run_end` records `turns`, the count of turns accepted by the MEC-001 queue; old logs without it still load (MEC-003-R19).
### Fixed
- fix(config): add minWarnMs, minWarnTicks and escapeHorizonMs to config/balance.json and set terrainNearHeadDist to 4 as expected by Task 3.
- fix(game): keyboard turns (arrows/WASD) are queued on the native keydown instead of waiting for Phaser's per-frame keyboard queue; pure key map in src/game/input/keyMap.ts (MEC-001).
- fix(core): regular mango updates the speed ramp before the level-clear check, so rampEnded precedes levelUp (ARCHITECTURE step 12.4).
### Docs
- docs: MEC-013..017 P2b family specs (coconut, gate/spike, npc, bird, bomb) (P2b Task 1)
- docs: P2a exit recorded (STATUS, PLAYTEST); browser QA deferred by owner.
- test: fuzz-mode size knobs (VITE_FUZZ_SEEDS, VITE_FUZZ_MS) and no timeout for the legacy fuzz in fuzz mode; P2a exit results in PLAYTEST.
- docs: P1 exit gate verdict (PASS) in PLAYTEST; STATUS for P2 start.
- docs: update P2a plan for level-up flow B (no onLevelEnd; tiles survive a level up; slowdown x mud rule FB-1; real code paths).
- docs: P2b (movers, cycles, blasts, bird) and P2c (shrink, challenge levels, tuning, P2 exit) implementation plans.
- docs: STATUS after merging level-up flow B.
- docs: fix level-up flow B contradictions (MEC-003 R9/R12/R22, MEC-004 EC8, GDD level up).
- docs(spec): level-up flow B rules in MEC-001/002/003/004/006/007/012 and ARCHITECTURE step order (MEC-003-R22).
- docs: level-up flow B spec and plan updated with owner answers (rotten rock lifetime kept, banner uses ui.bannerMs).
- docs: level-up flow B implementation plan.
- docs: level-up flow B design spec (no freeze, obstacles stay, slowdown tiers).
- docs: STATUS updated for owner feedback fixes and level-up option B brainstorming.
- docs: record P1 owner feedback (2-tester gate, level-up slowdown tiers, playtest bugs) in DECISIONS.
- docs: STATUS for P1 code complete; owner playtest gate pending.
- docs(spec): MEC-006-R27 skills may be used during the Shield bonk pause (owner decision).
- docs: AGENTS.md 0.3.2 adds GitNexus workflow (status at task start, async analyze at task end) and minimal-vs-full test scope rule.
- docs: owner phone run passes P0 parity.
- docs: P0 parity check on desktop recorded in PLAYTEST (phone run pending owner); prototype frozen (P0 PR 9).
### Tests
- test(qa): P1 Task 5 energy QA; level fixtures set rampActive false for mid-run states.
- test(qa): P1 Task 4 mango QA; superseded ate/rot/director QA updated.
- test(qa): P1 Task 3 transition QA; superseded level/board/director QA updated.
- test(qa): P1 Task 2 meta black-box QA; save QA updated for MEC-008-R12.
- test(qa): rewrite 23 superseded P0 QA cases for P1 Task 1 rules; QA files typecheck again.
- test(qa): independent black-box QA suite for P0 Task 2 by the tester worker (34 cases; MEC-004-R13 warn bound skipped until P2a).
### Features
- feat(game): greybox Home, Loadout and Results scenes, P1 HUD and skill input (P1 PR 9)
- feat(session): pure session module for runs, save and run log (P1 PR 8)
- feat(core): Shield with rubble, Mango Rain, skill fuzz invariants (P1 PR 7)
- feat(core): skill framework, loadout validation, mid-run unlocks, Slow-mo and Tail Snip (P1 PR 6)
- feat(core): energy bar, energy orbs from L2, golden +10 energy, start energy option, checkpoint speed ramp (P1 PR 5)
- feat(core): mango counters, rot by level, temporary rotten rocks from L12, deferred placement (P1 PR 4)
- feat(core): length reset, 1 s level transition, level-30 run win, simFromAscii test helper (P1 PR 3)
- feat(meta): save v2 with migration, checkpoint progression, loadout sanitizing, local run log (P1 PR 2)
- feat(core): balance v2, 1-based levels, per-level family table (P1 PR 1).
- feat: HUD, overlay cards, banners, D-pad, synth audio + haptics and save wiring (P0 PR 8).
- feat: Phaser greybox board rendering, frame clock, run flow state machine, keyboard and swipe input (P0 PR 7).
- feat: versioned save skeleton with migrations and in-memory store (P0 PR 6).
- feat: hazard registry with rocks, fences, mazes, rising ground and the director; invariant fuzz and determinism tests (P0 PR 5).
- feat: mango placement with fairness BFS, golden mangoes, rot timer and rotten rocks (P0 PR 4).
- feat: core snake (turn queue, collisions), 10-level progression and Sim shell with snapshot (P0 PR 3).
- feat: balance config with parseBalance, seeded RNG, core API types and grid/BFS helpers (P0 PR 2).
### Chore
- chore(playtest): run log summary, debug export and P1 playtest protocol (P1 PR 10).
- chore: Vite 8 + Phaser 3.90 + TypeScript strict + Vitest scaffold with boundary test and ARCHITECTURE.md (P0 PR 1).
### Added
- Studio ruleset 0.3.1 setup files: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `docs/GDD.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/README.md`, `docs/CODEMAP.md`, `CHANGELOG.md`.
- `docs/superpowers/specs/2026-11-03-p0-foundation-design.md`: P0 Foundation design (architecture, prototype port of MEC-001…004, test strategy, verified versions); 4 DECISIONS entries (Phaser 3.90.0 pin, prototype values in P0, 1 ms fixed-step core, Phaser-drawn HUD).
- Mechanic specs MEC-001/002/003/004/006/007/008/012 (Approved, lead-delegated); P1 and P2 designs; implementation plans for P0 (9 PRs), P1 (10 PRs) and P2a (9 PRs).
- Cross-document consistency pass: one HazardFamily vocabulary, step order owned by ARCHITECTURE.md, run log in `src/session`; GDD §5.1/§5.3/§7 updated with owner decisions (base-tick warn rule, 3 families in biomes 4–5); DECISIONS entries for delegation, vocabulary, plan-level and owner decisions.
### Changed
- AGENTS §6: branching model `master` ← `dev` ← `version/vX.Y` ← task branches, direct `--no-ff` merges (owner 2026-11-04); P0 plan task branches now start from `version/v0.1`.
- `README.md` rewritten from the ruleset template.
- `docs/GDD.md` v0.2: 30 levels / 6 biomes, length reset on level up, energy + 4 skills (no cooldowns), skill loadout, in-run checkpoint, obstacle catalogue, marble machine + skins + coins meta (no real money), hybrid art direction, 6-phase roadmap (P0–P5), Phaser 3 + TypeScript stack.
- `docs/GDD.md` §6.4: checkpoints are milestone start levels for new runs (L10/15/20/25/30 → L4/6/8/10/12) with 50% energy carry-over, replacing the in-run continue.
- `AGENTS.md` §1 Stack: Phaser 3 + TypeScript + Vite + Vitest (owner-approved); `docs/GDD.md`: Mango Rain confirmed as the 4th skill, web-first platform confirmed.
- `docs/DECISIONS.md`: stack, redesign v0.2, meta/odds, art direction and roadmap decisions.
### Fixed
- fix: restore the prototype board's rounded 18px corners and 4px external ink outline, including theme changes and shake (P0 Task 8).
- fix: restore prototype particle burst counts, speeds, lifetimes and landing-dust color using named cosmetic presets (P0 Task 7).
### Removed
- Pre-ruleset design docs and Notion CSV databases under `docs/` (content condensed into `docs/GDD.md`; originals remain in commit `9fe2bb0`).

## [0.0.1] - 2026-11-03
### Added
- Project scaffold: single-file prototype `prototype/mango-snake-hard.html` and initial design notes.
