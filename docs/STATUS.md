# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1 and 2 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 complete incl. owner phone run (PLAYTEST).
- [x] P1 Task 1 merged into `version/v0.1`; independent QA updated for P1.
- [x] P1 Task 2 implemented on `feat/p1-meta`, uncommitted; ready for agy QA.

## Next (ordered, max 5)
1. agy QA for P1 Task 2; owner handles commit/integration.
2. Remaining P1 tasks per plan, one branch each; Task 3 next.
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
- Eight obsolete P0 save QA cases remain unchanged and are filtered at runtime; IDs and MEC-008-R12 replacements are in DECISIONS (P1 Task 2).
- P1 callers must pass SaveRules to load; deprecated P0 overload defaults P1 fields. Boot supplies balance rules.
- Windows sandbox requires native config loading and Vitest threads; run verification commands sequentially.
- QA-T2-17 remains skipped until P2a; two existing todo cases remain.

## Last session summary
- Executed only P1 Task 2 with failing meta tests first, then implementation; Boot integration regression also verified RED -> GREEN.
- Verified: filtered npm test 397 passed / 9 skipped (8 obsolete QA + existing skip) / 2 todo; typecheck and native-loader build exit 0.
- Required read-only review: no Critical/Important findings; no browser or phone checks in this task.
- Updated CODEMAP, CHANGELOG, MEC-003-R19 entry field and DECISIONS; docs retain CRLF.
- Kept branch and all changes uncommitted. No merges, pushes, installs or protected-file edits.
