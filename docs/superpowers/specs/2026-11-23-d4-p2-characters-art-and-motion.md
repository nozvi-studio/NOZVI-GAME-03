# D4 Phase 2 Spec — Character Art Upgrade & 3-Tier Animation System

**Date:** 2026-11-23
**Status:** Approved (incorporates independent UI/UX & Technical Architecture audits)
**Parent Umbrella:** `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`
**Phase:** 2 of 5 (`D4-P2`)
**Depends on:** `D4-P1` (tokens & CSS foundation)

---

## 1. Objective
Upgrade all 5 character skins (`snake`, `ginger`, `pup`, `tuxedo`, `capy`) from flat procedural primitives to **Duolingo Vector SVG** quality with a seamless tapered body, fix SVG DOM ID collisions, and build the reusable **3-Tier Animation System** (live SVG character micro-animations, spring UI motion, and zero-dependency SVG/CSS celebration particles).

## 2. Requirements

### 2.1 Upgraded Duolingo Vector SVG Rig (`D4-P2-R1`)
In `src/game/art/capyRig.ts` and `src/game/art/skins.ts` (preserving all public exports and `headKey`/`EXPRESSIONS`/`SKIN_IDS` contracts):
- **Zero SVG ID Collisions in DOM:** Replace the hardcoded `<linearGradient id="face">` with flat Duolingo cel-shaded geometric layers (or scope any `<defs>` IDs with a unique `skinId` + instance prefix) so mounting `HeroStage` and 5 skin thumbnails simultaneously in HTML DOM never collides.
- **Harmonized Colored Outlines:** Replace harsh dark strokes with warm, hue-shifted darker outlines per skin.
- **Cel-Shaded Geometric Depth:** Subtle flat top-crown highlight arc and soft lower cheek shading without blurry gradients.
- **Expressive Eyes:** Larger proportions with **dual catchlight glints** (primary + secondary sparkle dot) inside `[data-part="pupil"]` so eyes stay lively at both `48px` tile size and `140px` stage size.
- **Signature Skin Details:** Crisp inner ears for `ginger`/`tuxedo`/`pup`, clean tabby stripes for `ginger`, soft chest/face blaze for `tuxedo`, and signature tiny green leaf accent for `capy` (Rare).
- **Test Contract Updates:** Explicitly update `CAPY_HASH` snapshots in `tests/game/skins.test.ts` and legacy `#4A2E1B` / no-leaf assertions in `tests/game/capyRig.test.ts` to match the approved D4 rig.

### 2.2 Seamless Tapered Bezier Body (`D4-P2-R2`)
- Add pure generator `heroSvg(skinId, expression?)` in `src/game/art/heroSvg.ts` (no Phaser import):
  - Renders a unified `<svg viewBox="0 0 220 150">` with explicit scale mapping from the 48-unit `ART` head coordinate system so Phaser board textures and DOM `HeroStage` stay visually identical.
  - Contains:
    1. Soft ground shadow ellipse (`[data-layer="shadow"]`).
    2. **Tapered S-curve body** (`[data-layer="body"]`): thick behind the neck (`~36` units) smoothly tapering to a rounded tail tip (`~16` units), with a lighter belly stripe and per-skin body markings — **zero self-intersection gaps, zero detached neck**.
    3. Embedded live head group (`[data-layer="head"]`) anchored seamlessly onto the neck pivot (`transform-origin` at neck joint) so bob/tilt rotates organically with the body.

### 2.3 Tier 1 — Live Character Micro-Animations (`D4-P2-R3`)
Implemented in `src/game/dom/heroStage.ts`:
- **Unified Idle Breathing & Slither:** Subtle synchronized CSS transform on `[data-layer="head"]` and `[data-layer="body"]` (2.6 s gentle cycle, zero neck separation).
- **Auto-Blink:** Randomized 3.0–4.5 s timer toggling `[data-layer="eyes"]` to `blink` for 120 ms (always cleared on `destroy()`).
- **Smart Eye Tracking (`lookAt(dx, dy)`):** Smoothly shifts `[data-part="pupil"]` within `±2.2` SVG units toward a target (floating mango on `Home`, tapped card on `Characters`, or pointer position).
- **Tap-to-Poke & Reactions (`react(kind)`):**
  - `poke`: Spring squash-and-stretch (`scale(1.08, 0.92)` → `scale(0.96, 1.04)` → `1`) + `happy` (or `idle_tongue` for Snake) for 600 ms.
  - `celebrate`: Joyful hop + `win` expression for 800 ms (used on skin buy/equip and Results win/record).
  - `denied`: Quick `alert` expression + tiny recoil (used on insufficient coins).
  - `hurt`: Expressive `hurt` / `dead` pose for Game Over on Results.

### 2.4 Tier 2 — UI Tactile & Spring Motion (`D4-P2-R4`)
Implemented in `src/game/dom/styles/motion.css` and `src/game/dom/animate.ts`:
- **Spring Curves:** `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` and `--ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1)`.
- **Staggered Screen Entrance:** `staggerEnter(container)` applies `35 ms` incremental delay with `12 px` vertical rise + opacity fade (instant under `.reduced-motion`).
- **Odometer Count-Up (`countUp(el, from, to, ms, clock?)`):** Pure `requestAnimationFrame` helper with ease-out curve and injectable clock/`rAF` (for deterministic `happy-dom` tests) for Coins and Results Score; jumps immediately under `.reduced-motion`.
- **Denied Shake (`shakeDenied(el)`):** 280 ms horizontal damped shake (`±6px → ±3px → 0`).

### 2.5 Tier 3 — Zero-Dependency Celebration Particles (`D4-P2-R5`)
Implemented in `src/game/dom/confetti.ts`:
- `burstConfetti(container, originX, originY, palette?)`: Spawns 14–18 lightweight SVG/HTML geometric shapes (circles, rounded bars, 4-point stars) using D4 accent colors, animated via Web Animations API / CSS keyframes, auto-removed on completion. Skipped cleanly under `.reduced-motion`.
- Clean seam (`CelebrationFx` interface) so Lottie/Rive can optionally plug in later without altering any screen caller.

## 3. Verification & Exit Gate
- Unit tests (`happy-dom` for `heroStage`/`countUp`/`confetti`; `node` for `capyRig`/`heroSvg`/`skins`) verifying all 5 skins produce valid SVG with zero duplicate IDs, required `data-layer` hooks, no NaN coordinates, and clean timer teardown on `destroy()`.
- Update `docs/design/mockups/d4/stylebook.html` with live animated `HeroStage` preview for all 5 skins.
- Full `npm test` + `npm run typecheck` pass.
