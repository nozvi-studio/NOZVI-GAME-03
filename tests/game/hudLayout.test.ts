import { expect, it } from 'vitest';
import { bannerStripRect, skillTipPlacement, stripRows, STRIP_MOCK } from '../../src/game/hud/hudLayout';
import { cellPx } from '../../src/game/layout';
import { loadBalance } from '../support/balance';
import { BOARD, WIDTH } from '../../src/game/layout';
import { d3, d3Height, ui } from '../../src/game/ui/layout';
import { d3HudLayout } from '../../src/game/hud/d3HudLayout';

it('UIFIX-R1 banner strip is flush with the board top edge, board wide, ~1.5 cells high', () => {
  const b = loadBalance(), r = bannerStripRect(b.board.cols);
  expect(r.x).toBe(BOARD.x); expect(r.y).toBe(BOARD.y); expect(r.w).toBe(BOARD.size);
  expect(r.h).toBeCloseTo(1.5 * cellPx(b), 5); expect(STRIP_MOCK.alpha).toBeCloseTo(0.85);
});
it('UIFIX-R1 strip rows (title + one sub line) fit inside the strip height', () => {
  const r = bannerStripRect(loadBalance().board.cols);
  const two = stripRows(true, r.h), one = stripRows(false, r.h);
  expect(two.titleY).toBeGreaterThanOrEqual(0); expect(two.subY!).toBeGreaterThan(two.titleY);
  expect(two.subY! + ui(STRIP_MOCK.sub)).toBeLessThanOrEqual(r.h);
  expect(one.subY).toBeNull(); expect(one.titleY + ui(STRIP_MOCK.title)).toBeLessThanOrEqual(r.h);
});

for (const slot of [0, 1] as const) it(`UIFIX-R2 reject toast for slot ${slot} sits above the button, inside the screen, never over the board`, () => {
  const l = d3HudLayout(d3Height(), true), m = { margin: ui(16), tailLeft: ui(50), tailGap: ui(11) };
  for (const h of [ui(46), ui(60), ui(120)]) {
    const p = skillTipPlacement(l, slot, ui(200), h, m);
    expect(p.y).toBeGreaterThanOrEqual(BOARD.y + BOARD.size);        // never over the board
    expect(p.x).toBeGreaterThanOrEqual(m.margin); expect(p.x + ui(200)).toBeLessThanOrEqual(WIDTH - m.margin);
  }
  const p = skillTipPlacement(l, slot, ui(200), ui(46), m);
  expect(p.y + ui(46) + m.tailGap).toBeLessThanOrEqual(d3(l.skills[slot].y) + 0.001);  // above the button group when it fits
});

it('UIFIX-R2 reject toast bubble bottom stays above the skill group top when the board-to-skills gap fits the toast', () => {
  const l = d3HudLayout(d3Height(), true), boardBottom = BOARD.y + BOARD.size, tail = ui(11), h = ui(46);
  for (const slot of [0, 1] as const) {
    const gap = d3(l.skills[slot].y) - boardBottom, p = skillTipPlacement(l, slot, ui(200), h, { margin: ui(16), tailLeft: ui(50), tailGap: tail });
    expect(p.y).toBeGreaterThanOrEqual(boardBottom);                                  // board clamp always wins
    if (gap >= h + tail) expect(p.y + h).toBeLessThanOrEqual(d3(l.skills[slot].y)); // no overlap with the button
  }
});
