# PLAYTEST — evidence log

> Newest entry first. AI: read the latest entry only (AGENTS §2b).

## 2026-11-05 - P2a exit check (pending lead runs)
- Build: branch `feat/p2a-ground-tiles` (mud from L7, ice from L13; MEC-004 framework).
- `npm test`: <PENDING lead: pass count and seconds> · `npm run typecheck`: <PENDING> · `npm run test:fuzz`: <PENDING>.
- `npm run bot:report` (L1-15, 5 seeds): every level cleared by >= 1 seed: <PENDING yes/no>.
- WARN lines with one-line triage each: <PENDING paste, or "none">.
- Browser QA (desktop and `vite --host` phone), L7 and L13 played to the end, no console errors: <PENDING>.
- Death context spot check (Results shows the mud/ice line after a tile death): <PENDING>.

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
