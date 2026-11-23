# D4 Phase 4 Spec — Remaining Meta Menus & Gameplay Overlays (DOM)

**Date:** 2026-11-23
**Status:** Approved (incorporates independent UI/UX & Technical Architecture audits)
**Parent Umbrella:** `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`
**Phase:** 4 of 5 (`D4-P4`)
**Depends on:** `D4-P1`, `D4-P2`, `D4-P3`

---

## 1. Objective
Migrate the remaining meta screens (**Results**, **Settings**, and **Loadout** if retained for skill switching) and three in-run modal overlays (**Pause**, **Countdown**, **DeathCard**) to the D4 HTML/CSS overlay layer, adding mascot emotional payoff on Results, fixing keyboard leaks into `GameScene`, and fixing the duplicate checkpoint chip bug on Pause.

## 2. Requirements

### 2.1 Results Screen — Emotional Payoff Without Boxes-in-Boxes (`D4-P4-R1`)
Implemented in `src/game/dom/screens/resultsScreen.ts`, driven by pure `resultsView`:
- **Warm Canvas, Zero Nested Boxes:** `--d4-bg` canvas with subtle tropical watermark (no outer card containing 3 inner bordered cards).
- **Mascot Reaction + Outcome Header:**
  - Compact `HeroStage` at the top displaying `win` (on new best / victory) or `hurt` (on crash) expression + short contextual speech bubble (e.g. death cause or *"New record!"*).
  - Display header in `Lilita One`: `GAME OVER`, `NEW BEST!`, or `VICTORY!`.
- **Hero Score + Best:** Large `52px` bold score with **odometer count-up** (`D4-P2-R4`) + inline `Best N` pill (crisp trophy SVG icon). New Best triggers `burstConfetti`.
- **3-Column Stat Strip:** `LEVEL`, `EATEN`, `BIOME` separated by `1px solid var(--d4-border)` vertical hairlines (zero nested boxes).
- **Full `resultsView` Parity:** Render `carriedEnergy` chip (when > 0), `firstRunTip` copy (on first run), and flat checkpoint progress bar with flag icon + passive status label (`Next run starts at L4!`, zero fake-button lip).
- **Actions:** Feather Green `Play again` (`data-qa="results-again"`, `56px`) + neutral white tactile `Home` button (`data-qa="results-home"`, `48px`, `2px solid var(--d4-border)`, `4px` lip).

### 2.2 Settings Screen — Full & Overlay Modes (`D4-P4-R2`)
Implemented in `src/game/dom/screens/settingsScreen.ts`, driven by pure `settingsView` / `settingsApply`:
- Supports both full-screen mode (from `Home`) and modal sheet mode (from `Pause`), preserving `{ overlay, returnTo }`.
- Single clean white `4px`-lip card with hairline dividers between the 4 rows (`Sound`, `Haptics`, `On-screen D-pad`, `Reduced motion`).
- Soft pastel rounded-square icon badges (`#DDF4FF`, `#F3E5FF`, `#D7FFB8`, `#FFF5CC`) containing crisp Duotone SVG icons.
- Modern flat pill toggles (`#58CC02` on / `#E5E2DC` off, smooth 180 ms knob slide). Toggling `Reduced motion` updates `#ui-root.reduced-motion` via `reduceMotion()` immediately.

### 2.3 Loadout Screen (Clean D4 Skill Picker) (`D4-P4-R3`)
Implemented in `src/game/dom/screens/loadoutScreen.ts`, driven by pure `loadoutView` / `loadoutEdit` (preserving full `loadoutView` parity: `titleKey` supporting both `Pick 1 skill` when `slotCount === 1` and `Pick 2 skills`, `startAt` level chip, and `carried` energy badge):
- Single-border selection (`2px solid #1CB0F6` + `#DDF4FF` tint + compact `Slot 1`/`Slot 2` badge — zero triple yellow+navy+orange borders).
- Clean Sky Blue energy cost pills (`bolt + 40`), balanced copy wrapping (no orphan `"3 s"`), muted locked card for `Mango Rain`.
- Note: Since Home `PLAY` skips Loadout per Phase 3 owner ruling, `Loadout` remains accessible if linked from a compact Skills button or Settings/debug route (confirmed at Phase 4 kickoff; if removed from navigation entirely, its pure rules stay tested in `src/core/skills.ts`).

### 2.4 Gameplay Overlays & Keyboard Isolation (`D4-P4-R4`)
Implemented in `src/game/dom/overlays/` rendered over the visible Phaser `GameScene` canvas:
- **Keyboard Guard (Critical):** Update `src/game/input/keyboard.ts` and `HudScene.ts` to gate all Phaser game/HUD keys (`Space`, `Escape`, `KeyP`, `KeyM`, arrows, WASD) on `!uiHost.isModalOpen()`, preventing unpausing behind `Settings` or double-handling `Escape`.
- **Pause Overlay (`pauseOverlay.ts`):** Frosted scrim (`rgba(20, 25, 35, 0.35)` + `backdrop-filter: blur(6px)`), crisp white `24px`-radius sheet with spring pop-in, **single** flat checkpoint chip (fixes U5 duplicate-chip bug), `Resume` (green), `Settings` (neutral), and `Quit run` (soft coral tint).
- **Countdown Overlay (`countdownOverlay.ts`):** Centered crisp mango-gold countdown numeral (`3` → `2` → `1` → `GO!`) with spring scale pulse over a light scrim + full `countdownCard()` checkpoint ramp notice chip.
- **DeathCard Overlay (`deathCardOverlay.ts`):** Clean centered modal sheet with humorous `DEATH_LINES` copy, locked against accidental tap for `balance.juice.death.skipLockMs`, then tap-anywhere-to-continue into `Results`.

## 3. Verification & Exit Gate
- Vitest (`happy-dom`) unit tests for `resultsScreen` (including `firstRunTip`, `carriedEnergy`, odometer, confetti), `settingsScreen` (full + overlay + `reduceMotion()`), `loadoutScreen` (`slotCount === 1` and `2`), `pauseOverlay` (single checkpoint chip), `countdownOverlay` (`countdownCard`), `deathCardOverlay` (skip lock), and Phaser keyboard-guard isolation (`keyboardOverlay.test.ts` updated).
- Full `npm test` + `npm run typecheck` pass.
- Headless Chrome QA screenshots (`tmp/qa/d4-p4/`) of all screens/overlays at `360×640` and `360×780` (0 console errors), approved by owner eye-check.
