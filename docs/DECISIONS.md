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

## 2026-11-04 - P1 Task 2 execution rulings
- Task 2: Ruling: use the real P0 `MIGRATIONS` name, as recorded in the P1 plan name mapping; export it publicly with the v2 APIs. No behavior change from the planned migration registry.
- Task 2: Ruling: retain the P0 `SaveData` field shape and a `save` overload for staged game/QA callers; partial P0 writes receive the new defaults in a complete v2 envelope. `SaveDataV2` is the full P1 interface. Cost if wrong: legacy callers could replace P1 fields if they construct a partial save instead of preserving the loaded object.
- Task 2: Ruling: retain a deprecated P0 `load(store, migrations?)` overload, merging custom migrations with the built-in v1 migration; it reads P0 fields and defaults the new fields because it has no balance rules. The required P1 `load(store, rules)` API validates every field. Boot now supplies the active balance slices; its regression test proved progression was lost without them. Cost if wrong: a future P1 caller using the deprecated overload would lose P1 fields on a later save; P1 callers must pass rules.
- Task 2: Ruling: minimally update Boot and the owned HUD/platform tests to consume v2; the plan omitted these existing integration callers. No gameplay behavior is added. Cost if wrong: startup could use the wrong save validation limits; the Boot integration test checks the active balance path.
- Task 2: Ruling: the owner's explicit instruction to execute Task 2 authorizes its planned MEC-003-R19 `run_start.entry` addition (`home` or `results`) for the P1 Results/Home metric. No further rules change.
- Task 2: Ruling: use native config loading and threads for Vitest, and native config loading for Vite, per the recorded Windows environment workaround; three test workers, sequential test/typecheck/build. No dependencies or npm script changes.

### P1 Task 2 obsolete independent QA cases (sources unchanged)
| QA test ID | Superseding plan/spec rule |
|---|---|
| QA-T6-01 | Task 2 save v2; MEC-008-R12 and section 3 add five default progression/loadout fields. |
| QA-T6-02 | Task 2 save v2; MEC-008-R12 empty-store defaults include all v2 fields. |
| QA-T6-03 | Task 2 save v2; MEC-008-R12 fresh defaults include all v2 fields. Fresh-copy behavior remains covered. |
| QA-T6-04 | Task 2 save v2; MEC-008-R12 round trips return the complete v2 data shape. |
| QA-T6-05 | Task 2 save v2; MEC-008-R12 current envelope version is 2, with new fields. |
| QA-T6-08 | Task 2 save v2; MEC-008-R12 migration continues through version 2 and adds its fields. |
| QA-T6-14 | Task 2 per-field validators; MEC-008-R12 resets only invalid fields, preserving valid score/sound. |
| QA-T8-15 | Task 2 save v2; MEC-008-R12 browser-store round trips return complete v2 data. |
- Replacement coverage: tests/meta/save.test.ts covers v2 round trips, migration, per-field recovery, clamping, checkpoint/loadout validation, envelope fallback and fresh defaults; tests/game/boot.test.ts covers active-balance loading; owned platform/HUD tests assert v2 shapes. The earlier Task 1 QA exclusions are no longer needed after the independent tester's update.

### Task 2 final review and scope rulings
- Final review: independent read-only reviewer found no Critical or Important issues; no code fixes required.
- Final: minor (deferred): round-trip nondefault values for every v2 field and all five log variants in additional tests; current tests cover the exact plan examples and the reviewer found implementation correct. Cost: less direct round-trip coverage for those combinations.
- Final: Ruling: reviewer did not run verification commands because the executor runs them sequentially to limit host memory; executor verified the full filtered suite, typecheck and build. Cost: no independent second execution.
- Final: Ruling: browser startup, console, rendering, mobile behavior and real-browser persistence were not checked; this meta-only task uses the requested command gates plus real-handler platform/HUD and Boot tests. Cost: browser-only issues remain for agy/owner QA.
- Final: Ruling: documentation review was left to the executor while edits were underway; checked required CODEMAP/CHANGELOG/STATUS updates and CRLF locally. The owner's Task 2 instruction authorizes the planned R19 field addition. Cost: no second documentation review.
- Final: Ruling: branch ancestry and git/dependency operations were outside reviewer scope; existing feat/p1-meta is retained and no commits, merges, pushes or installs were performed, as requested. Cost: integration remains the owner's next step.
- Final: Ruling: other P1 tasks, session lifecycle persistence, export and UI hint rendering remain out of scope; this task supplies pure helpers and the necessary existing Boot call adaptation. Cost: the new lifecycle behavior awaits later tasks.
- Final: Ruling: superseded QA assertions remain untouched; all eight IDs and their replacement rule are listed above and only those cases are filtered. Cost: unfiltered npm test remains red until the independent tester updates them.
- Final: Ruling: compatibility overloads and uppercase MIGRATIONS were deliberately excluded from the reviewer's judgment; the executor retains them for existing P0 consumers under the execution rulings above. Cost: P1 callers must use the explicit-rules API.
- Final: Ruling: unchanged code beyond HUD persistence and boundaries was excluded from review to honor the task's scope. Cost: unrelated defects are not assessed.
- Final: Ruling: malformed developer config, invalid typed gameplay inputs, unsupported cause keys and impractical counter overflow are outside the specified helpers' input contract; disk save/log data is validated, and core parseBalance owns config validation. Cost: direct callers violating typed/config contracts have no extra guarantees.
- Final: Ruling: frozen prototype and environment files were not read, honoring explicit restrictions. Cost: no prototype comparison; mechanic specs remain authoritative.

## 2026-11-04 - P1 Task 3 execution rulings
- Task 3: Ruling: use the Task 1 real-name mapping: top-level snake/dir/queue, derived quota (no stored need), spawnInMs/mazeCooldownMs. The ASCII quiet fixture uses spawnInMs = 1e9 because P0 counts down, whereas the plan's -1e9 describes an elapsed timer. Cost if wrong: fixtures could unexpectedly spawn hazards; helper and transition tests check the countdown.
- Task 3: Ruling: register required onLevelEnd callbacks in rock.ts/fence.ts/maze.ts, where the existing family objects are owned, using shared endTimedLevel; terrain owns its fade callback. Reuse the existing registry.ts FAMILIES/instancesOf/stepHazards unchanged. Cost if wrong: an instance could survive transition; boundary tests check non-solid cells and removal at 450/500 ms.
- Task 3: Ruling: retire the internal P0 addProgress helper in level.ts and resolve progress in snake.ts eating before calling transition.ts. The first implementation routed level.ts through transition.ts and created a registry-initialization cycle through family shapes; existing hazard tests reproduced undefined family entries. Keeping level.ts formula-only fixes that RED -> GREEN without changing public exports. Cost if wrong: existing internal callers would break; typecheck and the complete suite cover consumers.
- Task 3: Ruling: correct the plan's L5 event fixture to progress 4 before the final normal mango (quota 5), and levelTimeMs 6868 before its 132 ms step to assert a cleared duration of 7000. Drop the synthetic L30 need field because quota is derived. Cost if wrong: event boundary coverage would test the wrong step; literal payload and timing assertions pin it.
- Task 3: Ruling: update owned P0 level/mango tests for transition events, L30 win and no board-full win; supply a mango to the owned director fixture because ARCHITECTURE step 5 skips spawning with an empty slot (MEC-003-R13). The existing owned mango test now uses exportState for a mutable copy, retaining stateOf's required Readonly return. Independent QA sources remain unchanged. Cost if wrong: stale tests could hide regressions; replacement tests assert the approved rules directly.
- Task 3: Ruling: preserve the mapped P0 eaten counter and defer eatenInLevel counting, placement retries, timed rotten rocks and orbs to their planned tasks. Task 3 introduces/reset eatenInLevel, while its ASCII M/G formula already follows MEC-002-R4; no absent future-state arrays are fabricated. No mechanic spec changes. Cost if wrong: expecting later P1 mechanics before their tasks would fail; this task is deliberately scoped to Task 3.
- Task 3: Ruling: consume the regular mango before resolving level progress so a final-clear snapshot does not retain it on the head; no replacement is placed after runWon. A new L30 assertion reproduced the overlap RED -> GREEN. Cost if wrong: terminal board rendering would show an eaten mango; final snapshot assertions cover it.
- Task 3: Ruling: execute on the owner's existing feat/p1-reset-transition branch, leaving every change uncommitted and unmerged. Use native config loading for Vitest/Vite, threads (three normal workers, one heavy-fuzz worker), and sequential verification. No dependencies or protected-file edits.

### P1 Task 3 obsolete independent QA cases (sources unchanged)
| QA test ID | Superseding plan/spec rule |
|---|---|
| QA-T3-20 | Task 3 event interface; MEC-003-R7 adds biome/challenge/biomeChanged/clearedLevelTimeMs to levelUp and emits shrunk first. Exact P0 event equality is obsolete. |
| QA-T3-21 | Task 3 event interface; MEC-003-R7 extends levelUp. Golden overflow remains covered by MEC-001-EC1/MEC-003-R5 tests. |
| QA-T3-22 | Task 3 event interface; MEC-003-R7 extends the payload while MEC-003-R16 retains unlocked. Exact P0 event equality is obsolete. |
| QA-T3-23 | Task 3 run win; MEC-003-R6 ends the run on the L30 quota instead of discarding its progress. |
| QA-T4-20 | Task 3 removal of boardFull; MEC-001-R10 leaves mango null and keeps playing; MEC-003-R6 defines the only win. |
| QA-T5-14 | Task 3 event interface; MEC-003-R7 extends levelUp; the unlocked field remains present. |
| QA-T5-23 | Task 3 ARCHITECTURE step 5; MEC-003-R13 skips director spawning while mango is null. This fixture has no mango. |
- Runtime filtering excludes only these seven IDs; the existing QA-T2-17 skip and five existing todo cases remain. Previous Task 1/2 obsolete cases were updated by the independent tester before this branch and pass without filtering.

### Task 3 final review and verification
- Independent read-only reviewer: no Critical or Important findings; no deferred minor findings. The function-only snake/transition cycle follows the plan and is safe; level.ts stays independent.
- Final verification: native-loader filtered npm test: 464 passed, 8 skipped (seven obsolete QA plus existing QA-T2-17), 5 todo, 9.46 s; filtered test:fuzz: all 200 heavy seeds and the suite pass (54.57 s). Typecheck, native-loader build and diff whitespace checks exit 0.
- No mechanic spec changes, QA edits, dependency changes, branch changes, commits, merges or pushes. The owner requested keeping the existing branch uncommitted.

## 2026-11-04 - P1 Task 4 execution rulings
- Retained the real P0 RNG argument for `placeMango`, as recorded in the P1 plan name mapping. `mangoTick` accepts StepCtx and obtains its transient RNG from plain state. `rotTimeMs` implements the floored MEC-002-R4 formula; `rotMsFor` remains a compatibility alias.
- Retained P0 `MangoState.leftMs`; snapshots derive `ageMs`. The plan's age-based internal fixtures use `leftMs = totalMs - ageMs` instead. No timer behavior changes.
- Passed the existing StepCtx into `HazardFamily.onLevelEnd(s, ctx)` because a rotten rock must reset `leftMs` from the active `hazard.crumbleMs` configuration. Existing families ignore the added argument; no config or closures enter state.
- Preserved the eaten mango until replacement (or cleared it on the final win), so `placeMango` can detect entry into an empty period and emit `mangoDeferred` once. Clearing it before calling placement would suppress the planned event.
- Reserved initial snake cells with warnings in the deferred-placement test: the plan's non-snake-only warning picture frees tail cells before t=390, contradicting its expected failed retry. The corrected picture verifies t=140 deferral, t=390 failure without RNG, and t=640 success at (16,16). The 3000 ms no-mango director check invokes the real director directly so warning lifecycle and eventual snake death do not obscure the spawn gate.
- Updated owned core tests and state fixtures for the extended ate event, renamed counter, registry entry and R legend; independent QA sources are unchanged. The legacy fixture `eaten` option seeds both new counters; explicit P1 options seed them independently.
- Excluded only `tests/qa/task4-mango-placement.qa.test.ts` and `tests/qa/task4-mango-rot-lifecycle.qa.test.ts` from static checking: they construct permanent cell-only rocks or read removed `eaten`. All compatible cases in these files still run in Vitest. Keeping the production types strict avoids reintroducing removed P0 state.
- Used native config loading for Vitest/Vite, threads and maxWorkers 2, sequential verification, no dependency changes. The full filtered suite takes 14.68 s on this Windows host, above the plan's <10 s target; isolated worker startup is reported by Vitest. No unrelated runner/mocking refactor is included.

### P1 Task 4 obsolete independent QA cases (sources unchanged)
| QA test ID | Superseding approved plan/spec rule |
|---|---|
| QA-T3-10 | Task 4; MEC-002 section 7 adds progressGain/source to ate; the old exact payload is obsolete. |
| QA-T3-11 | Task 4; MEC-002 section 7 adds progressGain/source to golden ate too. |
| QA-T4-08 | Task 4; MEC-002-R3 renames eaten to eatenInRun and adds eatenInLevel; section 7 extends ate. |
| QA-T4-09 | Task 4; MEC-002-R3 renames eaten to eatenInRun; section 7 extends golden ate. |
| QA-T4-12 | Task 4; MEC-002-R6 enables rocks only from L12, and R7 makes them temporary with state/leftMs. This test expects a permanent rock at L1. |
| QA-T4-18 | Task 4; MEC-002-R6/R7 creates a timed rock only on enabled levels; this test expects a cell-only rock at L1. |
| QA-T4-22 | Task 4; MEC-002 section 7 requires progressGain/source, superseding the P0 exact event keys. |
| QA-T5-16 | Task 4; MEC-003-R13 returns before advancing the director when mango is null; its direct fixtures omit the mango. |
| QA-T5-18 | Task 4; MEC-003-R13 forbids the expected spawn from the fixture's null mango slot. |
| QA-T5-21 | Task 4; MEC-003-R13 forbids the expected maze spawn from the fixture's null mango slot. |

The owner-listed Task 3 exclusions remain: QA-T3-20, QA-T3-21, QA-T3-22, QA-T3-23, QA-T4-20, QA-T5-14, QA-T5-23. Those cases are being rewritten separately. No mechanic spec was changed.

### P1 Task 4 final review
- Independent read-only review found no Critical/Important issues. Deferred minor: the 14.68 s normal suite exceeds the plan's <10 s target on this host with the required two isolated threads; task handoff is permitted by the owner's exit-code completion gate. Future runner optimization must preserve game-test mock isolation.
- Review scope rulings: coordinator owns actual sequential test/typecheck/build/fuzz evidence (reviewer ran no tests); browser/phone and later UI feedback are outside this core task; energy/skills/orbs/rain remain Tasks 5/7; the 17 superseded QA cases remain untouched and filtered. Workflow scratch artifacts are removed before handoff, preserving the durable rulings here.

## 2026-11-04 - P1 Task 5 execution rulings
- Task 5 uses the real P0 top-level snake state and RNG wrapper recorded in "P1 plan name mapping". Orb candidate BFS uses cellBfsWall and the single isReserved list; orb spawning calls rngFrom(s.rng).pick in row-major order.
- The plan's file list omits snake.ts and transition.ts even though its implementation step requires eating and level-up hooks. Added the hooks in those existing owners; mango.ts supplies goldenEnergy after ate and before level-up. No mechanic spec changes.
- MEC-008-R9 requires the eating step to keep its current tick. Removed the old immediate tick assignments from eating and level-up; step 8 recomputes baseTickMs on the next playing ms. Level-up ends the ramp after levelUp; the eating hook then counts that mango without emitting a second rampEnded.
- Updated owned core tests for the approved checkpoint start tick, next-step tick timing, golden energy event and o legend. Existing normal-speed level-clear fixtures explicitly disable the ramp. Independent tests/qa sources are unchanged; no new obsolete QA IDs were found.
- Retained only the owner's known obsolete exclusions: QA-T3-10, QA-T3-11, QA-T3-20, QA-T3-21, QA-T3-22, QA-T3-23, QA-T4-08, QA-T4-09, QA-T4-12, QA-T4-18, QA-T4-20, QA-T4-22, QA-T5-14, QA-T5-16, QA-T5-18, QA-T5-21, QA-T5-23. Their superseding rules are listed in the Task 3/4 tables above; no QA tests or exclusions were added to repository config.
- Used the existing feat/p1-energy worktree; skipped branch creation and all commits/integration per owner. Adapted POSIX workflow bookkeeping to PowerShell scratch files. Native Vitest/Vite config loading, threads/maxWorkers 2 and sequential test/typecheck/build/fuzz avoid the Windows child-process and host-memory limits; no dependencies or npm scripts changed.
- TDD: the first targeted run failed on missing state/events/ramp timing; the new helper imports then failed because energy.ts/ramp.ts did not exist. All 22 Task 5 tests pass after implementation. Filtered npm test: 490 passed / 18 skipped / 5 todo; typecheck and native-loader production build exit 0.
- Runtime limitation: filtered npm test took 16.77 s on this host, above the plan's <10 s target. No unrelated test-runner or mock-isolation changes were made; the owner's completion gate is successful command exits.
- Heavy fuzz verification: filtered test:fuzz exited 0 with 490 passed / 18 skipped / 5 todo, including 200 seeds x 120 s; total duration 31.26 s.

### P1 Task 5 final review
- Independent read-only reviewer found no Critical or Important issues. Deferred minor: normal-suite duration 16.77 s exceeds the plan's <10 s target; runner optimization remains separate work. Cost: slower verification on this host.
- Final scope ruling: skills, Mango Rain, session orchestration, rendering/blinking and browser/phone behavior remain later-task or QA responsibilities. Cost: Task 5 command gates do not establish those later integration behaviors.
- Final QA ruling: the 17 owner-listed exclusions remain unchanged and no newly obsolete QA case was found. Compatible QA cases ran. Cost: unfiltered npm test remains red until the independent tester replaces the superseded cases.
- Final input-contract ruling: malformed manually restored states (injected L1 orbs, invalid ramp counters), untyped null options and invalid direct helper arguments remain outside the initialized/typed-state contract; no extra guards were added. Cost: tools that bypass the normal initializer must supply valid state and typed inputs.
- Final ordering ruling: retained the existing victory chain under altered tuning; no additional runWon-versus-rampEnded order is specified. Ramp count, termination and event uniqueness are preserved. Cost: consumers must not infer an unspecified ordering in custom low-quota configurations.
- Final evidence ruling: coordinator ran tests/typecheck/build/fuzz sequentially; reviewer ran no tests. Cost: no independent second execution. All requested command gates passed; no spec, QA, dependency or protected-file changes, commits or integration actions.

## 2026-11-04 - P1 Task 6 execution rulings
- Used the real top-level snake/queue state, cutTail signature and registry/RNG interfaces recorded in the P1 plan name mapping. No mechanic spec changes.
- Added the required applyMidRunUnlocks hook in transition.ts, the existing level-up owner omitted from Task 6's file list. It runs after levelUp and rampOnLevelUp, preserving the mandated event order and the original read-only saved bestLevel value.
- Corrected the plan's L2-to-L3 example: the actual checkpoint start emits rampEnded between levelUp and skillUnlocked (Task 5, MEC-008-R8 and ARCHITECTURE event order). The test includes this event instead of suppressing it.
- Updated owned registry tests for the added snipWall entry and removed S from the owned unsupported-legend cases. The snipWall collision test uses the existing P0 died coordinates (the previous head cell); the recast fixture uses a four-cell post-cut snake so the small circle remains safe. These are fixture adaptations, not gameplay changes; tests/qa is untouched.
- Implemented snip-wall level cleanup through onLevelEnd per MEC-003-R7/R8: temporary walls crumble and disappear during transition. Natural solid expiry emits one tailSnip skillEnded timeout per MEC-006-R16; Slow-mo duration stays frozen during transition. The family is non-director, breakable, reserved and a BFS wall through crumble.
- Loadout validation checks both indexed slots, including sparse arrays whose holes Array.some would skip, to satisfy MEC-007-R11. A failing sparse-array regression test preceded this fix.
- Used the existing feat/p1-skills-a worktree; skipped branch creation, commits and integration per owner. Native config loading, threads/maxWorkers 2 and sequential npm commands address Windows spawn and host-memory constraints; no dependency or npm script changes.
- No new obsolete QA cases found. Retained exactly the 17 owner-provided exclusions from the Task 5 rulings above; all compatible QA cases still run and no repository runner exclusions were added.
- Final verification ran sequentially: filtered npm test 521 passed / 18 skipped / 5 todo (13.81 s), npm run typecheck exit 0, native-loader npm run build exit 0, filtered npm run test:fuzz 521 passed / 18 skipped / 5 todo (200 seeds x 120 s, 25.97 s). The normal suite exceeds the global <10 s target on this host; no unrelated runner/mocking changes were made.
- Independent read-only review found no Critical or Important issues. Optional coverage deferred: orb/director timer independence under Slow-mo and patched unlock/slot tuning. Existing code uses the configured values and these suggestions do not block the owner's command gates. No browser/phone check is claimed.
- Final scope: only Task 6 delivered, with 32 new task tests and owned registry/legend expectation updates; no mechanic spec, independent QA, dependency, protected-file, commit or integration changes. CODEMAP, CHANGELOG and STATUS are updated with CRLF preserved.

## 2026-11-04 - P1 Task 7 execution rulings
- Context: P1 Task 7 (Shield + rubble, Mango Rain, skill fuzz). Mechanic specs unchanged; these are plan-level deviations only.
- Collision: the solid-cell stage uses `familyAt(s, x, y, 'solidAt')` (keeps the existing rotten-rock-first priority) and calls `shieldHit` when Shield is active and that family is breakable, instead of the plan's inline loop. Same behavior for non-overlapping cells.
- Bonk (MEC-006-R27): `shieldHit` sets `acc = -bonkPauseTicks * s.tickMs`; `s.tickMs` already equals `effectiveTick` for this step (step 8), and this avoids a snake.ts -> skills.ts import cycle.
- Level clear: `checkLevelClear(s, b, ctx, fromRegularMango)` in transition.ts is shared by regular and rain mangoes. The regular mango keeps its existing order (level check, then ramp counter); `eatRain` follows the plan (ramp counter, then level check).
- Plan test fixes: MEC-006-R27 queues the down turn after the break (queued before the first step, the turn is taken at once and the rock is never hit). MEC-006-R35 transition diff compares t = 1 with t = 449 instead of 999, because crumbling items (450 ms) are removed before 999 and would differ by design.
- Fuzz: P0 MEC-004 fuzz kept unchanged in tests/core/fuzz.test.ts; P1 tests added beside it with harness tests/support/p1fuzz.ts. Start energy is drawn from 0..50 as planned, but even seeds start at `energy.max`: with 0..50 only, Mango Rain (cost 80) was never cast in 40 seeds x 30 s, which would make the MEC-006-R32 fuzz vacuous. The steering bot aims at the nearest food, steers only when the turn queue is empty, and with Shield active sometimes aims at a solid cell so breaks happen. The level-up exercise assertion runs only in fuzz mode (20 x 10 s rarely clears a level). Placement checks use the state at placement time (snake before the move) because a new regular mango may legally take the cell the tail just left.
- Fuzz wall time: with 200 seeds x 30 s the fuzz file took 64.4 s (single worker, together with the unchanged P0 200 x 120 s fuzz), above the plan's 60 s limit, so P1 sim time per seed in fuzz mode is 20 s (seeds unchanged at 200): 58.3 s.
- Interim Task 6 tests that asserted "lands in P1 PR 7" (skills.test.ts, testing.test.ts) and the six-family registry expectations were replaced with Task 7 behavior.

## 2026-11-04 - Pure src/session module wires save, sim and run log (P1-D1)
- Context: P1 Task 8. Scenes need one owner for run start, carry-over, checkpoint unlocks, run end and the local run log.
- Decision: a pure `src/session` module (`createSession(deps)`) importing only the core and meta public indexes; time and seeds come in through `SessionDeps`. Phaser scenes call `session.frame(ms)` instead of `sim.advance`. The boundary test scans `src/session` and allows only those two imports.
- Rejected: wiring in Phaser scenes (not unit-testable, logic split across scenes); putting session logic in `src/meta` (meta must not import core).
- Task 8: Ruling: `processEvents(session, events)` is a test-only export of session.ts implemented via a module WeakMap of per-session handlers, so it runs exactly the `frame` code path without adding methods to the public `Session` interface.
- Task 8: Ruling: `startRun` reads `bestLevel`, loadout and carry first, then saves `carriedEnergy = 0`, creates the sim, allocates the run id, then applies MEC-008-R1 for the start level so any `checkpoint_unlocked` records carry the new run id. The save is written twice at start; observable state matches the plan order.
- Task 8: Ruling: the log is held in memory and flushed only at run end, pause and hidden (P1-D5); tests that inspect mid-run records call `pause()`/`hidden()` first. `runWon` applies MEC-008-R2 inside the run-end path. Calls to pause/hidden/quit/frame without an active run are no-ops; `snapshot()` without any run throws.

## 2026-11-04 - P1 Task 9 greybox scenes rulings
- Context: P1 Task 9 (scenes, HUD, skill input). Presentation and input wiring only; no gameplay rule changed.
- Ruling: `runFlow.flowTurn` never starts a run (ready/over turns are dropped); `GameScene` opens on `flowStart` (P0 countdown) after Home/Loadout/Results called `session.startRun`. `GameScene.flowKey` ignores Space/P/Esc in ready/over so a key cannot start a run. P0 tests for turn-to-start were replaced.
- Ruling: `skillKeys.FlowPhase` aliases the existing P0 `FlowStatus` type. `homeView` sorts checkpoints for the stepper; `stepCheckpoint` with no checkpoints returns 1.
- Ruling: feedback timings with no balance key (orb haptic 8 ms, cast haptic 20 ms, reject shake 200 ms from MEC-006 §8; tip duration = 2 x `ui.bannerMs`; blink half-period 200 ms) are named constants in the game layer (presentation only, not tuning), not new balance keys.
- Ruling: layout has no free row under the level bar, so the energy bar is a thin row directly under the board; skill buttons sit in the bottom corners beside the D-pad with the ramp hint (left) and next-checkpoint hint (right) under them.
- Ruling: keys with no spec text got plain English strings (`loadout.back` "Back", `skill.reject.busy` "Not now!", `banner.freshStart` "Fresh start!" per GDD, `hud.energy` "Energy {energy}/{max}"); P0 `TEXT`/`CAUSE_TEXT` helpers stay for existing callers. `cause.clear` text is "You cleared level 30!".
- Ruling: the orb first-time tip uses the save `bestLevel` captured when the HUD is created (after `startRun`); `startRun` only raises bestLevel to the start level, so `< 2` is equivalent to the pre-run check. Checkpoint banners compare `session.save().unlockedCheckpoints` length before/after each `levelUp`.
- Ruling: HudScene is ~340 lines (over the ~300 guide) to keep the whole HUD event table in one file; split candidate for P2.

## 2026-11-04 - P1 Task 10 playtest tooling rulings
- Context: P1 Task 10 (playtest tooling). No gameplay rule changed.
- Ruling: new balance key `log.sessionGapMs` = 600000 (10 min, positive integer) defines a playtest session for `summarizeLog.runsPerSession` (plan lead decision 3); the gate "replay ≥ 3 times" is read as first-session `runsPerSession[0] ≥ 4`.
- Ruling: `summarizeLog` counts each runId once (first `run_start` / first `run_end`); a new session starts when a `run_start` comes more than `sessionGapMs` after the previous `run_end`. Runs without `run_end` count in `runs` but not in shares; `runsWithSkill` counts started runs with a `skill_used`, while `skillRunShare` uses ended runs only. Shares are rounded to 3 decimals.
- Ruling: logs are summarized in the browser console through debug-only `window.__summarize` (plan lead decision 5, no new dependency). `HomeScene` imports `summarizeLog` from `src/meta` for this debug helper only. The clipboard failure fallback is a read-only DOM textarea (removed on blur or scene shutdown).
## 2026-11-04 - GitNexus code graph and test scope (owner)
- GitNexus 1.6.9 indexes the repo into `.gitnexus/` (excluded via `.git/info/exclude`, not committed). Agents check `status` and use `query`/`context`/`impact` at task start, and refresh the index asynchronously at task end. Reason: cheaper, more accurate code location than file scanning (AGENTS.md §2b).
- Always `--index-only`: keeps GitNexus from rewriting AGENTS.md/CLAUDE.md and `.claude/` (protected files, §8). `--workers 2` because the host's low-memory reaper kills heavy processes.
- Test scope: minimal targeted tests during work; full `npm test` + `npm run typecheck` only before commit or merge. Reason: the full suite takes ~15-17 s and was being run after every edit.
- Rules live in AGENTS.md §2c and §6b (ruleset 0.3.2).
## 2026-11-04 - P1 owner playtest feedback (owner)
- P1 exit gate sample reduced from 5 testers to 2 (owner: tester availability is limited). Data so far: 1 desktop log (13 runs) + 1 phone log (3 runs); owner re-tests after the fixes below.
- Level-up slowdown (approved rule change, MEC-003/MEC-008 to be updated): on level up the snake keeps moving, existing obstacles stay, the level banner shows as today. The tick is immediately multiplied by a tier factor and eases back to the new level's normal tick. Tiers by level reached: 2-5 none; 6-15 x1.4 eased over 1 s; 16-30 x1.6 eased over 1.5 s. While Slow-mo is active the slower factor wins (no stacking). All values in `config/balance.json`.
- Bugs from the playtest, fixed on their own branches: 4/13 desktop runs died at the wall after exactly 1260 ms on level 1; WASD felt delayed.

## 2026-11-04 - Level-up flow B implementation choices
- Context: Flow B (no level-up freeze, no crumble, slowdown tiers) left a few details open; the specs now state them (MEC-003-R7..R12/R22, MEC-006-R13/R17, ARCHITECTURE "Sim step order").
- Choice A: the tick accumulator is kept at a level up (assumption A in `docs/superpowers/plans/2026-11-04-levelup-flow-b.md`); MEC-006-R18 clamps it when the effective tick changes.
- Choice B: a run that starts at a checkpoint level gets no slowdown (assumption B in the same plan); the first spawn timer is `firstSpawnMs` at once.
- Choice: the director skips while the slowdown is active instead of using a summed timer, which keeps "first spawn `firstSpawnMs` after the slowdown ends" exact, also with an empty mango slot.
- Choice: rotten rocks keep their MEC-002-R7 lifetime at a level up (owner answer 1).
- Choice: the level-up banner uses `ui.bannerMs` (owner answer 2); `level.transitionMs` and its parseBalance guard were removed.
- Choice C (extra amended rules): `HazardFamily.onLevelEnd` and its MEC-004-R16 / MEC-012-R4 rules were removed; `busy` was removed from `skillRejected` reasons (MEC-006-R13, MEC-007); the `transitionEnd` event, `phase` and `transitionLeftMs` were removed (MEC-003).
- Consequence: Slow-mo and the slowdown use the larger factor (MEC-006-R17); MEC-012 (P2a, not built yet) now has no level-end fade.

## 2026-11-04 - P2a plan after level-up flow B (lead rulings)
- Context: the P2a plan (`docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md`) was written before flow B and used `onLevelEnd` and the level-end fade. The plan was revised; two points were not settled by the specs.
- FB-1 (lead ruling): the mud tile factor multiplies the flow B slow factor: effective tick = `round(baseTickMs × max(Slow-mo factor, level-up slowdown curFactor) × tileFactor)`. MEC-004-R7 named only Slow-mo as `slowFactor`; the MEC-006-R17 max rule is used as `slowFactor`. P2a Task 5 updates the MEC-004-R7 text. Reason: one slow factor (Slow-mo and slowdown never stack, as flow B decided), and mud keeps its "half speed" meaning in every state.
- FB-2 (lead ruling): the escape-check and bot timelines (MEC-004-R18/R19) use one fixed tick per search, read from `effectiveTick(s, b)` at the start, even while a level-up slowdown eases. The real tick can only get shorter in the search window; the per-family fuzz (I1-I7) runs through level ups to catch any gap. Reason: keeps the BFS simple and deterministic.
- Also (follows from flow B, not a new rule): tile patches have no level-end hook and keep their lifecycle across a level up (MEC-012-R4/EC9); the capClass director keeps the slowdown skip (MEC-003-R11); P2 design §20 item 3 is void.


## 2026-11-05 - P2a Task 1 rulings
- Convert `HazardFamily` to the state-level contract. Preserve existing per-instance algorithms as `InstanceRules`, composed by `defineFamily` in `hazards/family.ts`; descriptors retain no simulation state.
- Serialize `TimedHazard.spawnSeq` and `SimState.nextHazardSeq` to retain P1 cross-family update and snapshot order through clone/restore. Assign sequences with `addTimedHazards`; reject missing sequences instead of silently treating them as zero.
- Add optional `SpawnCtx.rng`: the director forwards its existing RNG; direct family calls default to `rngFrom(s.rng)`, preserving scripted RNG behavior.
- Preserve MEC-002-R7 rotten-rock collision priority through the single `solidFamilyWithPriority` helper. General composite queries retain registry order.
- Until Task 2 supplies update-time collision dispatch, `hitHead` throws if unexpectedly invoked; current families never call it.
- Leave the GDD MEC-012 row untouched pending lead approval.

## 2026-11-05 - MEC-004 L3: rule 3 applies retroactively (lead ruling)
- Apply MEC-004-R12 to every director family, including P0/P1 rocks, fences, mazes and terrain. Reject a candidate if its new BFS walls disconnect a previously reachable regular mango; an already unreachable mango does not block placement (L4).
- Consequence: existing seeded spawn sequences may change when a candidate fails rule 3. Terrain adds no BFS walls and remains subject to the owner-approved distance of 4 (MEC-004-R11).
- Flow B keeps every family instance through a level up (MEC-004-R16). P2 design section 20 item 3 is void; MEC-003-R7 is unchanged.

## 2026-11-05 - MEC-004-R17 smoke sample size
- Use 2 seeds with a 20-second run limit per family in the normal suite, the fallback authorized by P2a Task 4. Keep the full fuzz matrix at 200 seeds with a 120-second run limit and every-spawn escape checks.
- Reason: reduce the added smoke cost when the complete suite exceeds its 10-second target. Existing tests and Windows worker startup also contribute; this sample reduction does not guarantee that the whole suite meets the target.

## 2026-11-05 - MEC-004-R19 bot runs through Vitest
- The headless bot and death-cause report live in `tools/bot/` and run via `vitest run --mode bot` (`npm run bot:report`); no new dependency or runner. The bot uses one fixed tick per search read from `effectiveTick` (FB-2) and treats `levelUp` as an immediate clear (flow B has no transition).

## 2026-11-05 - P2a lead rulings carried to Task 9
- `HazardFamily.emitsIncoming` marks families that own or defer their own `hazardIncoming` warning, so the director stays silent for them (JSDoc on the flag).
- `SpawnCtx.rng` is required (not optional): every spawn caller supplies the stream explicitly, and spawnCtx fills it from the simulation RNG. This supersedes the Task 1 optional-rng note.
- Callers of `effectiveTick` stay head-tile-aware: they pass the head tile so MEC-012 mud slowdown applies only while the head is in mud.
- Full fuzz runs (`npm run test:fuzz`) and `npm run bot:report` happen only at the P2a exit, because of RAM limits; normal work uses the smoke sample.

## 2026-11-05 - P2b Task 1 rulings (lead, technical)
- `HazardFamily.causeAt` (TR-B5) applies to the collision death cause too: `resolveHeadCell` and `applyHeadHit` report `causeAt(s, x, y) ?? cause`, not only `solidCauseAt`. Otherwise fence-cell deaths in a gate would report `gate` and NPC deaths would always report `cat` (MEC-014 L4, MEC-015 R7).
- P2b families do not emit `hazardIncoming` in `spawn`; `emitsIncoming` stays unset and the director emits it (P2a MEC-004-R9). The plan's spawn sketches that call `ctx.emit({type: 'hazardIncoming'})` would duplicate the event.
- `bfsDistance` does not exist in `grid.ts` after P2a (only `reachable`); Task 8 adds it.

## 2026-11-05 - P2b Task 3 mover lifetime accounting
- Keep a JSON `lifeT` interval clock alongside the movement clock `t`. MEC-015-R6 lifetime starts on the first successful cell entry and is charged once per `cellMs`, including waits; the movement clock stays saturated during blocked retries. The draft charged lifetime before the first entry and on every 1 ms retry, which could expire an NPC early. Zero lifetime means one traversal, so `newMover` disables ping-pong in that case.

## 2026-11-05 - P2b Task 5 U-gate review ruling (lead)
- Gates own the U boundary and tagged mouth cells in `gate.shapes.U`; the P0 fence U stays unchanged. The gate U has a 2 x 2 interior and a two-cell-wide mouth: two gate cells cycle both mouth cells; one gate cell leaves the other mouth cell as fence. See MEC-014-R1/R10 and edge case 3. U-trap regressions must prove the closed mouth seals the interior and an exterior route exists through reopening (or the spawn is rejected).
- Gate warning validation uses the shared MEC-004-R13 fairness minimum; no separate 900 ms constant. Gate snapshots expose `GateView` instead of internal `GateInstance` state.

## 2026-11-05 - P2b spike review ruling
- MEC-014-R6: the escape-check horizon cannot foresee a level-up beat reset; this is safe because the reset starts down and warnings still precede any rise.

## 2026-11-05 - P2b bird rulings (MEC-016)
- MEC-016-R1 / L3: the reachable-in-time cost is a Dijkstra path cost where each step costs the base tick, times `mud.tickFactor` when the step leaves an active mud cell (the head's tile sets the next tick, as in `effectiveTick`). Slow-mo and the level-up slowdown are ignored. Grid helpers `pathCost` and `bfsDistance` take `cols, rows, isWall` like `reachable`, so `grid.ts` stays independent of `SimState`.
- MEC-016-R3: the replacement mango excludes the stolen cell (new optional `exclude` argument on `placeMango`), so "a new mango appears elsewhere" holds. Placement draws from the simulation RNG stream, like `mangoTick`.
- MEC-016 edge case 3: family updates run before snake movement within one ms, so a steal on the shadow's final ms happens before that ms's move. An eat in any earlier ms wins. R1's 600 ms margin covers this one-ms gap.
- MEC-015-R2: an L route draws `bend = 2 + rng.int(len - 3)` so both legs are at least 2 cells long. A route with len < 4 stays straight and skips the bend draw.

## 2026-11-05 - P2b bomb rulings (MEC-017)
- MEC-017-R2: the bomb's `blast` (area + countdown) is created at spawn, not at landing, so the area is reserved in every state including warn; the countdown is reset and starts at landing. `bfsWallAt` covers the bomb cell during warn and count only.
- MEC-017-R3 "at most once per blast": the update-time area hit runs only on the activation ms (the head can enter the area later only by a snake move, handled by `headHit = 'area'` in `resolveHeadCell`). `BlastState.hit` is set on both paths (the activation hit and, through the new optional `onAreaHit` family hook called from `consumeShield`, a head-entry absorb), and `headHit` returns null afterwards, so a Shield absorb is never followed by a second hit in the same window. This holds even if the tick shortens (level-up slowdown easing out, Slow-mo ending): the effective tick can be longer or shorter than the base tick, so "at most one snake move per window" is not guaranteed and the `hit` flag is the guard. `activeMs` is measured once at activation with `baseTickMs` (TR-B7).
- MEC-017: landing emits `dust` only, not `landed` (that event's `hazardType` is the P1 `TimedKey`).
- Fuzz harness: the blast area is head-only, so area cells (`bombArea` marks) are exempt from I1 but keep I3 (3000 ms warning while counting) and I6 (lethal on the activation ms).

## 2026-11-05 — Gate fence posts stay greybox squares (MEC-014 §8 deviation)
The P0 `drawFence` helper needs a HazardView and Palette and joins rails across neighbours; it does not fit timed gate fence cells, so `cycles.ts` keeps plain post squares until the P2b art pass.

## 2026-11-05 — P2c per-biome tuning: weights only, two WARNs left for the owner
Bot report L1-30 x 20 seeds (evidence in `docs/PLAYTEST.md`, "P2c tuning"). Tuned weights only: fence 2 -> 1 in L11-14 rows, coconut 2 -> 1 in L16-19 rows. Challenge rows keep their MEC-003 section 12 weights (no challenge level had 0 clears). Left as WARN: biome 4 coconut 100% of deaths (sole killing family, 12 of 22 deaths on the L20 challenge row; weights cannot fix it) and biome 3 fence 1 of 1 death (noise). Owner options: L20 coconut weight 4 -> 2 (tested: L20 clears 8 -> 15 of 20) or coconut parameter tuning. Board size: L25 95% and L30 88% reachable, L26-30 clear 36% vs L21-25 50%: no escalation (P2-D8). The bot report now runs with `--reporter=verbose` because Vitest hides passing-test console output; `reachableFreeCells` takes the balance for board dimensions (SimState has none).

## 2026-11-06 - Shield leaves no rubble (owner decision, MEC-006-R28)
Owner feedback: after Shield broke an obstacle, rubble appeared in the cell ahead of the head and going straight killed instantly, so the skill hurt more than it helped. Decision: Shield breaks the obstacle and is consumed; no rubble is created; the bonk pause (R27) stays. Applies to every break path (solids and movers). Supersedes the 2026-11-03 lead note that rubble is the skill price (MEC-006 section 11); the snip wall exemption is unchanged. Impact: `consumeShield` no longer places rubble; `shieldBroke` event drops its `rubble` field; the `rubble` family and `skills.shield.rubbleLifeMs` stay (inert family, still used to seed rubble in tests); MEC-002/004/006/013/014/015/017 and GDD section 6.3 text updated; tests updated.

## 2026-11-06 - Run start waits for the first direction input (owner decision, MEC-001-R2)
- Context: owner playtest log had 7 runs ending `wall` at exactly 1260 ms with 0 turns (head (8,8) facing right, 9 steps x 140 ms; sim time excludes the 1500 ms countdown). Players did not realise the snake moves on its own.
- Choice: after the run-start countdown the flow enters a `waiting` phase (pure `runFlow`, `FlowState.started`): no sim frame, no tick/director/timers, no `durationMs`. First non-reverse turn input (keys, swipe, D-pad) queues as today and starts play; straight starts too; reverse of the start direction is ignored; skill input ignored (MEC-007-R15). Pause/resume stay valid; a resume before the first input returns to `waiting`. Fresh run starts only, not level-ups (flow B). Provisional hint strings in `text.ts` (owner batch Q).
- Alternatives: longer countdown; auto-move with a visible arrow only; any key/tap starts.
- Consequence: MEC-001-R2, MEC-007-R9/R15, GDD section 3 flow updated; `ready` stays the idle pre-start status; QA flow tests send a first turn.

## 2026-11-06 - Character art: one reference character (capy) and agent-sprite-forge as an optional tool
- Context: Figma D2 heads look flat (no outline, 3 states). Owner wants livelier characters and proposed github.com/0x0funky/agent-sprite-forge (MIT): approved master still, per-action animation, atlas + JSON export.
- Choice: perfect one reference character (Capybara) on the shared 48 x 48 rig, then clone other skins on the same anchors (ART-001). Use the tool only on the owner's machine with Codex CLI / Grok CLI (no API key); static expression stills + Phaser tweens are the default motion route. Folder layout in ART-001 section 7.
- Alternatives: keep vector-only heads (cheap, flat); draw every skin separately; paid image/video APIs.
- Consequence: nothing is added as a dependency yet; any generated asset needs a human check and a licence note. Outline question (GDD 10.1 vs Figma D2) is open (ART-001 Q1).

## 2026-11-06 - Start P3 (capy) before the P2 exit playtest; capy drawn as layered SVG
- Context: P2 code is done and accepted; the P2 exit playtest needs owner time. Owner wants a good-looking game first and will return to the playtest later.
- Choice: owner-approved deviation from GDD section 11 order: P3 starts now, split into P3a juice, P3b screens, P3c capy; P3c first. Capy personality follows Figma (round eyes, smile) plus the GDD outline. The agent draws a layered SVG on the ART-001 rig; Phaser rasterises it with `load.svg` (no new dependency); motion by texture swaps and tweens.
- Alternatives: finish the P2 exit first; Codex image_gen raster masters (ART-002, now fallback); owner exports from Figma.
- Consequence: P2 exit (playtest, full fuzz) stays open in STATUS; spec docs/superpowers/specs/2026-11-06-capy-character-design.md.

## 2026-11-06 - D2 UI mockups live in the repo
- Context: owner provided UI mockups as a Claude Design artifact link (not Figma) for P3 screens; agents cannot rely on a private link.
- Choice: commit PNG snapshots (2x) plus the `.dc.html` sources and `canvas.json` under `docs/design/mockups/`, with `docs/design/UI-MOCKUPS.md` as the map and token list. Runtime `support.js` is not committed.
- Alternatives: link only (not reproducible offline); Figma export (no Figma file exists); PNGs only (loses exact numbers).
- Consequence: about 6 MB added to the repo; refresh steps in UI-MOCKUPS section 5.

## 2026-11-07 - P3-0 UI foundation: Phaser-native D2 port, self-hosted fonts, settings in save v3, P3 on version/v0.3
- Context: P3-0 builds the shared UI base for the D2 mockups. The owner wants the screens in Phaser, not as an HTML/DOM overlay. Fonts must not depend on a runtime Google Fonts request. Display and sound options must survive restarts. The v0.2 P2 exit is still waiting on the owner playtest.
- Choice: (1) P3 screens are a Phaser-native port of the D2 mockups (spec D1); a DOM overlay was rejected. (2) Fonts (Nunito, Lilita One) are self-hosted from the Fontsource CDN 5.1.0 as binary assets in `public/fonts`, not an npm dependency, with no runtime Google Fonts (D4). (3) Save v3 adds `settings` {sound, haptics, dpad, reducedMotion, boardTheme}; `null` means follow the OS (D7). (4) P3 work happens on `version/v0.3`, branched from `docs/p3-spec`, because the v0.2 P2 exit still waits on the owner playtest (owner 2026-11-07).
- Alternatives: DOM overlay for menus (faster to build, rejected by D1); Google Fonts link (network dependency, rejected by D4); fonts from npm (extra dependency, rejected); keep P3 on `version/v0.2` until the playtest passes (blocks P3 on owner time).
- Consequence: `src/game/uiTokens.ts`, `src/game/ui/` and `src/meta/settings.ts` are the new modules (CODEMAP); the P2 exit stays open in STATUS.
- Consequence: save v3 is not readable by v0.2 builds (same key `mango-snake.save`, same localhost origin). A v0.2 build treats it as a future version, loads defaults and overwrites progress. Back up `mango-snake.save` from localStorage, or run v0.2 on a different port, before the P2-exit playtest.

## 2026-11-07 - P3b-3 menus: D2 Boot/Home/Loadout/Results and Settings scene (rulings C1-C10)
- Context: P3b-3 ports the D2 menu screens to Phaser. Where mockups and specs disagree, the lead rulings C1-C10 in `docs/superpowers/plans/2026-11-07-p3b-3-menus.md` decide (spec wins).
- Choice: (1) Settings is a scene overlay with the contract `{overlay, returnTo}`; closing it emits `settings-closed` and returns to the caller. (2) Settings save immediately through `Session.updateSettings` (no Save button). (3) Loadout drops the mockup note line (C9); the "Start energy N" chip stays when carry > 0. (4) First-run definitions (C4, C5): Loadout skip stays (`showLoadout`); compact/first-run Home = no unlocked checkpoint AND no carried energy; the Results first-run Best chip is plain "Best N", the arrow to the marble machine is hidden until P4 (D8). (5) Results energy-saved card (C7): the marbles card slot shows "Energy saved: N" when N > 0. (6) Home settings button uses the sliders glyph per HomeD2; Settings switch and tile colours follow SettingsD2.
- Alternatives: keep the mockup note line (shrinks Loadout to 0.835, below the 0.85 floor); a Settings modal with a Save button; the marble-machine arrow on the first run (P4 screen does not exist yet).
- Consequence: `scenes/SettingsScene.ts`, `flow/settingsView.ts`, `flow/settingsApply.ts`, `flow/bootView.ts`, `flow/loadoutView.ts`, `flow/resultsView.ts` and `ui/menuMetrics.ts`, `menuLayout.ts`, `icons.ts`, `menuWidgets.ts` are the new modules (CODEMAP); the provisional strings (Shield and Mango Rain descriptions, Settings labels) and C1-C10 wait for owner acknowledgement in STATUS (lead).

## 2026-11-07 - P3b-1 board art lead decisions
- Context: P3b-1 replaces the greybox board with the D2 board art (six biome grounds, light and dark board themes, rocks, warning tiles, fences, hedges, mud/ice/rising stone, mango icon). The D2 mockups show light grounds for biomes 1-5 only, and biome 6 is already dark. Gameplay, snapshot shape and timings stay unchanged.
- Choice: (1) Dark board theme is derived: each light ground mixed 70% toward `#131D15` (the dark `bg`), edge colour white, grid white at 10%. Biome 6 keeps its own colours in both themes. Edge-vs-ground contrast must be >= 4.5:1 for every biome and theme (unit tested). (2) One rock type in core: hazard, rotten and snip rock = `rock` (0.82 of a cell), skill rubble = `pebble` (0.5); `boulder` (0.98) is implemented in `drawRock` but unused until a spec uses it. (3) Mango only: fish, bone and melon icons are skin art and wait for P4 (spec D8). (4) Board outline and screen background are unchanged; the mockup's cream ring and card belong to P3b-2. (5) Coconut lane band, bomb fuse and cats/chickens appear on the biome boards but are not in the P3b-1 scope; `movers.ts`, `blasts.ts`, `cycles.ts` and `shrink.ts` are not restyled here (follow-up P3b-1b if the owner wants it). (6) Approximations, because Phaser Graphics has no blur or CSS blob radius: rock blob = ellipse (aspect 0.92); hedge glow = one expanded translucent rounded rect; stone tile asymmetric radii = one radius; "!" and chevron are drawn as shapes, not Fredoka text/SVG. (7) Ice and mud warn shapes are not in the mockups (Tile only has mud, rise-warn and rise-up), so the existing drop (mud) and snowflake (ice) shapes are kept and only recoloured. (8) Hex literals are allowed only in `biomePalette.ts` and `boardParts.ts`; render files take colours from `BoardLook` / `PART` and sizes from cell fractions. (9) GameScene re-reads palette and reduced motion on `settings-closed` (A-R2).
- Alternatives: keep the greybox board until the owner supplies dark-theme mockups; port the coconut, bomb and NPC art in the same unit; hard-code colours in the render files.
- Consequence: `render/biomePalette.ts` and `render/boardParts.ts` are the new pure modules (CODEMAP); the dark theme and the rock mapping are owner-reviewable decisions (listed as blockers in STATUS); movers art is a follow-up.

## 2026-11-07 - P3b-2 in-run HUD and overlays
- Context: P3b-2 replaces the greybox HUD with the D2 look (GameD2, GameDpadD2, PauseD2, CountdownD2, BannersD2, SkillActiveD2) and investigates the phone log "1 run quit without run_end".
- Choice: (1) Quit root cause: pause Quit already ended the run (`session.quit()` -> `run_end` cause `quit`, MEC-003-R20); the orphan came from a run left without Quit (tab closed, reload, app killed). Fix: `startRun` ends a still-active run as `quit` (R6 carry, `run_end`), and `abandonedRuns(log)` lists `run_start` records without `run_end`; closing the tab still leaves only the MEC-008-R7 provisional carry. (2) D-pad hidden unless `settings.dpad` (GDD §3 "optional D-pad (setting)"; owner-visible change from the always-on greybox pad). (3) The HUD sound button is dropped: sound lives in Settings (P3b-3); the `M` key still toggles. (4) Settings overlay contract: Pause shows Settings only when the `Settings` scene is registered and launches `scene.launch('Settings', { overlay: true })`; Settings stops itself on Back and emits `settings-closed`; Pause re-enables its buttons and Hud re-reads sound, haptics and D-pad on that event and on Resume (`Session.updateSettings`, no `setDpad`). Skill keys are ignored while Settings is active; every vibration is gated on `settings.haptics`. (5) One banner queue per level-up (level-up card, challenge, biome, checkpoint, new-family hint), each `ui.bannerMs`, capped at `ui.hud.bannerQueueMax`; a new level-up replaces the queue. A run that starts on a challenge level shows its challenge card when the countdown ends (not under the digit). (6) HUD tuning moved from `HudScene` constants to `balance.ui.hud`; HUD chrome uses UI tokens only, so the HUD dark-mode listener is gone (the board dark theme stays P3b-1's). (7) Bottom chip priority: the speed-ramp "Warming up N" hint replaces the checkpoint chip while the ramp is active (MEC-008-R8). (8) Not adopted from the mockups: tap-to-skip countdown (MEC-001-R2 fixed countdown), always-on shrink chip (shown only when the batch has `shrunk` with from > to, MEC-001-R4), marbles line, hill silhouette, dashed new-obstacle box.
- Alternatives: keep the greybox D-pad always visible; keep a HUD sound button; write `run_end` from `beforeunload` (unreliable on mobile).
- Consequence: `src/game/hud/*` holds the pure models and thin views (CODEMAP); new banner/pause/countdown/pill strings are provisional (owner batch); hazard "incoming" lines show as tips instead of the old top banner so they do not cut the level-up queue.

## 2026-11-07 - P3b-2 HUD ramp chip display rule
- Context: final review found "Warming up N" on an L1 start, where MEC-008-R8 says the ramp has no effect (the sim keeps `rampActive` true there).
- Choice: the HUD shows the ramp chip only when `rampActive && startLevel > 1` (the same rule as the countdown checkpoint card); an L1 start shows the checkpoint hint instead. Display rule only, no gameplay change.
- Alternatives: change the sim so L1 never sets `rampActive` (gameplay/spec change, not approved).
- Consequence: `HudSnap` gains `startLevel`; tests in `tests/game/hudModel.test.ts`.
- Note (2026-11-07): the greybox HUD's level-up white flash was dropped with the D2 HUD rewrite; level-up juice belongs to P3a.
