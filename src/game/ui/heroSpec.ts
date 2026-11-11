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
