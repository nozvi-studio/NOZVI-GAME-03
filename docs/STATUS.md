# STATUS - project memory

**Updated:** 2026-11-23 **Milestone:** UI D4 "Duolingo Modern" Phases 1-5 implemented & committed on stacked feature branches (`feat/d4-p1-design-system` -> `feat/d4-p2-character-art` -> `feat/d4-p3-characters-home` -> `feat/d4-p4-menus-overlays` -> `feat/d4-p5-ingame-harmonization`); **NOT merged** (`version/v0.3` untouched). **Version branches:** `version/v0.3` (P3/P4a), `version/v0.2` (P2 exit).

## Now (in progress)
- [ ] **UI D4 "Duolingo Modern" (Hybrid Phaser + HTML/CSS) — Pause before merge (owner review):**
  - `D4-P1`..`D4-P5` all committed on `feat/d4-p5-ingame-harmonization` (`2fd71b8`). Verified: `tsc --noEmit` 0 errors, `vite build` clean, 246/246 Vitest files green (2004+ tests), headless Chrome QA 0 console/page/network errors (`tmp/qa/d4-p4/`, `tmp/qa/d4-p5/`).
  - **Open visual polish before merge (owner feedback 2026-11-23):** In-game screenshots look washed-out / pale gray due to two stacked causes: (1) `--d4-scrim-light: rgba(250, 249, 245, 0.42)` milky veil in `tokens.css` during countdown; (2) overly dusty low-chroma `TOKENS.d4run.cells` / `bg` pastel tints in `uiTokens.ts`.
- [x] **P4a skins (MEC-011), Fixed terrain (MEC-019), P3 (0..3a), UIFIX 1-3, Motion (MOT-0..4): merged into `version/v0.3`.**
- [ ] **P2 exit (`version/v0.2`):** waiting on owner normal-run playtest log (>= 30 runs, >= 10 reaching biome 4, no `?debug=1`) + overnight full fuzz (`npm run test:fuzz`).

## Next (ordered, max 5)
1. Tune D4-P5 in-game vibrancy on `feat/d4-p5-ingame-harmonization`: remove milky `--d4-scrim-light` countdown washout and raise Biome 1-5 board/frame freshness while keeping `>= 3:1` 6x5x11 contrast.
2. Owner LAN/mobile playtest sign-off on full D4 UI -> merge `feat/d4-p5-ingame-harmonization` into `version/v0.3` with `--no-ff`.
3. Optional D3 dead-code sweep (legacy Phaser menu widgets/tokens) after D4 merge sign-off.
4. P4b (MEC-009 marbles, MEC-010 marble machine) — **blocked** on owner choice of marble slot odds (mockups `2 / WHEEL 15% / SKIN 5% / 5 / 2` vs GDD §8.2 `10 / 25 / Mystery / 25 / 10`).
5. P2 exit playtest verdict + overnight full fuzz -> merge `version/v0.2` and `version/v0.3` into `dev`.

## Blockers / open decisions
- **D4 merge gate:** awaiting in-game color vibrancy tune + owner LAN playtest sign-off.
- **P4b blocker:** marble machine slot odds mismatch between mockups and GDD §8.2 (DECISIONS 2026-11-16).
- **Batched owner questions:** provisional strings (P3, MEC-019, MEC-011), Shield normal-hit invulnerability, skill pills vs banner band position.

## Known issues / tech debt
- Windows Vitest needs `--configLoader native --pool threads --maxWorkers 2` (`--maxWorkers 1` under load). Do not run Chrome QA and fuzz/bot together.
- `git checkout` / `git commit` / `npm install` require `BypassSandbox: true` on Windows due to `.git/` lock & npm cache permissions.

## Last session summary
- 2026-11-23: Completed `D4-P4` (`dfe8660`) and `D4-P5` (`2fd71b8`) on stacked feature branches with full Vitest (246/246), `tsc --noEmit`, `vite build`, and headless Chrome QA (`tmp/qa/d4-p4/`, `tmp/qa/d4-p5/`, 0 errors). GitNexus re-indexed (`7,328 nodes | 19,007 edges`). Held merge per owner request; logged washed-out countdown scrim + pastel board vibrancy fix as next item on `feat/d4-p5-ingame-harmonization`.
