import { expect, it } from 'vitest';
import { bannerStripRect, skillTipPlacement, stripRows, STRIP_MOCK } from '../../src/game/hud/hudLayout';
import { cellPx } from '../../src/game/layout';
import { loadBalance } from '../support/balance';
import { BOARD, WIDTH } from '../../src/game/layout';
import { d3, d3Height, ui } from '../../src/game/ui/layout';
import { d3HudLayout } from '../../src/game/hud/d3HudLayout';

it('BAND-R1 banner strip sits in the band above the board: board wide, 30 board px high, never on a board cell', () => {
  const r = bannerStripRect();
  expect(r.x).toBe(BOARD.x); expect(r.w).toBe(BOARD.size); expect(r.h).toBe(d3(30));
  expect(r.y + r.h + d3(7)).toBeCloseTo(BOARD.y); expect(r.y + r.h).toBeLessThan(BOARD.y); expect(STRIP_MOCK.alpha).toBeCloseTo(0.85);
});
it('UIFIX-R1 strip rows (title + one sub line) fit inside the strip height', () => {
  const r = bannerStripRect();
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
