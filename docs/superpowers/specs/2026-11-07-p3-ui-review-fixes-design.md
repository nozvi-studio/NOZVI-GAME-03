# P3 UI review fixes — design
Status: Approved by owner 2026-11-07. Source: independent agy Playwright review (PLAYTEST 2026-11-07 "P3 UI review"), phases 1, 2, 3, 5. Finding IDs (LAY/COL/JUI/POL) refer to that review.

## 1. Goal
Remove board occlusion, fix dark-theme readability and the clear layout/polish faults found by the review, without changing gameplay rules, sim, RNG or `balance` gameplay numbers.

## 2. Owner rulings (2026-11-07)
- Banners: option A, a compact strip at the top edge inside the board.
- JUI-03 (death flash under reduced motion): dropped, not done.
- COL-02: approved, bright outline on the snake in biome 6.
- Phase 4 findings are not in scope (wait for the owner playtest log).

## 3. Wave 1 — board occlusion (UIFIX-R1..R3)
- **UIFIX-R1 Banner strip (COL-03, JUI-02).** All in-run banners (level up, challenge, new hazard, biome, checkpoint, "Fresh start!", skill pills) draw as one strip: inside the board, flush with its top edge, height ~1.5 cells, background alpha ~0.85, icon + title + at most one short sub line (longer tips are cut to one line). Queue, timing and motion unchanged; only geometry and drawing change. The death card (RUN OVER) keeps its current large card.
- **UIFIX-R2 Reject toast (JUI-01).** "Need X energy" shows as a small bubble just above the tapped skill button, plus the existing nope shake. Never over the board.
- **UIFIX-R3 Waiting prompt (LAY-01, POL-03).** While flow status is `waiting`, the prompt shows in the chip row below the board (replacing the checkpoint chip until the first input). Text: "Swipe to steer!" on touch-capable devices, else "Press an arrow to go!" (new text key, provisional string).

## 4. Color (UIFIX-R4, R5)
- **UIFIX-R4 Dark theme (COL-01, COL-04).** Add dark-theme text and card tokens in `uiTokens`; apply to HUD title, biome name, Pause and Settings cards. Every text/background pair used in dark theme reaches contrast >= 4.5:1 (tested with a WCAG ratio helper).
- **UIFIX-R5 Snake rim (COL-02).** A per-biome optional snake outline color in the biome look (set for biome 6 only); body blocks and head get a bright outline. Skin-agnostic. Contrast of rim vs biome 6 ground >= 3:1 (tested).

## 5. Wave 2 — layout (UIFIX-R6..R11)
- R6 D-pad raised ~24 mockup px and wider gap from the left skill button (LAY-02).
- R7 Pause and Settings hit areas >= 48 px, inside the top safe area (LAY-06).
- R8 Boot shows the title immediately with a system-font fallback, swapped when fonts load (LAY-05).
- R9 Loadout skill cards compact on heights < 700 CSS px (LAY-07).
- R10 Home: "Start from L1" demoted to a secondary button/link (POL-01). Results: remove the duplicate top-left back button (LAY-08).
- R11 Art preview: reserve space so the live capy does not overlap the widget row (LAY-04).

## 6. Wave 3 — polish (UIFIX-R12..R15)
- R12 Skill cost text turns red when not affordable (JUI-04).
- R13 All D-pad buttons share one border style (COL-05).
- R14 Settings toggles get a track border matching the cards (POL-02); "Quit run" gets a soft red accent (POL-04).
- R15 LAY-03: reproduce "Next checkpoint at L10" with a normal (non-debug) run that unlocks L10; fix only if it reproduces.

## 7. Testing
- Pure layout/colour helpers stay in pure modules (`hudLayout`, `banners`, `uiTokens`, menu layout files) and get Vitest tests named with the UIFIX-Rn ID.
- Contrast tests compute WCAG ratios from the token hex values.
- Each wave: one branch from `version/v0.3`, full `npm test` + `npm run typecheck` before merge.
- After wave 3: agy re-runs the same review brief, phases 1, 2, 3, 5, at 360x640 and 540x960; compare scores and screenshots.

## 8. Out of scope
Gameplay/balance changes, Phase 4 findings, reduced-motion death flash, new skins, Remotion assets in gameplay, final string copy (strings stay provisional for the owner batch).
