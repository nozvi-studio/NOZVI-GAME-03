import { afterEach, describe, expect, it } from 'vitest';
import { hudLayout } from '../../src/game/hud/hudLayout';
import { BOARD, HEIGHT, setHeight, VIEW, WIDTH } from '../../src/game/layout';
import { previewRects } from '../../src/game/ui/artPreviewLayout';
import { layoutColumn } from '../../src/game/ui/layout';
import { bootColumn, loadoutColumn, resultsColumn, settingsColumn } from '../../src/game/ui/menuLayout';

const MIN = 0.85; // balance.ui.minShrink
afterEach(() => setHeight(VIEW.minH));

describe.each([960, 1170])('D3-R7 layouts at HEIGHT %i', (h) => {
  it(`D3-R7 HUD fits inside the canvas below the board at ${h}`, () => {
    setHeight(h);
    for (const dpad of [false, true]) {
      const l = hudLayout(dpad);
      expect(l.chip.y).toBeGreaterThanOrEqual(BOARD.y + BOARD.size);
      for (const s of l.skills) {
        expect(l.chip.y + l.chip.h).toBeLessThanOrEqual(s.groupTop);
        expect(s.costY + s.costH).toBeLessThanOrEqual(HEIGHT);
      }
      if (l.dpad) expect(l.dpad.y + l.dpad.size).toBeLessThanOrEqual(HEIGHT);
    }
  });
  it(`D3-R7 every menu column fits without shrinking below minShrink at ${h}`, () => {
    setHeight(h);
    const specs = [
      loadoutColumn(MIN), loadoutColumn(MIN, true), settingsColumn(MIN),
      resultsColumn({ banner: true, energy: true }, MIN), resultsColumn({ banner: false, energy: false }, MIN),
      bootColumn(MIN),
    ];
    for (const s of specs) {
      const c = layoutColumn(s);
      expect(c.fits).toBe(true);
      expect(c.bottomY).toBeLessThanOrEqual(HEIGHT);
      expect(c.middleY).toBeGreaterThanOrEqual(0);
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
    expect(BOARD).toEqual({ x: 18, y: 152, size: 504 });
  });
});
