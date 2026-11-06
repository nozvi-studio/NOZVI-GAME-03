# STATUS - project memory

**Updated:** 2026-11-06 by Claude (lead) **Milestone:** M1 - P2c merged into version/v0.2 (2026-11-06); P2 exit waits on owner playtest. **Version branch:** `version/v0.2`

## Now (in progress)
- [x] P2a, P2b merged into version/v0.2 (PLAYTEST 2026-11-05).
- [x] P2c Tasks 1-8 on feat/p2c-shrink-challenge: MEC-018 shrink L27, challenge levels L5-30 (x0.8 interval, cap +2, banner + star), bot tuning L1-30, deathCauseReport (40% gate, debug runs excluded), debug start `?debug=1&level=N` (no progress written), final review fixes. 1158 pass, typecheck clean; reduced fuzz pass; agy QA 9/10 + banner fix (PLAYTEST "P2 exit check").
- [ ] **RESUME HERE:** owner sends the P2 exit playtest log (normal runs, no ?debug=1; start from checkpoint L10; >= 30 runs, >= 10 reaching biome 4). Lead runs deathCauseReport + summarizeLog, writes the verdict in PLAYTEST, tunes if over40 (OQ-C5).

- [x] P3c capy merged into version/v0.2 (e40a333, owner approved 2026-11-06): SVG capy face on the snake head + debug preview `?debug=1&artPreview=1`.
- [ ] Next P3 part: P3a juice (§10.4) or P3b screens — owner to pick.

## Next (ordered, max 5)
1. Owner playtest + 40% verdict; if over40 not empty: lead tunes (OQ-C5), re-playtest.
2. Full fuzz matrix 200 x 120 s overnight (`npm run test:fuzz`).
3. P2 exit pass -> merge version/v0.2 into dev; start P3 planning.
4. Owner GDD questions batch (below).
5. Tech debt: P2c deferred minors (shrink fade crumble visual, hudText test cleanups, level%5 in tests, MEC-003 R21 heading "Debug tools").

## Workers and QA process
- Owner 2026-11-05: Claude subagents with the cheapest fitting model (sonnet/haiku; opus for final review); agy = tester only; Codex not used. Run independent tasks in parallel (worktrees). Low-RAM kill: wait, retry up to 3 times, then stop and report.
- Lead verifies every merge with full test + typecheck.

## Owner questions batched for the END of P2 (provisional defaults in use)
- Task 9 player-facing strings ("Back", "Not now!", "Fresh start!", Results/Sound labels); GDD §4 session length; §8.3 reason to come back.
- P2b OQ-B1..B6 and P2c OQ-C1..C5 (top of each plan). P2c rulings to confirm: shrink cooldown 20000 / weight 2; banner "Challenge: <name>!" + star; challenge changes only interval/cap; L30 rock weight 3; shrink strings per MEC-018 §8; shrink waits while another hazard holds a ring cell.
- Biome 4 coconut = 100% of bot deaths (12 of 22 on L20, clear 8/20): options L20 coconut 4 -> 2 or coconut params, if playtest confirms. Biome 5 chicken 39.6%.

## Known issues / tech debt
- Full family fuzz matrix not run (host RAM); reduced matrix passes.
- Windows: Vitest needs --configLoader native --pool threads --maxWorkers 2. Host RAM low: agy browser QA gets killed when fuzz/bot run at the same time.
- 4 skipped QA (reasons in files). Single 1.28 MB JS chunk.
- Quitting mid-run does not log run_end (seen in phone log).
- Checkpoints only reach L12; for QA use `?debug=1&level=N` or the debug HUD buttons "+1" / "Key ▶".
- Rubble family has no production source since Shield stopped leaving rubble (owner 2026-11-06); remove family + `skills.shield.rubbleLifeMs` in a cleanup task.

## Last session summary
- 2026-11-06 (P3c): spec + plan in docs/superpowers/; 4 tasks via subagents (Haiku/Sonnet, Opus final review). Final review caught Phaser 3.90 decoding every data: URL as base64 -> fixed (base64 SVG URLs). Deferred minors in branch ledger (magic numbers in eye/mouth geometry, capyDie twice, preview label contrast).
- 2026-11-06 (art prep): reviewed Figma D2 and agent-sprite-forge; wrote ART-001 v2 + ART-002 (docs/JSON only, no tests run); branch feat/capy-character-spec from version/v0.2, pushed, not merged.
- 2026-11-06: owner accepted (nghiem thu) version/v0.2 with P2c, Shield without rubble, debug skip buttons, run start waits for first input (MEC-001-R2). First owner log (69 runs, 37 normal): over40 empty, wall 77% (review), max L13, biome 4 not reached; 7 runs died at 1260 ms with 0 turns -> fixed by the waiting phase.
- P2c executed via subagent-driven development (Sonnet implementers + reviewers, Opus final review, agy browser QA). Fuzz found and fixed shrink-on-reserved-cell; QA found and fixed run-start banner race.
