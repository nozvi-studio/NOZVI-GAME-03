import { afterEach, describe, expect, it } from 'vitest';
import { HEIGHT, setHeight, VIEW } from '../../src/game/layout';
import { initViewport, setBandColor, viewHeight } from '../../src/game/viewport';

afterEach(() => setHeight(VIEW.minH));

describe('D3-R7 viewport height', () => {
  it('D3-R7 viewHeight follows the aspect and clamps to 960..1200', () => {
    expect(viewHeight(360, 640)).toBe(960);
    expect(viewHeight(390, 844)).toBe(1169);
    expect(viewHeight(412, 915)).toBe(1199);
    expect(viewHeight(360, 900)).toBe(1200);
    expect(viewHeight(800, 600)).toBe(960);
  });
  it('D3-R7 viewHeight falls back to 960 on a zero or missing size', () => {
    expect(viewHeight(0, 0)).toBe(960);
    expect(viewHeight(NaN, 800)).toBe(960);
  });
  it('D3-R7 initViewport sets the live HEIGHT binding', () => {
    expect(initViewport({ innerWidth: 390, innerHeight: 844 })).toBe(1169);
    expect(HEIGHT).toBe(1169);
  });
  it('D3-R7 setBandColor is a no-op without a document', () => {
    expect(() => setBandColor('#1F86D8')).not.toThrow();
  });
});
