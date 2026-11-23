# STATUS - project memory

**Updated:** 2026-11-23 **Milestone:** UI D4 "Duolingo Modern" Phases 1-4 complete and QA-verified on stacked feature branches (`feat/d4-p1-design-system` -> `feat/d4-p2-character-art` -> `feat/d4-p3-characters-home` -> `feat/d4-p4-menus-overlays`); `D4-P5` plan ready; `version/v0.3` untouched. **Version branches:** `version/v0.3` (P3/P4a), `version/v0.2` (P2 exit).

## Now (in progress)
- [ ] **UI D4 "Duolingo Modern" (Hybrid Phaser + HTML/CSS):**
  - `D4-P1` (design system + `uiHost`/`stageSync`), `D4-P2` (flat cel-shaded rig + 3-tier motion), `D4-P3` (live DOM `Home` & `Characters` + 5 transparent WebP mascot head portraits), and **`D4-P4` (live DOM `Results`, `Settings` full+overlay, `Loadout`, `Pause`, passive `Countdown`, `DeathCard`)** are implemented and verified (0 console errors, headless Chrome QA PASS at `360x640` & `360x780`, full Vitest suite + `tsc --noEmit` green).
  - **Next immediate task:** **`D4-P5` (In-Game Harmonization & Dead D3 Cleanup)** on `feat/d4-p5-ingame-harmonization` per `docs/superpowers/plans/2026-11-23-d4-p5-ingame-harmonization-and-cleanup.md`.
- [x] **P4a skins (MEC-011), Fixed terrain (MEC-019), P3 (0..3a), UIFIX 1-3, Motion (MOT-0..4): merged into `version/v0.3`.** Pending owner device/browser eye-check and merge into `dev`.
- [ ] **P2 exit (`version/v0.2`):** waiting on owner normal-run playtest log (>= 30 runs, >= 10 reaching biome 4, no `?debug=1`) + overnight full fuzz (`npm run test:fuzz`).

## Next (ordered, max 5)
1. Execute `D4-P5` (in-game biome backgrounds, checkerboard, flat `HudTop`/`SkillButtons`, swipe-hint overlap fix, Biome 6 Storm HUD contrast, dead D3 cleanup) + 6-biome headless Chrome QA.
2. Owner browser/mobile playtest sign-off on full D4 UI -> merge D4 branches into `version/v0.3` with `--no-ff` and refresh GitNexus.
3. P4b (MEC-009 marbles, MEC-010 marble machine) — **blocked** on owner choice of marble slot odds (mockups `2 / WHEEL 15% / SKIN 5% / 5 / 2` vs GDD §8.2 `10 / 25 / Mystery / 25 / 10`).
4. P2 exit playtest verdict + overnight full fuzz -> merge `version/v0.2` and `version/v0.3` into `dev`.
5. Owner backlog: `b4s2` Avalanche Steps redesign, Shield VFX upgrade, Invisibility dots bug.

## Blockers / open decisions
- **P4b blocker:** marble machine slot odds mismatch between mockups and GDD §8.2 (DECISIONS 2026-11-16).
- **Batched owner questions:** provisional strings (P3, MEC-019, MEC-011), Shield normal-hit invulnerability, skill pills vs banner band position.

## Known issues / tech debt
- Windows Vitest needs `--configLoader native --pool threads --maxWorkers 2` (`--maxWorkers 1` under load). Do not run Chrome QA and fuzz/bot together.
- `git checkout` / `git commit` / `npm install` require `BypassSandbox: true` on Windows due to `.git/` lock & npm cache permissions.

## Last session summary
- 2026-11-23: Completed `D4-P4` on `feat/d4-p4-menus-overlays` (Results, Settings full+overlay, Loadout, Pause, passive Countdown, DeathCard, thin scene shims, modal keyboard guard, `bandLock` warm bg repaint). Independent headless Chrome QA PASS (7/7 flows, 0 console/page/network errors, `360x640` & `360x780`); `tsc --noEmit`, `vite build`, and full Vitest suite green. Ready for `D4-P5`.
