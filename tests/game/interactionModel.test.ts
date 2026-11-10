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
