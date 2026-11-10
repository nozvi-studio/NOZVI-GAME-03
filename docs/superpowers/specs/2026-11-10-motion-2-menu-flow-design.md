# MOT-2 Menu flow (entrances, scene transitions, Results sequence)

**Status:** Draft for owner review. **Date:** 2026-11-10. **Branch:** docs/motion-2 (from docs/motion-specs). **Depends on:** MOT-0 (`src/game/motion`, `balance.motion`, rules MOT-0-R1..R7).

## 1. Problem
Every menu change is a hard cut: `scene.start` is called directly in `BootScene.create`, `HomeScene.play` and the gear button, `LoadoutScene.back`, `SettingsScene.back`, `ui.ts beginRun`, and `HudScene.leave/toResults`. Screens appear fully built, Results shows its score at once, Home is static. This spec adds a transition style, staggered entrances, Home idle life and a Results sequence, using only the MOT-0 API.

## 2. Requirements
- **MOT-2-R1 Transition helper.** One function `goTo(scene, key, data?, kind)` in `src/game/motion/transition.ts` (built on MOT-0 `fadeOut` and `play()`; `kind` is `forward | back | start | quit`). It fades the camera out, then calls `scene.scene.start(key, data)`; the next scene's `create()` ends by running its entrance. No scene calls `scene.start` for a menu change outside `goTo` (grep-testable).
- **MOT-2-R2 Style.** Exit = camera fade-out of `motion.fadeMs` (180) to the cream bg colour (`bgCream`); entry = fade-in of `fadeMs` overlapping the entrance stagger. Slide direction of the target screen's content: `forward` (Home to Loadout, Home to Settings) slides in from the right (`slideIn` from x +`slidePx`); `back` (Loadout or Settings to Home) from the left (x -`slidePx`); `start` (to Game) no slide, fade only; `quit` and run over (Game to Results) slide up from below (y +`slidePx`). Total scene change <= `fadeMs` out + `fadeMs` in = 360 ms.
- **MOT-2-R3 Input lock.** `goTo` sets `scene.input.enabled = false` on the leaving scene at call time (the scene shuts down after). The incoming scene is interactive from its first frame: entrance motions never block taps (MOT-0-R5; hit areas are final from frame 0). The lock lasts only the exit fade (<= 180 ms), plus `tapUpMs` when called from a confirming tap (MOT-0-R2). A second `goTo` while one is pending is dropped (flag reset in `create`), so double taps never double start (same idea as `SettingsScene.closing`).
- **MOT-2-R4 Overlay exceptions.** Settings opened as an overlay from the run (`entry.overlay`, `HudScene onSettings`) and closed by `scene.stop()` use no camera fade; the veil rect uses `fadeIn/fadeOut` of `fadeMs` only. Pause/resume flow in GameScene is unchanged.
- **MOT-2-R5 Stagger helper.** `enter(scene, items, from)` runs `popIn`/`slideIn` over an ordered list with `staggerDelay(index, staggerMs, staggerCapMs)` (50 ms step, 300 ms cap). Items are existing top-level objects or containers of a scene (section 3). Order lists live in `src/game/flow/entranceOrder.ts` (no Phaser imports) so they are unit-testable.
- **MOT-2-R6 Rebuild safety.** `HomeScene.build()` runs again on stepper taps (`step()`), so the entrance plays only on the first build (`created` flag). Later rebuilds appear instantly, except the hero start-at chip, which gets one `popIn` (index 0) to confirm the new value. `SettingsScene.build()` after `change()` plays no entrance.
- **MOT-2-R7 Boot to Home handoff.** `BootScene.create` currently calls `scene.start(next)` after `waitForFonts`. Replace with: show the 100% frame (`setProgress(1)`), hold at most `fadeMs` (no extra wait when fonts were slow), then `goTo(scene, next, undefined, 'forward')` as a fade only (Boot has no spatial relation to Home). The Boot hero is not reused: Home rebuilds logo, hero and capy. `next` stays `ArtPreview` when `isArtPreview(search)`; that path gets the same fade and no entrance.
- **MOT-2-R8 Home idle life.** After the entrance, the hero capy (`HomeScene.heroPanel`, image `capyHeadKey('idle','large')`) breathes: `pulse` with period `2 * pulsePeriodMs` (1800) and amplitude `idleBreathAmp` (0.02) on scaleY, scaleX the inverse (volume-preserving squash). The Play pill gets the attention pulse (`pulse`, `pulsePeriodMs`, `pulseAmp`) starting `idleStartMs` (1200) after the entrance ends; any pointerdown or hover on Play, or any stepper tap, stops it for `idlePauseMs` (4000), then it resumes. Both stop on scene shutdown. No Remotion clip now (the idle art is one image); a clip could later replace the breath without changing this API.
- **MOT-2-R9 Results sequence.** Plays once in `ResultsScene.create` after the fade-in, total <= `resultsSeqMs` (1500). Times in ms from sequence start: title pops (0); capy head drops in with `backOut` (80); card pops (120); score `countUp(text, 0, v.score)` of `countUpMs` (900) starts at 200; the three stat tiles pop, stagger 50 ms, from 400; best chip: when `v.bestChip.key === 'results.newBest'` it pops with `overshoot` at count-up end and its star does one `pulse` of 2 periods, otherwise it fades in at 600; energy row, checkpoint banner and progress block slide up with stagger from 700; the footer (Home round button, then Play again pill after `staggerMs`) pops last, ending exactly at `resultsSeqMs`. The marbles row stays hidden (P4, D8); the order list reserves a `'marbles'` slot (skipped when absent) so P4 adds it without re-sequencing.
- **MOT-2-R10 Results skip and correctness.** The score text shows the final integer at t = 1 always (`countUpValue` exact) and from the first frame under reduced motion. A tap anywhere on Results during the sequence completes it: all items jump to rest transform and the score shows its final value; Home and Play again taps still act at once. The footer is interactive from frame 0.
- **MOT-2-R11 Run start.** `beginRun` (`src/game/scenes/ui.ts`) keeps the order `session.startRun`, `scene.start('Game')`, `launch('Hud')`, wrapped in `goTo(..., 'start')`. Game opens on the existing P0 countdown, so no extra intro; the board camera fades in over `fadeMs`, and `HudScene` fades its layer in with `fadeIn` so the HUD does not appear before the board.
- **MOT-2-R12 Run end.** `HudScene.leave()` and `toResults(delayMs)` call `goTo(this, 'Results', undefined, 'quit')`. The delay for death or win (`juice.runOver` total) is neither shortened nor lengthened; Quit (`onQuit`) uses delay 0 with the same `goTo`. `scene.stop('Game')` still runs first; the fade is carried by the Hud scene camera.
- **MOT-2-R13 Deep links and debug.** `?debug=1&level=N` (`debugStartLevel`), `?debug=1&artPreview=1` (`isArtPreview`) and the `setupDebug` buttons keep working: entrances never change object names, rest positions or hit areas, and `goTo` forwards the same `data` payloads (`{ level, debug }`, `{ returnTo }`). A new debug-only flag `?debug=1&motion=off` (read in `debugFlag.ts`, same style as `isArtPreview`) makes every MOT-2 motion jump to the rest state, so Playwright/QA frames stay deterministic. Names used by tests and QA (`home-settings`, `settings-back`, `results-score`, `results-headline`, `results-best`, `results-banner`, `home-export`) are unchanged.

## 3. Entrance order per screen
| Screen (scene) | Order (index 0 first) | Motion |
|---|---|---|
| Boot | logo lines, hero disc block, progress bar, text (existing `buildView`, drawn during preload) | none while loading; fade only (R7) |
| Home | gear (`roundIconButton`), logo line 1, logo line 2, hero panel (`heroPanel`), stepper, Play pill, chips (`extras`), hint; hill static | gear `popIn`; logo `slideIn` from top; hero `popIn`; stepper, Play, chips, hint `slideIn` from below (`slidePx`) |
| Loadout | back button, title (`loadout-title`), two slot cards, candidate cards in list order, bottom action | back `popIn`; title fade; slots `popIn`; cards `slideIn` per direction rule; action `popIn` last |
| Settings (full) | back button, title (`head`), setting rows in order, theme card, autosave caption | back `popIn`; title fade; rows `slideIn`; caption fade. Overlay variant: veil fade only (R4) |
| Results | see R9 | see R9 |
Stagger never exceeds `staggerCapMs` (300 ms): in a long Loadout list every card past index 6 enters at the cap.

## 4. New balance.motion keys (for the lead to merge into MOT-0)
| Key | Value | Use |
|---|---|---|
| `idleBreathAmp` | 0.02 | Home capy breathing amplitude |
| `idleStartMs` | 1200 | delay before the Play pill pulse starts |
| `idlePauseMs` | 4000 | pulse pause after any interaction |
| `resultsSeqMs` | 1500 | total Results sequence length (footer ends at it) |
Validator additions: all finite and > 0; `idleBreathAmp` < `pulseAmp`; `resultsSeqMs` >= 200 + `countUpMs` + `popInMs`.

## 5. Reduced motion
Per MOT-0-R6: every `goTo` becomes one fade of `juice.reduced.softMs` (400 ms, out then in, no slide); entrances are a single fade with no stagger (all items together); no breathing, no attention pulse; count-up jumps to the final score; the best chip shows its end state. The input lock is still only the fade-out.

## 6. Performance notes
Entrance targets are existing top-level containers (`scaledBlock` children), never per-glyph objects: at most about 14 tweens on Home and 10 on Results (inside `maxTweens` 40). Long-lived tweens are only the two Home idle loops, stopped on `shutdown` and on `goTo` (MOT-0-R4/R7). The camera fade needs no extra full-screen Graphics. `HomeScene.build()` still destroys and recreates `body` on `step()`; kill-by-target in `play()` ensures no tween outlives its object.

## 7. Testing
Pure/unit (Vitest, names carry `MOT-2-Rn`): `entranceOrder` lists per screen (R5); `resultsTimeline(hasBest, hasEnergy, hasBanner)` returning `[{ item, atMs }]` with the footer last and its end == `resultsSeqMs` (R9); `staggerDelay` cap for a 12-card Loadout (R5); `goTo` with the fake scene: pending guard, input disabled on call, reduced fade length, data forwarded (R1, R3, R13); `?motion=off` parsing (R13); new-key validation. Adapter tests with the MOT-0 recording `tweens` fake: rest transform after the sequence, skip-on-tap shows the final score (R10), idle tweens stopped on shutdown (R8). Browser eye-check only: slide direction and timing feel, Home breathing calm not jittery, count-up pacing, no wrong-colour flash during fades, 60 fps on a phone, Settings overlay from a run, deep links `?debug=1&level=N` and `artPreview=1`.

## 8. Files a plan would touch
New: `src/game/motion/transition.ts`, `src/game/flow/entranceOrder.ts` (with the results timeline), `tests/game/transition.test.ts`, `tests/game/entranceOrder.test.ts`. Edit: `src/game/scenes/BootScene.ts` (`create`), `HomeScene.ts` (`create`, `play`, `build`, `heroPanel`), `LoadoutScene.ts` (`create`, `back`), `SettingsScene.ts` (`create`, `back`), `ResultsScene.ts` (`create`, `summaryBlock`, `summaryCard`, `bestChip`, `footer`), `HudScene.ts` (`leave`, `toResults`), `ui.ts` (`beginRun`), `src/game/flow/debugFlag.ts`, `config/balance.json` and its validator (via MOT-0), `docs/CODEMAP.md`, `docs/README.md`, `CHANGELOG.md`.

## 9. Out of scope
Widget press/hover feedback (MOT-1), in-run events (MOT-3), HUD numbers and hazard telegraphs (MOT-4), the marble machine row and animation (P4), new art or Remotion clips, sound changes, GameScene countdown and pause behaviour, dark theme.

## 10. Exit criteria
No direct `scene.start` for menu navigation outside `goTo`; every screen enters per section 3 with a scene change <= 360 ms; Results sequence <= 1500 ms and skippable; Home idle tweens stop on shutdown; `?debug=1&level=N`, `artPreview=1` and `motion=off` verified; the tests above pass with `npm test` and `npm run typecheck`; the browser eye-check is recorded in `docs/PLAYTEST.md`.

## 11. Suspected cross-spec conflicts
MOT-1 owns `pressDown/release`: MOT-0-R2 already delays navigation until the release finishes, so `goTo` must be called from the action callback with no second delay. MOT-3 may add run-end visuals in `HudScene`; the run-end timing in R12 must stay as is. MOT-4 HUD number motions must not start in the frame the Hud fades in (R11).
