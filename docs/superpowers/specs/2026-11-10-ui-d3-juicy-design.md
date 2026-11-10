# UI D3 "Juicy" — mobile-first visual redesign — design
Status: Draft (design approved in chat by the owner 2026-11-10; spec awaits owner review). IDs: `D3-R<n>`. Owner addition 2026-11-10: visual interaction feedback (§7b, D3-R21..R28).

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
3. Order of work: U0..U7 (§9), one branch each, U0 mockups reviewed by the owner before UI code.

## 4. Visual language (D3-R1, R2)
**D3-R1 tokens.** `src/game/uiTokens.ts` gains a `d3` group; D2 groups are removed as their last user is migrated (no parallel dead tokens at the end of U6). Starting values, from the approved sketch:

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

**D3-R2 contrast.** Plain text keeps a contrast ratio of at least 4.5:1 against the middle stop of its surface. Outlined display type (white fill with an outline) is measured outline against fill, at least 4.5:1. On the board, the outline (or rim) colour of the snake, mango, rocks and warn tiles keeps at least 3:1 against both cell colours of every biome. Covered by unit tests with the existing `contrastRatio` helper.

**D3-R3 one theme.** The UI and the board always render the light D3 look. `prefers-color-scheme` is no longer read; the Settings "Board theme" card is removed. The save field `boardTheme` stays in the envelope (no save version bump) and is ignored. `prefers-reduced-motion` and the Reduced motion setting keep working as today.

**D3-R4 biomes.** Each of the 6 biomes defines a screen background gradient (3 stops), a board frame colour and two cell colours. The ground is a two-tone checker of one hue (lightness step only), no grid lines.

| Biome | Background stops | Frame | Cells |
|---|---|---|---|
| 1 Mango Orchard | `#7FD8FF` `#3FB2F2` `#1F86D8` | `#1D6B2A` | `#A6E25A` `#93D648` |
| 2 Rice Paddy | `#8FE8D8` `#3CC4B4` `#1C9A8E` | `#7A6A1C` | `#E3E07A` `#D2D062` |
| 3 Frozen Pond | `#B9C8FF` `#7F92F0` `#5565D6` | `#2C5D8F` | `#D6F1FF` `#BFE6FA` |
| 4 Rocky Hills | `#FFD9A0` `#F5A65B` `#DB7A35` | `#6B4A2B` | `#E9D3A6` `#D9BF8A` |
| 5 Backyard | `#A8E6A0` `#5CC46A` `#2F9E4E` | `#9C4A2A` | `#F6C9A0` `#EDB583` |
| 6 Storm Garden | `#6A5ACD` `#41358F` `#241C5C` | `#15103A` | `#4A3F86` `#41377A` |

Board outline colours: snake `#2B2F9E`, mango `#8A4500`, rock `#4A5563`, warn `#C81E1E`; biome 6 uses the light set snake rim `#7CF2D4`, mango `#FFF3C4`, rock `#D5DCE6`, warn `#FF9A9A`. All pairs meet D3-R2 (lowest 3.15:1). U0 may adjust a value only if the boards show a problem; the table is then updated in the same commit.

## 5. Skin kit (D3-R5, R6)
**D3-R5 rendering.** New folder `src/game/ui/skin/`:
- `skinSpec.ts` (pure): per widget kind and tone, the paint recipe (gradient stops, outline, lip, gloss rect, radius) computed from tokens and a pixel size. Unit tested.
- `skinPaint.ts`: paints a recipe on a Canvas2D context (rounded rect, gradient, gloss, outline, lip).
- `skinTextures.ts`: `skinTexture(host, kind, tone, w, h, state, unit)` returns a cached texture key (`d3/<kind>/<tone>/<state>/<w>x<h>`, game px); a texture is painted once per key and kept for the life of the game. U7 reports the key count; more than 120 keys is a defect.

Widget kinds: `button` (primary, secondary, danger, light), `round` (icon button), `chip`, `panel`, `bar` (track + fill), `ribbon`, `skill` (A, B, disabled). No per-frame `Graphics` redraw for static UI; only bar fills and the skill charge ring update, and only when their value changes.

**D3-R6 widget API.** `pillButton`, `card`, `chip`, `titleText`, `progressBar`, `roundIconButton` keep their call signatures where possible and switch to skin textures inside, so scenes change little. MOT-1 feedback (press scale, slide) keeps working on the new objects; the press state also moves the face down by the lip depth.

## 6. Layout (D3-R7..R9)
**D3-R7 viewport.** Today the canvas is a fixed 540x960 (9:16) with `Scale.FIT`, so a 19.5:9 phone shows the game on about 82% of its height between two page-coloured bands. New rule: the logical canvas stays 540 wide and its height is chosen once at boot from the viewport aspect, `clamp(round(540 * vh / vw), 960, 1200)` (9:16 gives 960, 19.5:9 gives 1170). Scale mode stays FIT. Layouts read the height when a scene is created; module-level constants derived from the height become functions. A rotation or resize takes effect at the next scene start. Bands that remain (viewports wider than 9:16 or taller than 20:9) show the outer stop of the current biome background through the page background. The mock unit stays 390 wide (`ui()`); a compact tier applies when the height is 960.

**D3-R7b sharpness (spike).** The canvas backing store is 540 px wide and is upscaled about 2x on a 3x phone. U2 measures edge and text sharpness on a 3x viewport with before/after captures of a render scale (canvas 540*R wide, cameras zoomed by R). The result and the decision go to DECISIONS; the render scale is implemented only if the captures show a clear gain and the owner agrees.

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

## 7b. Visual interaction feedback (D3-R21..R28)
How the UI answers the player's touch. Builds on MOT-1 (press scale, toggle slide), MOT-3 and MOT-4; those rules stay and are restyled. All numbers live in `config/balance.json` (`motion.d3`), none in code.
- **D3-R21 state table.** Every tappable widget has five visual states: rest, pressed, disabled, selected, attention. Pressed: the face moves down by the lip depth, the lip shrinks to 1 px, the gloss alpha is multiplied by 0.5, plus the MOT-1 press scale. Disabled: `off` tone, no gloss, MOT-1 disabled alpha. Selected: a 4 px mango-yellow ring outside the outline and a 2 px lift. Attention: MOT-2 pulse plus one gloss sweep per pulse.
- **D3-R22 touch-down first.** The pressed state shows on pointer down within one frame, not on release; sliding off the target cancels it without firing the action (existing `bindPress` rule).
- **D3-R23 tap burst.** Firing a primary or skill button spawns a ring (scale 0.6 -> 1.4, 220 ms) and 6 sparks in the button's face colour at the touch point. Secondary, light and danger buttons get the ring only.
- **D3-R24 denied.** Tapping a disabled or unaffordable control shakes it (3 cycles, 6 px, 240 ms) and flashes its cost badge in the danger colour; the existing "nope" sound and haptic stay.
- **D3-R25 steer feedback.** In a run, a swipe draws a fading trail under the finger (last 120 ms of the path, white alpha 0.5, 6 px) and, when a direction is accepted, a chevron pops at the snake head pointing that way (160 ms). Keyboard and D-pad input show the chevron only. A queued turn that the sim rejects shows no chevron.
- **D3-R26 first-input hint.** While the run waits for the first input (MEC-001-R2), a finger glyph loops a swipe gesture over the bottom group next to the existing hint text; it stops at the first accepted input. Shown on touch devices only; keyboard devices keep the text hint.
- **D3-R27 value changes.** Bars fill with the MOT-4 ease and a bright leading edge (white alpha 0.6, 4 px) that fades when the fill stops; a skill button that becomes affordable plays one gloss sweep and the MOT-4 ready dip; a filled mango bar flashes white once.
- **D3-R28 reduced motion.** With reduced motion on: no sparks, no shake, no gloss sweep, no trail, no finger loop (a static glyph instead). Pressed, disabled and selected states still change instantly, the ring shows as a 120 ms fade, the chevron shows without the pop, and the cost badge still flashes.
- Limits: at most 24 live burst particles; bursts and trails are pooled; no new per-frame redraw of static UI.

## 8. Testing (D3-R20)
- Unit: interaction state recipes, burst/shake/trail math and the reduced-motion table (D3-R21..R28); tokens (valid colours, contrast D3-R2), `skinSpec` recipes, layout rects at 360x640, 390x844 and 412x915 (no overlap, touch size D3-R8, inside safe area), settings view without the theme row, palette always light.
- Visual: a screenshot pass per sub-phase with the dev server and headless Chrome over DevTools (DECISIONS 2026-11-10) at the three sizes, light and dark OS scheme, compared with the U0 boards; results recorded in `docs/PLAYTEST.md`.
- Each merge: `npm test` and `npm run typecheck` pass; the game starts with no console errors.
- Performance: no static UI redraw per frame; texture count and memory reported once in U7. The 60 fps check on a mid-range phone stays an owner/device item.

## 9. Delivery order
| Phase | Content | Gate |
|---|---|---|
| U0 | QA screenshot tool; D3 boards (HTML, 360x640 and 390x844) for every screen not in the direction study; `UI-MOCKUPS.md` rewritten for D3; `d3` tokens (D3-R1, R2, R4) | Owner eye-check of the boards |
| U1 | Skin kit + widget kit on D3 (D3-R5, R6), one theme (D3-R3), widget states and touch feedback (D3-R21..R24, R28) | tests + typecheck |
| U2 | Viewport: adaptive canvas height, band colour, sharpness spike (D3-R7, R7b) | tests + captures at three sizes |
| U3 | Boot, Home (D3-R10, R11), attention sweep | screenshot pass |
| U4 | HUD top, board art, bottom group, skill buttons (D3-R9, R12..R14), steer feedback, first-input hint, value changes (D3-R25..R27) | screenshot pass |
| U5 | Pause, Countdown, banners, Death card, Results (D3-R15..R18); Results button check | screenshot pass |
| U6 | Loadout, Settings (D3-R19), selected state; remove dead D2 tokens | screenshot pass |
| U7 | Three-size review, contrast, touch and texture audit, PLAYTEST record, owner build check | Owner eye-check |

## 10. Out of scope
New features or currencies (the sketch shows none), skins shop, marble machine, dark theme, landscape and desktop layouts, new sounds, string changes other than D3-R3, any change to `src/core/`, `src/meta/` rules or `config/balance.json` gameplay numbers.
