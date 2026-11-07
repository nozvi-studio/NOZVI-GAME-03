# UI-MOCKUPS - visual source of truth for the new (D2) UI
Status: Draft. Added 2026-11-06 for P3 (juice + screens). Owner: design (Claude Design project "Mango Snake - D2 design").

## 1. What this is
The owner's D2 mockups were made in a Claude Design artifact (not Figma). They are committed here as **code** so an AI can implement P3 screens from them offline. **Code is the primary reference; PNG is for visual cross-checking only.**
- `docs/design/mockups/html/<Board>.html` - **primary.** Static standalone HTML per board (no scripts, no runtime): every div, inline style (px sizes, radii, gaps, colours), SVG path and copy text as rendered in the default state. `html/index.html` lists all boards; links between boards work. Fonts load from Google Fonts (Nunito, Lilita One).
- `docs/design/mockups/src/<Board>.dc.html` - original component source with the tweakable props (`data-props`: `skin`, `state`, `tweak`...) and the logic that computes positions. Use it to read variants and conditional blocks that the static HTML does not show.
- `docs/design/mockups/src/canvas.json` - board list, sizes, titles, canvas positions and section titles (P1 core loop, P3 settings and biomes, P4 meta, head rig).
- `docs/design/mockups/png/<Board>.png` - 2x screenshots (390x844 CSS px for screens). **Reference only**: compare your result against them, never copy numbers from pixels.
- `docs/design/mockups/export-html.example.js`, `render.example.js` - the scripts that produced the HTML and PNG (section 5).
Original artifact: https://claude.ai/artifact/9zVMtmVhjWzeHeyWwjQ9JX (owner-shared; may change after this snapshot).

## 2. Rules for agents
1. The HTML (then `.dc.html` for variants) wins over any assumption about look and feel; the PNG only confirms it. Gameplay rules still come from GDD / MEC specs; if a mockup shows behavior that conflicts with a spec, stop and ask (AGENTS section 5).
2. Do not hard-code colours or sizes in scenes: put them in one UI token module (create `src/game/uiTokens.ts` or the balance `ui` block when the first screen is ported) using section 3.
3. Mockups are HTML/SVG; Phaser scenes must reproduce them with text, graphics and generated textures (SVG to texture as done for capy in `src/game/art/`). Do not embed the `.dc.html` files in the game.
4. Only the default state of each board is exported. Read `data-props` in `src/*.dc.html` for the other options (skins, Results states, Home first run) and their conditional blocks.
5. Replaced visuals update this doc in the same PR (status column below).

## 3. Design tokens (from `PaletteD2.dc.html`)
Rule of thumb: warm cream base, one strong colour per screen (green CTA), pastels elsewhere, never pure black. Fonts: Nunito 700/800/900 (UI), Lilita One (logo/title letters, outline `#6B4C82`, drop shadow 0 6px 0 same colour). Pill/card shadow: `0 4px 10px -3px rgba(110,80,70,.15)`. Portrait 390x844 reference, 16px side padding, pills fully rounded.
| Group | Tokens |
|---|---|
| Surfaces | Cream `#F8F2E8` (screen bg) - Card `#FFFCF6` - White `#FFFFFF` - Sand `#EFE6D8` - Stone `#E3DCD2` - Peach `#FBE3C8` |
| Text | Plum brown `#5A3B3B` (primary) - Soft brown `#8A6A6A` - Faint `#B79F8A` - Slate `#3F4D5E` (labels on hill) - Logo outline `#6B4C82` - Walnut `#B98558` |
| Action green | face `#79D391` - shade `#5DB878` - deep `#4A9A63` (shelf) - line `#3E7A52` (label outline) - Board mint `#CFEBD0` / `#C2E4C6` |
| Accents | Orange `#F4A157` / deep `#DB8238` - Butter `#F8D468` - Star gold `#FFC845` - Pink `#F6C2D3` - Periwinkle `#8EA0FF` (marbles) |
| Sky and hill | `#B3DEF3` to `#9DD3EE` gradient footer hill - silhouette `#C4E7F7` - Sky stat `#BCDDF4` - Lavender `#C6B0F5` - Cyan `#3CC6DA` (energy) |
| Characters | Snake body `#6F93F5` / shade `#3F63D1` / belly `#E4ECFF`; cat `#F4A157`/`#DB8238`; dog `#E9B87F`/`#C48A4F`; capy `#C79A6B`/`#A8794D`; picker tiles pup `#FBE7B0`, capy `#D7EBD2`, snake `#DCE5FF` |

## 4. Screen map (mockup board -> code)
Code column uses CODEMAP names. "planned" = no scene yet; check `docs/CODEMAP.md` before assuming.
| Board (png/src base name) | Purpose | Target code | Phase |
|---|---|---|---|
| `BootD2` | Loading screen, logo, progress bar | `scenes/BootScene.ts`, `flow/bootView.ts` | done (P3b-3, P4 elements hidden) |
| `HomeD2` (prop `firstRun`, `skin`) | Home: currencies, logo, hero panel, Play + Start at Lx / energy, Skins, Marbles | `scenes/HomeScene.ts`, `flow/homeModel.ts` | done (P3b-3, P4 elements hidden) |
| `LoadoutD2` | Pick 2 skills | `scenes/LoadoutScene.ts`, `flow/loadoutView.ts` | done (P3b-3, P4 elements hidden) |
| `GameD2`, `GameDpadD2` | In-run HUD (level, biome, mango x/y, score, energy, skill buttons, checkpoint chip), D-pad variant | `scenes/GameScene.ts`, `scenes/HudScene.ts`, `hudText.ts` | P3b |
| `PauseD2`, `CountdownD2` | Pause menu, start countdown | planned (HudScene overlays) | P3b |
| `BannersD2` (tweak `banner`), `SkillActiveD2` (tweak `skill`) | Level-up / event banners, active skill states | HudScene, `render/skills.ts` | P3a/P3b |
| `DeathD2` | Death flash/shake (reduced-motion variant) | GameScene juice | P3a |
| `ResultsD2` (prop `state`: normal/newBest/checkpointUnlocked/firstRun) | Game over | `scenes/ResultsScene.ts`, `flow/resultsView.ts` | done (P3b-3, P4 elements hidden) |
| `SettingsD2` | Settings | `scenes/SettingsScene.ts`, `flow/settingsView.ts`, `flow/settingsApply.ts` | done (P3b-3, P4 elements hidden) |
| `BiomeBoardsD2` | 6 biome board looks (tiles, fences, rocks per biome) | `render/tiles.ts`, GameScene board | P3b |
| `SkinsD3`, `SkinBuyD2`, `DuplicateD2` | Character picker, buy skin, duplicate-skin result | planned (meta) | P4 |
| `MarbleMachineD2`, `MarbleWheelD2`, `MarbleSkinDropD2`, `OddsD2` | Marble machine board, wheel bonus, skin drop, published odds | planned (meta) | P4 |
| `FullClearD2` | Level 30 full-clear screen | planned | P4 |
| `PlayerHead`, `HeadRigD2`, `HeadIcon`, `MeowHead`, `ExpressionsD2`, `ExprHeadD2` | Head rig per skin, anchors, states, expressions (draft, not wired) | `src/game/art/` (capy rig exists; see ART-001) | P3c+ |
| `Tile`, `Rock`, `FencePiece`, `FoodIcon` | Shared board parts (mud, pebble/rock/boulder/crumble/warn, fence, mango) | `render/tiles.ts` and board renderers | P3b |
| `PaletteD2` | Colour tokens (section 3) | `src/game/uiTokens.ts` (done) | P3b |
P3b-3 gameplay rulings C1-C10 (where mockups and specs disagree, spec wins) are listed in `docs/superpowers/plans/2026-11-07-p3b-3-menus.md`; the D2 screens above follow them.

Board sizes and the canvas layout: `canvas.json` (`boards.<file>.w/h`).

## 5. Refreshing the snapshot
The `.dc.html` files need the Claude Design runtime as `./support.js` (it is `artifact-type/dc-runtime.js` inside the artifact; not committed, 190 KB). To refresh: read the artifact files with the Artifact tool (`read` with `paths`), copy `project/*` plus `dc-runtime.js` renamed to `support.js` into one folder, serve it (`python3 -m http.server 8765`; `file://` fails because components are fetched), then run `render.example.js <folder> <outdir>` for PNGs and `export-html.example.js <outdir> <folder>` for static HTML (needs Playwright; the HTML script drops scripts and the `<helmet>` block and rewrites `.dc.html` links to `.html`). Static HTML vs PNG matched within 0.2% of pixels except the head-rig boards (blink animation timing). Commit only the files that changed.
