# STATUS - project memory

> AI: read at session start, rewrite at session end. Keep under 60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Codex **Milestone:** M1 / P0 execution **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1-6 merged (owner context); core and save skeleton are available.
- [x] P0 Task 7 implemented on `feat/p0-board-input`; all changes left uncommitted as requested.
- Added Phaser Boot/Game scenes, cached themed board, render layers, cosmetic effects and seed logging.
- Added frame clock/run flow, keyboard and CSS-pixel swipe input, blur/hidden pause and listener cleanup.
- Pure flow/input boundary scans and 20 new tests cover clock, run flow, swipe and mango presentation time.
- Particle burst presets now match prototype counts/speed/life; landing dust also uses the prototype rock color.

## Next (ordered, max 5)
1. Owner review/commit Task 7, then merge into `version/v0.1` with `--no-ff`.
2. P0 Task 8: HUD, overlays, countdown display, D-pad, audio/haptics and save wiring.
3. P0 Task 9: parity/QA, desktop and phone visual checks, then phase exit.
4. P1 plan execution after P0 exit; P2a follows P1.

## Blockers / open questions for human
- No automated Task 7 blockers: tests, typecheck and production build all exit 0.
- Browser use excluded by owner: render/console check, play through level 7, phone input and live theme/reduced-motion checks remain pending.
- Sandbox process restrictions require a temporary launch preload for Vite's optional net-use probe and Vitest threads.
- OPEN (not blocking P0-P2): session-length targets (GDD section 4); return motivation (section 8.3).

## Known issues / tech debt
- Existing suite retains 1 skipped test and 2 todos; tests/qa/ was not modified.
- Prototype remains the P0 behavior reference; freeze at Task 9.
- P0/P1 retain terrainNearHeadDist 3; P2a Task 3 raises it to 4 and re-baselines goldens.
- Vite/Vitest configs are not type-checked (no @types/node allowed in P0).

## Last session summary
- Corrected Task 7 particle parity from prototype L278-288, L402, L569, L684 and L787.
- Named presets live in render/effects.ts: golden 16; rot 8/.004/420; dust 3/.004/320; scene handlers contain no burst parameter literals.
- Normal eat/death values retained in the same preset table; generic speed/life defaults also have named constants.
- Final verification: npm test 287 passed, 1 skipped, 2 todo (30 files); typecheck and build exit 0.
- Removed the particle deferral; CHANGELOG and STATUS preserve CRLF. Existing modules/maps remain accurate.
- Commit nothing; tests/qa/ untouched; no new dependencies or browser use.
- Validation still uses the ignored local preload in .token-ledger/task7-validation/.
- Gotchas: local main is the old Ant Trail project; never use it. No Python; use Node. Preserve docs CRLF.
