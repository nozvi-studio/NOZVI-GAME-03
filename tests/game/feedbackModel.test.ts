import { describe, expect, it } from 'vitest';
import { borderColor, feedbackScales, halfMotionCfg, hasHover, isRejected, knobX, trackColor, type FeedbackKind } from '../../src/game/ui/feedbackModel';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().motion;
const KINDS: FeedbackKind[] = ['pill', 'round', 'card', 'switch', 'hudButton'];

describe('MOT-1 feedback model', () => {
  it('MOT-1-R3 scales keep release > 1 > press and stay inside (0, 2) for every kind', () => {
    for (const k of KINDS) {
      const s = feedbackScales(k, cfg);
      expect(s.release).toBeGreaterThan(1); expect(s.press).toBeLessThan(1); expect(s.hover).toBeGreaterThan(1);
      for (const v of [s.press, s.release, s.hover]) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(2); }
    }
  });
  it('MOT-1-R3 full-delta kinds use the balance keys and card uses half deltas derived from them', () => {
    expect(feedbackScales('pill', cfg)).toEqual({ press: cfg.pressScale, release: cfg.releaseOvershoot, hover: cfg.hoverScale });
    const c = feedbackScales('card', cfg);
    expect(c.press).toBeCloseTo(1 - (1 - cfg.pressScale) / 2, 10);
    expect(c.release).toBeCloseTo(1 + (cfg.releaseOvershoot - 1) / 2, 10);
    expect(c.hover).toBeCloseTo(1 + (cfg.hoverScale - 1) / 2, 10);
  });
  it('MOT-1-R3 halfMotionCfg changes only the three scales', () => {
    const h = halfMotionCfg(cfg), s = feedbackScales('card', cfg);
    expect(h).toEqual({ ...cfg, pressScale: s.press, releaseOvershoot: s.release, hoverScale: s.hover });
  });
  it('MOT-1-R3 hover applies to pill, round and card only', () => {
    expect(KINDS.filter(hasHover)).toEqual(['pill', 'round', 'card']);
  });
  it('MOT-1-R8 knobX endpoints are exact and the slide is monotone', () => {
    expect(knobX(true, 0, 10)).toBe(-10); expect(knobX(true, 1, 10)).toBe(10);
    expect(knobX(false, 0, 10)).toBe(10); expect(knobX(false, 1, 10)).toBe(-10);
    const xs = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => knobX(true, t, 10));
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]!);
    expect(knobX(true, 9, 10)).toBe(10); expect(knobX(true, -9, 10)).toBe(-10);
  });
  it('MOT-1-R8 trackColor endpoints are exact, the middle is the channel average, borderColor steps at 0.5', () => {
    expect(trackColor(0x112233, 0xaabbcc, 0)).toBe(0x112233); expect(trackColor(0x112233, 0xaabbcc, 1)).toBe(0xaabbcc);
    expect(trackColor(0x000000, 0x0000fe, 0.5)).toBe(0x00007f);
    expect(borderColor(1, 2, 0.49)).toBe(1); expect(borderColor(1, 2, 0.5)).toBe(2);
  });
  it('MOT-1-R11 isRejected is true only for the same state object', () => {
    const a = { n: 1 };
    expect(isRejected(a, a)).toBe(true); expect(isRejected(a, { ...a })).toBe(false);
  });
  it('MOT-1 balance.motion carries the two keys this feature relies on', () => {
    expect(cfg.toggleSlideMs).toBe(160); expect(cfg.disabledAlpha).toBe(0.45);
  });
});
