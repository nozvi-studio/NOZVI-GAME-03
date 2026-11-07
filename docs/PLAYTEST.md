# PLAYTEST — evidence log

> Newest entry first. AI: read the latest entry only (AGENTS §2b).

## 2026-11-05 — P2 exit check (lead; owner playtest pending)
- Tests: full suite 1158 pass (~25 s), typecheck clean. Fairness per family + full-table L30 fuzz test pass.
- Fuzz: reduced matrix (10 seeds x 60 s, every family solo + full) 22/22 pass after fix 5d96b3e (shrink no longer starts on a ring cell reserved by another family; found by fuzz I5 in full mode). Shrink rate at L30 after fix ~1.3/min (was 1.45). Full default matrix (200 x 120 s) NOT run: stopped for host RAM (owner choice); run overnight.
- Bot report L1-30: reused the P2c tuning entry below (balance.json unchanged since). Every level cleared by >= 6/20 seeds; board size no escalation.
- agy browser QA (phone 390x844 + desktop 1280x800, `?debug=1&level=N`, attempt 3 after two low-RAM kills): 9/10 PASS (L27 shrink lifecycle, mango displacement, shrink start exclusion, shield vs closed edge, level up with closed ring, L30 2 min big-event exclusivity, reduced motion, viewports, 0 console errors/warnings, L7 mud, L13 ice, L16-23 families). FAIL item 1: challenge banner missing on run start (Hud listener attached after `newRun`) -> fixed in 2f955a0; star marker PASS. Re-check of the banner folded into the owner playtest.
- Open for owner playtest (40% gate via `deathCauseReport`, debug runs excluded): biome 4 coconut is 100% of bot deaths; biome 5 chicken 39.6%.

## 2026-11-05 — P2c tuning (bot report L1-30, 20 seeds, 180 s per run)
- Method: `npm run bot:report` equivalent, split into 6 parallel biome bands (`VITE_BOT_FROM/TO`, 1 worker each, Windows Vitest flags) because one serial run takes about 82 min; per-biome tables are identical to a serial run (bot is seed-deterministic). A first serial run (L1-30 x 20 seeds, 82 min) printed nothing: Vitest hides console output of passing tests, so `bot:report` now passes `--reporter=verbose`. No deviation in seeds or levels.
- **Baseline (round 0):** clears per level L1-30 all >= 6/20 (no level cleared by 0 seeds). Warnings: biome 3 fence 67% (2 of 3 deaths), biome 4 coconut 94% (29 of 31 deaths). Biome 5 chicken 40% (19/48 = 39.6%, not above 40%). First-level clears per biome: 19, 19, 16, 14, 10, 8 (non-increasing).
- **Round 1 (config only):** `fence` 2 -> 1 in rows L11, L12, L13-14; `coconut` 2 -> 1 in rows L16, L17, L18-19. Challenge rows and biomes 5-6 untouched (their results are bit-identical to round 0).
- **Result after round 1** (clear/death/timeout out of 20):

| Biome | Levels | Clears per level | Deaths by cause |
|---|---|---|---|
| 1 | L1-5 | 19, 20, 20, 19, 20 | none |
| 2 | L6-10 | 19, 18, 18, 17, 17 | none |
| 3 | L11-15 | 17, 20, 20, 19, 20 | fence 1 of 1 death (noise) |
| 4 | L16-20 | 18, 18, 18, 16, 8 | coconut 22 of 22 |
| 5 | L21-25 | 10, 10, 11, 13, 8 | chicken 40%, coconut 21%, cat 21%, fence 8%, bomb 8%, wall 2% |
| 6 | L26-30 | 8, 6, 8, 6, 8 | coconut 27%, cat 22%, chicken 20%, fence 14%, bomb 9%, maze 3%, rock 2%, wall 3% |

- **WARNs left (2):** (a) biome 3: fence 100% of 1 death (statistical noise: 1 death in 100 runs; weight is already 1 in every non-challenge row of L11-14). (b) biome 4: coconut 100% of 22 deaths. Coconut is the only family that kills the bot in biome 4, so lowering other weights cannot move the share; coconut is at the weight-1 floor in L16-19, and 12 of the 22 deaths are on the L20 challenge level (coconut weight 4, MEC-003 section 12 weights kept: L20 is cleared 8/20, not 0). Experiment, not shipped: L20 coconut 4 -> 2 raised L20 clears 8 -> 15 of 20 but coconut still caused 100% of its deaths. Owner options: lower the L20 coconut weight and/or tune coconut family parameters (`coconut.maxActive`, `warnMs`, `cellMs`).
- Monotonic difficulty check: first-level clears per biome 19, 19, 17, 18, 10, 8. Biome 4 (18) is above biome 3 (17) by one seed after the coconut tuning (within noise at 20 seeds); not corrected.
- Timeouts (no clear, no death in 180 s) are 0-3 per level in L1-11 (bot is cautious on early levels, not a content issue).
- **Board size (P2 design section 17, MEC-004-R20):** L25 median reachable free cells 274 of 289 (95%), L30 255.5 of 289 (88%), both far above 40%. Clear rate L21-25 = 50/100 = 50%, L26-30 = 36/100 = 36% (>= half of 50%). Verdict: **no escalation**, board stays 17 x 17 (P2-D8).
- Tests after tuning: full suite 1149 pass, typecheck clean (golden pins in `tests/core/balance.test.ts`, `director.test.ts`, `hazards/coconut.test.ts` updated for the changed rows).


## 2026-11-05 — P2b exit check
- `npm test`: 1112 pass / 6 skip / 12 todo (1 worker); `npm run typecheck`: clean.
- Fuzz (reduced, 20 seeds x 60 s, 1 worker): PASS, 1108 tests, about 39 min.
- `npm run bot:report` L16-25 (5 seeds, `VITE_BOT_FROM=16 VITE_BOT_TO=25`): every level cleared by at least 1 seed (L25 1/5, L22 2/5). Deaths: biome 4: coconut 2 (67%), fence 1. Biome 5: coconut 5 (45%), chicken 3, cat 2, bomb 1. WARN coconut > 40% in biomes 4 and 5. Triage: the samples are small and the greedy bot does not dodge telegraphed lanes well. Retune coconut (interval/weight/cellMs) in P2c Task 6, using the tuning loop and a larger bot sample, before the owner playtest.
- Browser QA: not run (host RAM). Carried to the P2c/P2 exit QA together with P2a L7/L13.

## 2026-11-05 - P2a exit check (pending lead runs)
- Build: branch `feat/p2a-ground-tiles` (mud from L7, ice from L13; MEC-004 framework).
- `npm test`: 938 pass / 6 skip / 12 todo (~76 s, 1 worker) · `npm run typecheck`: clean · fuzz mode (reduced, `VITE_FUZZ_SEEDS=30 VITE_FUZZ_MS=60000`, 1 worker): all family fuzz pass; legacy MEC-004 fuzz 12/12 pass (its 60 s timeout lifted in fuzz mode). Full 200 x 120 s family matrix not run (host RAM); run it overnight when the host allows.
- `npm run bot:report` (L1-15, 5 seeds): every level cleared by >= 1 seed: yes. 0 bot deaths; timeouts are greedy-bot slowness (L8 1/5 clears, L4-5 and L10-11 3/5), not unfair deaths.
- WARN lines: none.
- Browser QA (desktop and phone), L7 and L13: NOT RUN. The agy run was killed by host low RAM; the owner chose to merge without it (2026-11-05). Carried to the P2b QA pass.
- Death context spot check: covered by unit tests only (MEC-003-R19); browser check carried to the P2b QA pass.

## 2026-11-04 — P1 exit gate verdict: PASS (lead)
- Basis (owner decision 2026-11-04: gate = 2 testers, and "agy QA pass => gate pass"):
  - Owner desktop log: 13 runs, max L9, deaths wall 11 / self 2. The 4 wall deaths at exactly 1260 ms were no-input runs (9 steps x 140 ms from spawn), not a bug; the owner kept the start rule. `run_end.turns` is now logged to tell idle from lost input.
  - Owner phone log: 3 runs, max L2, deaths wall 1 / rock 1; 1 run quit without `run_end`.
  - Owner feedback fixed: WASD lag (native keydown), level-up flow B (no freeze, obstacles stay, slowdown tiers MEC-003-R22).
  - agy black-box browser QA of flow B, desktop 1280x800 + phone 390x844: 11/11 PASS. Item 5 (L16) was checked through the debug state because checkpoints stop at L12. Report kept outside git (.superpowers/qa/qa-levelup-b.md).
- Not met / carried to P2: the original 5-tester protocol and replay >= 3 metric were waived by the owner; session-length targets (GDD §4) are still open. Re-check with the P2 exit playtest (P2c Task 8).
- Verdict: P1 gate PASS. version/v0.1 merged into dev; P2 starts on version/v0.2.

## 2026-11-04 — P1 playtest protocol (pending owner)
- Build: branch `chore/p1-playtest` (P1 Task 10). `npm run build` + `npx vite preview --host` on LAN (or a static host); testers open the game with `?debug=1`.
- Session: 5 testers, fresh save each (clear site data first), up to 15 min of unprompted play; the observer only notes comments, never prompts.
- Data: on Home tap **Export log** (copies the run log JSON; if the clipboard fails a selectable text box shows it). Paste each JSON into a collapsed block below. In the browser console (page opened with `?debug=1`) run `__summarize('<json>')` and fill the table.
- Gate (P1 design §1 item 3): ≥ 3 of 5 testers replay ≥ 3 times unprompted, measured as first-session `runsPerSession[0] ≥ 4` (session gap = `log.sessionGapMs`); runs with ≥ 1 `skill_used` ≥ 50 % over all testers. Also record checkpoint-start fairness comments (GDD §6.4) and every cause > 40 % (P2 input). Verdict: pass / iterate P1.
- Manual items of P1 design §10.7 still open from the Task 9 entry below (scene walk, phone run, no console errors) are checked in the same sessions.

| Tester | Runs | From Results / Home | Levels reached | Causes (share) | Skill-run share | Checkpoint starts | runsPerSession | Replay ≥ 3 (first session ≥ 4 runs) |
|---|---|---|---|---|---|---|---|---|
| T1 | | | | | | | | |
| T2 | | | | | | | | |
| T3 | | | | | | | | |
| T4 | | | | | | | | |
| T5 | | | | | | | | |

- Totals: testers passing replay: _ / 5 · skill-run share over all testers: _ % · causes > 40 %: _
- Checkpoint fairness comments: _
- Observer comments: _
- Verdict: _ (pass / iterate P1)

<details><summary>Exported logs (T1–T5)</summary>

_pending_

</details>

## 2026-11-04 — P1 scenes manual check (pending)
- Build: branch `feat/p1-scenes` (P1 Task 9). Automated tests, typecheck and build pass; the browser walk below is **pending** (independent tester, then owner phone).

| Check (P1 design §10.7, MEC §8) | Desktop | Phone | Notes |
|---|---|---|---|
| Fresh save → Home "Play" → no Loadout → L1 run (countdown 1.5 s) | pass | | MEC-007-R1, MEC-008-R4; opens Home, Play skips Loadout and starts L1 countdown (1.5 s) |
| Reach L3 → `tip.skillUnlocked.slot` + `unlock` jingle; slot button appears | pass | | MEC-007 §8; reveals slot button and displays "Slow-mo unlocked! Tap left to use it" tip |
| Die → Results (cause, level, cleared, score, best/New best!, carry) → Play again starts at once, same level | pass | | MEC-007-R2; summary shows cause, level, cleared, score, best; Play again restarts run at once at same level |
| Home → Loadout opens, confirm in one tap (Go!, Enter, Space); Back/Esc does not save | pass | | MEC-007-R9; Loadout opens from Home; Back/Esc discards edits; Go! saves selection and begins run |
| Pause → Quit → Results cause "Quit" | pass | | MEC-003-R20; Pause overlay Quit ends run with cause "Quit" and navigates to Results |
| `J`/`Q` and `K`/`E` cast; ignored during countdown and pause; auto-repeat ignored | pass | | MEC-007-R14/R15; J/Q and K/E cast skills; auto-repeat suppressed; input blocked in countdown/pause |
| Reject feedback: shake + `nope` + reason text; empty slot silent | pass | | MEC-006 §8; shake + nope + "Need 40 energy" tip on cost failure; empty slot reject is silent |
| Orbs blink at ≤ 2 s; rain mangoes droplet; snip wall stripe; rubble; shield ring; slow-mo tint; biome tint | pass | | MEC-006 / MEC-003 §8; biome tints, slow-mo overlay, shield ring, rubble, snip wall, orb blink verified |
| Level-up banner (level, fresh start, biome, new family); checkpoint banner + first tip; ramp hint; next-checkpoint hint | pass | | MEC-003 / MEC-008 §8; level-up banner, checkpoint banner ("Next run starts at L4!"), first-unlock tip, ramp/checkpoint hints |
| No console errors | pass | | Phaser banner and seed console.info only; 0 console errors |

## 2026-11-05 — P0 parity: Phaser build vs prototype
- Build: commit `23dd42e`, Phaser 3.90.0, TypeScript 7.0.2. Automated: `npm test` 369 tests in 10.3 s (target < 10 s, slightly over); `npm run test:fuzz` PASS (27.4 s); typecheck and build exit 0.
- Devices: desktop headless Chrome 156 / Windows 11, 1280×800 (independent tester agy, light, dark, reduced motion); phone: owner run 2026-11-04 — **pass** (owner: plays OK, UI matches the original prototype HTML; reported as a whole, not per row).
- Saves: old prototype saves (best score `mango-snake-hard2-best`, sound `mango-snake-sound`) are **not** carried over (design §8). New key `mango-snake.save`.

| Check (design §7.4) | Desktop | Phone | Notes |
|---|---|---|---|
| Start / pause / resume / countdown flow | pass | | Space/P/Esc pause; resume runs countdown |
| Turning feel, buffered double turns, no reverse | pass | | |
| Eating, growth, golden mango | pass | | golden rule also covered by core tests |
| Rot ring and rotten rock | pass | | |
| Level bar and banners at levels 3, 5, 7 | not reached | | no level skip in build; covered by core + QA tests |
| Rocks: appear, warn, land, avoid snake, crumble | pass | | |
| Fences: same | not reached | | unlock L3; covered by core + QA + fuzz |
| Hedge mazes: same | not reached | | unlock L7; covered by core + QA + fuzz |
| Rising ground: same, waits for the snake | not reached | | unlock L5; covered by core + QA + fuzz |
| Death causes and texts (all 7 + board full if reached) | pass | | edge death seen live; all 7 strings match prototype (QA-T8) |
| Best score kept after reload | pass | | |
| Sound toggle kept after reload | pass | | |
| Reduced motion; dark scheme | pass | | |
| No console errors | pass | | Phaser banner + seed `console.info` only |

- Differences found: HUD/overlays drawn as Phaser objects (intentional, design D3/§7.1); 1 ms fixed-step timing (accepted, design §4); new save envelope (intentional, design §8). Bugs: none.
- Verdict: P0 exit criteria (design §1) **met** (desktop + owner phone run); open: a visual check of levels 3–7 hazards (no level-skip hook; consider a dev-only start-level option in P1, which adds `startLevel` anyway).

## 2026-11-07 P3b-3 visual QA (Playwright, cloud)

- Screens checked at 540x960 and 360x640: Boot (fonts held, logo pending), Home (first-run, normal, 2 checkpoints), Loadout (1 slot, 2 slots, locked cards), Settings (all on / Light, all off / Dark), Results (normal, newBest, checkpoint, firstRun, won). Screenshots: `sdd/p3b-3/qa/` in the session scratchpad (not committed).
- Flow walked with real input: Boot, Home, Settings, Home, Loadout, Go, death, Results, Play again, Home. No console errors.
- Acceptable differences from the mockups: P4 marbles row and machine hidden; extra Home stepper; energy-saved card in the marbles slot; middle block shrink never below 0.85.
- Open visual follow-ups: Settings knob shadow, theme tile selection ring, EATEN stat icon, Results title 34 vs mockup 40, Boot logo position.
