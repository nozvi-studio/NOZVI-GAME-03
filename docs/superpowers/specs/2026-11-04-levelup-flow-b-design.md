# Level-up flow B - design (owner-approved 2026-11-04)

Status: approved by owner 2026-11-04. Scope: M1 P1 rework before the P1 exit gate.
Source: owner playtest feedback; DECISIONS 2026-11-04 "P1 owner playtest feedback". Supersedes the level-up freeze and crumble in MEC-003 R7-R11.

## Goal
A level up should not stop the game. The snake keeps moving, the board keeps its state, and a short slowdown gives the player time to read the level banner and get ready.

## Rules
1. **No freeze.** The `transition` phase is removed. The sim keeps stepping through a level up. The "Level N" banner shows for `ui.bannerMs` (1800 ms, owner 2026-11-04) as a non-blocking overlay; `level.transitionMs` is retired. Input is accepted at all times.
2. **Slowdown tiers** (by the level just reached; `config/balance.json` `levelUpSlowdown.tiers`):
   | Levels | Factor | Ease |
   |---|---|---|
   | 2-5 | none | - |
   | 6-15 | x1.4 | 1000 ms |
   | 16-30 | x1.6 | 1500 ms |
   The tick is multiplied by `curFactor = 1 + (factor - 1) * leftMs / easeMs`, which falls linearly to 1 in sim time. A level up during an active slowdown restarts it with the new tier.
3. **Slow-mo:** effective multiplier = `max(slowmoActive ? skills.slowmo.tickFactor : 1, curFactor)`. No stacking. MEC-006-R17 is amended.
4. **Speed ramp (MEC-008):** the multiplier applies to the base tick (`rampTick` or level tick), whichever MEC-008 gives.
5. **Old temporary obstacles stay.** No level-up crumble. Each hazard, terrain piece, snip wall and rubble ends by its own lifetime rules. Rotten rocks keep their MEC-002-R7 lifetime (owner 2026-11-04). Hazards of a family disabled in the new level keep working until they end.
6. **Director:** on level up, the director switches to the new level's formulas. Its first-spawn timer (`firstSpawnMs`) starts when the slowdown ends, or immediately for levels with no slowdown.
7. **Mango:** the current mango stays. New mangoes spawn by normal rules. The "reserved crumbling cells" rule is removed.
8. **Skills:** can be cast at any time. The `busy` rejection during level up is removed.
9. **Timers:** mango rot, skill, orb and director timers are no longer frozen on level up.

## Affected specs and code (from the lead's and subagent's analysis)
- MEC-003 R7, R7.1, R8, R9, R10, R11 rewritten; new rule MEC-003-R22 (slowdown). MEC-002 EC4, MEC-006-R17 and R35 amended. ARCHITECTURE "Sim step order" updated.
- Code: `src/core/transition.ts` (removed or reduced), `src/core/sim.ts` (`stepMs` early return), `src/core/skills.ts` (`effectiveTick`), director restart, `src/core/balance.ts` validation, HUD banner in `src/game/`. About 19 src/test files.

## Testing
- Unit tests named with MEC-003-R22 and the amended IDs: no slowdown at 2-5; x1.4 at 6 and 15; x1.6 at 16; ease midpoint; exact end at easeMs; Slow-mo max rule; re-level during slowdown; ramp interaction; obstacles survive a level up; the director's first spawn after the slowdown; skill cast during a level up.
- Existing transition and crumble tests are rewritten or removed, with each removal named in the plan.
- Determinism and fuzz suites must pass (`npm run test:fuzz`).
- Browser check: the banner overlay, no freeze, phone + desktop.

## Out of scope
- Changing the level table, obstacle families or the start-of-run countdown (owner keeps the start as is).
