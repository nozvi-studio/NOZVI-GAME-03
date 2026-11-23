# D4 Phase 1 Spec — Foundation, Design System & Visual Stylebook

**Date:** 2026-11-23
**Status:** Approved (incorporates independent UI/UX & Technical Architecture audits)
**Parent Umbrella:** `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`
**Phase:** 1 of 5 (`D4-P1`)

---

## 1. Objective
Establish the **Duolingo Modern (D4)** visual language, zero-runtime-dependency CSS token/component system, inline SVG icon library, Hybrid sibling `#game` + `#ui-root` DOM overlay host, singleton Web Audio unlock, `happy-dom` test harness, and an **interactive HTML Visual Stylebook** (`docs/design/mockups/d4/stylebook.html`) so the owner can approve the exact look and feel in a browser before migrating live screens.

## 2. Requirements

### 2.1 Viewport & Sibling Layer Stack (`D4-P1-R1`)
- `index.html` keeps `#game` (`100vw × 100dvh`, `z-index: 1`) and `#ui-root` (`position: fixed`, `z-index: 2`) as **full-viewport siblings** — never wrap `#game` in a resized container (prevents `Scale.FIT` ↔ `ResizeObserver` feedback loops).
- `src/game/dom/stageSync.ts` observes `game.canvas` (`getBoundingClientRect()` + `game.scale.on('resize')` + `window` resize + `visualViewport` resize for mobile iOS URL bar), throttled via `requestAnimationFrame` to avoid layout thrash, and positions/sizes `#ui-root` to match the canvas bounds 1:1 on all portrait phones (`360×640` through `430×932`) and letterboxed desktop viewports. Accepts an injectable rect/`rAF` source so `happy-dom` unit tests work deterministically.
- Exposes CSS custom properties on `#ui-root`: `--stage-w`, `--stage-h`, `--stage-scale` (`rect.width / 360`), and percentage `BOARD` bounds (`--board-top`, `--board-h`) so overlays align cleanly with the Phaser board at any viewport size.
- Outer page background uses warm `--d4-bg` (`#FAF9F5`); `setBandColor()` in `viewport.ts` is gated so Phaser scenes cannot clobber the page background with `#1F86D8` while a DOM menu is open.
- `#ui-root` defaults to `pointer-events: none`; mounted screens/overlays set `pointer-events: auto` on their root element so active gameplay swipes pass unobstructed to Phaser.

### 2.2 Duolingo Modern Color Tokens — Warm 60-30-10 (`D4-P1-R2`)
Defined in `src/game/dom/styles/tokens.css` (preventing sterile SaaS whiteout):
- **60% Warm Neutral Canvas & Surfaces:**
  - `--d4-bg: #FAF9F5` (warm off-white primary canvas)
  - `--d4-surface: #F2EFE9` (secondary recessed surface / letterbox band)
  - `--d4-card: #FFFFFF` (crisp lifted card surface)
  - `--d4-border: #E5E2DC` (`2px solid` warm hairline border)
  - `--d4-border-strong: #D2CEC6` (4 px lip for neutral/white buttons & cards)
- **30% Ink & Passive States:**
  - `--d4-ink: #3C3C3C` (primary text)
  - `--d4-ink-muted: #777777` (secondary labels, perks, subtitles)
  - `--d4-disabled-bg: #E5E2DC`, `--d4-disabled-ink: #AFAFAF` (flat, zero bottom lip)
- **10% Semantic Accents (face / 4px lip / light tint):**
  - Primary CTA (`green`): `#58CC02` / `#46A302` / `#D7FFB8`
  - Mango & Coins (`gold`): `#FFC800` / `#E5A400` / `#FFF5CC` (ink `#6B4400`)
  - Selection & Energy (`sky`): `#1CB0F6` / `#1899D6` / `#DDF4FF`
  - Rare & Slow-mo (`purple`): `#CE82FF` / `#A568CC` / `#F3E5FF`
  - Danger & Quit (`red`): `#FF4B4B` / `#EA2B2B` / `#FFDFE0`

### 2.3 Tactile Flat Component Primitives (`D4-P1-R3`)
Defined in `src/game/dom/styles/components.css`:
- **Zero plastic gloss gradients, zero sunburst rays, zero thick dark outlines, zero text-stroke on body/label copy.**
- **Subtle Tropical Backdrop (`.d4-backdrop-pattern`):** Low-contrast (`3–4%` opacity) SVG leaf & mango silhouette watermark pattern behind `Home`/`Characters`/`Results` so open space feels crafted and playful rather than empty.
- **Tactile Button (`.d4-btn`):** `border-radius: 16px`, flat fill, `box-shadow: 0 4px 0 var(--lip)`. On `:active` / `.is-pressed`: `transform: translateY(2px); box-shadow: 0 2px 0 var(--lip);`. Minimum height `48px` (primary CTAs `52–56px`).
- **Disabled / Passive CTA (`.d4-btn--disabled`):** Flat `--d4-disabled-bg`, `--d4-disabled-ink`, zero bottom lip, no press travel.
- **Round Icon Button (`.d4-icon-btn`):** `48×48px` circle, `#FFFFFF` fill, `2px solid var(--d4-border)`, `0 3px 0 var(--d4-border)` lip.
- **Status Chip (`.d4-chip`):** Flat tinted pill (`border-radius: 999px`, `1.5px solid` subtle border, **zero bottom lip**) so passive info never mimics a clickable button.
- **Tactile Card (`.d4-card`):** `#FFFFFF`, `2px solid var(--d4-border)`, `border-radius: 16px`, `0 4px 0 var(--d4-border)` depth (never nest bordered cards inside bordered cards).
- **Speech Bubble Pill (`.d4-bubble`):** Compact white pill with soft tail for mascot micro-copy (*"Ready for L10!"*, *"Tap me!"*).

### 2.4 Typography & 8pt Spacing Grid (`D4-P1-R4`)
- **Display Font:** Self-hosted `Lilita One` (`public/fonts/`) reserved strictly for high-energy display headers (`MANGO SNAKE`, `NEW BEST!`, `VICTORY!`, `GAME OVER`) with clean flat depth (no heavy dark outline soup).
- **UI Font:** Self-hosted `Nunito` (`700`, `800`, `900`) for all UI headings, buttons, labels, perks; `font-variant-numeric: tabular-nums` on all numeric counters.
- Spacing scale: `--sp-1: 4px`, `--sp-2: 8px`, `--sp-3: 12px`, `--sp-4: 16px`, `--sp-6: 24px`, `--sp-8: 32px`. Minimum touch target `48×48px`.
- Every interactive DOM element carries a stable `data-qa="<id>"` attribute for deterministic `tools/qa/shot.mjs` automation.

### 2.5 Inline SVG Icon Kit (`D4-P1-R5`)
- `src/game/dom/icons.ts` provides crisp, uniform-stroke inline SVG icons (Phosphor Bold/Duotone + Fluent Flat style): `back`, `settings`, `characters` (wardrobe/avatar), `coin`, `lock`, `check`, `star`, `trophy`, `flag`, `bolt`, `play`, `pause`, `home`, `sound`, `haptics`, `dpad`, `motion`, `mango`, `clock`, `scissors`, `shield`, `rain`.

### 2.6 DOM Host, Bridge, Input Isolation & Singleton Audio (`D4-P1-R6`)
- **Singleton Web Audio (`src/game/audio/synth.ts` + `src/game/main.ts`):**
  - Share **one lazy-initialized `AudioContext` AND one shared `on` mute flag** across all `createSynth()` instances (DOM + Phaser) so toggling Sound mutes both layers immediately.
  - Set `audio: { noAudio: true }` in `src/game/main.ts` so Phaser does not allocate a redundant second `AudioContext`.
  - Unlock synchronously inside a capturing `pointerdown`/`keydown` listener, handle iOS `state === 'interrupted'`, and resume on `visibilitychange`.
- **`src/game/dom/uiHost.ts`:**
  - Mounts/unmounts active view in `#ui-root` using a **mount token** (`close(token)` only unmounts if `token` matches the currently active view — prevents `SHUTDOWN`-after-`create` races from wiping a newly mounted screen).
  - Exposes `isModalOpen()` and toggles Phaser loop/input pause (`game.loop.sleep()`/`wake()` on full-screen menus, plus `input.keyboard.disableGlobalCapture()` / game input pause while any modal is open so Phaser never calls `preventDefault()` on `Space`/arrows for focused DOM buttons or receives leaked swipe releases).
  - Manages `Escape` key cleanly, syncs `.reduced-motion` from `reduceMotion()` (`src/game/render/palette.ts`, honoring OS `prefers-reduced-motion` when saved setting is `null`), and toggles Phaser canvas visibility (`visibility: hidden`) on full-screen menus.
- **`src/game/dom/uiBridge.ts`:** Typed, Phaser-import-free interface connecting `Session`, `Synth`, `t()`, and injected Phaser scene/loop hooks (`open`, `startRun`, `pause`, `resume`, `quitToHome`) so DOM tests never import `phaser`.

### 2.7 Interactive Visual Stylebook (`D4-P1-R7`)
- `docs/design/mockups/d4/stylebook.html`: Self-contained browser preview that **links `src/game/dom/styles/tokens.css` and `components.css` directly** (never copy-pasting hex values so the preview and shipped CSS cannot drift), showcasing:
  1. Warm 60-30-10 color palette swatches & `Lilita One` + `Nunito` typography hierarchy.
  2. Interactive tactile buttons, disabled states, chips, 4px-lip cards, speech bubble, toggles, and all inline SVG icons.
  3. Side-by-side `360×640` and `360×780` interactive mockups of **Characters** and **Home** for owner visual sign-off before Phase 3 integration.

## 3. Verification & Exit Gate
- Install `happy-dom` as `devDependency` (owner-approved 2026-11-23; recorded in `docs/DECISIONS.md`) for Vitest DOM unit tests (`// @vitest-environment happy-dom` per test file so existing `node` tests stay untouched and fast).
- Unit tests for `stageSync`, `uiHost` (mount/unmount/`isModalOpen`/`reduceMotion()` sync), `icons` (SVG validity), and singleton `AudioContext` in `synth.ts` (`tests/game/dom/`).
- Full `npm test` + `npm run typecheck` pass.
- Owner opens `docs/design/mockups/d4/stylebook.html` (and QA screenshots in `tmp/qa/d4-p1/`) and approves the D4 visual direction.
