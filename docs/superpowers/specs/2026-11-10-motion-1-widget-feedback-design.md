# MOT-1 Widget feedback (buttons, cards, toggles, tiles)

**Status:** Draft for owner review. **Date:** 2026-11-10. **Branch:** docs/motion-1 (from docs/motion-specs). **Depends on:** MOT-0 (`src/game/motion`, `balance.motion`).

## 1. Problem
Interactive widgets give uneven feedback today (all under `src/game/`):
- `pillButton` (`ui/widgets.ts`) dips the face and label by `geom.pressedDy` (3 mock px) on press and snaps back; no overshoot, no hover.
- `roundIconButton` (`ui/menuWidgets.ts`) builds a visual container plus a separate `tap()` zone (`hitSize`, UIFIX-R7); the visual never reacts to the press.
- Loadout cards and slots (`LoadoutScene.ts`, `tap(...)` at `loadout-card-*`, `loadout-slot*`), Home's `home-l1` link, Settings rows and theme tiles (`SettingsScene.ts`, `tap(...)`) react only after the action, when `render()` / `build()` destroys and rebuilds the whole block.
- `button()` (`scenes/ui.ts`, greybox) and `HudTop.pauseButton` each hard-code a press scale (`.96`, `M.pressScale`) through `bindPress`.
- Settings switches repaint the knob at the new side instantly. There are no slider widgets (`sliders` is only an icon id on the Home gear).
- A rejected action in a menu has no feedback (`SkillButtons.rejectShake` is HUD-only).

## 2. Requirements
- **MOT-1-R1 One wrapper.** A single `attachFeedback(scene, visual, kind, opts)` in new `src/game/ui/feedback.ts` owns every widget state. It calls only the MOT-0 adapter (`pressDown`, `release`, `hover`, `shake`) and never `scene.tweens.add`. Widget factories call it; scenes never attach feedback themselves.
- **MOT-1-R2 Hit rules unchanged.** `bindPress` semantics (action fires on pointerup only if pointerdown began on the target; `stop` flag), `pillHitRect` (hit rect extends over the shelf), `hitSize` / `MIN_HIT_CSS = 48` and every zone size stay identical. The wrapper adds listeners to the same objects (plus `pointerover` for hover). The animated object is a visual; the hit object is never scaled, so the hit area never changes during an animation.
- **MOT-1-R3 States per kind** (table 3). Pressed uses `motion.tapDownMs` and `motion.pressScale`; released uses `motion.tapUpMs`, peak `motion.releaseOvershoot`, and ends at the exact rest scale (MOT-0-R4). Hover uses `motion.hoverScale`, fine pointer only (MOT-0-R7).
- **MOT-1-R4 Confirm beats navigate.** For widgets whose action starts a scene (Home play, Loadout go, Results again and home, Pause quit), `attachFeedback` defers the action with `scene.time.delayedCall(motion.tapUpMs)` when `opts.navigates` is true. Under reduced motion the delay is 0. Non-navigating actions (toggle, pick, Pause resume) run immediately on release. A second tap during the delay is ignored (one-shot latch).
- **MOT-1-R5 Pill.** `pillButton` keeps its shelf look: on press the face and label move by `geom.pressedDy` and scale to `motion.pressScale` about the face centre (shelf static); release overshoots to `releaseOvershoot`, then rests. The existing `move(dy)` closure is replaced by the wrapper; the `Button` return type is unchanged.
- **MOT-1-R6 Zone widgets get a visual target.** `tap()` gains an optional trailing `visual?: Phaser.GameObjects.GameObject` argument. With it, the wrapper animates `visual`; without it, behaviour equals today (existing callers do not break). `roundIconButton` passes its own container with kind `round`.
- **MOT-1-R7 Rebuild-safe.** Settings and Loadout destroy and rebuild their block after each action. Feedback must (a) never leave a tween on a destroyed target (MOT-0-R4 kill-by-target plus a `destroy` listener in the wrapper), and (b) animate state changes from the previous value: each scene keeps a small `prev` map (switch id to boolean, card id to slot) read before the rebuild and passed to the builder as the start state.
- **MOT-1-R8 Toggle switch.** In `SettingsScene.build()`, a switch whose `r.on` differs from `prev[r.id]` animates: knob x from `-M.sw.knob` to `+M.sw.knob` (or reverse) over `motion.toggleSlideMs` with `cubicOut`; track fill lerps between the two `toggleTrackStyle(...)` fills over the same time; the border colour switches at t = 0.5. On pointerdown the knob squashes to `motion.pressScale` and returns with the slide. The switch Graphics redraw per tween frame only while a slide runs, then once at rest. Unchanged switches do not animate on rebuild.
- **MOT-1-R9 Sliders.** No slider exists in the menu layer, so no slider code is added. A future slider thumb uses kind `round` and scales to `motion.hoverScale` while dragged; adding one needs a spec amendment.
- **MOT-1-R10 Selection.** Settings theme tiles and Loadout cards and slots use kind `card` for press and release. When selection changes, the newly selected tile or card plays one overshoot (peak `releaseOvershoot`, `motion.tapUpMs`). The Loadout "Picked n" badge plays `popIn`.
- **MOT-1-R11 Rejected.** `attachFeedback` returns `reject()`, which calls `shake` with `ui.hud.rejectShakeMs` and `ui.hud.rejectShakeAmpPx` (existing keys), no scale change, no confirm sound. Used where an action is refused: Loadout `tapCard` / `tapSlot` returning the same `LoadoutEditState` (not enough energy, no free slot). The scene detects rejection by `next === prev` in `pick()`; on reject it skips `render()` so the shaking target survives.
- **MOT-1-R12 Disabled.** `setDisabled(on)` sets alpha `motion.disabledAlpha` and suppresses hover and press feedback; the hit area is unchanged. `PauseOverlay.setEnabled(false)` (while Settings is open) calls it for all three buttons in addition to flipping `input.enabled`.
- **MOT-1-R13 Entrance owner.** Entrance tweens belong to MOT-2. The wrapper reads the target's rest scale at attach time and always returns to it; if an entrance tween owns the target, the wrapper's first motion kills it (MOT-0-R4) and then ends at the same rest transform.

## 3. State table (values are `balance.motion` keys)
| Kind | Used by | Idle | Hover (fine pointer) | Pressed | Released | Disabled |
|---|---|---|---|---|---|---|
| `pill` | `pillButton`: Home play / prev / next, Loadout go, Results again, Pause resume / settings / quit | rest | face and label `hoverScale` | `pressedDy` dip + `pressScale`, `tapDownMs` | `releaseOvershoot` then rest, `tapUpMs` | alpha `disabledAlpha` |
| `round` | `roundIconButton`: Settings and Loadout back, Home gear, Results home | rest | `hoverScale` | `pressScale` | `releaseOvershoot`, `tapUpMs` | alpha |
| `card` | Loadout cards and slots, Settings theme tiles, Home `home-l1` link | rest | half-delta hover (`1 + (hoverScale - 1) / 2`) | half-delta press (`1 - (1 - pressScale) / 2`) | half-delta overshoot | alpha |
| `switch` | Settings rows (4) | knob at its state side | none | knob squash `pressScale` | knob slide (R8) | alpha |
| `hudButton` | `HudTop.pauseButton`, greybox `button()` | rest | none | `pressScale` | `releaseOvershoot` | n/a |
Wide targets use half deltas so a full-width card never outgrows its column; halving is derived from the existing keys, not new numbers.

## 4. Files a plan would touch
| File | Change |
|---|---|
| `src/game/ui/feedback.ts` (new) | `attachFeedback`, kinds, `reject()`, `setDisabled()`, destroy cleanup |
| `src/game/ui/feedbackModel.ts` (new, pure) | `feedbackScales`, `knobX`, `trackColor`, `isRejected` |
| `src/game/ui/widgets.ts` | `pillButton` swaps `move(dy)` for the wrapper (R5); `card()` unchanged (static graphic) |
| `src/game/ui/menuWidgets.ts` | `tap()` optional `visual`; `roundIconButton` binds `round` |
| `src/game/scenes/ui.ts` | `bindPress` unchanged; `button()` uses kind `hudButton` |
| `src/game/hud/HudTop.ts` | pause button uses the wrapper (`stop = true` preserved) |
| `src/game/scenes/SettingsScene.ts` | switch slide (R8), tile feedback, `prev` map |
| `src/game/scenes/LoadoutScene.ts` | card and slot feedback, reject in `pick()` (R11), badge pop |
| `src/game/scenes/HomeScene.ts` | gear, link and play get kinds and `navigates` flags |
| `src/game/scenes/ResultsScene.ts` | again and home get `navigates` |
| `src/game/hud/PauseOverlay.ts` | disabled state (R12), quit `navigates` |
| `src/game/ui/geometry.ts` | none (hit and shelf geometry untouched) |
Docs: CODEMAP rows for the two new files; CHANGELOG line. `balance.motion` additions are merged by the lead into MOT-0.

## 5. New balance.motion keys
| Key | Value | Use |
|---|---|---|
| `toggleSlideMs` | 160 | switch knob slide and track colour lerp (R8) |
| `disabledAlpha` | 0.45 | disabled widget alpha (R12) |
Validator additions: both finite and > 0; `disabledAlpha` < 1.

## 6. Reduced motion
Per MOT-0-R6: no scale, dip, overshoot, shake or knob slide. Pressed shows the adapter's flat alpha dip, released restores alpha 1. Switch knob and track jump to the new state at once; hover has no effect; reject becomes a single flat alpha dip (no shake); the navigate delay is 0. `pillButton` already skips its dip under `reduceMotion()` and keeps that, adding only the alpha dip.

## 7. Performance
No per-frame allocation: tween configs are built once per widget in `attachFeedback` and reused. A Settings or Loadout rebuild starts at most 4 switch slides plus one selection pop (far below `maxTweens` = 40). Hover listeners bind only on fine pointers. All motions are killed on `SHUTDOWN` and on target `destroy`. Switch Graphics redraw only while a slide is active.

## 8. Testing
- **Pure (Vitest, no Phaser):** `feedbackScales(kind, balance.motion)` (ordering `release > 1 > press`, half-delta rule, all in (0, 2)); `knobX(on, t)` endpoints exact at `-+knob`, monotone; `trackColor(from, to, t)` endpoints exact; `isRejected(prev, next)`. Names carry `MOT-1-R3`, `R8`, `R11`.
- **Fake scene (`tests/support/scene.ts` with the MOT-0 recording tweens):** after pointerdown and pointerup the visual ends at rest scale; a double press leaves one tween; destroy kills tweens; reduced motion gives no scale change; `navigates` defers the action by `tapUpMs` (0 when reduced) and ignores a second tap; the `pillButton` hit rect equals `pillHitRect(geom)` before and after (R2).
- **Existing tests stay green:** `bindPress` semantics, `hitSize`, `pillHitRect`, Settings and Loadout view-model tests.
- **Browser eye-check:** press feel on touch and mouse, hover on desktop only, knob slide, reject shake, no visible jump after a Settings or Loadout rebuild, no lost input during the 180 ms navigate delay, 60 fps on a mid-range phone.

## 9. Out of scope
Scene entrances and transitions (MOT-2), in-run skill buttons and HUD (MOT-3, MOT-4; `SkillButtons` keeps its own code), sound changes, art, dark theme, haptics, slider widgets (none exist), rewriting `bindPress`.

## 10. Exit criteria
Every widget in table 3 uses `attachFeedback`; no hard-coded press scale remains in menu code; hit rules and `bindPress` tests are unchanged and green; switch slide and reject verified in a browser; reduced-motion path verified; `npm test` and `npm run typecheck` pass.
