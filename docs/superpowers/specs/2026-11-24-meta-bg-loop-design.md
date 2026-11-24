# Meta Animated Background (`BgLoop` / Rigby2D) Integration Design

**Date:** 2026-11-24  
**Scope:** Integrate the Rigby2D-powered animated Aqua Marsh background (`phaser/`) behind all 5 DOM meta screens (`Home`, `Characters`, `Settings`, `Results`, `Loadout`), keeping gameplay (`GameScene`) on its flat 6-biome backgrounds.

## 1. Requirements
- **META-BG-R1 (Coverage):** All 5 DOM meta screens (`home`, `characters`, `settings`, `results`, `loadout`) display the live animated Aqua Marsh `BgLoop` (swaying Rigby2D foliage skeleton at `wind = 1.15`, center glow, additive fireflies, and bone-mounted leaf sparkle).
- **META-BG-R2 (Continuity):** Navigating between the 5 meta screens does not destroy or reset the `BgLoop`; wind and fireflies run continuously across transitions.
- **META-BG-R3 (Adaptive Portrait Cover):** The `572×1024` `BgLoop` fills any adaptive portrait canvas (`540 × 960..1200`) with zero letterboxing via camera cover-fit (`zoom = max(viewW / contentW, viewH / contentH)`, centered on `(contentW / 2, contentH / 2)`).
- **META-BG-R4 (Gameplay Isolation):** While `GameScene` is active, `MetaBgScene` sleeps so 100% of GPU/CPU is reserved for gameplay; `GameScene` keeps its existing 6-biome flat backgrounds.
- **META-BG-R5 (Reduced Motion & Fallback):** When `reduceMotion()` is true, when WebGL is unavailable (`renderer.type !== Phaser.WEBGL`), or while assets are loading / fail to load, `MetaBgScene` sleeps, `#ui-root` does not have `.d4-live-bg`, and `.d4-screen.d4-mystic` falls back cleanly to the static 20 KB `/bg/aqua-marsh.webp`. Toggling Reduce Motion in Settings takes effect immediately without reload.
- **META-BG-R6 (No Double Fireflies):** While `#ui-root.d4-live-bg` is active, `.d4-screen.d4-mystic` is transparent and `.d4-mystic-bg` (CSS fireflies) is hidden.
- **META-BG-R7 (Non-blocking Boot):** `MetaBgScene` loads its assets asynchronously in the background after `BootScene` hands off to `Home`, so initial boot time is unaffected and there is no blank flash.

## 2. Architecture
- **Assets:** `public/bg/marsh-loop/` holds `bg.json`, `bg.atlas`, `bg_clean.png`, `foliage_bot_right.png`, `grass_bottom.png`, `plant_bot_left.png`, `vine_top_left.png`, `firefly_glow.png`, `sparkle.png`.
- **Vendored Runtime:** `src/game/vendor/rigby2d/` holds `rigby2d-phaser-0.5.1.mjs`, its TypeScript ambient declaration `rigby2d-phaser-0.5.1.d.ts`, and upstream licenses (`LICENSE-MIT`, `LICENSE-APACHE`, `THIRD_PARTY_NOTICES.md`). Registered as Phaser scene plugin `'RigbyPlugin'` (`mapping: 'rigby'`) in `src/game/main.ts`.
- **Pure Cover Math (`src/game/bg/coverFit.ts`):** Pure, Phaser-free `coverCamera(viewW, viewH, contentW, contentH)` returning `{ zoom, centerX, centerY }`.
- **Typed `BgLoop` (`src/game/bg/bgLoop.ts`):** Strict TypeScript wrapper around Rigby2D skeleton + Phaser sprites (`BgLoop.preload`, `BgLoop.create`, `setWind`, `setVisibleParts`, `destroy`).
- **Dedicated Scene (`src/game/scenes/MetaBgScene.ts`):**
  - Launched lazily when `setMetaBg(true)` is first requested on WebGL.
  - Emits `'meta-bg-ready'` on `game.events` once `BgLoop` is created; emits nothing on `loaderror` (permanent fallback).
  - Applies `coverCamera` on `create()` and on `scale.on('resize')`; calls `scene.sendToBack()`.
  - Slept via `scene.sleep('MetaBg')` on `setMetaBg(false)` and woken via `scene.wake('MetaBg')` on `setMetaBg(true)`.
- **`UiHost` & `LoopHooks` (`src/game/dom/uiBridge.ts`, `src/game/dom/uiHost.ts`):**
  - Optional hook `setMetaBg?(active: boolean): boolean` on `LoopHooks`.
  - On `kind === 'screen'` mount and on `syncReducedMotion()`:
    - `live = !getReduced() && (hooks.setMetaBg?.(true) ?? false)`
    - Toggles `root.classList.toggle('d4-live-bg', live)`
    - If `live`: `hooks.wake()`, `hooks.canvasVisible(true)`, `bandLock?.(true)`
    - If `!live`: `hooks.setMetaBg?.(false)`, `hooks.sleep()`, `hooks.canvasVisible(false)`, `bandLock?.(true)`
  - On `kind === 'screen'` unmount: `hooks.setMetaBg?.(false)`, `root.classList.remove('d4-live-bg')`, `bandLock?.(false)`, `hooks.canvasVisible(true)`, `hooks.wake()`.
- **`PhaserPort` (`src/game/scenes/phaserPort.ts`):** `activeScene()` filters out `'MetaBg'` so `goTo` and `beginRun` never target the background scene.
- **CSS (`src/game/dom/styles/mystic.css`):** `#ui-root.d4-live-bg .d4-screen.d4-mystic { background: transparent; }` and `#ui-root.d4-live-bg .d4-mystic-bg { display: none; }`.

## 3. Verification
- Unit tests: `tests/game/bg/coverFit.test.ts`, expanded `tests/game/dom/uiHost.test.ts`, and `PhaserPort` `'MetaBg'` exclusion test.
- Full `npm test`, `npm run typecheck`, `npm run build`.
- Headless Chrome QA (`tools/qa/shot.mjs`) across `Home`, `Characters`, `Settings`, `Loadout`, `Results`, and `GameScene` confirming live canvas backdrop, clean fallback on Reduce Motion, and zero console errors.
