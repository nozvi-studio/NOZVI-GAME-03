import { describe, expect, it } from 'vitest';
import { setHeight } from '../../src/game/layout';
import { d3, d3Height, d3m } from '../../src/game/ui/layout';
import { homeRects } from '../../src/game/ui/menuLayout';

describe('D3 mock px scale', () => {
  it('D3-R7 d3Height is 640 at canvas 960 and 780 at 1170', () => {
    try {
      setHeight(960); expect(d3Height()).toBeCloseTo(640);
      setHeight(1170); expect(d3Height()).toBeCloseTo(780);
    } finally { setHeight(960); }
  });
  it('D3-R11 PLAY is centred on the canvas', () => {
    const r = homeRects(640, { start: true, stepper: false, l1: true, loadout: true, hint: false }).play;
    expect(d3(r.x + r.w / 2)).toBeCloseTo(270);
    expect(d3(r.w)).toBeCloseTo(420);
  });
  it('D3-R11 d3m maps 360 to the 390 mock width', () => { expect(d3m(360)).toBeCloseTo(390); });
});
