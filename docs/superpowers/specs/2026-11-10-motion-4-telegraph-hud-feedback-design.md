# MOT-4 Hazard telegraphs and HUD numbers

**Status:** Draft for owner review. **Date:** 2026-11-10. **Branch:** docs/motion-4 (from docs/motion-specs). **Depends on:** MOT-0 (`src/game/motion/curves.ts`, `motion.ts`, `balance.motion`). Style: bouncy cartoon.

## 1. Problem
Warn states already blink (`blinkOn` in `src/game/render/movers.ts`, fixed `WARN_BLINK_MS` = 250) or pulse on wall-clock time (`drawWarn` in `src/game/render/hazards.ts`, `Math.sin(ms * (0.006 + 0.014 * progress))`). Rhythms differ per family, the blink never tightens toward the hit (except `drawWarn`), and nothing is derived from one shared rule. HUD numbers (`src/game/hud/HudTop.ts`, `SkillButtons.ts`) change instantly: no score tick, quota bar fill, energy bar easing or ready cue; only `HudTop.bump` (P3a, yoyo scale) exists.

## 2. Requirements
Warn-time truth lives in the snapshot (`CoconutView.t/warnMs`, hazard `t/warnMs`, bomb/shrink `leftMs`, terrain warn); config minimums in `balance.fairness.minWarnMs` (900). Motion only reads snapshot values; it never changes the sim, a warn duration or a hit time.

**Telegraphs**
- **MOT-4-R1 Pulse phase from remaining time (pure).** `telegraphPulse(remainingMs, warnMs)` in new `src/game/render/telegraph.ts` returns `{ phase, hz, alpha, scale }`. `progress = 1 - remainingMs / warnMs` (clamped 0..1); `hz = lerp(motion.telegraphHzStart, motion.telegraphHzEnd, cubicOut(progress))`; `phase` is a closed-form function of elapsed warn time `warnMs - remainingMs` and progress (monotone, no wall clock, no accumulated state). Same snapshot in = same output, so it is replay-safe and test-friendly.
- **MOT-4-R2 Tightens, never hides.** Rhythm goes from `telegraphHzStart` (2.0) to `telegraphHzEnd` (6.0) at the hit. The pulse only modulates alpha between `telegraphAlphaMin` (0.55) and 1, and scale by `telegraphScaleAmp` (0.05). The warn symbol (ring, dashes, "!" or chevron, lane arrows) is visible at every phase, so the hazard is readable at the dimmest point (extends P3b1-R5: shape never depends on colour or blink alone).
- **MOT-4-R3 Not shorter than fairness.** The warn is drawn for the full `warnMs`, gated on the snapshot state and not on the pulse phase. A unit test asserts every family's configured warn is >= `fairness.minWarnMs` (900) where the family is covered by MEC-004 fairness, and that the pulse layer never skips a frame of the warn.
- **MOT-4-R4 Per-family mapping** (table below). Each family calls `telegraphPulse` with its own remaining/warn pair and feeds the result to its existing draw function; `blinkOn` stays only as the static reduced-motion fallback (always on).
- **MOT-4-R5 Hit beat.** On warn to live (rock lands, spike up, gate closes, bomb lands, ring closes) one scale snap `1 -> motion.telegraphSnapScale (1.12) -> 1` over `motion.telegraphSnapMs` (120) plays on that hazard's layer, triggered by the snapshot state edge (where `GameScene` already diffs snapshots for juice) through `motion.play()` with kill-by-target (MOT-0-R4).
- **MOT-4-R6 Late-warn urgency.** For the last `motion.telegraphUrgentMs` (300) the warn tint steps to the existing hard colour (`PART.warn.dash`, `RING.warn`) at full alpha. No new palette.

| Family | Draw fn | remaining / warn source | Pulse target |
|---|---|---|---|
| Rock warn, rise tile | `drawWarn` / `drawTerrains` (hazards.ts) | `h.warnMs` and `h.t` (task 1 confirms the direction of `t`; helper takes `remainingMs`); terrain uses `b.terrain.warnMs` | fill alpha, dash alpha, "!" scale |
| Fence | `drawFence` (hazards.ts) | same as rock | rail alpha |
| Maze | rock warn path (`drawHazards`) | same | wall cell alpha |
| Ground tiles mud/ice | `drawTiles` (tiles.ts, own `WARN_BLINK_MS`) | tile warn `t/warnMs` | tile alpha, icon scale |
| Coconut lane MEC-013 | `drawLane` (movers.ts) | `CoconutView.warnMs`, `t` | lane fill alpha, arrow scale |
| Gate / spike MEC-014 | `drawGates`, `drawSpikes` (cycles.ts) | cycle entry `t/warnMs` | bar alpha, triangle scale (down dots remain the dim phase) |
| Bomb warn MEC-017 | `drawBlasts` warn branch (blasts.ts) | `b.t`, `b.warnMs` | disc alpha and radius |
| Bomb count MEC-017 | `drawBlasts` landed branch, `bombDigit` | `b.leftMs` against `bomb.countdownMs` (3000) | digit pops (1.2 to 1 over `motion.digitPopMs`) on each digit change; area outline uses R1 |
| Shrinking ring MEC-018 | `drawShrink` (shrink.ts) | ring state and `leftMs` against `shrink.warnMs` (2000) / `closedMs` | warn: outline alpha and corner arrows; closed: steady wall; fade: outline at fixed `telegraphHzStart` |

**HUD numbers**
- **MOT-4-R7 Score tick-up.** When `v.score` rises, `HudTop` shows `countUpValue(from, to, t)` over `motion.hudTickMs` (360) via `motion.countUp`; a new score mid-tick retargets from the shown value (kill-by-target). The P3a `bump` stays. `hudView().score` remains the true value (tests read the model, not the animated text).
- **MOT-4-R8 Quota fill and pulse.** The quota pill (`done`/`total`, `HudTop.drawRow`) gains a fill bar of width `progress/need`, eased over `motion.barEaseMs` (220) with `cubicOut`; on a `progress` change the pill pops to `releaseOvershoot` over `tapUpMs`. When `progress == need - 1` the bar runs `motion.pulse` (`pulseAmp`) until level-up. The max-level label has no bar.
- **MOT-4-R9 Energy bar easing.** `v.energy.fill` (0..1) animates the drawn fill toward the target over `motion.barEaseMs`; spends ease in `motion.barSpendMs` (160). Redraw only while easing or on target change (extends the `this.fill` guard in `HudTop.update`).
- **MOT-4-R10 Low / full cues.** Fill <= `motion.energyLowFrac` (0.2): bar tint steps to the warn hue and the bolt runs `motion.pulse`. Fill reaches 1: one bolt `popIn` (`popInMs`), then static. Both are additive to the number and never the only cue.
- **MOT-4-R11 Skill ready pop.** In `SkillButtons.draw`, a `state` change off to ready plays one pop (`1 -> releaseOvershoot -> 1`, `tapUpMs`) on the slot container and keeps the existing `M.glow` stroke. Ready to off plays an 80 ms alpha dip, no scale. While `active`, the countdown ring (`k.ring`) already follows `leftMs` and is not eased. Gauge steps stay quantised (`M.chargeSteps`, `chargeSegment` in `gaugeGeometry.ts`, pure function unchanged); the caller interpolates `charge` over `barEaseMs` between steps.
- **MOT-4-R12 Level title change.** When `v.levelTitle` changes (`HudTop.apply`), the title does `slideIn` from `slidePx` below with fade over `slideInMs`; the biome line is staggered by `staggerMs`. The first paint of a run does not animate.
- **MOT-4-R13 Chip row transitions.** The chip (ramp, checkpoint, wait) fades and slides in (`fadeMs`, `slidePx`) when it appears and fades out when it clears; a kind change cross-fades over `fadeMs`. `plantFlag` keeps its Back pop but moves onto `motion.popIn`.

## 3. New `balance.motion` keys
| Key | Value | Use |
|---|---|---|
| `telegraphHzStart` | 2.0 | pulse rate at warn start (Hz) |
| `telegraphHzEnd` | 6.0 | pulse rate at the hit (Hz) |
| `telegraphAlphaMin` | 0.55 | dimmest pulse alpha (symbol never below this) |
| `telegraphScaleAmp` | 0.05 | pulse scale amplitude on symbols |
| `telegraphUrgentMs` | 300 | final hard-colour window before the hit |
| `telegraphSnapScale` | 1.12 | hit-beat peak scale |
| `telegraphSnapMs` | 120 | hit-beat duration |
| `digitPopMs` | 160 | bomb digit change pop |
| `hudTickMs` | 360 | score tick-up length |
| `barEaseMs` | 220 | quota, energy and charge fill ease |
| `barSpendMs` | 160 | energy spend ease |
| `energyLowFrac` | 0.2 | low-energy cue threshold |
Validator additions: `telegraphHzEnd > telegraphHzStart > 0`; `0 < telegraphAlphaMin < 1`; `telegraphSnapScale` in (1, 2); the rest finite and > 0.

## 4. Reduced motion
`reduceMotion()` true: pulses are static at full alpha (existing `reduced` branches keep a solid outline instead of a blink); no hit-beat snap, no digit pop (digit changes instantly). The late-warn hard-colour step at `telegraphUrgentMs` still applies (a colour change, not motion). HUD: score, quota and energy jump to value; bars redraw at the target without easing; pops, slides and bolt pulses are skipped; chip and title change with one `juice.reduced.softMs` fade (MOT-0-R6). The ready state keeps its static glow.

## 5. Performance notes
Hazards already redraw on shared `Graphics` each frame; the pulse adds arithmetic only. `telegraphPulse` is allocation-free (scalars or one reused result object) and runs once per warning hazard (a few dozen at most: family `maxActive` caps plus ring cells). Hit-beat, digit pop, pops and bar easing go through `motion.play()` (no ad-hoc `scene.tweens.add`) and obey `maxTweens`. The `HudTop`/`SkillButtons` redraw guards (key string, `this.fill`) stay, so Graphics redraw only while a bar eases or a value changes. Tweens are cancelled on scene shutdown.

## 6. Testing
Pure, Vitest (`MOT-4-Rn` in names): `telegraphPulse` (endpoints at progress 0 and 1, hz monotone from start to end, deterministic, same result for repeated and reordered inputs, alpha >= `telegraphAlphaMin`); fairness test reading warn values from `balance.json` per family; digit change via `bombDigit`; pure HUD display helpers in `hudMotion.ts` (`displayScore(from, to, t)`, bar easing step, `skillReadyEdge(prev, next)`, `levelTitleChanged`); `balance.motion` validator; reduced-motion branches via the recording fake scene from MOT-0. Browser eye-check (not unit-testable): the pulse reads as tightening, the symbol is readable at the dimmest frame, the hit-beat lines up with the sim hit, score/bar/ready-pop feel on a real touch device, no frame drops with maze + bomb + ring active together.

## 7. Files a plan would touch
New: `src/game/render/telegraph.ts`, `src/game/hud/hudMotion.ts`, `tests/telegraph.test.ts`, `tests/hudMotion.test.ts`. Edit: `src/game/render/hazards.ts`, `tiles.ts`, `movers.ts`, `cycles.ts`, `blasts.ts`, `shrink.ts`; `src/game/hud/HudTop.ts`, `SkillButtons.ts`; `src/game/scenes/GameScene.ts` (hit-beat edge, remaining time); `config/balance.json` and its validator (new keys inside the MOT-0 `motion` block); `docs/CODEMAP.md`. MEC-004/013/014/017/018 section 8 get a one-line pointer to MOT-4 (no rule change).

## 8. Out of scope
Sim, warn lengths, fairness rules, hazard art, sound, hit particles (P3a), shield/skill-unlock banners and run-won (MOT-3), buttons and menu motion (MOT-1/2), Results count-up (MOT-2), dark theme.

## 9. Exit criteria
`telegraphPulse` and HUD helpers merged with tests; all nine telegraph families use it; score, quota, energy, skill ready, title and chip transitions run through the MOT-0 API; reduced motion verified; no warn shorter than before (fairness test green); 60 fps eye-check on a mid-range phone.
