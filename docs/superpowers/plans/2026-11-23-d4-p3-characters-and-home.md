# D4-P3 Pilot Screens: Characters & Simplified Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task follows superpowers:test-driven-development (red → green → commit).

**Goal:** Ship the first two live HTML/CSS D4 screens, **Characters** and the **simplified Home** (owner ruling 2026-11-23: `PLAY` only; no checkpoint stepper, no `Start from level 1`, no pre-run Loadout detour, no Start Energy chip). Both mount through the P1 `UiHost` via a concrete `UiBridge`. `HomeScene` / `CharactersScene` become thin Phaser shims whose shutdown can never unmount the next screen (token close ordering). `startRun()` always preloads the equipped skin textures before `GameScene`. The Boot background becomes `#FAF9F5`.

**Architecture:** A new pure `src/game/dom/bridge.ts` implements `UiBridge` on top of `UiHost`. It returns a mount token from `open()`, closes only by token, and reaches Phaser only through an injected `PhaserPort` (`ensureSkins`, `startScene`). The Phaser side of the port lives in `src/game/scenes/phaserPort.ts`, the only file in this phase that touches both Phaser and the bridge. Screens live in `src/game/dom/screens/charactersScreen.ts` and `homeScreen.ts`. Each is a `render(el, ctx) => cleanup` function driven by pure view models: `charactersView` (unchanged, MEC-011-R14..R21) and a reduced `homeView` (MEC-008, rewritten). Screens use the P2 modules `heroStage.ts`, `animate.ts`, `confetti.ts` and the P1 `icons.ts` / `components.css`. They never import `phaser`.

**Tech Stack:** TypeScript strict, Phaser 3.90, Vite, Vitest + `happy-dom` (from P1). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-d4-p3-characters-and-home.md` (rules `D4-P3-R1..R3`). Umbrella: `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`. Foundations: `docs/superpowers/plans/2026-11-23-d4-p1-design-system-and-stylebook.md`, `docs/superpowers/plans/2026-11-23-d4-p2-characters-art-and-motion.md`.

## Global Constraints

- **Precondition:** D4-P1 and D4-P2 are merged into `version/v0.3`, and the owner approved the P2 character art. These must exist: `src/game/dom/{uiHost,uiBridge,icons,stageSync}.ts`, `src/game/dom/{heroStage,animate,confetti,clock,motionTokens}.ts`, `src/game/art/heroSvg.ts`, `src/game/dom/styles/{tokens,components,motion}.css`, and `tests/game/dom/fakeClock.ts`. If any is missing, stop and report.
- Read `AGENTS.md` first. All repository text is in English. Use Conventional Commits. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/d4-p3-characters-home`, created from `version/v0.3`. One commit per task. After the full tests and typecheck pass, merge back with `git merge --no-ff`. No push.
- No new dependency. Do not touch `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.
- **Phaser boundary:** nothing under `src/game/dom/` imports `phaser` (the P1 guard test enforces this). Phaser-specific calls go through `PhaserPort`.
- **Approved rule change (owner 2026-11-23):** the Home simplification changes MEC-008 behaviour. The GDD, `MEC-008`, `DECISIONS.md` and the obsolete Home tests change in **Task 2**, before any Home code, in the same PR.
- **Unchanged contracts:** `charactersView` / `CharactersView`, `Session.buySkin/equipSkin/debugAddCoins/skinsModel/homeModel/exportLog`, `setActiveSkin/activeSkin`, `ensureSkinTextures(scene, skins, done)`, `goTo(scene, key, data, dir)` and `beginRun`. Scene keys `'Home'`, `'Characters'`, `'Game'`, `'Settings'` stay registered. `?debug=1&artPreview=1` keeps working. `window.__summarize` stays (debug only).
- DOM tests declare `// @vitest-environment happy-dom` on line 1. Never change the global `environment: 'node'`. All timing goes through the injectable `MotionClock`/`FakeClock` (no real time, no `vi.useFakeTimers()` against rAF).
- Put requirement IDs in test names (`D4-P3-R1 …`, `MEC-008-R4 …`) and a one-line comment at each main implementing function.
- No magic numbers in TS. Layout pixel values live in CSS (`screens.css`, using `var(--d4-…)` tokens only, no hex). Timings come from `MOTION`. Tuning (debug grant, prices) stays in `config/balance.json`.
- Every `<button>` has a `data-qa`, a visible label or `aria-label`, and a hit area of at least 48×48 px.
- Commands (Windows, PowerShell):
  - Touched tests only: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`
  - Before each commit: `npx vitest run --configLoader native --pool threads --maxWorkers 2`, then `npm run typecheck`. Run them one after the other; both must pass.
- Every commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. New modules go into `docs/CODEMAP.md` in the same commit.

## File Structure

| File | Responsibility |
|---|---|
| `src/game/dom/uiBridge.ts` (modify) | D4-P3-R3: `open(id): symbol`, `close(token): boolean`, `PhaserPort` type; ScreenId stays lowercase |
| `src/game/dom/bridge.ts` (new) | D4-P3-R3: `createUiBridge(deps)`, screen registry, token close ordering, `startRun()` with skin preload |
| `src/game/scenes/phaserPort.ts` (new) | Phaser implementation of `PhaserPort` (`ensureSkinTextures`, `scene.start`, `goTo`) and `bridgeOf(scene)` lazy registry accessor |
| `src/game/dom/screens/charactersScreen.ts` (new) | D4-P3-R1 Characters DOM screen |
| `src/game/dom/screens/homeScreen.ts` (new) | D4-P3-R2 simplified Home DOM screen |
| `src/game/dom/screens/screenParts.ts` (new) | Shared parts: `coinPill`, `roundIconBtn`, `ctaButton`, `el()` helper |
| `src/game/dom/styles/screens.css` (new) | Layout for both screens (`.d4-chars-*`, `.d4-home-*`), tokens only |
| `src/game/flow/homeModel.ts` (modify) | MEC-008 reduced `homeView` (`playLevel`, `status`, `bubble`) and `canAffordUnowned` |
| `src/game/scenes/HomeScene.ts`, `CharactersScene.ts` (rewrite) | D4-P3-R3 thin shims |
| `src/game/main.ts` (modify) | `#FAF9F5` background, `screens.css` import, register the bridge |
| `src/game/text.ts` (or the locale source it reads) | new keys `home.bubble.*`, `home.status.*`, `characters.soon` reuse |
| `tests/game/dom/bridge.test.ts` (new) | token ordering, startRun preload, keyboard |
| `tests/game/dom/charactersScreen.test.ts`, `homeScreen.test.ts` (new) | screen states |
| `tests/game/homeModel.test.ts` (rewrite obsolete cases) | MEC-008 simplified Home |
| `tests/game/charactersScene.test.ts`, `boot.test.ts`, `navGuard.test.ts` (adapt) | shim behaviour; scene keys preserved |
| `docs/GDD.md`, `docs/specs/mechanics/MEC-008-*.md`, `docs/DECISIONS.md`, `docs/CODEMAP.md`, `docs/README.md`, `docs/STATUS.md`, `docs/PLAYTEST.md`, `CHANGELOG.md` | records and maps |

---

### Task 1: Bridge contract and token close ordering (`D4-P3-R3`)

**Files:**
- Modify: `src/game/dom/uiBridge.ts`
- Create: `src/game/dom/bridge.ts`
- Test: `tests/game/dom/bridge.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
// uiBridge.ts additions
export interface PhaserPort {
  ensureSkins(skins: readonly SkinId[], done: () => void): void; // wraps ensureSkinTextures on the active scene
  startScene(key: 'Game' | 'Settings' | 'Home' | 'Characters', data?: object): void;
}
export interface ScreenCtx { bridge: UiBridge; debug: boolean; clock?: MotionClock }
export type ScreenRender = (el: HTMLElement, ctx: ScreenCtx) => void | (() => void);
export interface UiBridge {
  session: Session; synth: Synth; t: (key: string, vars?: Record<string, string | number>) => string;
  open(id: ScreenId): symbol;          // was void
  close(token: symbol): boolean;       // new: no-op unless token is the active mount
  startRun(level?: number): void;      // level default = homeView().playLevel; debug ?level= override handled by caller
  goSettings(): void; goCharacters(): void; goHome(): void;
  pause(): void; resume(): void; quitToHome(): void;
}

// bridge.ts
export interface UiBridgeDeps {
  host: UiHost; session: Session; synth: Synth; t: UiBridge['t'];
  port: PhaserPort; screens: Partial<Record<ScreenId, ScreenRender>>;
  activeSkin: () => SkinId; debug: boolean; clock?: MotionClock;
}
export function createUiBridge(deps: UiBridgeDeps): UiBridge;
```
Rules (put the comment `// D4-P3-R3 typed bridge over UiHost: token mounts, skin preload before Game` on `createUiBridge`):
- `open(id)` calls `host.mount({ id, kind: 'screen', render: el => screens[id](el, ctx), onEscape })`. `onEscape` for `characters` is `goHome`; `home` has none. Opening an id without a registered screen throws `Error('no screen: <id>')`.
- `close(token)` delegates to `host.close(token)`.
- `startRun(level)` calls `synth.unlock()`, then `port.ensureSkins([activeSkin()], () => port.startScene('Game', { level, source: 'home', debug }))`. It is re-entrancy guarded: a second call before `done` fires is ignored.
- `goCharacters()` calls `port.startScene('Characters', { debug })`, `goSettings()` calls `port.startScene('Settings', { returnTo: 'Home' })`, and `goHome()` calls `port.startScene('Home')`. The shim's `create()` does the mounting, so navigation stays scene-driven and `navGuard` keeps working.

- [ ] **Step 1: Write failing tests** (`describe('D4-P3-R3 ui bridge')`). Use a real `createUiHost` on a happy-dom root with no-op `LoopHooks`, fake screens that render `<p data-qa="s-<id>">`, and a spy port:
  - `D4-P3-R3 open returns a token and mounts the screen`.
  - `D4-P3-R3 stale close after the next open does not unmount the new screen`. This is the scene ordering case: `const a = open('home'); const b = open('characters'); expect(close(a)).toBe(false);` → `s-characters` still in the DOM and `host.activeId() === 'characters'`; `close(b)` → `true` and the DOM is empty.
  - `D4-P3-R3 startRun ensures the active skin textures before starting Game`. The port records call order, and `startScene('Game', …)` only fires after the `ensureSkins` callback with `['capy']` runs (deferred `done`).
  - `D4-P3-R3 startRun ignores double taps until the run starts`.
  - `D4-P3-R3 Escape on characters navigates home, Escape on home does nothing`. Dispatch `keydown` `Escape` on `document`.
  - `D4-P3-R3 opening an unknown screen throws`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/bridge.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.** Update any existing P1 test or stylebook code that depended on `open(): void` (run `Grep "open\(" tests/game/dom src/game/dom`).
- [ ] **Step 4: Run, expect PASS. Run the P1 guard `tests/game/dom/uiHost.test.ts`. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): UiBridge with token mounts and skin preload before runs (D4-P3-R3)`.

---

### Task 2: Owner ruling: simplified Home rules (docs + pure model) (`D4-P3-R2`, MEC-008)

**Files:**
- Modify: `docs/GDD.md` (Home section), `docs/specs/mechanics/MEC-008-*.md` (find it with `Glob docs/specs/mechanics/MEC-008*`), `docs/DECISIONS.md`
- Modify: `src/game/flow/homeModel.ts`
- Test: rewrite `tests/game/homeModel.test.ts`

**Interfaces:**
```ts
export interface HomeView {
  playLevel: number;                       // MEC-008-R4 highest unlocked checkpoint, else 1
  status: { key: 'home.status.next' | 'home.status.nextClear' | 'home.status.startsAt'; level: number };
  bubble: { key: 'home.bubble.ready' | 'home.bubble.first'; level: number };
}
export function homeView(m: HomeModel): HomeView;
export function canAffordUnowned(m: SkinsModel): boolean; // MEC-011 dot on the Characters button
```
Rules:
- `playLevel = max(checkpoints) || 1` (equal to `m.defaultStart`). Remove `stepCheckpoint`, `secondaryL1`, `stepper`, `carry`, `compact`, `extras`, `showStepper`, `startAt`, and `homeExtras`' `loadoutKey`. `homeExtras` is deleted once no caller remains; the Best chip is not in the simplified Home.
- `status`: if `m.nextMilestone` exists → `next`/`nextClear` with `reach`; otherwise (all checkpoints reached) → `startsAt` with `playLevel`.
- `bubble`: `first` (*"Let's eat!"*) when `playLevel === 1` and there are no checkpoints, else `ready` (*"Ready for L{level}!"*).
- Carried energy (MEC-008 §8) still applies to the run. Only the Home chip is removed. The model field stays in `Session`.
- The pre-run Loadout detour is removed from Home: PLAY → `startRun`. `LoadoutScene` stays registered for P4. Note in DECISIONS that the loadout is reached elsewhere in P4 (or that it auto-applies the saved selection; record what the code actually does today, grep `showLoadout`).

- [ ] **Step 1: Docs first (approved rule change).**
  - GDD Home section: replace the stepper / L1 / loadout / energy items with "Home shows a single PLAY that starts at the highest unlocked checkpoint; a passive checkpoint status pill; Characters and Settings buttons; debug Export log." Link MEC-008 instead of repeating its rules.
  - MEC-008: amend R4 (default start = highest checkpoint, **no** L1 secondary and **no** stepper) and the §8 carry line (carry still applies but is not shown on Home), and keep R11 (the hint becomes the status pill). Mark removed sub-rules `Removed 2026-11-23 (owner ruling, D4-P3)` rather than deleting their IDs.
  - DECISIONS (2026-11-23): "D4-P3 owner ruling: Home simplified to PLAY only. Removed the checkpoint stepper, Start from L1, the pre-run Loadout detour and the Start Energy chip to cut first-screen choices. PLAY starts at the highest unlocked checkpoint. Impact: MEC-008 R4/§8 amended; homeModel tests rewritten; Loadout entry handled in P4."
- [ ] **Step 2: Write failing tests** (rewrite `homeModel.test.ts`). Keep the describe names grep-able:
  - `MEC-008-R4 simplified Home plays L1 without checkpoints`.
  - `MEC-008-R4 simplified Home plays the highest unlocked checkpoint` (checkpoints `[5,10]` → `10`).
  - `MEC-008-R11 status pill shows next checkpoint L10, then L15, then clear L30, then Starts at`.
  - `D4-P3-R2 bubble says Let's eat on first run and Ready for Ln otherwise`.
  - `D4-P3-R2 canAffordUnowned only when coins cover an unowned skin price`.
  - Delete the P3b3-R10 stepper / L1 / energy-chip cases and the `homeExtras` loadout case. List the removed test names in the commit body.
- [ ] **Step 3: Run, expect FAIL:** `npx vitest run tests/game/homeModel.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 4: Implement** `homeModel.ts` (comment `// MEC-008-R4 D4-P3 simplified Home: one PLAY at the highest checkpoint`). Add the locale keys `home.bubble.ready`, `home.bubble.first`, `home.status.next`, `home.status.nextClear`, `home.status.startsAt`. The legacy `HomeScene` will not compile yet; keep it compiling by leaving the old helpers exported as deprecated until Task 6 deletes them, **or** do Task 6 straight after this task. Typecheck must pass at every commit.
- [ ] **Step 5: Run, expect PASS. Update CHANGELOG, run the full suite + typecheck, commit** `docs+feat(home): owner ruling, PLAY-only Home model (MEC-008, D4-P3-R2)`.

---

### Task 3: Shared screen parts and `screens.css`

**Files:**
- Create: `src/game/dom/screens/screenParts.ts`, `src/game/dom/styles/screens.css`
- Modify: `src/game/main.ts` (`import './dom/styles/screens.css';` after `motion.css`)
- Test: `tests/game/dom/screenParts.test.ts` (new, `happy-dom`), `tests/game/dom/screensCss.test.ts` (new, `node`, text-level)

**Interfaces:**
```ts
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, attrs?: Record<string, string>): HTMLElementTagNameMap[K];
export function roundIconBtn(icon: IconName, qa: string, label: string, onTap: () => void): HTMLButtonElement; // 48x48
export function ctaButton(qa: string, label: string, tone: 'green' | 'flat', onTap: () => void, icon?: IconName): HTMLButtonElement;
export function coinPill(qa: string, value: number): { el: HTMLElement; set(n: number, clock?: MotionClock): void }; // countUp odometer
```
CSS contract (all sizes come from the spec; colours only via `var(--d4-…)`):
- `.d4-screen` is a full-height column flex at `100%` of `#ui-root`, with background `var(--d4-bg)`.
- `.d4-chars-header` is `56px`. `.d4-chars-stage` has `min-height: 200px; max-height: 260px; flex: 1 1 auto`. `.d4-chars-identity` is `~68px`. `.d4-chars-grid` is `grid-template-columns: repeat(3, 1fr); grid-auto-rows: 72px; gap: 8px; padding: 0 16px`. `.d4-chars-footer` has `padding: 12px 16px 16px`, and its `.d4-cta` is `52px`.
- `.d4-tile` has `border-radius: 16px; border: 2px solid var(--d4-border); box-shadow: 0 3px 0 var(--d4-border)`. `.d4-tile.is-selected` uses `var(--d4-sky-face)` border + `var(--d4-sky-tint)` (add both tokens to `tokens.css` if P1 lacks them: `#1CB0F6`, `#DDF4FF`). `.d4-tile-badge` is `top: 5px; right: 5px`.
- `.d4-home-top`, `.d4-home-hero { flex: 1 }`, `.d4-home-wordmark` (`Lilita One`, amber `var(--d4-gold-face)`, ink `var(--d4-ink)`), `.d4-home-play` (`56px`, idle pulse via `motion.css` keyframes), `.d4-home-status` (`var(--d4-surface-sunk)` = `#F2EFE9`, no lip).
- Button lip: `.d4-cta.is-green` uses `var(--d4-green-face)` with `0 4px 0 var(--d4-green-lip)`. `.d4-cta.is-flat` uses `var(--d4-disabled)` (`#E5E2DC`) with `box-shadow: none`.

- [ ] **Step 1: Write failing tests:**
  - `D4-P3 roundIconBtn is a 48px button with data-qa, aria-label and an inline icon svg`.
  - `D4-P3 ctaButton flat tone is aria-disabled but still clickable` (the `need` state must still receive taps for the shake).
  - `D4-P3 coinPill set counts up with the injected clock and ends on the value` (`FakeClock`).
  - `screensCss`: `D4-P3-R1 grid rows are 72px with 8px gap`, `D4-P3-R1 stage min 200 max 260`, `D4-P3 no hex colours in screens.css`, `D4-P3 main.ts imports screens.css`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/screenParts.test.ts tests/game/dom/screensCss.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): shared D4 screen parts and screen layout css (D4-P3)`.

---

### Task 4: Characters DOM screen (`D4-P3-R1`)

**Files:**
- Create: `src/game/dom/screens/charactersScreen.ts`
- Test: `tests/game/dom/charactersScreen.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export const charactersScreen: ScreenRender; // (el, ctx) => cleanup
```
Structure (`data-qa` hooks are the QA contract):
```
.d4-screen.d4-chars
  header.d4-chars-header: [chars-back <] [h1 chars-title "Characters"] [chars-coins pill] [chars-debug-coins +500 (debug only)]
  section.d4-chars-stage[data-qa=chars-stage][style=--halo: var(--d4-skin-<id>-tint)]: HeroStage(skin=preview)
  div.d4-chars-identity: [chars-name] [chars-rarity pill .is-default|.is-common|.is-rare(+star)] [chars-perk]
  div.d4-chars-grid: 5 x button.d4-tile[data-qa=chars-token-<id>] (head thumbnail = headSvg inline, badge, footer price/Owned/Equipped) + 1 Soon tile (chars-token-soon, disabled)
  footer.d4-chars-footer: chars-action
```
Rules (put the comment `// D4-P3-R1 Characters DOM screen over charactersView (MEC-011-R14..R21)` on `charactersScreen`):
- The state is `preview` (initially `skinsModel().equipped`). `render()` re-derives `charactersView(session.skinsModel(), preview)` and patches the DOM in place. It does not rebuild the `HeroStage`: it calls `hero.setSkin()` and toggles a `.is-swap` class (spring keyframe), so breathing does not restart.
- Tile tap → `synth.play('uiTap')`, set `preview`, spring pop (`.is-pop`) on the selected tile.
- Hero tap → `HeroStage` interactive poke (P2) + `synth.play('uiTap')`.
- Action:
  - `buy` → `session.buySkin(id).ok` → `setActiveSkin(id)`, `synth.play('unlock')`, `hero.react('celebrate')`, `burstConfetti(stage, cx, cy)`, coin pill `set(newCoins)` (odometer).
  - `equip` → `session.equipSkin(id)` → `setActiveSkin(id)`, `synth.play('uiTap')`.
  - `need` → `synth.play('nope')`, `shakeDenied(action)`, `hero.react('denied')`. No state change.
  - `equipped` → no-op (flat button, check icon, `aria-disabled="true"`).
  - Labels: `t('characters.buy',{n:price})`, `t('characters.equip')`, `t('characters.equipped')`, `t('characters.need',{n:missing})`.
- Debug `+500` (`ctx.debug`) → `session.debugAddCoins()` → re-render with the odometer.
- Back → `synth.play('uiTap')`, `bridge.goHome()`. Escape goes through `onEscape` (Task 1).
- Cleanup destroys the `HeroStage`, cancels pending `countUp`, and disposes confetti.
- Halo tint: a per-skin accent comes from a lookup `skinAccentVar(id)` that returns `var(--d4-…)` names only (no hex in TS).

- [ ] **Step 1: Write failing tests.** Stub the bridge: a real `Session` from the existing test factory (grep `tests/` for the helper used by `charactersView.test.ts`), a spy synth, `t` = the real `t`, and a `FakeClock`. Tests:
  - `D4-P3-R1 renders header, stage hero, identity, 6 tiles and the action` (all `data-qa` present, `chars-token-soon` disabled).
  - `D4-P3-R1 equipped state: flat Equipped action, check badge on the equipped tile`.
  - `D4-P3-R1 selecting an owned skin shows Equip and equipping updates session and activeSkin`.
  - `D4-P3-R1 buy deducts coins, equips, plays unlock, celebrates and bursts confetti` (spy on `setCelebrationFx`; `hero` `data-reaction="celebrate"`; the coin pill ends on the new balance after `clock.advance`).
  - `D4-P3-R1 need state shows Need N more, tap plays nope, shakes and the hero is denied, coins unchanged`.
  - `D4-P3-R1 lock badge on locked tiles shows the price footer`.
  - `D4-P3-R1 debug +500 only with debug and adds the balance grant`.
  - `D4-P3-R1 switching preview keeps one hero element (no rebuild)`.
  - `D4-P3-R1 Escape and Back call goHome` (bridge spy).
  - `D4-P3-R1 cleanup leaves no pending timers and no hero in the DOM` (`clock.pending() === 0`).
  - `D4-P3-R1 every button has data-qa and a label`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/charactersScreen.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): Characters DOM screen (D4-P3-R1)`.

---

### Task 5: Simplified Home DOM screen (`D4-P3-R2`)

**Files:**
- Create: `src/game/dom/screens/homeScreen.ts`
- Test: `tests/game/dom/homeScreen.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export const homeScreen: ScreenRender;
export interface HomeScreenDeps { debugLevel?: () => number | null; exportLog?: (json: string) => Promise<void> } // injected for tests
```
Structure:
```
.d4-screen.d4-home
  div.d4-home-top: [home-export (debug only, left)] [home-characters (avatar icon + .d4-dot when canAffordUnowned)] [home-settings (gear)]
  section.d4-home-hero: wordmark MANGO / SNAKE, .d4-bubble[data-qa=home-bubble], HeroStage(skin=activeSkin) + svg mango[data-qa=home-mango] (bob via css)
  button.d4-home-play[data-qa=home-play] "PLAY"
  div.d4-home-status[data-qa=home-status] (flag icon + status text; not a button, no role=button)
```
Rules (put the comment `// D4-P3-R2 simplified Home: PLAY only (owner ruling 2026-11-23)` on `homeScreen`):
- `PLAY` → `bridge.startRun(debugLevel() ?? homeView(m).playLevel)`. A debug `?level=N` passes `debug: true` through `startRun` (extend the signature to `startRun(level, debug?)` if needed). The bridge does the preload (Task 1).
- The hero's pupils track the mango: on each mango bob frame (`clock.raf` loop, stopped on cleanup and under reduced motion), call `hero.lookAt(mangoCx - heroCx, mangoCy - heroCy)`. Under reduced motion, call `lookAt` once with no loop.
- Hero tap → poke + `uiTap`.
- Characters → `uiTap` + `bridge.goCharacters()`. Settings → `uiTap` + `bridge.goSettings()`.
- Keyboard: a `keydown` listener on `document` for `Enter`/`Space` calls `play()` **only if** `!(document.activeElement instanceof HTMLButtonElement)`, which prevents double-firing with the focused button's own click. The listener is removed in cleanup.
- Debug: `home-export` copies `session.exportLog()` to the clipboard (fallback: read-only textarea, removed on cleanup), and shows a `home-export-done` toast. `window.__summarize` is installed (move the code from `HomeScene.setupDebug` into a small pure helper `installSummarize(balance)` in `src/game/flow/` so both the shim and tests can call it).
- PLAY idle pulse is CSS only (`.d4-home-play.is-idle`), added after the stagger entrance; skipped under `.reduced-motion`.

- [ ] **Step 1: Write failing tests:**
  - `D4-P3-R2 Home shows wordmark, bubble, equipped hero, PLAY and status; no stepper, L1, loadout or energy chip` (assert `home-prev`, `home-next`, `home-l1`, `home-loadout`, `home-best` are absent).
  - `D4-P3-R2 hero renders the equipped skin` (`data-qa="hero-capy"` after `setActiveSkin('capy')`).
  - `D4-P3-R2 bubble text: Let's eat on first run, Ready for L10 with checkpoint 10`.
  - `D4-P3-R2 status pill: Next checkpoint at L10 / Starts at L30, not focusable, not a button`.
  - `D4-P3-R2 Characters dot only when an unowned skin is affordable`.
  - `D4-P3-R2 PLAY calls startRun with the highest checkpoint` and `… with the debug level when ?level= is set`.
  - `D4-P3-R3 PLAY handoff preloads the equipped skin before Game` (integration with the real `createUiBridge` + spy port: `ensureSkins(['capy'])` is called before `startScene('Game')`).
  - `D4-P3-R3 Enter starts a run only when focus is not on a button` (focus `home-settings`, press Enter → no `startRun`; blur, press Enter → one `startRun`; Space works the same).
  - `D4-P3-R2 debug export pill and __summarize only with debug`.
  - `D4-P3-R2 hero eyes track the mango` (after frames, the pupil groups have a non-zero `translate`).
  - `D4-P3-R2 cleanup removes listeners, the hero and timers` (Enter after cleanup → no call; `clock.pending() === 0`).
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/homeScreen.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP, run the full suite + typecheck, commit** `feat(ui): simplified PLAY-only Home DOM screen (D4-P3-R2)`.

---

### Task 6: Thin `HomeScene` / `CharactersScene` shims + Phaser port (`D4-P3-R3`)

**Files:**
- Create: `src/game/scenes/phaserPort.ts`
- Rewrite: `src/game/scenes/HomeScene.ts`, `src/game/scenes/CharactersScene.ts`
- Modify: `src/game/main.ts` (create the bridge in `postBoot` after `uiHost`: `game.registry.set('uiBridge', createUiBridge({...}))`)
- Test: adapt `tests/game/charactersScene.test.ts`, check `tests/game/boot.test.ts` and `tests/game/navGuard.test.ts`; new `tests/game/sceneShims.test.ts` (`happy-dom`, with a minimal fake scene object, no Phaser runtime)

**Interfaces:**
```ts
// phaserPort.ts
export function createPhaserPort(game: Phaser.Game): PhaserPort; // ensureSkins -> ensureSkinTextures(activeScene, ...); startScene -> goTo(activeScene, key, data, 'forward')
export function bridgeOf(scene: { registry: { get(k: string): unknown } }): UiBridge | null;
// Scene shim shape (both scenes):
create(): void {
  const bridge = bridgeOf(this); if (!bridge) return;            // tests / artPreview without #ui-root
  const token = bridge.open('home');                             // or 'characters'
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => bridge.close(token));
}
```
Rules (put the comment `// D4-P3-R3 thin shim: the DOM screen owns Home; close(token) is order-safe` in each scene):
- Delete all Phaser drawing, idle, sweep and stepper code from both scenes, plus the now-unused imports. Do not delete shared widgets used by other scenes (`Grep` each import before removing a module; removing a module is out of scope here and belongs to D4-P5).
- `CharactersScene.init(data)` stores `debug` only for parity. The bridge passes `ctx.debug` from `isDebug(location.search)`.
- `HomeScene` keeps a `goTo`-compatible scene key so `goTo(this, 'Home')` from Loadout/Results/Settings/Game still lands on the DOM Home.
- **Ordering proof (unit, no Phaser):** simulate `scene.start('Characters')` from Home with the real bridge + host: run `CharactersShim.create()` **then** fire Home's `SHUTDOWN` → Characters stays mounted (`host.activeId() === 'characters'`). Then the reverse direction.
- When the Game scene starts, `GameScene` is a canvas scene: the Home shim's `SHUTDOWN` calls `close(token)`, which unmounts Home and wakes and shows the canvas (P1 `applyKind`). Assert in the shim test that the hooks `wake` and `canvasVisible(true)` fire.

- [ ] **Step 1: Write failing tests** in `tests/game/sceneShims.test.ts`:
  - `D4-P3-R3 Home shim opens home on create and closes its token on shutdown`.
  - `D4-P3-R3 shutdown of the previous scene after the next create never wipes the new screen` (both directions).
  - `D4-P3-R3 leaving Home for Game unmounts the DOM and restores the canvas`.
  - `D4-P3-R3 shim without a bridge is a no-op` (artPreview / headless boot).
  - Update `charactersScene.test.ts`: replace Phaser-drawing expectations with "opens characters and closes on shutdown". Keep any MEC-011 test that now belongs to `charactersScreen.test.ts` by moving it there (same test name) rather than deleting it.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/sceneShims.test.ts tests/game/charactersScene.test.ts tests/game/boot.test.ts tests/game/navGuard.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.** Remove the deprecated `homeModel` helpers left from Task 2 if they are now unused.
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG and CODEMAP (scenes are shims; new `phaserPort.ts`), run the full suite + typecheck, commit** `refactor(scenes): Home and Characters become thin DOM shims (D4-P3-R3)`.

---

### Task 7: `ensureSkinTextures` preload guard before `GameScene` (`D4-P3-R3`)

**Files:**
- Modify: `src/game/scenes/phaserPort.ts` (and `beginRun` in `src/game/scenes/ui.ts` if Results/Loadout "play again" also start runs)
- Test: `tests/game/phaserPort.test.ts` (new, `node`, fake scene with `textures.exists` / `load` spies)

Rules:
- `ensureSkins` runs on the currently active scene (`game.scene.getScenes(true)[0]`). If every key already exists (`headKey(skin,'idle','board')` etc.), `done` fires synchronously. Otherwise it waits for the loader `complete` event exactly once. Calling it twice while loading still calls `done` exactly once per caller.
- **Every** path that starts `GameScene` with a possibly newly equipped skin goes through the same guard. Grep `start('Game'` / `beginRun(` and route `beginRun` through `ensureSkinTextures(scene, [activeSkin()], …)` as well, so Results "Play again" after a Characters purchase cannot crash `CapyHead`.

- [ ] **Step 1: Write failing tests:**
  - `D4-P3-R3 ensureSkins fires done immediately when textures exist`.
  - `D4-P3-R3 ensureSkins waits for the loader when the equipped skin is missing, then starts Game` (the port records `start` only after `load.emit('complete')`).
  - `D4-P3-R3 beginRun preloads the active skin before starting Game`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/phaserPort.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG, run the full suite + typecheck, commit** `fix(run): preload the equipped skin textures before every GameScene start (D4-P3-R3)`.

---

### Task 8: Calm Boot handoff `#FAF9F5` (`D4-P3-R3`)

**Files:**
- Modify: `src/game/main.ts` (`backgroundColor`), `index.html` body background if it is set there, `BootScene` background if it paints its own
- Test: extend `tests/game/dom/indexHtml.test.ts` (or `tests/game/boot.test.ts`, whichever already reads `main.ts`)

Rules:
- `backgroundColor` reads the D4 background from one place. Add `TOKENS.d4.bg = '#FAF9F5'` to `uiTokens.ts` (a test asserts it equals `--d4-bg` in `tokens.css`), then use `backgroundColor: TOKENS.d4.bg`. Replace the D3-R10 comment with `// D4-P3-R3 first frame matches the D4 DOM background (no blue flash)`.
- If `BootScene` draws a biome gradient, swap it for the flat `TOKENS.d4.bg` so Boot → DOM Home has no colour jump. Keep the progress bar.

- [ ] **Step 1: Write failing tests:** `D4-P3-R3 game background equals --d4-bg (#FAF9F5)` (text-level on `main.ts` + `tokens.css` parse) and `D4-P3-R3 TOKENS.d4.bg mirrors tokens.css`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Update CHANGELOG, run the full suite + typecheck, commit** `feat(boot): calm #FAF9F5 boot background (D4-P3-R3)`.

---

### Task 9: Chrome QA at 360×640 and 360×780

**Files:** `docs/PLAYTEST.md` (new entry), screenshots in `tmp/qa/d4-p3/` (git-ignored)

- [ ] **Step 1:** Start `npm run dev` (background). Use `tools/qa/shot.mjs` if present (check `Glob tools/qa/*`), else headless Chrome via Playwright from the QA worker. Viewports: **360×640** and **360×780**.
- [ ] **Step 2: Capture** (0 console errors on each page, which the script must assert):
  - `home-640.png`, `home-780.png`: first-run state, then with `?debug=1` after `__game.registry.get('session').debugSkipTo(10)`: bubble "Ready for L10!", status pill, Characters dot after `+500` coins.
  - `chars-640.png`, `chars-780.png`: equipped state; `chars-need-*.png` (preview a locked skin with low coins); `chars-buy-*.png` (after debug `+500`, preview `ginger`); `chars-after-buy-*.png`.
  - `play-handoff.png`: buy `capy` in Characters → Back → PLAY → the board renders the capy head (no missing-texture box); then Escape/pause → quit to Home → DOM Home is visible.
- [ ] **Step 3: Check against the spec:** at 360×640 the stage is ≥ 200 px tall and the grid tiles are 72 px with no overlap of badges and ears. At 360×780 the stage is ≤ 260 px with no dead void at the top. Tap targets are ≥ 48 px. Enter on a focused button fires once. Reduced motion (DevTools emulation) stops breathing, the pulse and confetti.
- [ ] **Step 4:** Add a PLAYTEST.md entry (date, build, viewports, findings, screenshot paths). Fix any defects in their own `fix:` commits (systematic-debugging first).
- [ ] **Step 5:** Ask the owner for the eye-check approval (gate to Phase 4). Commit `docs: D4-P3 QA record`.

---

### Task 10: Phase close-out

**Files:** `docs/STATUS.md`, `docs/CODEMAP.md`, `docs/README.md`, `CHANGELOG.md`

- [ ] **Step 1:** `Grep "D4-P3-R" src tests` shows that every rule R1..R3 has at least 1 test name and at least 1 implementing comment. `Grep "MEC-008-R4" tests` shows the rewritten tests.
- [ ] **Step 2:** `Grep "from 'phaser'" src/game/dom` returns nothing. `Grep "home-prev|home-l1|home-loadout|stepCheckpoint" src` returns nothing.
- [ ] **Step 3:** Phaser smoke: `?debug=1&artPreview=1` still opens ArtPreview. The flows Loadout/Results/Settings → Home land on the DOM Home. A full run → Results → Home works with no console errors.
- [ ] **Step 4:** Run the full suite + typecheck one after the other and record the counts.
- [ ] **Step 5:** Update STATUS (Now: D4-P3 done, awaiting owner eye-check; Next: D4-P4 Loadout/Results/Settings & overlays) and the README docs-map status for UI-D4-P3-PLAN. Commit `docs: D4-P3 status`.
- [ ] **Step 6:** `superpowers:requesting-code-review` → fix → `git checkout version/v0.3; git merge --no-ff feat/d4-p3-characters-home`. Refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

---

## Exit Gate

- [ ] Characters DOM screen: header/coins/debug `+500`, adaptive stage with live `HeroStage` and halo, identity block, 3×2 grid (72 px tiles, 8 px gap, top-right badges), and the CTA states `buy`/`equip`/`equipped`/`need` with unlock+celebrate+confetti+odometer or nope+shake+denied. Escape/Back go Home. Covered by `charactersScreen.test.ts`.
- [ ] Simplified Home: wordmark, bubble, hero tracking the mango, single `PLAY` (56 px, pulse), passive status pill, Characters (affordability dot) and Settings buttons, debug Export + `__summarize`. No stepper/L1/loadout/energy chip. Covered by `homeScreen.test.ts` + rewritten `homeModel.test.ts`.
- [ ] GDD, MEC-008 and DECISIONS record the owner ruling (2026-11-23). Obsolete Home tests were removed and listed in the commit body.
- [ ] Thin shims open on `create()` and `close(token)` on `SHUTDOWN`. The stale-close test proves `scene.start` ordering never wipes the new screen. `boot.test.ts`, `navGuard.test.ts` and `artPreview` are intact.
- [ ] `startRun()` and `beginRun()` preload the equipped skin with `ensureSkinTextures` before `GameScene`, and a newly bought skin renders in-run.
- [ ] Boot background is `#FAF9F5` (single source, guarded by a test).
- [ ] `npx vitest run --configLoader native --pool threads --maxWorkers 2` and `npm run typecheck` pass when run one after the other.
- [ ] Chrome QA shots for Home and Characters at 360×640 and 360×780 in `tmp/qa/d4-p3/`, with 0 console errors, a PLAYTEST entry, and owner eye-check approval (gate to D4-P4).
- [ ] `CHANGELOG.md` `[Unreleased]`, `docs/CODEMAP.md`, `docs/README.md`, `docs/STATUS.md` updated; all text in English.
