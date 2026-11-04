# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1 through 6 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P0 complete incl. owner phone run (PLAYTEST).
- [x] P1 Tasks 1 and 2 integrated; independent QA updated for their P1 rules.
- [x] P1 Tasks 3 through 5 implemented; obsolete QA cases are being rewritten separately.
- [x] P1 Task 6 implemented on `feat/p1-skills-a`, uncommitted; verified and ready for agy QA.

## Next (ordered, max 5)
1. agy QA for Task 6; owner handles commit/integration.
2. Task 7: Shield, Mango Rain and rubble per the approved P1 plan.
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
- Seventeen owner-listed obsolete QA cases are runtime-filtered; IDs/rules in DECISIONS. No new Task 6 obsolete QA cases found.
- Two legacy Task 4 QA files remain excluded from typecheck for removed P0 fields; compatible cases still run in Vitest. QA sources unchanged.
- Windows native config loading + Vitest threads/maxWorkers 2 required; commands run sequentially. Normal suite: 13.81 s (>10 s plan target).
- P1 callers must pass SaveRules to load; deprecated P0 overload defaults P1 fields. Boot supplies balance rules.
- QA-T2-17 remains skipped until P2a; five existing todo cases remain.
- Task 7 owns Shield, Mango Rain, rubble and the remaining reserved-list additions. Unimplemented skills throw the planned Task 7 guard.

## Last session summary
- Executed only Task 6: skill framework, validated copied loadout/bestLevel, mid-run unlocks, Slow-mo and Tail Snip/snip-wall lifecycle.
- TDD: initial 29 failures established missing behavior; sparse loadout regression also failed before its fix. All 32 new task tests pass.
- Verified: filtered npm test 521 passed / 18 skipped / 5 todo; typecheck and native Vite build exit 0.
- Heavy fuzz: 200 seeds x 120 s; 521 passed / 18 skipped / 5 todo (25.97 s). Independent review: no Critical/Important findings; no browser/phone check.
- Plan corrections/adaptations recorded in DECISIONS; no mechanic spec or independent QA edits; docs retain CRLF.
- Kept branch and changes uncommitted. No merges, pushes, installs or protected-file edits.
