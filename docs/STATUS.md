# STATUS - project memory

**Updated:** 2026-11-23 **Milestone:** UI D4 "Duolingo Modern" **ALL 5 PHASES (`D4-P1`..`D4-P5`) COMPLETE & QA-VERIFIED** on stacked feature branches (`feat/d4-p1-design-system` -> `feat/d4-p2-character-art` -> `feat/d4-p3-characters-home` -> `feat/d4-p4-menus-overlays` -> `feat/d4-p5-ingame-harmonization`); `version/v0.3` untouched pending owner playtest sign-off. **Version branches:** `version/v0.3` (P3/P4a), `version/v0.2` (P2 exit).

## Now (in progress)
- [ ] **UI D4 "Duolingo Modern" (Hybrid Phaser + HTML/CSS) — Ready for owner playtest sign-off & merge:**
  - `D4-P1` (design system + `uiHost`/`stageSync`), `D4-P2` (flat cel-shaded rig + 3-tier motion), `D4-P3` (live DOM `Home` & `Characters` + 5 transparent WebP mascot head portraits), `D4-P4` (live DOM `Results`, `Settings` full+overlay, `Loadout`, `Pause`, passive `Countdown`, `DeathCard`), and **`D4-P5` (calm ray-free backgrounds, softened 6x5x11 contrast checkerboards, rounded 4px-lip frame, flat `HudTop`/`SkillButtons`/`BottomGroup`, cyan/gray cost badges, swipe-hint finger overlap fix, Storm HUD contrast)** are complete and verified (`tsc --noEmit` 0 errors, `vite build` clean, 246/246 Vitest files green, 6-biome headless Chrome QA 0 errors in `tmp/qa/d4-p5/`).
  - **Next immediate action:** Owner browser/LAN mobile playtest sign-off -> `git merge --no-ff feat/d4-p5-ingame-harmonization` into `version/v0.3` + refresh GitNexus.
- [x] **P4a skins (MEC-011), Fixed terrain (MEC-019), P3 (0..3a), UIFIX 1-3, Motion (MOT-0..4): merged into `version/v0.3`.**
- [ ] **P2 exit (`version/v0.2`):** waiting on owner normal-run playtest log (>= 30 runs, >= 10 reaching biome 4, no `?debug=1`) + overnight full fuzz (`npm run test:fuzz`).

## Next (ordered, max 5)
1. Owner LAN/mobile playtest sign-off on complete D4 UI (`D4-P1`..`D4-P5`) -> merge into `version/v0.3` with `--no-ff` and refresh GitNexus.
2. Optional D3 dead-code sweep (remove unreferenced legacy Phaser menu widgets/tokens once owner approves full D4 merge).
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
- 2026-11-23: Completed `D4-P4` (`dfe8660`) and `D4-P5` (`feat/d4-p5-ingame-harmonization`) with independent headless Chrome QA across all 7 P4 flows and all 6 P5 biomes (`tmp/qa/d4-p4/`, `tmp/qa/d4-p5/`, 0 console/page/network errors). Full Vitest suite (246/246 files, 2004+ tests), `tsc --noEmit`, and `vite build` green. Ready for owner playtest sign-off & merge to `version/v0.3`.
