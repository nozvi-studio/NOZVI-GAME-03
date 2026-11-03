# STATUS - project memory

> AI: read at session start, rewrite at session end. Keep under 60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P0 execution - **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1-4 merged into `version/v0.1` (owner context).
- [x] P0 Task 6 save skeleton implemented on `feat/p0-save`; left uncommitted as requested.
- Task 6 adds a versioned envelope, validation, migration loop, storage port and in-memory store.
- Task 5 hazards are on another branch and were excluded from this task.

## Next (ordered, max 5)
1. Owner review and commit Task 6, then merge `feat/p0-save` into `version/v0.1` with `--no-ff`.
2. Complete remaining P0 tasks on their own branches; Task 7 adds Phaser board rendering and input.
3. P0 exit = tests/typecheck + Playwright QA + prototype parity + owner 5-minute phone test.
4. P1 plan (10 PRs); P1 exit playtest: 5 testers (owner recruits).
5. P2a plan (9 PRs); at exit write MEC-013-018 and P2b/P2c plans (P2-D1).

## Phase gates (who checks)
- P0 exit: tests/typecheck + Playwright QA + prototype parity; owner phone check.
- P1 exit: summarizeLog + PLAYTEST gate (>=3/5 replay >=3 runs, skills in >=50% runs).
- P2a exit: bot report L7-L15 (lead). P2 exit: all 30 levels, no cause >40% (owner approves).
- Before P3: owner approves art style tile (GDD 10.1). Before P4/P5: published drop odds (13).

## Blockers / open questions for human
- No Task 6 blockers or plan-code deviations.
- OPEN (not blocking P0-P2): session-length targets (section 4); reason to come back tomorrow (section 8.3).
- Publish target = GitHub Pages (owner decision 2026-11-04); Vite base set at deploy time.
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- QA: QA-T2-34/35 check grid BFS only; tail/terrain wall exclusion needs QA at Tasks 3/5.
- QA-T2-17 (MEC-004-R13) skipped until P2a; existing suite also contains one todo.
- Hazard-aware cell queries and director integration remain Task 5 work.
- Prototype stays the P0 behavior reference and is frozen at Task 9.
- P0/P1 keep terrainNearHeadDist 3; raised to 4 in P2a Task 3 (re-baseline goldens).
- Vite/Vitest configs are not type-checked (need @types/node, not allowed in P0).
- Full browser console check falls to Playwright QA at P0 exit; required from Task 7 onward.

## Last session summary
- Task 6 tests written first; npm test failed on missing src/meta before implementation.
- Seven save tests cover round trip, malformed/future saves, migration, storage errors and old keys.
- Plan code copied without corrections; CODEMAP and CHANGELOG updated; tests/qa/ untouched.
- Verified: npm test 155 passed, 1 existing skip, 1 existing todo; typecheck and build exit 0.
- Read-only review found no blocking issues; documentation placeholder corrected.
- Branch creation and commit steps skipped; no dependencies added.
- Initial Vite spawn EPERM cleared on a separate PTY retry.
- Local main is the old Ant Trail project; never use it. Preserve docs CRLF.
