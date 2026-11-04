# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1 through 4 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P1 Tasks 1-3 merged into `version/v0.1`.
- [x] Task 4 committed on `feat/p1-mangoes` (version merged in); Task 5 committed on `feat/p1-energy` (worktree `../NOZVI-GAME-03-wt4`, node_modules junction).
- [ ] **RESUME HERE (2026-11-04, both workers killed by low-memory reaper):**
  - agy Task 4 QA on `feat/p1-mangoes` (main tree): partial uncommitted edits in 4 tests/qa files; resume brief = scratchpad agy-qa4 (11 obsolete IDs + QA-T4-20 code-vs-test verdict + new p1-task4-mangoes QA).
  - Codex Task 6 on `feat/p1-skills-a` (worktree, from Task 5): not started, tree clean.
  - Parallel mode (owner-approved) needs CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1; otherwise run one worker at a time.

## Next (ordered, max 5)
1. Merge Task 4, then agy QA Task 5 (merge version into feat/p1-energy first), merge.
2. Tasks 6-10 per plan (branches: skills-a, skills-b, session, scenes, chore/p1-playtest).
3. Tech debt: normal suite ~17 s (> 10 s target).
4. P1 exit: owner recruits 5 testers; summarizeLog + PLAYTEST gate.

## Workers and QA process
- Feature code: Codex (`delegate-workers` codex-task.sh) or Claude subagent, chosen per task.
- agy = dedicated tester only: derives black-box cases from MEC specs, writes `tests/qa/` + browser checks; never feature code.
- Lead triages QA failures: code bug → implementer; test error → agy; spec gap → owner. See DECISIONS 2026-11-05.

## Blockers / open questions for human
- Owner phone run for P0 (see PLAYTEST 2026-11-05).
- Spec ambiguities from QA (not blocking): P1T2 todos — applyLevelReached clamp above maxLevel?, carryEnergy clamp below 0?; `pick([])`, `chance(p)` outside [0,1], `reachable()` when target is a wall, `parseBalance` unknown keys, `nearHead` front lane past the board edge.
- OPEN: session-length targets §4; reason to come back tomorrow §8.3.

## Known issues / tech debt
- Seventeen obsolete QA cases are runtime-filtered: seven known Task 3 cases plus ten from Task 4; IDs/rules in DECISIONS.
- Two legacy Task 4 QA files are excluded from typecheck for removed P0 fields; compatible cases still run in Vitest. QA sources unchanged.
- Windows native config loading + Vitest threads/maxWorkers 2 required; verification commands run sequentially. Filtered npm test takes 14.68 s (>10 s plan target).
- P1 callers must pass SaveRules to load; deprecated P0 overload defaults P1 fields. Boot supplies balance rules.
- QA-T2-17 remains skipped until P2a; five existing todo cases remain.
- Tasks 5/7 own energy/orbs/skills and their additions to the single reserved list.

## Last session summary
- Executed only Task 4: mango counters, per-level rot, timed rottenRock family, deferred placement and single reserved list.
- TDD: new behavior failed first; targeted mango/reserved/transition tests then passed 43/43.
- Verified: filtered npm test 469 passed / 18 skipped / 5 todo; typecheck and native Vite build exit 0.
- Full fuzz suite: 469 passed / 18 skipped / 5 todo, incl. 200 seeds x 120 s (22.17 s). Read-only final review: no Critical/Important findings; core-only task, no browser/phone check.
- Plan adaptations, QA IDs and runtime limitation recorded in DECISIONS; no mechanic spec changes; docs retain CRLF.
- Kept branch and changes uncommitted. No merges, pushes, installs or protected-file edits.
