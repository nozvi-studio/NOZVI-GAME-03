# P3-0 UI foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared UI base for every P3 screen: design tokens, mockup-px scaling and column layout, self-hosted fonts, display settings (theme / reduced motion / haptics / D-pad) in the save, and a token-driven widget kit.

**Architecture:** Pure modules (`src/game/uiTokens.ts`, `src/game/ui/layout.ts`, `src/meta/settings.ts`) carry all numbers and logic and are unit-tested; thin Phaser widgets in `src/game/ui/widgets.ts` draw from them. `render/palette.ts` keeps its API but reads display prefs set by Boot/Settings instead of only the OS.

**Tech Stack:** Phaser 3.90, TypeScript 7 strict, Vite 8, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-07-p3-juice-screens-design.md` (§3 D2-D5, D7, D9; §4 P3-0)

## Global Constraints
- Branch `feat/p3-0-ui-foundation` from `version/v0.2`; merge back `--no-ff` after `npm test` + `npm run typecheck` pass.
- Windows Vitest: `npx vitest run --configLoader native --pool threads --maxWorkers 2 <path>`.
- No Phaser imports in `src/core/`, `src/meta/`, `src/game/uiTokens.ts`, `src/game/ui/layout.ts` (boundary test enforces core/meta).
- No colour hex or mockup px literal in scenes; use tokens and `ui()`.
- Requirement IDs in test names: `P3-0-Rn`.
- Mockup reference: `docs/design/mockups/html/PaletteD2.html` and `docs/design/UI-MOCKUPS.md` §3.
- English only in files; Conventional Commits; each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map
- Create `src/game/uiTokens.ts` - colours, fonts, radii, shadows, spacing (pure).
- Create `src/game/ui/layout.ts` - `UI_SCALE`, `ui()`, `layoutColumn()` (pure).
- Create `src/game/ui/fonts.ts` - `waitForFonts()` (DOM-injected, testable).
- Create `src/game/ui/widgets.ts` - Phaser widget kit.
- Create `src/meta/settings.ts` - settings type, defaults, validation, resolved display prefs.
- Create `public/fonts/` - Nunito + Lilita One woff2 + `OFL.txt`.
- Modify `src/meta/save.ts` (v3 + migration), `src/meta/index.ts` (exports), `src/game/render/palette.ts` (prefs), `src/game/scenes/BootScene.ts` (fonts + prefs), `src/game/scenes/ui.ts` (FONT, re-exports), `index.html` (@font-face), `src/core/balance.ts` + `config/balance.json` (`ui.fontLoadTimeoutMs`, `ui.minShrink`).
- Tests: `tests/game/uiTokens.test.ts`, `tests/game/uiLayout.test.ts`, `tests/game/fonts.test.ts`, `tests/meta/settings.test.ts`, existing `tests/meta/save*.test.ts`, `tests/game/boot.test.ts`.

---

### Task 1: Design tokens

**Files:** Create `src/game/uiTokens.ts`; Test `tests/game/uiTokens.test.ts`

**Interfaces:** Produces `TOKENS` (shape below), `toInt(hex: string): number`, `FONT_UI`, `FONT_TITLE`.

- [ ] **Step 1: Failing test**
```ts
import { expect, it } from 'vitest';
import { TOKENS, toInt, FONT_UI, FONT_TITLE } from '../../src/game/uiTokens';
it('P3-0-R1 tokens match UI-MOCKUPS §3', () => {
  expect(TOKENS.surface).toEqual({ cream: '#F8F2E8', card: '#FFFCF6', white: '#FFFFFF', sand: '#EFE6D8', stone: '#E3DCD2', peach: '#FBE3C8' });
  expect(TOKENS.text).toEqual({ primary: '#5A3B3B', soft: '#8A6A6A', faint: '#B79F8A', slate: '#3F4D5E', logoOutline: '#6B4C82', walnut: '#B98558' });
  expect(TOKENS.green).toEqual({ face: '#79D391', shade: '#5DB878', deep: '#4A9A63', line: '#3E7A52', mint: '#CFEBD0', mint2: '#C2E4C6' });
  expect(TOKENS.accent).toEqual({ orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845', pink: '#F6C2D3', periwinkle: '#8EA0FF' });
  expect(TOKENS.sky).toEqual({ top: '#B3DEF3', bottom: '#9DD3EE', silhouette: '#C4E7F7', stat: '#BCDDF4', lavender: '#C6B0F5', energy: '#3CC6DA' });
  expect(TOKENS.snake).toEqual({ body: '#6F93F5', shade: '#3F63D1', belly: '#E4ECFF' });
  expect(TOKENS.shadow.card).toEqual({ y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 });
  expect(TOKENS.title).toEqual({ strokePx: 9, shadowY: 6 });
  expect(TOKENS.screen).toEqual({ w: 390, h: 844, sidePad: 16 });
});
it('P3-0-R1 toInt converts #RRGGBB to a Phaser colour', () => {
  expect(toInt('#F8F2E8')).toBe(0xf8f2e8);
  expect(() => toInt('red')).toThrow();
});
it('P3-0-R1 font stacks name the mockup fonts with a system fallback', () => {
  expect(FONT_UI).toBe('Nunito, system-ui, sans-serif');
  expect(FONT_TITLE).toBe('"Lilita One", Nunito, system-ui, sans-serif');
});
```
- [ ] **Step 2:** Run `npx vitest run --configLoader native --pool threads --maxWorkers 2 tests/game/uiTokens.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement**
```ts
// P3-0-R1 D2 design tokens (UI-MOCKUPS §3, PaletteD2). Pure: no Phaser.
export const TOKENS = {
  surface: { cream: '#F8F2E8', card: '#FFFCF6', white: '#FFFFFF', sand: '#EFE6D8', stone: '#E3DCD2', peach: '#FBE3C8' },
  text: { primary: '#5A3B3B', soft: '#8A6A6A', faint: '#B79F8A', slate: '#3F4D5E', logoOutline: '#6B4C82', walnut: '#B98558' },
  green: { face: '#79D391', shade: '#5DB878', deep: '#4A9A63', line: '#3E7A52', mint: '#CFEBD0', mint2: '#C2E4C6' },
  accent: { orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845', pink: '#F6C2D3', periwinkle: '#8EA0FF' },
  sky: { top: '#B3DEF3', bottom: '#9DD3EE', silhouette: '#C4E7F7', stat: '#BCDDF4', lavender: '#C6B0F5', energy: '#3CC6DA' },
  snake: { body: '#6F93F5', shade: '#3F63D1', belly: '#E4ECFF' },
  shadow: { card: { y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 } },
  title: { strokePx: 9, shadowY: 6 },
  screen: { w: 390, h: 844, sidePad: 16 },
} as const;
export const FONT_UI = 'Nunito, system-ui, sans-serif';
export const FONT_TITLE = '"Lilita One", Nunito, system-ui, sans-serif';
export function toInt(hex: string): number {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`uiTokens: bad colour ${hex}`);
  return parseInt(hex.slice(1), 16);
}
```
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** `git add src/game/uiTokens.ts tests/game/uiTokens.test.ts && git commit -m "feat(ui): D2 design tokens (P3-0-R1)"`

### Task 2: Mockup scaling and column layout

**Files:** Create `src/game/ui/layout.ts`; Test `tests/game/uiLayout.test.ts`

**Interfaces:**
- Consumes `TOKENS.screen`, `WIDTH`, `HEIGHT` from `src/game/layout.ts`.
- Produces `UI_SCALE: number`, `ui(px: number): number`, `layoutColumn(spec: ColumnSpec): ColumnLayout` with
  `interface ColumnSpec { top: number; middle: number; bottom: number; height?: number; minShrink: number }` (all in mockup px except `height`, game px, default `HEIGHT`)
  `interface ColumnLayout { topY: number; middleY: number; middleScale: number; bottomY: number; fits: boolean }` (game px; `middleY` = top edge of the scaled middle block).

- [ ] **Step 1: Failing test**
```ts
import { expect, it } from 'vitest';
import { UI_SCALE, ui, layoutColumn } from '../../src/game/ui/layout';
it('P3-0-R2 ui() maps 390 mockup px to the 540 game width', () => {
  expect(UI_SCALE).toBeCloseTo(540 / 390);
  expect(ui(390)).toBeCloseTo(540);
  expect(ui(16)).toBeCloseTo(22.15, 2);
});
it('P3-0-R2 middle block centres in the free space when it fits', () => {
  const l = layoutColumn({ top: 100, middle: 200, bottom: 100, minShrink: 0.85 });
  expect(l.topY).toBe(0);
  expect(l.bottomY).toBeCloseTo(960 - ui(100));
  expect(l.middleScale).toBe(1);
  expect(l.middleY).toBeCloseTo(ui(100) + (960 - ui(100) - ui(100) - ui(200)) / 2);
  expect(l.middleY + ui(200)).toBeLessThanOrEqual(l.bottomY);
  expect(l.middleY).toBeGreaterThanOrEqual(ui(100));
  expect(l.fits).toBe(true);
});
it('P3-0-R2 middle block shrinks uniformly when too tall, never below minShrink', () => {
  const l = layoutColumn({ top: 150, middle: 500, bottom: 150, minShrink: 0.85 });
  const room = 960 - ui(300);
  expect(l.middleScale).toBeCloseTo(Math.max(0.85, room / ui(500)));
  expect(l.fits).toBe(room / ui(500) >= 0.85);
});
it('P3-0-R2 a column that cannot fit even at minShrink reports fits=false', () => {
  expect(layoutColumn({ top: 300, middle: 600, bottom: 300, minShrink: 0.85 }).fits).toBe(false);
});
```
- [ ] **Step 2:** Run the test → FAIL.
- [ ] **Step 3: Implement**
```ts
import { HEIGHT, WIDTH } from '../layout';
import { TOKENS } from '../uiTokens';
// P3-0-R2 mockup px (390 wide) -> game px (540 wide).
export const UI_SCALE = WIDTH / TOKENS.screen.w;
export const ui = (px: number): number => px * UI_SCALE;
export interface ColumnSpec { top: number; middle: number; bottom: number; height?: number; minShrink: number }
export interface ColumnLayout { topY: number; middleY: number; middleScale: number; bottomY: number; fits: boolean }
/** P3-0-R2 top anchored, bottom anchored, middle centred and shrunk to fit (spec D2). */
export function layoutColumn(s: ColumnSpec): ColumnLayout {
  const height = s.height ?? HEIGHT;
  const top = ui(s.top), bottom = ui(s.bottom), middle = ui(s.middle);
  const room = height - top - bottom;
  const need = middle > 0 ? room / middle : 1;
  const middleScale = Math.min(1, Math.max(s.minShrink, need));
  const scaled = middle * middleScale;
  return { topY: 0, middleY: top + (room - scaled) / 2, middleScale, bottomY: height - bottom, fits: need >= s.minShrink };
}
```
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Commit `feat(ui): mockup scale and column layout (P3-0-R2)`.

### Task 3: Balance keys for UI foundation

**Files:** Modify `src/core/balance.ts` (`Balance.ui` type + `SPEC.ui`), `config/balance.json` (`ui` block); Test: add to `tests/core/balance.test.ts` (find the file with `grep -l parseBalance tests/core`).

**Interfaces:** Produces `balance.ui.fontLoadTimeoutMs: number` (2000) and `balance.ui.minShrink: number` (0.85).

- [ ] **Step 1: Failing test** (append)
```ts
it('P3-0-R3 balance.ui has font timeout and min shrink', () => {
  const b = parseBalance(structuredClone(json));
  expect(b.ui.fontLoadTimeoutMs).toBe(2000);
  expect(b.ui.minShrink).toBe(0.85);
  const bad = structuredClone(json) as any; bad.ui.minShrink = 1.5;
  expect(() => parseBalance(bad)).toThrow(/ui.minShrink/);
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** In `Balance['ui']` add `fontLoadTimeoutMs: number; minShrink: number;`. In `SPEC.ui` add `fontLoadTimeoutMs: 'int+', minShrink: 'prob'` (`prob` = 0..1, already used by `swipeBoardFactor`). In `config/balance.json` `"ui"` add `"fontLoadTimeoutMs": 2000, "minShrink": 0.85`.
- [ ] **Step 4:** Run → PASS. Also run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(config): ui font timeout and min shrink (P3-0-R3)`.

### Task 4: Settings model and save v3

**Files:** Create `src/meta/settings.ts`; Modify `src/meta/save.ts`, `src/meta/index.ts`; Test `tests/meta/settings.test.ts` + existing save tests.

**Interfaces:** Produces
```ts
export type BoardTheme = 'light' | 'dark';
export interface Settings { sound: boolean; haptics: boolean; dpad: boolean; reducedMotion: boolean | null; boardTheme: BoardTheme | null }
export const defaultSettings: () => Settings;          // { sound: true, haptics: true, dpad: false, reducedMotion: null, boardTheme: null }
export function validSettings(raw: unknown): Settings;  // field-by-field, invalid -> default
export interface DisplayPrefs { theme: BoardTheme; reducedMotion: boolean }
export function resolveDisplay(s: Settings, os: { dark: boolean; reducedMotion: boolean }): DisplayPrefs; // null = follow OS
```
`SaveData.settings` becomes `Settings`; `SAVE_VERSION = 3`; `MIGRATIONS[2] = d => object(d) ? { ...d, settings: validSettings(d.settings) } : null`; `validated()` uses `out.settings = validSettings(data.settings)`.

- [ ] **Step 1: Failing tests**
```ts
import { expect, it } from 'vitest';
import { defaultSettings, validSettings, resolveDisplay } from '../../src/meta/settings';
import { loadSave, SAVE_KEY, SAVE_VERSION } from '../../src/meta';
it('P3-0-R4 defaults follow the OS for theme and motion', () => {
  expect(defaultSettings()).toEqual({ sound: true, haptics: true, dpad: false, reducedMotion: null, boardTheme: null });
});
it('P3-0-R4 invalid fields fall back one by one', () => {
  expect(validSettings({ sound: false, haptics: 'x', dpad: true, reducedMotion: true, boardTheme: 'neon' }))
    .toEqual({ sound: false, haptics: true, dpad: true, reducedMotion: true, boardTheme: null });
  expect(validSettings(null)).toEqual(defaultSettings());
});
it('P3-0-R4 resolveDisplay: explicit choice wins, null follows the OS', () => {
  expect(resolveDisplay(defaultSettings(), { dark: true, reducedMotion: true })).toEqual({ theme: 'dark', reducedMotion: true });
  expect(resolveDisplay({ ...defaultSettings(), boardTheme: 'light', reducedMotion: false }, { dark: true, reducedMotion: true }))
    .toEqual({ theme: 'light', reducedMotion: false });
});
it('P3-0-R4 v2 saves migrate to v3 keeping sound and progress', () => {
  expect(SAVE_VERSION).toBe(3);
  const store = new Map<string, string>([[SAVE_KEY, JSON.stringify({ version: 2, data: { bestScore: 5, settings: { sound: false },
    bestLevel: 7, fullClear: false, unlockedCheckpoints: [6], carriedEnergy: 10, lastLoadout: [null, null] } })]]);
  const kv = { get: (k: string) => store.get(k) ?? null, set: (k: string, v: string) => { store.set(k, v); } };
  const s = loadSave(kv, { skillIds: ['slowmo'], maxLevel: 30, carryMax: 50 });
  expect(s.settings).toEqual({ ...defaultSettings(), sound: false });
  expect(s.bestLevel).toBe(7);
});
```
Before writing: check the real names with `grep -n "export" src/meta/save.ts src/meta/storage.ts` - if the loader or store interface is named differently (e.g. `readSave`, `KeyValueStore` methods), adapt the test to those names; do not rename production APIs.
- [ ] **Step 2:** Run `tests/meta/settings.test.ts` → FAIL.
- [ ] **Step 3: Implement `src/meta/settings.ts`**
```ts
// P3-0-R4 player settings (spec D7). Pure.
export type BoardTheme = 'light' | 'dark';
export interface Settings { sound: boolean; haptics: boolean; dpad: boolean; reducedMotion: boolean | null; boardTheme: BoardTheme | null }
export interface DisplayPrefs { theme: BoardTheme; reducedMotion: boolean }
export const defaultSettings = (): Settings => ({ sound: true, haptics: true, dpad: false, reducedMotion: null, boardTheme: null });
const bool = (v: unknown, d: boolean): boolean => typeof v === 'boolean' ? v : d;
export function validSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  return { sound: bool(r.sound, d.sound), haptics: bool(r.haptics, d.haptics), dpad: bool(r.dpad, d.dpad),
    reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : null,
    boardTheme: r.boardTheme === 'light' || r.boardTheme === 'dark' ? r.boardTheme : null };
}
export function resolveDisplay(s: Settings, os: { dark: boolean; reducedMotion: boolean }): DisplayPrefs {
  return { theme: s.boardTheme ?? (os.dark ? 'dark' : 'light'), reducedMotion: s.reducedMotion ?? os.reducedMotion };
}
```
Then in `save.ts`: import `Settings`, `defaultSettings`, `validSettings`; `SaveData.settings: Settings`; `defaultSave` uses `settings: defaultSettings()`; `SAVE_VERSION = 3`; add `2: d => object(d) ? { ...d, settings: validSettings(d.settings) } : null` to `MIGRATIONS`; in `validated` replace the sound line with `out.settings = validSettings(data.settings);`. Export settings from `src/meta/index.ts`.
- [ ] **Step 4:** Run `tests/meta` and `tests/session` and `tests/game/boot.test.ts`; fix any existing test that hard-codes `settings: { sound: true }` or `version: 2` by using `defaultSettings()` / `SAVE_VERSION` (behavior unchanged). Run `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(meta): settings model and save v3 (P3-0-R4)`.

### Task 5: Palette reads display prefs

**Files:** Modify `src/game/render/palette.ts`; Test `tests/game/palettePrefs.test.ts`.

**Interfaces:** Produces `setDisplayPrefs(p: DisplayPrefs): void` and `osDisplay(): { dark: boolean; reducedMotion: boolean }`; `currentPalette()` / `reduceMotion()` keep their signatures (21 call sites unchanged).

- [ ] **Step 1: Failing test**
```ts
import { afterEach, expect, it, vi } from 'vitest';
import { currentPalette, reduceMotion, setDisplayPrefs, DARK, LIGHT } from '../../src/game/render/palette';
afterEach(() => vi.unstubAllGlobals());
it('P3-0-R5 explicit prefs override the OS media queries', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  setDisplayPrefs({ theme: 'light', reducedMotion: false });
  expect(currentPalette()).toBe(LIGHT);
  expect(reduceMotion()).toBe(false);
  setDisplayPrefs({ theme: 'dark', reducedMotion: true });
  expect(currentPalette()).toBe(DARK);
  expect(reduceMotion()).toBe(true);
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** (replace the two current one-liners)
```ts
import type { DisplayPrefs } from '../../meta';
const media = (q: string): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
export const osDisplay = () => ({ dark: media('(prefers-color-scheme: dark)'), reducedMotion: media('(prefers-reduced-motion: reduce)') });
let prefs: DisplayPrefs | null = null;
/** P3-0-R5 Boot and Settings push the resolved prefs; before that the OS decides. */
export const setDisplayPrefs = (p: DisplayPrefs): void => { prefs = p; };
export const currentPalette = (): Palette => (prefs ? prefs.theme === 'dark' : osDisplay().dark) ? DARK : LIGHT;
export const reduceMotion = (): boolean => prefs ? prefs.reducedMotion : osDisplay().reducedMotion;
```
- [ ] **Step 4:** Run the new test plus `tests/game` → PASS.
- [ ] **Step 5:** Commit `feat(game): palette follows saved display prefs (P3-0-R5)`.

### Task 6: Self-hosted fonts and Boot wait

**Files:** Create `public/fonts/nunito-latin-700.woff2`, `nunito-latin-800.woff2`, `nunito-latin-900.woff2`, `lilita-one-latin-400.woff2`, `public/fonts/OFL.txt`; Create `src/game/ui/fonts.ts`; Modify `index.html`, `src/game/scenes/BootScene.ts`; Test `tests/game/fonts.test.ts`, `tests/game/boot.test.ts`.

**Interfaces:** Produces `waitForFonts(fonts: Pick<FontFaceSet, 'load'> | undefined, specs: readonly string[], timeoutMs: number): Promise<boolean>` (true = all loaded, false = timeout/unsupported; never rejects) and `UI_FONT_SPECS = ['700 16px Nunito', '800 16px Nunito', '900 16px Nunito', '400 16px "Lilita One"']`.

- [ ] **Step 1: Get the font files.** Download the latin woff2 files from the Fontsource CDN (OFL-1.1):
```bash
mkdir -p public/fonts
for w in 700 800 900; do curl -fsSL -o public/fonts/nunito-latin-$w.woff2 https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.1.0/files/nunito-latin-$w-normal.woff2; done
curl -fsSL -o public/fonts/lilita-one-latin-400.woff2 https://cdn.jsdelivr.net/npm/@fontsource/lilita-one@5.1.0/files/lilita-one-latin-400-normal.woff2
curl -fsSL -o public/fonts/OFL.txt https://raw.githubusercontent.com/googlefonts/nunito/main/OFL.txt
```
Check each file is > 10 KB and starts with `wOF2` (`head -c 4`). If a version 404s, use the latest version listed at `https://cdn.jsdelivr.net/npm/@fontsource/nunito/` and note it in DECISIONS. Append to `OFL.txt` a line "Also covers Lilita One (Copyright 2011 Juan Montoreano), SIL OFL 1.1".
- [ ] **Step 2: Failing test** `tests/game/fonts.test.ts`
```ts
import { expect, it } from 'vitest';
import { waitForFonts, UI_FONT_SPECS } from '../../src/game/ui/fonts';
it('P3-0-R6 resolves true when every font loads', async () => {
  const asked: string[] = [];
  await expect(waitForFonts({ load: async (s: string) => { asked.push(s); return []; } }, UI_FONT_SPECS, 50)).resolves.toBe(true);
  expect(asked).toEqual([...UI_FONT_SPECS]);
});
it('P3-0-R6 resolves false on timeout, error or no FontFaceSet', async () => {
  await expect(waitForFonts({ load: () => new Promise(() => {}) }, UI_FONT_SPECS, 10)).resolves.toBe(false);
  await expect(waitForFonts({ load: async () => { throw new Error('x'); } }, UI_FONT_SPECS, 10)).resolves.toBe(false);
  await expect(waitForFonts(undefined, UI_FONT_SPECS, 10)).resolves.toBe(false);
});
```
- [ ] **Step 3:** Run → FAIL. **Implement** `src/game/ui/fonts.ts`:
```ts
// P3-0-R6 self-hosted fonts (spec D4); Boot waits at most timeoutMs, then falls back to system-ui.
export const UI_FONT_SPECS = ['700 16px Nunito', '800 16px Nunito', '900 16px Nunito', '400 16px "Lilita One"'] as const;
export function waitForFonts(fonts: { load: (spec: string) => Promise<unknown> } | undefined,
  specs: readonly string[], timeoutMs: number): Promise<boolean> {
  if (!fonts) return Promise.resolve(false);
  const all = Promise.all(specs.map(s => fonts.load(s))).then(() => true, () => false);
  const timeout = new Promise<boolean>(r => setTimeout(() => r(false), timeoutMs));
  return Promise.race([all, timeout]);
}
```
- [ ] **Step 4: index.html.** Remove the three Google Fonts `<link>` lines; add inside `<style>`:
```css
@font-face { font-family: Nunito; font-weight: 700; font-display: swap; src: url(/fonts/nunito-latin-700.woff2) format('woff2'); }
@font-face { font-family: Nunito; font-weight: 800; font-display: swap; src: url(/fonts/nunito-latin-800.woff2) format('woff2'); }
@font-face { font-family: Nunito; font-weight: 900; font-display: swap; src: url(/fonts/nunito-latin-900.woff2) format('woff2'); }
@font-face { font-family: 'Lilita One'; font-weight: 400; font-display: swap; src: url(/fonts/lilita-one-latin-400.woff2) format('woff2'); }
```
and change the body background to the cream token `#F8F2E8` (dark media query keeps `#131d15`).
- [ ] **Step 5: Boot.** In `BootScene.create()`, after the session is created and before `scene.start`:
```ts
const save = session.save();
setDisplayPrefs(resolveDisplay(save.settings, osDisplay())); // P3-0-R5
const next = isArtPreview(search) ? 'ArtPreview' : 'Home';
const fontSet = typeof document === 'undefined' ? undefined : document.fonts;
void waitForFonts(fontSet, UI_FONT_SPECS, balance.ui.fontLoadTimeoutMs).then(() => this.scene.start(next)); // P3-0-R6
```
Update `tests/game/boot.test.ts`: the two existing tests now `await` a flushed promise (`await new Promise(r => setTimeout(r, 0))`) before checking `started`; `document` is undefined in the test env so `waitForFonts` resolves false immediately. Add a test `P3-0-R5 Boot applies saved board theme` that stores `settings: { ...defaultSettings(), boardTheme: 'dark' }` and checks `currentPalette()` is `DARK` after `create()`.
- [ ] **Step 6:** Run `tests/game/fonts.test.ts tests/game/boot.test.ts` → PASS; `npm run typecheck`.
- [ ] **Step 7:** Commit `feat(game): self-hosted Nunito and Lilita One with Boot font wait (P3-0-R6)`.

### Task 7: Widget kit

**Files:** Create `src/game/ui/widgets.ts`, `src/game/ui/geometry.ts`; Modify `src/game/scenes/ui.ts` (FONT -> `FONT_UI`, keep `label`/`button`/`beginRun` working); Test `tests/game/uiGeometry.test.ts`.

**Interfaces:** Produces (pure) in `geometry.ts`:
```ts
export interface PillGeom { w: number; h: number; radius: number; shelf: number; pressedDy: number; labelStroke: number }
export function pillGeom(wMock: number, hMock: number): PillGeom; // radius = h/2, shelf = ui(5), pressedDy = ui(3), labelStroke = ui(4)
export function barFill(value: number, max: number, wPx: number): number; // clamps 0..wPx, max<=0 -> 0
```
and (Phaser) in `widgets.ts`, all sizes in mockup px:
```ts
export type PillTone = 'green' | 'orange' | 'cream';
export function pillButton(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, text: string, name: string, action: () => void, tone?: PillTone): Button; // returns the existing Button shape from scenes/ui.ts
export function card(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, radiusMock?: number): Phaser.GameObjects.Graphics; // card fill + token shadow
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, fill: string, name?: string): Phaser.GameObjects.Container;
export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, sizeMock: number, fill?: string): Phaser.GameObjects.Text; // Lilita, stroke logoOutline TOKENS.title.strokePx, shadow y TOKENS.title.shadowY
export function progressBar(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, fill: string): { g: Phaser.GameObjects.Graphics; set(value: number, max: number): void };
```
Origins (later plans rely on this): `pillButton` and `chip` x,y = centre; `card`, `progressBar` and `titleText` x,y = top-left for card/bar, centre for title (`setOrigin(.5)`).
Settings overlay contract (P3b-2 <-> P3b-3): Hud launches `scene.launch('Settings', { overlay: true })`; Settings stops itself on Back and emits `settings-closed` on `game.events`; Hud re-reads settings on that event and on Resume.
Tone colours: green = `TOKENS.green.face/deep/line`, orange = `accent.orange/orangeDeep` with line `accent.orangeDeep`, cream = `surface.card/stone` with line `text.soft`. Text colour on green/orange is white with `labelStroke` outline in the tone line colour; on cream it is `text.primary`.

- [ ] **Step 1: Failing test**
```ts
import { expect, it } from 'vitest';
import { pillGeom, barFill } from '../../src/game/ui/geometry';
import { ui } from '../../src/game/ui/layout';
it('P3-0-R7 pill geometry is fully rounded with a shelf', () => {
  const g = pillGeom(200, 60);
  expect(g).toEqual({ w: ui(200), h: ui(60), radius: ui(60) / 2, shelf: ui(5), pressedDy: ui(3), labelStroke: ui(4) });
});
it('P3-0-R7 bar fill clamps', () => {
  expect(barFill(5, 10, 100)).toBe(50);
  expect(barFill(15, 10, 100)).toBe(100);
  expect(barFill(-1, 10, 100)).toBe(0);
  expect(barFill(3, 0, 100)).toBe(0);
});
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `geometry.ts` exactly per the interface; then `widgets.ts`: pill = shelf rounded rect (tone deep, offset `shelf` down) + face rounded rect + label (`FONT_UI`, weight 900, size `ui(hMock * 0.4)`, stroke `labelStroke`); pointerdown moves face+label down `pressedDy` (skip when `reduceMotion()`), pointerup fires `action` only if pressed started on it (same rule as `scenes/ui.ts` `button`). `card`: shadow rect (`TOKENS.shadow.card` colour/alpha, offset y) + `surface.card` fill, radius default 22 mock px. `chip`: rounded text pill, padding ui(10)/ui(4). `titleText`: `FONT_TITLE`, `stroke` logoOutline, `strokeThickness ui(TOKENS.title.strokePx)`, `setShadow(0, ui(TOKENS.title.shadowY), logoOutline, 0, true, true)`. `progressBar.set` uses `barFill`.
- [ ] **Step 4:** In `scenes/ui.ts` set `export const FONT = FONT_UI;` (import from `../uiTokens`). Run `tests/game` → PASS; `npm run typecheck`.
- [ ] **Step 5:** Manual check: `npm run dev`, add nothing to production scenes; instead extend `ArtPreviewScene` (`?debug=1&artPreview=1`) with one row: green/orange/cream pills, a card, a chip, a title "MANGO SNAKE", a progress bar at 60%. Compare against `docs/design/mockups/png/PaletteD2.png`. No console errors.
- [ ] **Step 6:** Commit `feat(ui): token widget kit + art preview row (P3-0-R7)`.

### Task 8: Docs, maps, merge
- [ ] GDD §10.1: replace `rounded "Baloo 2" font` with `Nunito (UI) and Lilita One (titles), self-hosted (D2 mockups, owner 2026-11-07)`.
- [ ] `docs/CODEMAP.md` `src/game/` row: add `uiTokens.ts`, `ui/` (layout, fonts, geometry, widgets); `src/meta/` row: `settings.ts`; add `public/fonts/` row (self-hosted OFL fonts).
- [ ] `docs/DECISIONS.md` append: 2026-11-07 P3 Phaser-native port (spec D1), self-hosted fonts from Fontsource CDN as assets, not a dependency (D4); save v3 settings with null = follow OS (D7).
- [ ] `CHANGELOG.md` `[Unreleased]`: "P3-0 UI foundation: D2 tokens, mockup layout, self-hosted fonts, settings in save v3, widget kit."
- [ ] `docs/design/UI-MOCKUPS.md` §4 `PaletteD2` row target: `src/game/uiTokens.ts` (done).
- [ ] `npm test` then `npm run typecheck` (sequential, both pass). `npm run dev`: Home loads, fonts render as Nunito (DevTools > Rendered Fonts), no console errors.
- [ ] Commit `docs: P3-0 maps, decisions, changelog`; `git checkout version/v0.2 && git merge --no-ff feat/p3-0-ui-foundation`.
