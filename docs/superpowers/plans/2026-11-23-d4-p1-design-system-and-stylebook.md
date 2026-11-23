# D4-P1 Design System & Stylebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task follows superpowers:test-driven-development (red → green → commit).

**Goal:** Ship the D4 "Duolingo Modern" foundation — CSS tokens and components, inline SVG icon kit, a full-viewport `#ui-root` overlay synced 1:1 to the Phaser canvas, a typed DOM host/bridge, a singleton Web Audio context with a shared mute flag, a `happy-dom` test harness, and an interactive Visual Stylebook the owner can approve in a browser. No live screen migrates in this phase (that is P3/P4).

**Architecture:** `index.html` gains a sibling `#ui-root` (fixed, `z-index: 2`, `pointer-events: none`) next to the untouched `#game`. A new `src/game/dom/` folder holds Phaser-import-free modules: `stageSync.ts` (canvas rect → `#ui-root` box + CSS vars, rAF-throttled, injectable sources), `uiHost.ts` (token-based mount/unmount, modal state, Escape, reduced-motion class, injected loop/input hooks), `uiBridge.ts` (typed interface only), `icons.ts` (SVG strings), and `styles/tokens.css` + `styles/components.css`. `synth.ts` moves its `AudioContext` and `on` flag to module scope so every `createSynth()` shares them. `main.ts` imports the CSS, sets `audio: { noAudio: true }`, installs the audio unlock, starts `stageSync`, and creates the host. `viewport.ts` gets a band-colour lock so Phaser scenes cannot repaint the page while a DOM menu is open. The stylebook (`docs/design/mockups/d4/stylebook.html`) links the shipped CSS files directly.

**Tech Stack:** TypeScript strict, Phaser 3.90, Vite, Vitest. New devDependency: `happy-dom` (owner-approved 2026-11-23). No runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-d4-p1-design-system-and-stylebook.md` (rules `D4-P1-R1..R7`). Umbrella: `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`.

## Global Constraints

- Read `AGENTS.md` first. All repository text in English. Conventional Commits. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/d4-p1-design-system`, created from `version/v0.3`. One commit per task. Merge back with `git merge --no-ff` after full tests + typecheck pass. No push.
- Installing `happy-dom` is a protected action: it is owner-approved for this phase (spec §3); install exactly `npm install -D happy-dom` and pin the resolved version in `docs/DECISIONS.md`. No other new dependency.
- Modules under `src/game/dom/` **never import `phaser`** (they are tested under `happy-dom` without Phaser). Phaser objects reach them only through injected hooks typed in `uiBridge.ts`.
- DOM tests declare `// @vitest-environment happy-dom` on line 1 of the test file. Do **not** change the global `environment: 'node'` in `vitest.config.ts`; existing tests must stay on `node`.
- Requirement IDs go into test names (`D4-P1-R1 ...`) and a one-line comment at each main implementing function.
- No magic numbers in TS: the stage base width (`360`) and board fractions come from existing layout modules (`src/game/layout.ts`, `src/game/ui/layout.ts`, `src/game/hud/d3HudLayout.ts`); colours live only in `tokens.css`. The stylebook never copies a hex value that exists in `tokens.css` — it uses `var(--d4-…)`.
- Every interactive element in the stylebook and in any DOM markup carries `data-qa="<id>"`; tap targets ≥ 48×48 px.
- Existing guards must stay green: `tests/game/heightGuard.test.ts`, `tests/game/tokenGuard.test.ts`, `tests/game/navGuard.test.ts`, `tests/game/uiMinHit.test.ts`, `tests/game/viewport.test.ts`, `tests/game/platform.test.ts` (uses `createSynth` under `node`).
- Commands (Windows, PowerShell):
  - Touched tests only: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`
  - Before each commit: `npx vitest run --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`; both must pass.
- Every commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. New modules → `docs/CODEMAP.md` in the same commit.
- Do not touch `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `package-lock.json` | `happy-dom` devDependency |
| `tests/game/dom/harness.test.ts` (new) | proves the per-file `happy-dom` environment works |
| `src/game/dom/styles/tokens.css` (new) | D4-P1-R2 colour tokens, R4 spacing/type tokens, radii, lips |
| `src/game/dom/styles/components.css` (new) | D4-P1-R3 `.d4-btn`, `.d4-btn--disabled`, `.d4-icon-btn`, `.d4-chip`, `.d4-card`, `.d4-bubble`, `.d4-toggle`, `.d4-backdrop-pattern`, `#ui-root` base, `.reduced-motion` |
| `src/game/dom/icons.ts` (new) | D4-P1-R5 `ICON_NAMES`, `icon(name, opts?)` → SVG string |
| `src/game/audio/synth.ts` | D4-P1-R6 shared `AudioContext` + shared `on`, `installAudioUnlock`, `__resetAudioForTests` |
| `src/game/dom/stageSync.ts` (new) | D4-P1-R1 canvas rect → `#ui-root` box + `--stage-*` / `--board-*` vars |
| `src/game/viewport.ts` | D4-P1-R1 `setBandLock(locked)` gate on `setBandColor` |
| `src/game/dom/uiBridge.ts` (new) | D4-P1-R6 typed bridge + `LoopHooks` interfaces (types only) |
| `src/game/dom/uiHost.ts` (new) | D4-P1-R6 mount token, `isModalOpen`, Escape, reduced-motion sync, loop/input/canvas hooks |
| `index.html`, `src/game/main.ts` | `#ui-root`, warm page bg, CSS imports, `noAudio`, wiring |
| `docs/design/mockups/d4/stylebook.html` (new) | D4-P1-R7 interactive stylebook |
| `tests/game/dom/*.test.ts` (new) | `stageSync`, `uiHost`, `icons`, `synthSingleton`, `cssTokens`, `stylebook` |
| `docs/DECISIONS.md`, `docs/CODEMAP.md`, `CHANGELOG.md`, `docs/STATUS.md` | records and maps |

---

### Task 1: `happy-dom` harness and DECISIONS entry

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm), `docs/DECISIONS.md`, `CHANGELOG.md`
- Test: `tests/game/dom/harness.test.ts` (new)

**Interfaces:** none (tooling only).

- [ ] **Step 1: Write the failing test** `tests/game/dom/harness.test.ts`

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

describe('D4-P1 happy-dom harness', () => {
  it('D4-P1-R6 DOM APIs exist in files that opt into happy-dom', () => {
    const el = document.createElement('div');
    el.dataset.qa = 'probe'; document.body.appendChild(el);
    expect(document.querySelector('[data-qa="probe"]')).toBe(el);
    expect(typeof window.requestAnimationFrame).toBe('function');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (environment `happy-dom` cannot be resolved):
  `npx vitest run tests/game/dom/harness.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Install** `npm install -D happy-dom`. Read the resolved version from `package.json`.
- [ ] **Step 4: Run again, expect PASS.** Also run `npx vitest run tests/game/viewport.test.ts --configLoader native --pool threads --maxWorkers 2` to confirm `node` tests are unaffected (`setBandColor` no-op test must still see no `document`).
- [ ] **Step 5: Append to `docs/DECISIONS.md`** (dated 2026-11-23): "D4-P1: add `happy-dom@<version>` as devDependency for DOM unit tests (owner-approved 2026-11-23). Opt-in per file with `// @vitest-environment happy-dom`; the global environment stays `node` so existing tests stay fast and `document`-free. Rejected: `jsdom` (heavier, slower start)."
- [ ] **Step 6: CHANGELOG line, full suite + typecheck, commit** `chore(test): add happy-dom for DOM unit tests (D4-P1)`.

---

### Task 2: Colour, type and spacing tokens (`tokens.css`)

**Files:**
- Create: `src/game/dom/styles/tokens.css`
- Test: `tests/game/dom/cssTokens.test.ts` (new, `node` env; reads the file as text)

**Interfaces:**
- Produces CSS custom properties on `:root`:
  - Neutrals: `--d4-bg #FAF9F5`, `--d4-surface #F2EFE9`, `--d4-card #FFFFFF`, `--d4-border #E5E2DC`, `--d4-border-strong #D2CEC6`
  - Ink: `--d4-ink #3C3C3C`, `--d4-ink-muted #777777`, `--d4-disabled-bg #E5E2DC`, `--d4-disabled-ink #AFAFAF`
  - Accents, each `-face`/`-lip`/`-tint`: `--d4-green-*` `#58CC02/#46A302/#D7FFB8`, `--d4-gold-*` `#FFC800/#E5A400/#FFF5CC` + `--d4-gold-ink #6B4400`, `--d4-sky-*` `#1CB0F6/#1899D6/#DDF4FF`, `--d4-purple-*` `#CE82FF/#A568CC/#F3E5FF`, `--d4-red-*` `#FF4B4B/#EA2B2B/#FFDFE0`
  - Spacing: `--sp-1 4px`, `--sp-2 8px`, `--sp-3 12px`, `--sp-4 16px`, `--sp-6 24px`, `--sp-8 32px`
  - Type: `--font-display: 'Lilita One', Nunito, sans-serif`, `--font-ui: Nunito, system-ui, sans-serif`
  - Shape: `--radius-md 16px`, `--radius-pill 999px`, `--lip 4px`, `--lip-pressed 2px`, `--hit-min 48px`
- Stage defaults (overwritten by `stageSync`): `--stage-w 360px`, `--stage-h 640px`, `--stage-scale 1`, `--board-top 0%`, `--board-h 100%`
- Fonts: no `@font-face` here — `index.html` already declares them from `/fonts/`; the stylebook declares the same block (fonts are not colour tokens, so no drift risk).

- [ ] **Step 1: Write the failing test** — parse `--name: value;` pairs with a regex from `readFileSync('src/game/dom/styles/tokens.css', 'utf8')` and assert:
  - `D4-P1-R2 tokens define the warm 60-30-10 palette` — a table of all names/hex above (case-insensitive compare).
  - `D4-P1-R4 tokens define the 8pt spacing scale and both font stacks` — spacing values and that `--font-display` starts with `'Lilita One'`, `--font-ui` with `Nunito`.
  - `D4-P1-R2 no hex value is defined twice under different accent names` except the allowed pair `--d4-border` = `--d4-disabled-bg` (spec).
- [ ] **Step 2: Run, expect FAIL** (file missing): `npx vitest run tests/game/dom/cssTokens.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement `tokens.css`** with a header comment `/* D4-P1-R2 / R4 Duolingo Modern tokens — single source for every D4 colour. */`.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: CHANGELOG, CODEMAP (`src/game/dom/styles/`), full suite + typecheck, commit** `feat(ui): D4 colour, type and spacing tokens (D4-P1-R2, R4)`.

---

### Task 3: Tactile component primitives (`components.css`)

**Files:**
- Create: `src/game/dom/styles/components.css`
- Test: extend `tests/game/dom/cssTokens.test.ts` (text-level checks) and add `tests/game/dom/components.test.ts` (`happy-dom`, computed classes only)

**Interfaces (class contract used by P3/P4 and the stylebook):**
- `#ui-root` base: `position: fixed; z-index: 2; pointer-events: none;` children with `[data-ui-active]` get `pointer-events: auto`.
- `.d4-btn` + variants `--green` (default), `--gold`, `--sky`, `--purple`, `--red`, `--neutral` (white face, `--d4-border-strong` lip). Each variant sets local `--face`, `--lip-color`, `--ink`. Base: `border-radius: var(--radius-md); background: var(--face); box-shadow: 0 var(--lip) 0 var(--lip-color); min-height: var(--hit-min); font: 800 … var(--font-ui);` `:active, .is-pressed` → `transform: translateY(2px); box-shadow: 0 var(--lip-pressed) 0 var(--lip-color);`. `.d4-btn--cta` → `min-height: 56px`.
- `.d4-btn--disabled, .d4-btn:disabled` → flat `--d4-disabled-bg` / `--d4-disabled-ink`, `box-shadow: none`, `transform: none` on `:active`.
- `.d4-icon-btn` 48×48 circle, white, `2px solid var(--d4-border)`, `0 3px 0 var(--d4-border)`.
- `.d4-chip` (+ `--gold`, `--sky`, `--purple`, `--green`, `--red` tint variants): pill, `1.5px solid`, **no `box-shadow`**, `font-variant-numeric: tabular-nums`.
- `.d4-card`: white, `2px solid var(--d4-border)`, radius 16, `0 4px 0 var(--d4-border)`. `.d4-card .d4-card` → `border: 0; box-shadow: none` (no nested bordered cards).
- `.d4-bubble`: white pill with `::after` tail.
- `.d4-toggle` (`role="switch"`, `aria-checked`): track + knob, green when checked.
- `.d4-title` (`--font-display`, flat 0 3px 0 lip-shadow, no `-webkit-text-stroke`), `.d4-num` (`tabular-nums`).
- `.d4-backdrop-pattern`: `background-image` = inline SVG data URI of leaf + mango silhouettes at `opacity` ≈ 0.035 via a `::before` layer.
- `.reduced-motion *` → `transition: none !important; animation: none !important;`.

- [ ] **Step 1: Write failing text-level tests** (in `cssTokens.test.ts`, `describe('D4-P1-R3 components.css')`):
  - every selector above exists;
  - `D4-P1-R3 no gloss`: file contains no `linear-gradient`, `radial-gradient` (except inside the backdrop data URI — strip `url(...)` before checking), `-webkit-text-stroke`, `text-stroke`;
  - `D4-P1-R3 no raw hex outside tokens`: after stripping `url(...)`, no `#[0-9a-f]{3,8}` matches (components use only `var(--…)`);
  - `.d4-chip` block has no `box-shadow`; `.d4-btn--disabled` block has `box-shadow: none`.
- [ ] **Step 2: Write failing `happy-dom` test** `tests/game/dom/components.test.ts`: inject both CSS files into a `<style>`, render one `.d4-btn`, `.d4-icon-btn`, `.d4-chip`; assert via `getComputedStyle` where `happy-dom` supports it (`min-height: 48px` on `.d4-btn`, `width/height: 48px` on `.d4-icon-btn`, `pointer-events: none` on `#ui-root`). If a property is not computed by `happy-dom`, keep that assertion in the text-level test instead — do not weaken it.
- [ ] **Step 3: Run, expect FAIL:** `npx vitest run tests/game/dom/cssTokens.test.ts tests/game/dom/components.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 4: Implement `components.css`.** Header comment `/* D4-P1-R3 tactile flat primitives — colours only via tokens.css vars. */`
- [ ] **Step 5: Run, expect PASS. CHANGELOG, full suite + typecheck, commit** `feat(ui): D4 tactile component primitives (D4-P1-R3)`.

---

### Task 4: Inline SVG icon kit (`icons.ts`)

**Files:**
- Create: `src/game/dom/icons.ts`
- Test: `tests/game/dom/icons.test.ts` (`happy-dom`)

**Interfaces:**
- `export const ICON_NAMES = ['back','settings','characters','coin','lock','check','star','trophy','flag','bolt','play','pause','home','sound','haptics','dpad','motion','mango','clock','scissors','shield','rain'] as const;`
- `export type IconName = typeof ICON_NAMES[number];`
- `export interface IconOpts { size?: number; label?: string; className?: string }` (default `size` from a named const `ICON_SIZE = 24` with a `// D4-P1-R5 base grid` comment)
- `export function icon(name: IconName, opts?: IconOpts): string` — returns `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width height class="d4-icon …" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" …>`. Without `label`: `aria-hidden="true"`; with `label`: `role="img"` + `<title>`. Duotone fills use `currentColor` with `opacity`, never hex (coin/mango may use `var(--d4-gold-face)` via `style`).

- [ ] **Step 1: Write failing tests:**
  - `D4-P1-R5 exposes exactly the 22 spec icons` (`toEqual` the list).
  - `D4-P1-R5 every icon parses as a single valid SVG` — for each name: set `innerHTML`, expect one `svg` root, `viewBox="0 0 24 24"`, ≥ 1 `path|circle|rect|polyline|line|polygon` child, no `<script`, no `on\w+=` attributes, no raw hex (`/#[0-9a-f]{3,8}/i`).
  - `D4-P1-R5 decorative icons are aria-hidden; labelled icons have role img and title`.
  - `D4-P1-R5 size option sets width and height`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/icons.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** — a `Record<IconName, string>` of inner SVG markup (uniform 2.5 stroke, rounded caps) and the `icon()` wrapper.
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): D4 inline SVG icon kit (D4-P1-R5)`.

---

### Task 5: Singleton Web Audio and shared mute flag

**Files:**
- Modify: `src/game/audio/synth.ts`
- Test: `tests/game/dom/synthSingleton.test.ts` (new, `happy-dom`); keep `tests/game/platform.test.ts`, `tests/game/hud.test.ts` green

**Interfaces:**
- `createSynth(): Synth` — signature unchanged; all instances share module-level `audio: AudioContext | null` and `on: boolean`.
- `export function installAudioUnlock(target?: Pick<EventTarget,'addEventListener'|'removeEventListener'>, doc?: Pick<Document,'addEventListener'|'visibilityState'>): () => void` — adds **capturing** `pointerdown` and `keydown` listeners that synchronously create/resume the context; on `visibilitychange` to `visible` resumes when `state` is `'suspended'` or `'interrupted'`; returns a disposer.
- `export function __resetAudioForTests(): void` — clears the shared context and sets `on = true`.
- Resume rule inside `ac()`: resume when `state === 'suspended' || state === 'interrupted'` (iOS).

- [ ] **Step 1: Write failing tests** (stub `window.AudioContext` with a counting fake class exposing `state`, `resume`, `currentTime`, `createOscillator`, `createGain`, `destination`; call `__resetAudioForTests()` in `beforeEach`):
  - `D4-P1-R6 two synths share one AudioContext` — `a.unlock(); b.unlock();` → constructor called once.
  - `D4-P1-R6 setOn(false) on one synth mutes every synth` — `a.setOn(false); b.play('eat')` → `createOscillator` not called.
  - `D4-P1-R6 unlock listener is capturing and creates the context synchronously` — spy `addEventListener`, assert `('pointerdown', fn, true|{capture:true})` and `('keydown', …)`; dispatch `pointerdown` → constructor called before the handler returns.
  - `D4-P1-R6 interrupted or suspended contexts resume on visibilitychange` — fake `state='interrupted'`, dispatch `visibilitychange` with `visibilityState='visible'` → `resume` called.
  - `D4-P1-R6 disposer removes the listeners`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/synthSingleton.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** — hoist `audio`/`on` to module scope, add the comment `// D4-P1-R6 one AudioContext and one mute flag for DOM and Phaser layers`, add `installAudioUnlock` and `__resetAudioForTests`.
- [ ] **Step 4: Run new test + regressions, expect PASS:** `npx vitest run tests/game/dom/synthSingleton.test.ts tests/game/platform.test.ts tests/game/hud.test.ts tests/game/charactersScene.test.ts --configLoader native --pool threads --maxWorkers 2`. If `platform.test.ts` relies on per-instance state, add `__resetAudioForTests()` to its `beforeEach` (test-only change; note it in the commit body).
- [ ] **Step 5: CHANGELOG, full suite + typecheck, commit** `feat(audio): share one AudioContext and mute flag across synths (D4-P1-R6)`.

---

### Task 6: Stage sync and band-colour lock

**Files:**
- Create: `src/game/dom/stageSync.ts`
- Modify: `src/game/viewport.ts`
- Test: `tests/game/dom/stageSync.test.ts` (new, `happy-dom`); extend `tests/game/viewport.test.ts` (`node`)

**Interfaces:**
- ```ts
  export interface StageRect { left: number; top: number; width: number; height: number }
  export interface StageSyncDeps {
    root: HTMLElement;                         // #ui-root
    readRect: () => StageRect;                 // default: game.canvas.getBoundingClientRect()
    board: () => { top: number; size: number; height: number }; // canvas px, from layout BOARD + HEIGHT at call time
    raf?: (cb: () => void) => number;          // default window.requestAnimationFrame
    subscribe?: (onChange: () => void) => () => void; // default: window resize + visualViewport resize; main.ts adds game.scale 'resize'
    baseWidth: number;                         // 360 mock width from src/game/ui/layout.ts (no literal)
  }
  export function startStageSync(d: StageSyncDeps): { sync(): void; schedule(): void; stop(): void };
  export function stageVars(rect: StageRect, board: { top: number; size: number; height: number }, baseWidth: number): Record<string, string>;
  ```
- `stageVars` (pure) returns `left/top/width/height` px plus `--stage-w`, `--stage-h`, `--stage-scale` (`rect.width / baseWidth`), `--board-top` (`board.top / board.height * 100`%), `--board-h` (`board.size / board.height * 100`%).
- `schedule()` coalesces many change events into **one** `raf` callback.
- `viewport.ts`: `export function setBandLock(locked: boolean, hex?: string): void` — while locked, `setBandColor` is a no-op; `setBandLock(true, hex)` paints `hex` once; unlocking does not repaint (the next scene call does). Comment `// D4-P1-R1 DOM menus own the page background while open`.
- Do not read `HEIGHT`/`BOARD` at module level (heightGuard): `board()` is a function called at sync time.

- [ ] **Step 1: Write failing tests** (`stageSync.test.ts`):
  - `D4-P1-R1 stageVars maps a 360x640 canvas 1:1` and `... a letterboxed 1280x800 desktop` (rect `{left: 415, top: 0, width: 450, height: 800}` → scale `1.25`).
  - `D4-P1-R1 phones 360x640 through 430x932 keep #ui-root equal to the canvas rect` — table-driven over `[360,640],[375,667],[390,844],[412,915],[430,932]`, using fake rects; assert inline `left/top/width/height` on `root`.
  - `D4-P1-R1 bursts of resize events produce one rAF and one write` — fake `raf` queue, call `schedule()` 5×, flush → `readRect` called once.
  - `D4-P1-R1 board vars are percentages of the stage`.
  - `D4-P1-R1 stop() unsubscribes`.
- [ ] **Step 2: Extend `tests/game/viewport.test.ts`** with `D4-P1-R1 setBandLock blocks setBandColor while locked` — needs a document: put it in a new `tests/game/dom/bandLock.test.ts` (`happy-dom`) instead, leaving the `node` no-op test untouched.
- [ ] **Step 3: Run, expect FAIL:** `npx vitest run tests/game/dom/stageSync.test.ts tests/game/dom/bandLock.test.ts tests/game/viewport.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 4: Implement** `stageSync.ts` and `setBandLock`.
- [ ] **Step 5: Run touched tests + `tests/game/heightGuard.test.ts`, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): sync #ui-root to the Phaser canvas and lock band colour (D4-P1-R1)`.

---

### Task 7: Typed bridge and UI host

**Files:**
- Create: `src/game/dom/uiBridge.ts`, `src/game/dom/uiHost.ts`
- Test: `tests/game/dom/uiHost.test.ts` (new, `happy-dom`)

**Interfaces:**
- `uiBridge.ts` (types only, no runtime imports except `type` imports):
  ```ts
  import type { Synth } from '../audio/synth';
  export type ScreenId = 'home' | 'characters' | 'loadout' | 'results' | 'settings';
  export interface LoopHooks { sleep(): void; wake(): void; inputEnabled(on: boolean): void; keyboardCapture(on: boolean): void; canvasVisible(on: boolean): void }
  export interface UiBridge {
    session: unknown /* narrowed to Session type via `import type` from src/session */;
    synth: Synth; t: (key: string, vars?: Record<string, string | number>) => string;
    open(id: ScreenId): void; startRun(): void; pause(): void; resume(): void; quitToHome(): void;
  }
  ```
  (Use `import type { Session } from '../../session'` if that path exists — check with `grep -rn "export class Session\|export interface Session" src/session`; `t` type matches `src/game/text.ts`.)
- `uiHost.ts`:
  ```ts
  export type MountKind = 'screen' | 'modal';
  export interface MountSpec { id: string; kind: MountKind; render(el: HTMLElement): void | (() => void); onEscape?: () => void }
  export interface UiHost { mount(spec: MountSpec): symbol; close(token: symbol): boolean; isModalOpen(): boolean; activeId(): string | null; syncReducedMotion(): void; dispose(): void }
  export function createUiHost(root: HTMLElement, hooks: LoopHooks, deps?: { reduceMotion?: () => boolean; doc?: Document; bandLock?: (locked: boolean) => void }): UiHost;
  ```
  Rules (comment `// D4-P1-R6` on `createUiHost`):
  - `mount` replaces the current view (runs its cleanup), wraps content in a child `div` with `data-ui-active` and `data-qa="ui-<id>"`, returns a fresh token.
  - `close(token)` unmounts only if `token` is the active token; stale tokens return `false` and change nothing.
  - `'screen'` mount → `hooks.sleep()`, `hooks.canvasVisible(false)`, `bandLock(true)`; `'modal'` mount → `hooks.inputEnabled(false)`, `hooks.keyboardCapture(false)` (loop keeps running unless the caller pauses). Close reverses exactly what mount did.
  - `isModalOpen()` true while any view is mounted.
  - A capturing `keydown` `Escape` listener calls the active spec's `onEscape` and `preventDefault()`; nothing when idle.
  - `syncReducedMotion()` toggles `.reduced-motion` on `root` from `deps.reduceMotion ?? reduceMotion` (`src/game/render/palette.ts`); called on every `mount` and on `matchMedia('(prefers-reduced-motion: reduce)')` `change`.
  - `uiHost.ts` may import `reduceMotion` from `../render/palette` (no Phaser in that module) — verify with `grep -n "phaser" src/game/render/palette.ts src/meta/index.ts` returning nothing.

- [ ] **Step 1: Write failing tests** with a fake `LoopHooks` (all `vi.fn()`):
  - `D4-P1-R6 mount renders into #ui-root with data-qa and pointer events enabled`.
  - `D4-P1-R6 close with a stale token does nothing` — mount A (tokenA), mount B, `close(tokenA)` → `false`, B still mounted.
  - `D4-P1-R6 screen mount sleeps the loop and hides the canvas; close wakes it`.
  - `D4-P1-R6 modal mount disables Phaser input and keyboard capture; close restores them`.
  - `D4-P1-R6 isModalOpen tracks mounted state`.
  - `D4-P1-R6 Escape calls onEscape only when a view is open`.
  - `D4-P1-R6 reduced-motion class follows reduceMotion()` — inject `reduceMotion: () => true` then `false`.
  - `D4-P1-R6 replacing a view runs the previous cleanup`.
  - `D4-P1-R6 dispose removes listeners and content`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/uiHost.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** `uiBridge.ts` and `uiHost.ts`.
- [ ] **Step 4: Add a guard test** `D4-P1-R6 src/game/dom never imports phaser` in `uiHost.test.ts`: read every `.ts` under `src/game/dom/` and assert no `from 'phaser'`.
- [ ] **Step 5: Run, expect PASS. Typecheck. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): DOM UI host with mount tokens and typed bridge (D4-P1-R6)`.

---

### Task 8: Wire `index.html` and `main.ts`

**Files:**
- Modify: `index.html`, `src/game/main.ts`
- Test: `tests/game/dom/indexHtml.test.ts` (new, `node`, text-level)

**Interfaces / changes:**
- `index.html`: add `<div id="ui-root" aria-live="polite"></div>` as a **sibling after** `#game` (never wrap `#game`); page `html, body` background `#FAF9F5` (comment: same value as `--d4-bg`; the token file loads after first paint). `#game` rule unchanged.
- `main.ts`:
  - `import './dom/styles/tokens.css'; import './dom/styles/components.css';` (`vite/client` types already in `tsconfig.json`).
  - Add `audio: { noAudio: true }` to the game config (comment `// D4-P1-R6 single AudioContext lives in synth.ts`).
  - Before `new Phaser.Game`: `installAudioUnlock();`.
  - In `postBoot` (keep the existing debug handle): build `LoopHooks` from the game (`game.loop.sleep/wake`, `game.input.enabled = on`, `game.input.keyboard?.enableGlobalCapture()/disableGlobalCapture()`, `game.canvas.style.visibility`), call `startStageSync({ root, readRect: () => game.canvas.getBoundingClientRect(), board: …, baseWidth, subscribe })` with `subscribe` also listening to `game.scale.on('resize', …)`, then `game.registry.set('uiHost', createUiHost(root, hooks, { bandLock: on => setBandLock(on) }))`. No screen is mounted in P1.

- [ ] **Step 1: Write failing test** `indexHtml.test.ts`: `#ui-root` exists and comes after `#game` as a sibling (both direct children of `body`); body background is `#FAF9F5`; `main.ts` text contains `noAudio: true`, `tokens.css`, `components.css`, `installAudioUnlock(`, `startStageSync(`, `createUiHost(`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/indexHtml.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. Full suite + typecheck.**
- [ ] **Step 5: Manual smoke:** `npm run dev`, open `http://localhost:5173/` at 360×640 and 430×932 (DevTools device mode) and on desktop: no console errors; `#ui-root` box equals the canvas box (DevTools); swipes still steer the snake (`#ui-root` is `pointer-events: none`); sound plays after the first tap, toggling Sound in Settings mutes Home/HUD alike. Optional QA shots via `tools/qa/shot.mjs` into `tmp/qa/d4-p1/`.
- [ ] **Step 6: CHANGELOG, commit** `feat(ui): mount #ui-root overlay host and single audio context (D4-P1-R1, R6)`.

---

### Task 9: Interactive Visual Stylebook

**Files:**
- Create: `docs/design/mockups/d4/stylebook.html`
- Test: `tests/game/dom/stylebook.test.ts` (new, `node`, text-level)

**Requirements:**
- `<link rel="stylesheet" href="../../../../src/game/dom/styles/tokens.css">` and `.../components.css` — exact relative links; a local `<style>` only for page layout (grid, section headings, phone frames) using `var(--…)` and no hex colours. Same `@font-face` block as `index.html` (`/fonts/...`).
- Opening: `npm run dev`, then `http://localhost:5173/docs/design/mockups/d4/stylebook.html` (Vite serves repo files and `public/fonts`).
- Icons: a small `<script type="module">` imports `../../../../src/game/dom/icons.ts` (Vite transpiles) and fills `[data-icon]` placeholders, and renders the full icon grid from `ICON_NAMES` — the stylebook never inlines a copy of icon markup.
- Sections:
  1. Palette swatches (60 / 30 / 10 groups, each swatch background `var(--d4-…)` with its name; value text read at runtime from `getComputedStyle`), typography ladder (`Lilita One` display: MANGO SNAKE / NEW BEST! / VICTORY! / GAME OVER; `Nunito` 700/800/900 UI sizes; tabular numerals sample).
  2. Interactive components: every `.d4-btn` variant (press works with mouse and touch), disabled CTA, icon buttons, chips, card, nested-card rule demo, speech bubble, toggle (click flips `aria-checked`), backdrop pattern, all 22 icons, a "Reduce motion" switch that toggles `.reduced-motion`.
  3. Side-by-side `360×640` and `360×780` phone frames with static mockups of **Characters** and **Home** (layout per `docs/superpowers/specs/2026-11-23-d4-p3-characters-and-home.md`; placeholder mascot art is fine — P2 delivers the rig).
- Every interactive element has `data-qa`; tap targets ≥ 48 px.

- [ ] **Step 1: Write failing test** `stylebook.test.ts`:
  - `D4-P1-R7 links tokens.css and components.css directly` (exact `href`s above).
  - `D4-P1-R7 contains no hex colour literals` (after removing `<link>`/`url(...)`).
  - `D4-P1-R7 has palette, typography, components, icons and two phone mockups` — `data-qa` anchors `sb-palette`, `sb-type`, `sb-components`, `sb-icons`, `sb-mock-640`, `sb-mock-780`, and both `Characters` and `Home` mockups inside each frame.
  - `D4-P1-R7 every button, toggle and link has data-qa` (regex over `<button`, `role="switch"`, `<a `).
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/stylebook.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement the page.**
- [ ] **Step 4: Run, expect PASS. Open in the browser via `npm run dev`; no console errors; take QA shots of 360×640 and 360×780 into `tmp/qa/d4-p1/` (git-ignored).**
- [ ] **Step 5: Docs:** add the stylebook to `docs/README.md` (mockups) and `docs/CODEMAP.md`; CHANGELOG; full suite + typecheck; commit** `docs(ui): D4 interactive visual stylebook (D4-P1-R7)`.

---

### Task 10: Phase close-out

**Files:** `docs/STATUS.md`, `docs/CODEMAP.md` (final check), `CHANGELOG.md`

- [ ] **Step 1:** `grep -rn "D4-P1-R" src tests` — every rule R1..R7 has ≥ 1 test name and ≥ 1 implementing comment.
- [ ] **Step 2:** Full suite + typecheck (sequential), record counts.
- [ ] **Step 3:** Update `docs/STATUS.md` (Now: D4-P1 awaiting owner stylebook approval; Next: D4-P2), commit `docs: D4-P1 status`.
- [ ] **Step 4:** `superpowers:requesting-code-review` → fix → `git checkout version/v0.3; git merge --no-ff feat/d4-p1-design-system`. Refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

---

## Exit Gate

- [ ] `happy-dom` is in `package.json` **devDependencies** (not `dependencies`), lockfile updated, and `docs/DECISIONS.md` has the dated 2026-11-23 entry with the pinned version, owner approval and the per-file opt-in rule.
- [ ] `vitest.config.ts` still uses `environment: 'node'`; every DOM test file starts with `// @vitest-environment happy-dom`.
- [ ] Unit tests pass for `stageSync`, band lock, `uiHost` (mount/unmount/stale token/`isModalOpen`/Escape/`reduceMotion()` sync), `icons` (22 valid SVGs), singleton `AudioContext` + shared mute, CSS tokens/components, `index.html`/`main.ts` wiring, and the stylebook.
- [ ] `npx vitest run --configLoader native --pool threads --maxWorkers 2` and `npm run typecheck` pass (run sequentially).
- [ ] `docs/design/mockups/d4/stylebook.html` links `../../../../src/game/dom/styles/tokens.css` and `../../../../src/game/dom/styles/components.css` directly and contains no hex literals; it renders without console errors under `npm run dev`.
- [ ] Game runs under `npm run dev` with no console errors; gameplay swipes still reach Phaser; one `AudioContext` exists (DevTools → `performance`/media panel or a debug `console.count` removed before commit).
- [ ] `src/game/dom/` has no `phaser` import (guard test).
- [ ] `CHANGELOG.md` `[Unreleased]`, `docs/CODEMAP.md`, `docs/README.md`, `docs/STATUS.md` updated; all text in English.
- [ ] Owner opened the stylebook (and `tmp/qa/d4-p1/` shots) and approved the D4 visual direction — this is the gate to start D4-P2/P3.
