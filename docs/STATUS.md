# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Claude Code **Milestone:** M1 — Phase P0 (Foundation) not started

## Now (in progress)
- [ ] Missing screens on the D2 design canvas (https://claude.ai/artifact/9zVMtmVhjWzeHeyWwjQ9JX), see list below.

## Next (ordered, max 5)
1. Draw P1 screens on the canvas (greybox-level is enough): Loadout (pick 2 skills), Pause overlay, 3-2-1 countdown, in-run banners (level up, biome card, checkpoint unlocked, skill unlocked, new obstacle tooltip), death moment, active-skill states.
2. In a session with Superpowers: `brainstorming` → `writing-plans` for **P0 Foundation** (GDD §11), then execute as small PRs.
3. P0 creates `docs/ARCHITECTURE.md`, `config/balance.json`, `src/core/`, tests; update CODEMAP and docs map in the same PRs.
4. Write MEC-001/003/006/007/008 specs before P1 starts.
5. Later screens: P3 Settings, D-pad layout, 6 biome board palettes, boot; P4 odds panel ("i"), coin shop / buy flow, duplicate → coins reveal, full-clear celebration, Results states (new best, checkpoint unlocked, first-time arrow), first-time Home.

## Blockers / open questions for human
- OPEN: target web portals (before P5) §13; session-length targets §4; reason to come back tomorrow §8.3; extra reference games §1 (optional).
- Superpowers is not installed in the cloud session; run spec/plan steps in a session that has it (AGENTS §4).
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- Prototype is a ~1000-line single file with global state and no tests; it is the reference for the P0 port.
- Prototype numbers (10 levels, 4 ms/level) differ from GDD (30 levels, 2 ms/level); GDD wins.
- D2 board uses pastel obstacles; contrast not yet checked on a real phone (GDD §10.1).

## Last session summary
- What was done: audited GDD v0.2 against the D2 design canvas; owner approved recommendations A–G; GDD v0.3 (D2 style, Mango-cat default, mango-only food, machine slots 2/5 coins + Wheel (coins) + Mystery, no aiming, duplicates 15/40/100 coins, Back → Pause, Trails/Frames parked); 2 DECISIONS entries; canvas updated to match (fixed broken Home/Results links, removed Game Back button, mango food, coin prices and balance on Skins, no tabs, machine slot values, Wheel = tap to spin paying coins with odds shown, Skin drop = rarity reveal 70/25/5).
- Last verified step (command + result): docs only, no code changed; canvas edits published, not visually checked.
- Commands that failed / work left uncommitted (check `git status`): none.
- What was learned / gotchas: the wheel has four ×1 segments, so its expected multiplier is ≈ ×1.72; GDD v0.2 coin values made skins far too cheap (≈ 516 coins per run).
