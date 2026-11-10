# UI D3 "Juicy" — mobile-first visual redesign — design
Status: Draft (design approved in chat by the owner 2026-11-10; spec awaits owner review). IDs: `D3-R<n>`.

## 1. Goal
Owner feedback 2026-11-10: the game does not look like a casual game and reads as sloppy on every screen; the D2 mockups themselves are not casual enough. Replace the D2 look with a new visual language, direction A "Juicy" (glossy, chunky, saturated), chosen by the owner from three sketches (`docs/design/mockups/d3/directions.html`, section A). Phones come first: every screen is designed for a 360x640 CSS px portrait viewport and must also hold at 390x844 and 412x915.

No gameplay rule, tuning number or save format changes. Player-facing strings stay, except the removed Board theme option (D3-R3).

## 2. Findings that drive the design (v0.3 at 360x640, headless Chrome)
- In-run: about 30% of the screen below the board is empty when no D-pad is shown; the snake head is about one cell wide and hard to read; the ground reads as a spreadsheet grid.
- Theme mix: with the OS in dark mode the HUD, board and Pause card render dark while Home stays light. Settings still offers a Dark board theme although the dark theme is parked (STATUS 2026-11-10).
- Results on a first run shows only a line, the score and a Best chip in a mostly empty screen; no button was visible about 13 s after death in the headless capture. Not yet confirmed as a defect (headless runs at about 12 fps); U4 must reproduce or rule it out first.
- Settings icons are rough and do not share a style with the rest.

## 3. Owner rulings (2026-11-10)
1. Direction A "Juicy" is the base for the whole UI.
2. The lead decides technical and visual details; the owner checks mockups and the build by eye.
3. Order of work: U0..U6 (§9), one branch each, U0 mockups reviewed by the owner before UI code.

## 4. Visual language (D3-R1, R2)
**D3-R1 tokens.** `src/game/uiTokens.ts` gains a `d3` group; D2 groups are removed as their last user is migrated (no parallel dead tokens at the end of U5). Starting values, from the approved sketch:

| Token | Value |
|---|---|
| Screen background | radial gradient `#7FD8FF` -> `#3FB2F2` -> `#1F86D8`, centre at 50% / 38%; ray fan: white alpha 0.13, 9 deg on / 9 deg off |
| Ink (outlines, lips on blue) | `#145A9C`, deep `#0F4578` |
| Text on light surfaces | `#173B63` |
| Light surface (chips, round buttons, panels) | `#FFFFFF` -> `#E6F1FA` |
| Primary button (green) | face `#8DF06A` -> `#3FC23D` -> `#2EA634`, outline `#17661F`, lip `#114F18` |
| Secondary button (butter) | face `#FFF6D6` -> `#FFE08A`, outline `#A86A10`, lip `#7D4D08`, text `#6B3F05` |
| Danger button | face `#FF8A8A` -> `#F04B4B`, outline `#9C1F3F`, lip `#7A1430` |
| Ribbon | face `#FF5A7A`, outline `#9C1F3F` |
| Mango / progress fill | `#FFE36B` -> `#FFAB1A`, outline `#A85A00` |
| Energy fill | `#8FF0FF` -> `#22B8E6` |
| Bar track | `#0F4578`, outline `#0B3560` |
| Skill A / Skill B | purple `#B48CFF` -> `#7A47E6`, outline `#3B1F7A`, lip `#2A1459`; orange `#FFC457` -> `#FF8A1F`, outline `#8A4A12`, lip `#6E390B` |
| Snake | body `#6F7DFF`, outline `#2B2F9E`, head `#7F8CFF`, belly `#CFD6FF`, highlight white alpha 0.4 |
| Board (biome 1) | frame `#1D6B2A`, cells `#A6E25A` / `#93D648` |

Shape rules: outline 3 px (4 px on the primary button and skill buttons), bottom lip 4 px (8 px primary, 6 px skill), gloss = white 0.55 -> 0.08 band on the top third, corner radius = half height for pills and 28 px for the primary button. Display type: Lilita One, white fill, outline in the element's outline colour, 3-4 px drop in the same colour. Body type: Nunito 900.

**D3-R2 contrast.** Text on its surface keeps a contrast ratio of at least 4.5:1 (3:1 for display type of 24 px or more); snake, mango, rocks and warn tiles keep at least 3:1 against both cell colours of every biome. Covered by unit tests with the existing `contrastRatio` helper.

**D3-R3 one theme.** The UI and the board always render the light D3 look. `prefers-color-scheme` is no longer read; the Settings "Board theme" card is removed. The save field `boardTheme` stays in the envelope (no save version bump) and is ignored. `prefers-reduced-motion` and the Reduced motion setting keep working as today.

**D3-R4 biomes.** Each of the 6 biomes defines: screen background gradient (3 stops), board frame colour and the two cell colours. The ground is a two-tone checker of one hue (lightness step only), no grid lines. Biome 1 is the table above; the other five are derived from the current biome hues and fixed in U0.

## 5. Skin kit (D3-R5, R6)
**D3-R5 rendering.** New folder `src/game/ui/skin/`:
- `skinSpec.ts` (pure): per widget kind and tone, the paint recipe (gradient stops, outline, lip, gloss rect, radius) computed from tokens and a pixel size. Unit tested.
- `skinPaint.ts`: paints a recipe on a Canvas2D context (rounded rect, gradient, gloss, outline, lip).
- `skinTextures.ts`: `skinTexture(scene, kind, tone, w, h)` returns a cached texture key (`d3/<kind>/<tone>/<w>x<h>@<dpr>`); textures are created once per size and device pixel ratio and dropped on scene shutdown only when unused.

Widget kinds: `button` (primary, secondary, danger, light), `round` (icon button), `chip`, `panel`, `bar` (track + fill), `ribbon`, `skill` (A, B, disabled). No per-frame `Graphics` redraw for static UI; only bar fills and the skill charge ring update, and only when their value changes.

**D3-R6 widget API.** `pillButton`, `card`, `chip`, `titleText`, `progressBar`, `roundIconButton` keep their call signatures where possible and switch to skin textures inside, so scenes change little. MOT-1 feedback (press scale, slide) keeps working on the new objects; the press state also moves the face down by the lip depth.

## 6. Layout (D3-R7..R9)
**D3-R7 units.** The mock unit stays 390 wide (`ui()` scale, no rescale of existing layout code). Layouts are anchored (top group, board, bottom group) and adapt to height; a compact tier applies when the scaled height is under 700 mock px.

**D3-R8 touch.** Every tappable target is at least 48 CSS px in both axes at 360 wide; primary actions sit in the lower 45% of the screen; safe-area insets are respected at the top and bottom.

**D3-R9 in-run.** Top: Pause (left), level ribbon (centre), score chip (right); below it the mango progress bar with the `eaten/quota` label. The board uses the full width minus 10 px side padding. Bottom group, always present: skill A (left), skill B (right), energy bar and the steer hint between them, checkpoint chip under it. With the D-pad setting on, the D-pad takes the centre of the bottom group and the energy bar moves above it. On taller screens the spare height is split above and below the bottom group; nothing is left as one empty band. Runs with no skill unlocked show the two slots as locked buttons.

## 7. Screens (D3-R10..R19)
- **D3-R10 Boot:** D3 background, logo, loading bar in the mango fill.
- **D3-R11 Home:** Best chip (top left), Settings round button (top right), two-line logo (MANGO in mango yellow, SNAKE in white), hero snake with mango on the ray fan, primary PLAY, secondary "Start at L<n>" (existing checkpoint rule), existing links (Start from L1, Loadout entry) as secondary buttons or chips. Home idle motions (breath, Play pulse) are kept.
- **D3-R12 Board art:** frame with inner top shadow; checker ground per biome; the snake head is drawn 1.4 cells wide (visual only; collision, anchors of ART-001 and the skin system are unchanged); body 0.76 cell with outline and a highlight stripe; mango with outline, shine and a soft white halo; rocks as shaded pebbles; warn tiles as a dashed red tile. Other hazards (fences, hedges, mud, ice, coconut lanes, bombs, NPCs, spikes, shrink ring) are recoloured for D3-R2 and get outlines; their shapes and timing stay.
- **D3-R13 HUD top:** per D3-R9; the challenge star and level label rules of `hudText.ts` stay.
- **D3-R14 Skill buttons:** `skill` skins; charge ring and the R12 energy gauge kept; cost badge bottom right; disabled = grey face, no gloss.
- **D3-R15 Pause / Countdown:** `panel` on a 50% ink scrim; Resume primary, Settings light, Quit run danger; the countdown digit uses display type in mango yellow.
- **D3-R16 Banners, tips, skill pills:** `panel`/`chip` skins inside the existing banner strip rects (UIFIX-R1/R2 occlusion rules stay).
- **D3-R17 Death card:** "RUN OVER" on a ribbon over a `panel`; death line below; tap-skip rule kept.
- **D3-R18 Results:** `panel` with score (count-up kept), Best chip, level reached with biome name, mangoes eaten, new checkpoints, energy saved; primary "Play again" and light "Home" in the lower 45%; a first run shows the same panel (no empty layout). The MOT-2 sequence order and its 1500 ms cap stay.
- **D3-R19 Loadout / Settings:** skill cards and setting rows on `panel`s; one icon set in a single style (2.6 px rounded strokes or solid shapes) for Settings, HUD and Loadout; toggles as `bar`-style tracks with a round knob.

## 8. Testing (D3-R20)
- Unit: tokens (valid colours, contrast D3-R2), `skinSpec` recipes, layout rects at 360x640, 390x844 and 412x915 (no overlap, touch size D3-R8, inside safe area), settings view without the theme row, palette always light.
- Visual: a screenshot pass per sub-phase with the dev server and headless Chrome over DevTools (DECISIONS 2026-11-10) at the three sizes, light and dark OS scheme, compared with the U0 boards; results recorded in `docs/PLAYTEST.md`.
- Each merge: `npm test` and `npm run typecheck` pass; the game starts with no console errors.
- Performance: no static UI redraw per frame; texture count and memory reported once in U6. The 60 fps check on a mid-range phone stays an owner/device item.

## 9. Delivery order
| Phase | Content | Gate |
|---|---|---|
| U0 | D3 boards (HTML, 360x640) for Loadout, Pause, Countdown, banners, Death card, Results, Settings and biomes 2-6; `UI-MOCKUPS.md` rewritten for D3; `d3` tokens | Owner eye-check of the boards |
| U1 | Skin kit + widget kit on D3 (D3-R5, R6), D3-R3 one theme | tests + typecheck |
| U2 | Boot, Home (D3-R10, R11) | screenshot pass |
| U3 | HUD top, board art, bottom group, skill buttons (D3-R9, R12..R14) | screenshot pass |
| U4 | Pause, Countdown, banners, Death card, Results (D3-R15..R18); Results button check | screenshot pass |
| U5 | Loadout, Settings (D3-R19); remove dead D2 tokens | screenshot pass |
| U6 | Three-size review, contrast and touch audit, PLAYTEST record, owner build check | Owner eye-check |

## 10. Out of scope
New features or currencies (the sketch shows none), skins shop, marble machine, dark theme, landscape and desktop layouts, new sounds, string changes other than D3-R3, any change to `src/core/`, `src/meta/` rules or `config/balance.json` gameplay numbers.
