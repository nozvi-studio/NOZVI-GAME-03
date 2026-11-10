# UI D3 "Juicy" — roadmap (U0..U7)

> **For agentic workers:** this file is the map, not a task list to execute. Each phase has its own plan file with bite-sized steps. Detailed plans exist for U0 and U1; the plans for U2..U7 are written at the start of each phase from the task lists below, because their pixel numbers come from the U0 boards the owner approves.

**Goal:** replace the D2 look with the D3 "Juicy" visual language on every screen, phones first, with visible feedback for every touch.

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` (D3-R1..R28, R7b). Read the spec section named in a task before starting it.

**Tech stack:** Phaser 3.90, TypeScript strict, Vite, Vitest. No new dependency in any phase.

## Global constraints (every phase)
- English only in the repo. One branch per phase from `version/v0.3`, named `feat/ui-d3-u<n>-<topic>`; merge back with `git merge --no-ff` after `npm test` and `npm run typecheck` pass (run sequentially). On Windows run Vitest with `--configLoader native --pool threads --maxWorkers 2`.
- No change to `src/core/` rules, `src/meta/` rules, save format or gameplay numbers in `config/balance.json`. New numbers go under `motion.d3`.
- No hex colour literals outside `src/game/uiTokens.ts`, `src/game/render/biomePalette.ts` and `src/game/render/boardParts.ts`. No magic numbers: sizes come from tokens or mock-px layout tables, timings from `balance.motion`.
- Pure logic (recipes, layout rects, curves, state tables) lives in Phaser-free files with unit tests; Phaser files are thin.
- Requirement ID in every test name (`D3-R5 ...`) and in a one-line comment at the implementing function.
- Each commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. A new or moved module updates `docs/CODEMAP.md` in the same branch. `docs/STATUS.md` is rewritten at the end of each session.
- Static UI is never redrawn per frame. Reduced motion (D3-R28) is honoured by every new effect.
- Visual check per phase: `node tools/qa/shot.mjs` (U0 Task 1) at 360x640, 390x844 and 412x915, compared with the boards in `docs/design/mockups/d3/`; findings recorded in `docs/PLAYTEST.md`.
- Workers: Sonnet/Haiku subagents implement and review, Opus does the final review of a phase; the lead verifies each merge. Art and layout judgement calls need a screenshot, not a guess.

## File structure (target at the end of U7)
| Path | Responsibility | Phase |
|---|---|---|
| `tools/qa/shot.mjs` | Headless Chrome driver over DevTools: viewport, colour scheme, taps, keys, screenshots | U0 |
| `docs/design/mockups/d3/boards.html`, `d3.css`, `png/` | D3 boards for every screen, the visual source of truth | U0 |
| `src/game/uiTokens.ts` (`TOKENS.d3`) | D3 colours, shape numbers, biome table | U0 |
| `src/game/ui/skin/skinSpec.ts` | Pure paint recipes per kind, tone, state | U1 |
| `src/game/ui/skin/skinPaint.ts` | Canvas2D painter for a recipe | U1 |
| `src/game/ui/skin/skinTextures.ts` | Texture cache keyed by recipe | U1 |
| `src/game/ui/interactionModel.ts` | Pure burst, shake, plan tables (D3-R23, R24, R28) | U1 |
| `src/game/ui/touchFx.ts` | Pooled ring and sparks, denied shake | U1 |
| `src/game/ui/widgets.ts`, `menuWidgets.ts`, `geometry.ts`, `pillTones.ts` | Widget kit painted with skins | U1 |
| `src/game/viewport.ts` | `viewHeight(vw, vh)`, `initViewport()`, band colour bridge | U2 |
| `src/game/layout.ts` | `HEIGHT` becomes a live value set by `initViewport()` | U2 |
| `src/game/ui/background.ts` | D3 screen background (gradient + ray fan) as one cached texture per biome and height | U3 |
| `src/game/scenes/BootScene.ts`, `HomeScene.ts`, `flow/homeModel.ts`, `ui/menuLayout.ts` | Boot and Home on D3 | U3 |
| `src/game/hud/hudLayout.ts`, `HudTop.ts`, `SkillButtons.ts`, `hud/bottomGroup.ts` (new, pure layout) | In-run layout D3-R9 | U4 |
| `src/game/render/biomePalette.ts`, `boardParts.ts`, `board.ts`, `snake.ts`, `mango.ts`, `hazards.ts`, `tiles.ts`, `movers.ts`, `cycles.ts`, `blasts.ts`, `shrink.ts` | Board art D3-R12 | U4 |
| `src/game/input/steerFx.ts` (new) + `steerFxModel.ts` (pure) | Swipe trail, direction chevron, first-input hint | U4 |
| `src/game/hud/PauseOverlay.ts`, `CountdownOverlay.ts`, `BannerLayer.ts`, `juice/DeathCard.ts`, `scenes/ResultsScene.ts`, `flow/resultsView.ts` | Overlays and Results | U5 |
| `src/game/scenes/LoadoutScene.ts`, `SettingsScene.ts`, `ui/icons.ts`, `hud/hudIcons.ts` | Loadout, Settings, one icon set | U6 |

## Interfaces shared across phases
```ts
// U0 — src/game/uiTokens.ts
TOKENS.d3.tone: Record<'primary'|'secondary'|'danger'|'light'|'skillA'|'skillB'|'off'|'ribbon'|'track'|'mango'|'energy',
  { face: readonly string[]; line: string; lip: string; text: string; outlined: boolean }>
TOKENS.d3.shape: { line, lineBig, lip, lipSkill, lipBig, pressedLip, glossTop, glossBottom, glossFrac, pressedGloss, radiusBig, radiusPanel, selectedRing, selectedLift }
TOKENS.d3.biomes: readonly { bg: readonly [string, string, string]; frame: string; cells: readonly [string, string] }[]  // index = biome - 1
TOKENS.d3.outline / outlineStorm: { snake, mango, rock, warn }

// U1 — src/game/ui/skin/
type SkinKind = 'button'|'round'|'chip'|'panel'|'bar'|'ribbon'|'skill';
type SkinTone = keyof typeof TOKENS.d3.tone;
type SkinState = 'rest'|'pressed'|'disabled'|'lip';
skinRecipe(kind, tone, w, h, state, unit): SkinRecipe
skinTexture(host: TextureHost, kind, tone, w, h, state, unit): string   // texture key
// U1 — src/game/ui/touchFx.ts
tapBurst(scene: Phaser.Scene, x: number, y: number, tone: SkinTone): void
denied(scene: Phaser.Scene, visual: MotionTarget, badge?: { setTint(c: number): unknown; clearTint(): unknown }): void
// U1 — src/core/balance.ts
MotionBalance.d3: MotionD3Balance

// U2 — src/game/viewport.ts, src/game/layout.ts
viewHeight(vw: number, vh: number): number          // clamp(round(540 * vh / vw), 960, 1200)
initViewport(win?: { innerWidth: number; innerHeight: number }): void   // sets HEIGHT before new Phaser.Game
export let HEIGHT: number                            // live binding; read at call time only
setBandColor(hex: string): void                      // page background behind the canvas

// U3 — src/game/ui/background.ts
screenBackground(scene: Phaser.Scene, biome: number): Phaser.GameObjects.Image   // also calls setBandColor
```

## Phases
### U0 — QA tool, boards, tokens
Plan: `docs/superpowers/plans/2026-11-10-ui-d3-u0-boards-tokens.md`. Gate: the owner checks the boards by eye before any UI code.

### U1 — Skin kit, widgets, touch feedback, one theme
Plan: `docs/superpowers/plans/2026-11-10-ui-d3-u1-skin-kit.md`. After U1 the old screens run with D3 buttons, chips, cards and bars; layouts are untouched.

### U2 — Viewport (D3-R7, R7b)
1. **`viewHeight` + `initViewport`.** Pure `viewHeight`; `HEIGHT` becomes `export let` set once before `new Phaser.Game`. Tests: 360x640 -> 960, 390x844 -> 1169, 412x915 -> 1199, 360x900 -> 1200 (cap), 800x600 -> 960 (floor).
2. **Audit the 41 `HEIGHT` uses (16 files).** Any module-level constant derived from `HEIGHT` becomes a function evaluated at scene create. Add a guard test (same style as `navGuard.test.ts`) that fails on `HEIGHT` used in a top-level `const` initialiser under `src/game/`.
3. **Layout tests at two heights.** `hudLayout`, `menuLayout`, `artPreviewLayout`, Results, Settings, Loadout rects: inside the canvas, no overlap, at `HEIGHT` 960 and 1170. Spare height goes to spacing between groups; the board never grows.
4. **Band colour.** `setBandColor` sets `document.documentElement.style.background`; `index.html` drops the `prefers-color-scheme` rule and starts with the biome 1 outer stop.
5. **Sharpness spike (D3-R7b).** Throwaway branch: canvas `540*R` wide with every scene camera zoomed by `R` (`R = min(devicePixelRatio, 2)`); captures at 390x844 DPR 3 before and after; DECISIONS entry with the measured frame time on the headless box and a recommendation. No merge of the spike code without the owner's decision.
6. Screenshot pass of the unchanged screens at three sizes (nothing cut off, nothing overlapping); merge.

### U3 — Boot and Home (D3-R10, R11, R21 attention)
1. **`screenBackground`.** One canvas texture per biome and height: radial gradient plus ray fan from `TOKENS.d3`; replaces `bgCream` and `hill`. Test: one texture per key, `setBandColor` called with the outer stop.
2. **Logo.** Two lines in Lilita One, MANGO in mango yellow with a `#8A4500` outline, SNAKE in white with an ink outline, deep ink under-shadow; replaces the five-colour `logoLine`.
3. **Hero.** The Home hero card is removed; the snake hero (current skin SVG, head about 144 mock px wide, body with outline and highlight, mango with halo) sits on the ray fan. Home idle breath and tongue stay.
4. **Home layout.** `menuLayout` rects for Best chip, Settings button, logo, hero, PLAY (primary, 280x84 mock px at 360 wide), "Start at L<n>", Start from L1 and Loadout entries; tests at 960 and 1170 for touch size (D3-R8) and no overlap.
5. **Attention sweep.** PLAY gets one gloss sweep per MOT-2 pulse (`motion.d3.sweepMs`); off under reduced motion.
6. **Boot.** D3 background, logo, loading bar (`bar` skin, mango fill).
7. Screenshot pass against the Home board; merge.

### U4 — In-run (D3-R9, R12..R14, R25..R27)
1. **`bottomGroup.ts` (pure).** Rects for skill A, skill B, energy bar, hint, checkpoint chip, optional D-pad, locked slots; `hudLayout` top rects for Pause, ribbon, score chip, mango bar. Tests at 960 and 1170, D-pad on and off, 0/1/2 skills.
2. **HUD top.** Ribbon (`ribbon` skin) with the level label, score chip, mango bar with the `eaten/quota` label; `hudText.ts` rules unchanged.
3. **Skill buttons.** `skill` skins (A purple, B orange, `off` when locked or unaffordable), charge ring and R12 gauge restyled, cost badge bottom right, `denied` on a refused tap, `tapBurst` on a cast.
4. **Board frame and ground.** `boardLook` returns the D3 frame and two cells per biome (grid lines removed, `theme` argument dropped); frame with inner top shadow; the screen background follows the biome.
5. **Snake.** Head drawn 1.4 cells wide, body 0.76 cell with outline and highlight stripe; biome 6 uses the rim colour. Collision and ART-001 anchors untouched; `snakeHead`/`snakeRim` tests updated.
6. **Mango, rocks, warn tiles.** New art per D3-R12 with the D3 outline colours.
7. **Other hazards.** Fences, hedges, mud, ice, coconut lanes, bombs, NPCs, spikes, gates, shrink ring: recolour and outline only; one contrast test per family against all six biomes (D3-R2).
8. **Steer feedback.** `steerFxModel.ts` (trail point pruning by age, chevron pose, accepted-only rule) and `steerFx.ts` (pooled trail graphics, chevron at the head); wired from `swipe.ts`, `keyboard.ts`, `dpad.ts`.
9. **First-input hint.** Finger glyph loop during the MEC-001-R2 waiting phase on touch devices; static glyph under reduced motion.
10. **Value changes.** Bar leading edge, skill-ready gloss sweep, mango bar full flash.
11. Screenshot pass (biomes 1..6 via `?debug=1&level=N`, D-pad on/off); merge.

### U5 — Overlays and Results (D3-R15..R18)
1. **Results button check first.** Reproduce "no button about 13 s after a first-run death" in a real browser tab at 60 fps; if it reproduces, debug with `systematic-debugging` before restyling.
2. **Pause** on a `panel` with Resume (primary), Settings (light), Quit run (danger), 50% ink scrim.
3. **Countdown** digit in display type, mango yellow.
4. **Banners, tips, skill pills** on `panel`/`chip` skins inside the existing strip rects.
5. **Death card**: RUN OVER ribbon over a panel, death line; skip rule unchanged.
6. **Results**: panel with score count-up, Best chip, level and biome, mangoes, new checkpoints, energy saved; "Play again" primary and "Home" light in the lower 45%; first run uses the same panel; `resultsView` and `resultsSeq` tests updated (1500 ms cap kept).
7. Screenshot pass; merge.

### U6 — Loadout and Settings (D3-R19, R21 selected)
1. **Icon set.** `ui/icons.ts` and `hud/hudIcons.ts` redrawn in one style; one test that every icon id renders with the shared stroke width.
2. **Selected state.** Selection ring texture (4 px mango yellow, 2 px lift) for Loadout slots and picks.
3. **Loadout** cards on panels, slot buttons as `skill` skins, cost chips.
4. **Settings** rows on one panel, toggles as bar-style tracks with a round knob (MOT-1 slide kept), no Board theme card.
5. **Remove dead D2 tokens** and `UI_THEME.dark`, `palette.DARK`, `themeLight/themeDark`; guard test: no unused key in `TOKENS`.
6. Screenshot pass; merge.

### U7 — Audit and exit
1. Three-size capture of every screen; side-by-side with the boards; fix list.
2. Audits: contrast (D3-R2) across biomes, touch sizes (D3-R8), texture key count (<= 120), tween and particle caps, console clean.
3. `docs/PLAYTEST.md` record, `docs/CODEMAP.md` and `UI-MOCKUPS.md` final pass, STATUS; owner build check on a phone (60 fps, feel of the press, burst and steer feedback).

## Risks
- **Adaptive height (U2)** touches 16 files; the guard test and two-height layout tests are the safety net. If it slips, U3..U6 still work at 960.
- **Texture memory:** many sizes of the same skin. Mitigation: mock-px sizes are rounded to integers, widgets reuse a small set of sizes, U7 audits the key count.
- **Canvas text with outlines** can look soft at 540 wide; the U2 spike decides on a render scale before the screens are rebuilt.
- **Head drawn larger than a cell** can hide a hazard in the next cell; U4 checks the worst cases (rock ahead, warn tile ahead) in screenshots and may drop to 1.25 cells.
