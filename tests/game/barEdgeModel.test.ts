import { describe, expect, it } from 'vitest';
import { edgeAlpha, flashAlpha, quotaFilled, readySweep } from '../../src/game/ui/barEdgeModel';
describe('D3-R27 value changes', () => {
  it('D3-R27 leading edge is bright while moving and fades after the fill stops', () => {
    expect(edgeAlpha(0, { edgeAlpha: 0.6 }, 200)).toBeCloseTo(0.6);
    expect(edgeAlpha(100, { edgeAlpha: 0.6 }, 200)).toBeCloseTo(0.3);
    expect(edgeAlpha(250, { edgeAlpha: 0.6 }, 200)).toBe(0);
  });
  it('D3-R27 mango bar flashes once when it fills', () => {
    expect(quotaFilled(0.8, 1)).toBe(true);
    expect(quotaFilled(1, 1)).toBe(false);
    expect(quotaFilled(1, 0)).toBe(false);
    expect(flashAlpha(0, 260)).toBe(1); expect(flashAlpha(260, 260)).toBe(0);
  });
  it('D3-R27/R28 ready sweep on off->ready only, never under reduced motion', () => {
    expect(readySweep('pop', false)).toBe(true);
    expect(readySweep('dip', false)).toBe(false);
    expect(readySweep('pop', true)).toBe(false);
  });
});
