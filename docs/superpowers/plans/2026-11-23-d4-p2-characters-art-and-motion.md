# D4-P2 Character Art & 3-Tier Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Every task follows superpowers:test-driven-development (red → green → commit).

**Goal:** Upgrade all 5 skins (`snake`, `ginger`, `pup`, `tuxedo`, `capy`) to flat "Duolingo Vector" cel-shaded SVG with zero DOM ID collisions, add a pure full-body hero generator with a seamless tapered Bezier body, and ship the reusable 3-tier motion system: live `HeroStage` micro-animations (Tier 1), spring UI helpers (Tier 2) and zero-dependency confetti (Tier 3). No live screen migrates in this phase (P3/P4 consume these modules). The stylebook gains a live `HeroStage` preview for all 5 skins.

**Architecture:** `src/game/art/capyRig.ts` drops the `<defs><linearGradient id="face">` and draws flat layers (base fill + crown highlight arc + lower cheek shade) with per-skin hue-shifted outlines; it exports a new `headLayersSvg(skin, e)` (the inner markup without `<svg>`) so the hero can embed the same head. `src/game/art/skins.ts` extends `SkinPalette` with cel-shading fields. A new pure `src/game/art/heroSvg.ts` (no Phaser, no DOM) builds a `220×150` hero: shadow, tapered S-curve ribbon body (`taperedRibbon()` pure geometry), and the head scaled from the 48-unit `ART` space onto a neck pivot. New Phaser-free DOM modules under `src/game/dom/`: `motionTokens.ts` (named timing constants), `heroStage.ts` (mount/blink/lookAt/react/destroy with an injectable clock), `animate.ts` (`staggerEnter`, `countUp`, `shakeDenied`), `confetti.ts` (`CelebrationFx` seam + SVG/WAAPI default) and `styles/motion.css` (spring curves, keyframes, `.reduced-motion` fallbacks). Phaser board textures keep using `headSvg`/`bodySvg` with unchanged keys.

**Tech Stack:** TypeScript strict, Phaser 3.90 (untouched here), Vite, Vitest, `happy-dom` (added in D4-P1). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-23-d4-p2-characters-art-and-motion.md` (rules `D4-P2-R1..R5`). Umbrella: `docs/superpowers/specs/2026-11-23-ui-d4-duolingo-design.md`. Foundation: `docs/superpowers/plans/2026-11-23-d4-p1-design-system-and-stylebook.md`.

## Global Constraints

- **Precondition:** D4-P1 is merged into `version/v0.3` and the owner approved the stylebook (P1 exit gate). `src/game/dom/`, `tokens.css`, `components.css`, `happy-dom` and `docs/design/mockups/d4/stylebook.html` must exist; if not, stop and report.
- Read `AGENTS.md` first. All repository text in English. Conventional Commits. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `feat/d4-p2-character-art`, created from `version/v0.3`. One commit per task. Merge back with `git merge --no-ff` after full tests + typecheck pass. No push.
- No new dependency. No Lottie/Rive (only the `CelebrationFx` seam).
- Public contracts stay: `SKIN_IDS`, `isSkinId`, `SKIN_BODY`, `SKIN_EFFECTS`, `activeSkin/setActiveSkin`, `EXPRESSIONS`, `CAPY_EXPRESSIONS`, `skinExpressions`, `deadFace`, `BODY_POSES`, `CAPY_SIZES`, `CAPY_BODY_SIZE`, `ART` anchors (pupil `cx` 14.4/33.6, `cy` 20.4; mouth `data-y` 37.6; capy nostrils/muzzle; face `stroke-width` 2), `headSvg`, `bodySvg`, `headKey`, `bodyKey`, `capy*` aliases, `svgDataUrl`. All existing `data-layer` / `data-part` / `data-eyes` / `data-mouth` hooks stay.
- `SKIN_BODY` (in-run board colours) is **not** changed in P2 — in-game harmonization is D4-P5.
- The `snake` outline stays `#2B3A8F`: it must equal the in-run snake body outline so the board head merges into the body (ART-003 comment in `skins.ts`). Only `capy`, `ginger`, `pup`, `tuxedo` get new warm hue-shifted outlines.
- Modules under `src/game/dom/` **never import `phaser`** (P1 guard test). `src/game/art/*.ts` touched here stay Phaser-free and DOM-free (they run under `node`).
- DOM tests declare `// @vitest-environment happy-dom` on line 1. Never change the global `environment: 'node'`.
- **Deterministic time:** every timer/animation module takes an injectable clock. No test may use real time or `vi.useFakeTimers()` against `requestAnimationFrame` (happy-dom's rAF is not driven by fake timers reliably). Use the `FakeClock` helper (Task 5) instead.
- Requirement IDs in test names (`D4-P2-R3 ...`) and a one-line comment at each main implementing function.
- No magic numbers in TS: timings, distances and counts live in `src/game/dom/motionTokens.ts` (`MOTION`) and geometry in `HERO` (`heroSvg.ts`) / `ART` (`capyRig.ts`). Colours: SVG art hex values live only in `skins.ts`/`ART`; DOM/CSS colours only via `var(--d4-…)` from `tokens.css`.
- All SVG output is pure ASCII and contains **no `id=` attribute and no `url(#`** (the zero-collision rule, `D4-P2-R1`).
- Commands (Windows, PowerShell):
  - Touched tests only: `npx vitest run <path> --configLoader native --pool threads --maxWorkers 2`
  - Before each commit: `npx vitest run --configLoader native --pool threads --maxWorkers 2` then `npm run typecheck`; both must pass (sequentially).
- Every commit adds a line under `## [Unreleased]` in `CHANGELOG.md`. New modules → `docs/CODEMAP.md` in the same commit.
- Do not touch `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/`.

## File Structure

| File | Responsibility |
|---|---|
| `src/game/art/skins.ts` | D4-P2-R1 extended `SkinPalette` (`crown`, `shade`, `innerEar`, `leaf`, `leafVein`), new warm outlines |
| `src/game/art/capyRig.ts` | D4-P2-R1 flat cel-shaded layers, no `<defs>`/ids, dual catchlights, skin details, capy leaf; exports `headLayersSvg` |
| `src/game/art/heroSvg.ts` (new) | D4-P2-R2 `HERO` geometry, `taperedRibbon()`, `heroSvg(skin, expression?)` |
| `src/game/dom/motionTokens.ts` (new) | D4-P2-R3..R5 named timings/distances/counts (`MOTION`) |
| `src/game/dom/clock.ts` (new) | `MotionClock` interface + `systemClock` (rAF, timeouts, `now`, `random`) |
| `src/game/dom/styles/motion.css` (new) | D4-P2-R3/R4 spring curves, keyframes, stagger, `.reduced-motion` overrides |
| `src/game/dom/heroStage.ts` (new) | D4-P2-R3 live hero: breathing, auto-blink, `lookAt`, `react`, `destroy` |
| `src/game/dom/animate.ts` (new) | D4-P2-R4 `staggerEnter`, `countUp`, `shakeDenied`, `isReducedMotion` |
| `src/game/dom/confetti.ts` (new) | D4-P2-R5 `CelebrationFx`, `svgConfettiFx`, `burstConfetti`, `setCelebrationFx` |
| `tests/game/skins.test.ts`, `tests/game/capyRig.test.ts` | updated contracts (new `CAPY_HASH`, outline, leaf) |
| `tests/game/artIds.test.ts` (new, `node`) | no ids / `url(#` / NaN across every skin × expression × pose + hero |
| `tests/game/heroSvg.test.ts` (new, `node`) | ribbon geometry + hero layers |
| `tests/game/dom/fakeClock.ts` (new, test helper) | deterministic `MotionClock` |
| `tests/game/dom/heroStage.test.ts`, `animate.test.ts`, `confetti.test.ts`, `motionCss.test.ts`, `artDom.test.ts` (new, `happy-dom` except `motionCss`) | Tier 1–3 behaviour, DOM id uniqueness |
| `docs/design/mockups/d4/stylebook.html`, `tests/game/dom/stylebook.test.ts` | live `HeroStage` section for 5 skins |
| `src/game/main.ts` | import `motion.css` |
| `docs/DECISIONS.md`, `docs/CODEMAP.md`, `docs/art/` (ART-003 doc if it lists palette values), `CHANGELOG.md`, `docs/STATUS.md` | records and maps |

---

### Task 1: Zero-ID guard and art sanity harness (red first)

**Files:**
- Test: `tests/game/artIds.test.ts` (new, `node`)

**Interfaces:** none yet (guard over existing `headSvg`/`bodySvg`; hero is added to the same test in Task 4).

- [ ] **Step 1: Write the failing test** `tests/game/artIds.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { BODY_POSES, bodySvg, headSvg, skinExpressions } from '../../src/game/art/capyRig';
import { SKIN_IDS } from '../../src/game/art/skins';

const allArt = (): Array<[string, string]> => SKIN_IDS.flatMap(s => [
  ...skinExpressions(s).map(e => [`${s} head ${e}`, headSvg(s, e)] as [string, string]),
  ...BODY_POSES.map(p => [`${s} body ${p}`, bodySvg(s, p)] as [string, string]),
]);

describe('D4-P2-R1 art id and number hygiene', () => {
  it('D4-P2-R1 no svg declares an id or references url(#...)', () => {
    for (const [name, svg] of allArt()) {
      expect(svg, name).not.toMatch(/\sid="/);
      expect(svg, name).not.toContain('url(#');
      expect(svg, name).not.toContain('<defs');
    }
  });
  it('D4-P2-R1 no NaN, undefined or Infinity leaks into any attribute', () => {
    for (const [name, svg] of allArt()) expect(svg, name).not.toMatch(/NaN|undefined|Infinity/);
  });
  it('D4-P2-R1 every svg is ASCII', () => {
    for (const [name, svg] of allArt()) expect(/^[\x00-\x7F]*$/.test(svg), name).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (current rig emits `<defs><linearGradient id="face">` and `url(#face)`):
  `npx vitest run tests/game/artIds.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Do not commit yet** — Task 2 turns it green in the same commit.

---

### Task 2: Flat cel-shaded rig with harmonized outlines (`D4-P2-R1`)

**Files:**
- Modify: `src/game/art/skins.ts`, `src/game/art/capyRig.ts`
- Test: `tests/game/artIds.test.ts` (Task 1), new cases in `tests/game/skins.test.ts`; update `tests/game/capyRig.test.ts`

**Interfaces:**
- `skins.ts`:
  ```ts
  export interface SkinPalette {
    outline: string; faceTop: string; faceBottom: string; ears: string; muzzle: string;
    pupil: string; nose: string; blush: string; highlight: string; tongue: string;
    // D4-P2-R1 flat cel shading
    crown: string;      // top-crown highlight arc (lighter than faceTop)
    shade: string;      // lower-cheek shade band (= old faceBottom family)
    innerEar: string;   // inner ear fill (cats, pup)
    leaf: string | null; leafVein: string | null; // capy (Rare) only
    stroke: number; innerStroke: number; featureStroke: number;
  }
  ```
  `faceTop` becomes the flat face base fill; `faceBottom` is kept (used for the body fill) so no consumer breaks.
- Proposed outlines (owner confirms in the stylebook; record final values in DECISIONS): `capy #7A4A26`, `ginger #A3541C`, `pup #8A5A30`, `tuxedo #2E3448`, `snake #2B3A8F` (unchanged). `crown`/`shade`/`innerEar` are chosen per skin as a lighter/darker step of the same hue; `leaf #58CC02` / `leafVein #46A302` for capy only (same values as `--d4-green-face/-lip`; SVG art cannot read CSS vars when rasterized by Phaser, so the hex lives in `skins.ts` and a test asserts it matches `tokens.css`).
- `capyRig.ts` additions to `ART` (geometry, no tuning): `crown: { y, rx, ry }` (arc above the eyes), `shade: { y, rx, ry }` (lower-cheek band, clipped by drawing it **inside** the face silhouette only — use an ellipse fully contained in the face rect so no clipPath id is needed), `glint2R` (secondary catchlight), `pupilR` raised from `3.2` to a larger value (e.g. `3.8`) — **anchors (`cx`, `cy`) do not move**, `leaf: { d, vein }` (tiny leaf on the capy head top-right, inside the 48 box).
- New export: `export function headLayersSvg(skin: SkinId, e: CapyExpression): string` — the inner head markup (what `headLayers` returns today, without `<svg>`). `headSvg` = `wrap('0 0 48 48', headLayersSvg(...))`.
- Rules:
  - Remove `<defs>` and every `url(#face)`: face `fill="${P.faceTop}"`; body ellipse `fill="${P.faceBottom}"`.
  - Head layer order (ART-001) stays: ears, head (face + `data-part="crown"` + `data-part="shade"` + skin marks), blush, muzzle, nose, eyes, (tongue), mouth; capy adds `<g data-layer="leaf"><path data-part="leaf" …/><path data-part="leaf-vein" …/></g>` after `ears` (drawn behind nothing important, above the head top).
  - `open` eyes: inside each eye emit pupil + **two** catchlights `data-part="glint"` (primary `glintR`, secondary `glint2R`). The pupil group must be translatable as one unit for `lookAt`: wrap as `<g data-part="pupil" data-cx=".." data-cy=".." cx=".." cy="..">` containing the pupil circle and both glints (keep the `cx`/`cy` attributes on the `data-part="pupil"` element so the existing anchor regex still reads `14.4/33.6` and `20.4`).
  - Inner ears: `ginger`/`tuxedo` triangles use `P.innerEar` (replace `ART.cat.inner`); `pup` flop ears get an inner `data-part="ear-inner"` path.
  - `ginger` stripes stay `data-part="stripe"` (clean rounded caps); `tuxedo` blaze stays `data-part="blaze"` and gets a matching chest blaze in `bodySvg`.
  - Snake keeps sclera, muzzle oval, gloss (`data-part="gloss"` stays, now flat, no opacity blur).

- [ ] **Step 1: Write failing tests** in `tests/game/skins.test.ts` (new `describe('D4-P2-R1 Duolingo vector rig')`):
  - `D4-P2-R1 open eyes have a pupil group with two catchlights for every skin` — `headSvg(skin,'idle')` contains 2 `data-part="pupil"` and 4 `data-part="glint"`.
  - `D4-P2-R1 outlines are warm hue-shifted, not the legacy harsh values` — `capy` ≠ `#4A2E1B`, `ginger` ≠ `#7A3E12`, `pup` ≠ `#6B4423`, `tuxedo` ≠ `#1B1F2A`; `snake` === `#2B3A8F`; for each skin the outline relative luminance is lower than `faceTop` (helper `lum(hex)` in the test).
  - `D4-P2-R1 every skin head has a crown highlight and a lower shade` (`data-part="crown"`, `data-part="shade"`).
  - `D4-P2-R1 signature details` — `ginger` and `tuxedo` inner ears use `SKIN_PALETTES[s].innerEar`; `pup` has `data-part="ear-inner"`; `ginger` has `stripe`; `tuxedo` has `blaze` in head and in `bodySvg('tuxedo','idle')`; only `capy` has `data-part="leaf"`, in every capy expression.
  - `D4-P2-R1 capy leaf colours match the D4 green tokens` — read `src/game/dom/styles/tokens.css`, parse `--d4-green-face`/`--d4-green-lip`, compare case-insensitively with `SKIN_PALETTES.capy.leaf/leafVein`.
  - `D4-P2-R1 headLayersSvg is headSvg without the svg wrapper`.
- [ ] **Step 2: Update legacy contracts in `tests/game/capyRig.test.ts`** (spec §2.1 "Test Contract Updates"):
  - `'ART-001 outline is dark brown …'` → rename `'ART-001 D4-P2-R1 outline is the warm capy outline, 2 on head and ears, 1.2 on the muzzle'`; replace `['#4A2E1B']` with `[SKIN_PALETTES.capy.outline]` and add `expect(SKIN_PALETTES.capy.outline).toBe('#7A4A26')` (the approved value) plus `not.toBe('#4A2E1B')`.
  - `'ART-001 no leaf, stem or text in any head'` → `'ART-001 D4-P2-R1 capy heads carry exactly one leaf accent and no text'`: for each capy expression expect `/<text/` absent, `data-part="leaf"` count `1`, and no `stem`.
  - Keep every anchor test unchanged (pupil/nostril/ear/muzzle/mouth). If `pupil` now matches an outer `<g>`, the `attr()` regex must still return exactly `['14.4','33.6']` — that is why `cx`/`cy` stay on the group element.
- [ ] **Step 3: Mark the old hash test as the expected failure:** `'ART-003 capy skin svg output is unchanged'` will fail; that is correct. It is re-baselined in Step 7.
- [ ] **Step 4: Run, expect FAIL:**
  `npx vitest run tests/game/artIds.test.ts tests/game/skins.test.ts tests/game/capyRig.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 5: Implement** `skins.ts` and `capyRig.ts`. Comments: `// D4-P2-R1 flat cel layers, no defs or ids (zero DOM collisions)` on `headLayersSvg`; `// D4-P2-R1 dual catchlights` in `eyes()`.
- [ ] **Step 6: Run, expect PASS except the hash test.**
- [ ] **Step 7: Re-baseline `CAPY_HASH`** (only after Step 6 is green and the art was eyeballed once via `ArtPreviewScene` or a quick HTML dump in `tmp/`):
  1. Create a throwaway `tests/game/_printCapyHashes.test.ts`:
     ```ts
     // @ts-ignore node typings are not installed; vitest runs on Node
     import { createHash } from 'node:crypto';
     import { it } from 'vitest';
     import { CAPY_EXPRESSIONS, bodySvg, headSvg } from '../../src/game/art/capyRig';
     const sha = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 12);
     it('print', () => {
       console.log(JSON.stringify(Object.fromEntries(CAPY_EXPRESSIONS.map(e => [e, sha(headSvg('capy', e))]))));
       console.log('idle', sha(bodySvg('capy', 'idle')), 'win', sha(bodySvg('capy', 'win')));
     });
     ```
  2. `npx vitest run tests/game/_printCapyHashes.test.ts --configLoader native --pool threads --maxWorkers 1`
  3. Paste the values into `CAPY_HASH` and the two `bodySvg` expectations in `tests/game/skins.test.ts`; change the comment to `// Hashes captured from the D4-P2 Duolingo vector capy output (2026-11-23).`; rename the test `'ART-003 D4-P2-R1 capy skin svg output matches the approved D4 baseline'`. Note: `determined` and `sleepy` share one hash (same eyes/mouth) — keep that equality.
  4. **Delete** `tests/game/_printCapyHashes.test.ts`. Re-run the three test files, expect PASS.
- [ ] **Step 8: Regressions:** `npx vitest run tests/game/charactersScene.test.ts tests/game/capyHead.test.ts tests/game/capyPose.test.ts --configLoader native --pool threads --maxWorkers 2` (skip names that do not exist — check with `Glob tests/game/capy*.test.ts`).
- [ ] **Step 9: Docs + commit.** DECISIONS (2026-11-23): "D4-P2: skin art drops SVG gradients/`<defs>` for flat cel layers so many skins can share one HTML document without id collisions; outlines hue-shifted per skin (`capy #7A4A26`, `ginger #A3541C`, `pup #8A5A30`, `tuxedo #2E3448`); snake keeps `#2B3A8F` to merge with the board body; `SKIN_BODY` untouched until D4-P5." If an ART-003 doc lists palette hex values, update it. CHANGELOG, full suite + typecheck, commit `feat(art): flat Duolingo vector rig with warm outlines and no svg ids (D4-P2-R1)`.

---

### Task 3: Tapered ribbon geometry (`D4-P2-R2`, pure)

**Files:**
- Create: `src/game/art/heroSvg.ts` (geometry part)
- Test: `tests/game/heroSvg.test.ts` (new, `node`)

**Interfaces:**
```ts
export interface Pt { x: number; y: number }
export interface CubicCurve { p0: Pt; c1: Pt; c2: Pt; p3: Pt }
// D4-P2-R2 hero layout in viewBox units (geometry, not tuning)
export const HERO = {
  viewBox: { w: 220, h: 150 },
  headScale: 1.6,                 // 48-unit ART head -> 76.8 hero units
  neck: { x: 70, y: 92 },         // pivot where the head joins the body
  headAnchor: { x: 24, y: 40 },   // ART-space point placed on the neck pivot (under the chin)
  spine: { p0: {x:70,y:96}, c1: {x:120,y:132}, c2: {x:150,y:70}, p3: {x:200,y:100} } as CubicCurve, // S-curve
  widthNeck: 36, widthTail: 16, samples: 24,
  belly: { ratio: 0.38 },         // belly stripe width / body width
  shadow: { cx: 120, cy: 138, rx: 86, ry: 8 },
} as const;
export function bezierPoint(c: CubicCurve, t: number): Pt;
export function bezierTangent(c: CubicCurve, t: number): Pt;      // normalized; falls back to (1,0) on zero length
export function taperedRibbon(c: CubicCurve, w0: number, w1: number, samples: number): { left: Pt[]; right: Pt[]; path: string };
```
`path` = left edge forward (`M`/`L` or smoothed `Q`), a rounded tail cap (`A` with radius `w1/2`), right edge backward, and a rounded neck cap, closed with `Z`. Width at `t` = `w0 + (w1 - w0) * t` (linear taper; the spec's `~36 → ~16`). Exact `HERO` numbers may be tuned visually in Task 4, but must stay named.

- [ ] **Step 1: Write failing tests** (`describe('D4-P2-R2 tapered ribbon')`):
  - `D4-P2-R2 bezierPoint hits both end points` (t=0 → p0, t=1 → p3).
  - `D4-P2-R2 ribbon width tapers monotonically from neck to tail` — distance `left[i]`↔`right[i]` ≈ `36` at `i=0`, ≈ `16` at last, non-increasing (tolerance `1e-6`).
  - `D4-P2-R2 ribbon edges never self-intersect` — test helper `segmentsIntersect(a,b,c,d)`; for each edge polyline no two non-adjacent segments intersect, and left/right polylines never cross each other.
  - `D4-P2-R2 ribbon path has no NaN and is closed` — `path` ends with `Z`, matches no `/NaN|Infinity/`.
  - `D4-P2-R2 degenerate tangent falls back safely` — a curve with `c1 = p0` still yields finite points.
  - `D4-P2-R2 every ribbon point stays inside the 220x150 viewBox`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/heroSvg.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** the geometry with `// D4-P2-R2 seamless tapered body` on `taperedRibbon`. Reuse `n()` number formatting (copy the 1-line helper or export it from `capyRig.ts` as `fmt`).
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP (`src/game/art/heroSvg.ts`), full suite + typecheck, commit** `feat(art): tapered Bezier ribbon geometry for the hero body (D4-P2-R2)`.

---

### Task 4: `heroSvg(skin, expression?)` (`D4-P2-R2`)

**Files:**
- Modify: `src/game/art/heroSvg.ts`
- Test: extend `tests/game/heroSvg.test.ts`, extend `tests/game/artIds.test.ts`

**Interfaces:**
```ts
export function heroSvg(skin: SkinId, expression: CapyExpression = 'idle'): string;
export function heroHeadTransform(): string; // "translate(tx ty) scale(s)" mapping ART space onto the neck pivot
```
Output structure (exact hooks; `[data-layer]` names are the HeroStage contract):
```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 150" data-skin="capy" data-hero="1">
  <g data-layer="shadow"><ellipse .../></g>
  <g data-layer="body" style="transform-origin: 70px 92px">  <!-- HERO.neck -->
    <path data-part="body" d="{ribbon}" fill="{faceBottom}" stroke="{outline}" stroke-width="{stroke*headScale}" stroke-linejoin="round"/>
    <path data-part="belly" d="{inner ribbon at belly.ratio}" fill="{muzzle}"/>
    {per-skin markings: ginger stripes across the spine, tuxedo chest blaze, pup back patch, capy leaf-free, snake scale dots}
  </g>
  <g data-layer="head" data-hero-head="1" style="transform-origin: 70px 92px">
    <g transform="{heroHeadTransform()}">{headLayersSvg(skin, expression)}</g>
  </g>
</svg>
```
- The head group is drawn **after** the body so the chin overlaps the neck cap — the ribbon's neck end sits under the head (no detached neck, no visible gap).
- Because `headLayersSvg` also contains an inner `data-layer="head"` (the face group), HeroStage must select the hero head with `[data-hero-head]`, and tests use the same selector. Document this in a comment.
- Markings use `P` colours only; stroke widths scaled by `HERO.headScale` so outlines look identical to the 48-unit head at the same display size (the "explicit scale mapping" in the spec).

- [ ] **Step 1: Write failing tests** (`describe('D4-P2-R2 hero svg')`, loop over `SKIN_IDS`):
  - `D4-P2-R2 ${skin} hero has viewBox 0 0 220 150 and shadow, body, head layers in that order` (index of each `data-layer` increasing).
  - `D4-P2-R2 ${skin} hero head embeds the same head markup as headLayersSvg` (`heroSvg(s,'win')` contains `headLayersSvg(s,'win')`).
  - `D4-P2-R2 head and body share the neck pivot as transform-origin`.
  - `D4-P2-R2 neck joint is covered by the head` — compute the ribbon neck cap centre and the head's face bounds mapped through `heroHeadTransform()` (parse the numbers); assert the neck cap centre lies inside the mapped face rect/oval bounds.
  - `D4-P2-R2 default expression is idle`.
  - Extend `artIds.test.ts`: add `heroSvg(s, e)` for every skin × `skinExpressions(s)` to `allArt()`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/heroSvg.test.ts tests/game/artIds.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** with `// D4-P2-R2 unified hero: shadow, tapered body, head on the neck pivot`.
- [ ] **Step 4: Run, expect PASS.** Eyeball once: write `heroSvg` of all 5 skins into `tmp/d4-p2/hero.html` (git-ignored) via a throwaway vitest file that writes with `node:fs`, open it in the browser; tune `HERO` numbers if needed (re-run tests). Delete the throwaway file.
- [ ] **Step 5: CHANGELOG, full suite + typecheck, commit** `feat(art): full-body hero svg for all skins (D4-P2-R2)`.

---

### Task 5: Motion tokens, clock seam and test clock

**Files:**
- Create: `src/game/dom/motionTokens.ts`, `src/game/dom/clock.ts`, `tests/game/dom/fakeClock.ts`
- Test: `tests/game/dom/clock.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
// motionTokens.ts — D4-P2-R3..R5 motion constants (single source; motion.css mirrors the CSS ones, guarded by a test)
export const MOTION = {
  breathMs: 2600,
  blinkMinMs: 3000, blinkMaxMs: 4500, blinkMs: 120,
  lookMax: 2.2,                                   // SVG units
  pokeMs: 600, celebrateMs: 800, deniedMs: 400, hurtMs: 900,
  pokeSquash: [[1.08, 0.92], [0.96, 1.04], [1, 1]] as const,
  staggerMs: 35, staggerRisePx: 12, enterMs: 320,
  shakeMs: 280, shakePx: [6, -6, 3, -3, 0] as const,
  confettiMin: 14, confettiMax: 18, confettiMs: 900, confettiSpreadPx: 120,
} as const;

// clock.ts
export interface MotionClock {
  now(): number;
  raf(cb: (t: number) => void): number; cancelRaf(id: number): void;
  setTimeout(cb: () => void, ms: number): number; clearTimeout(id: number): void;
  random(): number;                                // [0,1)
}
export const systemClock: MotionClock; // wraps window.performance.now / requestAnimationFrame / setTimeout / Math.random
```
`tests/game/dom/fakeClock.ts` (test helper, not a test file — name has no `.test.`):
```ts
export class FakeClock implements MotionClock {
  t = 0; seq = 0; rnd: () => number = () => 0.5;
  // pending timers and rAF callbacks keyed by id
  advance(ms: number): void;      // fires due timeouts in time order, then one rAF frame per 16 ms step
  frame(): void;                  // runs all queued rAF callbacks once with now()
  pending(): number;              // live timers + rAFs (used by destroy() tests)
}
```

- [ ] **Step 1: Write failing tests** `clock.test.ts`: `FakeClock` fires a timeout at exactly its due time; cancelled rAF never runs; `pending()` counts both kinds; `systemClock` methods exist and `systemClock.random()` is in `[0,1)`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/clock.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): motion tokens and injectable clock (D4-P2-R3..R5)`.

---

### Task 6: `motion.css` spring curves and keyframes (`D4-P2-R3`, `R4`)

**Files:**
- Create: `src/game/dom/styles/motion.css`
- Modify: `src/game/main.ts` (add `import './dom/styles/motion.css';` after `components.css`)
- Test: `tests/game/dom/motionCss.test.ts` (new, `node`, text-level); extend `tests/game/dom/indexHtml.test.ts` to expect `motion.css` in `main.ts`

**Interfaces (class/var contract):**
- `:root { --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); --ease-out-quart: cubic-bezier(0.22, 1, 0.36, 1); --breath-ms: 2600ms; --stagger-ms: 35ms; --stagger-rise: 12px; --enter-ms: 320ms; }`
- `@keyframes d4-breath-body` / `d4-breath-head` (same period, head adds ≤ 2° tilt around its `transform-origin`), applied by `.d4-hero.is-live [data-layer="body"]` and `.d4-hero.is-live [data-hero-head]` with `animation: … var(--breath-ms) ease-in-out infinite`. Both use the same timing so the neck never separates.
- `.d4-hero` (`display:block; width:100%; touch-action: manipulation; cursor: pointer`), `.d4-hero svg { overflow: visible }`.
- `.d4-enter` (`opacity:0; transform: translateY(var(--stagger-rise))`) → `.d4-enter.is-in` (`opacity:1; transform:none; transition: … var(--enter-ms) var(--ease-out-quart); transition-delay: var(--d4-delay, 0ms)`).
- `.d4-confetti-layer` (`position:absolute; inset:0; pointer-events:none; overflow:visible`).
- `.reduced-motion .d4-hero.is-live [data-layer]`, `.reduced-motion .d4-enter` → no animation, final state (`opacity:1; transform:none`). (P1 already kills animations globally under `.reduced-motion`; this file only ensures end states.)
- No hex colours in this file.

- [ ] **Step 1: Write failing tests** (`motionCss.test.ts`):
  - `D4-P2-R4 defines both spring curves exactly` (string match on the two `cubic-bezier` values).
  - `D4-P2-R3/R4 CSS timings mirror MOTION` — parse `--breath-ms`, `--stagger-ms`, `--stagger-rise`, `--enter-ms` and compare with `MOTION.breathMs`, `staggerMs`, `staggerRisePx`, `enterMs`.
  - `D4-P2-R3 head and body breathing share one duration variable`.
  - `D4-P2-R4 reduced-motion shows final state for .d4-enter`.
  - `D4-P2-R4 no hex colours` (after stripping `url(...)`).
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/motionCss.test.ts tests/game/dom/indexHtml.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement** (header `/* D4-P2-R3/R4 spring motion — timings mirror src/game/dom/motionTokens.ts */`).
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): D4 spring curves and hero breathing keyframes (D4-P2-R3, R4)`.

---

### Task 7: `HeroStage` — mount, auto-blink, destroy (`D4-P2-R3`)

**Files:**
- Create: `src/game/dom/heroStage.ts`
- Test: `tests/game/dom/heroStage.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
import type { SkinId } from '../art/skins';
import type { CapyExpression } from '../art/capyRig';
import type { MotionClock } from './clock';
export type HeroReaction = 'poke' | 'celebrate' | 'denied' | 'hurt';
export interface HeroStageOpts {
  skin: SkinId; expression?: CapyExpression;      // resting face, default 'idle'
  clock?: MotionClock;                             // default systemClock
  reduceMotion?: () => boolean;                    // default: container.closest('.reduced-motion') != null
  interactive?: boolean;                           // default true: pointerdown -> react('poke')
  label?: string;                                  // aria-label; default skin id
}
export interface HeroStage {
  readonly el: HTMLElement;                        // <div class="d4-hero is-live" data-qa="hero-<skin>" role="img">
  setSkin(skin: SkinId): void;
  setExpression(e: CapyExpression): void;          // new resting face
  lookAt(dx: number, dy: number): void;            // Task 8
  react(kind: HeroReaction): void;                 // Task 8
  destroy(): void;
}
export function createHeroStage(container: HTMLElement, opts: HeroStageOpts): HeroStage;
```
Rules (comment `// D4-P2-R3 live hero micro-animations` on `createHeroStage`):
- Renders `heroSvg(skin, expression)` into `el`, appends `el` to `container`. Re-rendering the face swaps only the inner head markup (`[data-hero-head] > g`) using `headLayersSvg`, so breathing animation on the outer groups does not restart.
- **Auto-blink:** schedule with `clock.setTimeout(blink, MOTION.blinkMinMs + clock.random() * (MOTION.blinkMaxMs - MOTION.blinkMinMs))`; `blink` renders the `blink` eye variant (`idle_blink` when resting `idle`; for other resting faces whose eyes are `open`, render the same mouth with blink eyes — add a tiny helper `withEyes(e, 'blink')` that maps to `idle_blink` or skips blinking when the resting eyes are not `open`) for `MOTION.blinkMs`, then restores and reschedules. No blink while a reaction is active. Under reduced motion: no breathing class (`is-live` removed) but blink still allowed? **No** — reduced motion disables blink too (spec: instant/no motion); `lookAt` still applies instantly.
- `destroy()` clears every timer/rAF it created, removes listeners, removes `el`; afterwards every method is a no-op (no throw).
- The `snake` poke face is `idle_tongue` (Task 8); store the skin so `setSkin` updates it.

- [ ] **Step 1: Write failing tests** (use `FakeClock`, `clock.rnd = () => 0` for 3000 ms, `() => 0.999` for ~4500 ms):
  - `D4-P2-R3 mounts the hero svg for each of the 5 skins with data-qa and role img`.
  - `D4-P2-R3 hero is live (breathing) unless reduced motion`.
  - `D4-P2-R3 auto-blink fires between 3.0 and 4.5 s and lasts 120 ms` — advance 2999 → `data-eyes="open"`; advance 1 → `data-eyes="blink"`; advance 120 → `open`; a new timer is pending.
  - `D4-P2-R3 blink interval uses the injected random` (rnd 0.999 → no blink at 4400 ms, blink by 4500 ms).
  - `D4-P2-R3 destroy clears all timers and removes the element` — `clock.pending()` is `0`, `container.children.length` is `0`, later `react`/`lookAt`/`setSkin` do not throw.
  - `D4-P2-R3 setSkin swaps the art and keeps one hero element`.
  - `D4-P2-R1 five heroes plus five head thumbnails in one document have no ids` — mount 5 `HeroStage`s and 5 `<img>`-free inline `headSvg` thumbnails into `document.body`; `document.querySelectorAll('[id]').length === 0` and no element attribute contains `url(#`. (This is the DOM-level collision proof; put it in `tests/game/dom/artDom.test.ts`.)
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/heroStage.test.ts tests/game/dom/artDom.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): HeroStage with breathing and auto-blink (D4-P2-R3)`.

---

### Task 8: `HeroStage` — `lookAt` and reactions (`D4-P2-R3`)

**Files:**
- Modify: `src/game/dom/heroStage.ts`
- Test: extend `tests/game/dom/heroStage.test.ts`

**Interfaces / rules:**
- `lookAt(dx, dy)`: target vector in any units; offset = normalized vector × `MOTION.lookMax × min(1, hypot(dx,dy) / LOOK_FULL)` where `LOOK_FULL` is a named const in `MOTION` (add `lookFullAt: 40`). Sets `transform="translate(ox oy)"` on every `[data-part="pupil"]` **group** inside the hero head (in ART units, so the visual shift scales with `HERO.headScale`). Smoothing: eased over `clock.raf` frames toward the target (lerp factor const in `MOTION`, e.g. `lookLerp: 0.25`); under reduced motion jump instantly. `lookAt(0,0)` recentres. Offsets persist across face re-renders (re-applied after any head swap) and are ignored while eyes are not `open`.
- `react(kind)` (later call replaces an active reaction; timers cleared first):
  - `poke`: adds class `is-poke` and drives the body+head `transform: scale(...)` through `MOTION.pokeSquash` steps via `el.animate` (WAAPI) when available, else sets inline transforms on timers; face `happy` (`idle_tongue` for `snake`) for `MOTION.pokeMs`, then resting face.
  - `celebrate`: class `is-hop`, face `win` for `MOTION.celebrateMs`.
  - `denied`: face `alert` + recoil class `is-recoil` for `MOTION.deniedMs`.
  - `hurt`: face `deadFace(skin)` (`dead_tongue` for snake) — **sticky** until `setExpression`/another `react`; no blink while hurt.
  - Under reduced motion: faces change and revert on the same timers; no transforms/classes that move.
  - Each reaction sets `el.dataset.reaction = kind` while active (test hook), cleared on end.
- `interactive` pointerdown → `react('poke')` and `lookAt` toward the pointer relative to the hero centre.

- [ ] **Step 1: Write failing tests:**
  - `D4-P2-R3 lookAt clamps pupils to 2.2 units` — `lookAt(1000, 0)`, run enough frames (`clock.advance(1000)`); parse `translate(x y)` on both pupil groups → `x ≈ 2.2`, `y ≈ 0`; `lookAt(-1000,-1000)` → `hypot ≤ 2.2 + 1e-6`.
  - `D4-P2-R3 lookAt eases toward the target over frames` — after one frame `0 < x < 2.2`.
  - `D4-P2-R3 lookAt jumps instantly under reduced motion`.
  - `D4-P2-R3 poke shows happy for 600 ms then returns to the resting face` (`data-eyes="closed"`, `data-mouth="smile"`; after 600 ms `open/smile`).
  - `D4-P2-R3 snake poke shows the tongue` (`data-part="tongue"` present during poke).
  - `D4-P2-R3 celebrate shows win for 800 ms`; `denied shows alert and recoils`; `hurt shows the skin dead face and stays`.
  - `D4-P2-R3 a new reaction replaces the active one and leaves exactly one pending end timer`.
  - `D4-P2-R3 pointerdown pokes when interactive, not when interactive:false`.
  - `D4-P2-R3 destroy during a reaction leaves no pending timers or rAF`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/heroStage.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.** If `el.animate` is missing in `happy-dom`, the timer fallback is the path under test; guard with `typeof el.animate === 'function'`.
- [ ] **Step 4: Run, expect PASS. CHANGELOG, full suite + typecheck, commit** `feat(ui): HeroStage eye tracking and poke/celebrate/denied/hurt reactions (D4-P2-R3)`.

---

### Task 9: Tier 2 helpers — `staggerEnter`, `countUp`, `shakeDenied` (`D4-P2-R4`)

**Files:**
- Create: `src/game/dom/animate.ts`
- Test: `tests/game/dom/animate.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export function isReducedMotion(el: Element): boolean;   // el.closest('.reduced-motion') != null
export function staggerEnter(container: HTMLElement, opts?: { selector?: string; clock?: MotionClock }): () => void;
// direct children (or selector matches) get .d4-enter and --d4-delay = i * MOTION.staggerMs ms; next frame adds .is-in.
// reduced motion: add .d4-enter.is-in immediately, --d4-delay 0ms. Returns a cancel that clears the pending rAF.
export function countUp(el: HTMLElement, from: number, to: number, ms: number, clock?: MotionClock): () => void;
// ease-out (1 - (1-p)^4, i.e. out-quart) over clock.raf frames; writes Math.round(value) as textContent
// (locale formatting is the caller's job via an optional 6th param `format?: (n: number) => string`).
// ms <= 0 or reduced motion -> writes `to` immediately, no rAF. Returns cancel; cancel leaves the last written value.
export function shakeDenied(el: HTMLElement, clock?: MotionClock): void;
// WAAPI keyframes translateX over MOTION.shakePx in MOTION.shakeMs when el.animate exists,
// else steps the inline transform with clock timers; ends with transform cleared. No-op under reduced motion.
```
Comments: `// D4-P2-R4 staggered entrance`, `// D4-P2-R4 odometer count-up`, `// D4-P2-R4 denied shake`.

- [ ] **Step 1: Write failing tests** (`FakeClock`):
  - `D4-P2-R4 staggerEnter sets 35 ms incremental delays and reveals on the next frame` — 4 children → `--d4-delay` `0ms, 35ms, 70ms, 105ms`; `.is-in` absent before `clock.frame()`, present after.
  - `D4-P2-R4 staggerEnter is instant under .reduced-motion`.
  - `D4-P2-R4 countUp ends exactly on the target` — `countUp(el, 0, 1234, 600, clock)`; `advance(600)` → `'1234'`; intermediate value after 300 ms is `> 617` (ease-out is ahead of linear) and `< 1234`.
  - `D4-P2-R4 countUp counts down too` (`100 → 40`).
  - `D4-P2-R4 countUp jumps under reduced motion and when ms is 0` (no rAF pending).
  - `D4-P2-R4 countUp cancel stops further writes`.
  - `D4-P2-R4 shakeDenied returns the element to rest after 280 ms` (fallback path: transform `''` after `advance(280)`; at least one intermediate `translateX(6px)`).
  - `D4-P2-R4 shakeDenied is a no-op under reduced motion`.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/animate.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS. CHANGELOG, CODEMAP, full suite + typecheck, commit** `feat(ui): stagger entrance, count-up and denied shake helpers (D4-P2-R4)`.

---

### Task 10: Tier 3 confetti with `CelebrationFx` seam (`D4-P2-R5`)

**Files:**
- Create: `src/game/dom/confetti.ts`
- Test: `tests/game/dom/confetti.test.ts` (new, `happy-dom`)

**Interfaces:**
```ts
export interface CelebrationFx {
  // returns a disposer that removes anything still on screen
  burst(container: HTMLElement, originX: number, originY: number, palette?: readonly string[]): () => void;
}
export const CONFETTI_PALETTE: readonly string[] = [
  'var(--d4-green-face)', 'var(--d4-gold-face)', 'var(--d4-sky-face)', 'var(--d4-purple-face)', 'var(--d4-red-face)',
]; // token vars only, never hex
export function createSvgConfettiFx(clock?: MotionClock): CelebrationFx;
export function setCelebrationFx(fx: CelebrationFx | null): void;   // null -> default svg fx (Lottie/Rive can plug in later)
export function burstConfetti(container: HTMLElement, originX: number, originY: number, palette?: readonly string[]): () => void;
```
Rules (comment `// D4-P2-R5 zero-dependency celebration particles`):
- Count = `MOTION.confettiMin + floor(random * (confettiMax - confettiMin + 1))` → 14–18.
- Shapes cycle `circle`, rounded `bar`, 4-point `star` (inline `<svg>` with `fill="currentColor"`, `style.color` = palette entry), each `data-confetti="<shape>"`, inside one `.d4-confetti-layer` div positioned at `originX/originY` (px, relative to `container`).
- Motion: WAAPI `animate()` (translate by random angle × `MOTION.confettiSpreadPx`, rotate, fade) when available; removal on `finished` **and** a `clock.setTimeout(cleanup, MOTION.confettiMs)` safety net (whichever first; idempotent).
- Under reduced motion (`isReducedMotion(container)`): spawn nothing, return a no-op disposer.
- No `id=` attributes, no hex.

- [ ] **Step 1: Write failing tests:**
  - `D4-P2-R5 spawns 14 to 18 particles` (rnd `0` → 14, rnd `0.999` → 18).
  - `D4-P2-R5 uses circles, bars and stars with token colours only` — every particle `style.color` starts with `var(--d4-`; all three shapes present; no `/#[0-9a-f]{3,8}/i` in `layer.outerHTML`.
  - `D4-P2-R5 removes the layer after the animation window` — `advance(MOTION.confettiMs)` → no `.d4-confetti-layer`, `clock.pending() === 0`.
  - `D4-P2-R5 disposer removes immediately and is idempotent`.
  - `D4-P2-R5 skipped under reduced motion`.
  - `D4-P2-R5 a custom CelebrationFx receives burstConfetti calls unchanged` — `setCelebrationFx(spy)`, call `burstConfetti(c, 10, 20)` → spy called with `(c, 10, 20, undefined)`; `setCelebrationFx(null)` restores default (reset in `afterEach`).
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/confetti.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.** Also run the P1 phaser guard: `npx vitest run tests/game/dom/uiHost.test.ts --configLoader native --pool threads --maxWorkers 2` (no `phaser` import under `src/game/dom/`).
- [ ] **Step 5: CHANGELOG, CODEMAP, DECISIONS (2026-11-23: "D4-P2: celebration particles are hand-rolled SVG + WAAPI behind `CelebrationFx`; Lottie/Rive rejected for now (bundle size, new dependency); the seam lets a later phase swap them without touching callers."), full suite + typecheck, commit** `feat(ui): SVG confetti behind a CelebrationFx seam (D4-P2-R5)`.

---

### Task 11: Stylebook — live `HeroStage` for all 5 skins

**Files:**
- Modify: `docs/design/mockups/d4/stylebook.html`
- Test: extend `tests/game/dom/stylebook.test.ts` (`node`, text-level)

**Requirements:**
- Link `motion.css` next to the P1 links: `<link rel="stylesheet" href="../../../../src/game/dom/styles/motion.css">`.
- New section `<section data-qa="sb-hero">` titled "Characters — live hero": a grid of 5 cards, one per `SKIN_IDS` entry, each with a container `data-qa="sb-hero-<skin>"` and four buttons `data-qa="sb-hero-<skin>-poke|celebrate|denied|hurt"` (≥ 48 px, `.d4-btn` variants), plus one shared row: `data-qa="sb-confetti"` (bursts over the grid), `data-qa="sb-countup"` (animates a `.d4-num` 0 → 1234), `data-qa="sb-shake"` (shakes a disabled CTA), `data-qa="sb-stagger"` (replays `staggerEnter` on the grid).
- The module script imports `../../../../src/game/art/skins.ts`, `.../dom/heroStage.ts`, `.../dom/animate.ts`, `.../dom/confetti.ts` and builds the heroes from `SKIN_IDS` (no hand-copied SVG, no hex). Pointer move over each card calls `lookAt` toward the pointer; leaving recentres.
- Static Characters/Home phone mockups from P1 replace their placeholder mascot with a `HeroStage` (`interactive: false`) of the equipped skin (`snake`) and 5 `headSvg` thumbnails — this doubles as a visual id-collision check.
- The existing "Reduce motion" switch must visibly stop breathing/blink/confetti (it toggles `.reduced-motion` on the page root that contains the heroes).
- Page `<style>` keeps the P1 rule: `var(--…)` only, no hex.

- [ ] **Step 1: Write failing tests** (extend `stylebook.test.ts`):
  - `D4-P2 stylebook links motion.css directly`.
  - `D4-P2 stylebook has a live hero card and four reaction buttons per skin` — for each of `snake, ginger, pup, tuxedo, capy`: `data-qa="sb-hero-<skin>"` and the 4 button ids.
  - `D4-P2 stylebook imports heroStage, animate and confetti and builds heroes from SKIN_IDS` (text contains the three import paths and `SKIN_IDS`).
  - `D4-P2 stylebook has confetti, count-up, shake and stagger demos`.
  - P1 tests (no hex, every button has `data-qa`) stay green.
- [ ] **Step 2: Run, expect FAIL:** `npx vitest run tests/game/dom/stylebook.test.ts --configLoader native --pool threads --maxWorkers 2`
- [ ] **Step 3: Implement the section.**
- [ ] **Step 4: Run, expect PASS.** Then `npm run dev`, open `http://localhost:5173/docs/design/mockups/d4/stylebook.html`: no console errors; all 5 heroes breathe and blink; poke/celebrate/denied/hurt work by mouse and touch (DevTools device mode 360×640); eyes follow the pointer; confetti cleans up (Elements panel shows no leftover `.d4-confetti-layer`); Reduce motion stops all motion. Save QA shots to `tmp/qa/d4-p2/` (git-ignored), e.g. via `tools/qa/shot.mjs` if present.
- [ ] **Step 5: CHANGELOG, `docs/README.md` mockups row mention (stylebook now includes the live hero), full suite + typecheck, commit** `docs(ui): live HeroStage preview for all 5 skins in the stylebook (D4-P2)`.

---

### Task 12: Phase close-out

**Files:** `docs/STATUS.md`, `docs/CODEMAP.md` (final check), `CHANGELOG.md`

- [ ] **Step 1:** `Grep "D4-P2-R" src tests` — every rule R1..R5 has ≥ 1 test name and ≥ 1 implementing comment.
- [ ] **Step 2:** `Grep "id=\"|url\(#" src/game/art` returns nothing; `Grep "from 'phaser'" src/game/dom` returns nothing.
- [ ] **Step 3:** Phaser smoke: `npm run dev`, open `http://localhost:5173/` — Home board snake head, Characters scene thumbnails and in-run heads render with the new art, no console errors, no texture-missing boxes (keys unchanged). Check the `capy` Rare eat sparkle/leaf trail (MEC-011-R22..R25) still plays.
- [ ] **Step 4:** Full suite + typecheck (sequential), record counts.
- [ ] **Step 5:** Update `docs/STATUS.md` (Now: D4-P2 done, awaiting owner art approval in the stylebook; Next: D4-P3 Characters & Home), commit `docs: D4-P2 status`.
- [ ] **Step 6:** `superpowers:requesting-code-review` → fix → `git checkout version/v0.3; git merge --no-ff feat/d4-p2-character-art`. Refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.

---

## Exit Gate

- [ ] All 5 skins render flat cel-shaded heads/bodies with warm outlines (snake outline unchanged), dual catchlights, signature details (ginger stripes + inner ears, tuxedo blaze + inner ears, pup inner ears, capy leaf); no SVG contains `id=`, `<defs` or `url(#` (`artIds.test.ts`, `artDom.test.ts`).
- [ ] `CAPY_HASH` and the two capy `bodySvg` hashes in `tests/game/skins.test.ts` are re-baselined to the approved D4 output with a dated comment; `tests/game/capyRig.test.ts` asserts the new capy outline and exactly one leaf per capy head; all anchor tests unchanged and green.
- [ ] `heroSvg` produces `viewBox="0 0 220 150"` with `shadow` → `body` → `head` layers for every skin × expression; ribbon tapers 36 → 16, no self-intersection, no NaN, neck covered by the head.
- [ ] `HeroStage` breathing, auto-blink (3.0–4.5 s, 120 ms), `lookAt` (±2.2), `poke`/`celebrate`/`denied`/`hurt`, reduced-motion behaviour and `destroy()` (zero pending timers/rAF) are covered by `happy-dom` tests driven only by `FakeClock`.
- [ ] `motion.css` spring curves exact; CSS timings match `MOTION` (guard test); `staggerEnter`, `countUp`, `shakeDenied`, `burstConfetti` tested incl. reduced motion; `CelebrationFx` seam tested.
- [ ] `docs/design/mockups/d4/stylebook.html` shows live heroes for all 5 skins with reaction buttons and Tier 2/3 demos, no hex, no console errors.
- [ ] `npx vitest run --configLoader native --pool threads --maxWorkers 2` and `npm run typecheck` pass (sequentially); game runs under `npm run dev` with no console errors.
- [ ] `CHANGELOG.md` `[Unreleased]`, `docs/CODEMAP.md`, `docs/README.md`, `docs/DECISIONS.md`, `docs/STATUS.md` updated; all text in English.
- [ ] Owner opened the stylebook hero section (and `tmp/qa/d4-p2/` shots) and approved the character art — gate to start D4-P3.
