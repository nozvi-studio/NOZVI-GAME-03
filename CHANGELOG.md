# Changelog
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: SemVer (0.x until first public release).

## [Unreleased]
### Tests
- test(qa): independent black-box QA suite for P0 Task 2 by the tester worker (34 cases; MEC-004-R13 warn bound skipped until P2a).
### Features
- feat: HUD, overlay cards, banners, D-pad, synth audio + haptics and save wiring (P0 PR 8).
- feat: Phaser greybox board rendering, frame clock, run flow state machine, keyboard and swipe input (P0 PR 7).
- feat: versioned save skeleton with migrations and in-memory store (P0 PR 6).
- feat: hazard registry with rocks, fences, mazes, rising ground and the director; invariant fuzz and determinism tests (P0 PR 5).
- feat: mango placement with fairness BFS, golden mangoes, rot timer and rotten rocks (P0 PR 4).
- feat: core snake (turn queue, collisions), 10-level progression and Sim shell with snapshot (P0 PR 3).
- feat: balance config with parseBalance, seeded RNG, core API types and grid/BFS helpers (P0 PR 2).
### Chore
- chore: Vite 8 + Phaser 3.90 + TypeScript strict + Vitest scaffold with boundary test and ARCHITECTURE.md (P0 PR 1).
### Added
- Studio ruleset 0.3.1 setup files: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `docs/GDD.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/README.md`, `docs/CODEMAP.md`, `CHANGELOG.md`.
- `docs/superpowers/specs/2026-11-03-p0-foundation-design.md`: P0 Foundation design (architecture, prototype port of MEC-001…004, test strategy, verified versions); 4 DECISIONS entries (Phaser 3.90.0 pin, prototype values in P0, 1 ms fixed-step core, Phaser-drawn HUD).
- Mechanic specs MEC-001/002/003/004/006/007/008/012 (Approved, lead-delegated); P1 and P2 designs; implementation plans for P0 (9 PRs), P1 (10 PRs) and P2a (9 PRs).
- Cross-document consistency pass: one HazardFamily vocabulary, step order owned by ARCHITECTURE.md, run log in `src/session`; GDD §5.1/§5.3/§7 updated with owner decisions (base-tick warn rule, 3 families in biomes 4–5); DECISIONS entries for delegation, vocabulary, plan-level and owner decisions.
### Changed
- AGENTS §6: branching model `master` ← `dev` ← `version/vX.Y` ← task branches, direct `--no-ff` merges (owner 2026-11-04); P0 plan task branches now start from `version/v0.1`.
- `README.md` rewritten from the ruleset template.
- `docs/GDD.md` v0.2: 30 levels / 6 biomes, length reset on level up, energy + 4 skills (no cooldowns), skill loadout, in-run checkpoint, obstacle catalogue, marble machine + skins + coins meta (no real money), hybrid art direction, 6-phase roadmap (P0–P5), Phaser 3 + TypeScript stack.
- `docs/GDD.md` §6.4: checkpoints are milestone start levels for new runs (L10/15/20/25/30 → L4/6/8/10/12) with 50% energy carry-over, replacing the in-run continue.
- `AGENTS.md` §1 Stack: Phaser 3 + TypeScript + Vite + Vitest (owner-approved); `docs/GDD.md`: Mango Rain confirmed as the 4th skill, web-first platform confirmed.
- `docs/DECISIONS.md`: stack, redesign v0.2, meta/odds, art direction and roadmap decisions.
### Fixed
- fix: restore the prototype board's rounded 18px corners and 4px external ink outline, including theme changes and shake (P0 Task 8).
- fix: restore prototype particle burst counts, speeds, lifetimes and landing-dust color using named cosmetic presets (P0 Task 7).
### Removed
- Pre-ruleset design docs and Notion CSV databases under `docs/` (content condensed into `docs/GDD.md`; originals remain in commit `9fe2bb0`).

## [0.0.1] - 2026-11-03
### Added
- Project scaffold: single-file prototype `prototype/mango-snake-hard.html` and initial design notes.
