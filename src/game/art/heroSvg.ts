// D4-P2-R2 pure full-body hero SVG generator: soft shadow, tapered S-curve body, embedded head on neck pivot. No Phaser/DOM.
import { ART, fmt, headLayersSvg, type CapyExpression } from './capyRig';
import { SKIN_PALETTES, type SkinId } from './skins';

export interface Pt { x: number; y: number }
export interface CubicCurve { p0: Pt; c1: Pt; c2: Pt; p3: Pt }

// D4-P2-R2 hero layout in viewBox units (geometry, not tuning).
export const HERO = {
  viewBox: { w: 220, h: 150 },
  headScale: 1.6,
  neck: { x: 70, y: 92 },
  headAnchor: { x: 24, y: 40 },
  spine: { p0: { x: 70, y: 96 }, c1: { x: 118, y: 126 }, c2: { x: 152, y: 78 }, p3: { x: 198, y: 102 } } as CubicCurve,
  widthNeck: 36,
  widthTail: 16,
  samples: 24,
  belly: { ratio: 0.38 },
  shadow: { cx: 120, cy: 138, rx: 86, ry: 8 },
} as const;

export function bezierPoint(c: CubicCurve, t: number): Pt {
  const u = 1 - t;
  const u2 = u * u, t2 = t * t;
  return {
    x: u2 * u * c.p0.x + 3 * u2 * t * c.c1.x + 3 * u * t2 * c.c2.x + t2 * t * c.p3.x,
    y: u2 * u * c.p0.y + 3 * u2 * t * c.c1.y + 3 * u * t2 * c.c2.y + t2 * t * c.p3.y,
  };
}

export function bezierTangent(c: CubicCurve, t: number): Pt {
  const u = 1 - t;
  const dx = 3 * u * u * (c.c1.x - c.p0.x) + 6 * u * t * (c.c2.x - c.c1.x) + 3 * t * t * (c.p3.x - c.c2.x);
  const dy = 3 * u * u * (c.c1.y - c.p0.y) + 6 * u * t * (c.c2.y - c.c1.y) + 3 * t * t * (c.p3.y - c.c2.y);
  const len = Math.hypot(dx, dy);
  if (!(len > 1e-6)) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

// D4-P2-R2 seamless tapered body ribbon from neck (w0) to tail (w1).
export function taperedRibbon(c: CubicCurve, w0: number, w1: number, samples: number): { left: Pt[]; right: Pt[]; path: string } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const steps = Math.max(2, samples);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = bezierPoint(c, t);
    const tg = bezierTangent(c, t);
    const nx = -tg.y, ny = tg.x;
    const half = (w0 + (w1 - w0) * t) / 2;
    left.push({ x: p.x + nx * half, y: p.y + ny * half });
    right.push({ x: p.x - nx * half, y: p.y - ny * half });
  }
  const rTail = w1 / 2;
  const rNeck = w0 / 2;
  const l0 = left[0]!, rEnd = right[steps]!, lEnd = left[steps]!, r0 = right[0]!;
  let d = `M${fmt(l0.x)} ${fmt(l0.y)}`;
  for (let i = 1; i <= steps; i++) d += ` L${fmt(left[i]!.x)} ${fmt(left[i]!.y)}`;
  d += ` A${fmt(rTail)} ${fmt(rTail)} 0 0 1 ${fmt(rEnd.x)} ${fmt(rEnd.y)}`;
  for (let i = steps - 1; i >= 0; i--) d += ` L${fmt(right[i]!.x)} ${fmt(right[i]!.y)}`;
  d += ` A${fmt(rNeck)} ${fmt(rNeck)} 0 0 1 ${fmt(l0.x)} ${fmt(l0.y)} Z`;
  void lEnd;
  return { left, right, path: d };
}

export function heroHeadTransform(): string {
  const tx = HERO.neck.x - HERO.headAnchor.x * HERO.headScale;
  const ty = HERO.neck.y - HERO.headAnchor.y * HERO.headScale;
  return `translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(HERO.headScale)})`;
}

function bodyMarkings(skin: SkinId): string {
  const P = SKIN_PALETTES[skin];
  if (skin === 'ginger') {
    const ts = [0.28, 0.48, 0.68];
    const segs = ts.map(t => {
      const p = bezierPoint(HERO.spine, t);
      const tg = bezierTangent(HERO.spine, t);
      const nx = -tg.y, ny = tg.x;
      const w = (HERO.widthNeck + (HERO.widthTail - HERO.widthNeck) * t) * 0.28;
      return `M${fmt(p.x - nx * w)} ${fmt(p.y - ny * w)}L${fmt(p.x + nx * w)} ${fmt(p.y + ny * w)}`;
    }).join('');
    return `<path data-part="body-stripe" d="${segs}" fill="none" stroke="${ART.cat.stripeFill}" stroke-width="3.6" stroke-linecap="round"/>`;
  }
  if (skin === 'tuxedo') {
    const p = bezierPoint(HERO.spine, 0.22);
    return `<ellipse data-part="body-blaze" cx="${fmt(p.x)}" cy="${fmt(p.y)}" rx="12" ry="7" fill="${P.muzzle}"/>`;
  }
  if (skin === 'pup') {
    const p = bezierPoint(HERO.spine, 0.45);
    return `<ellipse data-part="body-patch" cx="${fmt(p.x)}" cy="${fmt(p.y - 4)}" rx="11" ry="6" fill="${P.ears}" opacity="0.65"/>`;
  }
  if (skin === 'snake') {
    const dots = [0.3, 0.52, 0.74].map(t => {
      const p = bezierPoint(HERO.spine, t);
      return `<circle data-part="scale-dot" cx="${fmt(p.x)}" cy="${fmt(p.y - 3)}" r="2.8" fill="${P.crown}"/>`;
    }).join('');
    return dots;
  }
  return '';
}

// D4-P2-R2 unified hero: shadow, tapered body, head on the neck pivot.
// Note: headLayersSvg emits an inner data-layer="head"; HeroStage selects the outer head group with [data-hero-head].
export function heroSvg(skin: SkinId, expression: CapyExpression = 'idle'): string {
  const P = SKIN_PALETTES[skin];
  const body = taperedRibbon(HERO.spine, HERO.widthNeck, HERO.widthTail, HERO.samples);
  const belly = taperedRibbon(HERO.spine, HERO.widthNeck * HERO.belly.ratio, HERO.widthTail * HERO.belly.ratio, HERO.samples);
  const sw = fmt(P.stroke * HERO.headScale);
  const origin = `${HERO.neck.x}px ${HERO.neck.y}px`;
  const sh = HERO.shadow;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HERO.viewBox.w} ${HERO.viewBox.h}" data-skin="${skin}" data-hero="1">`
    + `<g data-layer="shadow"><ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" fill="${P.outline}" opacity="0.14"/></g>`
    + `<g data-layer="body" style="transform-origin: ${origin}">`
    + `<path data-part="body" d="${body.path}" fill="${P.faceBottom}" stroke="${P.outline}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<path data-part="belly" d="${belly.path}" fill="${P.muzzle}" opacity="0.72"/>`
    + bodyMarkings(skin)
    + '</g>'
    + `<g data-layer="head" data-hero-head="1" style="transform-origin: ${origin}">`
    + `<g transform="${heroHeadTransform()}">${headLayersSvg(skin, expression)}</g>`
    + '</g></svg>';
}
