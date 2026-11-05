# STATUS - project memory

**Updated:** 2026-11-04 by Claude (lead) **Milestone:** M1 - P1 gate PASSED (PLAYTEST 2026-11-04); P2 content starting. **Version branch:** `version/v0.2`

## Now (in progress)
- [x] P1 closed: flow B + WASD fix + run_end.turns merged; agy browser QA 11/11 PASS; version/v0.1 -> dev.
- [x] P2 plans ready: P2a (revised for flow B) `docs/superpowers/plans/2026-11-03-p2a-framework-ground-tiles.md`; P2b `2026-11-04-p2b-movers-cycles-blasts.md`; P2c `2026-11-04-p2c-shrink-challenge-tuning.md`.
- [x] P2a merged into version/v0.2: registry/queries, collision + death context, director capClass + fairness 1-3, escape check + family fuzz, GroundTiles, mud (L7), ice (L13), bot + death-cause report, run-log context. 938 pass; reduced fuzz + bot report pass (PLAYTEST 2026-11-05).
- [ ] **RESUME HERE:** P2b Task 4 and carried Task 3 fixes implemented, uncommitted; review follow-up corrects all seven stale family/balance expectations; family-list grep matches verified in 11 single-file runs (155 passed, 1 existing skip), typecheck clean; lead full verification pending, then Task 5 (cycle cells and gates).

## Next (ordered, max 5)
1. P2a (framework + ground tiles), then P2b (movers, cycles, blasts, bird), then P2c (shrink, challenge levels, tuning, P2 exit).
2. P2b/P2c Task 1 write MEC-013..018 specs before code.
3. P2 exit: fuzz + fairness per family, bot report L1-30, agy QA, owner playtest (deathCauseReport over40 empty).
4. Tech debt: suite ~25-48 s; small cleanups (snapTransition rename in 2 QA tests; MEC-003 R11 "(2500)" repeat).

## Workers and QA process
- Owner 2026-11-04: lead decides all technical matters and picks workers/models (Claude subagents, Codex, agy); ask the owner only GDD-level questions. Low-RAM kill: wait, retry up to 3 times, then stop and report.
- agy = tester only. Lead verifies every merge with full test + typecheck.

## Owner questions batched for the END of P2 (provisional defaults in use)
- Task 9 player-facing strings ("Back", "Not now!", "Fresh start!", Results/Sound labels); GDD §4 session length; §8.3 reason to come back.
- P2b OQ-B1..B6 and P2c OQ-C1..C5 (listed at the top of each plan): gate/spike rhythms, NPC speeds, stolen-mango cost, bird shadow, P2b strings, shrink frequency, challenge feedback/effect, P2 exit playtest size, tuning authority.

## Known issues / tech debt
- P2a browser QA (L7 mud, L13 ice) not run: agy killed by host low RAM; owner chose to merge (2026-11-05). Fold into P2b QA or the next owner playtest.
- Full family fuzz matrix 200 x 120 s not run (host RAM); run overnight with default VITE_FUZZ_* when possible.
- Windows: Vitest needs --configLoader native --pool threads --maxWorkers 2.
- 4 skipped QA (reasons in files). Single 1.28 MB JS chunk.
- Quitting mid-run does not log run_end (seen in phone log); decide in P2c log work.
- Checkpoints only reach L12; debug-only jump to later levels would help QA of L16+.

## Last session summary
- Owner playtest feedback round: WASD fix, run_end.turns, level-up flow B (8-task SDD, reviews per task, final review ready), P1 gate verdict PASS, P2 plans written/revised. Pushed version/v0.1.
