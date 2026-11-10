# UI D3 U1 — Skin kit, widgets, touch feedback, one theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** paint every shared widget (buttons, chips, cards, bars, round buttons) in the D3 look from cached canvas textures, give every tap a visible answer, and make the game render one light theme.

**Architecture:** a pure recipe (`skinSpec`) describes a widget face from tokens; a small Canvas2D painter draws it once into a cached texture (`skinTextures`); the existing widget functions keep their signatures and swap `Graphics` for images. Touch feedback is a pure model (`interactionModel`) plus a thin pooled Phaser layer (`touchFx`) driven by the MOT-0 motion adapter.

**Tech Stack:** Phaser 3.90 (`textures.createCanvas`), TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` (§4 D3-R3, §5, §7b D3-R21..R24, R28). Roadmap: `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md`. Requires U0 Task 2 (`TOKENS.d3`).

## Global Constraints
- Branch `feat/ui-d3-u1-skin-kit` from `version/v0.3` (after U0 is merged). English only. Conventional Commits. A CHANGELOG line per commit.
- No new npm dependency. No change to `src/core/` rules or the save format; `config/balance.json` gains only `motion.d3`.
- Hex literals only in `src/game/uiTokens.ts`. Timings and amounts only in `balance.motion.d3`.
- Widget call signatures stay as they are; scene layouts are not changed in this phase.
- Windows Vitest flags: `--configLoader native --pool threads --maxWorkers 2`. Minimal tests while working; `npm test` then `npm run typecheck` before each merge.
- Use GitNexus `impact` on a symbol before changing its signature or return type (AGENTS.md §2c).

---

### Task 1: `balance.motion.d3`

**Files:**
- Modify: `config/balance.json` (inside `motion`), `src/core/balance.ts` (`MotionBalance`, schema near line 265, cross-field rules near line 386)
- Test: `tests/core/balanceMotion.test.ts` (append)

**Interfaces:**
- Produces:
```ts
export interface MotionD3Balance {
  burstMs: number; burstFromScale: number; burstToScale: number; burstSparks: number; burstSparkPx: number; burstSparkEndScale: number;
  burstMaxParticles: number; ringFadeMs: number; shakeMs: number; shakeCycles: number; shakePx: number; badgeFlashMs: number;
  sweepMs: number; trailMs: number; trailPx: number; trailAlpha: number; chevronMs: number; edgePx: number; edgeAlpha: number;
}
// MotionBalance gains:  d3: MotionD3Balance;
```

- [ ] **Step 1: Write the failing tests** (append to `tests/core/balanceMotion.test.ts`; reuse that file's existing helper that loads the real balance and its helper that parses a mutated copy. If the file names them differently, use its names.)

```ts
it('D3-R23 motion.d3 holds the touch feedback numbers', () => {
  const d = loadBalance().motion.d3;
  expect(d.burstMs).toBe(220); expect(d.burstFromScale).toBe(0.6); expect(d.burstToScale).toBe(1.4);
  expect(d.burstSparks).toBe(6); expect(d.burstMaxParticles).toBe(24);
  expect(d.shakeCycles).toBe(3); expect(d.shakePx).toBe(6); expect(d.shakeMs).toBe(240);
});
it('D3-R23 motion.d3 cross-field rules reject bad values', () => {
  const bad = (patch: Record<string, number>): (() => unknown) => () => {
    const raw = structuredClone(rawBalance()) as { motion: { d3: Record<string, number> } };
    Object.assign(raw.motion.d3, patch); return parseBalance(raw);
  };
  expect(bad({ burstToScale: 0.5 })).toThrow(/motion\.d3\.burstToScale/);
  expect(bad({ burstSparks: 30 })).toThrow(/motion\.d3\.burstSparks/);
  expect(bad({ burstSparkEndScale: 1.2 })).toThrow(/motion\.d3\.burstSparkEndScale/);
});
```

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/core/balanceMotion.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`motion.d3` is undefined).

- [ ] **Step 3: Implement**

`config/balance.json`, inside `"motion"` after `"readyDipMs"`:

```json
"d3": { "burstMs": 220, "burstFromScale": 0.6, "burstToScale": 1.4, "burstSparks": 6, "burstSparkPx": 26, "burstSparkEndScale": 0.5,
  "burstMaxParticles": 24, "ringFadeMs": 120, "shakeMs": 240, "shakeCycles": 3, "shakePx": 6, "badgeFlashMs": 240,
  "sweepMs": 420, "trailMs": 120, "trailPx": 6, "trailAlpha": 0.5, "chevronMs": 160, "edgePx": 4, "edgeAlpha": 0.6 }
```

`src/core/balance.ts`: add the `MotionD3Balance` interface above `MotionBalance`, add `d3: MotionD3Balance;` as the last member of `MotionBalance`, and in the `motion` schema add:

```ts
    d3: { burstMs: 'int+', burstFromScale: 'num+', burstToScale: 'num+', burstSparks: 'int0', burstSparkPx: 'num+', burstSparkEndScale: 'prob',
      burstMaxParticles: 'int+', ringFadeMs: 'int+', shakeMs: 'int+', shakeCycles: 'int+', shakePx: 'num+', badgeFlashMs: 'int+',
      sweepMs: 'int+', trailMs: 'int+', trailPx: 'num+', trailAlpha: 'prob', chevronMs: 'int+', edgePx: 'num+', edgeAlpha: 'prob' },
```

After the existing MOT-0 cross-field rules:

```ts
  // D3-R23 touch feedback cross-field rules.
  const d3 = mo.d3;
  if (d3.burstToScale <= d3.burstFromScale) fail('motion.d3.burstToScale', 'must be > burstFromScale');
  if (d3.burstSparks > d3.burstMaxParticles) fail('motion.d3.burstSparks', 'must be <= burstMaxParticles');
  if (d3.burstSparkEndScale >= 1) fail('motion.d3.burstSparkEndScale', 'must be < 1');
```

If `'prob'` accepts 1, the last rule is what rejects 1.2 and 1; if `'prob'` already rejects values above 1, change the test's expected message to the schema's message for that key.

- [ ] **Step 4: Run tests, typecheck, commit**

Run: `npx vitest run tests/core --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`
Expected: PASS, no type errors (test doubles that build a `MotionBalance` by hand must add `d3`; fix them by spreading `loadBalance().motion`).

```bash
git add config/balance.json src/core/balance.ts tests CHANGELOG.md
git commit -m "feat(balance): motion.d3 touch feedback numbers (D3-R23, R24)"
```

---

### Task 2: `skinSpec.ts` (pure recipes)

**Files:**
- Create: `src/game/ui/skin/skinSpec.ts`
- Test: `tests/game/skinSpec.test.ts`

**Interfaces:**
- Consumes: `TOKENS.d3` (U0).
- Produces: `SkinKind`, `SkinTone`, `SkinState`, `SkinRecipe`, `lipPx`, `skinRadius`, `skinRecipe` exactly as in the code below.

- [ ] **Step 1: Write the failing test**

```ts
// tests/game/skinSpec.test.ts
import { expect, it } from 'vitest';
import { lipPx, skinRadius, skinRecipe } from '../../src/game/ui/skin/skinSpec';
import { TOKENS } from '../../src/game/uiTokens';

const D = TOKENS.d3, U = 2; // unit: 2 game px per mock px

it('D3-R5 a primary button gets the big outline, a 28-unit radius cap and a gloss band', () => {
  const r = skinRecipe('button', 'primary', 560, 168, 'rest', U);
  expect(r.line).toEqual({ px: D.shape.lineBig * U, color: D.tone.primary.line });
  expect(r.r).toBe(D.shape.radiusBig * U);
  expect(r.stops).toEqual(D.tone.primary.face);
  expect(r.gloss).not.toBeNull();
  expect(r.gloss!.top).toBe(D.shape.glossTop);
  expect(r.gloss!.h).toBeCloseTo(168 * D.shape.glossFrac);
});
it('D3-R21 pressed halves the gloss; disabled uses the off tone without gloss', () => {
  const rest = skinRecipe('button', 'secondary', 300, 88, 'rest', U);
  const pressed = skinRecipe('button', 'secondary', 300, 88, 'pressed', U);
  expect(pressed.gloss!.top).toBeCloseTo(rest.gloss!.top * D.shape.pressedGloss);
  expect(pressed.gloss!.bottom).toBeCloseTo(rest.gloss!.bottom * D.shape.pressedGloss);
  const off = skinRecipe('button', 'secondary', 300, 88, 'disabled', U);
  expect(off.stops).toEqual(D.tone.off.face); expect(off.gloss).toBeNull(); expect(off.line!.color).toBe(D.tone.off.line);
});
it('D3-R5 the lip state is a flat shape in the lip colour, same size and radius', () => {
  const face = skinRecipe('round', 'light', 92, 92, 'rest', U), lip = skinRecipe('round', 'light', 92, 92, 'lip', U);
  expect(lip.stops).toEqual([D.tone.light.lip, D.tone.light.lip]);
  expect(lip.line).toBeNull(); expect(lip.gloss).toBeNull();
  expect([lip.w, lip.h, lip.r]).toEqual([face.w, face.h, face.r]);
});
it('D3-R5 lip depth per kind: primary button 8, skill 6, others 4, bar 0', () => {
  expect(lipPx('button', 'primary', U)).toBe(D.shape.lipBig * U);
  expect(lipPx('skill', 'skillA', U)).toBe(D.shape.lipSkill * U);
  expect(lipPx('button', 'light', U)).toBe(D.shape.lip * U);
  expect(lipPx('chip', 'light', U)).toBe(D.shape.lip * U);
  expect(lipPx('bar', 'track', U)).toBe(0);
});
it('D3-R5 radius per kind: pill kinds use half height, panel the panel radius, ribbon square', () => {
  expect(skinRadius('chip', 200, 80, U)).toBe(40);
  expect(skinRadius('skill', 156, 156, U)).toBe(78);
  expect(skinRadius('panel', 600, 700, U)).toBe(D.shape.radiusPanel * U);
  expect(skinRadius('ribbon', 320, 100, U)).toBe(0);
  expect(skinRadius('button', 300, 40, U)).toBe(20);
});
it('D3-R5 panels, ribbons and bar tracks have no gloss; a bar fill has gloss and no outline', () => {
  expect(skinRecipe('panel', 'light', 600, 700, 'rest', U).gloss).toBeNull();
  expect(skinRecipe('ribbon', 'ribbon', 320, 100, 'rest', U).gloss).toBeNull();
  expect(skinRecipe('bar', 'track', 400, 52, 'rest', U).gloss).toBeNull();
  const fill = skinRecipe('bar', 'mango', 400, 40, 'rest', U);
  expect(fill.gloss).not.toBeNull(); expect(fill.line).toBeNull();
});
it('D3-R5 a ribbon has a notch of a quarter of its height', () => {
  expect(skinRecipe('ribbon', 'ribbon', 320, 100, 'rest', U).notch).toBe(25);
  expect(skinRecipe('button', 'primary', 320, 100, 'rest', U).notch).toBe(0);
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run tests/game/skinSpec.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/game/ui/skin/skinSpec.ts
// D3-R5 pure paint recipes for the skin kit: no Phaser, no canvas. Sizes are game px; `unit` = game px per mock px (ui(1)).
import { TOKENS, type D3Tone } from '../../uiTokens';

const D = TOKENS.d3, S = D.shape;
export type SkinKind = 'button' | 'round' | 'chip' | 'panel' | 'bar' | 'ribbon' | 'skill';
export type SkinTone = D3Tone;
export type SkinState = 'rest' | 'pressed' | 'disabled' | 'lip';
export interface SkinGloss { x: number; y: number; w: number; h: number; r: number; top: number; bottom: number }
export interface SkinRecipe {
  kind: SkinKind; w: number; h: number; r: number; stops: readonly string[];
  line: { px: number; color: string } | null; gloss: SkinGloss | null; notch: number;
}
const RIBBON_NOTCH = 0.25, GLOSS_INSET = 3;
const isBig = (kind: SkinKind, tone: SkinTone): boolean => kind === 'skill' || (kind === 'button' && tone === 'primary');

/** D3-R5 depth of the static lip under a face. */
export function lipPx(kind: SkinKind, tone: SkinTone, unit: number): number {
  if (kind === 'bar') return 0;
  return unit * (kind === 'skill' ? S.lipSkill : isBig(kind, tone) ? S.lipBig : S.lip);
}
/** D3-R5 corner radius per kind. */
export function skinRadius(kind: SkinKind, _w: number, h: number, unit: number): number {
  if (kind === 'ribbon') return 0;
  if (kind === 'panel') return unit * S.radiusPanel;
  if (kind === 'button') return Math.min(h / 2, unit * S.radiusBig);
  return h / 2;
}
/** D3-R5/R21 recipe for one face. `lip` = flat lip-coloured shape; `disabled` = off tone, no gloss; `pressed` = dimmer gloss. */
export function skinRecipe(kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState, unit: number): SkinRecipe {
  const t = D.tone[state === 'disabled' ? 'off' : tone];
  const r = skinRadius(kind, w, h, unit), notch = kind === 'ribbon' ? h * RIBBON_NOTCH : 0;
  if (state === 'lip') return { kind, w, h, r, stops: [t.lip, t.lip], line: null, gloss: null, notch };
  const fill = kind === 'bar' && tone !== 'track';
  const linePx = unit * (isBig(kind, tone) ? S.lineBig : S.line);
  const glossy = state !== 'disabled' && tone !== 'off' && kind !== 'panel' && kind !== 'ribbon' && !(kind === 'bar' && !fill);
  const mul = state === 'pressed' ? S.pressedGloss : 1;
  const inset = (fill ? 0 : linePx) + unit * GLOSS_INSET, gh = h * S.glossFrac;
  return {
    kind, w, h, r, stops: t.face, notch,
    line: fill ? null : { px: linePx, color: t.line },
    gloss: glossy ? { x: inset, y: inset, w: w - 2 * inset, h: gh, r: Math.min(Math.max(0, r - inset), gh / 2), top: S.glossTop * mul, bottom: S.glossBottom * mul } : null,
  };
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/game/skinSpec.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/skin/skinSpec.ts tests/game/skinSpec.test.ts CHANGELOG.md
git commit -m "feat(ui): skinSpec pure paint recipes (D3-R5, R21)"
```

---

### Task 3: `skinPaint.ts` and `skinTextures.ts`

**Files:**
- Create: `src/game/ui/skin/skinPaint.ts`, `src/game/ui/skin/skinTextures.ts`, `src/game/ui/skin/index.ts`
- Test: `tests/game/skinTextures.test.ts`

**Interfaces:**
- Consumes: `skinRecipe`, `SkinRecipe`, `SkinKind`, `SkinTone`, `SkinState` (Task 2).
- Produces:
```ts
export interface Ctx2D { /* subset of CanvasRenderingContext2D, see code */ }
export function paintSkin(ctx: Ctx2D, rc: SkinRecipe): void
export interface CanvasTex { context: Ctx2D; refresh(): unknown }
export interface TextureHost { exists(key: string): boolean; createCanvas(key: string, w: number, h: number): CanvasTex | null }
export const skinKey: (kind: SkinKind, tone: SkinTone, state: SkinState, w: number, h: number) => string
export function skinTexture(host: TextureHost, kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState, unit: number): string
export const hostOf: (scene: { textures: unknown }) => TextureHost
```

- [ ] **Step 1: Write the failing test**

```ts
// tests/game/skinTextures.test.ts
import { expect, it } from 'vitest';
import { paintSkin, type Ctx2D } from '../../src/game/ui/skin/skinPaint';
import { skinRecipe } from '../../src/game/ui/skin/skinSpec';
import { skinKey, skinTexture, type TextureHost } from '../../src/game/ui/skin/skinTextures';
import { TOKENS } from '../../src/game/uiTokens';

function fakeCtx(): Ctx2D & { fills: unknown[]; grads: [number, string][][] } {
  const fills: unknown[] = [], grads: [number, string][][] = [];
  const ctx = {
    fillStyle: '' as unknown, fills, grads,
    beginPath() {}, moveTo() {}, lineTo() {}, arcTo() {}, closePath() {}, clearRect() {},
    fill() { fills.push(ctx.fillStyle); },
    createLinearGradient() { const stops: [number, string][] = []; grads.push(stops); return { addColorStop: (o: number, c: string) => { stops.push([o, c]); } }; },
  };
  return ctx;
}
function fakeHost(): TextureHost & { made: string[]; refreshed: number } {
  const keys = new Set<string>();
  const host = { made: [] as string[], refreshed: 0,
    exists: (k: string) => keys.has(k),
    createCanvas(k: string) { keys.add(k); host.made.push(k); return { context: fakeCtx(), refresh: () => { host.refreshed++; } }; } };
  return host;
}

it('D3-R5 paintSkin fills the outline, then the face gradient, then the gloss', () => {
  const ctx = fakeCtx(), rc = skinRecipe('button', 'primary', 200, 80, 'rest', 1);
  paintSkin(ctx, rc);
  expect(ctx.fills.length).toBe(3);
  expect(ctx.fills[0]).toBe(TOKENS.d3.tone.primary.line);
  expect(ctx.grads[0]!.map(([, c]) => c)).toEqual([...TOKENS.d3.tone.primary.face]);
  expect(ctx.grads[0]!.map(([o]) => o)).toEqual([0, 0.5, 1]);
  expect(ctx.grads[1]![0]![1]).toBe(`rgba(255,255,255,${TOKENS.d3.shape.glossTop})`);
});
it('D3-R5 a lip recipe paints one flat fill', () => {
  const ctx = fakeCtx();
  paintSkin(ctx, skinRecipe('button', 'primary', 200, 80, 'lip', 1));
  expect(ctx.fills.length).toBe(1);
});
it('D3-R5 skinTexture paints once per key and reuses the cached texture', () => {
  const host = fakeHost();
  const a = skinTexture(host, 'button', 'primary', 200.4, 80, 'rest', 1);
  const b = skinTexture(host, 'button', 'primary', 200.4, 80, 'rest', 1);
  expect(a).toBe('d3/button/primary/rest/201x80'); expect(b).toBe(a);
  expect(host.made).toEqual([a]); expect(host.refreshed).toBe(1);
  skinTexture(host, 'button', 'primary', 200.4, 80, 'pressed', 1);
  expect(host.made.length).toBe(2);
});
it('D3-R5 skinKey rounds sizes up to whole pixels', () => {
  expect(skinKey('chip', 'light', 'rest', 99.1, 40)).toBe('d3/chip/light/rest/100x40');
});
it('D3-R5 skinTexture throws when the canvas cannot be created', () => {
  const host: TextureHost = { exists: () => false, createCanvas: () => null };
  expect(() => skinTexture(host, 'chip', 'light', 10, 10, 'rest', 1)).toThrow(/skinTextures/);
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run tests/game/skinTextures.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the painter**

```ts
// src/game/ui/skin/skinPaint.ts
// D3-R5 Canvas2D painter for a SkinRecipe. The outline is the full shape in the line colour; the face is the same shape inset by the line width.
import type { SkinRecipe } from './skinSpec';

export interface Ctx2D {
  fillStyle: unknown;
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void; closePath(): void; fill(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
}
function shape(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number, notch: number): void {
  ctx.beginPath();
  if (notch > 0) { // ribbon: V notch on both ends
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - notch, y + h / 2); ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h); ctx.lineTo(x + notch, y + h / 2);
  } else {
    const q = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q);
  }
  ctx.closePath();
}
export function paintSkin(ctx: Ctx2D, rc: SkinRecipe): void {
  ctx.clearRect(0, 0, rc.w, rc.h);
  const lp = rc.line?.px ?? 0;
  if (rc.line) { shape(ctx, 0, 0, rc.w, rc.h, rc.r, rc.notch); ctx.fillStyle = rc.line.color; ctx.fill(); }
  const g = ctx.createLinearGradient(0, lp, 0, rc.h - lp), last = rc.stops.length - 1;
  rc.stops.forEach((c, i) => g.addColorStop(last === 0 ? 0 : i / last, c));
  shape(ctx, lp, lp, rc.w - 2 * lp, rc.h - 2 * lp, Math.max(0, rc.r - lp), Math.max(0, rc.notch - lp));
  ctx.fillStyle = g; ctx.fill();
  if (rc.gloss) {
    const q = rc.gloss, gg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    gg.addColorStop(0, `rgba(255,255,255,${q.top})`); gg.addColorStop(1, `rgba(255,255,255,${q.bottom})`);
    shape(ctx, q.x, q.y, q.w, q.h, q.r, 0); ctx.fillStyle = gg; ctx.fill();
  }
}
```

- [ ] **Step 4: Implement the cache**

```ts
// src/game/ui/skin/skinTextures.ts
// D3-R5 one canvas texture per (kind, tone, state, size), painted once and kept for the life of the game.
import { paintSkin, type Ctx2D } from './skinPaint';
import { skinRecipe, type SkinKind, type SkinState, type SkinTone } from './skinSpec';

export interface CanvasTex { context: Ctx2D; refresh(): unknown }
export interface TextureHost { exists(key: string): boolean; createCanvas(key: string, w: number, h: number): CanvasTex | null }
export const skinKey = (kind: SkinKind, tone: SkinTone, state: SkinState, w: number, h: number): string =>
  `d3/${kind}/${tone}/${state}/${Math.ceil(w)}x${Math.ceil(h)}`;
export function skinTexture(host: TextureHost, kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState, unit: number): string {
  const W = Math.ceil(w), H = Math.ceil(h), key = skinKey(kind, tone, state, W, H);
  if (host.exists(key)) return key;
  const tex = host.createCanvas(key, W, H);
  if (!tex) throw new Error(`skinTextures: cannot create ${key}`);
  paintSkin(tex.context, skinRecipe(kind, tone, W, H, state, unit));
  tex.refresh();
  return key;
}
/** Phaser's TextureManager satisfies TextureHost (CanvasTexture has `context` and `refresh`). */
export const hostOf = (scene: { textures: unknown }): TextureHost => scene.textures as TextureHost;
```

```ts
// src/game/ui/skin/index.ts
export * from './skinSpec';
export * from './skinPaint';
export * from './skinTextures';
```

- [ ] **Step 5: Run tests, typecheck, commit**

Run: `npx vitest run tests/game/skinTextures.test.ts tests/game/skinSpec.test.ts --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`
Expected: PASS (12 tests), no type errors.

```bash
git add src/game/ui/skin tests/game/skinTextures.test.ts CHANGELOG.md
git commit -m "feat(ui): skin painter and texture cache (D3-R5)"
```

---

### Task 4: One light theme (D3-R3)

**Files:**
- Modify: `src/game/render/palette.ts`, `src/game/flow/settingsView.ts`, `src/game/scenes/SettingsScene.ts`, `src/game/main.ts`, `index.html`
- Check and adapt callers found by `grep -rn "themeOf\|osDisplay\|boardTheme\|themePatch\|DARK\b" src --include=*.ts` (known: `hud/HudTop.ts`, `hud/PauseOverlay.ts`, `scenes/GameScene.ts`, `scenes/HudScene.ts`, `scenes/ui.ts`, `meta/settings.ts`)
- Test: `tests/game/palettePrefs.test.ts`, `tests/game/settingsView.test.ts`, `tests/game/settingsScene.test.ts`

**Interfaces:**
- Produces: `currentPalette()` always returns `LIGHT`; `themeOf()` always returns `'light'`; `settingsView()` result keeps its `rows` and has no `theme`; `themePatch` is removed. `meta/settings.ts` is NOT changed (`boardTheme` stays in the save, ignored).

- [ ] **Step 1: Rewrite the palette tests**

Replace the three `P3-0-R5` tests in `tests/game/palettePrefs.test.ts` that assert `DARK` with:

```ts
it('D3-R3 the palette is always light, whatever the OS scheme or the saved board theme', () => {
  os({ dark: true, reduce: false });
  setDisplaySettings({ ...defaultSettings(), boardTheme: 'dark' });
  expect(currentPalette()).toBe(LIGHT);
  setDisplaySettings(null);
  expect(currentPalette()).toBe(LIGHT);
});
it('D3-R3 reduced motion still follows the setting, then the OS', () => {
  os({ dark: false, reduce: true });
  setDisplaySettings({ ...defaultSettings(), reducedMotion: false });
  expect(reduceMotion()).toBe(false);
  setDisplaySettings(defaultSettings());
  expect(reduceMotion()).toBe(true);
});
```

Remove `DARK` from that file's import. In `tests/game/settingsView.test.ts` add:

```ts
it('D3-R3 the settings view has no board theme', () => {
  const v = settingsView(defaultSettings(), { theme: 'light', reducedMotion: false } as never);
  expect('theme' in v).toBe(false);
  expect(v.rows.map((r) => r.id)).not.toContain('boardTheme');
});
```

(Use the argument shape `settingsView` has in that file's existing tests; keep the two assertions.)

- [ ] **Step 2: Run and see them fail**

Run: `npx vitest run tests/game/palettePrefs.test.ts tests/game/settingsView.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`currentPalette()` returns `DARK`; `theme` is in the view).

- [ ] **Step 3: Implement**

- `palette.ts`: `currentPalette = (): Palette => LIGHT;` and `themeOf = (_p: Palette): BoardTheme => 'light';`. `osDisplay()` keeps `reducedMotion` and returns `dark: false` without reading the media query. Keep the `DARK` export for now with a comment `// removed in U6 with the D2 tokens` so untouched callers compile.
- `settingsView.ts`: drop `theme` from `SettingsView` and its builder; delete `themePatch`; keep `SettingsTheme`, `settingsCardEdge` and `toggleTrackStyle` callable with `'light'` (they are deleted in U6).
- `SettingsScene.ts`: delete the Board theme card (title, hint, the two theme tiles, their taps) and the entrance-order entry for it; close the vertical gap by moving the "Changes save automatically" line up under the rows card. Update `flow/entranceOrder.ts` `settingsOrder` and its test if the card was listed there.
- `main.ts`: `backgroundColor` stays `currentPalette().bg`.
- `index.html`: delete the `@media (prefers-color-scheme: dark)` rule.
- Callers: wherever a branch tests `theme === 'dark'` through `themeOf`/`display()`, leave the code (it is now dead) unless the compiler complains; U6 removes it.

- [ ] **Step 4: Run the affected suites and fix expectations**

Run: `npx vitest run tests/game/palettePrefs.test.ts tests/game/settingsView.test.ts tests/game/settingsScene.test.ts tests/game/entranceOrder.test.ts tests/game/hudViews.test.ts tests/game/biomePalette.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: PASS. Tests that asserted the dark look through `currentPalette()` are deleted (they test removed behaviour); tests that call `boardLook(n, 'dark')` directly still pass because `boardLook` is untouched until U4.

- [ ] **Step 5: Screenshot check, typecheck, commit**

Run: `npm run typecheck`, then with the dev server up:
`node tools/qa/shot.mjs size:360,640 media:dark "go:http://localhost:5173/" wait:3500 tap:180,520 wait:5000 shot:tmp/qa/u1-dark-os-game.png`
Expected: the HUD and board are light although the OS scheme is dark.

```bash
git add -A
git commit -m "feat(ui): one light theme - OS colour scheme ignored, Board theme setting removed (D3-R3)"
```

---

### Task 5: Widgets on skins (D3-R6, R21, R22)

**Files:**
- Modify: `src/game/ui/geometry.ts`, `src/game/ui/pillTones.ts`, `src/game/ui/widgets.ts`, `src/game/ui/menuWidgets.ts` (`roundIconButton`), `src/game/scenes/ui.ts` (`Button` type)
- Test: `tests/game/pillFeedback.test.ts` (adapt), `tests/game/widgetsSkin.test.ts` (create), `tests/support/scene.ts` (add `textures` and `add.image` doubles if missing)

**Interfaces:**
- Consumes: `skinTexture`, `hostOf`, `lipPx`, `SkinTone` (Tasks 2, 3); `attachFeedback`, `bindPress` (existing).
- Produces:
```ts
pillGeom(wMock: number, hMock: number, lipMock?: number): PillGeom       // shelf = ui(lipMock), pressedDy = ui(lipMock - pressedLip)
PILL_SKIN: Record<PillTone, SkinTone>                                   // green->primary, orange->secondary, cream->light, danger->danger
pillButton(...same args...): Button                                      // Button.g is now the face image
card(scene, x, y, wMock, hMock, radiusMock?): Phaser.GameObjects.Container   // lip + panel images, origin top-left
chip(scene, x, y, text, fill, name?): Phaser.GameObjects.Container       // `fill` is ignored, kept for signature compatibility
titleText(...same args...): Phaser.GameObjects.Text
progressBar(scene, x, y, wMock, hMock, fill): { g: Phaser.GameObjects.Container; set(value: number, max: number): void }
roundIconButton(...same args...): Phaser.GameObjects.Container
interface Button { c: Container; g: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics; text: Text; w: number; h: number; lip?: Phaser.GameObjects.Image }
```

- [ ] **Step 1: Check the blast radius**

Run GitNexus `impact` for `card`, `chip`, `progressBar`, `pillButton`, `roundIconButton`, `Button`, `paintButton`. List every caller that uses a `Graphics` method on the returned object (`.clear()`, `.fillStyle(...)`, `.g.clear()`); each one is adapted in Step 5. `paintButton` is used only with the greybox `button()` and stays.

- [ ] **Step 2: Write the failing tests**

Extend `tests/support/scene.ts`: `scene.add.image(x, y, key)` returns a `DrawObject` with `texture = key` and a `setTexture(k)` that records `this.texture = k`; `setCrop(x, y, w, h)` records `this.crop = [x, y, w, h]`; `scene.textures` is a fake host (`exists`, `createCanvas` returning `{ context, refresh }` with the no-op `Ctx2D` from Task 3's test). Keep existing members untouched.

```ts
// tests/game/widgetsSkin.test.ts
import { expect, it, vi } from 'vitest';
import { pillGeom } from '../../src/game/ui/geometry';
import { ui } from '../../src/game/ui/layout';
import { PILL_SKIN } from '../../src/game/ui/pillTones';
import { card, chip, pillButton, progressBar } from '../../src/game/ui/widgets';
import { TOKENS } from '../../src/game/uiTokens';
import { sceneHarness } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Geom: { Rectangle: class { static Contains = () => true } } } }));
const fb = { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) };
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: () => fb }));
vi.mock('../../src/game/ui/touchFx', () => ({ tapBurst: vi.fn(), denied: vi.fn() }));
const S = TOKENS.d3.shape;

it('D3-R6 pill tones map to skin tones', () => {
  expect(PILL_SKIN).toEqual({ green: 'primary', orange: 'secondary', cream: 'light', danger: 'danger' });
});
it('D3-R21 pillGeom: the shelf is the lip and the press dip leaves the pressed lip visible', () => {
  const g = pillGeom(200, 60, S.lipBig);
  expect(g.shelf).toBe(ui(S.lipBig)); expect(g.pressedDy).toBe(ui(S.lipBig - S.pressedLip));
  expect(pillGeom(200, 60).shelf).toBe(ui(S.lip));
});
it('D3-R6 pillButton is a lip image under a face image, both from the skin cache', () => {
  const { scene } = sceneHarness();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', () => {}) as unknown as
    { g: { texture: string }; lip: { texture: string; y: number }; c: { list: unknown[] } };
  expect(b.g.texture).toMatch(/^d3\/button\/primary\/rest\//);
  expect(b.lip.texture).toMatch(/^d3\/button\/primary\/lip\//);
  expect(b.lip.y).toBe(ui(S.lipBig));
  expect(b.c.list[0]).toBe(b.lip); expect(b.c.list[1]).toBe(b.g);
});
it('D3-R22 the pressed face shows on pointer down and the rest face comes back on release or slide-off', () => {
  const { scene } = sceneHarness();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', () => {}, 'cream') as unknown as
    { g: { texture: string }; c: { emit(k: string): void } };
  b.c.emit('pointerdown'); expect(b.g.texture).toMatch(/\/light\/pressed\//);
  b.c.emit('pointerout'); expect(b.g.texture).toMatch(/\/light\/rest\//);
  b.c.emit('pointerdown'); b.c.emit('pointerup'); expect(b.g.texture).toMatch(/\/light\/rest\//);
});
it('D3-R6 card is a panel with its lip; chip is a light chip', () => {
  const { scene } = sceneHarness();
  const c = card(scene as never, 10, 20, 300, 200) as unknown as { x: number; y: number; list: { texture: string }[] };
  expect([c.x, c.y]).toEqual([10, 20]);
  expect(c.list.map((o) => o.texture.split('/').slice(0, 4).join('/'))).toEqual(['d3/panel/light/lip', 'd3/panel/light/rest']);
  const ch = chip(scene as never, 0, 0, 'Best 12', '#000000') as unknown as { list: { texture?: string }[] };
  expect(ch.list[1]!.texture).toMatch(/^d3\/chip\/light\/rest\//);
});
it('D3-R6 progressBar crops the fill to the value and hides it at zero', () => {
  const { scene } = sceneHarness();
  const bar = progressBar(scene as never, 0, 0, 200, 20, TOKENS.d3.tone.mango.face[0]);
  const fill = (bar.g as unknown as { list: { visible: boolean; crop?: number[] }[] }).list[1]!;
  expect(fill.visible).toBe(false);
  bar.set(1, 2);
  expect(fill.visible).toBe(true); expect(fill.crop![2]).toBeCloseTo((ui(200) - 2 * ui(S.line)) / 2);
});
```

- [ ] **Step 3: Run and see them fail**

Run: `npx vitest run tests/game/widgetsSkin.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`PILL_SKIN` is not exported, widgets still draw `Graphics`).

- [ ] **Step 4: Implement**

`geometry.ts`:

```ts
import { TOKENS } from '../uiTokens';
const S = TOKENS.d3.shape;
export function pillGeom(wMock: number, hMock: number, lipMock: number = S.lip): PillGeom {
  const h = ui(hMock);
  return { w: ui(wMock), h, radius: h / 2, shelf: ui(lipMock), pressedDy: ui(lipMock - S.pressedLip), labelStroke: ui(4) };
}
```

`pillTones.ts` (replace the D2 table; the old `PILL_TONES` export stays until its last importer is migrated, then is deleted in this task if `grep -rn "PILL_TONES" src` shows only `widgets.ts`):

```ts
import type { SkinTone } from './skin';
export type PillTone = 'green' | 'orange' | 'cream' | 'danger';
/** D3-R6 old pill tone names (kept for call sites) to D3 skin tones. */
export const PILL_SKIN: Record<PillTone, SkinTone> = { green: 'primary', orange: 'secondary', cream: 'light', danger: 'danger' };
```

`widgets.ts` (full replacement of the five functions; the header comment about origins and the Settings overlay contract stays):

```ts
import Phaser from 'phaser';
import { bindPress, type Button } from '../scenes/ui';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { attachFeedback } from './feedback';
import { barFill, pillGeom, pillHitRect } from './geometry';
import { ui } from './layout';
import { PILL_SKIN, type PillTone } from './pillTones';
import { hostOf, lipPx, skinTexture, type SkinKind, type SkinState, type SkinTone } from './skin';
import { tapBurst } from './touchFx';

export { PILL_SKIN, type PillTone } from './pillTones';
const D = TOKENS.d3, S = D.shape;
const LABEL_RATIO = 0.42, LABEL_RATIO_BIG = 0.56;

/** D3-R5 image of one skin state, centred at x,y. */
function skinImage(scene: Phaser.Scene, x: number, y: number, kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState): Phaser.GameObjects.Image {
  return scene.add.image(x, y, skinTexture(hostOf(scene), kind, tone, w, h, state, ui(1)));
}

// D3-R6/R21/R22 pill button: static lip, face + label dip on press, pressed face texture on pointer down.
export function pillButton(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, text: string,
  name: string, action: () => void, tone: PillTone = 'green', opts: { navigates?: boolean } = {}): Button {
  const skin = PILL_SKIN[tone], tc = D.tone[skin];
  const geom = pillGeom(wMock, hMock, skin === 'primary' ? S.lipBig : S.lip), { w, h } = geom;
  const key = (state: SkinState): string => skinTexture(hostOf(scene), 'button', skin, w, h, state, ui(1));
  const lip = scene.add.image(0, geom.shelf, key('lip'));
  const face = scene.add.image(0, 0, key('rest'));
  const t = scene.add.text(0, 0, text, {
    fontFamily: tc.outlined ? FONT_TITLE : FONT_UI, fontSize: `${ui(hMock * (tc.outlined ? LABEL_RATIO_BIG : LABEL_RATIO))}px`,
    fontStyle: tc.outlined ? '' : '900', color: tc.text,
    stroke: tc.outlined ? tc.line : undefined, strokeThickness: tc.outlined ? geom.labelStroke : 0,
  }).setOrigin(0.5);
  const hit = pillHitRect(geom);
  const c = scene.add.container(x, y, [lip, face, t]).setName(name).setSize(w, h).setInteractive({
    hitArea: new Phaser.Geom.Rectangle(hit.x, hit.y, hit.w, hit.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
  const fb = attachFeedback(scene, [face, t], 'pill', { source: c, dipPx: geom.pressedDy, navigates: opts.navigates });
  bindPress(c, () => { face.setTexture(key('pressed')); fb.press(); }, () => { face.setTexture(key('rest')); fb.release(); },
    () => fb.fire(() => { tapBurst(scene, c.x, c.y, skin); action(); }));
  return { c, g: face, text: t, w, h, lip };
}

// D3-R6 panel card, origin top-left; the lip hangs below.
export function card(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, _radiusMock = S.radiusPanel): Phaser.GameObjects.Container {
  const w = ui(wMock), h = ui(hMock), lip = lipPx('panel', 'light', ui(1));
  return scene.add.container(x, y, [
    skinImage(scene, w / 2, h / 2 + lip, 'panel', 'light', w, h, 'lip'),
    skinImage(scene, w / 2, h / 2, 'panel', 'light', w, h, 'rest'),
  ]);
}

// D3-R6 light chip; `fill` is kept for the call signature and ignored (one chip look in D3).
export function chip(scene: Phaser.Scene, x: number, y: number, text: string, _fill: string, name = ''): Phaser.GameObjects.Container {
  const t = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontSize: `${ui(13)}px`, fontStyle: '900', color: D.text }).setOrigin(0.5);
  const w = t.width + 2 * ui(12), h = t.height + 2 * ui(6), lip = lipPx('chip', 'light', ui(1));
  return scene.add.container(x, y, [
    skinImage(scene, 0, lip, 'chip', 'light', w, h, 'lip'), skinImage(scene, 0, 0, 'chip', 'light', w, h, 'rest'), t,
  ]).setName(name).setSize(w, h);
}

// D3-R1 display type: white Lilita One, deep ink outline and drop.
export function titleText(scene: Phaser.Scene, x: number, y: number, text: string, sizeMock: number, fill: string = D.white): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT_TITLE, fontSize: `${ui(sizeMock)}px`, color: fill,
    stroke: D.inkDeep, strokeThickness: ui(TOKENS.title.strokePx),
  }).setOrigin(0.5).setShadow(0, ui(TOKENS.title.shadowY), D.inkDeep, 0, true, true);
}

// D3-R6 bar: track image plus a cropped fill image; `fill` picks the fill tone (energy colour -> energy, anything else -> mango).
export function progressBar(scene: Phaser.Scene, x: number, y: number, wMock: number, hMock: number, fill: string):
  { g: Phaser.GameObjects.Container; set(value: number, max: number): void } {
  const w = ui(wMock), h = ui(hMock), pad = ui(S.line), fw = w - 2 * pad, fh = h - 2 * pad;
  const tone: SkinTone = toInt(fill) === toInt(D.tone.energy.face[0]) || toInt(fill) === toInt(TOKENS.sky.energy) ? 'energy' : 'mango';
  const track = skinImage(scene, w / 2, h / 2, 'bar', 'track', w, h, 'rest');
  const fillImg = skinImage(scene, w / 2, h / 2, 'bar', tone, fw, fh, 'rest');
  const g = scene.add.container(x, y, [track, fillImg]);
  const set = (value: number, max: number): void => {
    const px = barFill(value, max, fw);
    fillImg.setVisible(px > 0);
    if (px > 0) fillImg.setCrop(0, 0, px, fh);
  };
  set(0, 1);
  return { g, set };
}
```

`scenes/ui.ts`: widen the type:

```ts
export interface Button { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text; w: number; h: number; lip?: Phaser.GameObjects.Image }
```

and in `paintButton` narrow once: `if (!(b.g instanceof Phaser.GameObjects.Graphics)) return;` as its first line.

`menuWidgets.ts` `roundIconButton`: replace the `Graphics` circle with skins; the `shelf` argument is kept and ignored:

```ts
  const d = ui(diameterMock), lip = lipPx('round', 'light', ui(1)), host = hostOf(scene);
  const lipImg = scene.add.image(0, lip, skinTexture(host, 'round', 'light', d, d, 'lip', ui(1)));
  const face = scene.add.image(0, 0, skinTexture(host, 'round', 'light', d, d, 'rest', ui(1)));
  const ic = scene.add.graphics(); drawIcon(ic, icon, d * MENU.widgets.iconRatio, toInt(TOKENS.d3.text));
  const c = scene.add.container(x, y, [lipImg, face, ic]).setName(name);
  const hit = hitSize(d); // UIFIX-R7
  tap(scene, x, y, hit, hit, `${name}-hit`, () => { tapBurst(scene, x, y, 'light'); action(); }, { visual: [face, ic], kind: 'round', navigates: opts.navigates });
  return c;
```

`touchFx.ts` does not exist until Task 6: create it now with the two exported functions as empty bodies so this task compiles, and note in the commit that Task 6 fills them:

```ts
// src/game/ui/touchFx.ts — bodies arrive in U1 Task 6.
import type Phaser from 'phaser';
import type { MotionTarget } from '../motion';
import type { SkinTone } from './skin';
export function tapBurst(_scene: Phaser.Scene, _x: number, _y: number, _tone: SkinTone): void {}
export function denied(_scene: Phaser.Scene, _visual: MotionTarget, _badge?: { setTint(c: number): unknown; clearTint(): unknown }): void {}
```

- [ ] **Step 5: Adapt callers and old tests**

For each caller from Step 1 that treated `card()` or `progressBar().g` as `Graphics`: positions work unchanged (`setPosition`, `setAlpha`, `setVisible`, `setDepth` exist on containers); calls that redraw (`.clear().fillStyle...`) are replaced by `set(...)` for bars or removed for cards. `tests/game/pillFeedback.test.ts`: the first test's expectations become `opts.dipPx === pillGeom(200, 60, TOKENS.d3.shape.lipBig).pressedDy` and `visuals[0] === b.g` still holds; add `vi.mock('../../src/game/ui/touchFx', ...)` as in the new test file. Update any test that asserts `fillRoundedRect` commands of pills, cards or chips to assert the texture key prefix instead.

- [ ] **Step 6: Run the game-layer suite, typecheck**

Run: `npx vitest run tests/game --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Screenshot check and commit**

With the dev server up:
`node tools/qa/shot.mjs size:360,640 media:light "go:http://localhost:5173/" wait:3500 shot:tmp/qa/u1-home.png tap:325,40 wait:1800 shot:tmp/qa/u1-settings.png`
Expected: Home shows the glossy green PLAY with a dark-green lip and a round light Settings button; Settings rows sit on a D3 panel. Layouts are unchanged (old positions). No console errors: `node tools/qa/shot.mjs "go:http://localhost:5173/" wait:3000 "eval:window.__errs ?? 0"` is not available, so open the page once in a normal browser and check the console.

```bash
git add -A
git commit -m "feat(ui): widget kit painted with D3 skins - pill, card, chip, bar, round button (D3-R6, R21, R22)"
```

---

### Task 6: Touch feedback (D3-R23, R24, R28)

**Files:**
- Create: `src/game/ui/interactionModel.ts`
- Modify: `src/game/ui/touchFx.ts` (fill the bodies), `src/game/motion/motion.ts` (export the config accessor)
- Test: `tests/game/interactionModel.test.ts`, `tests/game/touchFx.test.ts`

**Interfaces:**
- Consumes: `MotionD3Balance` (Task 1), `cubicOut`, `lerp`, `clamp01` from `src/game/motion/curves.ts`, `motionFor(scene)` (`Motion.ease(target: { v: number }, to, ms, onUpdate)`), `reduceMotion()` from `src/game/render/palette.ts`, `SkinTone`.
- Produces:
```ts
export type BurstKind = 'full' | 'ring';
export const burstKind: (tone: SkinTone) => BurstKind
export function ringAt(t: number, c: MotionD3Balance): { scale: number; alpha: number }
export function sparkAt(i: number, n: number, t: number, c: MotionD3Balance): { dx: number; dy: number; alpha: number; scale: number }
export function shakeDx(t: number, c: MotionD3Balance): number
export interface TapPlan { ringMs: number; sparks: number }
export function tapPlan(kind: BurstKind, reduced: boolean, live: number, c: MotionD3Balance): TapPlan
export const deniedPlan: (reduced: boolean) => { shake: boolean; badgeFlash: boolean }
// motion.ts
export function motionCfgFor(scene: Phaser.Scene): MotionBalance
```

- [ ] **Step 1: Write the failing model test**

```ts
// tests/game/interactionModel.test.ts
import { expect, it } from 'vitest';
import { burstKind, deniedPlan, ringAt, shakeDx, sparkAt, tapPlan } from '../../src/game/ui/interactionModel';
import { loadBalance } from '../support/balance';

const c = loadBalance().motion.d3;

it('D3-R23 primary and skill tones burst fully; the others show the ring only', () => {
  expect(burstKind('primary')).toBe('full'); expect(burstKind('skillA')).toBe('full'); expect(burstKind('skillB')).toBe('full');
  expect(burstKind('secondary')).toBe('ring'); expect(burstKind('light')).toBe('ring'); expect(burstKind('danger')).toBe('ring');
});
it('D3-R23 the ring grows from 0.6 to 1.4 and fades out', () => {
  expect(ringAt(0, c)).toEqual({ scale: c.burstFromScale, alpha: 1 });
  expect(ringAt(1, c).scale).toBeCloseTo(c.burstToScale); expect(ringAt(1, c).alpha).toBe(0);
  expect(ringAt(0.5, c).scale).toBeGreaterThan((c.burstFromScale + c.burstToScale) / 2); // ease-out
});
it('D3-R23 sparks fly out evenly, the first one straight up, and shrink to the end scale', () => {
  const up = sparkAt(0, 6, 1, c);
  expect(up.dx).toBeCloseTo(0); expect(up.dy).toBeCloseTo(-c.burstSparkPx);
  expect(up.alpha).toBe(0); expect(up.scale).toBeCloseTo(c.burstSparkEndScale);
  const opposite = sparkAt(3, 6, 1, c);
  expect(opposite.dy).toBeCloseTo(c.burstSparkPx);
  expect(sparkAt(2, 6, 0, c)).toEqual({ dx: 0, dy: 0, alpha: 1, scale: 1 });
});
it('D3-R24 the shake starts and ends at rest and never exceeds shakePx', () => {
  expect(shakeDx(0, c)).toBeCloseTo(0); expect(shakeDx(1, c)).toBeCloseTo(0);
  for (let i = 0; i <= 40; i++) expect(Math.abs(shakeDx(i / 40, c))).toBeLessThanOrEqual(c.shakePx);
  expect(Math.abs(shakeDx(1 / (4 * c.shakeCycles), c))).toBeGreaterThan(c.shakePx * 0.8);
});
it('D3-R23 the particle cap limits sparks; a ring-only tap has none', () => {
  expect(tapPlan('full', false, 0, c)).toEqual({ ringMs: c.burstMs, sparks: c.burstSparks });
  expect(tapPlan('full', false, c.burstMaxParticles - 2, c).sparks).toBe(2);
  expect(tapPlan('full', false, c.burstMaxParticles + 5, c).sparks).toBe(0);
  expect(tapPlan('ring', false, 0, c).sparks).toBe(0);
});
it('D3-R28 reduced motion: a short ring fade, no sparks, no shake, the badge still flashes', () => {
  expect(tapPlan('full', true, 0, c)).toEqual({ ringMs: c.ringFadeMs, sparks: 0 });
  expect(deniedPlan(true)).toEqual({ shake: false, badgeFlash: true });
  expect(deniedPlan(false)).toEqual({ shake: true, badgeFlash: true });
});
```

- [ ] **Step 2: Run and see it fail**

Run: `npx vitest run tests/game/interactionModel.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the model**

```ts
// src/game/ui/interactionModel.ts
// D3-R23/R24/R28 pure touch feedback math and plans: no Phaser, no allocation beyond the returned record.
import type { MotionD3Balance } from '../../core/balance';
import { clamp01, cubicOut, lerp } from '../motion/curves';
import type { SkinTone } from './skin';

export type BurstKind = 'full' | 'ring';
/** D3-R23 primary and skill buttons get ring + sparks; every other tone the ring only. */
export const burstKind = (tone: SkinTone): BurstKind => (tone === 'primary' || tone === 'skillA' || tone === 'skillB' ? 'full' : 'ring');
/** D3-R23 ring pose at progress t in 0..1. */
export function ringAt(t: number, c: MotionD3Balance): { scale: number; alpha: number } {
  return { scale: lerp(c.burstFromScale, c.burstToScale, cubicOut(t)), alpha: 1 - clamp01(t) };
}
/** D3-R23 spark i of n at progress t: even fan starting straight up. */
export function sparkAt(i: number, n: number, t: number, c: MotionD3Balance): { dx: number; dy: number; alpha: number; scale: number } {
  const a = (2 * Math.PI * i) / n - Math.PI / 2, d = c.burstSparkPx * cubicOut(t), u = clamp01(t);
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, alpha: 1 - u, scale: lerp(1, c.burstSparkEndScale, u) };
}
/** D3-R24 horizontal shake offset: a decaying sine with shakeCycles cycles. */
export function shakeDx(t: number, c: MotionD3Balance): number {
  const u = clamp01(t);
  return Math.sin(2 * Math.PI * c.shakeCycles * u) * c.shakePx * (1 - u);
}
export interface TapPlan { ringMs: number; sparks: number }
/** D3-R23/R28 what one tap spawns, given the live particle count. */
export function tapPlan(kind: BurstKind, reduced: boolean, live: number, c: MotionD3Balance): TapPlan {
  if (reduced) return { ringMs: c.ringFadeMs, sparks: 0 };
  return { ringMs: c.burstMs, sparks: kind === 'ring' ? 0 : Math.max(0, Math.min(c.burstSparks, c.burstMaxParticles - live)) };
}
/** D3-R24/R28 a refused tap. */
export const deniedPlan = (reduced: boolean): { shake: boolean; badgeFlash: boolean } => ({ shake: !reduced, badgeFlash: true });
```

- [ ] **Step 4: Run the model test**

Run: `npx vitest run tests/game/interactionModel.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: PASS (6 tests). `sparkAt(2, 6, 0, c)` returns `dx: 0, dy: 0` exactly because `cubicOut(0)` is 0; if `-0` breaks `toEqual`, add `+ 0` to the `dx`/`dy` expressions.

- [ ] **Step 5: Write the failing Phaser-layer test**

```ts
// tests/game/touchFx.test.ts
import { beforeEach, expect, it, vi } from 'vitest';
import { loadBalance } from '../support/balance';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ reduced: false, eases: [] as { ms: number; step: (v: number) => void }[] }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/game/render/palette', () => ({ reduceMotion: () => h.reduced }));
vi.mock('../../src/game/motion', async (orig) => ({
  ...(await orig<typeof import('../../src/game/motion')>()),
  motionFor: () => ({ ease: (_t: { v: number }, _to: number, ms: number, step: (v: number) => void) => { h.eases.push({ ms, step }); } }),
  motionCfgFor: () => loadBalance().motion,
}));
import { denied, liveParticles, tapBurst } from '../../src/game/ui/touchFx';

const c = loadBalance().motion.d3;
beforeEach(() => { h.reduced = false; h.eases.length = 0; });

it('D3-R23 a primary tap spawns one ring and six sparks, all released at the end', () => {
  const { scene } = sceneHarness();
  tapBurst(scene as never, 100, 200, 'primary');
  expect(liveParticles(scene as never)).toBe(1 + c.burstSparks);
  expect(h.eases[0]!.ms).toBe(c.burstMs);
  h.eases[0]!.step(1);
  expect(liveParticles(scene as never)).toBe(0);
});
it('D3-R23 a light tap spawns the ring only', () => {
  const { scene } = sceneHarness();
  tapBurst(scene as never, 0, 0, 'light');
  expect(liveParticles(scene as never)).toBe(1);
});
it('D3-R28 reduced motion: ring fade only, and denied does not move the target', () => {
  h.reduced = true;
  const { scene } = sceneHarness();
  tapBurst(scene as never, 0, 0, 'primary');
  expect(liveParticles(scene as never)).toBe(1); expect(h.eases[0]!.ms).toBe(c.ringFadeMs);
  const target = { x: 50, y: 0, alpha: 1, scaleX: 1, scaleY: 1, setAlpha() { return target; }, setScale() { return target; }, setPosition() { return target; } };
  const badge = { tint: 0, setTint(v: number) { badge.tint = v; }, clearTint() { badge.tint = -1; } };
  denied(scene as never, target as never, badge);
  expect(target.x).toBe(50); expect(badge.tint).toBeGreaterThan(0);
  h.eases.at(-1)!.step(1); expect(badge.tint).toBe(-1);
});
it('D3-R24 denied shakes the target around its rest x and returns to it', () => {
  const { scene } = sceneHarness();
  const target = { x: 50, y: 0, alpha: 1, scaleX: 1, scaleY: 1, setAlpha() { return target; }, setScale() { return target; }, setPosition() { return target; } };
  denied(scene as never, target as never);
  const e = h.eases.at(-1)!; expect(e.ms).toBe(c.shakeMs);
  e.step(1 / (4 * c.shakeCycles)); expect(target.x).not.toBe(50);
  e.step(1); expect(target.x).toBe(50);
});
```

(If `MotionTarget` in `motionCore.ts` requires other members than the ones on `target`, add them to the literal; do not change `MotionTarget`.)

- [ ] **Step 6: Run and see it fail**

Run: `npx vitest run tests/game/touchFx.test.ts --configLoader native --pool threads --maxWorkers 2`
Expected: FAIL (`liveParticles` is not exported; bodies are empty).

- [ ] **Step 7: Implement**

`src/game/motion/motion.ts`: export `motionCfgFor(scene)` returning the same `MotionBalance` object that `motionFor` passes to `createMotion` as `cfg` (extract the lookup `motionFor` already does into this function and call it from `motionFor`). Re-export it from `src/game/motion/index.ts` next to `motionFor`.

```ts
// src/game/ui/touchFx.ts
// D3-R23/R24/R28 pooled tap burst (ring + sparks) and denied shake. Thin Phaser layer over interactionModel.
import type Phaser from 'phaser';
import { motionCfgFor, motionFor, type MotionTarget } from '../motion';
import { reduceMotion } from '../render/palette';
import { TOKENS, toInt } from '../uiTokens';
import { burstKind, deniedPlan, ringAt, shakeDx, sparkAt, tapPlan } from './interactionModel';
import { ui } from './layout';
import type { SkinTone } from './skin';

const RING_R = 22, RING_W = 4, SPARK_R = 4, FX_DEPTH = 1000; // mock px; depth above every menu and HUD layer
interface Pool { free: Phaser.GameObjects.Arc[]; live: number }
const pools = new WeakMap<Phaser.Scene, Pool>();
function poolOf(scene: Phaser.Scene): Pool {
  let p = pools.get(scene);
  if (!p) { p = { free: [], live: 0 }; pools.set(scene, p); }
  return p;
}
function take(scene: Phaser.Scene, p: Pool, x: number, y: number): Phaser.GameObjects.Arc {
  const o = p.free.pop() ?? scene.add.circle(0, 0, ui(SPARK_R), 0xffffff).setDepth(FX_DEPTH);
  p.live++;
  return o.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
}
function give(p: Pool, o: Phaser.GameObjects.Arc): void { o.setVisible(false); p.free.push(o); p.live--; }
/** Live burst objects in a scene (test and audit hook). */
export const liveParticles = (scene: Phaser.Scene): number => pools.get(scene)?.live ?? 0;

/** D3-R23 ring (and sparks for primary and skill tones) at x,y in the tone's middle face colour. */
export function tapBurst(scene: Phaser.Scene, x: number, y: number, tone: SkinTone): void {
  const c = motionCfgFor(scene).d3, p = poolOf(scene);
  const plan = tapPlan(burstKind(tone), reduceMotion(), p.live, c);
  const color = toInt(TOKENS.d3.tone[tone].face[1]!);
  const ring = take(scene, p, x, y).setRadius(ui(RING_R)).setFillStyle(color, 0).setStrokeStyle(ui(RING_W), color, 1);
  const sparks = Array.from({ length: plan.sparks }, () => take(scene, p, x, y).setRadius(ui(SPARK_R)).setFillStyle(color, 1).setStrokeStyle(0, 0, 0));
  motionFor(scene).ease({ v: 0 }, 1, plan.ringMs, (t) => {
    const r = ringAt(t, c); ring.setScale(r.scale).setAlpha(r.alpha);
    sparks.forEach((s, i) => { const k = sparkAt(i, sparks.length, t, c); s.setPosition(x + ui(1) * k.dx, y + ui(1) * k.dy).setAlpha(k.alpha).setScale(k.scale); });
    if (t >= 1) { give(p, ring); for (const s of sparks) give(p, s); }
  });
}

/** D3-R24 refused tap: shake the visual around its rest x and flash the badge in the danger colour. */
export function denied(scene: Phaser.Scene, visual: MotionTarget, badge?: { setTint(c: number): unknown; clearTint(): unknown }): void {
  const c = motionCfgFor(scene).d3, plan = deniedPlan(reduceMotion()), restX = visual.x;
  if (plan.badgeFlash) badge?.setTint(toInt(TOKENS.d3.tone.danger.face[1]!));
  motionFor(scene).ease({ v: 0 }, 1, plan.shake ? c.shakeMs : c.badgeFlashMs, (t) => {
    if (plan.shake) visual.x = restX + ui(1) * shakeDx(t, c);
    if (t >= 1) { visual.x = restX; badge?.clearTint(); }
  });
}
```

Add to `tests/support/scene.ts` if missing: `scene.add.circle(...)` returning a `DrawObject` with chainable `setRadius`, `setFillStyle`, `setStrokeStyle`. If `Motion.ease` reports progress in another form than a 0..1 value passed to `onUpdate`, read `motionCore.ts` `ease` and adapt the two callbacks (the tests drive `step(v)` with `v` in 0..1).

- [ ] **Step 8: Run tests, typecheck**

Run: `npx vitest run tests/game/touchFx.test.ts tests/game/interactionModel.test.ts tests/game/widgetsSkin.test.ts --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 9: Screenshot check and commit**

`node tools/qa/shot.mjs size:360,640 media:light "go:http://localhost:5173/?debug=1" wait:3500 tap:325,40 wait:90 shot:tmp/qa/u1-burst.png`
Expected: a ring is visible around the Settings button in the frame taken 90 ms after the tap (headless runs slowly; if the ring is already gone, use `wait:40`).

```bash
git add -A
git commit -m "feat(ui): tap burst and denied shake with reduced-motion rules (D3-R23, R24, R28)"
```

---

### Task 7: Docs, full verification, merge

**Files:**
- Modify: `docs/CODEMAP.md`, `docs/STATUS.md`, `docs/PLAYTEST.md`, `CHANGELOG.md`

- [ ] **Step 1: Maps**

`docs/CODEMAP.md`: add rows for `src/game/ui/skin/` (skinSpec, skinPaint, skinTextures; D3-R5; tests `skinSpec.test.ts`, `skinTextures.test.ts`) and `src/game/ui/interactionModel.ts` + `touchFx.ts` (D3-R23, R24, R28; tests `interactionModel.test.ts`, `touchFx.test.ts`); update the `src/game/` row: widgets are skin images, one light theme.

- [ ] **Step 2: Full verification**

Run: `npm test`
Expected: all tests pass.
Run: `npm run typecheck`
Expected: no errors.
Run the game in a normal browser (`npm run dev`), play one run to a death and open Settings: no console errors, every button shows the pressed face on touch-down and a ring on tap.

- [ ] **Step 3: Screenshot record**

Capture Home, in-run, Pause, Results and Settings at 360x640, 390x844 and 412x915 into `tmp/qa/u1/` and add a `docs/PLAYTEST.md` entry: date, branch, what was captured, defects seen (layout is expected to be the old one; only widget faces changed).

- [ ] **Step 4: Merge**

```bash
git add -A
git commit -m "docs(ui): U1 codemap, playtest record, status"
git checkout version/v0.3 && git merge --no-ff feat/ui-d3-u1-skin-kit
node .gitnexus/run.cjs analyze --index-only --workers 2
```

(Run the last command in the background; do not wait for it.)
