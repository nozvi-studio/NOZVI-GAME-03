# MOT-0 Motion foundation (visual feedback system)

**Status:** Draft for owner review. **Date:** 2026-11-10. **Branch:** docs/motion-specs (from version/v0.3). **Phase:** P3 follow-up (visual feedback across the whole game).
**Owner decisions (2026-11-10):** style = bouncy cartoon (A); scope = menu layer + in-run gaps; light mode only (dark theme parked); lead splits the work into several specs that run in parallel.

## 1. Problem
Menu scenes (Boot, Home, Loadout, Results, Settings) have no tweens: no entrance, no hover/press/release feedback (only the pill button dips on press), hard cuts between scenes. In-run juice exists (P3a, HUD) but several events are sound-only. The game feels static.

## 2. Spec family
| ID | Spec | Depends on |
|---|---|---|
| MOT-0 | This document: shared tokens, curves, adapter, rules | none |
| MOT-1 | Widget feedback (buttons, cards, toggles, sliders) | MOT-0 |
| MOT-2 | Menu flow (entrances, scene transitions, Results count-up) | MOT-0 |
| MOT-3 | In-run event gaps (shield break, skill unlock, run won, mango land/spawn, turn) | MOT-0 |
| MOT-4 | Hazard telegraphs and HUD numbers (rock/bomb/shrink pulses, score/quota/energy) | MOT-0 |
MOT-1..4 are independent of each other and are planned and built in parallel after MOT-0 lands.

## 3. Feedback grammar (applies to every spec)
- **MOT-0-R1 Four states.** Every interactive element has idle, hover (fine pointer only, never on touch), pressed and released. Pressed is a quick dip (scale down, shelf drops); released overshoots slightly and settles. A rejected action shakes (existing `rejectShake` style) and never confirms.
- **MOT-0-R2 Confirm beats navigate.** On a confirming tap the pressed-to-released animation finishes (<= `motion.tapUpMs`) before the scene change starts; the action callback fires on release as today (no change to hit rules).
- **MOT-0-R3 Entrance.** Anything that appears pops or slides in once (never loops), staggered by index.
- **MOT-0-R4 One owner per target.** Starting a motion on a target kills the previous motion on that target (no stacked tweens, no end-state drift); every motion ends at the exact rest transform.
- **MOT-0-R5 Short.** Single motions <= 300 ms except count-up (<= `motion.countUpMs`) and looping attention pulses; nothing blocks input longer than `motion.tapUpMs`.

## 4. Config: `balance.motion` (new block, no magic numbers elsewhere)
All values are starting points; tune by feel.
| Key | Value | Use |
|---|---|---|
| `tapDownMs` | 80 | press dip |
| `tapUpMs` | 180 | release overshoot and settle |
| `pressScale` | 0.94 | scale while pressed (cards and round buttons) |
| `releaseOvershoot` | 1.06 | peak scale on release |
| `hoverScale` | 1.03 | fine-pointer hover |
| `popInMs` | 240 | entrance pop |
| `popFromScale` | 0.85 | entrance start scale |
| `slideInMs` | 260 | entrance slide |
| `slidePx` | 28 | entrance slide distance (mockup px) |
| `fadeMs` | 180 | cross fades and scene fades |
| `staggerMs` | 50 | per-index delay |
| `staggerCapMs` | 300 | max total stagger delay |
| `countUpMs` | 900 | number count-up |
| `pulsePeriodMs` | 900 | attention pulse period |
| `pulseAmp` | 0.04 | attention pulse scale amplitude |
| `overshoot` | 1.7 | Back-ease overshoot `s` |
| `maxTweens` | 40 | concurrent tween budget |
| `toggleSlideMs` | 160 | MOT-1 switch knob slide and track colour lerp |
| `disabledAlpha` | 0.45 | MOT-1 disabled widget alpha |
| `idleBreathAmp` | 0.02 | MOT-2 Home capy breathing amplitude |
| `idleStartMs` | 1200 | MOT-2 delay before the Play pill pulse starts |
| `idlePauseMs` | 4000 | MOT-2 pulse pause after any interaction |
| `resultsSeqMs` | 1500 | MOT-2 total Results sequence length |
| `telegraphHzStart` / `telegraphHzEnd` | 2.0 / 6.0 | MOT-4 warn pulse rate at warn start / at hit time |
| `telegraphAlphaMin` | 0.55 | MOT-4 pulse alpha floor |
| `telegraphScaleAmp` | 0.05 | MOT-4 pulse scale amplitude |
| `telegraphUrgentMs` | 300 | MOT-4 final urgent window |
| `telegraphSnapScale` / `telegraphSnapMs` | 1.12 / 120 | MOT-4 hit-beat snap |
| `digitPopMs` | 160 | MOT-4 digit pop |
| `hudTickMs` | 360 | MOT-4 score tick-up |
| `barEaseMs` / `barSpendMs` | 220 / 160 | MOT-4 bar fill ease / spend |
| `energyLowFrac` | 0.2 | MOT-4 low-energy cue threshold |
| `reducedPressAlpha` | 0.85 | MOT-0-R6 flat alpha dip on press in reduced motion |
Validator: every value finite and > 0; scales in (0, 2); `releaseOvershoot` > 1 > `pressScale`; `staggerCapMs` >= `staggerMs`; `telegraphHzEnd` > `telegraphHzStart`; `0 < telegraphAlphaMin < 1`; `disabledAlpha` < 1; `idleBreathAmp` < `pulseAmp`; `resultsSeqMs` >= 200 + `countUpMs` + `popInMs`. MOT-3 run-event numbers live in a separate `balance.juice.events` block (see MOT-3), not here. Reduced motion reuses `juice.reduced.softMs` (400) as the single fade length.

## 5. Modules
- **`src/game/motion/curves.ts` (pure, no Phaser).** `backOut(t, s)`, `cubicOut(t)`, `sineInOut(t)`, `lerp`, `staggerDelay(index, stepMs, capMs)`, `countUpValue(from, to, t)` (integer, monotone, exact at t = 1), `pulseScale(timeMs, periodMs, amp)` (1 +/- amp, period exact). Unit-tested, deterministic.
- **`src/game/motion/motion.ts` (Phaser adapter).** `pressDown(scene, target)`, `release(scene, target)`, `hover(scene, target, on)`, `popIn(scene, target, index?)`, `slideIn(scene, target, from, index?)`, `fadeIn/fadeOut`, `shake(scene, target)`, `pulse(scene, target)` returning `stop()`, `countUp(scene, text, from, to, fmt?)`. Every call goes through one `play()` that: applies MOT-0-R4 (kill by target), the tween budget (drops the lowest-priority motion when `maxTweens` is reached; looping pulses first), and the reduced-motion rule (section 6).
- MOT-2 adds `src/game/motion/transition.ts` (not in MOT-0): `goTo(scene, key, data)` scene transition and `enter(scene, targets, kind)` stagger helper, built on `play()`. `curves.ts` also gets `mangoGrow` (MOT-3) and the MOT-4 `telegraphPulse(remainingMs, warnMs)` helper.
- **`src/game/motion/index.ts`** re-exports; CODEMAP row; JuicePlayer/ScreenFx keep their own code (no rewrite) and may adopt `curves.ts` later.

## 6. Reduced motion and performance
- **MOT-0-R6 Reduced motion** (`reduceMotion()`): no scale, overshoot, slide or shake; entrances and transitions become a single fade of `juice.reduced.softMs`; hover has no effect; pressed shows a flat alpha dip (no geometry change); looping pulses are static; count-up jumps to the final value.
- **MOT-0-R7 Performance.** 60 fps target on a mid-range phone: no per-frame allocation in tweens (reuse tween configs), Graphics are redrawn only on state change (as `SkillButtons` does), no scene keeps a tween running while hidden, and motions are cancelled on scene shutdown. Hover is bound only when the pointer is fine (`!scene.sys.game.device.input.touch`).

## 7. Testing
Pure curves and `staggerDelay`/`countUpValue`/`pulseScale` unit tests (endpoints, monotone, determinism). Adapter tests with the fake scene in `tests/support/scene.ts` extended with a recording `tweens` fake: kill-by-target, budget cap, reduced-motion output, rest transform after completion. `balance.motion` validation test. Test names carry `MOT-0-Rn`.

## 8. Build order and ownership (lead, 2026-11-10)
1. **MOT-0 first** (curves, adapter, `balance.motion`, `goTo`/`enter`). Everything else waits for it.
2. Then MOT-1, MOT-3 and MOT-4 in parallel (disjoint files). **MOT-2 runs after MOT-1**: both edit HomeScene, ResultsScene, LoadoutScene. MOT-1 defers scene-changing actions by `tapUpMs`; MOT-2 `goTo` starts right after that delay and must not add a second delay.
3. Ownership: the quota bar, score, energy bar, skill ready/off pop and HUD chip transitions belong to MOT-4 only. MOT-3 owns board/screen event visuals only. MOT-1 owns the Pause button press; nobody else touches `SkillButtons` press behavior.
4. A debug flag `?debug=1&motion=off` (MOT-2) freezes motion for deterministic QA frames.

## 9. Out of scope
Sound changes, new art, dark theme, rewriting P3a juice, haptics, marble machine (P4).

## 10. Exit criteria
Curves and adapter merged with tests; `balance.motion` validated; MOT-1..4 build only on this API (no ad-hoc `scene.tweens.add` in new code).
