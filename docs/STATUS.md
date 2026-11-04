# STATUS — project memory

> AI: read at session start, rewrite at session end. Keep under ~60 lines; move history to CHANGELOG.

**Updated:** 2026-11-04 by Claude Code **Milestone:** M1 — Phase P0 (Foundation) not started

## Now (in progress)
- [ ] Owner visual review of the D2 canvas (https://claude.ai/artifact/9zVMtmVhjWzeHeyWwjQ9JX): all screens from GDD v0.3 §10.3 are drawn (P1 core loop, P3 settings/biomes, P4 meta) and audited against the GDD.

## Next (ordered, max 5)
1. Check obstacle contrast of the biome boards on a real 5" phone (GDD §10.1).
2. In a session with Superpowers: `brainstorming` → `writing-plans` for **P0 Foundation** (GDD §11), then execute as small PRs.
3. P0 creates `docs/ARCHITECTURE.md`, `config/balance.json`, `src/core/`, tests; update CODEMAP and docs map in the same PRs.
4. Write MEC-001/003/006/007/008 specs before P1 starts.
5. Self-host Lilita One + Nunito (SIL OFL) when the UI is built (P3).

## Blockers / open questions for human
- OPEN: target web portals (before P5) §13; session-length targets §4; reason to come back tomorrow §8.3; extra reference games §1 (optional).
- Superpowers is not installed in the cloud session; run spec/plan steps in a session that has it (AGENTS §4).
- `.claude/settings.json` permissions not yet verified in a live session.

## Known issues / tech debt
- Prototype is a ~1000-line single file with global state and no tests; it is the reference for the P0 port.
- Prototype numbers (10 levels, 4 ms/level) differ from GDD (30 levels, 2 ms/level); GDD wins.
- D2 board uses pastel obstacles; contrast not yet checked on a real phone (GDD §10.1).

## Last session summary
- What was done: snake made the main character on the canvas (new PlayerHead part, blue "Mango" snake with a mango leaf; skins eat their own food); GDD v0.3 from the D2 design audit (style, Mango-cat default, mango-only food, coin economy, Wheel bonus, no aiming); canvas fixed to match; 14 missing screens added on the canvas (in another chat, from a brief written here) and audited; 11 mismatches fixed on the canvas (skill costs/durations, Loadout copy and L6 slot unlock, start length 4, checkpoint hints L10/L20, Results checkpoint state L10 → start L4, full clear ≥ 255 mangoes, missing Lilita One font on 3 artboards, biome board frame height, pity copy, bomb blast shape, Equip → Home).
- Last verified step (command + result): docs only, no code changed; canvas edits published, not visually checked.
- Commands that failed / work left uncommitted (check `git status`): none.
- What was learned / gotchas: canvas artboards copy numbers by hand, so every new screen needs a check against GDD §6–§8 numbers.
