# P3c Capy Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the greybox snake-head eyes with a layered-SVG Capybara head (Figma look + thick outline) that idles, eats and dies on the board, plus a debug preview page.

**Architecture:** A pure module builds SVG strings from the ART-001 anchors (`src/game/art/capyRig.ts`) and a pure state machine computes the face pose per frame (`src/game/art/capyPose.ts`). Boot rasterises every expression with Phaser `load.svg`; a small Phaser controller (`CapyHead`) draws the face above the snake layer. Timings live in `config/balance.json` → `ui.capy`.

**Tech Stack:** TypeScript strict, Phaser 3 (`load.svg`), Vitest. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-06-capy-character-design.md` (and `docs/specs/art/ART-001-character-coordinate-system.md` §3–5).

## Global Constraints
- Branch: work on `feat/capy-character-spec` (created from `version/v0.2`); merge back into `version/v0.2` with `git merge --no-ff` after full `npm test` + `npm run typecheck` pass.
- Windows Vitest: if a run hangs or crashes, use `npx vitest run --configLoader native --pool threads --maxWorkers 2 <path>`.
- While working run only the touched tests; full `npm test` then `npm run typecheck` (sequentially) before each commit.
- No Phaser import in `capyRig.ts` / `capyPose.ts`. No magic numbers outside `ART`/`CAPY` constant tables or `ui.capy`.
- Presentation only: never touch `src/core` sim state, tick or RNG streams (except the `ui.capy` schema in `src/core/balance.ts`).
- Anchors (48-unit box, y down): head rect x 3.6–44.4, y 9.6–44.4, r 16.8; ears r 5.5 at (11.4,11.4),(36.6,11.4); eyes y 20.4, x 24 ± 9.6; cheeks y 30, x 24 ± 15; nostrils y 30.6 at x 20.6/27.4; muzzle (24,34) rx 12.6 ry 8.4; mouth y 37.6; pivot (24,24).
- Palette: face `#D6AB7C → #C79A6B`, ears/muzzle `#B1865A`, pupils `#17261B`, nose/mouth `#4A2E1B`, blush `#FF8FA3`, highlight `#FFFFFF`, outline `#4A2E1B`.
- Outline width 2 on head and ears, 1.2 on the muzzle (owner look: Figma muzzle has no line, a full-weight line reads heavy; spec §3 updated in Task 1).
- Test names carry `ART-001`; main functions carry a one-line `// ART-001 ...` comment.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; add one CHANGELOG `[Unreleased]` line per task.

---

### Task 1: Pure capy SVG rig (head expressions + body poses)

**Files:**
- Create: `src/game/art/capyRig.ts`
- Test: `tests/game/capyRig.test.ts`
- Modify: `docs/superpowers/specs/2026-11-06-capy-character-design.md` (§3 outline line: "width 2 on head and ears, 1.2 on the muzzle"; §4 board size 64 → 96 px because the board head is ~36 CSS px and needs ~3× DPR)
- Modify: `docs/CODEMAP.md` (`src/game/` row: add "art/capyRig.ts pure capy SVG rig, art/capyPose.ts pure face pose, art/capyHead.ts board face, scenes/ArtPreviewScene.ts"; `assets/` row: say the capy is code-drawn SVG, reference image in `assets/raw/reference/`)

**Interfaces:**
- Produces:
  - `type EyeVariant = 'open'|'blink'|'closed'|'x'|'half'`, `type MouthVariant = 'smile'|'open'|'chew'|'flat'|'o'`
  - `const EXPRESSIONS: Record<CapyExpression, { eyes: EyeVariant; mouth: MouthVariant }>`; `type CapyExpression = 'idle'|'idle_blink'|'eat_open'|'eat_chew'|'dead'|'happy'|'alert'|'scared'|'determined'|'sleepy'|'hurt'|'win'`
  - `const CAPY_EXPRESSIONS: readonly CapyExpression[]`, `const BODY_POSES = ['idle','win'] as const`, `type CapyBodyPose`
  - `const CAPY_SIZES = { board: 96, large: 256 } as const`, `type CapySize = keyof typeof CAPY_SIZES`
  - `const CAPY_BODY_SIZE = { w: 256, h: 384 } as const`
  - `capyHeadSvg(e: CapyExpression): string` (viewBox `0 0 48 48`), `capyBodySvg(p: CapyBodyPose): string` (viewBox `0 0 48 72`)
  - `svgDataUrl(svg: string): string`, `capyHeadKey(e, size): string` → `capy/head/<e>/<size>`, `capyBodyKey(p): string` → `capy/body/<p>/large`

- [ ] **Step 1: Write the failing test** — `tests/game/capyRig.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { BODY_POSES, CAPY_EXPRESSIONS, EXPRESSIONS, capyBodyKey, capyBodySvg, capyHeadKey, capyHeadSvg, svgDataUrl } from '../../src/game/art/capyRig';

const attr = (svg: string, part: string, name: string): string[] =>
  [...svg.matchAll(new RegExp(`data-part="${part}"[^>]*?\\s${name}="([^"]+)"`, 'g'))].map(m => m[1]!);

describe('ART-001 capy rig', () => {
  it('ART-001 every expression maps to known eye and mouth variants', () => {
    expect(CAPY_EXPRESSIONS).toHaveLength(12);
    for (const e of CAPY_EXPRESSIONS) {
      expect(['open', 'blink', 'closed', 'x', 'half']).toContain(EXPRESSIONS[e].eyes);
      expect(['smile', 'open', 'chew', 'flat', 'o']).toContain(EXPRESSIONS[e].mouth);
    }
    expect(EXPRESSIONS.idle).toEqual({ eyes: 'open', mouth: 'smile' });
    expect(EXPRESSIONS.dead).toEqual({ eyes: 'x', mouth: 'o' });
  });

  it('ART-001 head svg has every fixed layer and the 48 viewBox', () => {
    for (const e of CAPY_EXPRESSIONS) {
      const svg = capyHeadSvg(e);
      expect(svg).toContain('viewBox="0 0 48 48"');
      for (const layer of ['ears', 'head', 'blush', 'muzzle', 'nose', 'eyes', 'mouth'])
        expect(svg).toContain(`data-layer="${layer}"`);
      expect(svg).toContain(`data-eyes="${EXPRESSIONS[e].eyes}"`);
      expect(svg).toContain(`data-mouth="${EXPRESSIONS[e].mouth}"`);
    }
  });

  it('ART-001 anchors: eyes, nostrils, ears, muzzle and mouth sit on the rig', () => {
    const svg = capyHeadSvg('idle');
    expect(attr(svg, 'pupil', 'cx')).toEqual(['14.4', '33.6']);
    expect(attr(svg, 'pupil', 'cy')).toEqual(['20.4', '20.4']);
    expect(attr(svg, 'nostril', 'cx')).toEqual(['20.6', '27.4']);
    expect(attr(svg, 'nostril', 'cy')).toEqual(['30.6', '30.6']);
    expect(attr(svg, 'ear', 'cx')).toEqual(['11.4', '36.6']);
    expect(attr(svg, 'muzzle', 'cy')).toEqual(['34']);
    expect(svg).toMatch(/data-part="mouth"[^>]*data-y="37.6"/);
  });

  it('ART-001 outline is dark brown, 2 on head and ears, 1.2 on the muzzle', () => {
    const svg = capyHeadSvg('idle');
    expect(attr(svg, 'face', 'stroke-width')).toEqual(['2']);
    expect(attr(svg, 'ear', 'stroke-width')).toEqual(['2', '2']);
    expect(attr(svg, 'muzzle', 'stroke-width')).toEqual(['1.2']);
    expect(attr(svg, 'face', 'stroke')).toEqual(['#4A2E1B']);
  });

  it('ART-001 no leaf, stem or text in any head', () => {
    for (const e of CAPY_EXPRESSIONS) expect(capyHeadSvg(e)).not.toMatch(/<text|leaf|stem/);
  });

  it('ART-001 body poses include the head and a body below y 44.4', () => {
    for (const p of BODY_POSES) {
      const svg = capyBodySvg(p);
      expect(svg).toContain('viewBox="0 0 48 72"');
      expect(svg).toContain('data-layer="body"');
      expect(svg).toContain('data-layer="head"');
    }
    expect(capyBodySvg('win')).toContain('data-eyes="closed"');
  });

  it('ART-001 keys and data urls', () => {
    expect(capyHeadKey('eat_open', 'board')).toBe('capy/head/eat_open/board');
    expect(capyBodyKey('win')).toBe('capy/body/win/large');
    expect(svgDataUrl('<svg/>')).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/game/capyRig.test.ts`
Expected: FAIL (cannot resolve `../../src/game/art/capyRig`).

- [ ] **Step 3: Implement** — `src/game/art/capyRig.ts`

```ts
// Pure capy SVG rig on the ART-001 48-unit anchors. No Phaser import.
export type EyeVariant = 'open' | 'blink' | 'closed' | 'x' | 'half';
export type MouthVariant = 'smile' | 'open' | 'chew' | 'flat' | 'o';

export const EXPRESSIONS = {
  idle: { eyes: 'open', mouth: 'smile' },
  idle_blink: { eyes: 'blink', mouth: 'smile' },
  eat_open: { eyes: 'open', mouth: 'open' },
  eat_chew: { eyes: 'closed', mouth: 'chew' },
  dead: { eyes: 'x', mouth: 'o' },
  happy: { eyes: 'closed', mouth: 'smile' },
  alert: { eyes: 'open', mouth: 'o' },
  scared: { eyes: 'open', mouth: 'flat' },
  determined: { eyes: 'half', mouth: 'flat' },
  sleepy: { eyes: 'half', mouth: 'flat' },
  hurt: { eyes: 'closed', mouth: 'o' },
  win: { eyes: 'closed', mouth: 'open' },
} as const satisfies Record<string, { eyes: EyeVariant; mouth: MouthVariant }>;
export type CapyExpression = keyof typeof EXPRESSIONS;
export const CAPY_EXPRESSIONS = Object.keys(EXPRESSIONS) as CapyExpression[];
export const BODY_POSES = ['idle', 'win'] as const;
export type CapyBodyPose = (typeof BODY_POSES)[number];
export const CAPY_SIZES = { board: 96, large: 256 } as const;
export type CapySize = keyof typeof CAPY_SIZES;
export const CAPY_BODY_SIZE = { w: 256, h: 384 } as const;

export const CAPY = {
  outline: '#4A2E1B', faceTop: '#D6AB7C', faceBottom: '#C79A6B', ears: '#B1865A', muzzle: '#B1865A',
  pupil: '#17261B', nose: '#4A2E1B', blush: '#FF8FA3', highlight: '#FFFFFF',
  stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
} as const;
export const ART = {
  head: { x: 3.6, y: 9.6, w: 40.8, h: 34.8, r: 16.8 }, ears: [11.4, 36.6], earY: 11.4, earR: 5.5,
  eyeY: 20.4, eyeDx: 9.6, pupilR: 3.2, glintR: 1.1, eyeHalfW: 3,
  cheekY: 30, cheekDx: 15, cheekRx: 4, cheekRy: 2.6,
  noseY: 30.6, nostrils: [20.6, 27.4], nostrilRx: 1.6, nostrilRy: 1.2,
  muzzle: { x: 24, y: 34, rx: 12.6, ry: 8.4 }, mouthY: 37.6, mouthHalfW: 3.5, cx: 24,
  body: { cx: 24, cy: 56, rx: 17, ry: 14, feetY: 69, feetDx: 9, footRx: 6, footRy: 3, armY: 50, armWinY: 40, armDx: 18, armRx: 4, armRy: 3 },
} as const;

const n = (v: number): string => String(+v.toFixed(2));
const eyeXs = [ART.cx - ART.eyeDx, ART.cx + ART.eyeDx];
const line = (d: string, w: number = CAPY.featureStroke): string =>
  `<path d="${d}" fill="none" stroke="${CAPY.pupil}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

function eyes(v: EyeVariant): string {
  const y = ART.eyeY, w = ART.eyeHalfW;
  const one = (x: number): string => {
    switch (v) {
      case 'open': return `<circle data-part="pupil" cx="${n(x)}" cy="${n(y)}" r="${ART.pupilR}" fill="${CAPY.pupil}"/>`
        + `<circle cx="${n(x + 1)}" cy="${n(y - 1.1)}" r="${ART.glintR}" fill="${CAPY.highlight}"/>`;
      case 'blink': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y)} Q${n(x)} ${n(y + 1.2)} ${n(x + w)} ${n(y)}`)}</g>`;
      case 'closed': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - w)} ${n(y + 1)} L${n(x)} ${n(y - 1.6)} L${n(x + w)} ${n(y + 1)}`)}</g>`;
      case 'x': return `<g data-part="pupil" cx="${n(x)}" cy="${n(y)}">${line(`M${n(x - 2.4)} ${n(y - 2.4)} L${n(x + 2.4)} ${n(y + 2.4)} M${n(x + 2.4)} ${n(y - 2.4)} L${n(x - 2.4)} ${n(y + 2.4)}`)}</g>`;
      case 'half': return `<path data-part="pupil" cx="${n(x)}" cy="${n(y)}" d="M${n(x - ART.pupilR)} ${n(y)} A${ART.pupilR} ${ART.pupilR} 0 0 0 ${n(x + ART.pupilR)} ${n(y)} Z" fill="${CAPY.pupil}"/>`
        + line(`M${n(x - 3.6)} ${n(y)} L${n(x + 3.6)} ${n(y)}`, CAPY.innerStroke);
    }
  };
  return `<g data-layer="eyes" data-eyes="${v}">${eyeXs.map(one).join('')}</g>`;
}

function mouth(v: MouthVariant): string {
  const x = ART.cx, y = ART.mouthY, w = ART.mouthHalfW;
  const stroke = (d: string): string => `<path d="${d}" fill="none" stroke="${CAPY.nose}" stroke-width="${CAPY.featureStroke}" stroke-linecap="round"/>`;
  const body = {
    smile: stroke(`M${n(x - w)} ${n(y - 0.8)} Q${n(x)} ${n(y + 2.6)} ${n(x + w)} ${n(y - 0.8)}`),
    open: `<ellipse cx="${n(x)}" cy="${n(y + 0.8)}" rx="3.2" ry="2.8" fill="${CAPY.nose}"/><ellipse cx="${n(x)}" cy="${n(y + 2)}" rx="1.8" ry="1.1" fill="${CAPY.blush}"/>`,
    chew: stroke(`M${n(x - 3)} ${n(y)} Q${n(x - 1.5)} ${n(y - 1.4)} ${n(x)} ${n(y)} Q${n(x + 1.5)} ${n(y + 1.4)} ${n(x + 3)} ${n(y)}`),
    flat: stroke(`M${n(x - 2.5)} ${n(y)} L${n(x + 2.5)} ${n(y)}`),
    o: `<ellipse cx="${n(x)}" cy="${n(y + 0.4)}" rx="1.8" ry="2.2" fill="${CAPY.nose}"/>`,
  }[v];
  return `<g data-layer="mouth" data-mouth="${v}"><g data-part="mouth" data-y="${n(y)}">${body}</g></g>`;
}

// ART-001 head layers back to front: ears, head, blush, muzzle, nose, eyes, mouth.
function headLayers(eyesV: EyeVariant, mouthV: MouthVariant): string {
  const h = ART.head, m = ART.muzzle, o = CAPY.outline;
  return `<defs><linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CAPY.faceTop}"/><stop offset="1" stop-color="${CAPY.faceBottom}"/></linearGradient></defs>`
    + `<g data-layer="ears">${ART.ears.map(x => `<circle data-part="ear" cx="${n(x)}" cy="${n(ART.earY)}" r="${ART.earR}" fill="${CAPY.ears}" stroke="${o}" stroke-width="${CAPY.stroke}"/>`).join('')}</g>`
    + `<g data-layer="head"><rect data-part="face" x="${h.x}" y="${h.y}" width="${n(h.w)}" height="${n(h.h)}" rx="${h.r}" fill="url(#face)" stroke="${o}" stroke-width="${CAPY.stroke}" stroke-linejoin="round"/></g>`
    + `<g data-layer="blush">${[-1, 1].map(s => `<ellipse cx="${n(ART.cx + s * ART.cheekDx)}" cy="${ART.cheekY}" rx="${ART.cheekRx}" ry="${ART.cheekRy}" fill="${CAPY.blush}" opacity="0.8"/>`).join('')}</g>`
    + `<g data-layer="muzzle"><ellipse data-part="muzzle" cx="${m.x}" cy="${m.y}" rx="${m.rx}" ry="${m.ry}" fill="${CAPY.muzzle}" stroke="${o}" stroke-width="${CAPY.innerStroke}"/></g>`
    + `<g data-layer="nose">${ART.nostrils.map(x => `<ellipse data-part="nostril" cx="${n(x)}" cy="${n(ART.noseY)}" rx="${ART.nostrilRx}" ry="${ART.nostrilRy}" fill="${CAPY.nose}"/>`).join('')}</g>`
    + eyes(eyesV) + mouth(mouthV);
}

const wrap = (vb: string, inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;

// ART-001 capy head for one expression (front facing, 48 x 48).
export function capyHeadSvg(e: CapyExpression): string {
  const x = EXPRESSIONS[e];
  return wrap('0 0 48 48', headLayers(x.eyes, x.mouth));
}

// ART-001 capy body pose (Skins/Results only): body behind, head on the same anchors.
export function capyBodySvg(p: CapyBodyPose): string {
  const b = ART.body, o = CAPY.outline, st = CAPY.stroke;
  const armY = p === 'win' ? b.armWinY : b.armY;
  const blob = (cx: number, cy: number, rx: number, ry: number): string =>
    `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${rx}" ry="${ry}" fill="${CAPY.ears}" stroke="${o}" stroke-width="${st}"/>`;
  const body = `<g data-layer="body">${blob(b.cx - b.feetDx, b.feetY, b.footRx, b.footRy)}${blob(b.cx + b.feetDx, b.feetY, b.footRx, b.footRy)}`
    + `${blob(b.cx - b.armDx, armY, b.armRx, b.armRy)}${blob(b.cx + b.armDx, armY, b.armRx, b.armRy)}`
    + `<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}" fill="url(#face)" stroke="${o}" stroke-width="${st}"/></g>`;
  const x = EXPRESSIONS[p === 'win' ? 'win' : 'idle'];
  const head = headLayers(x.eyes, x.mouth);
  // defs come from headLayers; body is drawn first so the head overlaps it.
  const defsEnd = head.indexOf('</defs>') + '</defs>'.length;
  return wrap('0 0 48 72', head.slice(0, defsEnd) + body + head.slice(defsEnd));
}

export const svgDataUrl = (svg: string): string => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
export const capyHeadKey = (e: CapyExpression, size: CapySize): string => `capy/head/${e}/${size}`;
export const capyBodyKey = (p: CapyBodyPose): string => `capy/body/${p}/large`;
```

Note for the implementer: the `attr()` helper in the test reads `cx`/`cy` from elements tagged `data-part="pupil"`; the non-circle eye variants put `cx`/`cy` on the wrapping `<g>` on purpose so the anchor test reads one value per eye for every variant. Do not remove them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/game/capyRig.test.ts` → Expected: PASS (7 tests). Then `npm run typecheck`.

- [ ] **Step 5: Docs** — apply the spec §3/§4 edits and CODEMAP edits listed under **Files**; add CHANGELOG line `- feat(game): pure capy SVG rig (12 expressions, 2 body poses) on the ART-001 anchors`.

- [ ] **Step 6: Commit**

```bash
npm test && npm run typecheck
git add src/game/art/capyRig.ts tests/game/capyRig.test.ts docs/CODEMAP.md docs/superpowers/specs/2026-11-06-capy-character-design.md CHANGELOG.md
git commit -m "feat(game): pure capy SVG rig on the ART-001 anchors"
```

---

### Task 2: Pure face pose state machine + `ui.capy` balance

**Files:**
- Create: `src/game/art/capyPose.ts`
- Modify: `config/balance.json` (`ui` block), `src/core/balance.ts` (`ui` type ~line 77 and schema ~line 193)
- Test: `tests/game/capyPose.test.ts`

**Interfaces:**
- Consumes: `CapyExpression` from `src/game/art/capyRig.ts`.
- Produces:
  - `Balance['ui']['capy']` = `CapyAnimConfig { breathPeriodMs; breathAmp; blinkMs; blinkMinGapMs; blinkMaxGapMs; eatOpenMs; eatChewMs; gulpScaleX; gulpScaleY; deadDroopMs; deadRotDeg; deadDropPx; headCellScale }` (all `number`)
  - `type CapyMode = 'idle'|'eat'|'dead'`; `interface CapyAnimState { mode; since: number; nextBlinkAt: number }`
  - `interface CapyPose { expression: CapyExpression; scaleX: number; scaleY: number; rotationDeg: number; dy: number }`
  - `createCapyAnim(now, cfg, rnd): CapyAnimState`, `capyEat(st, now): CapyAnimState`, `capyDie(st, now): CapyAnimState`, `capyPose(st, now, cfg, reduced, rnd): { state: CapyAnimState; pose: CapyPose }`

- [ ] **Step 1: Write the failing test** — `tests/game/capyPose.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { parseBalance } from '../../src/core';
import { capyDie, capyEat, capyPose, createCapyAnim } from '../../src/game/art/capyPose';

const cfg = parseBalance(structuredClone(json)).ui.capy;
const rnd = (): number => 0; // blink gap = blinkMinGapMs

describe('ART-001 capy pose', () => {
  it('ART-001 balance has ui.capy timings', () => {
    expect(cfg.eatOpenMs).toBeGreaterThan(0);
    expect(cfg.blinkMaxGapMs).toBeGreaterThanOrEqual(cfg.blinkMinGapMs);
  });

  it('ART-001 idle breathes and blinks on schedule', () => {
    let st = createCapyAnim(0, cfg, rnd);
    expect(st.nextBlinkAt).toBe(cfg.blinkMinGapMs);
    const a = capyPose(st, cfg.breathPeriodMs / 4, cfg, false, rnd);
    expect(a.pose.expression).toBe('idle');
    expect(a.pose.scaleY).toBeCloseTo(1 + cfg.breathAmp);
    const b = capyPose(st, cfg.blinkMinGapMs + 1, cfg, false, rnd);
    expect(b.pose.expression).toBe('idle_blink');
    st = b.state;
    const c = capyPose(st, cfg.blinkMinGapMs + cfg.blinkMs + 1, cfg, false, rnd);
    expect(c.pose.expression).toBe('idle');
    expect(c.state.nextBlinkAt).toBe(cfg.blinkMinGapMs + cfg.blinkMs + 1 + cfg.blinkMinGapMs);
  });

  it('ART-001 eat plays open, chew, then idle', () => {
    const st = capyEat(createCapyAnim(0, cfg, rnd), 100);
    const open = capyPose(st, 101, cfg, false, rnd).pose;
    expect(open.expression).toBe('eat_open');
    expect(open.scaleX).toBe(cfg.gulpScaleX);
    expect(capyPose(st, 100 + cfg.eatOpenMs + 1, cfg, false, rnd).pose.expression).toBe('eat_chew');
    const done = capyPose(st, 100 + cfg.eatOpenMs + cfg.eatChewMs + 1, cfg, false, rnd);
    expect(done.state.mode).toBe('idle');
  });

  it('ART-001 dead droops and ignores eat; reduced motion only swaps the face', () => {
    const st = capyDie(createCapyAnim(0, cfg, rnd), 0);
    expect(capyEat(st, 10)).toBe(st);
    const end = capyPose(st, cfg.deadDroopMs * 2, cfg, false, rnd).pose;
    expect(end).toMatchObject({ expression: 'dead', rotationDeg: -cfg.deadRotDeg, dy: cfg.deadDropPx });
    const reduced = capyPose(st, cfg.deadDroopMs * 2, cfg, true, rnd).pose;
    expect(reduced).toMatchObject({ expression: 'dead', rotationDeg: 0, dy: 0, scaleX: 1, scaleY: 1 });
  });

  it('ART-001 reduced motion: no breathing and no gulp squash', () => {
    const st = createCapyAnim(0, cfg, rnd);
    expect(capyPose(st, cfg.breathPeriodMs / 4, cfg, true, rnd).pose.scaleY).toBe(1);
    expect(capyPose(capyEat(st, 0), 1, cfg, true, rnd).pose.scaleX).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/game/capyPose.test.ts` → Expected: FAIL (module not found / `ui.capy` undefined).

- [ ] **Step 3: Add balance values** — in `config/balance.json`, inside `"ui": { ... }` after `"hazardFlickerMs": 1500` add:

```json
, "capy": { "breathPeriodMs": 1600, "breathAmp": 0.03, "blinkMs": 120, "blinkMinGapMs": 2000, "blinkMaxGapMs": 4000,
    "eatOpenMs": 80, "eatChewMs": 120, "gulpScaleX": 1.12, "gulpScaleY": 0.9,
    "deadDroopMs": 300, "deadRotDeg": 12, "deadDropPx": 4, "headCellScale": 1.2 }
```

In `src/core/balance.ts` `ui` type add:
```ts
    capy: { breathPeriodMs: number; breathAmp: number; blinkMs: number; blinkMinGapMs: number; blinkMaxGapMs: number;
      eatOpenMs: number; eatChewMs: number; gulpScaleX: number; gulpScaleY: number;
      deadDroopMs: number; deadRotDeg: number; deadDropPx: number; headCellScale: number };
```
and in the `ui` schema add:
```ts
    capy: { breathPeriodMs: 'int+', breathAmp: 'prob', blinkMs: 'int+', blinkMinGapMs: 'int+', blinkMaxGapMs: 'int+',
      eatOpenMs: 'int+', eatChewMs: 'int+', gulpScaleX: 'num+', gulpScaleY: 'num+',
      deadDroopMs: 'int+', deadRotDeg: 'num0', deadDropPx: 'num0', headCellScale: 'num+' },
```
If balance has cross-field checks (grep `fail(` near the checkpoints check, ~line 318), add: `if (b.ui.capy.blinkMaxGapMs < b.ui.capy.blinkMinGapMs) fail('ui.capy.blinkMaxGapMs', 'must be >= blinkMinGapMs');` following the local style. If any test fixture builds a full `Balance` literal (grep `hazardFlickerMs` under `tests/`), add the same `capy` object there.

- [ ] **Step 4: Implement** — `src/game/art/capyPose.ts`

```ts
import type { Balance } from '../../core';
import type { CapyExpression } from './capyRig';

export type CapyAnimConfig = Balance['ui']['capy'];
export type CapyMode = 'idle' | 'eat' | 'dead';
export interface CapyAnimState { mode: CapyMode; since: number; nextBlinkAt: number }
export interface CapyPose { expression: CapyExpression; scaleX: number; scaleY: number; rotationDeg: number; dy: number }

const gap = (cfg: CapyAnimConfig, rnd: () => number): number =>
  cfg.blinkMinGapMs + Math.floor(rnd() * (cfg.blinkMaxGapMs - cfg.blinkMinGapMs));
const flat = (expression: CapyExpression): CapyPose => ({ expression, scaleX: 1, scaleY: 1, rotationDeg: 0, dy: 0 });

// ART-001 presentation-only face state; rnd is a local (non-sim) random source.
export const createCapyAnim = (now: number, cfg: CapyAnimConfig, rnd: () => number): CapyAnimState =>
  ({ mode: 'idle', since: now, nextBlinkAt: now + gap(cfg, rnd) });
export const capyEat = (st: CapyAnimState, now: number): CapyAnimState =>
  st.mode === 'dead' ? st : { ...st, mode: 'eat', since: now };
export const capyDie = (st: CapyAnimState, now: number): CapyAnimState => ({ ...st, mode: 'dead', since: now });

// ART-001 idle (breath + blink), eat (open → chew → idle) and dead (droop) face pose for one frame.
export function capyPose(st: CapyAnimState, now: number, cfg: CapyAnimConfig, reduced: boolean, rnd: () => number):
  { state: CapyAnimState; pose: CapyPose } {
  if (st.mode === 'dead') {
    if (reduced) return { state: st, pose: flat('dead') };
    const t = Math.min(1, (now - st.since) / cfg.deadDroopMs);
    return { state: st, pose: { ...flat('dead'), rotationDeg: -cfg.deadRotDeg * t, dy: cfg.deadDropPx * t } };
  }
  if (st.mode === 'eat') {
    const e = now - st.since;
    if (e < cfg.eatOpenMs) return { state: st, pose: reduced ? flat('eat_open')
      : { ...flat('eat_open'), scaleX: cfg.gulpScaleX, scaleY: cfg.gulpScaleY } };
    if (e < cfg.eatOpenMs + cfg.eatChewMs) return { state: st, pose: flat('eat_chew') };
    st = { ...st, mode: 'idle', since: now };
  }
  let state = st;
  let expression: CapyExpression = 'idle';
  if (now >= st.nextBlinkAt) {
    if (now < st.nextBlinkAt + cfg.blinkMs) expression = 'idle_blink';
    else state = { ...st, nextBlinkAt: now + gap(cfg, rnd) };
  }
  const b = reduced ? 0 : cfg.breathAmp * Math.sin((2 * Math.PI * (now - st.since)) / cfg.breathPeriodMs);
  return { state, pose: { expression, scaleX: 1 - b / 2, scaleY: 1 + b, rotationDeg: 0, dy: 0 } };
}
```

- [ ] **Step 5: Run tests** — `npx vitest run tests/game/capyPose.test.ts tests/core/balance` (or `-t balance`) → PASS; `npm run typecheck`.

- [ ] **Step 6: CHANGELOG + commit**

CHANGELOG: `- feat(game): capy face pose state machine (idle breath/blink, eat, dead droop; reduced motion) and \`ui.capy\` balance`.
```bash
npm test && npm run typecheck
git add src/game/art/capyPose.ts tests/game/capyPose.test.ts config/balance.json src/core/balance.ts CHANGELOG.md tests
git commit -m "feat(game): capy face pose state machine and ui.capy balance"
```

---

### Task 3: Capy head on the board (Boot preload + CapyHead + GameScene)

**Files:**
- Create: `src/game/art/capyTextures.ts`, `src/game/art/capyHead.ts`
- Modify: `src/game/render/snake.ts` (extract `snakeHeadPoint`, add `drawFace` param), `src/game/scenes/BootScene.ts` (add `preload`), `src/game/scenes/GameScene.ts` (create/handleEvents/draw/startRun/shutdown)
- Test: `tests/game/snakeHead.test.ts`

**Interfaces:**
- Consumes: `capyHeadSvg`, `capyBodySvg`, `svgDataUrl`, `capyHeadKey`, `capyBodyKey`, `CAPY_EXPRESSIONS`, `BODY_POSES`, `CAPY_SIZES`, `CAPY_BODY_SIZE` (Task 1); `createCapyAnim`, `capyEat`, `capyDie`, `capyPose`, `CapyAnimConfig` (Task 2).
- Produces: `snakeHeadPoint(s: SimSnapshot, cell: number): { x: number; y: number }`; `drawSnake(g, s, cell, p, gulp, drawFace = true)`; `preloadCapy(load: Phaser.Loader.LoaderPlugin): void`; `class CapyHead { constructor(scene, board: Phaser.GameObjects.Container, afterLayer: Phaser.GameObjects.GameObject, cfg, cell, reduced, now); eat(now); die(now); reset(now); update(s: SimSnapshot, now: number); readonly image: Phaser.GameObjects.Image }`.

- [ ] **Step 1: Write the failing test** — `tests/game/snakeHead.test.ts`

```ts
import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { snakeHeadPoint } from '../../src/game/render/snake';

const snap = (alpha: number): SimSnapshot => ({
  snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }], headFrom: { x: 2, y: 2 }, tailFrom: { x: 1, y: 2 }, tickAlpha: alpha,
} as unknown as SimSnapshot);

it('ART-001 capy head follows the interpolated snake head centre', () => {
  expect(snakeHeadPoint(snap(0), 10)).toEqual({ x: 25, y: 25 });
  expect(snakeHeadPoint(snap(1), 10)).toEqual({ x: 35, y: 25 });
  expect(snakeHeadPoint(snap(0.5), 10)).toEqual({ x: 30, y: 25 });
});
```

- [ ] **Step 2: Run** — `npx vitest run tests/game/snakeHead.test.ts` → FAIL (`snakeHeadPoint` not exported).

- [ ] **Step 3: Refactor `src/game/render/snake.ts`**

Add above `drawSnake`:
```ts
// ART-001 interpolated head centre in board pixels (the capy face anchors here).
export function snakeHeadPoint(s: SimSnapshot, cell: number): { x: number; y: number } {
  const head = s.snake[0]!;
  const lerp = (a: number, b: number): number => a + (b - a) * s.tickAlpha;
  return { x: (lerp(s.headFrom.x, head.x) + 0.5) * cell, y: (lerp(s.headFrom.y, head.y) + 0.5) * cell };
}
```
Change the signature to `drawSnake(g, s, cell, p, gulp: number, drawFace = true)`, replace the `headPt` computation with `const headPt = snakeHeadPoint(s, cell);` (remove the now-unused `head` variable only if typecheck flags it; `last` stays), and wrap the eye loop: `if (drawFace) for (const side of [-1, 1]) { ... }`. Run the snake test → PASS, and `npx vitest run tests/game` to confirm existing render tests still pass.

- [ ] **Step 4: Create `src/game/art/capyTextures.ts`**

```ts
import type Phaser from 'phaser';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, capyBodyKey, capyBodySvg, capyHeadKey, capyHeadSvg, svgDataUrl, type CapySize } from './capyRig';

// ART-001 rasterise every capy expression (board + large) and body pose at load time.
export function preloadCapy(load: Phaser.Loader.LoaderPlugin): void {
  for (const e of CAPY_EXPRESSIONS) for (const size of Object.keys(CAPY_SIZES) as CapySize[])
    load.svg(capyHeadKey(e, size), svgDataUrl(capyHeadSvg(e)), { width: CAPY_SIZES[size], height: CAPY_SIZES[size] });
  for (const p of BODY_POSES)
    load.svg(capyBodyKey(p), svgDataUrl(capyBodySvg(p)), { width: CAPY_BODY_SIZE.w, height: CAPY_BODY_SIZE.h });
}
```

In `BootScene` add (import `preloadCapy`):
```ts
  // ART-001 capy textures are ready before any scene draws.
  preload(): void { preloadCapy(this.load); }
```

- [ ] **Step 5: Create `src/game/art/capyHead.ts`**

```ts
import type Phaser from 'phaser';
import type { SimSnapshot } from '../../core';
import { snakeHeadPoint } from '../render/snake';
import { capyHeadKey, CAPY_SIZES } from './capyRig';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimConfig, type CapyAnimState } from './capyPose';

const rnd = (): number => Math.random(); // presentation-only blink timing, never the sim RNG

// ART-001 front-facing capy face drawn over the snake head (position follows; the face never rotates with direction).
export class CapyHead {
  readonly image: Phaser.GameObjects.Image;
  private state: CapyAnimState;
  private readonly base: number;

  constructor(scene: Phaser.Scene, board: Phaser.GameObjects.Container, afterLayer: Phaser.GameObjects.GameObject,
    private readonly cfg: CapyAnimConfig, cell: number, private readonly reduced: boolean, now: number) {
    this.image = scene.add.image(0, 0, capyHeadKey('idle', 'board')).setOrigin(0.5).setName('capy-head');
    board.addAt(this.image, board.getIndex(afterLayer) + 1);
    this.base = (cell * cfg.headCellScale) / CAPY_SIZES.board;
    this.state = createCapyAnim(now, cfg, rnd);
  }

  eat(now: number): void { this.state = capyEat(this.state, now); }
  die(now: number): void { this.state = capyDie(this.state, now); }
  reset(now: number): void { this.state = createCapyAnim(now, this.cfg, rnd); }

  update(s: SimSnapshot, now: number, cell: number): void {
    const { state, pose } = capyPose(this.state, now, this.cfg, this.reduced, rnd);
    this.state = state;
    const pt = snakeHeadPoint(s, cell);
    this.image.setTexture(capyHeadKey(pose.expression, 'board'))
      .setPosition(pt.x, pt.y + pose.dy)
      .setScale(this.base * pose.scaleX, this.base * pose.scaleY)
      .setAngle(pose.rotationDeg);
  }
}
```

- [ ] **Step 6: Wire into `GameScene`** (import `CapyHead`; field `private capy!: CapyHead;`)
  - `create()`: right after `this.effects = new Effects(...)` add
    `this.capy = new CapyHead(this, this.board, this.layers.snake, this.balance.ui.capy, cellPx(this.balance), this.reduced, this.time.now);`
  - `handleEvents`: in `case 'ate'` add `this.capy.eat(this.time.now);`; in `case 'died'` add `this.capy.die(this.time.now);`.
  - `startRun()`: add `this.capy.reset(this.time.now);` after `this.effects.reset();`.
  - `draw()`: change to `drawSnake(this.layers.snake, snapshot, cell, p, this.effects.gulp, false);` and add after it `this.capy.update(snapshot, time, cell);`.
  - Check `this.time.now` vs the `time` passed to `draw` are the same clock (both Phaser scene time); if `draw` receives a different clock, use `time` everywhere for the capy.

- [ ] **Step 7: Verify in the browser** — `npm run dev`, open the printed URL, start a run: capy face sits on the head, blinks, opens/chews on each mango, shows X eyes and droops on death; no console errors. With OS "reduce motion" on: no breathing/droop, faces still swap.

- [ ] **Step 8: CHANGELOG + commit**

CHANGELOG: `- feat(game): capy face on the snake head (Boot rasterises capy SVGs; idle/eat/dead on the board)`.
```bash
npm test && npm run typecheck
git add src/game/art src/game/render/snake.ts src/game/scenes/BootScene.ts src/game/scenes/GameScene.ts tests/game/snakeHead.test.ts CHANGELOG.md
git commit -m "feat(game): capy face on the snake head"
```

---

### Task 4: Art preview page (`?debug=1&artPreview=1`)

**Files:**
- Modify: `src/game/flow/debugFlag.ts` (add `isArtPreview`), `src/game/scenes/BootScene.ts` (route), `src/game/main.ts` (register scene)
- Create: `src/game/scenes/ArtPreviewScene.ts`
- Test: `tests/game/debugFlag.test.ts` (append), `tests/game/boot.test.ts` (append)

**Interfaces:**
- Consumes: `capyHeadKey`, `capyBodyKey`, `CAPY_EXPRESSIONS`, `BODY_POSES`, `CAPY_SIZES`, `CAPY_BODY_SIZE` (Task 1); `createCapyAnim`, `capyEat`, `capyDie`, `capyPose` (Task 2); `label`, `button` from `src/game/scenes/ui.ts`; `WIDTH`, `HEIGHT` from `src/game/layout.ts`.
- Produces: `isArtPreview(search: string): boolean`; scene key `'ArtPreview'`.

- [ ] **Step 1: Failing tests** — append to `tests/game/debugFlag.test.ts`:

```ts
import { isArtPreview } from '../../src/game/flow/debugFlag';
it('ART-001 art preview needs debug=1 and artPreview=1', () => {
  expect(isArtPreview('?debug=1&artPreview=1')).toBe(true);
  expect(isArtPreview('?artPreview=1')).toBe(false);
  expect(isArtPreview('?debug=1')).toBe(false);
});
```
(merge the import into the file's existing import line.) Append to `tests/game/boot.test.ts`:

```ts
it('ART-001 Boot opens the art preview only with ?debug=1&artPreview=1', () => {
  vi.stubGlobal('window', { localStorage: { getItem: () => null }, location: { search: '?debug=1&artPreview=1' } });
  vi.stubGlobal('location', { search: '?debug=1&artPreview=1' });
  const started: string[] = [];
  const scene = new BootScene();
  Object.assign(scene, { registry: new Map(), scene: { start: (k: string) => started.push(k), launch() {} } });
  scene.create();
  expect(started).toEqual(['ArtPreview']);
});
```

- [ ] **Step 2: Run** — `npx vitest run tests/game/debugFlag.test.ts tests/game/boot.test.ts` → FAIL.

- [ ] **Step 3: Implement the flag and routing**

`debugFlag.ts`:
```ts
// ART-001 `?debug=1&artPreview=1` opens the capy preview page instead of Home.
export function isArtPreview(search: string): boolean {
  return isDebug(search) && new URLSearchParams(search).get('artPreview') === '1';
}
```
`BootScene.create()`: replace `this.scene.start('Home');` with
```ts
    const search = typeof location === 'undefined' ? '' : location.search;
    this.scene.start(isArtPreview(search) ? 'ArtPreview' : 'Home');
```
(The existing boot test stubs `window` without `location`; `typeof location` keeps it on `'Home'`.)
`main.ts`: add `ArtPreviewScene` to the `scene` array (after `ResultsScene`) and its import.

- [ ] **Step 4: Create `src/game/scenes/ArtPreviewScene.ts`**

```ts
import Phaser from 'phaser';
import type { Balance } from '../../core';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, capyBodyKey, capyHeadKey } from '../art/capyRig';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimState } from '../art/capyPose';
import { HEIGHT, WIDTH } from '../layout';
import { button, label } from './ui';

// Debug-only layout for the owner's phone check (ART-001 sizes 24 / 40 / 124 / 256 CSS px).
const PREVIEW = {
  light: 0xf6eedc, dark: 0x1f2433, cols: 4, cellW: 132, gridTop: 70, rowH: 92, small: 24, mid: 40,
  bigSize: 256, homeSize: 124, bodyW: 120, liveY: 700,
} as const;

export class ArtPreviewScene extends Phaser.Scene {
  private live!: Phaser.GameObjects.Image;
  private state!: CapyAnimState;
  constructor() { super('ArtPreview'); }

  // ART-001 every expression at 24 and 40 px on light and dark backgrounds, plus a live 256 px head and body poses.
  create(): void {
    const cfg = (this.registry.get('balance') as Balance).ui.capy;
    this.add.rectangle(0, 0, WIDTH / 2, HEIGHT, PREVIEW.light).setOrigin(0);
    this.add.rectangle(WIDTH / 2, 0, WIDTH / 2, HEIGHT, PREVIEW.dark).setOrigin(0);
    label(this, WIDTH / 2, 28, 'Capy preview', 24);
    CAPY_EXPRESSIONS.forEach((e, i) => {
      const x = (i % PREVIEW.cols) * PREVIEW.cellW + PREVIEW.cellW / 2, y = PREVIEW.gridTop + Math.floor(i / PREVIEW.cols) * PREVIEW.rowH;
      this.add.image(x - 22, y + 24, capyHeadKey(e, 'board')).setDisplaySize(PREVIEW.small, PREVIEW.small);
      this.add.image(x + 14, y + 24, capyHeadKey(e, 'board')).setDisplaySize(PREVIEW.mid, PREVIEW.mid);
      label(this, x, y + 62, e, 13);
    });
    const homeY = PREVIEW.gridTop + 3 * PREVIEW.rowH + 80;
    this.add.image(PREVIEW.homeSize / 2 + 16, homeY, capyHeadKey('idle', 'large')).setDisplaySize(PREVIEW.homeSize, PREVIEW.homeSize);
    BODY_POSES.forEach((p, i) => this.add.image(200 + i * (PREVIEW.bodyW + 30), homeY,
      capyBodyKey(p)).setDisplaySize(PREVIEW.bodyW, PREVIEW.bodyW * CAPY_BODY_SIZE.h / CAPY_BODY_SIZE.w));
    this.live = this.add.image(WIDTH / 2, PREVIEW.liveY, capyHeadKey('idle', 'large'));
    const base = PREVIEW.bigSize / CAPY_SIZES.large;
    this.state = createCapyAnim(this.time.now, cfg, Math.random);
    button(this, 90, HEIGHT - 50, 140, 56, 'Eat', 'preview-eat', () => { this.state = capyEat(this.state, this.time.now); });
    button(this, WIDTH / 2, HEIGHT - 50, 140, 56, 'Die', 'preview-die', () => { this.state = capyDie(this.state, this.time.now); });
    button(this, WIDTH - 90, HEIGHT - 50, 140, 56, 'Reset', 'preview-reset', () => { this.state = createCapyAnim(this.time.now, cfg, Math.random); });
    this.events.on(Phaser.Scenes.Events.UPDATE, (now: number) => {
      const { state, pose } = capyPose(this.state, now, cfg, false, Math.random);
      this.state = state;
      this.live.setTexture(capyHeadKey(pose.expression, 'large')).setScale(base * pose.scaleX, base * pose.scaleY)
        .setAngle(pose.rotationDeg).setY(PREVIEW.liveY + pose.dy * (PREVIEW.bigSize / 48));
    });
  }
}
```
The preview strings ("Capy preview", "Eat", "Die", "Reset") are debug-only, not player-facing, so they stay out of `text.ts`. If the 4-column grid overlaps the body row on the real canvas, adjust only the `PREVIEW` numbers.

- [ ] **Step 5: Run** — `npx vitest run tests/game/debugFlag.test.ts tests/game/boot.test.ts` → PASS; `npm run typecheck`. Then `npm run dev`, open `/?debug=1&artPreview=1`: 12 expressions on light and dark halves, a 124 px head, two body poses, a 256 px live head; Eat/Die/Reset work; no console errors.

- [ ] **Step 6: Docs + commit** — CODEMAP entry point row: add `Art preview | ?debug=1&artPreview=1 → src/game/scenes/ArtPreviewScene.ts`. CHANGELOG: `- feat(game): debug capy art preview page (\`?debug=1&artPreview=1\`)`.

```bash
npm test && npm run typecheck
git add src/game/flow/debugFlag.ts src/game/scenes/BootScene.ts src/game/scenes/ArtPreviewScene.ts src/game/main.ts tests/game/debugFlag.test.ts tests/game/boot.test.ts docs/CODEMAP.md CHANGELOG.md
git commit -m "feat(game): debug capy art preview page"
```

---

### Task 5: Verification, QA and merge

**Files:** Modify `docs/STATUS.md`, `docs/PLAYTEST.md` (QA note), `docs/specs/art/ART-001-character-coordinate-system.md` (§8: Q7 status unchanged; add "SVG capy shipped 2026-11-xx").

- [ ] **Step 1:** `npm test` then `npm run typecheck` — both pass; record the test count.
- [ ] **Step 2:** `npm run build` — no errors (bundle grows only by the SVG strings).
- [ ] **Step 3:** agy browser QA (do not run fuzz/bot at the same time — host RAM): Home → run → eat 3 mangoes → die; check capy visible, eat/dead animations, no console errors; open `/?debug=1&artPreview=1` and screenshot at 375 × 667 (5" phone). Record results in PLAYTEST as "P3c capy QA".
- [ ] **Step 4:** Update STATUS (Now: P3c capy merged, waiting for owner phone check of the preview page; Next keeps the P2 exit items), commit `docs: STATUS after P3c capy`.
- [ ] **Step 5:** `git checkout version/v0.2 && git merge --no-ff feat/capy-character-spec`, re-run `npm test` + `npm run typecheck` on the merge, then refresh GitNexus in the background: `node .gitnexus/run.cjs analyze --index-only --workers 2`.
