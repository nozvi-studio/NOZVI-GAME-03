# D4 Phase 5 Spec — In-Game Phaser HUD/Board Harmonization & D3 Cleanup

**Date:** 2026-11-23
**Status:** Approved (incorporates independent UI/UX & Technical Architecture audits)
**Parent Umbrella:** `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`
**Phase:** 5 of 5 (`D4-P5`)
**Depends on:** `D4-P1` through `D4-P4`

---

## 1. Objective
Harmonize the remaining Phaser-rendered gameplay layer (`GameScene` board + `HudScene` top/bottom HUD) to match the clean **Duolingo Modern (D4)** visual language so the transition from Home into gameplay feels like one cohesive studio product, guarantee Biome 6 dark-theme HUD legibility, and prune superseded D3 Phaser menu/skin code and legacy token tests.

## 2. Requirements

### 2.1 Calm Gameplay Background & Softened Board (`D4-P5-R1`)
- Remove radial sunburst rays from `screenBackground` during gameplay; replace with calm, low-saturation biome-tinted flat/subtle-gradient backdrops (`src/game/ui/background.ts`, `src/game/uiTokens.ts`).
- Tune `biomePalette.ts` checkerboard pairs across all 6 biomes to softer, lower-chroma pastel contrast so the upgraded Duolingo-vector snake (`D4-P2`), bright mango, and telegraphed hazards pop cleanly.
- **Contrast Guarantee:** All 6 biomes × 5 skins × 11 hazards must continue passing `tests/game/boardContrast.test.ts` (`>= 3:1` contrast ratio), including **Biome 6 (dark Storm `#4A3F86`)** where HUD pills and outlines explicitly use high-contrast light surfaces.
- Replace heavy dark board borders with clean rounded tactile board frames matching D4 proportions.

### 2.2 Unified Flat In-Game HUD (`D4-P5-R2`)
- **HudTop & `d3HudLayout.ts` (`src/game/hud/HudTop.ts`, `src/game/hud/d3HudLayout.ts`):**
  - Replace the pink `D3_RUN.ribbon` + mixed pill styles with one unified clean D4 top bar: flat white round Pause button (`48px`), clean `Level N` pill, crisp Score pill (star SVG + tabular number), and a sleek flat mango progress bar (`#FFC800` fill on `#E5E2DC` track) with zero plastic gloss.
- **Skill Buttons & Semantic Cost Badges (`src/game/hud/SkillButtons.ts`):**
  - Remove plastic gloss gradients; use D4 tactile flat round buttons with clean 4 px bottom lip.
  - **Fix semantic color misuse:** Replace red cost badges (`40`, `30`) on insufficient-energy skills with **Sky Blue (`#1CB0F6`)** when ready and **muted warm gray (`#AFAFAF`)** when short of energy (red is reserved strictly for danger/damage).
- **BottomGroup & Steer Hint (`src/game/hud/BottomGroup.ts`):**
  - Align energy bar to D4 flat track + `#1CB0F6` fill.
  - Fix the first-input swipe finger hint glyph placement so it never collides with the left skill button's cost badge on `360×640`.

### 2.3 Dead D3 Code Pruning, Token Tests & Map Sync (`D4-P5-R3`)
- Remove superseded D3 Phaser menu renderers (`HomeScene`/`CharactersScene`/`LoadoutScene`/`ResultsScene`/`SettingsScene` old Phaser widget code, keeping only thin shims where needed), unused glossy `skinPaint.ts` recipes, and dead `TOKENS.d3` keys.
- Update/prune D3-only token assertions (`d3Tokens.test.ts`, `hudTokens.test.ts`, `menuTokens.test.ts`) while keeping `tokenGuard.test.ts` strict against any unread key in `uiTokens.ts`.
- Update `docs/CODEMAP.md`, `docs/README.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, and `CHANGELOG.md` to reflect the completed D4 architecture.

## 3. Verification & Exit Gate
- Full `npm test` (all core, meta, session, `boardContrast.test.ts`, `tokenGuard.test.ts`, and `happy-dom` DOM tests pass) + `npm run typecheck` clean.
- Headless Chrome QA screenshots (`tmp/qa/d4-p5/`) across all 6 biomes (including Biome 6 Storm) + in-run HUD + D-pad + first-run steer hint at `360×640` and `360×780` (0 console errors).
- Owner browser & mobile playtest sign-off confirming 60 fps smooth steering and cohesive D4 visual polish end-to-end.
