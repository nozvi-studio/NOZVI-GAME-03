# D4 Phase 3 Spec — Pilot Screens: Characters & Simplified Home (DOM Overlay)

**Date:** 2026-11-23
**Status:** Approved (incorporates independent UI/UX & Technical Architecture audits + owner Home simplification ruling)
**Parent Umbrella:** `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`
**Phase:** 3 of 5 (`D4-P3`)
**Depends on:** `D4-P1`, `D4-P2`

---

## 1. Objective
Ship the first two live HTML/CSS D4 screens — **Characters** and **Home** — wired to `Session`, `Synth`, and Phaser via thin scene shims, applying the owner-approved **Home simplification** (PLAY as the single primary action, removing checkpoint stepper / Start from L1 / pre-run Loadout detour / Start Energy clutter from Home) while keeping Phaser↔DOM coexistence rock-solid during the Phase 3→4 transition.

## 2. Requirements

### 2.1 Characters Screen — Balanced `360×640` & `360×780` Layout (`D4-P3-R1`)
Implemented in `src/game/dom/screens/charactersScreen.ts`, driven by pure `charactersView(session.skinsModel(), preview)` (MEC-011-R14..R21):
- **Header (`56px`):** Left flat round Back button (`<`, `data-qa="chars-back"`), centered bold `Characters` title (`20px`, Charcoal), right Gold Coin pill (`data-qa="chars-coins"`, crisp SVG coin + tabular-nums balance with odometer animation). In `?debug=1`, a compact `+500` pill (`data-qa="chars-debug-coins"`) sits neatly under/beside the coin pill.
- **Adaptive Showcase Stage (`min-height: 200px` on `360×640`; `max-height: 260px` on `360×780`):**
  - Centered smoothly with balanced flex spacing (zero dead void at the top on tall screens).
  - Soft pastel radial halo tinted to the previewed skin's accent palette + subtle tropical backdrop watermark.
  - Live `HeroStage` (`D4-P2`) centered over the soft shadow; tapping triggers `poke` reaction + `uiTap` sound.
  - Switching skins plays a crisp spring swap transition and updates the halo tint.
- **Identity Block (compact `~68px`, zero ribbons, zero text-stroke):**
  - Inline row: Skin name (`24px`, `900`, `--d4-ink`) + compact Rarity pill (`Default` neutral, `Common` sky tint, `Rare` purple tint with star icon).
  - Single-line perk copy (`13px`, `700`, `--d4-ink-muted`).
- **Compact 3×2 Tactile Skin Grid (`tile height: 72px`, `gap: 8px`, `padding: 0 16px` → total `~152px`):**
  - Leaves `≥200px` for the Stage even on `360×640` (`56 + 68 + 152 + 76 = 352px` fixed, `288px` remaining for Stage + breathing margins!).
  - 5 skins + 1 `Soon` tile (`data-qa="chars-token-<id>"`).
  - Clean white `16px`-rounded card (`2px solid var(--d4-border)`, `0 3px 0 var(--d4-border)`). Selected tile gets `2px solid #1CB0F6` + `#DDF4FF` tint + spring pop.
  - **Non-overlapping badges:** Checkmark (equipped) or Lock (locked) sits in the top-right corner (`5px` inset) clear of character ears/silhouette.
  - Compact footer inside each tile shows crisp coin icon + price (`300` / `800`) or `Owned` / `Equipped` / `Soon`.
- **Action CTA Footer (`padding: 12px 16px 16px`):**
  - Full-width `52px` tactile button (`data-qa="chars-action"`):
    - `Buy (N)` / `Equip`: Feather Green `#58CC02` with `4px` `#46A302` lip. Buying updates `Session`, plays `unlock` SFX, `HeroStage.react('celebrate')`, `burstConfetti`, and odometer coin deduction.
    - `Equipped`: Flat disabled button (`#E5E2DC`, green check icon, zero lip).
    - `Need N more`: Flat disabled button with lock icon; tapping plays `nope` SFX, `shakeDenied`, and `HeroStage.react('denied')`.

### 2.2 Simplified Home Screen (`D4-P3-R2`)
Implemented in `src/game/dom/screens/homeScreen.ts` (**owner ruling 2026-11-23**: simplify Home to `PLAY` only, removing checkpoint stepper, `Start from level 1`, pre-run 2-skill Loadout detour, and Start Energy chip; update `docs/GDD.md`, `MEC-008`, `DECISIONS.md`, and Home tests in the same phase):
- **Top Bar:**
  - Left: In `?debug=1`, clean `Export log` pill (`data-qa="home-export"`, zero overlap) + preserve `window.__summarize` hook.
  - Right: 2 flat tactile round icon buttons (`48×48px`):
    - **Characters** (`data-qa="home-characters"`): Clear character-avatar/wardrobe SVG icon + subtle green dot indicator when player can afford an unowned skin.
    - **Settings** (`data-qa="home-settings"`): Crisp gear SVG icon.
- **Hero Center (`flex: 1`, tropical watermark backdrop):**
  - Display wordmark in `Lilita One`: `MANGO` (warm amber `#F59E0B`) over `SNAKE` (Charcoal `#3C3C3C` with clean flat shadow).
  - Compact mascot speech bubble (`.d4-bubble`, e.g., *"Ready for L10!"* or *"Let's eat!"* — grounded charm, avoids empty white void).
  - Live `HeroStage` rendering the equipped skin beside a gently bobbing crisp SVG mango; hero pupils track the mango smoothly. Tapping the hero triggers `poke`.
- **Primary CTA:** Single prominent `PLAY` button (`data-qa="home-play"`, `56px` tall, Feather Green `#58CC02`, `4px` tactile lip, subtle idle pulse). Tapping `PLAY` immediately ensures equipped skin Phaser textures are loaded (`ensureSkinTextures`) and starts the run at the player's highest unlocked checkpoint (skipping the pre-run Loadout detour).
- **Passive Status Footer:** Single flat, non-clickable checkpoint status pill (`flag icon + Next checkpoint at L<n>` or `Starts at L<n>`, neutral `#F2EFE9`, zero bottom lip).

### 2.3 Phaser↔DOM Coexistence & Thin Scene Shims (`D4-P3-R3`)
- **Thin Shims & Safe Close Ordering:** `HomeScene` and `CharactersScene` remain registered Phaser scenes that act as minimal bridges calling `const token = uiBridge.open('Home')` / `uiBridge.open('Characters')` on `create()` and `uiBridge.close(token)` on `SHUTDOWN`. Because `close(token)` only unmounts if `token` is still the active view, `scene.start` ordering (`SHUTDOWN` firing after the next scene's `create()`) can never wipe the newly mounted screen (covered by an explicit unit test). This also preserves `boot.test.ts`, `navGuard.test.ts`, `goTo(this, 'Home')` from Phase 3 Phaser scenes, and `?debug=1&artPreview=1`.
- **Texture Preload Safety:** `uiBridge.startRun()` always calls `ensureSkinTextures(game, [activeSkin()], ...)` before starting `GameScene` so newly bought/equipped skins from DOM `Characters` never crash `CapyHead`.
- **Keyboard Safety:** `Enter`/`Space` on Home starts a run **only** when `document.activeElement` is not an interactive `<button>` (prevents double-fire); `Escape` on Characters returns to Home.
- **Calm Transition:** Update `BootScene` background color in `main.ts` to `--d4-bg` (`#FAF9F5`) so startup has zero electric-blue flash.

## 3. Verification & Exit Gate
- Vitest (`happy-dom`) unit tests covering all `Characters` states (`equipped`, `equip`, `buy`, `need`, debug `+500`, `Escape`), simplified `Home` states (equipped skin, speech bubble, checkpoint chip, debug export, `PLAY` texture-preload handoff), and thin-shim coexistence.
- Update GDD/MEC-008/DECISIONS and obsolete Home stepper/loadout-from-home tests per owner ruling.
- Full `npm test` + `npm run typecheck` pass.
- Headless Chrome QA screenshots (`tmp/qa/d4-p3/`) at `360×640` and `360×780` for both `Home` and `Characters` (0 console errors), approved by owner eye-check before starting Phase 4.
