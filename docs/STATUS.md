# STATUS - project memory

**Updated:** 2026-11-04 by Claude (lead) **Milestone:** M1 - P1 code complete; owner feedback fixes in progress; P1 exit gate pending. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] Owner playtest logs received (desktop 13 runs, phone 3 runs). Gate sample reduced to 2 testers (DECISIONS 2026-11-04 "P1 owner playtest feedback").
- [x] fix/keyboard-input-lag merged (cd6684d): keyboard turns now applied on native keydown (was one Phaser frame late).
- [x] chore/runlog-turns merged (394bc77): run_end records `turns` (accepted turns, MEC-003-R19).
- [x] "Wall death at exactly 1260 ms" investigated: not a bug (no input for 9 steps x 140 ms from spawn). Owner keeps start as is (countdown, then the snake moves).
- [x] Level-up flow B: code (Tasks 1-6) and specs/ARCHITECTURE/DECISIONS (Task 7) done on feat/levelup-flow-b; QA and merge (Task 8) pending.

## Next (ordered, max 5)
1. Level-up flow B Task 8 (QA), then merge feat/levelup-flow-b into version/v0.1.
2. Owner re-tests WASD on laptop + one more playtest log (2-tester gate); lead runs summarizeLog and writes the gate verdict.
3. On gate pass: merge version/v0.1 -> dev; start P2a (docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md).
4. Tech debt: full suite ~25-48 s (> 10 s target); tsconfig excludes two legacy Task 4 QA files.

## Workers and QA process
- Feature code: Codex (`delegate-workers`) or Claude subagents in worktrees (used this session). agy = tester only.
- Lead verifies every merge with full test + typecheck; triages QA failures (code -> implementer, test -> agy, spec gap -> owner).

## Blockers / open questions for human
- Spec (not blocking): startRun while a run is active; applyLevelReached clamp above maxLevel; carryEnergy clamp below 0; startRun from Results + confirmLoadout.
- Task 9 player-facing strings await owner review. OPEN GDD: §4 session length; §8.3 reason to come back.

## Known issues / tech debt
- P2a plan and P2 design still plan HazardFamily.onLevelEnd, which was removed in flow B; update them before P2a starts.
- Windows: Vitest needs --configLoader native --pool threads --maxWorkers 2.
- 4 skipped QA (reasons in files). Single 1.28 MB JS chunk.
- Phone run log showed a run_start without run_end (quit mid-run); confirm whether quit should log run_end.
- Stale empty branches from subagents: fix/start-wall-death, feat/levelup-slowdown (delete after option B lands); .claude/worktrees/ to clean up.

## Last session summary
- Lead triaged owner feedback, delegated 4 subagents (2 fixes merged, 1 investigation = no bug, 1 stopped on spec conflict -> option B chosen by owner).
- Verified on version/v0.1: 797 pass / 4 skip / 12 todo; typecheck clean. No pushes, installs or protected-file edits.
