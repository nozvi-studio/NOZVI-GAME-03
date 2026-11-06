# P3 Juice & screens - design

Status: Approved outline (owner 2026-11-07). Milestone M2 (GDD §11 "P3 Juice & art").
Sources: GDD §3, §3b, §10; `docs/design/UI-MOCKUPS.md` (HTML primary, `.dc.html` for variants, PNG for cross-check); MEC-003, MEC-006, MEC-007, MEC-008.
Owner rule 2026-11-07: the lead decides all technical and visual choices; only gameplay-rule changes go to the owner.

## 1. Goal and exit criteria
Replace the greybox look with the D2 mockups and implement the GDD §10.4 feedback table.
Exit (GDD §11): every §10.4 row except "Marble machine" (P4) implemented; readable on a 5" phone (agy screenshots at 360x640 CSS px); 60 fps on a mid-range phone (no frame > 33 ms in a 60 s L20 run on the Chrome mid-tier CPU throttle 4x profile); tests + typecheck pass; no console errors.

Out of scope: P4 meta (marbles, coins, skins, shop, marble machine, FullClear, Odds), head rigs for skins other than the default capy, voice lines, monetization.

## 2. Gameplay rulings
- **Quit run** (owner 2026-11-07): counts as a run end like a death - already specced in MEC-008-R6 and edge case 5 (cause `quit`, MEC-003-R20). Bug to fix in P3b-2: quitting from pause must log `run_end` (cause `quit`), apply carry, and go to Results. `quit` stays excluded from the death-cause 40% gate (`runLog.ts` already does this).
- No other rule changes. If a mockup shows behavior that conflicts with a spec, the spec wins and the lead escalates (UI-MOCKUPS rule 1). Mockup copy that states numbers (e.g. "Slower snake 4 s", "shrinks to 4 segments", skill costs) is generated from `config/balance.json`, never typed.

## 3. Technical approach (lead decisions)
- **D1 Phaser-native port.** Screens are rebuilt with Phaser text, graphics and SVG-to-texture (as `src/game/art/`), reading numbers from the HTML. Rejected: DOM overlay reusing mockup CSS (breaks canvas scaling and input routing, violates UI-MOCKUPS rule 3); rasterized mockups (blurry, no variants).
- **D2 Coordinates.** Mockups are 390x844 CSS px; the game is 540x960 (`src/game/layout.ts`). Horizontal scale `UI_SCALE = 540 / 390`; a helper `ui(n) = n * UI_SCALE` converts mockup px. Because the game is shorter (844 x 1.385 = 1169 > 960), each screen is laid out as a **top block** anchored to the top, a **bottom block** anchored to the bottom, and a **middle block** centred in the remaining space and shrunk uniformly if it does not fit. A pure `layoutColumn` helper computes this and is unit-tested (no overlap at 540x960).
- **D3 Tokens.** `src/game/uiTokens.ts` holds the palette, font stacks, radii, shadows and spacing from UI-MOCKUPS §3 (pure, no Phaser). Scenes never contain hex colours or mockup px literals; `render/palette.ts` biome colours move to or derive from tokens.
- **D4 Fonts.** Nunito (700/800/900) and Lilita One are self-hosted as woff2 under `public/fonts/` (SIL OFL, licence file committed; no runtime Google Fonts so portal builds work offline). Boot waits for `document.fonts.load` with a 2 s timeout, then falls back to `system-ui`. GDD §10.1 "Baloo 2" is updated to the mockup fonts (art direction follows the owner's mockups).
- **D5 Widget kit.** `src/game/scenes/ui.ts` grows into `src/game/ui/` with: pill button (face + shelf + label outline + pressed state), card, chip, icon badge, outlined Lilita title, progress bar. Each widget takes tokens, not raw values.
- **D6 Juice layer.** A pure mapper `src/game/juice/juiceMap.ts` turns flow/session events into juice cues (`{visual, sound, haptic}` ids with params from `balance.juice`); `src/game/juice/JuicePlayer.ts` (Phaser) plays them. Reduced motion is applied in the mapper (shake and big flashes are dropped or replaced), so it is unit-tested.
- **D7 Settings.** New pure `src/meta/settings.ts` (sound, haptics, dpad, reducedMotion, boardTheme) saved through the existing session save with a save-version bump and migration test. Default reducedMotion = OS `prefers-reduced-motion`.
- **D8 P4 placeholders.** Mockup elements for coins, marbles, skins and the marble machine are not rendered in P3 (no fake numbers). Layout reserves no space for them; P4 adds them back.
- **D9 Tuning.** All durations, scales, particle counts and haptic patterns live in `config/balance.json` under `juice` and `ui`.

## 4. Sub-phases
Each sub-phase is one branch from `version/v0.2`, executed as small TDD tasks by subagents, then merged with `--no-ff` after full test + typecheck. P3-0 first; then P3b-1, P3b-2, P3b-3 in parallel worktrees; P3a last.

### P3-0 UI foundation
uiTokens, `ui()` scale + `layoutColumn`, self-hosted fonts + Boot font wait, widget kit, `balance.ui` / `balance.juice` blocks (schema validated like the rest of balance). Tests: tokens match UI-MOCKUPS §3 table, layoutColumn fit/shrink, balance schema.

### P3b-1 Board art (BiomeBoardsD2, Tile, Rock, FencePiece, FoodIcon)
Six biome palettes and ground tiles (subtle checker), fences, pebble/rock/boulder/crumble/warn states, mango icon, light and dark board themes (setting from P3-0/D7; until P3b-3 lands, default light). Warnings keep blink + icon + shape (GDD §3). Tests: palette per biome resolves for levels 1-30 in both themes; warning states are not colour-only (each has a shape/icon id).

### P3b-2 In-run HUD and overlays (GameD2, GameDpadD2, PauseD2, CountdownD2, BannersD2, SkillActiveD2)
HUD: level + biome, quota x/y bar, score, energy bar, two skill buttons (icon, cost, affordable glow, "nope" shake), pause button, "Next checkpoint at Lx" chip, D-pad variant when the setting is on. Pause overlay: Resume / Settings / Quit run (quit fix from §2; the "you keep marbles" line is hidden until P4). Countdown 3-2-1 restyle. Banners (level up "Fresh start!", challenge, checkpoint, biome card) and skill-active pill ("Slow-mo · 3 s left"). Existing `hudText.ts` stays the source of strings. Tests: hud model (texts, affordability, checkpoint chip), quit -> run_end cause `quit` + carry + Results.

### P3b-3 Menu screens (BootD2, HomeD2, LoadoutD2, SettingsD2, ResultsD2)
Boot (logo + progress), Home (logo, hero with capy, Play / Start at Lx / Start from L1, start energy; first-run variant per GDD §3b), Loadout (2 slots, skill cards with cost and description from balance, locked cards "Unlocks at Lx", Go!), Settings (new scene; reachable from Home and Pause; sound, haptics, D-pad, reduced motion, board theme), Results (states normal / newBest / checkpointUnlocked / firstRun from `ResultsD2.dc.html` props; marbles row hidden until P4). Tests: home/results/settings view models per state.

### P3a Juice (GDD §10.4)
Rows: eat mango, eat energy orb, skill cast (per skill), level up, biome change, checkpoint unlocked, death. Death sequence per DeathD2: shake + red flash + X eyes on the capy, "RUN OVER" card with a death line per cause (one or more lines per cause in `text.ts`, picked by seeded RNG), then Results; tap skips; total <= 1.5 s. New synth SFX: energy pickup, per-skill cast, checkpoint, biome jingle. Haptics via `navigator.vibrate` behind the setting. Reduced motion: no shake, no big flashes, softer banner motion. Tests: juiceMap per event, reduced-motion variants, death-line coverage for every cause in MEC-003/004 families.

## 5. Strings
New player-facing strings (death lines, Settings labels, Results states, banners) are provisional, written in `text.ts`, and added to the STATUS owner-question batch. Copy from the mockups is the default.

## 6. Verification and QA
- Pure logic: TDD, requirement IDs `P3-xx` in test names (IDs assigned in the plan).
- Visual: agy (Playwright) screenshots each screen/state at 540x960 and 360x640, compared side by side with `docs/design/mockups/png/`; results in PLAYTEST.
- Performance: one throttled 60 s L20 run per sub-phase merge (frame-time log via debug flag).
- Maps: CODEMAP (new `ui/`, `juice/`, settings, fonts), docs README if docs change, UI-MOCKUPS status column.

## 7. Risks
- Aspect mismatch makes tall mockups (Home, Loadout) cramped: handled by D2 shrink; if a screen shrinks below 0.85 the lead drops decorative elements, not controls.
- Font loading on slow portals: D4 timeout fallback.
- Host RAM: run worktree subagents at most 2 at a time; agy QA never in parallel with fuzz.
