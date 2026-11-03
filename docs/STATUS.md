# STATUS - project memory

> AI: read at session start, rewrite at session end. Keep under 60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Codex **Milestone:** M1 / P0 execution **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1-4 exist in the Task 5 baseline (owner context).
- [x] P0 Task 5 implemented on `feat/p0-hazards`; left uncommitted as requested.
- Task 5 adds the hazard registry, rock/fence/maze/terrain families, director and Sim integration.
- Added 58 tests, including seeded invariant fuzzing and determinism checks.

## Next (ordered, max 5)
1. Owner review and commit Task 5, then merge `feat/p0-hazards` into `version/v0.1` with `--no-ff`.
2. P0 Task 6 (save skeleton), then Tasks 7-9, one task branch each with TDD.
3. P0 exit: tests/typecheck/build, Playwright QA, prototype parity and owner 5-minute phone test.
4. P1 plan (10 PRs); exit playtest: 5 testers (owner recruits).
5. P2a plan (9 PRs); at exit write MEC-013-018 and P2b/P2c plans (P2-D1).

## Blockers / open questions for human
- No Task 5 gameplay or compilation blockers; plan production code required no behavioral corrections.
- Sandbox blocks child-process spawning: Vite's optional network-drive probe and Vitest forks need launch workarounds.
- OPEN (not blocking P0-P2): session-length targets (GDD section 4); return motivation (section 8.3).
- Publish target: GitHub Pages; Vite base set at deploy time (owner 2026-11-04).
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- QA process: agy writes only tests/qa/ from MEC specs; QA-T2-17 stays skipped until P2a.
- QA-T2-34/35 check grid BFS; hazard-aware cell queries are now integrated for Task 5 QA follow-up.
- Prototype remains the P0 behavior reference and is frozen at Task 9.
- P0/P1 retain terrainNearHeadDist 3; P2a Task 3 raises it to 4 and re-baselines goldens.
- Vite/Vitest configs are not type-checked (no @types/node allowed in P0).
- Full browser console check falls to Playwright QA at P0 exit; required from Task 7 onward.

## Last session summary
- Wrote hazard tests first; five suites failed on missing modules before implementation.
- Plan production code copied; CODEMAP, CHANGELOG and STATUS updated with CRLF; tests/qa/ untouched.
- Verified: 183 tests passed, 1 existing skip; final 50-seed run 7.61 s; 200-seed run 17.09 s (concurrent validation).
- Typecheck and production build exit 0; boundary glob includes all eight hazard modules.
- Validation uses a temporary NODE_OPTIONS preload for the optional net-use probe and Vitest's thread pool.
- Plan deviations: live clone/JSON fixtures use scripted steering; director timer fixtures hold the tick accumulator and unlock tests probe real spawns.
- Branch creation and commits skipped as requested; no new dependencies or protected-file changes.
- Gotchas: local main is the old Ant Trail project; never use it. No Python; use Node. Preserve docs CRLF.
