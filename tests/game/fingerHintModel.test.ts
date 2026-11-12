import { describe, expect, it } from 'vitest';
import { fingerPose, fingerShown } from '../../src/game/hud/fingerHintModel';
const c = { hintLoopMs: 1000, hintTravelPx: 40 };
describe('D3-R26 finger hint', () => {
  it('D3-R26 travels from 0 to hintTravelPx and loops', () => {
    expect(fingerPose(0, false, c).dx).toBe(0);
    expect(fingerPose(700, false, c).dx).toBeCloseTo(40);
    expect(fingerPose(1000, false, c).dx).toBe(fingerPose(0, false, c).dx);
  });
  it('D3-R26 is pressed while travelling and hidden at the end of the loop', () => {
    expect(fingerPose(400, false, c).press).toBe(true);
    expect(fingerPose(950, false, c).alpha).toBe(0);
  });
  it('D3-R26 touch only, with a hint slot, while waiting', () => {
    expect(fingerShown(true, true, true)).toBe(true);
    expect(fingerShown(false, true, true)).toBe(false);
    expect(fingerShown(true, false, true)).toBe(false);   // C3 D-pad mode
    expect(fingerShown(true, true, false)).toBe(false);
  });
  it('D3-R28 reduced motion shows a static glyph', () => {
    for (const t of [0, 300, 700, 950]) expect(fingerPose(t, true, c)).toEqual({ dx: 0, alpha: 1, press: false });
  });
});
