# MOT-3 In-run event feedback (sound-only gaps and derived feedback)

**Status:** Draft for owner review. **Date:** 2026-11-10. **Branch:** docs/motion-3 (from docs/motion-specs). **Depends on:** MOT-0 (curves, `balance.motion`, feedback grammar R4/R5/R6/R7).

## 1. Problem
GDD 10.4 and `mapJuice` (`src/game/juice/juiceMap.ts`) cover eat, orb, skill cast, level up, biome, checkpoint and death. Five sim events still produce a sound and nothing else: `shieldBroke`, `skillUnlocked`, `runWon`, `landed`, `rampEnded` (the last `case` lines of `mapJuice`). GDD 10.4 also lists no feedback for four moments that matter for feel: a mango appearing, the snake turning, a golden mango waiting on the board, and the level quota filling. Today the mango "grow" is an inline 220 ms constant in `drawMango` (`src/game/render/mango.ts`).

## 2. Design rules
- **MOT-3-R1 Extend, do not fork.** Every event is one row in `mapJuice`; visuals are new `BoardVisual` / `ScreenVisual` union members in `src/game/juice/types.ts`, played by `GameScene.playBoardFx`, `Effects` (board space) or `ScreenFx.play` (HUD space). No second tween path; new code outside `ScreenFx` (which already owns raw tweens, per MOT-0 section 5) uses `src/game/motion`.
- **MOT-3-R2 Budgets.** New particles go through `Effects.burst` (cap `juice.perf.maxParticles` 300, `trimOldest`); new floating text through `Effects.floatText` (cap `maxFloats` 6); new HUD dots through the `sparks` path (cap `maxSparks` 12). No new unbounded list. A burst is trimmed, never refused.
- **MOT-3-R3 Numbers live in config.** Every duration, count, scale and alpha below is a key (section 8, merged by the lead). Colours are existing `ColorId` tokens only (`colors.ts`); no new colour ids.
- **MOT-3-R4 Reduced motion** is decided inside `mapJuice` (`ctx.reduced`), like every other row, so it is unit-tested (section 6).
- **MOT-3-R5 No sim impact.** All feedback is render-side; the sim, its RNG and `session.turn` timing are untouched (GDD 13).

## 3. Sound-only events today
"Derived" means GameScene or HudScene computes the trigger from snapshot changes (as `checkpointUnlocked` is derived), not a new sim event.
| Id | Event | Trigger | Visual (normal) | Sound |
|---|---|---|---|---|
| MOT-3-R6 | Shield break | sim `shieldBroke` {x,y,family} | `burst` at x,y colour `shield`, count `shieldBreakBurst` (14), life 480 ms; `ringPulse` board ring at x,y colour `shield`, scale 1 to `ringScale` (2.2) in `ringMs` (320); `shake` of `juice.death.shakePx` x `shieldShakeFactor` (0.4) for `shieldShakeMs` (160); `tintEnd` (fade `skill.tintFadeMs`) because the shield is consumed; `iconPop` on the shield slot (colour `shield`, scale `skill.iconPopScale`). The slot is the one from the last `skillUsed` for shield, remembered by `JuicePlayer`. | `shieldBreak` (kept) |
| MOT-3-R7 | Skill unlocked | sim `skillUnlocked` {skill, slot} | If `slot !== null`: `iconPop` on that slot, colour = skill colour, scale `skill.iconPopScale` x `unlockPopFactor` (1.2), ms `skill.iconPopMs` + `unlockExtraMs` (140); plus `sparks` from the board centre to the energy bar (count `orb.sparkCount`, skill colour). If `slot === null`: sparks only. The unlock banner (`levelUp.unlocked`) stays as today; no second banner. | `unlock` (kept) |
| MOT-3-R8 | Run won | sim `runWon` {score,timeMs} | `levelGlow` alpha `level.glowAlpha`, ms `winGlowMs` (1200); gold `burst` of `winBurstCount` (24) at the snake head (`snakeHeadPoint`, `src/game/render/snake.ts`) plus `winCornerBurst` (6) at each board corner; `flash` colour `gold`, alpha `skill.flashAlpha`, ms `skill.flashMs`; `snakePop` `level.popMs`. Plays once and must finish before the run-over hold (`deathTimeline.totalMs` 1400): validator `winGlowMs <= juice.death.totalMs`. | `biome` (kept) |
| MOT-3-R9 | Hazard landed | sim `landed` {hazardType: TimedKey} | `landed` has no x,y. `GameScene` resolves the cells from the snapshot's timed hazard of that `hazardType` (`TimedHazard` in `src/core/types.ts`: `landed === true`, `cells[].on`) and passes a derived `JuiceInput` `{type:'landedAt', hazardType, cells}`. Row: `dust`-style `burst` per cell, `landDust` (4) each, colour `rock`, life `bursts.dust.lifeMs`, at most `landCellsMax` (4) cells per event. A short `shake` (`landShakePx` 2 px, `landShakeMs` 120) only for bomb-class hazards (a flag in `balance.hazards`, no hard-coded names). | `land` (kept) |
| MOT-3-R10 | Ramp ended | sim `rampEnded` {level} | "GO" cue: `flash` colour `food`, alpha `goFlashAlpha` (0.2), ms `goFlashMs` (260); `snakePop` `level.popMs`; `barBump` target `levelBar`, scale `barBump.scale`. | `go` (kept) |

## 4. Feedback GDD 10.4 does not list
| Id | Moment | Trigger and visual |
|---|---|---|
| MOT-3-R11 | Mango spawn pop | Trigger: `GameScene.mangoBornAt` set (on `ate` and `rotted`, `handleEvents`) or `snapshot.mango` going from null to set. Replace the 220 ms literal in `drawMango` with a pure `mangoGrow(timeMs, bornAt, ms, s)` in `src/game/motion/curves.ts` = `lerp(popFromScale, 1, backOut(t, motion.overshoot))` with `ms = motion.popInMs` (240), `popFromScale` 0.85. Plus one `burst` of `spawnPuffCount` (5), colour `food`, life 300 ms. A golden spawn skips the puff (R13 covers it). |
| MOT-3-R12 | Snake turn | Trigger: `GameScene.turn()` when `flowTurn` returned `forward` and (dx,dy) differs from the current head direction. The capy head (`src/game/art/capyHead.ts`, `capyPose.ts`) tilts `turnTiltDeg` (10) toward the new direction and returns in `turnMs` (140) with `backOut`; the first body segment behind the head scales by `turnBodyBulge` (1.06) over the same time, passed through the existing scale argument of `drawSnake` (same channel as `gulp`). Render offset only: the head cell does not move. Rapid turns restart from the current value (MOT-0-R4). |
| MOT-3-R13 | Golden mango sparkle | Trigger: `snapshot.mango.golden === true`. Every `sparkleEveryMs` (700) emit one 4-point star (two crossed thin rects drawn in `Effects.draw`, colour `gold`, radius `sparkleRadius` x cell = 0.2) at a point on the mango ring chosen by a render-only counter (never the sim RNG), life `sparkleLifeMs` (420), scale 0 to 1 to 0 with `sineInOut`. At most `sparkleMax` (3) alive, counted inside `maxParticles`. Cleared at once on eat or rot and by `Effects.reset`. |
| MOT-3-R14 | (moved) Quota fill pulse | Owned by MOT-4-R8 (single owner of the quota bar and HUD numbers, lead decision 2026-11-10). Not implemented in MOT-3. | | |

## 5. Plug-in points (no forks)
- `src/game/juice/types.ts`: `BoardVisual` gains `ringPulse {x,y,color,scale,ms}`, `sparkle {x,y,color,lifeMs}`, `turnTilt {dx,dy,deg,ms}`; `JuiceInput` gains `{type:'landedAt'; hazardType; cells}` and `{type:'turned'; dx; dy}`. `ScreenVisual` is unchanged (R7, R10, R14 reuse `sparks`, `iconPop`, `barBump`, `flash`).
- `juiceMap.ts`: the five sound-only `case` lines become full rows (sound lines kept so existing tests stay green); new rows for `landedAt`, `turned`; `dedupeBumps` sits next to `trimOldest`.
- `JuicePlayer.handleBatch`: structure unchanged (derived inputs enter through the same `handle()`); adds the per-batch bump dedupe and remembers the shield slot.
- `GameScene.playBoardFx`: three new cases delegating to `Effects`. `Effects`: `ringPulse()` (cap `ringMax` 4), `sparkle()` and star draw in `draw()`, `turnTilt` value decaying in `update(dt)` like `gulp`; `reset()` clears all.
- `render/mango.ts`, `render/snake.ts`: pop scale from `mangoGrow`; bulge scale folded into the existing `gulp` argument (no new draw path).

## 6. Reduced motion (MOT-3-R15)
Decided in `mapJuice` with `ctx.reduced`:
- R6: no burst, ring, shake or icon pop; keeps `tintEnd` and a `flash` at `juice.reduced.flashAlphaMax` for `juice.reduced.softMs`.
- R7: no sparks or pop; banner and sound only.
- R8: `levelGlow` at `flashAlphaMax` for `softMs`; no bursts, pop or flash.
- R9: no dust, no shake; sound only.
- R10: one `flash` at `flashAlphaMax` for `softMs`; no pop or bump.
- R11: no grow (`drawMango` already uses `grow = 1`), no puff. R12: no tilt, no bulge. R13: no sparkle (gold colour still distinguishes it). R14: moved to MOT-4-R8.
Sound and haptics follow the user settings only (P3a-R9), never `reduced`.

## 7. Performance and testing
- **Performance:** all new draws go into the existing `effects` Graphics (already cleared and redrawn each frame); the only new GameObjects are `ScreenFx` shapes destroyed in `onComplete`, at most one `flash` plus one ring per event. Worst case in one frame: shield 14 + win 48 + sparkle 3 + landing 16 particles, far below 300. No per-frame allocation: lists are compacted in place like `Effects.update`.
- **Unit (pure, Vitest):** `mapJuice` rows per event (visual kinds, counts from config, reduced variants, sound/haptics off), `dedupeBumps`, `mangoGrow` (0.85 at t = 0, peak > 1, exact 1 at t = 1), turn tilt decay endpoints, sparkle counter determinism, config validation (counts integers >= 0, `winGlowMs <= juice.death.totalMs`, per-event counts <= `perf` caps). Test names carry `MOT-3-Rn`.
- **Fake-scene tests** (`tests/support/scene.ts`): `Effects` caps for ring, sparkle and burst trim; `reset()` clears the new lists.
- **Browser eye-check:** shield break readable on a 5" phone, win length, turn tilt not distracting at fastest speed and under Slow-mo, sparkle visible on a golden mango in every biome palette, 60 fps on the P3a device checklist.

## 8. New config keys
No new `balance.motion` key is required (uses `popInMs`, `popFromScale`, `overshoot`, `pulsePeriodMs`, `pulseAmp`). Run-event numbers go in a new `balance.juice.events` sub-block (juice owns run events); the lead may move them when merging.
| Key | Value | Use |
|---|---|---|
| `shieldBreakBurst` | 14 | R6 particle count |
| `ringScale` / `ringMs` / `ringMax` | 2.2 / 320 / 4 | R6 ring scale, duration, live cap |
| `shieldShakeFactor` / `shieldShakeMs` | 0.4 / 160 | R6 shake |
| `unlockPopFactor` / `unlockExtraMs` | 1.2 / 140 | R7 icon pop |
| `winGlowMs` / `winBurstCount` / `winCornerBurst` | 1200 / 24 / 6 | R8 |
| `landDust` / `landCellsMax` | 4 / 4 | R9 |
| `landShakePx` / `landShakeMs` | 2 / 120 | R9 bomb-class shake |
| `goFlashAlpha` / `goFlashMs` | 0.2 / 260 | R10 |
| `spawnPuffCount` | 5 | R11 |
| `turnTiltDeg` / `turnMs` / `turnBodyBulge` | 10 / 140 / 1.06 | R12 |
| `sparkleEveryMs` / `sparkleLifeMs` / `sparkleRadius` / `sparkleMax` | 700 / 420 / 0.2 / 3 | R13 |

## 9. Files a plan would touch
`config/balance.json` (+ validator and types in `src/core`), `src/game/juice/types.ts`, `juiceMap.ts`, `JuicePlayer.ts`, `src/game/render/effects.ts`, `mango.ts`, `snake.ts`, `src/game/art/capyHead.ts`, `src/game/scenes/GameScene.ts` (`turn`, `handleEvents`, `playBoardFx`), `src/game/scenes/HudScene.ts`, `src/game/hud/HudTop.ts`, `src/game/motion/curves.ts` (`mangoGrow`), tests under `tests/`, `docs/GDD.md` 10.4 (new rows), `docs/CODEMAP.md`.

## 10. Out of scope
New sounds, haptic changes, new art assets, hazard telegraph pulses and HUD number animation (MOT-4), menu motion (MOT-1/2), marble machine (P4), changes to sim rules or event payloads (`landed` stays without coordinates; cells are derived).

## 11. Exit criteria
Every event in sections 3 and 4 has a `mapJuice` row with a reduced variant and a test; no new colour id; particle, float and spark caps hold in the fake-scene tests; GDD 10.4 updated; owner eye-check passes on a phone; no per-frame allocation added.
