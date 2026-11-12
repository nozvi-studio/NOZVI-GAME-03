# ART-003 — Skin production guide (reference: Capybara)
Status: **Draft — owner has not fully approved (2026-11-07).** Rules for skins (price, rarity, shop) live in GDD §8.3 / MEC-011; this file only says how to make the art.

## 1. Inputs per skin
- One reference image or mood board in `assets/raw/reference/<skin>-*.png` (rights checked before commit).
- A palette: face fill (gradient top/bottom), ear/muzzle shade, outline (default `#4A2E1B`), eye/pupil, blush, body block color (in-game body = same-colored blocks, GDD §8.3).
- Shape notes: ear shape, muzzle size, any extra part (cat whiskers, duck bill, panda eye patches).

## 2. Steps (capy as template)
1. **Rig check.** Use the 48 × 48 box, pivot (24, 24) and anchors of ART-001 §3 unchanged (eye centres y 20.4, x 24 ± 9.6; mouth y 37.6). A skin changes shapes and colors, never anchors, so every expression and motion works for free.
2. **Layers.** Same fixed layers as capy (`ears`, `head`, `blush`, `muzzle`, `nose`) plus optional skin extras drawn between `head` and `blush`. Eye and mouth variants are shared (`capyRig.ts` `EyeVariant`, `MouthVariant`); a skin may restyle them but keeps the same names.
3. **Expressions.** Reuse the expression table (capy design spec §3): A set (`idle`, `idle_blink`, `eat_open`, `eat_chew`, `dead`) is required; B set optional (rarity, GDD §8.3).
4. **Body** (Skins/Results only): round belly + two stub feet, poses `idle`, `win`, same palette and outline.
5. **Render.** Pure SVG builder (no Phaser) → `svgDataUrl` (base64) → `load.svg` at sizes `board` 96 px and `large` 256 px. Texture keys `<skin>/head/<expression>/<size>`, `<skin>/body/<pose>/large`.
6. **One head size for every skin (D3-R12, 2026-11-12).** On the board the face is drawn `ui.capy.headCellScale` cells wide (balance.json) for every skin; the snake head disc is derived from that number (`SNAKE.headFit` in `boardParts.ts`) and stays hidden behind the face even at full gulp. The face must fill the round centre of its frame (`snakeHeadPath`); never size a skin's head on its own.
6. **Motion.** Reuse the capy motion (`capyPose.ts`, numbers in `config/balance.json` `ui.capy`); per-skin overrides only if the owner asks.
7. **Preview + review.** Open `?debug=1&artPreview=1`; check every expression at 24, 40, 124, 256 CSS px on light and dark boards; then the owner checks on a 5" phone.
8. **Tests.** Vitest per skin: all fixed layers present, anchors as §2.1, outline color/width, every expression resolves. Test names carry `ART-003` and the skin id.
9. **Docs.** CHANGELOG line; CODEMAP if files are added; DECISIONS only for a non-obvious choice.

## 3. Acceptance checklist (look at the pixels)
- [ ] Readable as the animal at 24 CSS px (silhouette alone, no color).
- [ ] Thick dark outline, same weight as capy.
- [ ] Eyes and mouth sit on the shared anchors (overlay the capy at 256 px).
- [ ] Head does not clash with any biome ground, light and dark theme.
- [ ] `dead` expression reads instantly; `eat` visible at board size.
- [ ] No console errors on the preview page.

## 4. Code work before the 2nd skin (done 2026-11-10)
Current code is capy-specific: `capyRig.ts` (`capyHeadSvg`, `capyBodySvg`, `CAPY`, `capyHeadKey`), `capyTextures.ts` (`preloadCapy`), `capyHead.ts` (`CapyHead`), balance `ui.capy`. Before skin 2:
- Split into a shared rig (anchors, eye/mouth variants, expression table, builder) + a per-skin definition (palette, ear/muzzle/extra shapes).
- Keys and preload take a skin id; `CapyHead` becomes a generic head view fed by the selected skin (MEC-011 save).
- Preview scene lists every skin.
Done: `art/skins.ts` (ids, palettes, `activeSkin()`), `headSvg/bodySvg(skin, ...)`, `headKey/bodyKey(skin, ...)`, `preloadSkins`, per-skin pose state, preview `&skin=` switch. Still open: the save-backed skin choice (MEC-011, P4) and the `CapyHead`/`capy*.ts` renames.

## 5. Fallback raster route
If a skin cannot be drawn well as SVG, use the ART-001 §6 raster pipeline (ART-002 style brief per skin) on the same anchors.

## 6. Open questions (owner)
- Q1. Approve this guide as the default for all launch skins?
- Q2. Order of the next skins (GDD §8.3 proposal: Dog, Cat, then the rest)?
- Q3. Body block color: one per skin, or derived from the head palette?
