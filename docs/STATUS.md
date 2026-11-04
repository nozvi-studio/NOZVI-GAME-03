# STATUS - project memory

**Updated:** 2026-11-04 by Codex **Milestone:** M1 - P1 Tasks 1 through 4 implemented. **Version branch:** `version/v0.1`

## Now (in progress)
- [x] P1 Tasks 1-5 merged into `version/v0.1`.
- [x] P1 Tasks 6-10 implemented + committed (chain in worktree `../NOZVI-GAME-03-wt4`, node_modules junction): `feat/p1-skills-a` 8e050d1 -> `feat/p1-skills-b` 5cca5c6 -> `feat/p1-session` 597ef28 -> `feat/p1-scenes` 156af03 -> `chore/p1-playtest` fdc819c. Each awaits agy QA, then --no-ff merge in order.
- [ ] **RESUME HERE:** agy QA Task 6 on `feat/p1-skills-a` (main tree, version already merged in) was killed by the low-memory reaper; partial uncommitted: new tests/qa/p1-task6-skills.qa.test.ts + QA-P1T5-ORDER edit in p1-task5-energy. Resume and finish.
- [ ] Suspected code bug: regular-mango path emits levelUp before rampEnded; ARCHITECTURE 'Sim step order' 12.4 requires ramp first (Mango Rain path is correct). Fix on `fix/p1-ramp-order` once QA-P1T5-ORDER confirms.

## Next (ordered, max 5)
1. agy QA Tasks 7, 8, 9 (incl. browser walk per PLAYTEST 'P1 scenes manual check'), 10; known obsolete QA to rewrite: QA-T7-22, QA-T8-31..34, QA-T6-18.
2. Ramp-order fix; merge all into version/v0.1; version -> dev at P1 exit.
3. Owner: browser check ?debug=1; recruit 5 testers; fill PLAYTEST P1 protocol.
4. Tech debt: full suite ~20 s (> 10 s target).

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
