# STATUS - project memory

> AI: read at session start, rewrite at session end. Keep under 60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Codex **Milestone:** M1 / P0 execution **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1-7 merged (owner context).
- [x] P0 Task 8 complete on `feat/p0-hud-flow`; recovered changes audited and revalidated, still uncommitted.
- HUD includes stats, level bar, banners, cards with legend, countdown, D-pad and sound/pause controls.
- Prototype synth/haptics, versioned browser save wiring and pure string helpers are connected.
- Board parity uses inner 18px rounded clipping and a separate 4px external ink outline that follows shake.

## Next (ordered, max 5)
1. Owner review/commit Task 8, then merge into `version/v0.1` with `--no-ff`.
2. P0 Task 9: parity/QA, desktop and phone checks, then phase exit.
3. P1 plan execution after P0 exit; P2a follows P1.

## Blockers / open questions for human
- No automated Task 8 blockers: tests, typecheck and production build exit 0.
- Browser use excluded by owner: console check, board/HUD layout, shake clipping, theme/reduced-motion and phone controls remain unverified.
- Live audio, haptics and save persistence across an actual reload need device checks.
- Prototype save keys are intentionally not imported; only `mango-snake.save` is used.
- OPEN (not blocking P0-P2): session-length targets (GDD section 4); return motivation (section 8.3).

## Known issues / tech debt
- Existing suite retains 1 skipped test and 2 todos; `tests/qa/` was not modified.
- Prototype remains the P0 behavior reference; freeze at Task 9.
- P0/P1 retain terrainNearHeadDist 3; P2a Task 3 raises it to 4 and re-baselines goldens.
- Vite/Vitest configs are not type-checked (no @types/node allowed in P0).

## Last session summary
- Re-read AGENTS, routing, Task 8/global constraints and its named design sections; checked persisted implementation and tests.
- Saved TDD/review ledger confirms completed text, platform, D-pad, HUD, swipe-release and board-clipping regressions.
- All implementation and doc steps had persisted; no additional production changes were necessary on resumption.
- Fresh validation: npm test -- --maxWorkers=2: 340 passed, 1 skipped, 2 todo (40 files); typecheck and build exit 0.
- Validation ran sequentially with at most two concurrent test workers to limit host memory use.
- CODEMAP, CHANGELOG and DECISIONS already contain Task 8 updates; STATUS refreshed with CRLF preserved.
- Existing ignored preload: `.token-ledger/task7-validation/validation.cjs` (Vitest threads and Vite sandbox net-use probe only).
- No dependencies, commits, browser use or changes to tests/qa/; task branch remains in place.
- Gotchas: local main is the old Ant Trail project; never use it. No Python; use Node.
