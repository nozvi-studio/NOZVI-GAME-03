# STATUS - project memory

**Updated:** 2026-11-04 by Claude (lead) **Milestone:** M1 - P1 code complete, merged into `version/v0.1`; P1 exit gate pending owner playtest. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P1 Tasks 1-10 + `fix/p1-ramp-order` merged into `version/v0.1` (f66008e), each with independent agy QA.
- [x] Verified on version/v0.1: 793 pass / 4 skip / 12 todo; typecheck, build, heavy fuzz (12/12, 72 s) pass.
- [x] Desktop browser walk 'P1 scenes manual check' all pass; Task 10 debug export checked in browser.
- [ ] **RESUME HERE:** P1 exit gate = owner work (below). Merge version/v0.1 -> dev only after the gate passes.

## Next (ordered, max 5)
1. Owner: phone column of PLAYTEST 'P1 scenes manual check'.
2. Owner: 5-tester playtest per PLAYTEST 'P1 playtest protocol' (?debug=1, fresh save, <=15 min, Export log); lead runs summarizeLog and writes the gate verdict.
3. On gate pass: merge version/v0.1 -> dev; start P2a (plan docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md).
4. Tech debt: full suite ~25 s (> 10 s target); tsconfig still excludes two legacy Task 4 QA files from typecheck.

## Workers and QA process
- Feature code: Codex (`delegate-workers` codex-task.sh; default tier standard, hard only for logic-heavy tasks) or Claude subagent when Codex quota is out.
- agy = dedicated tester only: black-box cases from MEC specs in `tests/qa/` + browser checks; never feature code. Keep agy jobs small (print timeout hit at ~15-40 min).
- Parallel mode (owner-approved): implementer in a git worktree, agy in the main tree. Host low-memory reaper may kill workers; resume from here.
- Lead triages QA failures: code bug -> implementer; test error -> agy; spec gap -> owner.

## Blockers / open questions for human
- Spec (not blocking): startRun while a run is active (quit old / throw / replace?); applyLevelReached clamp above maxLevel?; carryEnergy clamp below 0?; startRun from Results + confirmLoadout allowed?
- Player-facing strings invented in Task 9 ("Back", "Not now!", "Fresh start!", Results/Sound labels) await owner review.
- OPEN GDD: session-length targets §4; reason to come back tomorrow §8.3.

## Known issues / tech debt
- Windows: Vitest needs --configLoader native --pool threads (--maxWorkers 2); child-process spawn blocked in sandbox.
- 4 skipped QA: QA-T2-17 (until P2a) + 3 P0 HUD/save harness cases superseded by P1 (reasons in files).
- Single 1.28 MB JS chunk (Phaser); code splitting not yet needed.

## Last session summary
- Lead coordinated Codex (Tasks 2-6), Claude subagents (Tasks 7-10, Codex quota out) and agy QA for every task.
- Bug found by QA: rampEnded emitted after levelUp; fixed (QA-P1T5-ORDER). Owner decision: skills allowed during Shield bonk (MEC-006-R27).
- No pushes, installs or protected-file edits by the lead.
