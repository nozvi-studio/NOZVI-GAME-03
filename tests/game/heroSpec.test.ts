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
