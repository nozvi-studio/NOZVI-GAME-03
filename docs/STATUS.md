# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P0 merged; P1 Task 1 complete (uncommitted). **Version branch:** `version/v0.1`

## Now (in progress)
- [ ] **RESUME HERE:** P1 Task 1 on `feat/p1-balance-v2` — Codex run killed by host low memory; partial UNCOMMITTED changes in the working tree. Resume Codex (brief: scratchpad p1-brief.tpl pattern) telling it to continue from current state; review its edit to `docs/superpowers/specs/2026-11-03-p1-core-loop-design.md` before accepting.
- [x] P0 Tasks 1-9 merged; owner phone run remains open.
- [x] P1 Task 1 on `feat/p1-balance-v2`: balance v2, 1-based levels, family table, canonical step-order doc; no commits or merges.
- [x] Task 1 validation: 364 pass / 24 skip / 2 todo; normal suite 7.65 s; heavy fuzz, typecheck and build pass.

## Next (ordered, max 5)
1. Lead reviews the uncommitted Task 1 diff and obsolete QA list in DECISIONS "P1 plan name mapping".
2. Owner completes P0 5-minute phone run and fills PLAYTEST Phone column.
3. P1 Task 2 (save v2/meta) on its own task branch; do not implement later tasks here.
4. P1 exit: owner recruits 5 testers; summarizeLog + PLAYTEST gate.

## Workers and QA process
- Feature code: Codex (`delegate-workers` codex-task.sh) or Claude subagent, chosen per task.
- agy = dedicated tester only: derives black-box cases from MEC specs, writes `tests/qa/` + browser checks; never feature code.
- Lead triages QA failures: code bug → implementer; test error → agy; spec gap → owner. See DECISIONS 2026-11-05.

## Blockers / open questions for human
- Owner phone run for P0 (see PLAYTEST 2026-11-05).
- Spec ambiguities from QA (not blocking): `pick([])`, `chance(p)` outside [0,1], `reachable()` when target is a wall, `parseBalance` unknown keys, `nearHead` front lane past the board edge.
- OPEN: session-length targets §4; reason to come back tomorrow §8.3.

## Known issues / tech debt
- Independent QA cases asserting superseded P0 values remain unchanged; 23 IDs and replacement rules are in DECISIONS.
- tsconfig excludes only two QA files that reference deleted P0 members; their valid runtime cases still run.
- Windows sandbox blocks child-process spawning; use native config loading and threads for tests/build.
- QA-T2-17 remains skipped until P2a; two existing todo cases remain.
- vite.config.ts / vitest.config.ts still lack Node types for static checking (no new dependencies).

## Last session summary
- Implemented only P1 Task 1 using failing tests first; mapped real P0 names and documented integration deviations.
- Last verified: filtered npm test and test:fuzz (200 seeds) exit 0; npm run typecheck and native-loader build exit 0.
- Review: no Critical/Important findings; obsolete copy directive retained because the task requires verbatim step-order copy.
- Gotchas: docs retain CRLF; local main is the old Ant Trail project. No commits, pushes, installs or protected-file edits.
