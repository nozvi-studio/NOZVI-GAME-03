# UI D4 "Duolingo Modern" Redesign — Hybrid Phaser + HTML/CSS Architecture

**Date:** 2026-11-23
**Status:** Draft (awaiting owner review)
**Supersedes:** UI D3 "Juicy" visual direction (`docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md`) for all meta menus, overlays, and (in Wave 3) in-game HUD/board harmonization.
**Owner approvals recorded in session:**
1. Hybrid architecture: HTML/CSS DOM overlay for 5 meta menus (`Home`, `Characters`, `Loadout`, `Results`, `Settings`) + 3 overlays (`Pause`, `Countdown`, `DeathCard`); Phaser canvas retained for gameplay board, snake, VFX, and in-game HUD (`HudTop`, `BottomGroup`, `SkillButtons`).
2. Visual direction: **Duolingo Modern** — clean minimalist, tactile flat (3D pressable bottom lip, zero plastic gloss, zero sunburst rays, zero heavy stroke soup, 60-30-10 color discipline).
3. Tech stack: **Vanilla TypeScript + Modern CSS** (CSS custom properties, spring keyframes, Web Animations API) + **inline SVG icons** (Phosphor / Fluent Emoji style) — **zero new runtime npm dependencies**.
4. Character pipeline: Upgrade existing pure-SVG rig (`src/game/art/capyRig.ts` + `skins.ts`) to Duolingo Vector quality (colored outlines, cel-shaded geometric highlights, 2-glint eyes, tapered Bezier body with per-skin patterns), rendered live as interactive SVG DOM in menus and shared as crisp textures on the Phaser board.
5. Rollout: 3-Wave incremental rollout starting with an interactive HTML Visual Stylebook (`docs/design/mockups/d4/stylebook.html`) + `Characters` + `Home`.

---

## 1. Problem Statement & Design Goals

The D3 "Juicy" UI suffers from five systemic visual and UX flaws identified in the 2026-11-23 Senior Game Design audit:
1. **Dated Glossy/Sunburst Cliché:** Saturated electric-blue radial sunburst backgrounds and plastic gloss gradients on every widget produce an "AI vibe-coded 2012 template" feel.
2. **Over-Saturation (Color Soup):** 7+ full-chroma hues compete simultaneously on one screen, breaking the 60-30-10 hierarchy.
3. **Broken Signifiers & Affordance:** Passive status chips (`Next checkpoint at L10`, `Next run starts at L4!`) use the exact same glossy button skin as interactive CTAs, while disabled/passive states (`Equipped`, `Need 800 more`) appear as the largest, brightest white button on screen.
4. **Container Bloat & Rigid Layout:** Cards nested inside cards, cramped token shelves where lock/check badges obscure character ears, and tall-screen dead voids (all height above 640 px dumped into `Characters` stage top).
5. **Procedural Primitive Art:** Uniform-width `fillCircle` snake tubes with detached bobbing heads, two-circle coins, and flat card podiums.

**Goal (D4):** Deliver a crisp, joyful, minimalist, modern casual interface with tactile mechanical feedback and living character micro-animations, while preserving 100% of existing pure gameplay/meta/session logic and tests.

---

## 2. Hybrid Architecture (`Phaser` ↔ `DOM Overlay`)

### 2.1 Viewport & Layer Stack (`D4-R1`)
- `index.html` mounts `#app-stage`, centered in the viewport, sized to match the exact aspect ratio and bounds of the Phaser `Scale.FIT` canvas (portrait `9:16` through `9:20+`, mobile-first `360×640` to `430×932`, desktop letterboxed cleanly with neutral `#F7F7F7` band color).
- Inside `#app-stage`:
  - `#game` (`z-index: 1`): Phaser canvas (`GameScene`, `HudScene`, `BootScene`, `ArtPreviewScene`).
  - `#ui-root` (`z-index: 2`): HTML/CSS overlay container (`position: absolute; inset: 0; pointer-events: none;`). Active screens/overlays set `pointer-events: auto` on their own root node.
- When `GameScene` is actively playing with no overlay open, `#ui-root` is empty (`pointer-events: none`), guaranteeing zero interference with 60 fps canvas touch/swipe steering.

### 2.2 Single Source of Truth & Bridge (`D4-R2`)
- New module `src/game/dom/`:
  - `uiHost.ts`: Mounts/unmounts active screen or overlay inside `#ui-root`, manages focus/Escape key, applies `.reduced-motion` class from `save.settings.reducedMotion`, and runs staggered entrance/exit transitions.
  - `uiBridge.ts`: Connects `Session` (`src/session/`), `Synth` (`src/game/audio/synth.ts`), `t()` (`src/game/text.ts`), and Phaser `GameScene`/`HudScene` lifecycle (`startRun`, `pause`, `resume`, `quitToHome`, `showDeath`, `showResults`).
- **Pure logic reuse:** All existing pure view models (`homeModel`, `charactersView`, `loadoutView`, `resultsView`, `settingsView`, `overlayModel`) remain in `src/game/flow/` and `src/game/hud/`, consumed directly by DOM views. No gameplay or progression rules live in DOM code.
- **Phaser idle power saving (`D4-R3`):** When a full-screen DOM meta menu (`Home`, `Characters`, `Loadout`, `Results`, `Settings`) is active, the Phaser canvas is hidden (`visibility: hidden`) and no menu scene ticks, eliminating redundant GPU work.

### 2.3 Screen Ownership Matrix (`D4-R4`)
| Screen / Overlay | Owner | Wave |
|---|---|---|
| `Boot` | Phaser (minimal D4 splash) or immediate handoff to DOM `Home` | Wave 1 |
| `Home` | DOM Overlay (`src/game/dom/screens/homeScreen.ts`) | Wave 1 |
| `Characters` | DOM Overlay (`src/game/dom/screens/charactersScreen.ts`) | Wave 1 |
| `Loadout` | DOM Overlay (`src/game/dom/screens/loadoutScreen.ts`) | Wave 2 |
| `Results` | DOM Overlay (`src/game/dom/screens/resultsScreen.ts`) | Wave 2 |
| `Settings` | DOM Overlay (`src/game/dom/screens/settingsScreen.ts`) | Wave 2 |
| `Pause`, `Countdown`, `DeathCard` | DOM Overlays (`src/game/dom/overlays/`) over blurred Phaser canvas | Wave 2 |
| `GameScene` (Board, Snake, VFX) + `HudScene` (Top bar, Energy, 2 Skill buttons, Banners, D-pad) | Phaser (visually harmonized to D4 palette/flatness in Wave 3) | Wave 3 |

---

## 3. D4 Design System — "Duolingo Modern"

### 3.1 Color Tokens — 60-30-10 Discipline (`D4-R5`)
Defined once in `src/game/dom/styles/tokens.css` (CSS variables) and mirrored in `src/game/uiTokens.ts` for Phaser board/HUD harmonization:
- **60% Neutral Canvas & Surfaces:**
  - `--d4-bg`: `#FFFFFF` (primary screen canvas)
  - `--d4-surface`: `#F7F7F7` (subtle secondary surface / card tint / letterbox band)
  - `--d4-border`: `#E5E5E5` (`2px solid` hairline borders)
  - `--d4-border-strong`: `#D4D4D4` (3D lip for neutral/white buttons)
- **30% Typography & Passive States:**
  - `--d4-ink`: `#3C3C3C` (primary text)
  - `--d4-ink-muted`: `#777777` (secondary labels, perks, subtitles)
  - `--d4-disabled-bg`: `#E5E5E5`, `--d4-disabled-ink`: `#AFAFAF` (flat, zero bottom lip)
- **10% Semantic Accents (Face / Bottom Lip / Tint):**
  - **Primary CTA (`green`):** `#58CC02` / lip `#46A302` / tint `#D7FFB8`
  - **Mango & Coins (`gold`):** `#FFC800` / lip `#E5A400` / tint `#FFF5CC` / ink `#6B4400`
  - **Selection & Energy (`sky`):** `#1CB0F6` / lip `#1899D6` / tint `#DDF4FF`
  - **Rare & Slow-mo (`purple`):** `#CE82FF` / lip `#A568CC` / tint `#F3E5FF`
  - **Danger & Quit (`red`):** `#FF4B4B` / lip `#EA2B2B` / tint `#FFDFE0`

### 3.2 Tactile Flat Button & Card Anatomy (`D4-R6`)
- **Zero plastic gloss gradients. Zero thick dark strokes. Zero sunburst rays.**
- **Interactive Buttons:** Rounded `16px` (`999px` for icon circles/pills), solid flat fill, `box-shadow: 0 4px 0 var(--lip)` (4 px tactile bottom lip). On `:active` / `.is-pressed`: `transform: translateY(2px); box-shadow: 0 2px 0 var(--lip);` (120 ms crisp press).
- **Disabled / Passive CTA (`Equipped`, `Need X more`):** Flat `--d4-disabled-bg`, zero bottom lip, no press travel (tapping `Need X more` triggers a horizontal denied shake + nope SFX).
- **Status Chips (non-interactive):** Flat tinted pills (`--d4-surface` or `--d4-gold-tint` with `1.5px` subtle border, zero bottom lip) so they never masquerade as clickable buttons.
- **Cards:** `#FFFFFF` surface, `2px solid #E5E5E5`, `border-radius: 16px`, optional subtle `0 2px 0 #E5E5E5` lift. Never nest bordered cards inside bordered cards.

### 3.3 Typography & 8pt Grid (`D4-R7`)
- Font: Self-hosted `Nunito` (weights `700`, `800`, `900` already in `public/fonts/`). Optional display logo in `Lilita One` or `Nunito 900` with tight tracking (`-0.02em`).
- **Rule:** Zero text-stroke on any body, label, perk, or subhead text. Hierarchy uses size + weight + ink opacity (`--d4-ink` vs `--d4-ink-muted`). Numeric counters (`coins`, `score`, `level`) use `font-variant-numeric: tabular-nums`.
- Spacing follows an **8pt grid** (`4 / 8 / 12 / 16 / 24 / 32 px`). Minimum touch target: `48×48 px` (`D4-R8`).

### 3.4 Iconography (`D4-R9`)
- All UI icons live in `src/game/dom/icons.ts` as clean inline SVG templates modeled on **Phosphor Icons (Bold/Duotone)** and **Fluent Emoji Flat** (back chevron, gear, wardrobe/avatar, coin, lock, check, flag, lightning bolt, play triangle, pause bars, sound, haptics, d-pad, motion, mango). No hand-coded geometric circle hacks.

---

## 4. Character Visual Upgrade & 3-Tier Animation System

### 4.1 Upgraded Duolingo Vector SVG Rig (`D4-R10`)
- Upgrade `src/game/art/capyRig.ts` and `src/game/art/skins.ts` while preserving all existing exports/tests (`headSvg`, `headKey`, `SKIN_IDS`, `SKIN_PALETTES`, `SKIN_BODY`, `EXPRESSIONS`):
  - **Colored Outlines:** Replace harsh dark strokes with warm, harmonized darker-hue outlines per skin.
  - **Cel-Shaded Geometric Depth:** Subtle flat forehead/cheek highlight arc, soft blush ellipses, larger expressive eyes with dual catchlight glints.
  - **Tapered Bezier Body (`heroBodySvg(skinId)`):** Pure SVG generator producing a smooth S-curve snake body that connects seamlessly behind the head (zero neck gap), tapers cleanly toward the tail, includes a lighter belly stripe, and adds per-skin signature accents (ginger tiger stripes, tuxedo chest blaze, capybara leaf crown, snake scales/belly sheen).
  - **Live SVG DOM in Menus (`D4-R11`):** `Home` and `Characters` mount the SVG directly in the DOM so CSS/JS animates individual layers (`[data-layer="eyes"]`, `[data-part="pupil"]`, `[data-layer="mouth"]`, `[data-part="body"]`) at crisp Retina resolution.

### 4.2 3-Tier Animation Specification (`D4-R12`)
All animations respect `.reduced-motion` (instant state switches, no bob/shake/particles when enabled).
1. **Tier 1 — Live Character Micro-Animations (`src/game/dom/heroStage.ts`):**
   - **Unified Idle Breathing & Slither:** Gentle synchronized CSS wave on body + head (no detached neck).
   - **Auto-Blink:** Randomized 3.0–4.5 s interval swapping eyes to `blink` for 120 ms.
   - **Smart Eye Tracking:** Pupils (`[data-part="pupil"]`) smoothly translate (±2.2 SVG units) toward the floating mango on `Home` or toward the tapped skin card on `Characters`.
   - **Tap-to-Poke & Emotional Reactions:** Tapping the hero on stage triggers a spring squash-and-stretch (`scale(1.08, 0.92)` → `scale(0.96, 1.04)` → `1`) + `happy` (or `idle_tongue` for Snake) for 600 ms. Buying/equipping plays `win` bounce; denied buy plays brief `alert` expression + horizontal button shake.
2. **Tier 2 — UI Tactile & Spring Motion (`src/game/dom/styles/motion.css` + `src/game/dom/animate.ts`):**
   - Spring cubic-bezier curves (`cubic-bezier(0.34, 1.56, 0.64, 1)`) for entrance pops and card selection.
   - Staggered screen entrance (`35 ms` step, `12 px` rise + fade).
   - Smooth skin swap transition on `Characters` stage (quick exit scale-down → spring pop-in).
   - Odometer count-up animation for Coins (on purchase/grant) and Results Score.
3. **Tier 3 — Zero-Dependency SVG/CSS Celebration Particles (`src/game/dom/confetti.ts`):**
   - Lightweight DOM/SVG burst (12–18 geometric confetti shapes & sparkles using D4 accent colors, auto-cleaned on `animationend`) for skin purchase/unlock and new best score. Clean seam left for optional Lottie later without changing callers.

---

## 5. Screen-by-Screen Design Rules

### 5.1 Characters Screen — Wave 1 (`D4-R13`)
- **Header (56 px):** Left flat round Back button (`<`), centered bold `Characters` title (`20px`, Charcoal), right flat Gold Coin pill with crisp SVG coin icon (plus compact `+500` pill in `?debug=1`).
- **Stage (`flex: 1`, centered on all aspect ratios `640`..`932`):** Soft pastel radial halo tinted to the previewed skin's accent color, soft elliptical ground shadow, live animated `HeroStage` (tapered SVG body + head, tap-to-poke interactive).
- **Identity Block:** Clean skin name (`26px`, `900`, Charcoal — no pink ribbon), compact Rarity pill (`Default` muted, `Common` sky tint, `Rare` purple tint with star icon), single-line perk text (`14px`, `700`, `--d4-ink-muted`, zero stroke).
- **Skin Grid (3 columns × 2 rows, `gap: 10px`, `padding: 16px`):** 5 skins + 1 `Soon` tile. Each tile is a rounded `16px` white card (`2px solid #E5E5E5`). Selected tile switches to `2px solid #1CB0F6` + `#DDF4FF` tint + subtle spring pop. Check/Lock badge sits cleanly in the top-right corner padding (`6px` inset) **without overlapping character ears/face**. Price (`coin icon + 300`) or `Owned`/`Equipped` sits cleanly below the portrait.
- **Footer CTA (`padding: 16px`):** Full-width `52px` tactile button:
  - `Buy (N)` / `Equip`: Feather Green `#58CC02` with `4px` `#46A302` lip.
  - `Equipped`: Flat `--d4-disabled-bg` with green check icon + muted text.
  - `Need N more`: Flat `--d4-disabled-bg` with lock icon + muted text; tapping shakes + plays `nope`.

### 5.2 Home Screen — Wave 1 (`D4-R14`)
- **Top Bar:** Right-aligned 2 flat tactile round icon buttons: **Characters** (clear character-bust/wardrobe icon with subtle equipped-skin dot) and **Settings** (gear icon).
- **Hero Center (`flex: 1`):** Clean two-line `MANGO SNAKE` brand wordmark (`Mango` in warm amber `#F59E0B`, `Snake` in crisp Charcoal `#3C3C3C` with subtle flat shadow), live animated equipped character facing a gently bobbing SVG mango (eyes tracking the mango).
- **Primary Action:** Single prominent `PLAY` button (Feather Green, `56px` tall, `4px` tactile lip).
- **Status Footer:** Flat, non-clickable checkpoint status pill (`flag icon + Next checkpoint at L10`, neutral surface `#F7F7F7`, no 3D lip). Debug `Export log` sits cleanly in a corner pill with zero overlap.

### 5.3 Loadout, Results, Settings & Overlays — Wave 2 (`D4-R15`)
- **Loadout:** Top 2 clean slot chips (`Slot 1` / `Slot 2`), vertical list of flat tactile skill cards (`2px solid #E5E5E5`, selected state = `#1CB0F6` border + `#DDF4FF` tint + crisp checkmark, no triple yellow+navy+orange borders), clear energy badge in Sky Blue, bottom green `Go!` CTA.
- **Results:** Clean centered layout without boxes-inside-boxes: Outcome header (`GAME OVER` / `NEW BEST!`), large animated odometer Score (`52px`, `900`), compact inline Best badge, clean 3-column stat strip separated by subtle hairlines (`Level`, `Eaten`, `Biome`), flat checkpoint progress bar, green `Play again` + white tactile `Home` button.
- **Settings:** Single clean white card with hairline dividers, monochrome Duotone Phosphor icons in soft pastel squares, crisp flat iOS/Duolingo-style pill toggles (`#58CC02` on / `#E5E5E5` off).
- **Overlays (`Pause`, `Countdown`, `DeathCard`):** Frosted glass scrim (`rgba(20, 25, 35, 0.35)` + `backdrop-filter: blur(6px)`), clean white `24px`-radius sheet with spring pop-in.

### 5.4 In-Game Phaser HUD & Board Harmonization — Wave 3 (`D4-R16`)
- Remove sunburst rays from `screenBackground` in gameplay; replace with calm biome-tinted soft flat/minimal gradient.
- Soften board checkerboard contrast (`biomePalette.ts`) so the upgraded Duolingo-vector snake and bright mango pop effortlessly (strong figure-ground separation).
- Replace glossy/ribbon `HudTop` with clean flat pills matching D4 tokens; remove red error styling on skill energy cost badges (use Sky Blue `#1CB0F6` when ready, muted gray `#AFAFAF` when insufficient); fix swipe-hint glyph overlap with the left skill button; delete unused D3 Phaser menu scenes/skin recipes once Wave 1–2 are verified.

---

## 6. Verification, Testing & Compatibility (`D4-R17`)

- **Core/Meta/Session Safety:** Zero changes to `src/core/`, `src/meta/`, `src/session/`, or `config/balance.json`. All existing 1897 unit tests continue to pass untouched (tests specifically tied to deleted D3 Phaser menu layouts are migrated to D4 DOM tests in the wave that replaces each screen).
- **DOM Unit Tests:** Vitest tests (pure view-model + DOM rendering/interaction tests via lightweight DOM harness or jsdom-free assertions on `heroBodySvg`, `uiBridge`, `charactersView`, `homeModel`) verifying every state (`equipped`, `equip`, `buy`, `need`, `reducedMotion`, debug grant).
- **Visual QA (`tools/qa/shot.mjs`):** Headless Chrome screenshots at `360×640` and `360×780` (0 console errors) after every wave, plus owner browser eye-check on `docs/design/mockups/d4/stylebook.html` before Wave 1 integration.

---

## 7. Phased Rollout & Phase Specifications

Each phase has its own focused, self-contained specification so implementation plans, parallel subagents, and owner eye-checks stay tightly scoped:

| Phase | Spec File | Deliverables | Exit Gate |
|---|---|---|---|
| **Phase 1 (`D4-P1`)** | `docs/superpowers/specs/2026-11-23-d4-p1-design-system-and-stylebook.md` | D4 60-30-10 CSS tokens, Tactile Flat components, inline SVG icons, `#app-stage` + `#ui-root` host/bridge, interactive `stylebook.html` | Owner visual approval of Stylebook; Vitest + typecheck pass |
| **Phase 2 (`D4-P2`)** | `docs/superpowers/specs/2026-11-23-d4-p2-characters-art-and-motion.md` | Upgraded Duolingo Vector SVG rig (`capyRig.ts`), seamless tapered Bezier body (`heroSvg.ts`), `HeroStage` live micro-animations, spring motion + odometer, SVG/CSS confetti | Unit tests for all 5 skins + animations; live Stylebook preview |
| **Phase 3 (`D4-P3`)** | `docs/superpowers/specs/2026-11-23-d4-p3-characters-and-home.md` | Live DOM `Characters` + `Home` screens wired to `Session`/`Synth`/`BootScene` | Full `npm test` + typecheck + Chrome QA `360×640` & `360×780` + owner eye-check |
| **Phase 4 (`D4-P4`)** | `docs/superpowers/specs/2026-11-23-d4-p4-menus-and-overlays.md` | Live DOM `Loadout`, `Results`, `Settings` + frosted-glass Overlays (`Pause`, `Countdown`, `DeathCard`) | Full `npm test` + typecheck + Chrome QA all 6 screens + owner eye-check |
| **Phase 5 (`D4-P5`)** | `docs/superpowers/specs/2026-11-23-d4-p5-ingame-harmonization-and-cleanup.md` | Phaser `GameScene`/`HudScene` D4 harmonization (soft board, flat HUD, cyan skill costs, no sunburst/gloss) + dead D3 cleanup | Full `npm test` + typecheck + 6-biome Chrome QA + owner playtest sign-off |
