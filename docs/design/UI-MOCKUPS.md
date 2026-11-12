# UI-MOCKUPS - visual source of truth for the D3 "Juicy" UI
Status: Draft (boards await the owner's eye-check, 2026-11-10). Spec: `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md`.

## 1. What this is
- The D3 boards in `docs/design/mockups/d3/` are the visual source of truth for every screen: `boards.html` (all boards, static HTML/SVG), `d3.css` (shared styles, CSS variables named after the tokens), `png/` (one capture per board).
- `directions.html` is the direction study (section A was chosen by the owner). `marble.html` holds the P4 marble machine and wheel mockups; they are linked from `boards.html` and are not built in U1..U7.
- The D2 files (`mockups/html`, `mockups/src`, `mockups/png`) stay as history. Do not copy colours, shapes or layout from them.
- Boards are drawn at 360x640 CSS px (the 9:16 canvas); Home, Game and Results also at 390x844. Numbers on the boards are mock px.

## 2. Rules for agents
1. Colours and shape numbers come from `TOKENS.d3` in `src/game/uiTokens.ts`, never from a hex copied off a board. If a board and a token disagree, the token wins; report the mismatch.
2. Positions and sizes come from the boards (open `boards.html`, read the inline `left/top/width/height` of the element, or measure the PNG).
3. Strings come from `src/game/text.ts`. A board never introduces copy; if a board shows text that has no key, treat it as a board defect.
4. Gameplay rules, timings and tuning numbers are not defined here (spec, MEC files and `config/balance.json` own them).
5. Open the PNG first; open `boards.html` only for the section you build (search by `id="<Board>"`).

## 3. Tokens
The token table lives in the spec §4 (D3-R1, R4) and in code as `TOKENS.d3`; `tests/game/d3Tokens.test.ts` guards the contrast rules (D3-R2). `d3.css` mirrors the values as CSS variables (`--tone-primary-face-0`, `--ink`, `--ink-deep`, `--text`, ...).

## 4. Screen map (board -> code -> phase)
| Board id | PNG (`mockups/d3/png/`) | Scene / file | Phase |
|---|---|---|---|
| `Boot` | `Boot-360` | `src/game/scenes/BootScene.ts` | U3 (built) |
| `Home` | `Home-360`, `Home-390` | `scenes/HomeScene.ts`, `flow/homeModel.ts`, `ui/menuLayout.ts` | U3 (built) |
| `Game` | `Game-360`, `Game-390` | `hud/d3HudLayout.ts`, `hud/HudTop.ts`, `hud/SkillButtons.ts`, `hud/BottomGroup.ts`, `render/*` | U4a + U4b (built) |
| `GameDpad` | `GameDpad-360` | `hud/BottomGroup.ts`, `input/dpad.ts` | U4a (built) |
| `GameLocked` | `GameLocked-360`, `-360-2` | `hud/SkillButtons.ts`, `hud/skillLook.ts` | U4a (built) |
| `GameHint` | `GameHint-360`, `-360-2` | `input/steerFx.ts`, `input/steerFxModel.ts` | U4 |
| `Biomes` | `Biomes` | `render/biomePalette.ts`, `render/boardParts.ts`, `ui/background.ts` | U3, U4b (built) |
| `Pause` | `Pause-360` | `hud/PauseOverlay.ts` | U5 |
| `Countdown` | `Countdown-360` | `hud/CountdownOverlay.ts` | U5 |
| `Banners` | `Banners-360`, `-360-2..4` | `hud/BannerLayer.ts` | U5 |
| `Death` | `Death-360` | `juice/DeathCard.ts` | U5 |
| `Results`, `ResultsFirstRun` | `Results-360`, `Results-390`, `ResultsFirstRun-360` | `scenes/ResultsScene.ts`, `flow/resultsView.ts` | U5 |
| `Loadout` | `Loadout-360` | `scenes/LoadoutScene.ts` | U6 |
| `Settings` | `Settings-360` | `scenes/SettingsScene.ts`, `ui/icons.ts` | U6 |
| `States` | `States` | `ui/skin/*`, `ui/widgets.ts`, `ui/touchFx.ts` | U1 |
| `MarbleMachine`, `MarbleWheel` | `MarbleMachineD3`, `MarbleWheelD3` | none (P4, mockup only) | — |

Board notes that are decisions, not decoration:
- `GameDpad`: with the D-pad on, the energy bar sits above the bottom group and the checkpoint becomes a short chip (`L10`) on the same row.
- `GameLocked`: an unaffordable skill keeps its icon and cost badge on the `off` tone; the energy gauge runs on the rim.
- `Banners`: all four kinds stay inside the existing banner strip (top 1.5 rows of the board, UIFIX-R1).
- `ResultsFirstRun`: same panel as `Results`; rows without a value are absent and `TEXT.start` fills the last line.
- `Settings`: four rows, no Board theme card (D3-R3).

## 5. Refreshing the PNGs
The boards load fonts from `public/fonts/` by relative path, so open them by file path. One board:

`node tools/qa/shot.mjs size:416,680,2 "go:file:///<repo>/docs/design/mockups/d3/boards.html" wait:900 "eval:(()=>{const p=document.querySelectorAll('#Home .phone')[0].getBoundingClientRect();scrollTo(0,p.top+scrollY-20);return 1})()" wait:250 shot:docs/design/mockups/d3/png/Home-360.png`

Use `size:446,884,2` and index `[1]` for the 390x844 frame. `States` and `Biomes` are captured from their `.frames` box at DPR 1. After changing a board, recapture its PNG in the same commit.
