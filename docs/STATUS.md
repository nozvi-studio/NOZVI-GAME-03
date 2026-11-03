# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-03 by Claude Code **Milestone:** M1 — Phase P0 (Foundation) not started

## Now (in progress)
- [ ] Owner review of GDD v0.2 (`docs/GDD.md`): ASSUMPTION and OPEN items listed below.

## Next (ordered, max 5)
1. Owner answers the remaining OPEN items below (none blocks P0).
2. In a session with Superpowers: `brainstorming` → `writing-plans` for **P0 Foundation** (GDD §11), then execute as small PRs.
3. P0 creates `docs/ARCHITECTURE.md`, `config/balance.json`, `src/core/`, tests; update CODEMAP and docs map in the same PRs.
4. Write MEC-001/003/006/007/008 specs before P1 starts.
5. Optional in parallel with P1: art style tile (GDD §10.1).

## Blockers / open questions for human
- OPEN: target web portals (before P5) §13; session-length targets §4; reason to come back tomorrow §8.3; extra reference games §1 (optional).
- Superpowers is not installed in the cloud session; run spec/plan steps in a session that has it (AGENTS §4).
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- Prototype is a ~1000-line single file with global state and no tests; it is the reference for the P0 port.
- Prototype numbers (10 levels, 4 ms/level) differ from GDD v0.2 (30 levels, 2 ms/level); GDD wins.

## Last session summary
- What was done: owner confirmed Mango Rain = 4th skill and web-first; AGENTS.md §1 updated to Phaser 3 + TS + Vite (owner-approved); checkpoint rules clarified by the owner (fixed milestones L10/15/20/25/30 → start L4/6/8/10/12, partial energy carry-over to the next run); earlier: design discussion with the owner (Vietnamese); wrote GDD v0.2 (30 levels / 6 biomes, length reset, energy skills, loadout, checkpoint, obstacle catalogue, marble machine + skins meta, hybrid art, P0–P5 roadmap); added 5 DECISIONS entries; CHANGELOG updated.
- Last verified step (command + result): docs only, no code changed; no build/test to run.
- Commands that failed / work left uncommitted (check `git status`): none.
- What was learned / gotchas: marble machine must decide the outcome before animating so published odds stay exact; length reset is required or the board fills before L12.
