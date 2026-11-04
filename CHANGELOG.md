# Changelog
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: SemVer (0.x until first public release).

## [Unreleased]
### Added
- Studio ruleset 0.3.1 setup files: `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `docs/GDD.md`, `docs/STATUS.md`, `docs/DECISIONS.md`, `docs/README.md`, `docs/CODEMAP.md`, `CHANGELOG.md`.
### Changed
- `README.md` rewritten from the ruleset template.
- `docs/GDD.md` v0.2: 30 levels / 6 biomes, length reset on level up, energy + 4 skills (no cooldowns), skill loadout, in-run checkpoint, obstacle catalogue, marble machine + skins + coins meta (no real money), hybrid art direction, 6-phase roadmap (P0–P5), Phaser 3 + TypeScript stack.
- `docs/GDD.md` §6.4: checkpoints are milestone start levels for new runs (L10/15/20/25/30 → L4/6/8/10/12) with 50% energy carry-over, replacing the in-run continue.
- `AGENTS.md` §1 Stack: Phaser 3 + TypeScript + Vite + Vitest (owner-approved); `docs/GDD.md`: Mango Rain confirmed as the 4th skill, web-first platform confirmed.
- `docs/DECISIONS.md`: stack, redesign v0.2, meta/odds, art direction and roadmap decisions.
- `docs/GDD.md` v0.3 (owner-approved audit of the D2 design canvas): D2 pastel UI style with Lilita One + Nunito; Mango-cat default skin; mango food for every skin; marble machine slots 2/5 coins + Wheel bonus (coins) + Mystery, no aiming, duplicates 15/40/100 coins; Back in game opens Pause; Trails/Frames parked. Two `docs/DECISIONS.md` entries.
### Fixed
### Removed
- Pre-ruleset design docs and Notion CSV databases under `docs/` (content condensed into `docs/GDD.md`; originals remain in commit `9fe2bb0`).

## [0.0.1] - 2026-11-03
### Added
- Project scaffold: single-file prototype `prototype/mango-snake-hard.html` and initial design notes.
