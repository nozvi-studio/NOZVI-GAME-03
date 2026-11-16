import { afterEach, describe, expect, it } from 'vitest';
import { d3HudLayout } from '../../src/game/hud/d3HudLayout';
import { BOARD, HEIGHT, setHeight, VIEW, WIDTH } from '../../src/game/layout';
import { previewRects } from '../../src/game/ui/artPreviewLayout';
import { d3, d3Height } from '../../src/game/ui/layout';

const boardBottomMock = (): number => (BOARD.y + BOARD.size) * 360 / WIDTH;
afterEach(() => setHeight(VIEW.minH));

describe.each([960, 1170])('D3-R7 layouts at HEIGHT %i', (h) => {
  it(`D3-R7 HUD fits inside the canvas below the board at ${h}`, () => {
    setHeight(h);
    for (const dpad of [false, true]) {
      const l = d3HudLayout(d3Height(), dpad), rs = [l.skills[0], l.skills[1], ...(l.dpad ? [l.dpad.up, l.dpad.down] : [])];
      expect(l.energy.bar.y).toBeGreaterThanOrEqual(boardBottomMock());
      for (const r of rs) expect(d3(r.y + r.h)).toBeLessThanOrEqual(HEIGHT);
    }
  });
  it(`D3-R7 art preview boxes stay inside the canvas at ${h}`, () => {
    setHeight(h);
    const r = previewRects();
    for (const b of [...r.widgets, r.live, r.remotion]) {
      expect(b.x0).toBeGreaterThanOrEqual(0); expect(b.x1).toBeLessThanOrEqual(WIDTH);
      expect(b.y1).toBeLessThanOrEqual(HEIGHT);
    }
  });
  it(`D3-R7 the board never grows at ${h}`, () => {
    setHeight(h);
    expect(BOARD.x).toBeCloseTo(d3(10)); expect(BOARD.y).toBeCloseTo(d3(112)); expect(BOARD.size).toBeCloseTo(d3(340));
  });
});
