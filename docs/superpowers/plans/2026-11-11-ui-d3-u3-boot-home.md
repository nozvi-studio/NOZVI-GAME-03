# UI D3 U3 Boot and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Gate:** do not start Task 1 until `docs/DECISIONS.md` has the "D3 boards approved" entry from the owner (roadmap U0 gate). If the owner changes the Home or Boot board, update the numbers in Task 4 / Task 7 first.

**Goal:** Boot and Home are rebuilt in the D3 "Juicy" language: ray-fan background, two-line outlined logo, snake hero, PLAY with an attention sweep, all actions in the lower 45%, at every canvas height 960..1200.

**Architecture:** Four pure, Phaser-free modules carry all numbers and geometry (`backgroundSpec.ts`, `logoSpec` in `menuLayout.ts`, `heroSpec.ts`, `homeRects` in `menuLayout.ts`, `sweepModel.ts`); thin Phaser drawers (`background.ts`, `d3Logo`, `snakeHero`) paint them once per scene create. Home positions interpolate between the 360x640 board and the 390x844 board (scaled to 360 wide) by the canvas height in mock px.

**Tech Stack:** Phaser 3.90, TypeScript strict, Vite, Vitest (Windows: `npx vitest run --configLoader native --pool threads --maxWorkers 1 <path>`).

**Spec:** `docs/superpowers/specs/2026-11-10-ui-d3-juicy-design.md` §6 (D3-R7, R8), §7 (D3-R10, R11), §7b (D3-R21 attention, R28). Roadmap `docs/superpowers/plans/2026-11-10-ui-d3-roadmap.md` "U3". Boards: `docs/design/mockups/d3/boards.html` sections `Boot`, `Home` (`home()`, `logo()`, `hero()` functions) and `png/Home-360.png`, `Home-390.png`, `Boot-360.png`.

## Global Constraints
- Branch `feat/ui-d3-u3-boot-home` from `version/v0.3`; merge back `--no-ff` after `npm test` and `npm run typecheck` pass (sequentially).
- No change to `src/core/` rules, `src/meta/`, the save format or gameplay numbers. New motion numbers go under `balance.motion.d3` (type + validator in `src/core/balance.ts`).
- No hex literals outside `src/game/uiTokens.ts` (plus the two render files). No magic numbers: mock-px tables live in `src/game/ui/menuMetrics.ts`, timings in `balance.motion`.
- Mock px = CSS px at 360 wide; canvas px = `ui(mock)` (`UI_SCALE = 1.5`). Canvas height in mock px: `HEIGHT / UI_SCALE` (640..800). Read `HEIGHT` only inside functions (guard test `heightGuard.test.ts`).
- D3-R8: every tappable target >= 48 mock px in both axes; PLAY, Start-at row and link buttons have their top at >= 55% of the height.
- D3-R28: no gloss sweep under reduced motion or `?motion=off`.
- Static UI is drawn once per create; nothing is redrawn per frame except the sweep band position and the existing capy breath.
- Requirement ID in each test name and in a one-line comment at the implementing function. Each commit adds a CHANGELOG `[Unreleased]` line.
- Loadout and Results keep `bgCream`, `hill`, `logoLine` until U5/U6; do not delete them.

## Lead rulings (board gaps; listed for the owner in STATUS)
- **H1 Start-at row:** the board shows "Start at L10" under PLAY. It is a butter (`secondary`) chip, not a button: PLAY already starts at the selected checkpoint. With 2+ checkpoints, round light ◀ ▶ buttons (48) sit left and right of the chip and keep the MEC-008-R4 clamp (`stepCheckpoint`). No rule change.
- **H2 Loadout entry:** "Pick 2 skills" / "Pick 1 skill" light button, shown only when `homeModel().showLoadout`; it opens Loadout exactly like PLAY does today. PLAY flow unchanged.
- **H3 Milestone hint (MEC-008-R11):** shown as a butter chip in the Start-at slot when there is no checkpoint (that slot is empty then). With a checkpoint the Home hint is not shown (no room on the board; Results shows "Next checkpoint").
- **H4 Carried energy:** small light chip "Start energy N" at the bottom-right corner of the hero.
- **H5 Best chip:** shown only when `bestScore > 0`.
- **H6 Boot:** board has no hero disc: logo, bar and loading text only; the capy head is no longer drawn on Boot.

## File structure
| Path | Action | Responsibility |
|---|---|---|
| `src/game/uiTokens.ts` | modify | `TOKENS.d3.bg` gains `rayCenterY`, `rx`, `ry`, `midStop` |
| `src/game/ui/backgroundSpec.ts` | create | pure gradient + ray wedge spec, `bgKey` |
| `src/game/ui/background.ts` | create | `screenBackground(scene, biome)`: cached canvas texture, band colour |
| `src/game/ui/menuMetrics.ts` | modify | `D3_HOME`, `D3_BOOT`, `D3_LOGO`, `D3_HERO` tables; drop `MENU.boot`, `MENU.home.hero/trail/...` once unused |
| `src/game/ui/menuLayout.ts` | modify | `logoSpec`, `homeRects`, `bootRects`; remove `homeColumn`, `bootColumn` |
| `src/game/ui/heroSpec.ts` | create | pure hero geometry (body samples, head, mango, shadow) |
| `src/game/ui/menuWidgets.ts` | modify | `d3Logo`, `snakeHero`, `butterChip` |
| `src/game/flow/homeModel.ts` | modify | `homeExtras(best, showLoadout, slotCount)` |
| `src/game/flow/sweepModel.ts` | create | pure sweep timing |
| `src/game/flow/entranceOrder.ts` | modify | `HOME_ORDER` adds `best`, `links` |
| `src/game/scenes/HomeScene.ts`, `BootScene.ts` | modify | D3 screens |
| `src/game/text.ts` | modify | `home.best`, `home.playBig`, `home.loadoutOne`, `home.loadoutTwo` |
| `src/core/balance.ts`, `config/balance.json` | modify | `motion.d3.sweepBand`, `sweepAlpha` |
| tests | create/modify | `backgroundSpec.test.ts`, `heroSpec.test.ts`, `sweepModel.test.ts`, `menuLayout.test.ts`, `homeModel.test.ts`, `entranceOrder.test.ts` |

---

### Task 1: Screen background (D3-R10/R11 background, D3-R7 band)

**Files:**
- Modify: `src/game/uiTokens.ts` (`TOKENS.d3.bg`)
- Create: `src/game/ui/backgroundSpec.ts`, `src/game/ui/background.ts`
- Test: `tests/game/backgroundSpec.test.ts`

**Interfaces:**
- Produces: `bgSpec(biome: number, w: number, h: number): BgSpec`, `bgKey(biome, w, h): string`, `paintBackground(ctx: BgCtx, s: BgSpec): void`, `screenBackground(scene: Phaser.Scene, biome: number): Phaser.GameObjects.Image`.

- [ ] **Step 1: Tokens.** In `TOKENS.d3.bg` add (values from `d3.css` `.a` and `.a .rays`):

```ts
bg: { stops: ['#7FD8FF', '#3FB2F2', '#1F86D8'], centerY: 0.38, rayAlpha: 0.13, rayDeg: 9,
  rayCenterY: 0.46, rx: 1.2, ry: 0.7, midStop: 0.45 },
```

- [ ] **Step 2: Failing test** `tests/game/backgroundSpec.test.ts`:

```ts
import { expect, it } from 'vitest';
import { bgKey, bgSpec, paintBackground, type BgCtx } from '../../src/game/ui/backgroundSpec';
import { TOKENS } from '../../src/game/uiTokens';

it('D3-R10 bgSpec uses the biome stops, ellipse radii and centres from TOKENS.d3.bg', () => {
  const s = bgSpec(2, 540, 1170), b = TOKENS.d3.bg;
  expect(s.stops).toEqual([[0, TOKENS.d3.biomes[1]!.bg[0]], [b.midStop, TOKENS.d3.biomes[1]!.bg[1]], [1, TOKENS.d3.biomes[1]!.bg[2]]]);
  expect(s.cx).toBe(270); expect(s.cy).toBeCloseTo(1170 * b.centerY);
  expect(s.rx).toBeCloseTo(540 * b.rx); expect(s.ry).toBeCloseTo(1170 * b.ry);
  expect(s.rayCy).toBeCloseTo(1170 * b.rayCenterY);
  expect(s.outer).toBe(TOKENS.d3.biomes[1]!.bg[2]);
});
it('D3-R10 ray fan: 20 wedges of rayDeg every 2*rayDeg, first wedge starts at 12 o\'clock', () => {
  const s = bgSpec(1, 540, 960);
  expect(s.wedges.length).toBe(360 / (2 * TOKENS.d3.bg.rayDeg));
  expect(s.wedges[0]!.a0).toBeCloseTo(-Math.PI / 2);
  expect(s.wedges[0]!.a1 - s.wedges[0]!.a0).toBeCloseTo(TOKENS.d3.bg.rayDeg * Math.PI / 180);
  expect(s.rayR).toBeGreaterThanOrEqual(Math.hypot(540, 960));
});
it('D3-R10 biome is clamped to 1..6', () => {
  expect(bgSpec(0, 540, 960).outer).toBe(TOKENS.d3.biomes[0]!.bg[2]);
  expect(bgSpec(9, 540, 960).outer).toBe(TOKENS.d3.biomes[5]!.bg[2]);
});
it('D3-R10 bgKey has biome and integer size', () => {
  expect(bgKey(3, 540, 1169.6)).toBe('d3/bg/3/540x1170');
});
it('D3-R10 paintBackground fills the gradient once and one path per wedge', () => {
  const fills: unknown[] = [];
  const ctx: BgCtx = { fillStyle: '', save() {}, restore() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, arc() {}, closePath() {},
    fill() { fills.push(ctx.fillStyle); }, fillRect() { fills.push(ctx.fillStyle); },
    createRadialGradient: () => ({ addColorStop() {} }) };
  const s = bgSpec(1, 540, 960);
  paintBackground(ctx, s);
  expect(fills.length).toBe(1 + s.wedges.length);
});
```

- [ ] **Step 3: Run** `npx vitest run --configLoader native --pool threads --maxWorkers 1 tests/game/backgroundSpec.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement** `src/game/ui/backgroundSpec.ts`:

```ts
// D3-R10/R11 screen background: elliptical radial gradient plus a white ray fan (d3.css `.a`, `.a .rays`). Pure, no Phaser.
import { TOKENS } from '../uiTokens';

export interface BgSpec {
  stops: [number, string][]; cx: number; cy: number; rx: number; ry: number;
  rayCx: number; rayCy: number; rayR: number; rayColor: string; wedges: { a0: number; a1: number }[];
  w: number; h: number; outer: string;
}
export interface BgCtx {
  fillStyle: unknown;
  save(): void; restore(): void; translate(x: number, y: number): void; scale(x: number, y: number): void;
  beginPath(): void; moveTo(x: number, y: number): void; arc(x: number, y: number, r: number, a0: number, a1: number): void;
  closePath(): void; fill(): void; fillRect(x: number, y: number, w: number, h: number): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(o: number, c: string): void };
}
const DEG = Math.PI / 180;
const clampBiome = (b: number): number => Math.min(TOKENS.d3.biomes.length, Math.max(1, Math.round(b)));
export const bgKey = (biome: number, w: number, h: number): string => `d3/bg/${clampBiome(biome)}/${Math.ceil(w)}x${Math.ceil(h)}`;

// D3-R10 one spec per biome and canvas size.
export function bgSpec(biome: number, w: number, h: number): BgSpec {
  const b = TOKENS.d3.bg, [c0, c1, c2] = TOKENS.d3.biomes[clampBiome(biome) - 1]!.bg;
  const n = Math.round(360 / (2 * b.rayDeg)), wedges: BgSpec['wedges'] = [];
  for (let k = 0; k < n; k++) { const a0 = (k * 2 * b.rayDeg - 90) * DEG; wedges.push({ a0, a1: a0 + b.rayDeg * DEG }); }
  return { stops: [[0, c0], [b.midStop, c1], [1, c2]], cx: w / 2, cy: h * b.centerY, rx: w * b.rx, ry: h * b.ry,
    rayCx: w / 2, rayCy: h * b.rayCenterY, rayR: Math.hypot(w, h), rayColor: `rgba(255,255,255,${b.rayAlpha})`, wedges, w, h, outer: c2 };
}

// D3-R10 paint: gradient in a y-squashed space (CSS ellipse), then one filled wedge per ray.
export function paintBackground(ctx: BgCtx, s: BgSpec): void {
  const k = s.ry / s.rx;
  ctx.save(); ctx.translate(s.cx, s.cy); ctx.scale(1, k);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx);
  for (const [o, c] of s.stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(-s.cx, -s.cy / k, s.w, s.h / k);
  ctx.restore();
  ctx.fillStyle = s.rayColor;
  for (const wd of s.wedges) {
    ctx.beginPath(); ctx.moveTo(s.rayCx, s.rayCy); ctx.arc(s.rayCx, s.rayCy, s.rayR, wd.a0, wd.a1); ctx.closePath(); ctx.fill();
  }
}
```

Note: `rgba(...)` is not a hex literal; the alpha comes from tokens.

- [ ] **Step 5: Implement** `src/game/ui/background.ts`:

```ts
// D3-R10/R11 screen background image: one canvas texture per biome and canvas size, kept for the game's life.
import type Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../layout';
import { setBandColor } from '../viewport';
import { toInt } from '../uiTokens';
import { bgKey, bgSpec, paintBackground, type BgCtx } from './backgroundSpec';

export function screenBackground(scene: Phaser.Scene, biome: number): Phaser.GameObjects.Image {
  const key = bgKey(biome, WIDTH, HEIGHT), s = bgSpec(biome, WIDTH, HEIGHT);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, Math.ceil(WIDTH), Math.ceil(HEIGHT));
    if (!tex) throw new Error(`background: cannot create ${key}`);
    paintBackground(tex.getContext() as unknown as BgCtx, s);
    tex.refresh();
  }
  scene.cameras.main.setBackgroundColor(toInt(s.outer));
  setBandColor(s.outer);
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
}
```

- [ ] **Step 6: Run** the test → PASS. `npm run typecheck` → clean.
- [ ] **Step 7: Commit** (CHANGELOG line: "D3 screen background (gradient + ray fan), cached per biome and height"):

```bash
git add src/game/uiTokens.ts src/game/ui/backgroundSpec.ts src/game/ui/background.ts tests/game/backgroundSpec.test.ts CHANGELOG.md
git commit -m "feat(ui): D3 screen background with ray fan (D3-R10)"
```

### Task 2: Two-line logo (D3-R11)

**Files:**
- Modify: `src/game/ui/menuMetrics.ts` (add `D3_LOGO`), `src/game/ui/menuLayout.ts` (add `logoSpec`), `src/game/ui/menuWidgets.ts` (add `d3Logo`)
- Test: `tests/game/menuLayout.test.ts`

**Interfaces:**
- Produces: `logoSpec(scale: number): LogoSpec`; `d3Logo(scene, cx: number, top: number, scale: number): { mango: Phaser.GameObjects.Container; snake: Phaser.GameObjects.Container }` (cx/top in canvas px, scale relative to the 360x150 mock viewBox).

- [ ] **Step 1: Metrics** in `menuMetrics.ts` (numbers from boards.html `logo()`):

```ts
/** D3-R11 logo, 360x150 mock viewBox at scale 1 (boards.html logo()). capMid = cap-height centre / font size (Lilita caps). */
/** textTop/textBottom = inked box of both lines incl. strokes and drop (viewBox units); layout rects use it so the logo does not collide with the header chips or the hero. */
export const D3_LOGO = { w: 360, h: 150, font: 70, base: [64, 130], drop: 6, stroke: 5, backStroke: 16, capMid: 0.35, textTop: 8, textBottom: 144 } as const;
```

- [ ] **Step 2: Failing test** (append to `menuLayout.test.ts`; import `logoSpec`):

```ts
it('D3-R11 logoSpec: MANGO yellow with mango line, SNAKE white with ink line, ink drop under both', () => {
  const s = logoSpec(0.92);
  expect(s.lines.map(l => l.key)).toEqual(['logo.mango', 'logo.snake']);
  expect(s.lines[0]).toMatchObject({ fill: TOKENS.d3.logo.mango, stroke: TOKENS.d3.logo.mangoLine });
  expect(s.lines[1]).toMatchObject({ fill: TOKENS.d3.white, stroke: TOKENS.d3.ink });
  for (const l of s.lines) { expect(l.back).toBe(TOKENS.d3.inkDeep); expect(l.backY - l.y).toBeCloseTo(6 * 0.92); }
  expect(s.fontPx).toBeCloseTo(70 * 0.92); expect(s.h).toBeCloseTo(150 * 0.92);
  expect(s.lines[0]!.y).toBeCloseTo((64 - 0.35 * 70) * 0.92); // centre of the caps, mock px from the logo top
});
```

(Add `import { TOKENS } from '../../src/game/uiTokens';` if missing.)

- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** in `menuLayout.ts`:

```ts
export interface LogoLine { key: 'logo.mango' | 'logo.snake'; y: number; backY: number; fill: string; stroke: string; strokePx: number; back: string; backStrokePx: number }
export interface LogoSpec { w: number; h: number; fontPx: number; lines: LogoLine[] }
// D3-R11 two-line logo in mock px from the logo top; y values are cap centres (text origin 0.5, 0.5).
export function logoSpec(scale: number): LogoSpec {
  const L = D3_LOGO, d = TOKENS.d3, mid = L.capMid * L.font;
  const line = (key: LogoLine['key'], base: number, fill: string, stroke: string): LogoLine => ({
    key, y: (base - mid) * scale, backY: (base - mid + L.drop) * scale, fill, stroke, strokePx: L.stroke * scale, back: d.inkDeep, backStrokePx: L.backStroke * scale });
  return { w: L.w * scale, h: L.h * scale, fontPx: L.font * scale,
    lines: [line('logo.mango', L.base[0], d.logo.mango, d.logo.mangoLine), line('logo.snake', L.base[1], d.white, d.ink)] };
}
```

and in `menuWidgets.ts`:

```ts
// D3-R11 logo: per line, an ink back text (thick stroke, dropped) under the coloured front text.
export function d3Logo(scene: Phaser.Scene, cx: number, top: number, scale: number): { mango: Phaser.GameObjects.Container; snake: Phaser.GameObjects.Container } {
  const s = logoSpec(scale);
  const make = (l: LogoLine): Phaser.GameObjects.Container => {
    const st = (fill: string, stroke: string, px: number): Phaser.Types.GameObjects.Text.TextStyle =>
      ({ fontFamily: FONT_TITLE, fontSize: `${ui(s.fontPx)}px`, color: fill, stroke, strokeThickness: ui(px) });
    const back = scene.add.text(0, ui(l.backY - l.y), t(l.key), st(l.back, l.back, l.backStrokePx)).setOrigin(0.5);
    const front = scene.add.text(0, 0, t(l.key), st(l.fill, l.stroke, l.strokePx)).setOrigin(0.5);
    return scene.add.container(cx, top + ui(l.y), [back, front]);
  };
  return { mango: make(s.lines[0]!), snake: make(s.lines[1]!) };
}
```

(Import `FONT_TITLE` from `../uiTokens`, `t` from `../text`, `logoSpec`, `LogoLine` from `./menuLayout`.)

- [ ] **Step 5: Run** test → PASS; typecheck clean.
- [ ] **Step 6: Commit** `feat(ui): D3 two-line outlined logo (D3-R11)` with CHANGELOG line.

### Task 3: Snake hero (D3-R11)

**Files:**
- Modify: `src/game/ui/menuMetrics.ts` (add `D3_HERO`)
- Create: `src/game/ui/heroSpec.ts`; modify `src/game/ui/menuWidgets.ts` (add `snakeHero`)
- Test: `tests/game/heroSpec.test.ts`

**Interfaces:**
- Produces: `heroBody(step: number): Pt[]`, `heroHighlight(step: number): Pt[]` (viewBox units 360x240); `snakeHero(scene, cx: number, top: number, wMock: number): { c: Phaser.GameObjects.Container; head: Phaser.GameObjects.Image }`.

- [ ] **Step 1: Metrics** (from boards.html `hero()`; body path `M40 196c40 0 50-40 90-40s40 40 80 40 40-70 0-90` expanded to absolute cubics):

```ts
/** D3-R11 snake hero in a 360x240 viewBox (boards.html hero()). Cubic segments are [p0, c1, c2, p1]. */
export const D3_HERO = {
  w: 360, h: 240, step: 3,
  body: [[[40, 196], [80, 196], [90, 156], [130, 156]], [[130, 156], [170, 156], [170, 196], [210, 196]], [[210, 196], [250, 196], [250, 126], [210, 106]]],
  highlight: [[[44, 184], [80, 182], [92, 144], [130, 144]]],
  outlineW: 56, bodyW: 46, hiW: 8, hiAlpha: 0.45,
  shadow: { x: 180, y: 222, rx: 130, ry: 14, alpha: 0.25 },
  head: { x: 206, y: 92, w: 144 },
  mango: { x: 74, y: 70, size: 64, rx: 0.44, ry: 0.4, line: 0.06, haloR: 0.6, haloAlpha: 0.35, leaf: { dx: 0.12, dy: -0.42, w: 0.3, h: 0.14 } },
} as const;
```

- [ ] **Step 2: Failing test** `tests/game/heroSpec.test.ts`:

```ts
import { expect, it } from 'vitest';
import { heroBody, heroHighlight } from '../../src/game/ui/heroSpec';

it('D3-R11 heroBody keeps the path ends and samples at most `step` apart', () => {
  const p = heroBody(3);
  expect(p[0]).toEqual({ x: 40, y: 196 });
  expect(p[p.length - 1]).toEqual({ x: 210, y: 106 });
  for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y)).toBeLessThanOrEqual(3.01);
});
it('D3-R11 heroBody stays inside the control box of the path', () => {
  for (const q of heroBody(3)) { expect(q.x).toBeGreaterThanOrEqual(40); expect(q.x).toBeLessThanOrEqual(250); expect(q.y).toBeGreaterThanOrEqual(106); expect(q.y).toBeLessThanOrEqual(196); }
});
it('D3-R11 heroHighlight runs along the first body segment', () => {
  const h = heroHighlight(3);
  expect(h[0]).toEqual({ x: 44, y: 184 }); expect(h[h.length - 1]).toEqual({ x: 130, y: 144 });
});
```

- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** `src/game/ui/heroSpec.ts`:

```ts
// D3-R11 Home hero geometry in the 360x240 board viewBox. Pure, no Phaser.
import { D3_HERO } from './menuMetrics';
import type { Pt } from './menuLayout';

type Seg = readonly (readonly [number, number])[];
const bez = (s: Seg, u: number): Pt => {
  const [a, b, c, d] = s as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
  const v = 1 - u, k0 = v * v * v, k1 = 3 * v * v * u, k2 = 3 * v * u * u, k3 = u * u * u;
  return { x: k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0], y: k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1] };
};
// Samples each cubic densely, then keeps points no more than `step` apart (ends exact).
function sample(segs: readonly Seg[], step: number): Pt[] {
  const out: Pt[] = [{ x: segs[0]![0]![0], y: segs[0]![0]![1] }];
  for (const s of segs) {
    const n = 64;
    for (let i = 1; i <= n; i++) {
      const q = bez(s, i / n), last = out[out.length - 1]!;
      const d = Math.hypot(q.x - last.x, q.y - last.y);
      if (d >= step) { const m = Math.ceil(d / step); for (let j = 1; j <= m; j++) out.push({ x: last.x + (q.x - last.x) * j / m, y: last.y + (q.y - last.y) * j / m }); }
    }
  }
  const end = segs[segs.length - 1]![3]!, last = out[out.length - 1]!;
  if (last.x !== end[0] || last.y !== end[1]) out.push({ x: end[0], y: end[1] });
  return out;
}
export const heroBody = (step: number): Pt[] => sample(D3_HERO.body, step);
export const heroHighlight = (step: number): Pt[] => sample(D3_HERO.highlight, step);
```

(The interpolation between dense samples keeps spacing <= step; the final push is at most one dense-sample gap away, which is < step for n = 64.)

- [ ] **Step 5: Run** → PASS.
- [ ] **Step 6: Drawer** `snakeHero` in `menuWidgets.ts` (drawn once; head is a separate image for the breath):

```ts
// D3-R11 hero on the ray fan: ground shadow, outlined body with highlight, mango with halo, current skin head.
export function snakeHero(scene: Phaser.Scene, cx: number, top: number, wMock: number): { c: Phaser.GameObjects.Container; head: Phaser.GameObjects.Image } {
  const H = D3_HERO, k = ui(wMock) / H.w, x0 = cx - ui(wMock) / 2, at = (x: number, y: number) => ({ x: x0 + x * k, y: top + y * k });
  const d = TOKENS.d3, g = scene.add.graphics();
  const sh = at(H.shadow.x, H.shadow.y);
  g.fillStyle(toInt(d.inkDeep), H.shadow.alpha).fillEllipse(sh.x, sh.y, 2 * H.shadow.rx * k, 2 * H.shadow.ry * k);
  const body = heroBody(H.step);
  for (const [col, w] of [[d.outline.snake, H.outlineW], [d.snake.body, H.bodyW]] as const) {
    g.fillStyle(toInt(col)); for (const p of body) { const q = at(p.x, p.y); g.fillCircle(q.x, q.y, w * k / 2); }
  }
  g.fillStyle(toInt(d.white), H.hiAlpha); for (const p of heroHighlight(H.step)) { const q = at(p.x, p.y); g.fillCircle(q.x, q.y, H.hiW * k / 2); }
  const M = H.mango, mc = at(M.x, M.y), s = M.size * k;
  g.fillStyle(toInt(d.white), M.haloAlpha).fillCircle(mc.x, mc.y, M.haloR * s);
  g.fillStyle(toInt(d.outline.mango)).fillEllipse(mc.x, mc.y, 2 * (M.rx + M.line) * s, 2 * (M.ry + M.line) * s);
  g.fillStyle(toInt(d.tone.mango.face[1])).fillEllipse(mc.x, mc.y, 2 * M.rx * s, 2 * M.ry * s);
  g.fillStyle(toInt(d.tone.primary.line)).fillEllipse(mc.x + M.leaf.dx * s, mc.y + M.leaf.dy * s, M.leaf.w * s, M.leaf.h * s);
  const hc = at(H.head.x, H.head.y);
  const head = scene.add.image(hc.x, hc.y, headKey(activeSkin(), 'idle', 'large')).setDisplaySize(H.head.w * k, H.head.w * k);
  return { c: scene.add.container(0, 0, [g, head]), head };
}
```

(Imports: `headKey` from `../art/capyRig`, `activeSkin` from `../art/skins`, `heroBody`, `heroHighlight` from `./heroSpec`, `D3_HERO` from `./menuMetrics`.)

- [ ] **Step 7: Typecheck**, commit `feat(ui): D3 Home snake hero (D3-R11)` with CHANGELOG line.

### Task 4: Home layout rects (D3-R11, D3-R8, D3-R7)

**Files:**
- Modify: `src/game/ui/menuMetrics.ts` (add `D3_HOME`), `src/game/ui/menuLayout.ts` (add `homeRects`, `Rect`)
- Test: `tests/game/menuLayout.test.ts` (replace the P3b3-R3 Home tests and the U2 Home tests at 960/1170)

**Interfaces:**
- Produces: `homeRects(hm: number, f: HomeFlags): HomeRects` where `HomeFlags = { start: boolean; stepper: boolean; l1: boolean; loadout: boolean; hint: boolean }`, `Rect = { x: number; y: number; w: number; h: number }` (mock px), `HomeRects = { best: Rect; settings: Rect; logo: Rect & { scale: number }; hero: Rect; play: Rect; start?: Rect; prev?: Rect; next?: Rect; hint?: Rect; l1?: Rect; loadout?: Rect }`.

- [ ] **Step 1: Metrics.** Short = board 360x640; tall = board 390x844 multiplied by 360/390 (mock height 779 = canvas 1169 / 1.5):

```ts
/** D3-R11 Home anchors (mock px, 360 wide). `short` = Home 360x640 board, `tall` = Home 390x844 board scaled by 360/390. */
export const D3_HOME = {
  short: { h: 640, chip: 14, logo: 52, hero: 186, heroW: 318, play: 408, start: 512, links: 574, linkSide: 22, linkW: 152 },
  tall: { h: 779, chip: 48, logo: 103, hero: 258, heroW: 343, play: 517, start: 617, links: 679, linkSide: 28, linkW: 146 },
  side: 14, round: 48, bestH: 40, bestW: 132, bestDy: 2, logoScale: 0.92, heroAspect: 2 / 3,
  playX: 40, playH: 84, startX: 70, startH: 48, arrow: 48, arrowGap: 6, linkH: 48, linkFont: 15, hintX: 40, hintH: 36,
  carryInset: 8,
} as const;
```

- [ ] **Step 2: Failing tests** (replace the old `homeColumn` tests; keep the others):

```ts
const FLAGS = [false, true].flatMap(start => [false, true].flatMap(stepper => [false, true].flatMap(l1 => [false, true].flatMap(loadout =>
  [false, true].map(hint => ({ start, stepper: start && stepper, l1: start && l1, loadout, hint }))))));
const HM = [640, 700, 779, 800];
const all = (r: HomeRects) => Object.entries(r).filter(([, v]) => v) as [string, Rect][];
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

it('D3-R11 D3-R7 every Home rect sits inside the canvas at heights 640..800 mock px', () => {
  for (const hm of HM) for (const f of FLAGS) for (const [k, r] of all(homeRects(hm, f))) {
    expect(r.x, `${hm} ${k}`).toBeGreaterThanOrEqual(0); expect(r.x + r.w, `${hm} ${k}`).toBeLessThanOrEqual(360);
    expect(r.y, `${hm} ${k}`).toBeGreaterThanOrEqual(0); expect(r.y + r.h, `${hm} ${k}`).toBeLessThanOrEqual(hm);
  }
});
it('D3-R11 Home rects never overlap', () => {
  for (const hm of HM) for (const f of FLAGS) {
    const rs = all(homeRects(hm, f));
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++)
      expect(overlap(rs[i]![1], rs[j]![1]), `${hm} ${rs[i]![0]}/${rs[j]![0]}`).toBe(false);
  }
});
it('D3-R8 tappable Home targets are >= 48 mock px and actions start in the lower 45%', () => {
  for (const hm of HM) for (const f of FLAGS) {
    const r = homeRects(hm, f);
    for (const k of ['settings', 'play', 'prev', 'next', 'l1', 'loadout'] as const) {
      const x = r[k]; if (!x) continue;
      expect(x.w, k).toBeGreaterThanOrEqual(48); expect(x.h, k).toBeGreaterThanOrEqual(48);
    }
    for (const k of ['play', 'start', 'prev', 'next', 'l1', 'loadout'] as const) { const x = r[k]; if (x) expect(x.y, `${hm} ${k}`).toBeGreaterThanOrEqual(0.55 * hm); }
  }
});
it('D3-R11 board anchors: PLAY 280x84 at y 408 on 640, y 517 on 779; Start chip only with a checkpoint', () => {
  const f = { start: true, stepper: false, l1: true, loadout: true, hint: false };
  expect(homeRects(640, f).play).toEqual({ x: 40, y: 408, w: 280, h: 84 });
  expect(homeRects(779, f).play.y).toBeCloseTo(517);
  expect(homeRects(640, { ...f, start: false, l1: false }).start).toBeUndefined();
});
it('D3-R11 H3 the milestone hint uses the Start slot only when there is no checkpoint', () => {
  const base = { stepper: false, l1: false, loadout: false, hint: true };
  expect(homeRects(640, { ...base, start: false }).hint).toBeDefined();
  expect(homeRects(640, { ...base, start: true }).hint).toBeUndefined();
});
it('D3-R11 H2 a single link button is centred; two links sit left and right', () => {
  const one = homeRects(640, { start: false, stepper: false, l1: false, loadout: true, hint: false }).loadout!;
  expect(one.x + one.w / 2).toBeCloseTo(180);
  const two = homeRects(640, { start: true, stepper: false, l1: true, loadout: true, hint: false });
  expect(two.l1!.x).toBe(22); expect(two.loadout!.x + two.loadout!.w).toBe(338);
});
```

(Import `homeRects`, `type HomeRects`, `type Rect` from `menuLayout`.)

- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** in `menuLayout.ts` (delete `homeColumn`; `HomeScene` stops using it in Task 5):

```ts
export interface Rect { x: number; y: number; w: number; h: number }
export interface HomeFlags { start: boolean; stepper: boolean; l1: boolean; loadout: boolean; hint: boolean }
export interface HomeRects {
  best: Rect; settings: Rect; logo: Rect & { scale: number }; hero: Rect; play: Rect;
  start?: Rect; prev?: Rect; next?: Rect; hint?: Rect; l1?: Rect; loadout?: Rect;
}
// D3-R11/R7 Home rects in mock px for a canvas `hm` mock px tall: anchors interpolate (and extrapolate up to 800) between the two boards.
export function homeRects(hm: number, f: HomeFlags): HomeRects {
  const D = D3_HOME, s = D.short, l = D.tall, u = (hm - s.h) / (l.h - s.h);
  const at = (k: keyof typeof s): number => s[k] + (l[k] - s[k]) * u;
  const W = 360, heroW = at('heroW');
  const r: HomeRects = {
    best: { x: D.side, y: at('chip') + D.bestDy, w: D.bestW, h: D.bestH },
    settings: { x: W - D.side - D.round, y: at('chip'), w: D.round, h: D.round },
    // inked text box only (D3_LOGO.textTop..textBottom); the logo viewBox top is y - textTop * scale
    logo: { x: (W - D3_LOGO.w * D.logoScale) / 2, y: at('logo') + D3_LOGO.textTop * D.logoScale, w: D3_LOGO.w * D.logoScale,
      h: (D3_LOGO.textBottom - D3_LOGO.textTop) * D.logoScale, scale: D.logoScale },
    hero: { x: (W - heroW) / 2, y: at('hero'), w: heroW, h: heroW * D.heroAspect },
    play: { x: D.playX, y: at('play'), w: W - 2 * D.playX, h: D.playH },
  };
  const sy = at('start');
  if (f.start) {
    r.start = { x: D.startX, y: sy, w: W - 2 * D.startX, h: D.startH };
    if (f.stepper) {
      r.prev = { x: D.startX - D.arrowGap - D.arrow, y: sy, w: D.arrow, h: D.arrow };
      r.next = { x: W - D.startX + D.arrowGap, y: sy, w: D.arrow, h: D.arrow };
    }
  } else if (f.hint) r.hint = { x: D.hintX, y: sy + (D.startH - D.hintH) / 2, w: W - 2 * D.hintX, h: D.hintH };
  const ly = at('links'), side = at('linkSide'), lw = at('linkW');
  if (f.l1 && f.loadout) { r.l1 = { x: side, y: ly, w: lw, h: D.linkH }; r.loadout = { x: W - side - lw, y: ly, w: lw, h: D.linkH }; }
  else if (f.l1) r.l1 = { x: (W - lw) / 2, y: ly, w: lw, h: D.linkH };
  else if (f.loadout) r.loadout = { x: (W - lw) / 2, y: ly, w: lw, h: D.linkH };
  return r;
}
```

Checked by hand at 640: Best bottom 56 < logo text top 59.4; logo text bottom 184.5 < hero 186; hero bottom 398 < PLAY 408; PLAY bottom 492 < Start 512; Start bottom 560 < links 574; links bottom 622 <= 640. At 779 and 800 every gap grows. If the owner changes a board number, re-run the overlap test.

- [ ] **Step 5: Run** the menuLayout tests → PASS (delete the old Home `homeColumn` tests, including the U2 960/1170 Home cases; keep Loadout/Settings/Results ones).
- [ ] **Step 6: Commit** `feat(ui): D3 Home layout rects at every canvas height (D3-R11, D3-R8)` with CHANGELOG line.

### Task 5: Home scene on D3 (D3-R11)

**Files:**
- Modify: `src/game/scenes/HomeScene.ts`, `src/game/flow/homeModel.ts`, `src/game/flow/entranceOrder.ts`, `src/game/text.ts`, `src/game/ui/menuWidgets.ts` (add `butterChip`)
- Test: `tests/game/homeModel.test.ts`, `tests/game/entranceOrder.test.ts`

**Interfaces:**
- Consumes: Task 1 `screenBackground`, Task 2 `d3Logo`, Task 3 `snakeHero`, Task 4 `homeRects`.
- Produces: `homeExtras(bestScore: number, showLoadout: boolean, slotCount: 1 | 2): { best: number | null; loadoutKey: 'home.loadoutOne' | 'home.loadoutTwo' | null }`; `HOME_ORDER` ids `['gear', 'best', 'logo1', 'logo2', 'hero', 'stepper', 'play', 'hint', 'links']`; `HomeScene.playBtn` stays the PLAY container (Task 6 uses it).

- [ ] **Step 1: Failing tests.** `homeModel.test.ts`:

```ts
it('D3-R11 H5 H2 homeExtras: Best only above 0, loadout label by slot count, none without loadout', () => {
  expect(homeExtras(0, false, 1)).toEqual({ best: null, loadoutKey: null });
  expect(homeExtras(1240, true, 2)).toEqual({ best: 1240, loadoutKey: 'home.loadoutTwo' });
  expect(homeExtras(5, true, 1).loadoutKey).toBe('home.loadoutOne');
});
```

`entranceOrder.test.ts`: change the HOME_ORDER expectation to `['gear', 'best', 'logo1', 'logo2', 'hero', 'stepper', 'play', 'hint', 'links']`, `HOME_ORDER[1]` → `{ motion: 'pop' }`, `HOME_ORDER[2]` → slide up, `HOME_ORDER[6]` → slide down.

- [ ] **Step 2: Run** both → FAIL.
- [ ] **Step 3: Implement.**
  - `homeModel.ts`:

```ts
// D3-R11 Home extras: Best chip only once a score exists (H5); Loadout entry label when the Loadout is offered (H2).
export function homeExtras(bestScore: number, showLoadout: boolean, slotCount: 1 | 2): { best: number | null; loadoutKey: 'home.loadoutOne' | 'home.loadoutTwo' | null } {
  return { best: bestScore > 0 ? bestScore : null, loadoutKey: showLoadout ? (slotCount === 1 ? 'home.loadoutOne' : 'home.loadoutTwo') : null };
}
```

  - `entranceOrder.ts`: `export const HOME_ORDER: EntranceStep[] = [pop('gear'), pop('best'), slide('logo1', 'up'), slide('logo2', 'up'), pop('hero'), slide('stepper', 'down'), slide('play', 'down'), slide('hint', 'down'), slide('links', 'down')];` and update the doc comment (no hill).
  - `text.ts`: add `'home.best': 'Best {n}', 'home.playBig': 'PLAY', 'home.loadoutOne': 'Pick 1 skill', 'home.loadoutTwo': 'Pick 2 skills'` next to the other `home.*` keys (provisional strings; listed for the owner batch).
  - `menuWidgets.ts` `butterChip` (static secondary chip with optional icon, used by Start-at and the hint):

```ts
// D3-R11 butter (secondary tone) chip of a fixed mock size, optional leading icon; static, not tappable.
export function butterChip(scene: Phaser.Scene, cx: number, cy: number, wMock: number, hMock: number, text: string, fontMock: number, icon?: IconId): Phaser.GameObjects.Container {
  const w = ui(wMock), h = ui(hMock), tone = TOKENS.d3.tone.secondary, lip = lipPx('chip', 'secondary', ui(1));
  const host = hostOf(scene), key = (st: SkinState) => skinTexture(host, 'chip', 'secondary', w, h, st, ui(1));
  const tx = scene.add.text(0, 0, text, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${ui(fontMock)}px`, color: tone.text }).setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [scene.add.image(0, lip, key('lip')), scene.add.image(0, 0, key('rest')), tx];
  if (icon) {
    const ico = ui(fontMock * 1.2), gap = ui(6), total = ico + gap + tx.width;
    const g = scene.add.graphics().setPosition(-total / 2 + ico / 2, 0); drawIcon(g, icon, ico, toInt(tone.text));
    tx.setX(-total / 2 + ico + gap + tx.width / 2); parts.push(g);
  }
  return scene.add.container(cx, cy, parts).setSize(w, h);
}
```

  (The `1.2` icon ratio and `6` gap: put them in `D3_HOME` as `chipIconRatio: 1.2, chipIconGap: 6` and use those names.)
  - `HomeScene.ts` rewrite of `create()` / `build()` (keep `update`, `setupDebug`, `showLogText`, `play`, `step`):
    1. `create()`: replace `bgCream(this)` with `screenBackground(this, 1)`. Compute `const hm = HEIGHT / UI_SCALE`. Build `flags` from `homeView` + `homeExtras(this.session.save().bestScore, model.showLoadout, this.session.loadoutModel().slotCount)`: `{ start: v.startAt !== null, stepper: v.showStepper, l1: v.secondaryL1, loadout: ex.loadoutKey !== null, hint: v.hint !== null }`. `const R = homeRects(hm, flags)`; helper `const px = (r: Rect) => ({ cx: ui(r.x + r.w / 2), cy: ui(r.y + r.h / 2), w: r.w, h: r.h })`.
    2. Settings: `roundIconButton(this, px(R.settings).cx, px(R.settings).cy, D3_HOME.round, 'sliders', 'home-settings', …)` (same action as today). Best (if `ex.best !== null`): `chip(this, …, t('home.best', { n: ex.best }), '', 'home-best')` positioned at `R.best` left edge: `x = ui(R.best.x) + chip.width / 2`; `targets.best`.
    3. Logo: `const lg = d3Logo(this, WIDTH / 2, ui(R.logo.y - D3_LOGO.textTop * R.logo.scale), R.logo.scale)`; `targets.logo1 = lg.mango; targets.logo2 = lg.snake`.
    4. Remove `hill(...)`, `scaledBlock`, `layoutColumn(homeColumn(...))`, `heroPanel`, `chipRow`, `measure`, `HERO_KEY` and the `MENU.home` hero/trail drawing.
    5. `build()` (still rebuilt on stepper taps; destroy `this.body` first, stop the pulse first as today): `this.body = this.add.container(0, 0)`. Hero: `const hero = snakeHero(this, WIDTH / 2, ui(R.hero.y), R.hero.w)`; `this.capy = hero.head; this.capyRest = …`; carry chip (H4) if `v.carry !== null`: `chip(this, 0, 0, t('home.startEnergy', { e: v.carry }), '')`, placed so its right/bottom edge is `D3_HOME.carryInset` mock px inside the hero rect; add both to body; `t_.hero = hero.c`.
    6. PLAY: `pillButton(this, px(R.play).cx, px(R.play).cy, R.play.w, R.play.h, t('home.playBig'), 'home-primary', () => this.play(this.homeView().primary.level), 'green', { navigates: true })`. Delete the old in-button "Start at" chip and `bigLabel` call (the pill already uses the outlined big label for the primary tone). `t_.play = play.c; this.playBtn = play.c; this.playGeom = { w: play.w, h: play.h }` (for Task 6).
    7. Start row (H1) if `R.start`: `butterChip(this, …R.start, t('home.startAt', { level: v.startAt }), D3_HOME.linkFont, 'flag')`; if `R.prev`/`R.next`: `roundIconButton` with icons `'back'` / a right arrow (use `pillButton(…, t('home.prev'), 'home-prev', () => this.step(-1), 'cream')` at 48x48 if no right-arrow icon exists — check `IconId` in `ui/icons.ts`); `t_.stepper = [chip, prev, next]`; keep the MOT-2-R6 `popIn` of the chip when `this.entered`.
    8. Hint (H3) if `R.hint`: `butterChip(this, …R.hint, t(v.hint.key, { level: v.hint.level }), D3_HOME.linkFont, 'flag')`; `t_.hint`.
    9. Links: `l1` → `pillButton(this, …, R.l1.w, R.l1.h, t('home.startL1'), 'home-l1', () => this.play(1), 'cream', { navigates: true })`; `loadout` → `pillButton(…, t(ex.loadoutKey), 'home-loadout', () => this.play(this.homeView().primary.level), 'cream', { navigates: true })`. Check `PILL_SKIN` in `ui/pillTones.ts`: use the tone that maps to the D3 `light` skin (rename nothing; if none maps to `light`, add `light: 'light'` to `PillTone`/`PILL_SKIN`). `t_.links = [...]`.
    10. All objects of steps 5..9 go into `this.body`.
  - Remove now-unused imports and the unused `MENU.home` keys (`hero`, `trail*`, `shadeR`, `bodyR`, `hi*`, `mango`, `capy`, `stepper*`, `playH*`, `play`, `chips`, `l1`, `hint*`, `hillPeek`) from `menuMetrics.ts`; grep tests for each key first (`menuTokens.test.ts`) and drop assertions that only pinned removed D2 numbers. Remove `l1Link` only if nothing else imports it.
- [ ] **Step 4: Run** `homeModel`, `entranceOrder`, `menuLayout`, `homeIdle`, `navGuard`, `heightGuard`, `menuText` tests → PASS; `npm run typecheck` → clean.
- [ ] **Step 5: Quick look** (lead): `npm run dev`, `node tools/qa/shot.mjs` Home at 360x640 and 390x844 into `tmp/qa/u3/` (usage in `docs/PLAYTEST.md` "How to capture"); compare with `png/Home-360.png`, `Home-390.png`. Fix obvious misplacements before committing.
- [ ] **Step 6: Commit** `feat(ui): Home on D3 - background, logo, hero, PLAY, start row, links (D3-R11)` with CHANGELOG line.

### Task 6: PLAY attention sweep (D3-R21 attention, D3-R28)

**Files:**
- Modify: `config/balance.json` (`motion.d3.sweepBand`, `sweepAlpha`), `src/core/balance.ts` (`MotionD3Balance` + validator row at line ~284)
- Create: `src/game/flow/sweepModel.ts`
- Modify: `src/game/scenes/HomeScene.ts`
- Test: `tests/game/sweepModel.test.ts`

**Interfaces:**
- Produces: `sweepCycle(time: number, t0: number, periodMs: number): number`, `sweepX(elapsed: number, sweepMs: number, w: number, band: number): number | null`, `sweepAllowed(reduced: boolean, motionOff: boolean): boolean`.

- [ ] **Step 1: Balance.** In `motion.d3` add `"sweepBand": 0.18, "sweepAlpha": 0.45`. In `MotionD3Balance` add `sweepBand: number; sweepAlpha: number;` and in the d3 validator row add `sweepBand: 'prob', sweepAlpha: 'prob'`.
- [ ] **Step 2: Failing test** `tests/game/sweepModel.test.ts`:

```ts
import { expect, it } from 'vitest';
import { sweepAllowed, sweepCycle, sweepX } from '../../src/game/flow/sweepModel';

it('D3-R21 one sweep per pulse period: the cycle index steps every periodMs from t0', () => {
  expect(sweepCycle(1000, 1000, 900)).toBe(0); expect(sweepCycle(1899, 1000, 900)).toBe(0); expect(sweepCycle(1900, 1000, 900)).toBe(1);
});
it('D3-R21 the band crosses the face left to right in sweepMs, then hides', () => {
  expect(sweepX(0, 420, 280, 50)).toBeCloseTo(-140 - 50);
  expect(sweepX(420, 420, 280, 50)).toBeCloseTo(140 + 50);
  expect(sweepX(210, 420, 280, 50)).toBeCloseTo(0);
  expect(sweepX(421, 420, 280, 50)).toBeNull(); expect(sweepX(-1, 420, 280, 50)).toBeNull();
});
it('D3-R28 no sweep under reduced motion or motion=off', () => {
  expect(sweepAllowed(false, false)).toBe(true); expect(sweepAllowed(true, false)).toBe(false); expect(sweepAllowed(false, true)).toBe(false);
});
```

- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** `src/game/flow/sweepModel.ts`:

```ts
// D3-R21 attention: one gloss sweep per MOT-2 pulse period; D3-R28 none under reduced motion. Pure.
export const sweepCycle = (time: number, t0: number, periodMs: number): number => Math.floor((time - t0) / periodMs);
export function sweepX(elapsed: number, sweepMs: number, w: number, band: number): number | null {
  if (elapsed < 0 || elapsed > sweepMs) return null;
  const from = -w / 2 - band, to = w / 2 + band;
  return from + (to - from) * (elapsed / sweepMs);
}
export const sweepAllowed = (reduced: boolean, motionOff: boolean): boolean => !reduced && !motionOff;
```

- [ ] **Step 5: Run** → PASS.
- [ ] **Step 6: Wire in HomeScene.** Fields: `private sweep?: { band: Phaser.GameObjects.Graphics; maskG: Phaser.GameObjects.Graphics; t0: number; cycle: number; start: number }`.
  - When the pulse starts in `update()` (`this.stopPulse = motionFor(this).pulse(this.playBtn)`), and `sweepAllowed(reduceMotion(), isMotionOff(location.search))`, create the sweep once per PLAY instance: `band` = graphics with a parallelogram of width `w * cfg.d3.sweepBand`, height `h`, skew `h / 2`, white at `cfg.d3.sweepAlpha`, added to `this.playBtn` (container child, so it moves with the dip); `maskG` = `this.make.graphics({}, false)` with `fillRoundedRect` of the face at the PLAY world rect (`playBtn.x - w/2`, `playBtn.y - h/2`, `w`, `h`, radius `ui(TOKENS.d3.shape.radiusBig)`), `band.setMask(maskG.createGeometryMask())`; `t0 = time, cycle = -1`.
  - Each `update()` while the pulse runs: `const c = sweepCycle(time, s.t0, cfg.pulsePeriodMs); if (c !== s.cycle) { s.cycle = c; s.start = time; }`, then `const x = sweepX(time - s.start, cfg.d3.sweepMs, w, w * cfg.d3.sweepBand); band.setVisible(x !== null); if (x !== null) band.setX(x);`.
  - When the pulse stops (`stopPulse` branch) and in `build()` before destroying the body: `band.setVisible(false)`; destroy `band` and `maskG` in `build()` and on `shutdown` (`this.events.once('shutdown', …)`), and set `this.sweep = undefined`.
  - The entrance has ended before the pulse starts (MOT-2-R8), so the PLAY world rect is final when the mask is built.
- [ ] **Step 7:** typecheck; run `sweepModel`, `homeIdle`, `balance` tests → PASS.
- [ ] **Step 8: Commit** `feat(ui): PLAY gloss sweep once per attention pulse (D3-R21, D3-R28)` with CHANGELOG line.

### Task 7: Boot on D3 (D3-R10)

**Files:**
- Modify: `src/game/ui/menuMetrics.ts` (`D3_BOOT`; remove `MENU.boot`), `src/game/ui/menuLayout.ts` (`bootRects`; remove `bootColumn`), `src/game/scenes/BootScene.ts`
- Test: `tests/game/menuLayout.test.ts`

**Interfaces:**
- Produces: `bootRects(hm: number): { logo: Rect & { scale: number }; bar: Rect; text: Rect }`.

- [ ] **Step 1: Metrics** (Boot board: logo top 150 at scale 1, bar 60..300 at top 420 height 26, text top 456 size 15; spare height centres the group):

```ts
/** D3-R10 Boot board 360x640 (mock px); extra canvas height is split above and below the group. */
export const D3_BOOT = { h: 640, logoTop: 150, logoScale: 1, barX: 60, barY: 420, barH: 26, textY: 456, textH: 20, textFont: 15 } as const;
```

- [ ] **Step 2: Failing test** (replace the `bootColumn` expectation in "Loadout, Settings, Results and Boot fit"):

```ts
it('D3-R10 bootRects: board positions at 640, group centred on taller canvases, all inside', () => {
  const a = bootRects(640);
  expect(a.bar).toEqual({ x: 60, y: 420, w: 240, h: 26 });
  const b = bootRects(780);
  expect(b.bar.y - a.bar.y).toBeCloseTo(70); expect(b.logo.y - a.logo.y).toBeCloseTo(70);
  for (const hm of [640, 779, 800]) { const r = bootRects(hm); expect(r.text.y + r.text.h).toBeLessThanOrEqual(hm); }
});
```

- [ ] **Step 3: Run** → FAIL.
- [ ] **Step 4: Implement** `bootRects`:

```ts
// D3-R10 Boot rects (mock px): board positions shifted down by half the spare height.
export function bootRects(hm: number): { logo: Rect & { scale: number }; bar: Rect; text: Rect } {
  const B = D3_BOOT, off = Math.max(0, (hm - B.h) / 2);
  return {
    logo: { x: (360 - D3_LOGO.w * B.logoScale) / 2, y: B.logoTop + off, w: D3_LOGO.w * B.logoScale, h: D3_LOGO.h * B.logoScale, scale: B.logoScale }, // y = viewBox top
    bar: { x: B.barX, y: B.barY + off, w: 360 - 2 * B.barX, h: B.barH },
    text: { x: 0, y: B.textY + off, w: 360, h: B.textH },
  };
}
```

- [ ] **Step 5: BootScene.** In `buildView()`: `screenBackground(this, 1)` instead of `bgCream`; `const R = bootRects(HEIGHT / UI_SCALE)`; bar `progressBar(this, ui(R.bar.x), ui(R.bar.y), R.bar.w, R.bar.h, TOKENS.d3.tone.mango.face[0])`; text centred at `ui(R.text.y + R.text.h / 2)`, `color: TOKENS.d3.white`, `setShadow(0, ui(2), TOKENS.d3.inkDeep, 0, false, true)`, size `ui(D3_BOOT.textFont)`; `drawLogo` returns `d3Logo(this, cx, ui(R.logo.y), R.logo.scale)` and destroys both containers. Delete the hero disc, trail, mango, `hill`, `headSlot`, `heroCentre`, `drawHead` (H6), and the `scaledBlock`/`layoutColumn` use. Keep `preload`, the progress handler, fonts swap (UIFIX-R8) and `create()` logic unchanged except removing the `drawHead()` call.
- [ ] **Step 6:** Remove `bootColumn` and `MENU.boot` (grep `MENU.boot`, `bootColumn` in src/tests first; `bootView.test.ts` tests `bootView` only — keep it). Run `menuLayout`, `bootView`, `boot`, `bootFontSwap`, `heightGuard` tests → PASS; typecheck.
- [ ] **Step 7: Commit** `feat(ui): Boot on D3 - background, logo, mango bar (D3-R10)` with CHANGELOG line.

### Task 8: Screenshot pass, docs, merge

**Files:**
- Modify: `docs/PLAYTEST.md`, `docs/CODEMAP.md`, `docs/design/UI-MOCKUPS.md` (Home/Boot rows point at D3), `docs/STATUS.md`, `CHANGELOG.md`

- [ ] **Step 1: Full suite** `npm test` then `npm run typecheck` (sequential, no agy running). Both pass; record the pass count.
- [ ] **Step 2: Browser pass by agy** (skill `delegate-workers`, after the test run ends). Brief: "Black-box browser QA on http://localhost:5173/ at 360x640, 390x844, 412x915 (DPR 1), light and dark OS scheme. Use `tools/qa/shot.mjs` (usage in docs/PLAYTEST.md 'How to capture'). Capture Boot (first frame), Home fresh save (clear localStorage), Home with save from `?debug=1` run to L10 or a seeded save, into `tmp/qa/u3/<screen>-<WxH>-<scheme>.png`. Also capture Home with `?debug=1&motion=off`. Report per image: nothing cut off or overlapping, all buttons visible, page bands match the background edge colour, console errors. Tap PLAY once at 390x844 and report whether it navigates. Do not edit src/ or tests/." Tap coordinates from the canvas scale `min(vw/540, vh/HEIGHT)`.
- [ ] **Step 3: Lead review** of the images against `png/Home-360.png`, `Home-390.png`, `Boot-360.png`; defects → fix task (Claude subagent), re-capture the affected screens.
- [ ] **Step 4: Docs.** CODEMAP rows for `backgroundSpec.ts`, `background.ts`, `heroSpec.ts`, `sweepModel.ts`; UI-MOCKUPS Home/Boot now built; PLAYTEST entry (date, branch, sizes, defects, verdict, "owner: check PLAY sweep feel on a phone"); STATUS lists rulings H1..H6 for the owner batch.
- [ ] **Step 5: Final review** (Opus subagent, `requesting-code-review`) over `git diff version/v0.3...HEAD`; apply fixes, re-run full suite + typecheck.
- [ ] **Step 6: Merge**:

```bash
git checkout version/v0.3
git merge --no-ff feat/ui-d3-u3-boot-home -m "Merge branch 'feat/ui-d3-u3-boot-home' into version/v0.3"
npm test && npm run typecheck
node .gitnexus/run.cjs analyze --index-only --workers 2   # background
```
