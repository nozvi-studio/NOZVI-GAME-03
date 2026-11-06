# STATUS - project memory

**Updated:** 2026-11-07 by Claude (lead) **Milestone:** M1 - P2c merged into version/v0.2 (2026-11-06); P2 exit waits on owner playtest. **Version branch:** `version/v0.2`

## Now (in progress)
- [x] P2a, P2b merged into version/v0.2 (PLAYTEST 2026-11-05).
- [x] P2c Tasks 1-8 on feat/p2c-shrink-challenge: MEC-018 shrink L27, challenge levels L5-30 (x0.8 interval, cap +2, banner + star), bot tuning L1-30, deathCauseReport (40% gate, debug runs excluded), debug start `?debug=1&level=N` (no progress written), final review fixes. 1158 pass, typecheck clean; reduced fuzz pass; agy QA 9/10 + banner fix (PLAYTEST "P2 exit check").
- [ ] **RESUME HERE:** owner sends the P2 exit playtest log (normal runs, no ?debug=1; start from checkpoint L10; >= 30 runs, >= 10 reaching biome 4). Lead runs deathCauseReport + summarizeLog, writes the verdict in PLAYTEST, tunes if over40 (OQ-C5).

- [x] P3c capy merged into version/v0.2 (e40a333, owner approved 2026-11-06): SVG capy face on the snake head + debug preview `?debug=1&artPreview=1`.
- [x] D2 UI mockups imported (branch feat/p3-design-mockups, awaiting owner push approval): `docs/design/UI-MOCKUPS.md` + 32 board PNGs and sources. Source was a Claude Design artifact, not Figma.
- [x] D2 mockups also exported as static HTML (primary reference, 8d0fd4e).
- [x] P3 spec + 5 plans on branch docs/p3-spec (from feat/p3-design-mockups): spec docs/superpowers/specs/2026-11-07-p3-juice-screens-design.md; plans 2026-11-07-p3-0 / p3b-1 / p3b-2 / p3b-3 / p3a. Owner ruling 2026-11-07: Quit run = run end like a death (MEC-008-R6, already specced).
- [ ] **P3 RESUME HERE:** owner reviews spec, then execute P3-0 (subagents), then P3b-1/2/3 in parallel worktrees (max 2 at once, RAM), then P3a. Expected merge conflicts between P3b plans in BootScene, text.ts, uiTokens.ts, balance.json, GameScene background.

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
- P3 provisional strings: death lines (P3a plan Task 3), Settings/Results/HUD copy, Shield + Mango Rain card text (P3b-3 C10).
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
- 2026-11-07 (P3 planning): owner pushed HTML mockups; lead wrote P3 spec + P3-0 plan, 4 Sonnet subagents wrote the other plans. No code changed, no tests run. Mockup-vs-spec conflicts resolved spec-first (listed in each plan); visible changes: D-pad hidden unless setting on, sound toggle moves to Settings.
- 2026-11-06 (P3c): spec + plan in docs/superpowers/; 4 tasks via subagents (Haiku/Sonnet, Opus final review). Final review caught Phaser 3.90 decoding every data: URL as base64 -> fixed (base64 SVG URLs). Deferred minors in branch ledger (magic numbers in eye/mouth geometry, capyDie twice, preview label contrast).
- 2026-11-06 (art prep): reviewed Figma D2 and agent-sprite-forge; wrote ART-001 v2 + ART-002 (docs/JSON only, no tests run); branch feat/capy-character-spec from version/v0.2, pushed, not merged.
- 2026-11-06: owner accepted (nghiem thu) version/v0.2 with P2c, Shield without rubble, debug skip buttons, run start waits for first input (MEC-001-R2). First owner log (69 runs, 37 normal): over40 empty, wall 77% (review), max L13, biome 4 not reached; 7 runs died at 1260 ms with 0 turns -> fixed by the waiting phase.
- P2c executed via subagent-driven development (Sonnet implementers + reviewers, Opus final review, agy browser QA). Fuzz found and fixed shrink-on-reserved-cell; QA found and fixed run-start banner race.
