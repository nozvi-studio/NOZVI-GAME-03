import { expect, it } from 'vitest';
import { d3HudLayout } from '../../src/game/hud/d3HudLayout';
import { WIDTH } from '../../src/game/layout';
import { MIN_HIT, d3, d3Height, hitSize, ui } from '../../src/game/ui/layout';
import { headerButton } from '../../src/game/ui/menuLayout';
import { MENU } from '../../src/game/ui/menuMetrics';

it('UIFIX-R7 minimum hit is 48 CSS px on a 360 px wide phone (72 game px)', () => {
  expect(MIN_HIT).toBeCloseTo(72);
  expect(hitSize(ui(MENU.round))).toBeCloseTo(72);      // 44 mockup px = 61 px is below the minimum
  expect(hitSize(100)).toBe(100);                       // never shrinks a larger target
});
it('UIFIX-R7 Pause hit area is >= 48 CSS px and inside the canvas', () => {
  const p = d3HudLayout(d3Height(), false).pause, hit = hitSize(d3(p.w)), cx = d3(p.x + p.w / 2), cy = d3(p.y + p.h / 2);
  expect(hit).toBeGreaterThanOrEqual(MIN_HIT);
  expect(cy - hit / 2).toBeGreaterThanOrEqual(0); expect(cx + hit / 2).toBeLessThanOrEqual(WIDTH);
});
for (const side of ['left', 'right'] as const) it(`UIFIX-R7 ${side} header button (Settings gear / back) hit is >= 48 CSS px inside the top safe area`, () => {
  const b = headerButton(side);
  expect(b.hit).toBeGreaterThanOrEqual(MIN_HIT);
  expect(b.cy - b.hit / 2).toBeGreaterThanOrEqual(0);
  expect(b.cx - b.hit / 2).toBeGreaterThanOrEqual(0);
  expect(b.cx + b.hit / 2).toBeLessThanOrEqual(WIDTH);
});
it('UIFIX-R7 header buttons keep the mockup centres', () => {
  expect(headerButton('left').cx).toBeCloseTo(ui(MENU.side + MENU.round / 2));
  expect(headerButton('right').cx).toBeCloseTo(WIDTH - ui(MENU.side + MENU.round / 2));
  expect(headerButton('left').cy).toBeCloseTo(ui(MENU.padTop + MENU.round / 2));
});
