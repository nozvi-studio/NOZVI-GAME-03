# Decision log
Append-only. Format: `## YYYY-MM-DD — <decision>` then Context / Choice / Alternatives / Consequence (1 line each).

## 2026-11-03 — Adopt studio ruleset 0.3.1 for this repo
- Context: The repo started with ad-hoc design docs and Notion CSVs that duplicated the studio's "AI Vibe-Code Rules — Casual Game" structure.
- Choice: Keep exactly the ruleset's Setup files; condense the earlier docs into `docs/GDD.md`; detailed mechanic specs are written on demand (Studio Standards template 03).
- Alternatives: Keep both doc sets (two sources of truth); import everything into Notion only.
- Consequence: One source of truth per topic; the earlier detailed proposals are only in git history (commit `9fe2bb0`) and must be rewritten as MEC specs when needed.

## 2026-11-03 — The single-file HTML prototype is the current baseline; production stack postponed
- Context: The playable prototype already validates movement, hazards and juice; the target platform is not decided.
- Choice: Keep iterating in `prototype/mango-snake-hard.html` (vanilla JS, Canvas 2D, no build) until the platform decision.
- Alternatives: TypeScript + Canvas (Vite); Phaser 3; Godot 4.
- Consequence: AGENTS §6 rules (pure `src/core/`, balance config, tests) apply from the first gameplay task after the stack is chosen; the prototype is tech debt, not the production codebase.

## 2026-11-03 — Production stack: Phaser 3 + TypeScript + Vite (supersedes "production stack postponed")
- Context: The owner redesigned the game (30 levels, skills, marble-machine meta) and wants a web-first build that is cheap to playtest; the owner already knows JS/TS.
- Choice: Phaser 3 + TypeScript + Vite, Vitest for the pure core, Matter.js (bundled with Phaser) for the marble machine; versions verified and pinned in Phase 0.
- Alternatives: TS + raw Canvas (no physics/scene tooling); Godot 4 (new language, heavier web build); Cocos Creator (smaller English ecosystem); Unity (too heavy for a 2D grid game).
- Consequence: AGENTS.md §1 Stack line must be updated (protected file, needs owner approval); the HTML prototype is frozen once P0 reaches parity.

## 2026-11-03 — Game redesign v0.2: 30 levels, length reset, energy skills without cooldowns, in-run checkpoint
- Context: Owner's design session; a growing snake would fill the 17×17 board long before level 30.
- Choice: 30 levels in 6 biomes × 5; snake length resets to 4 on level up; energy orbs fund 4 skills by energy cost only (no cooldowns), 2 chosen per run; one checkpoint continue at L11, armed by reaching L16, with a speed ramp from L1 speed.
- Alternatives: keep length across levels (board fills, Tail Snip becomes mandatory); energy + cooldowns (double gate, harder to read); new runs start at the checkpoint (removes early-level farming).
- Consequence: GDD v0.2; MEC-003/006/007/008 specs needed before P1; checkpoint reading and Mango Rain as a skill are marked ASSUMPTION for owner confirmation.

## 2026-11-03 — Meta: marble machine with public odds, no real money
- Context: Owner wants a pachinko-style marble machine dropping skins or coins, with cosmetic-only rewards.
- Choice: marbles and coins earned only by play; outcome chosen by a weighted table then animated; odds shown in-game and tested against config; pity after 40 marbles; duplicates convert to coins; coins buy skins directly.
- Alternatives: real-money marbles (loot-box regulation, store odds rules); pure physics outcomes (odds cannot be published exactly).
- Consequence: any future monetization needs a new decision and a legal check; MEC-009/010/011 specs in P4.

## 2026-11-03 — Art direction: hybrid chunky-cartoon UI + flat readable board
- Context: Owner's reference screenshot uses a chunky, thick-outline cartoon style; the board must stay readable at speed on a 5" phone.
- Choice: chunky cartoon for UI, characters, skins and the marble machine; flat low-detail board with high-contrast obstacles; one palette per biome; style tile validated on a phone before asset production.
- Alternatives: flat pastel everywhere (cheap, bland); hand-drawn doodle; pixel art.
- Consequence: art production starts in P3; P1/P2 use greybox; reference games inspire the feel only, never layouts or icons.

## 2026-11-03 — Roadmap as 6 big phases, each with one spec + one plan, executed as small PRs
- Context: Owner wants large phases for AI-driven development with Superpowers.
- Choice: P0 Foundation → P1 New core loop (playtest gate) → P2 Content → P3 Juice & art → P4 Meta → P5 Ship; owner approves each phase's spec and exit criteria; tasks stay one PR each.
- Alternatives: many small milestones (more overhead for the owner); one PR per phase (unreviewable diffs).
- Consequence: Maps onto AGENTS M1–M4 order (P0–P2 = M1, P3 = M2, P4 = M3, P5 = M4); wrap zones (MEC-005) parked.

## 2026-11-03 — Checkpoints are milestone start levels for new runs (supersedes the in-run continue in "Game redesign v0.2")
- Context: The owner clarified that a death ends the run, and the next run starts later instead of at L1, keeping part of the energy.
- Choice: fixed milestones every 5 levels — reaching L10/15/20/25/30 permanently unlocks a start at L4/6/8/10/12 (≈ 40%); 50% of energy at death (max 50) carries to the next run; speed ramps from L1 speed over 5 mangoes; player may still start at L1.
- Alternatives: one continue inside the same run at L11; a start level computed as 40% of the best level (smoother but harder to read and to balance).
- Consequence: MEC-008 spec follows GDD §6.4; marbles count only levels cleared in the run; P1 playtest checks whether slow speed + later-biome obstacles feels fair.

## 2026-11-03 — Pin Phaser 3.90.0 although Phaser 4 is `latest`
- Context: npm `phaser@latest` is 4.2.1; the last 3.x is 3.90.0 (2025-05-23). The approved stack says Phaser 3.
- Choice: Phaser 3.90.0, pinned exactly (owner decision).
- Alternatives: Phaser 4.2.1 (would change AGENTS §1 / GDD §13); a spike comparing both.
- Consequence: the 3.x line gets no updates; a later move to Phaser 4 only touches `src/game/` because the core has no Phaser imports.

## 2026-11-03 — P0 ports the prototype's rules and numbers; GDD v0.2 numbers arrive in P1
- Context: P0 exit criterion is parity with the prototype, but GDD v0.2 changes several MEC-001…004 numbers (start length, tick curve, temporary rotten rocks, fairness distances, director).
- Choice: `config/balance.json` starts with the prototype values; P1 changes config and rules together (owner decision).
- Alternatives: GDD v0.2 values in P0 (parity not checkable); hybrid.
- Consequence: the P0 design doc is the behavior spec for the port; MEC spec files are written in P1.

## 2026-11-03 — Core time model: integer-millisecond fixed step
- Context: the prototype mixes ms timers (hazards, rot, director) with a snake tick accumulator, driven by variable frame time.
- Choice: `sim.advance(ms)` runs 1 ms steps in the prototype's update order; the game layer passes clamped integer frame time.
- Alternatives: express everything in snake ticks (changes behavior); pass variable `dt` into the core (not deterministic).
- Consequence: same seed + same timed inputs give the same state regardless of frame rate or chunking; tests and replays are simple.

## 2026-11-03 — Greybox HUD, overlays and D-pad drawn in Phaser, not DOM
- Context: the prototype uses DOM/CSS for HUD and controls.
- Choice: everything is a Phaser game object in one portrait coordinate system (owner decision).
- Alternatives: Phaser board + DOM HUD (faster port, two layout systems, P3 rework).
- Consequence: accessibility (focus, labels) needs explicit work later; P3 art and the P4 marble machine reuse the same system.

## 2026-11-03 — Lead approves specs and plans on the owner's behalf
- Context: the owner delegated spec/plan approval to the lead agent and asked to be involved only in important decisions.
- Choice: the lead approves MEC specs, phase designs and plans; the owner is asked only for changes to GDD gameplay rules, dependency installs, pushes, art direction and playtests.
- Alternatives: owner reviews every document (slower, owner time-constrained).
- Consequence: documents marked "Approved (lead, delegated by owner)"; GDD rule changes still need explicit owner approval.

## 2026-11-04 — One HazardFamily vocabulary from P0 onward
- Context: P0/P1 plans and the P2 design used different names (`HAZARD_ORDER`/`HazardKey`/`trySpawn`/`countsTowardCap` vs `FAMILIES`/`FamilyKey`/`spawn`/`capClass`).
- Choice: P2 vocabulary everywhere: `FamilyKey`, ordered `FAMILIES`, `cause`, `capClass`, `maxActiveKey`, `spawn`, `onBreak`, `onLevelEnd`; `directorSpawned` dropped (`capClass 'none'`). P1's intro-level key type is `IntroKey`. P0/P1 keep per-family state lists; P2a Task 1 moves them to `SimState.families[key]` with golden tests unchanged. P1 names `rampActive`/`acc` are canonical.
- Alternatives: rename at P2a (churn across already-written code).
- Consequence: no rename refactor later; P2a Task 1 carries only a state-layout migration.

## 2026-11-04 — Plan-level lead decisions (P0/P1)
- All branches start from `master` (local `main` holds the old Ant Trail project).
- Fuzz invariant "mango never on a reserved cell" checks reserved cells excluding the mango itself (prototype L348–351).
- `Session` exposes thin `turn`/`useSkill` pass-throughs; scenes never touch the sim (P1-D1). Run-log records are written by `src/session` (MEC-003-R19 aligned).
- Log "session" = runs separated by < `log.sessionGapMs` (600000); P1 gate "replays ≥ 3 times" = ≥ 4 runs in the first session.
- First-orb tooltip uses the best level saved before the run starts. Log summary via `window.__summarize` under `?debug=1` (no new dependency).
- `docs/ARCHITECTURE.md` "Sim step order" is the single source for step order (P2 design §6/§20 aligned).

## 2026-11-04 — Owner: fairness and biome rule changes (GDD §5.1, §5.3)
- Warn time rule 1 uses the L1 base tick `speed.startMs` (≥ 4 base ticks), not the current speed; mud and Slow-mo only add margin (P2-D5, MEC-004-R13).
- Biomes 4–5 introduce 3 families each (still one new family per level) (P2-D9).
- `fairness.terrainNearHeadDist` raised 3 → 4 from P2a so GDD rule 2's "3 cells in front" holds for terrain too; P0/P1 keep 3 for prototype parity.

## 2026-11-04 — Branching model (owner)
- Choice: `master` ← `dev` ← `version/vX.Y` ← task branches; task branches merge into the version branch directly (`--no-ff`, no PR) once tests + typecheck pass; version → `dev` at phase exit; `dev` → `master` on release. Rule lives in AGENTS §6.
- Current version branch: `version/v0.1` (P0–P2a), started from `version/v0.1-design`.
- Alternatives: PR per task into `master` (owner prefers fewer PRs; `gh` CLI not installed).

## 2026-11-04 — TypeScript version for P0: 7.0.2 passes
**Context:** Design D5 prefers TypeScript 7.0.2 if it type-checks `phaser.d.ts` (Phaser 3.90.0) and the Vitest 5.1.0 types in strict mode with `skipLibCheck: false`.
**Decision:** 7.0.2: `npm run typecheck` exit 0 on 2026-11-04, after the owner-approved fix below. The failures were version-independent (6.0.3 would not fix them).
**Also checked:** Phaser 3.90.0 builds with Vite 8.3.5 (Rolldown) (`npm run build` exit 0, 1.2 MB chunk).

## 2026-11-04 — Typecheck scope: config files excluded, ActiveXObject shim
**Context:** With `skipLibCheck: false`, `vite.config.ts`/`vitest.config.ts` pull Vite/Vitest Node-side types that need `@types/node` (not allowed in P0), and `phaser.d.ts` references `ActiveXObject`, which current `lib.dom` no longer declares.
**Decision (owner, 2026-11-04):** `tsconfig.json` `include` is `["src", "tests"]` (tool config files are not type-checked); `src/types/phaser-shims.d.ts` declares an empty `interface ActiveXObject {}`. `skipLibCheck` stays `false`; no new dependency.

## 2026-11-04 — Publish target: GitHub Pages
**Decision (owner):** the first public web build ships on GitHub Pages (GDD §13). Consequence: the Vite `base` must match the repo path when deploy is set up (P5); no portal SDK for now.

## 2026-11-04 - P0 Task 5 live determinism fixtures

- Context: the plan clone and JSON round-trip fixtures advance an unsteered snake beyond its wall death at 1260 ms, before the first hazard spawn.
- Decision: use the existing scripted steering helper through 3000 ms; assert the fixtures are playing, the clone changes after advancing, and the JSON fixture includes a hazard.
- Evidence: the new live-state assertions failed against both original fixtures, then passed with steering. Production gameplay and tuning remain exactly as planned.
- Task 5 test detail: director timer fixtures hold the tick accumulator to isolate spawn timing; unlock coverage probes weighted intervals with real family spawns rather than a spy.
- Validation environment: a temporary NODE_OPTIONS preload treats the sandbox-blocked optional Vite net-use probe as unavailable and selects the Vitest thread pool; no dependency or repository configuration changes.

## 2026-11-04 - P0 Task 8 cross-scene release and board outline parity
- Context: the parallel HUD captures Phaser pointer-up events over its buttons; board swipes must still end. The prototype also clips content inside rounded board corners while its ink outline sits outside.
- Choice: retain HUD scene capture for button-down exclusion; clear active board swipes on native window mouse-up and matching touch-end/cancel, with listeners removed on shutdown. Clip the root board container to its inner 18px rounded boundary and draw the 4px external outline as a separate scene object that follows shake.
- Alternatives: forward release events from every HUD control; include the outline in the content mask. The latter lets late-added floating scores cover the ink and differs from prototype CSS L72-73.
- Consequence: no core rules, balance or dependencies change. Focused tests cover captured releases, touch identity and floating-score containment; real device input and clipping during shake still need visual verification.

## 2026-11-05 — Prototype frozen after P0 parity
**Decision:** `prototype/mango-snake-hard.html` is frozen (comment on line 2). Reason: P1 changes the rules in `src/`; the prototype stays only as the parity reference of PLAYTEST 2026-11-05.

## 2026-11-05 — QA process: independent tester
**Decision (owner, 2026-11-04):** feature code is written by Codex or Claude; agy is the dedicated tester and never writes feature code. After each task agy derives black-box cases from the MEC specs (public API only), writes them under `tests/qa/` and runs browser checks; the lead triages failures (code bug → implementer, test error → agy, spec gap → owner).

## 2026-11-04 - P1 plan name mapping
- Context: P1 Task 1 verifies the assumed P0 surface against the merged implementation; later tasks use these real names.
- SimState: assumed snake.cells/dir/queue maps to top-level snake (Cell[]), dir and queue; director.timerMs/mazeCooldownMs maps to top-level spawnInMs/mazeCooldownMs; need is derived in snapshot(), not stored. acc, tickMs, status, outcome, score, level, progress, mango, eaten, rottenRocks, hazards, terrains, rng and events retain their real P0 names.
- Level helpers: P0 needFor/tickMsFor remain aliases of quota/levelTickMs, with 1-based arguments. unlockedAt aliases introducedAt; isUnlocked reads the table. SkillId, Loadout, SimOptions, TableFamily, IntroKey, LevelRow and the new helpers are public exports.
- Shapes: rockPool/fencePool/lineFence live in src/core/hazards/shapes.ts, so Task 1 updates that existing helper instead of duplicating it in rock.ts/fence.ts. Shape selection and RNG order stay at their existing call sites.
- Registry: HazardFamily is declared in types.ts; registry.ts owns FAMILY/FAMILIES. Only the four implemented P0 families have registry entries. TimedKey still identifies the existing rock/fence/maze instances; new FamilyKey members reserve later implementations. UnlockKey retains the three P0 incoming-banner families; levelUp.unlocked uses IntroKey.
- RNG: seedRng(seed) creates the plain rng state and rngFrom(state) supplies next/int/pick/chance. placeMango(s, b, rng) returns boolean and appends events to s.events; SpawnCtx has balance/level/cellFree (no emit); StepCtx has emit. No context or closures are stored in state.
- Meta: storage.ts exports KeyValueStore/get/set and memoryStore; save.ts exports load/save and MIGRATIONS (uppercase). The public meta index exposes the supported functions. runFlow.ts and clock.ts retain the planned paths.
- Test helper: tests/support/balance.ts already existed; loadBalance now accepts an optional patch of a deep copy before parseBalance. buildState uses initialState and explicit 1-based fixture levels.
- Minimal integration deviations: src/game/text.ts handles the extended cause/introduction types and consumes 1-based labels to prevent off-by-one display. Two obsolete QA files reference deleted JSON/type members, so tsconfig excludes tests/qa/task2.qa.test.ts and tests/qa/task5-director-unlocks.qa.test.ts from static checking; all their non-obsolete cases still run in Vitest. Independent QA sources are unchanged.
- Environment: sandboxed Windows child-process spawning fails with EPERM. Verification uses existing --configLoader native and --pool threads flags (one worker for heavy fuzz, three for the normal suite), with no dependency or npm script changes. Runtime filtering names only superseded QA cases; see STATUS and the task report.
- Test runtime: default fuzz uses 5 smoke seeds (120 s each); test:fuzz retains 200 heavy seeds. This applies the P1 global constraint that heavy fuzz stays outside npm test; verification keeps per-file isolation because the existing game mocks leak when --no-isolate is used.

### P1 Task 1 obsolete independent QA cases (sources unchanged)
| Test ID | Superseding approved rule |
|---|---|
| QA-T2-10 | Task 1 Step 3; MEC-003-R3: min tick is 82 ms. |
| QA-T2-15 | MEC-003-R14 removes level.unlock; mutations now target level.table. |
| QA-T2-18 | MEC-003-R14 removes director.weights; weights belong to level.table. |
| QA-T3-01 | Task 1 Step 3; MEC-001-R2: four start cells. |
| QA-T3-17 | MEC-003-R1/R2: 1-based quota 4 + floor((n-1)/3). |
| QA-T3-18 | MEC-003-R1/R3: 1-based tick 140 - 2*(n-1), minimum 82. |
| QA-T3-20 | MEC-003-R1/R2/R3: level zero fixture and old quota/tick are obsolete. |
| QA-T3-21 | MEC-003-R1/R2: level zero fixture and old quota are obsolete. |
| QA-T3-22 | MEC-003-R15/R16: introductions move to L6/L11/L12/L26. |
| QA-T3-23 | Task 1 Step 6; MEC-003-R1: last level is 30. |
| QA-T5-13 | MEC-003-R14/R15: family table replaces P0 unlock levels. |
| QA-T5-14 | MEC-003-R1/R15/R16: 1-based start and fence introduction at L6. |
| QA-T5-15 | MEC-003-R15: table-driven rock/fence shape tiers. |
| QA-T5-16 | MEC-003-R1/R4: 1-based director interval max(1600, 5000-120*n). |
| QA-T5-17 | MEC-003-R1/R4: invalid level-zero fixture; cap min(10, 2+floor(n/3)). |
| QA-T5-18 | MEC-003-R1: invalid level-zero fixture; equivalent cap exclusion remains covered by core tests. |
| QA-T5-21 | MEC-003-R15: maze begins at L26; L6 fixture cannot spawn it. |
| QA-T5-22 | MEC-003-R15: terrain begins at L11 and maxActive remains 1. |
| QA-T5-23 | MEC-003-R1/R15: invalid level-zero fixture and fence now begins at L6. |
| QA-T8-03 | MEC-003-R1 and Task 1 Step 6: labels consume 1-based levels. |
| QA-T8-05 | MEC-003-R1/R15/R16: banners consume 1-based levels and new introductions. |
| QA-T8-07 | MEC-003-R1: results text consumes 1-based levels. |
| QA-T8-08 | MEC-003-R1: results text consumes 1-based levels. |
- Replacement coverage: core balance, level, shapes, director, snake and game text/HUD suites assert P1 values without editing independent QA sources. QA-T2-17 remains its existing P2a skip; two existing todo cases remain.
- Final evidence: filtered normal suite 364 passed / 24 skipped / 2 todo in 7.65 s with three isolated thread workers; filtered heavy fuzz (200 seeds) has the same totals and exits 0. Typecheck and native-loader production build exit 0. A read-only review found no Critical/Important issues. The copied historical "To be copied" note is retained as a minor documentation artifact to honor the verbatim-copy requirement.
