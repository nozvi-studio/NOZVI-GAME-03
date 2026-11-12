import { describe, expect, it } from 'vitest';
import { chevronPose, pruneTrail, pushTrail, segAlpha, trailOn, type TrailPt } from '../../src/game/render/steerFxModel';
const c = { trailMs: 120, trailAlpha: 0.5, chevronMs: 160 };

describe('D3-R25 steer trail', () => {
  it('D3-R25 keeps only the last trailMs of the path', () => {
    const buf: TrailPt[] = [];
    for (let t = 0; t <= 300; t += 20) pushTrail(buf, { x: t, y: 0, t }, c.trailMs);
    expect(buf[buf.length - 1]!.t).toBe(300);
    expect(buf.filter(p => p.t < 300 - c.trailMs).length).toBeLessThanOrEqual(1);
  });
  it('D3-R25 prune empties the buffer once the finger stops', () => {
    const buf: TrailPt[] = [{ x: 0, y: 0, t: 0 }, { x: 5, y: 0, t: 10 }];
    pruneTrail(buf, 500, c.trailMs);
    expect(buf).toHaveLength(0);
  });
  it('D3-R25 segment alpha fades from trailAlpha to 0 with age', () => {
    expect(segAlpha(100, 100, c)).toBeCloseTo(0.5);
    expect(segAlpha(40, 100, c)).toBeCloseTo(0.25);
    expect(segAlpha(0, 200, c)).toBe(0);
  });
});

describe('D3-R25/R28 chevron', () => {
  it('D3-R25 lives chevronMs then disappears', () => {
    expect(chevronPose(0, false, c, 1.2)).not.toBeNull();
    expect(chevronPose(160, false, c, 1.2)).toBeNull();
  });
  it('D3-R25 pops above scale 1 early in its life', () => {
    const peak = Math.max(...[10, 20, 30, 40, 50, 60].map(e => chevronPose(e, false, c, 1.2)!.scale));
    expect(peak).toBeGreaterThan(1);
  });
  it('D3-R28 reduced motion: no pop, alpha fade only', () => {
    for (const e of [0, 40, 80, 120]) expect(chevronPose(e, true, c, 1.2)!.scale).toBe(1);
    expect(chevronPose(120, true, c, 1.2)!.alpha).toBeLessThan(chevronPose(0, true, c, 1.2)!.alpha);
  });
  it('D3-R28 reduced motion has no trail', () => {
    expect(trailOn(true)).toBe(false); expect(trailOn(false)).toBe(true);
  });
});
