# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Codex **Milestone:** M1 — P0 execution · **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 Tasks 1–2 merged into `version/v0.1` (owner context).
- [x] P0 Task 3 (snake, levels, Sim shell) implemented on `feat/p0-snake-level`; left uncommitted for review as requested.
- Task 3 includes the planned state helper, 23 new tests, cell queries, turn queue, collisions, growth, progression and snapshot API.

## Next (ordered, max 5)
1. Lead review and commit Task 3, then merge `feat/p0-snake-level` into `version/v0.1` with `--no-ff`.
2. P0 Task 4 (mangoes), then Tasks 5–9, one task branch each with TDD.
3. P0 exit = tests/typecheck + Playwright QA + prototype parity + owner 5-minute phone test.
4. P1 plan (10 PRs) → P1 exit playtest: 5 testers (**owner recruits**).
5. P2a plan (9 PRs) → at P2a exit write MEC-013…018 + P2b/P2c plans (P2-D1).

## Phase gates (who checks)
- P0 exit: tests/typecheck + Playwright QA + prototype parity; owner phone check.
- P1 exit: `summarizeLog` + PLAYTEST gate (≥3/5 replay ≥3×, skills in ≥50% runs).
- P2a exit: bot report L7–L15 (lead). P2 exit: all 30 levels, no cause > 40% (owner approves).
- Before P3: owner approves art style tile (GDD §10.1). Before P4/P5: published drop odds (§13).

## Blockers / open questions for human
- No Task 3 blockers or plan-code deviations.
- OPEN (not blocking P0–P2): session-length targets §4; reason to come back tomorrow §8.3.
- Decided 2026-11-04: publish target = GitHub Pages (GDD §13); Vite `base` set at deploy time.
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- QA process: agy = dedicated tester (writes tests/qa/ only, from MEC specs). QA-T2-34/35 only check grid BFS; tail/terrain wall exclusion needs QA at Tasks 3/5. QA-T2-17 (MEC-004-R13) skipped until P2a.
- Task 3 intentionally leaves mango replacement/rot to Task 4 and hazard registry/director integration to Task 5.
- Prototype stays the P0 behavior reference and is frozen at Task 9.
- P0/P1 keep prototype `terrainNearHeadDist` 3; raised to 4 in P2a Task 3 (re-baseline goldens).
- `vite.config.ts` / `vitest.config.ts` are not type-checked (need `@types/node`, not allowed in P0).
- Full browser console check falls to Playwright QA (agy) at P0 exit; Task 1 had build + HTTP 200 only.

## Last session summary
- Task 3 tests written first; `npm test` failed on missing level/sim modules before implementation.
- Plan implementations copied without corrections; CODEMAP, CHANGELOG and STATUS updated; tests/qa/ untouched.
- Verified: `npm test` 83 passed, 1 existing skip; `npm run typecheck` exit 0; `npm run build` exit 0.
- Environment: validation needs a PTY here; plain-pipe Vite startup fails with `spawn EPERM` on `net use`.
- Gotchas: local `main` = old Ant Trail project; never use it. No Python; use Node. Preserve docs CRLF.
