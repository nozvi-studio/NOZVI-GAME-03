# D4-P4 Menus & Gameplay Overlays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task follows superpowers:test-driven-development (red → green → commit).

**Goal:** Move the remaining meta screens (**Results**, **Settings** full + overlay, **Loadout**) and the three in-run overlays (**Pause**, **Countdown**, **DeathCard**) to the D4 HTML/CSS layer. Add the mascot payoff on Results (HeroStage reaction, odometer score, New Best confetti). Fix the U5 duplicate checkpoint chip on Pause. Stop Phaser keys (`keyboard.ts`, `HudScene`) from leaking into `GameScene` while a DOM modal is open. `ResultsScene`, `SettingsScene` and `LoadoutScene` become thin shims, following the P3 token pattern.

**Architecture:** Screens follow the P3 contract: `render(el, ctx) => cleanup` (`ScreenRender`) in `src/game/dom/screens/`, mounted by `UiBridge.open(id)` through `UiHost`, and closed by token from the scene shim's `SHUTDOWN`. Overlays live in `src/game/dom/overlays/`. Each is a `render(el, ctx, props) => cleanup` driven by the existing pure models (`pauseView`, `countdownCard`, `deathLine`) and mounted as `kind: 'modal'` (Pause, Settings-overlay, DeathCard). **Exception (design decision, record in DECISIONS):** the Countdown is *not* a host modal. `UiHost` has one active slot, and a modal mount disables Phaser input (`inputEnabled(false)`), but MEC-001-R2 lets turns during the countdown count. So the Countdown is a passive `pointer-events: none` layer (`#ui-root > .d4-countdown-layer`). It never counts in `isModalOpen()` and never replaces the active mount. `HudScene` drives the overlays through a small `OverlayPort` that the bridge exposes (`showPause`, `hidePause`, `countdown`, `deathCard`, `isModalOpen`). Phaser code reaches the DOM only through that port (`bridgeOf(scene)` from P3).

**Tech Stack:** TypeScript strict, Phaser 3.90, Vite, Vitest + `happy-dom`. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-d4-p4-menus-and-overlays.md` (rules `D4-P4-R1..R4`). Umbrella: `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`. Conventions: `docs/superpowers/plans/2026-11-23-d4-p3-characters-and-home.md` (bridge, token close ordering, shims, `screenParts`, `screens.css`).

## Global Constraints

- **Precondition:** D4-P3 is merged into `version/v0.3` and the owner approved the P3 eye-check. These must exist: `src/game/dom/bridge.ts` (`createUiBridge`, `open(): symbol`, `close(token)`), `src/game/scenes/phaserPort.ts` (`bridgeOf`), `src/game/dom/screens/{screenParts,homeScreen,charactersScreen}.ts`, `src/game/dom/styles/screens.css`, plus every P1/P2 module (`uiHost`, `heroStage`, `animate`, `confetti`, `clock`, `motionTokens`, `icons`, `tests/game/dom/fakeClock.ts`). If any is missing, stop and report.
- Read `AGENTS.md` first. All repository text is in English. Use Conventional Commits. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/d4-p4-menus-overlays`, created from `version/v0.3`. One commit per task. After the full suite and typecheck pass, merge back with `git merge --no-ff`. No push.
- No new dependency. Do not touch `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.
- **Phaser boundary:** nothing under `src/game/dom/` imports `phaser` (the P1 guard test enforces this). Phaser calls go through `PhaserPort` / `bridgeOf`.
- **Unchanged pure contracts (parity, do not change their outputs):** `resultsView`/`RESULTS_BUTTONS`, `settingsView`/`togglePatch`/`settingsExit`/`applySettings`/`SETTINGS_CLOSED`, `loadoutView`/`loadoutEdit`/`skillDesc`, `pauseView`, `countdownCard`, the `DEATH_LINES`/`deathLine` picker, `flowPause/flowResume/flowTogglePause`, `goTo`, `beginRun`. Scene keys `'Results'`, `'Settings'`, `'Loadout'`, `'Hud'`, `'Game'` stay registered. Legacy layout helpers (`pauseLayout`, `PAUSE_MOCK`, Results/Settings/Loadout layout modules) stay until D4-P5 cleanup, unless no caller remains *and* their tests move. Grep before you delete anything.
- **Gameplay rules unchanged.** P4 changes presentation and input routing only. If a task seems to need a rule change (for example the Loadout entry point), stop and ask the owner (AGENTS §5).
- DOM tests declare `// @vitest-environment happy-dom` on line 1. Never change the global `environment: 'node'`. All timing goes through the injectable `MotionClock`/`FakeClock` (no real time, no `vi.useFakeTimers()` against rAF).
- Put requirement IDs in test names (`D4-P4-R1 …`) and a one-line comment at each main implementing function.
- No magic numbers in TS. Layout px live in CSS (`screens.css` / new `overlays.css`, `var(--d4-…)` tokens only, no hex). The spec's pastel and toggle hex values (`#DDF4FF`, `#F3E5FF`, `#D7FFB8`, `#FFF5CC`, `#58CC02`, `#E5E2DC`, `#1CB0F6`) are added to `tokens.css` as tokens if P1 lacks them. Timings come from `MOTION`. The death skip lock comes from `balance.juice.death.skipLockMs`.
- Every `<button>` has a `data-qa`, a visible label or `aria-label`, and a hit area of at least 48×48 px.
- Commands (Windows, PowerShell):
  - Touched tests only: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`
  - Before each commit: `npx vitest run --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`. Run them one after the other; both must pass.
- Every commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. New modules go into `docs/CODEMAP.md` in the same commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/game/dom/uiBridge.ts` (modify) | `ScreenId` already has `results`/`settings`/`loadout`; add `OverlayPort`, `ScreenCtx.params`, `open(id, params?)` |
| `src/game/dom/bridge.ts` (modify) | register the 3 screens, `onEscape` per screen, `overlays` port, `playAgain()`, `goLoadout()`, settings close routing |
| `src/game/dom/screens/resultsScreen.ts` (new) | D4-P4-R1 Results |
| `src/game/dom/screens/settingsScreen.ts` (new) | D4-P4-R2 Settings full + overlay |
| `src/game/dom/screens/loadoutScreen.ts` (new) | D4-P4-R3 Loadout skill picker |
| `src/game/dom/overlays/pauseOverlay.ts` (new) | D4-P4-R4 Pause sheet (single checkpoint chip) |
| `src/game/dom/overlays/countdownOverlay.ts` (new) | D4-P4-R4 passive countdown layer |
| `src/game/dom/overlays/deathCardOverlay.ts` (new) | D4-P4-R4 DeathCard with skip lock |
| `src/game/dom/overlays/overlayParts.ts` (new) | `scrim()`, `sheet()`, `toggle()` shared parts (reuses `screenParts.el`) |
| `src/game/dom/styles/overlays.css` (new) | `.d4-scrim`, `.d4-sheet`, `.d4-countdown-*`, `.d4-death-*`, `.d4-toggle`; tokens only |
| `src/game/dom/styles/screens.css` (modify) | `.d4-results-*`, `.d4-settings-*`, `.d4-loadout-*` |
| `src/game/input/keyboard.ts` (modify) | D4-P4-R4 guard on `!uiHost.isModalOpen()` |
| `src/game/scenes/HudScene.ts` (modify) | D4-P4-R4 key guard; drive DOM overlays via `OverlayPort` instead of `PauseOverlay`/`CountdownOverlay`/`DeathCard` |
| `src/game/scenes/{Results,Settings,Loadout}Scene.ts` (rewrite) | thin shims |
| `src/game/main.ts` (modify) | import `overlays.css`; pass the screens and the overlay layer to `createUiBridge` |
| `tests/game/dom/{resultsScreen,settingsScreen,loadoutScreen,pauseOverlay,countdownOverlay,deathCardOverlay,overlaysCss}.test.ts` (new) | screen/overlay states |
| `tests/game/keyboardOverlay.test.ts` (update), `tests/game/hudModalGuard.test.ts` (new), `tests/game/sceneShims.test.ts` (extend) | key isolation + shims |
| `tests/game/{settingsScene,resultsSeq,resultsLayout,settingsLayout,loadoutLayout,hudOverlay}.test.ts` (adapt) | drop Phaser-drawing expectations that moved to DOM; keep model tests |
| `docs/DECISIONS.md`, `docs/CODEMAP.md`, `docs/README.md`, `docs/STATUS.md`, `docs/PLAYTEST.md`, `CHANGELOG.md` | records and maps |

---

### Task 0: Kickoff checks and Loadout entry decision (`D4-P4-R3`)

**Files:** `docs/DECISIONS.md`

- [ ] **Step 1:** Verify the precondition files (Glob). Run `node .gitnexus/run.cjs status` and analyze if it is stale. Run `impact` on `bindKeyboard`, `PauseOverlay`, `CountdownOverlay`, `DeathCard`, `ResultsScene`, `SettingsScene`, `LoadoutScene` and note every caller in the task notes.
- [ ] **Step 2:** Grep `'Loadout'` / `showLoadout` in `src/` and record the reachable entry points after P3. Spec §2.3 says Loadout must be confirmed at kickoff. **Default (no new rule):** add a compact `Skills` round icon button on Results (`results-skills`), shown only when `loadoutModel().slotCount >= 1` and a skill is unlocked. Its Back returns to Results-origin `Home`, and Play starts the run like `Play again`. If the owner prefers removing Loadout from navigation, skip Task 4 and Task 8's Loadout shim. The pure rules stay tested in `src/core/skills.ts` / `loadoutEdit.test.ts`. **Ask the owner and record the answer** before Task 4.
- [ ] **Step 3:** Append to DECISIONS (2026-11-23): "D4-P4: Countdown is a passive DOM layer outside UiHost's single mount slot because a modal mount disables Phaser input and MEC-001-R2 counts turns during the countdown. Pause → Settings swaps the modal (host has one slot) and Settings-overlay close re-mounts Pause." Also record the Loadout entry answer. Commit `docs: D4-P4 kickoff decisions`.

---

### Task 1: Bridge extensions, overlay parts and `overlays.css`

**Files:**
- Modify: `src/game/dom/uiBridge.ts`, `src/game/dom/bridge.ts`, `src/game/main.ts` (`import './dom/styles/overlays.css';` after `screens.css`)
- Create: `src/game/dom/overlays/overlayParts.ts`, `src/game/dom/styles/overlays.css`
- Test: `tests/game/dom/bridge.test.ts` (extend), `tests/game/dom/overlayParts.test.ts` (new, `happy-dom`), `tests/game/dom/overlaysCss.test.ts` (new, `node`, text-level)

**Interfaces:**
```ts
// uiBridge.ts
export interface ScreenCtx { bridge: UiBridge; debug: boolean; clock?: MotionClock; params?: Record<string, unknown> }
export interface OverlayPort {
  isModalOpen(): boolean;                                  // delegates to host.isModalOpen() (Countdown never counts)
  showPause(v: PauseView, h: PauseHandlers): void;         // modal mount 'pause'; idempotent while open
  hidePause(): void;                                       // close(pauseToken) only
  countdown(n: number | 'go' | null, card: { title: string; subtitle: string } | null): void; // passive layer; null hides
  deathCard(line: { text: string }, lockMs: number, onContinue: () => void): void;            // modal mount 'death'
  hideAll(): void;                                         // run shutdown: close own tokens + clear the countdown layer
}
export interface PauseHandlers { onResume(): void; onSettings(): void; onQuit(): void }
export interface UiBridge { /* P3 members */ open(id: ScreenId, params?: Record<string, unknown>): symbol; overlays: OverlayPort;
  playAgain(): void; goLoadout(): void; openSettingsOverlay(onClosed: () => void): void }

// overlayParts.ts
export function scrim(cls: 'is-frost' | 'is-light'): HTMLElement;
export function sheet(qa: string): HTMLElement;                            // white 24px-radius card, .is-pop entrance
export function toggle(qa: string, label: string, on: boolean, onTap: () => void): { el: HTMLButtonElement; set(on: boolean): void }; // role=switch, aria-checked
```
Rules (comment `// D4-P4-R4 overlay port: modal tokens over the live GameScene canvas; countdown stays passive`):
- `showPause` mounts `{ id: 'pause', kind: 'modal', onEscape: handlers.onResume }`. `openSettingsOverlay` closes the pause token, mounts `settings` with `params { overlay: true }` as `kind: 'modal'`, and its close (Back / Escape) calls `onClosed()` (HudScene re-shows Pause and emits `SETTINGS_CLOSED`).
- `countdown(...)` writes into a lazily created `.d4-countdown-layer[aria-hidden=true]` sibling of the host mounts in `#ui-root`. It never calls `host.mount`.
- `playAgain()` = `startRun(lastRunLevel)` through the P3 preload path (the same `beginRun` semantics as the legacy Results button; read `ResultsScene` before you change anything).
- CSS: `.d4-scrim.is-frost { background: var(--d4-scrim-frost); backdrop-filter: blur(6px) }` with token `--d4-scrim-frost: rgba(20,25,35,.35)`. `.d4-sheet { border-radius: 24px }`. `.d4-toggle` track `var(--d4-toggle-on)`/`var(--d4-toggle-off)`, knob transition `var(--d4-dur-toggle)` (180 ms token). `.reduced-motion` disables the pop/blur animations (blur stays static).

- [ ] **Step 1: Write failing tests:**
  - `D4-P4-R4 showPause mounts a modal and isModalOpen is true; hidePause closes only its own token`.
  - `D4-P4-R4 countdown layer never mounts through the host (isModalOpen stays false) and null hides it`.
  - `D4-P4-R4 openSettingsOverlay swaps Pause for Settings and close re-shows via onClosed`.
  - `D4-P4-R4 hideAll clears pause, death and countdown`.
  - `D4-P4 toggle is a 48px role=switch with aria-checked that flips on set`.
  - `overlaysCss`: `D4-P4-R4 frost scrim uses blur(6px) and the scrim token`, `D4-P4 sheet radius 24px`, `D4-P4 no hex colours in overlays.css`, `D4-P4 main.ts imports overlays.css`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/bridge.test.ts tests/game/dom/overlayParts.test.ts tests/game/dom/overlaysCss.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): overlay port, overlay parts and overlays.css (D4-P4-R4)`.

---

### Task 2: Results DOM screen (`D4-P4-R1`)

**Files:**
- Create: `src/game/dom/screens/resultsScreen.ts`
- Modify: `src/game/dom/styles/screens.css` (`.d4-results-*`), `tokens.css` only if a token is missing
- Test: `tests/game/dom/resultsScreen.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export const resultsScreen: ScreenRender; // reads session.lastRun() (grep ResultsScene for the exact RunSummary source), nextMilestone, biomeCount
```
Structure (the `data-qa` hooks are the QA contract):
```
.d4-screen.d4-results (watermark via CSS background, no outer card)
  section.d4-results-stage[data-qa=results-stage]: HeroStage(skin=activeSkin, expression win|hurt) + .d4-bubble[data-qa=results-bubble]
  h1.d4-results-title[data-qa=results-title] (Lilita One): GAME OVER | NEW BEST! | VICTORY!
  div.d4-results-score: span[data-qa=results-score] (52px, odometer) + span.d4-pill[data-qa=results-best] (trophy svg + "Best N")
  div.d4-results-stats[data-qa=results-stats]: 3 cols LEVEL | EATEN | BIOME, 1px hairlines (border-left), no boxes
  div.d4-results-energy[data-qa=results-energy] (only when carriedEnergy > 0)  // rows kind 'energy'
  p.d4-results-tip[data-qa=results-tip] (only firstRunTip)
  div.d4-results-progress[data-qa=results-progress]: flag svg + flat bar (fill) + passive label (not a button, no lip)  // rows 'next' / 'checkpoint'
  footer: button[data-qa=results-again] green 56px "Play again" · button[data-qa=results-home] white 48px 2px border 4px lip
          (+ round [data-qa=results-skills] only if Task 0 kept Loadout)
```
Rules (comment `// D4-P4-R1 Results DOM screen over resultsView (no nested boxes, mascot payoff)`):
- Title mapping: `v.titleKey === 'results.youWin'` → VICTORY; else `v.bestChip.gold` → NEW BEST; else GAME OVER. Add locale keys `results.d4.victory|newBest|gameOver` if missing.
- Expression: `win` when won or `bestChip.gold`, else `hurt`. Bubble: `t('results.d4.newRecord')` on gold, else `t(v.headline.key)` (+ `t(v.headline.context)` when non-null). Use `hero.react(...)` only if P2 exposes it. Otherwise set the expression at construction.
- Score: `countUp(scoreEl, 0, v.score, MOTION.countUp, clock)`. Under reduced motion, set the final value immediately. Best pill uses `t(v.bestChip.key, v.bestChip.vars)` and `.is-gold` when gold.
- `bestChip.gold` → after the count-up completes: `burstConfetti(stage, cx, cy)` + `synth.play('unlock')`. Never on firstRun (`gold` is already false there, so keep that parity).
- Rows: `checkpoint` → label `t('results.checkpointUnlocked',{level})` above the bar; `next` → bar width `fill*100%` via a CSS custom property `--fill`, label `Next run starts at L{n}` (`t('results.d4.nextStart',{level})`, or the `requiresClear` variant); `energy` → chip with the bolt icon + value.
- Again → `uiTap` + `bridge.playAgain()`. Home → `uiTap` + `bridge.goHome()`. Escape (`onEscape`) → `goHome`. Enter/Space when focus is not on a button → `playAgain` (same guard as the P3 Home).
- Cleanup destroys the hero, cancels the count-up and confetti, and removes the key listener.

- [ ] **Step 1: Write failing tests** (real `Session` from the test factory, spy synth/bridge, `FakeClock`; build summaries with the helper used by `resultsView.test.ts`):
  - `D4-P4-R1 game over: GAME OVER title, hurt hero, cause bubble, no confetti`.
  - `D4-P4-R1 new best: NEW BEST title, win hero, gold Best pill, confetti after the odometer ends`.
  - `D4-P4-R1 victory title and win hero when the run is won`.
  - `D4-P4-R1 odometer counts up with the injected clock and ends on the score; reduced motion shows it at once`.
  - `D4-P4-R1 stat strip has LEVEL, EATEN, BIOME and no nested bordered cards` (no element inside `.d4-results` with class `d4-card`).
  - `D4-P4-R1 carriedEnergy chip only when carriedEnergy > 0`.
  - `D4-P4-R1 firstRunTip only on the first run, and no confetti on a first-run best`.
  - `D4-P4-R1 progress bar fill and passive Next run starts at Ln label are not a button`.
  - `D4-P4-R1 Play again calls playAgain; Home and Escape call goHome`.
  - `D4-P4-R1 every button has data-qa, a label and meets the 48px class contract`.
  - `D4-P4-R1 cleanup leaves no pending timers and no hero`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/resultsScreen.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** (register `results` in the bridge's screen map in `main.ts`).
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): Results DOM screen with mascot payoff (D4-P4-R1)`.

---

### Task 3: Settings DOM screen, full + overlay (`D4-P4-R2`)

**Files:**
- Create: `src/game/dom/screens/settingsScreen.ts`
- Modify: `screens.css` (`.d4-settings-*`), `tokens.css` (badge pastels if missing: `--d4-badge-sky|grape|lime|butter`)
- Test: `tests/game/dom/settingsScreen.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export const settingsScreen: ScreenRender; // ctx.params: SettingsEntry ({ overlay?, returnTo? })
```
Structure:
```
.d4-screen.d4-settings (.is-overlay → bottom sheet over the frost scrim, from overlayParts)
  header: [settings-back <] h1 "Settings"
  div.d4-settings-card (single white 4px-lip card)
    4 × div.d4-settings-row[data-qa=settings-row-<id>] separated by hairlines:
      span.d4-badge.is-<sky|grape|lime|butter> (duotone icon) · title + sub · toggle[data-qa=settings-<id>]
```
Rules (comment `// D4-P4-R2 Settings DOM screen over settingsView/togglePatch (full and overlay)`):
- Rows come from `settingsView(session.save().settings, displayPrefs())` in order. Badge colour per row: sound→sky, haptics→grape, dpad→lime, reducedMotion→butter (a lookup that returns class names, no hex in TS).
- Tap → `session` setter for `togglePatch(...)` (the same call `SettingsScene` makes today, so grep it), `applySettings(...)`, `uiTap`, re-derive the view and `toggle.set(on)`. `reducedMotion` → `uiHost.syncReducedMotion()` (via `bridge`) so `#ui-root.reduced-motion` flips **immediately**. Sound toggles `synth.setOn`.
- Exit: `settingsExit(params)`. `start` → `port.startScene(scene)` (via `bridge.goHome()` when `scene === 'Home'`). `close` → the overlay `onClosed` callback from Task 1, plus `game.events.emit(SETTINGS_CLOSED)` through the port (add `PhaserPort.emit(name)` if needed). Back and Escape both use this path.

- [ ] **Step 1: Write failing tests:**
  - `D4-P4-R2 full mode renders 4 rows in order with pastel badges in one card`.
  - `D4-P4-R2 toggles reflect settingsView and flip through togglePatch` (each of the 4).
  - `D4-P4-R2 Reduced motion toggles #ui-root.reduced-motion immediately`.
  - `D4-P4-R2 full mode Back and Escape start returnTo (default Home)`.
  - `D4-P4-R2 overlay mode renders as a sheet over the frost scrim; Back closes and emits settings-closed without starting a scene`.
  - `D4-P4-R2 toggles are role=switch with 48px hit area and aria-checked`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/settingsScreen.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): Settings DOM screen, full and overlay (D4-P4-R2)`.

---

### Task 4: Loadout DOM screen (`D4-P4-R3`) — skip if Task 0 removed Loadout

**Files:**
- Create: `src/game/dom/screens/loadoutScreen.ts`
- Modify: `screens.css` (`.d4-loadout-*`)
- Test: `tests/game/dom/loadoutScreen.test.ts` (new, `happy-dom`)

Structure:
```
.d4-screen.d4-loadout
  header: [loadout-back <] h1[data-qa=loadout-title] (Pick 1 skill | Pick 2 skills) · chip[data-qa=loadout-start] "Start L{n}" · badge[data-qa=loadout-energy] (only when energy)
  div.d4-loadout-slots: slotCount × [data-qa=loadout-slot-<i>] (.is-active)
  div.d4-loadout-grid: per card button.d4-skill[data-qa=loadout-card-<id>] (.is-selected: 2px sky border + sky tint + "Slot n" badge;
                       .is-locked muted with "Unlocks at Lx"; cost pill bolt + N; desc with text-wrap: balance)
  footer: button[data-qa=loadout-play] green 56px
```
Rules (comment `// D4-P4-R3 Loadout DOM screen over loadoutView/loadoutEdit (single-border selection)`):
- The state is a `LoadoutEditState` from the session (grep `LoadoutScene` for the constructor and the save call). Card tap → the matching `loadoutEdit` reducer, then re-render in place. Locked card tap → `nope` + `shakeDenied`.
- Desc text = `t(desc.key, desc.vars)`. Join numbers and units with ` ` in the locale string (fix the orphan "3 s") and add `text-wrap: balance` in CSS.
- Play → save the selection exactly as `LoadoutScene` does today, then `bridge.startRun(view.startAt)`. Back/Escape → `goHome`.

- [ ] **Step 1: Write failing tests:**
  - `D4-P4-R3 slotCount 1 shows Pick 1 skill and one slot`; `D4-P4-R3 slotCount 2 shows Pick 2 skills and two slots`.
  - `D4-P4-R3 selected card has a single sky border and a Slot n badge (no extra border classes)`.
  - `D4-P4-R3 startAt chip and carried energy badge only when energy > 0`.
  - `D4-P4-R3 locked Mango Rain is muted, shows Unlocks at Lx, and a tap is denied`.
  - `D4-P4-R3 cost pill shows bolt + cost from balance; desc uses a no-break space before s`.
  - `D4-P4-R3 Play saves the selection and starts the run at startAt`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): Loadout DOM skill picker (D4-P4-R3)`.

---

### Task 5: Pause overlay with a single checkpoint chip (`D4-P4-R4`, U5 fix)

**Files:**
- Create: `src/game/dom/overlays/pauseOverlay.ts`
- Test: `tests/game/dom/pauseOverlay.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export function renderPause(el: HTMLElement, v: PauseView, h: PauseHandlers, clock?: MotionClock): () => void;
```
Rules (comment `// D4-P4-R4 Pause sheet: one checkpoint chip (U5 fix), Resume/Settings/Quit`):
- Frost scrim + sheet (`.is-pop` spring). Title `v.title`, subtitle `v.subtitle`, **exactly one** `[data-qa=pause-chip]` when `v.chip !== null` (flat, flag icon, no lip). Root cause of U5 to confirm first (systematic-debugging): the legacy `PauseOverlay` drew the chip *and* the HUD top chip stayed visible under the dialog. In DOM, the chip renders only inside the sheet, and the test asserts one `pause-chip` in the whole document.
- Buttons from `v.buttons`: `pause-resume` (green), `pause-settings` (neutral, only when present), `pause-quit` (soft coral tint `.is-coral`). Each one calls its handler after `uiTap`. A scrim tap does nothing (no accidental resume).

- [ ] **Step 1: Write failing tests:**
  - `D4-P4-R4 pause renders title, subtitle and exactly one checkpoint chip (U5)`.
  - `D4-P4-R4 no chip when the hint is null`.
  - `D4-P4-R4 settings button only when settingsAvailable`.
  - `D4-P4-R4 Resume, Settings and Quit call their handlers; scrim tap does nothing`.
  - `D4-P4-R4 Escape resumes through the bridge onEscape`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, commit** `feat(ui): frosted Pause overlay with a single checkpoint chip (D4-P4-R4)`.

---

### Task 6: Countdown and DeathCard overlays (`D4-P4-R4`)

**Files:**
- Create: `src/game/dom/overlays/countdownOverlay.ts`, `src/game/dom/overlays/deathCardOverlay.ts`
- Test: `tests/game/dom/countdownOverlay.test.ts`, `tests/game/dom/deathCardOverlay.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export function renderCountdown(layer: HTMLElement, n: number | 'go' | null, card: { title: string; subtitle: string } | null): void;
export function renderDeathCard(el: HTMLElement, line: { text: string }, lockMs: number, onContinue: () => void, clock: MotionClock): () => void;
```
Rules:
- Countdown (comment `// D4-P4-R4 passive countdown layer (pointer-events none, MEC-001-R2 turns still count)`): mango-gold numeral `[data-qa=countdown-n]` (`3`,`2`,`1`,`GO!` via `t('countdown.go')`). Each tick restarts the `.is-pulse` keyframe (remove the class, force a reflow, add it). Light scrim. `card` → one chip `[data-qa=countdown-card]` with title + subtitle (the full `countdownCard()` output). `null` clears the layer.
- DeathCard (comment `// D4-P4-R4 DeathCard: humorous line, skip-locked tap-anywhere to Results`): sheet with `[data-qa=death-line]`. The text comes from the existing `deathLine`/`DEATH_LINES` picker that `JuicePlayer.makeCard` already seeds (pass the chosen line, do not re-pick). For `lockMs` (from `balance.juice.death.skipLockMs`), taps are ignored and `.is-locked` is set. After that, a tap anywhere or Enter/Space calls `onContinue` **once**. A `[data-qa=death-hint]` "Tap to continue" fades in when the lock ends. Under reduced motion, no pop, but the lock still applies.

- [ ] **Step 1: Write failing tests:**
  - `D4-P4-R4 countdown shows 3, 2, 1, GO and pulses on each tick`.
  - `D4-P4-R4 countdown renders the countdownCard checkpoint ramp chip only when the card is non-null`.
  - `D4-P4-R4 countdown layer has pointer-events none and does not mount through the host`.
  - `D4-P4-R4 death card ignores taps during skipLockMs and continues once after it` (FakeClock advance `lockMs - 1` → tap → no call; advance 1 → tap twice → one call).
  - `D4-P4-R4 death card shows the seeded death line`.
  - `D4-P4-R4 death card cleanup leaves no pending timers`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, commit** `feat(ui): DOM Countdown and DeathCard overlays (D4-P4-R4)`.

---

### Task 7: Keyboard isolation and HudScene wiring (`D4-P4-R4`, critical)

**Files:**
- Modify: `src/game/input/keyboard.ts`, `src/game/scenes/HudScene.ts`
- Test: update `tests/game/keyboardOverlay.test.ts`; new `tests/game/hudModalGuard.test.ts` (`node`, Phaser mocked like `keyboardOverlay.test.ts`); adapt `tests/game/hudOverlay.test.ts`

**Interfaces:**
```ts
// keyboard.ts
export function bindKeyboard(scene: GameScene, modal: () => boolean = () => false): void; // caller passes () => bridgeOf(scene)?.overlays.isModalOpen() ?? false
// HudScene: private modalOpen(): boolean { return this.bridge?.overlays.isModalOpen() ?? false; }
```
Rules:
- `keyboard.ts` (comment `// D4-P4-R4 DOM modal owns the keyboard: no game key leaks behind Pause/Settings/DeathCard`): `if (modal()) return;` **before** `keyAction`, and **without** `preventDefault`, so the DOM sheet still receives Space/Enter/Escape. Keep the legacy `scene.scene.isActive('Settings')` guard until the Settings shim no longer launches a Phaser overlay, then remove it in the same commit that deletes the Phaser overlay path.
- `HudScene.onKey` (skill keys) gets the same guard. `GameScene` passes the modal predicate when it calls `bindKeyboard` (grep the call site).
- Replace `PauseOverlay` / `CountdownOverlay` / `DeathCard` use in `HudScene` with `bridge.overlays`: `showPaused` → `overlays.showPause(pauseView(...), handlers)`. `onSettings` → `bridge.openSettingsOverlay(() => { this.game.events.emit(SETTINGS_CLOSED); this.showPause(); })`. `hideOverlay` → `hidePause()` + `countdown(null, null)`. `tick` → `countdown(effect.n, countdownCard(...))`. `go` → `countdown('go', null)`, then clear after `MOTION.countdownGoMs` through `this.time.delayedCall`. `makeCard` → an adapter object that satisfies the `JuicePlayer` card interface and calls `overlays.deathCard(line, balance.juice.death.skipLockMs, () => this.leave())`. `SHUTDOWN` → `overlays.hideAll()`. When `bridgeOf(this)` is null (headless tests / artPreview), keep the legacy Phaser overlays so `boot.test.ts` and `artPreview` keep working. Do not delete the legacy classes in P4 (that is D4-P5).
- The HUD top checkpoint chip is hidden while paused (`this.top.apply(v, paused, …)` already receives `paused`; verify it hides the chip, which is the other half of U5).

- [ ] **Step 1: Write failing tests:**
  - `keyboardOverlay.test.ts`: `D4-P4-R4 game keys are ignored while a DOM modal is open` (Space, Escape, KeyP, KeyM, arrows, WASD → no `flowKey`/`turn`/`toggle-sound`, and `preventDefault` not called). Keep `MEC-001 keys still reach the game without the overlay`. Keep the P3b3-R7 test while the legacy guard exists.
  - `D4-P4-R4 Escape with Settings open over Pause does not unpause` (modal true → `flowKey` not called).
  - `hudModalGuard.test.ts`: `D4-P4-R4 skill keys are ignored while a DOM modal is open`; `D4-P4-R4 HudScene shows the DOM pause and hides the HUD checkpoint chip` (fake bridge overlays spy); `D4-P4-R4 countdown ticks go to the passive layer with countdownCard`; `D4-P4-R4 death card continue leaves to Results once`; `D4-P4-R4 HudScene without a bridge falls back to the Phaser overlays`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/keyboardOverlay.test.ts tests/game/hudModalGuard.test.ts tests/game/hudOverlay.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** (GitNexus `impact` on `bindKeyboard` and `HudScene.showPause` first).
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG, run the full suite + typecheck, commit** `fix(input): DOM modals own the keyboard; HUD drives DOM overlays (D4-P4-R4)`.

---

### Task 8: Thin Results / Settings / Loadout shims

**Files:**
- Rewrite: `src/game/scenes/ResultsScene.ts`, `SettingsScene.ts`, `LoadoutScene.ts`
- Test: extend `tests/game/sceneShims.test.ts`; adapt `tests/game/settingsScene.test.ts`, `resultsSeq.test.ts`, `resultsLayout.test.ts`, `settingsLayout.test.ts`, `loadoutLayout.test.ts`, `navGuard.test.ts`, `boot.test.ts`

Shim shape (same as P3; comment `// D4-P4 thin shim: the DOM screen owns <Results|Settings|Loadout>; close(token) is order-safe`):
```ts
init(data: SettingsEntry | undefined) { this.entry = data ?? {}; }
create(): void {
  const bridge = bridgeOf(this); if (!bridge) return;
  const token = bridge.open('settings', { ...this.entry });
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bridge.close(token));
}
```
Rules:
- `SettingsScene` launched with `{ overlay: true }` from legacy code paths: if a bridge exists, the overlay path goes through `bridge.openSettingsOverlay` (Task 7), and the shim `create()` with `overlay: true` just calls `this.scene.stop()`. Grep `launch('Settings'` and remove the remaining callers.
- Results: anything the legacy scene did on create besides drawing (session commit, sounds, analytics, `beginRun` for Play again) moves into `resultsScreen` or stays in the shim. **Read the legacy scene fully first** and list each side effect in the commit body.
- Move pure tests that still apply (`resultsView`, `settingsView`, `loadoutView`, `loadoutEdit`) unchanged. Delete or rewrite only the Phaser-drawing tests, and list the removed test names in the commit body.

- [ ] **Step 1: Write failing tests:**
  - `D4-P4 Results/Settings/Loadout shims open their screen on create and close their token on shutdown`.
  - `D4-P4 stale shutdown after the next create never wipes the new screen` (Results → Home, Home → Settings → Home).
  - `D4-P4 Settings shim forwards { returnTo } params`.
  - `D4-P4 shims without a bridge are no-ops`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP (scenes are shims), run the full suite + typecheck, commit** `refactor(scenes): Results, Settings and Loadout become thin DOM shims (D4-P4)`.

---

### Task 9: Chrome QA at 360×640 and 360×780

**Files:** `docs/PLAYTEST.md` (new entry), screenshots in `tmp/qa/d4-p4/` (git-ignored)

- [ ] **Step 1:** Start `npm run dev` (background). Use `tools/qa/shot.mjs` if present, else headless Chrome via Playwright from the QA worker. Viewports **360×640** and **360×780**. The script must assert 0 console errors per page.
- [ ] **Step 2: Capture** (`?debug=1` where state seeding is needed):
  - `results-over-*.png`, `results-newbest-*.png` (confetti mid-burst), `results-victory-*.png`, `results-firstrun-*.png` (tip), `results-energy-*.png`.
  - `settings-full-*.png`, `settings-overlay-*.png` (from Pause), `settings-reduced-*.png`.
  - `loadout-1slot-*.png`, `loadout-2slot-*.png` (if kept).
  - `pause-*.png` (one chip only), `countdown-3-*.png`, `countdown-card-*.png` (start from a checkpoint), `death-*.png`.
- [ ] **Step 3: Check against the spec:** no nested boxes on Results; stat hairlines; 52 px score; tap targets ≥ 48 px; blur visible on Pause; Escape in Settings-over-Pause returns to Pause and does **not** unpause; arrows during the countdown still turn the snake; DeathCard ignores early taps; reduced motion stops pops, confetti and the odometer animation.
- [ ] **Step 4:** Add a PLAYTEST.md entry (date, build, viewports, findings, screenshot paths). Fix defects in separate `fix:` commits (systematic-debugging first).
- [ ] **Step 5:** Ask the owner for the eye-check approval (gate to D4-P5). Commit `docs: D4-P4 QA record`.

---

### Task 10: Phase close-out

**Files:** `docs/STATUS.md`, `docs/CODEMAP.md`, `docs/README.md`, `CHANGELOG.md`

- [ ] **Step 1:** `Grep "D4-P4-R" src tests`: every rule R1..R4 has at least 1 test name and at least 1 implementing comment.
- [ ] **Step 2:** `Grep "from 'phaser'" src/game/dom` returns nothing. `Grep "launch\('Settings'" src` shows only the no-bridge fallback.
- [ ] **Step 3:** Phaser smoke: a full run → pause → settings → back → resume → die → DeathCard → Results → Play again → Results → Home. No console errors. `?debug=1&artPreview=1` still works.
- [ ] **Step 4:** Run the full suite + typecheck one after the other and record the counts.
- [ ] **Step 5:** Update STATUS (Now: D4-P4 done, awaiting owner eye-check; Next: D4-P5 in-game harmonization & D3 cleanup, including deleting the legacy Phaser overlays/layout modules) and set the README status for UI-D4-P4-PLAN. Commit `docs: D4-P4 status`.
- [ ] **Step 6:** `superpowers:requesting-code-review` → fix → `git checkout version/v0.3; git merge --no-ff feat/d4-p4-menus-overlays`. Refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

---

## Exit Gate

- [ ] Results: HeroStage win/hurt + bubble, Lilita title (GAME OVER / NEW BEST! / VICTORY!), 52 px odometer score + Best pill, New Best confetti, 3-column hairline stat strip, carriedEnergy chip, firstRunTip, flat checkpoint progress with a passive label, Play again (56 px) + Home (48 px). No nested boxes. Covered by `resultsScreen.test.ts`.
- [ ] Settings: full and overlay modes with `{ overlay, returnTo }` parity, one card with 4 hairline rows, pastel badges, 180 ms pill toggles, immediate `reduced-motion`. Covered by `settingsScreen.test.ts`.
- [ ] Loadout (if kept): Pick 1 / Pick 2, startAt chip, energy badge, single sky selection border, cost pills, balanced copy, muted locked Mango Rain. Covered by `loadoutScreen.test.ts`.
- [ ] Pause (one checkpoint chip, U5 fixed), passive Countdown (`countdownCard` chip; turns still count), DeathCard (skip lock, continue once). Covered by the overlay tests.
- [ ] Phaser game/HUD keys are ignored while a DOM modal is open. Escape behind Settings never unpauses. Covered by `keyboardOverlay.test.ts` + `hudModalGuard.test.ts`.
- [ ] Thin shims with token close ordering; `boot.test.ts`, `navGuard.test.ts` and artPreview intact.
- [ ] Full suite + typecheck pass when run one after the other. Chrome QA shots in `tmp/qa/d4-p4/` at 360×640 and 360×780 with 0 console errors, a PLAYTEST entry and owner eye-check approval.
- [ ] `CHANGELOG.md` `[Unreleased]`, `DECISIONS.md`, `CODEMAP.md`, `README.md`, `STATUS.md` updated; all text in English.
