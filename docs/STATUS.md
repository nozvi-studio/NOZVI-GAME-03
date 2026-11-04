# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1, 2 and 3 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 complete incl. owner phone run (PLAYTEST).
- [x] P1 Tasks 1 and 2 integrated; independent QA updated for their P1 rules.
- [x] P1 Task 3 implemented on `feat/p1-reset-transition`, uncommitted; verified and ready for agy QA.

## Next (ordered, max 5)
1. agy QA for P1 Task 3; owner handles commit/integration.
2. Remaining P1 tasks per plan, one branch each; Task 4 next.
3. P1 exit: owner recruits 5 testers; summarizeLog + PLAYTEST gate.

## Workers and QA process
- Feature code: Codex (`delegate-workers` codex-task.sh) or Claude subagent, chosen per task.
- agy = dedicated tester only: derives black-box cases from MEC specs, writes `tests/qa/` + browser checks; never feature code.
- Lead triages QA failures: code bug → implementer; test error → agy; spec gap → owner. See DECISIONS 2026-11-05.


## Blockers / open questions for human
- Owner phone run for P0 (see PLAYTEST 2026-11-05).
- Spec ambiguities from QA (not blocking): P1T2 todos — applyLevelReached clamp above maxLevel?, carryEnergy clamp below 0?; `pick([])`, `chance(p)` outside [0,1], `reachable()` when target is a wall, `parseBalance` unknown keys, `nearHead` front lane past the board edge.
- OPEN: session-length targets §4; reason to come back tomorrow §8.3.

## Known issues / tech debt
- Seven obsolete QA cases remain unchanged and are filtered at runtime; IDs and superseding rules are in DECISIONS (P1 Task 3).
- P1 callers must pass SaveRules to load; deprecated P0 overload defaults P1 fields. Boot supplies balance rules.
- Windows sandbox requires native config loading and Vitest threads; run verification commands sequentially.
- QA-T2-17 remains skipped until P2a; five existing todo cases remain.
- Task 4 owns mango retries, per-level rot counting and timed rotten-rock transition cleanup; later tasks own energy/skills.

## Last session summary
- Executed only Task 3: length reset/cutTail, 1 s transition, L30 win, internal JSON state/ASCII/circle/context helpers.
- TDD: missing functionality failed first; hazard import-cycle regression and final eaten-mango cleanup verified RED -> GREEN.
- Verified: filtered npm test 464 passed / 8 skipped / 5 todo (9.46 s); 200-seed heavy fuzz, typecheck and build exit 0.
- Independent read-only review: no Critical/Important findings; no browser or phone checks in this core-only task.
- Updated CODEMAP, GDD index, CHANGELOG and DECISIONS; mechanic specs unchanged; docs retain CRLF.
- Kept branch and all changes uncommitted. No merges, pushes, installs or protected-file edits.
