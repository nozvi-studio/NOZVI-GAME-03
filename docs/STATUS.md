# STATUS - project memory

**Updated:** 2026-11-23 **Milestone:** UI D4 "Duolingo Modern" (Hybrid Phaser + HTML/CSS) in progress on `version/v0.3`: `D4-P1` implemented (awaiting owner stylebook eye-check), `D4-P2` plan written; P4a skins (MEC-011) merged; P2 exit (`version/v0.2`) waits on owner playtest. **Version branches:** `version/v0.3` (P3/P4a/D4), `version/v0.2` (P2 exit).

## Now (in progress)
- [ ] **UI D4 "Duolingo Modern" (Hybrid Phaser + HTML/CSS):** Umbrella + 5 phase specs (`D4-P1`..`D4-P5`) audited and approved. **`D4-P1` foundation + interactive stylebook implemented** (`src/game/dom/`, singleton `synth.ts`, `#ui-root` wiring, `docs/design/mockups/d4/stylebook.html`, `happy-dom` test harness). Pending: owner browser eye-check on `stylebook.html` (`npm run dev` → `/docs/design/mockups/d4/stylebook.html`) + commit/merge. **`D4-P2` plan ready** (`docs/superpowers/plans/2026-11-23-d4-p2-characters-art-and-motion.md`).
- [x] **P4a skins (MEC-011): merged into `version/v0.3`** (8 tasks + final review fixes, 1897 pass, typecheck clean). Spec `docs/specs/mechanics/MEC-011-skins.md`, plan `docs/superpowers/plans/2026-11-16-p4a-skins.md`, QA record in `PLAYTEST.md`, screenshots in `tmp/qa/p4a/`. Pending: owner browser eye-check (3 new heads at board size, idle bob + buy celebration, Rare eat sparkle + leaf trail, biome colours, provisional strings).
- [ ] **UI D3 "Juicy" redesign:** U0..U6 merged into `version/v0.3`. **RESUME HERE (D3):** write U7 plan (audit + exit): Loadout back/go/title resize, Pause checkpoint chip drawn twice (U5 bug), Loadout boundary tests hm 641-700, HudScene banner wiring test, texture key budget audit (<= 120), U2 Task 5 sharpness spike (non-blocking).
- [x] **Fixed terrain (MEC-019): merged into `version/v0.3`** (`fe3a67b`; spec `docs/specs/mechanics/MEC-019-terrain.md`, rulings FT-1..FT-8, BAND-R1 banner band). Pending: owner eye-check (`docs/design/terrain/board.html`, level-up change, Shield breach, provisional strings), 20-seed `npm run bot:report` vs no-terrain comparison before tuning, design §5 question (invuln on normal Shield hit).
- [x] **P3 (0, 3b-1/2/3, 3a), UIFIX waves 1-3, Motion (MOT-0..4): merged into `version/v0.3`.** Pending **P3 exit (owner):** device pass (60 fps mid-range phone, 360x640 readability, juice/motion/D3 eye-check) + provisional string batch + merge `version/v0.3` into `dev`.
- [ ] **P2 exit (`version/v0.2`):** waiting on owner normal-run playtest log (>= 30 runs, >= 10 reaching biome 4, no `?debug=1`) for 40% death-cause verdict (biome 4 coconut 100% bot deaths, biome 5 chicken 39.6%) + overnight full fuzz matrix.
- [ ] **Owner notes 2026-11-17 (backlog, after P4a):** (1) redesign terrain template `b4s2` Avalanche Steps; (2) Home: remove "Start from level 1", 2-skill pick and "Start Energy", keep only PLAY (needs spec impact check); (3) better Shield visual effect; (4) bug: odd round dots under snake body during Invisibility.

## Next (ordered, max 5)
1. UI D3 U7 (audit + exit) plan and execution on `version/v0.3`.
2. Owner device/browser eye-check for P3 exit + P4a + fixed terrain; string batch review.
3. P4b (MEC-009 marbles, MEC-010 marble machine) — **blocked** on owner choice of marble slot odds (mockups `2 / WHEEL 15% / SKIN 5% / 5 / 2` vs GDD §8.2 `10 / 25 / Mystery / 25 / 10`).
4. P2 exit playtest verdict + overnight full fuzz (`npm run test:fuzz`) → merge `version/v0.2` and `version/v0.3` into `dev`.
5. Owner notes 2026-11-17 backlog (`b4s2` redesign, Home simplification spec, Shield VFX, Invisibility dots bug).

## Blockers / open decisions
- **P4b blocker:** marble machine slot odds mismatch between mockups and GDD §8.2 (DECISIONS 2026-11-16).
- **P4 return hook:** GDD §8.3 reason to come back (challenges + skins; "challenge" unspecced).
- **Batched owner questions:** provisional strings (P3, MEC-019, MEC-011), P2b/P2c rulings, Shield normal-hit invulnerability, skill pills vs banner band position, ART-003 Q1.

## Known issues / tech debt
- Windows Vitest needs `--configLoader native --pool threads --maxWorkers 2` (`--maxWorkers 1` under load). Low host RAM: do not run Chrome QA and fuzz/bot together.
- 4 skipped QA tests (reasons in files). Single ~1.3 MB JS chunk. Checkpoints reach L12 (use `?debug=1&level=N` for QA).
- Pause draws checkpoint chip twice (U5 bug, queued for U7). Home debug "Export log" overlaps checkpoint chip.

## Last session summary
- 2026-11-22: finished P4a skins (MEC-011) on `feat/p4a-skins`: Task 7 Rare skin eat sparkle + leaf trail (`skinFxModel`, `skinFx`, `balance.juice.skinFx`, `TOKENS.d3.skinFx`, wired in `GameScene` below terrain/hazards; headless QA `tmp/qa/p4a/fx-*.png`, 0 log errors) and Task 8 docs (`MEC-011-skins.md`, `ART-003`, `GDD`, `CODEMAP`, `README`, `UI-MOCKUPS`, `DECISIONS`, `PLAYTEST`, `STATUS`, `CHANGELOG`). Full suite 1897 pass, typecheck clean.
- 2026-11-17: P4a Tasks 1-6 committed on `feat/p4a-skins` (rules, save v4 + session, 3 new skins on rig, run/Home colours, Characters view/layout/scene + Home entry).
- 2026-11-16: `feat/fixed-terrain` and `docs/p4a-skins` merged into `version/v0.3`; P4a plan written; U6 merged into `version/v0.3`.
