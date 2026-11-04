# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1 through 5 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 complete incl. owner phone run (PLAYTEST).
- [x] P1 Tasks 1 and 2 integrated; independent QA updated for their P1 rules.
- [x] P1 Tasks 3 and 4 implemented; obsolete QA cases are being rewritten separately.
- [x] P1 Task 5 implemented on `feat/p1-energy`, uncommitted; verified and ready for agy QA.

## Next (ordered, max 5)
1. agy QA for Task 5; owner handles commit/integration.
2. Remaining P1 tasks per plan, one branch each; Task 6 next.
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
- Seventeen owner-listed obsolete QA cases are runtime-filtered; IDs/rules in DECISIONS. No new Task 5 obsolete QA cases.
- Two legacy Task 4 QA files remain excluded from typecheck for removed P0 fields; compatible cases still run in Vitest. QA sources unchanged.
- Windows native config loading + Vitest threads/maxWorkers 2 required; verification commands run sequentially. Normal suite took 16.77 s (>10 s plan target).
- P1 callers must pass SaveRules to load; deprecated P0 overload defaults P1 fields. Boot supplies balance rules.
- QA-T2-17 remains skipped until P2a; five existing todo cases remain.
- Task 7 owns skills/rain and their additions to the single reserved list.

## Last session summary
- Executed only Task 5: energy/start-energy validation, orbs, golden energy, checkpoint speed ramp and snapshots/events.
- TDD: new behavior failed first; all 22 new energy/ramp tests pass.
- Verified: filtered npm test 490 passed / 18 skipped / 5 todo; typecheck and native Vite build exit 0.
- Heavy fuzz passed (200 seeds x 120 s, 31.26 s total); independent review found no Critical/Important issues; no browser/phone check.
- Plan adaptations and known QA exclusions recorded in DECISIONS; no mechanic spec changes; docs retain CRLF.
- Kept branch and changes uncommitted. No merges, pushes, installs or protected-file edits.
