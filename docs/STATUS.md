# STATUS - project memory

**Updated:** 2026-11-10 by Claude (MOT-4 agent) **Milestone:** M2 P3 on `version/v0.3` (branched from docs/p3-spec, owner 2026-11-07); P2 exit (v0.2) still waits on owner playtest. **Version branches:** `version/v0.3` (P3), `version/v0.2` (P2 exit)

## Now (in progress)
- [x] P2a, P2b merged into version/v0.2 (PLAYTEST 2026-11-05).
- [x] P2c Tasks 1-8 on feat/p2c-shrink-challenge: MEC-018 shrink L27, challenge levels L5-30 (x0.8 interval, cap +2, banner + star), bot tuning L1-30, deathCauseReport (40% gate, debug runs excluded), debug start `?debug=1&level=N` (no progress written), final review fixes. 1158 pass, typecheck clean; reduced fuzz pass; agy QA 9/10 + banner fix (PLAYTEST "P2 exit check").
- [ ] **RESUME HERE:** owner sends the P2 exit playtest log (normal runs, no ?debug=1; start from checkpoint L10; >= 30 runs, >= 10 reaching biome 4). Lead runs deathCauseReport + summarizeLog, writes the verdict in PLAYTEST, tunes if over40 (OQ-C5).

- [x] P3c capy merged into version/v0.2 (e40a333, owner approved 2026-11-06): SVG capy face on the snake head + debug preview `?debug=1&artPreview=1`.
- [x] D2 UI mockups imported (branch feat/p3-design-mockups, awaiting owner push approval): `docs/design/UI-MOCKUPS.md` + 32 board PNGs and sources. Source was a Claude Design artifact, not Figma.
- [x] P3 spec + 5 plans on branch docs/p3-spec (from feat/p3-design-mockups): spec docs/superpowers/specs/2026-11-07-p3-juice-screens-design.md; plans 2026-11-07-p3-0 / p3b-1 / p3b-2 / p3b-3 / p3a. Owner ruling 2026-11-07: Quit run = run end like a death (MEC-008-R6, already specced).
- [x] Owner approved P3 spec + plans (2026-11-07). Owner rules: lead decides technical/visual, asks only on important gameplay; push allowed; subagents with cheapest fitting model.
- [x] P3-0 UI foundation merged into version/v0.3: tokens, ui()/layoutColumn, settings + save v3 (null = follow OS live), self-hosted Nunito/Lilita One + Boot font wait, widget kit (pill hit rect verified in browser), Baloo removed. 1215 pass, typecheck clean; Opus final review fixes applied.
- [x] P3b-1 board art merged into version/v0.3 (biome grounds checker+grid, derived dark theme, D2 rocks/warn tiles/fences/hedges/mud/ice/rising stone/mango; Opus final review fixes). Owner-review items: derived dark board theme (no dark mockup), rock/pebble mapping. Follow-ups: coconut lane/bomb/NPC art (P3b-1b), ice arrow contrast in dark, rain mango icon, dead Palette keys.
- [x] P3b-3 menus merged into version/v0.3 (D2 Boot/Home/Loadout/Results + new Settings scene, settings saved immediately, rulings C1-C10 in the plan; Playwright QA 540x960 + 360x640 in PLAYTEST). 1291 pass, typecheck clean after both merges.
- [x] P3b-2 HUD merged into version/v0.3 (D2 HUD top/stats/chips, round skill buttons + affordable/nope, round D-pad behind setting, Pause overlay with Settings, countdown, banner cards/tips/skill pills; quit: startRun ends an active run as quit; haptics gated by setting; Settings overlay blocks HUD keys). 1347 pass, typecheck clean. Note for PLAYTEST: runs auto-ended by a new start now log run_end cause quit.
- [x] P3a juice merged into version/v0.3: balance.juice, juiceMap (§10.4 rows, reduced motion, sound/haptics gating), death lines per cause, new SFX, JuicePlayer/ScreenFx (smooth pre-rendered vignette)/DeathCard RUN OVER (tap skip), banner motion (reduced = fade). 1395 pass, typecheck clean. All P3 sub-phases (P3-0, P3b-1/2/3, P3a) merged.
- [ ] **P3 EXIT RESUME HERE (owner):** device/agy pass on version/v0.3: 60 fps on a mid-range phone (cloud has no GPU: v0.3 vs P3a both ~12 fps SwiftShader, not representative), 5" readability at 360x640, peak death vignette vs DeathD2, orb/skill-cast/checkpoint-flag juice not browser-verified in cloud, tap-skip feel. Then owner string batch + C1-C10 + derived dark theme review. After owner OK: merge version/v0.3 into dev (with P2 exit).
- [x] ART-003 skin production guide written (Draft, owner not fully approved; open Q1-Q3).
- [x] Remotion capy POC merged (owner approved 2026-11-07): pre-rendered idle/eat/dead clip on `?debug=1&artPreview=1`; board head stays tween (DECISIONS).
- [x] UIFIX waves 1-3 (R1..R15) merged into version/v0.3 (1445 pass). R12 red cost, R13 one D-pad border, R14 Settings edge + soft-red Quit run; R15 (LAY-03 'Next checkpoint at L10') NOT reproducible in tests (likely a ?debug=1 run). Browser visual checks of all waves not run yet. [ ] **Next:** agy re-review on merged v0.3 (plan wave3 Task 5 step 5 checklist; confirm LAY-03 with a normal run to L10). Open owner questions: D-pad raise capped at +9 mockup px by the chip row; dark card edge `#46584B` retune; string `hud.wait.touch` 'Swipe to steer!'.
- [x] Save compat (2026-11-10): `save()` never overwrites a newer-version envelope; older saves get a one-time `mango-snake.save.v<N>.bak`. Ported to version/v0.2 (b74e878), so v0.2 builds from that commit no longer destroy v3 saves; older v0.2 builds still do (back up `mango-snake.save`).
- Strings to review with owner after P3 (agy pass by owner): death lines, Settings/Results/HUD copy, banners — provisional, from mockups. New provisional: Shield/Mango Rain card text, Settings labels, results.carryLabel 'Energy saved', results.youWin 'YOU WIN!'. Acknowledge P3b-3 rulings C1-C10 (plan). Known: firstRun = bestScore 0 (a 0-score first run shows first-run again).

## Next (ordered, max 5)
1. Owner playtest + 40% verdict; if over40 not empty: lead tunes (OQ-C5), re-playtest.
2. Full fuzz matrix 200 x 120 s overnight (`npm run test:fuzz`).
3. P2 exit pass -> merge version/v0.2 into dev; start P3 planning.
4. Remaining owner questions (below) with the P3 UI pass.
5. Tech debt: P2c deferred minors (shrink fade crumble visual, hudText test cleanups, level%5 in tests, MEC-003 R21 heading "Debug tools").

## Workers and QA process
- Owner 2026-11-05: Claude subagents with the cheapest fitting model (sonnet/haiku; opus for final review); agy = tester only; Codex not used. Run independent tasks in parallel (worktrees). Low-RAM kill: wait, retry up to 3 times, then stop and report.
- Lead verifies every merge with full test + typecheck.

## Owner questions batched for the END of P2 (provisional defaults in use)
- Answered 2026-11-07 (DECISIONS): GDD §4 confirmed; leaderboard + streak parked; OQ-B1..B5 closed. Rest below stays open, review with the P3 UI pass.
- P3 provisional strings: death lines (P3a plan Task 3), Settings/Results/HUD copy, Shield + Mango Rain card text (P3b-3 C10).
- Task 9 player-facing strings ("Back", "Not now!", "Fresh start!", Results/Sound labels); GDD §4 session length; §8.3 reason to come back.
- P2b OQ-B6 (strings) and P2c OQ-C1..C5 (top of each plan). P2c rulings to confirm: shrink cooldown 20000 / weight 2; banner "Challenge: <name>!" + star; challenge changes only interval/cap; L30 rock weight 3; shrink strings per MEC-018 §8; shrink waits while another hazard holds a ring cell.
- Biome 4 coconut = 100% of bot deaths (12 of 22 on L20, clear 8/20): options L20 coconut 4 -> 2 or coconut params, if playtest confirms. Biome 5 chicken 39.6%.

## Known issues / tech debt
- Full family fuzz matrix not run (host RAM); reduced matrix passes.
- Windows: Vitest needs --configLoader native --pool threads --maxWorkers 2. Host RAM low: agy browser QA gets killed when fuzz/bot run at the same time.
- 4 skipped QA (reasons in files). Single 1.28 MB JS chunk.
- Checkpoints only reach L12; for QA use `?debug=1&level=N` or the debug HUD buttons "+1" / "Key ▶".
- Rubble family and `skills.shield.rubbleLifeMs` removed (chore/remove-rubble-family, 2026-11-10).

## Last session summary
- 2026-11-10 (MOT-4, worktree agent): branch feat/motion-4 from version/v0.3, NOT merged (lead merges): shared remaining-time telegraph pulse for all nine warn draw functions, hit beat + bomb count pop (HitBeats), additive warnLeftMs on gate/spike cells, HUD score tick/quota bar/energy cues/title/chip/skill-ready motion via motion.snap/ease/rebase. Next: lead merge + browser eye-check (60 fps, reduced motion).
- 2026-11-10 (local): save compat guard (v0.3 + v0.2), Rubble family removed (subagent, 1395 pass), v0.2 merged into v0.3, UIFIX waves 1-3 merged via Sonnet subagents. Tech debt left: shrink fade crumble visual, hudText test cleanups, level%5 in tests, MEC-003 R21 heading, stale rubble mentions in MEC-004 L7/MEC-006 §7/MEC-013, single 1.28 MB chunk. Not pushed.
- 2026-11-07 (local): owner rulings (GDD §4 ok, leaderboard+streak parked, OQ-B1..B5 closed); ART-003 skin guide (draft); ART-001 Q6/Q7; Remotion capy POC approved + merged. 1395 pass, typecheck clean. Not pushed.
- 2026-11-07 (cloud, P3b-1/2/3 + P3a): all via subagents (Haiku/Sonnet implementers+reviewers, Opus final review per sub-phase, one fix wave each). Two interruptions (5h usage limit, container restart) without loss — commit+push per step.
- 2026-11-07 (cloud, P3-0): version/v0.3 created; P3-0 executed via subagents (Haiku/Sonnet implementers + reviewers, Opus final review). Superpowers skills read from github obra/superpowers (plugin not loaded in cloud). Playwright replaces agy for browser checks here.
- 2026-11-07 (P3 planning): owner pushed HTML mockups; lead wrote P3 spec + P3-0 plan, 4 Sonnet subagents wrote the other plans. No code changed, no tests run. Mockup-vs-spec conflicts resolved spec-first (listed in each plan); visible changes: D-pad hidden unless setting on, sound toggle moves to Settings.
- 2026-11-06 (P3c): spec + plan in docs/superpowers/; 4 tasks via subagents (Haiku/Sonnet, Opus final review). Final review caught Phaser 3.90 decoding every data: URL as base64 -> fixed (base64 SVG URLs). Deferred minors in branch ledger (magic numbers in eye/mouth geometry, capyDie twice, preview label contrast).
- 2026-11-06 (art prep): reviewed Figma D2 and agent-sprite-forge; wrote ART-001 v2 + ART-002 (docs/JSON only, no tests run); branch feat/capy-character-spec from version/v0.2, pushed, not merged.
- 2026-11-06: owner accepted (nghiem thu) version/v0.2 with P2c, Shield without rubble, debug skip buttons, run start waits for first input (MEC-001-R2). First owner log (69 runs, 37 normal): over40 empty, wall 77% (review), max L13, biome 4 not reached; 7 runs died at 1260 ms with 0 turns -> fixed by the waiting phase.
