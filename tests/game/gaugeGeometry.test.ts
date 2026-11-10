import { expect, it } from 'vitest';
import { chargeSegment } from '../../src/game/hud/gaugeGeometry';

const area = (p: readonly { x: number; y: number }[]): number => {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[i]!, n = p[(i + 1) % p.length]!; a += q.x * n.y - n.x * q.y; }
  return Math.abs(a) / 2;
};
it('UIFIX-R12 chargeSegment is empty at charge 0 and the full disc at charge 1', () => {
  expect(chargeSegment(10, 0, 48)).toEqual([]);
  expect(area(chargeSegment(10, 1, 96))).toBeGreaterThan(Math.PI * 100 * 0.99);
});
it('UIFIX-R12 chargeSegment area grows monotonically and stays inside the radius', () => {
  let prev = 0;
  for (const c of [0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const pts = chargeSegment(10, c, 64), a = area(pts);
    expect(a).toBeGreaterThan(prev); prev = a;
    for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(10 + 1e-9);
  }
  expect(area(chargeSegment(10, 0.5, 256))).toBeCloseTo(Math.PI * 50, 0);
});
