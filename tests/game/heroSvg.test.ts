import { describe, expect, it } from 'vitest';
import { ART, headLayersSvg } from '../../src/game/art/capyRig';
import { HERO, bezierPoint, bezierTangent, heroHeadTransform, heroSvg, taperedRibbon, type Pt } from '../../src/game/art/heroSvg';
import { SKIN_IDS } from '../../src/game/art/skins';

function cross(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const c1 = cross(a, b, c), c2 = cross(a, b, d), c3 = cross(c, d, a), c4 = cross(c, d, b);
  return ((c1 > 0 && c2 < 0) || (c1 < 0 && c2 > 0)) && ((c3 > 0 && c4 < 0) || (c3 < 0 && c4 > 0));
}

describe('D4-P2-R2 tapered ribbon', () => {
  it('D4-P2-R2 bezierPoint hits both end points', () => {
    expect(bezierPoint(HERO.spine, 0)).toEqual(HERO.spine.p0);
    expect(bezierPoint(HERO.spine, 1)).toEqual(HERO.spine.p3);
  });

  it('D4-P2-R2 ribbon width tapers monotonically from neck to tail', () => {
    const r = taperedRibbon(HERO.spine, HERO.widthNeck, HERO.widthTail, HERO.samples);
    const widths = r.left.map((l, i) => Math.hypot(l.x - r.right[i]!.x, l.y - r.right[i]!.y));
    expect(widths[0]).toBeCloseTo(HERO.widthNeck, 4);
    expect(widths[widths.length - 1]).toBeCloseTo(HERO.widthTail, 4);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]!).toBeLessThanOrEqual(widths[i - 1]! + 1e-6);
    }
  });

  it('D4-P2-R2 ribbon edges never self-intersect and stay inside viewBox', () => {
    const r = taperedRibbon(HERO.spine, HERO.widthNeck, HERO.widthTail, HERO.samples);
    for (const poly of [r.left, r.right]) {
      for (const p of poly) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(HERO.viewBox.w);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(HERO.viewBox.h);
      }
      for (let i = 0; i < poly.length - 1; i++) {
        for (let j = i + 2; j < poly.length - 1; j++) {
          expect(segmentsIntersect(poly[i]!, poly[i + 1]!, poly[j]!, poly[j + 1]!)).toBe(false);
        }
      }
    }
    for (let i = 0; i < r.left.length - 1; i++) {
      for (let j = 0; j < r.right.length - 1; j++) {
        expect(segmentsIntersect(r.left[i]!, r.left[i + 1]!, r.right[j]!, r.right[j + 1]!)).toBe(false);
      }
    }
  });

  it('D4-P2-R2 ribbon path has no NaN, is closed, and degenerate tangent falls back safely', () => {
    const r = taperedRibbon(HERO.spine, HERO.widthNeck, HERO.widthTail, HERO.samples);
    expect(r.path.endsWith('Z')).toBe(true);
    expect(r.path).not.toMatch(/NaN|Infinity/);
    const deg = { p0: { x: 10, y: 10 }, c1: { x: 10, y: 10 }, c2: { x: 10, y: 10 }, p3: { x: 10, y: 10 } };
    expect(bezierTangent(deg, 0)).toEqual({ x: 1, y: 0 });
  });
});

describe('D4-P2-R2 hero svg', () => {
  for (const skin of SKIN_IDS) {
    it(`D4-P2-R2 ${skin} hero has viewBox 0 0 220 150, ordered layers, and embeds headLayersSvg`, () => {
      const svg = heroSvg(skin, 'win');
      expect(svg).toContain('viewBox="0 0 220 150"');
      const iShadow = svg.indexOf('data-layer="shadow"');
      const iBody = svg.indexOf('data-layer="body"');
      const iHead = svg.indexOf('data-hero-head="1"');
      expect(iShadow).toBeGreaterThan(-1);
      expect(iBody).toBeGreaterThan(iShadow);
      expect(iHead).toBeGreaterThan(iBody);
      expect(svg).toContain(headLayersSvg(skin, 'win'));
      expect(svg).toContain(`transform-origin: ${HERO.neck.x}px ${HERO.neck.y}px`);
    });
  }

  it('D4-P2-R2 neck joint is covered by the mapped head face bounds and default expression is idle', () => {
    const m = heroHeadTransform().match(/translate\(([-\d.]+)\s+([-\d.]+)\)\s+scale\(([-\d.]+)\)/);
    expect(m).not.toBeNull();
    const tx = Number(m![1]), ty = Number(m![2]), s = Number(m![3]);
    const minX = tx + ART.head.x * s;
    const maxX = tx + (ART.head.x + ART.head.w) * s;
    const minY = ty + ART.head.y * s;
    const maxY = ty + (ART.head.y + ART.head.h) * s;
    expect(HERO.spine.p0.x).toBeGreaterThanOrEqual(minX);
    expect(HERO.spine.p0.x).toBeLessThanOrEqual(maxX);
    expect(HERO.spine.p0.y).toBeGreaterThanOrEqual(minY);
    expect(HERO.spine.p0.y).toBeLessThanOrEqual(maxY);
    expect(heroSvg('capy')).toBe(heroSvg('capy', 'idle'));
  });
});
