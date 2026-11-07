import { expect, it } from 'vitest';
import { layoutColumn, ui } from '../../src/game/ui/layout';
import { MENU } from '../../src/game/ui/menuMetrics';
import { bootColumn, homeColumn, loadoutColumn, logoLetters, resultsCardTop, resultsColumn, settingsColumn, smoothPath } from '../../src/game/ui/menuLayout';
const MIN = 0.85; // balance.ui.minShrink

it('P3b3-R3 every Home variant fits at 540x960 without shrinking below minShrink', () => {
  for (const compact of [true, false]) for (const stepper of [true, false]) for (const extras of [true, false]) for (const hint of [true, false]) {
    const l = layoutColumn(homeColumn({ compact, stepper, extras, hint }, MIN));
    expect(l.fits, JSON.stringify({ compact, stepper, extras, hint, s: l.middleScale })).toBe(true);
    expect(l.middleScale).toBeGreaterThanOrEqual(MIN);
  }
});
it('P3b3-R3 Loadout, Settings, Results and Boot fit', () => {
  expect(layoutColumn(loadoutColumn(MIN)).fits).toBe(true);
  expect(layoutColumn(settingsColumn(MIN)).fits).toBe(true);
  expect(layoutColumn(bootColumn(MIN)).fits).toBe(true);
  for (const banner of [true, false]) for (const energy of [true, false])
    expect(layoutColumn(resultsColumn({ banner, energy }, MIN)).fits).toBe(true);
});
it('P3b3-R3 the worst Loadout column keeps controls at scale >= 0.85', () => {
  expect(layoutColumn(loadoutColumn(MIN)).middleScale).toBeGreaterThanOrEqual(0.85);
});
it('P3b3-R13 logo letters alternate tilt and cycle the mockup colours', () => {
  const a = logoLetters('MANGO', 0);
  expect(a.map(l => l.ch).join('')).toBe('MANGO');
  expect(a.map(l => l.color)).toEqual(['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5']);
  expect(a.map(l => l.rotDeg)).toEqual([-3, 3, -3, 3, -3]);
  expect(a.map(l => l.dy)).toEqual([-2, 2, -2, 2, -2]);
  expect(logoLetters('SNAKE', 2).map(l => l.color)).toEqual(['#8CC9F0', '#97DB9B', '#C6B0F5', '#F79DBB', '#F8D468']);
});
it('P3b3-R13 a space is a gap that does not consume a colour', () => {
  const g = logoLetters('GAME OVER', 0);
  expect(g[4]).toEqual({ ch: ' ', color: '', rotDeg: 0, dy: 0 });
  expect(g[5]!.color).toBe('#C6B0F5'); // O is the fifth letter
});
it('P3b3-R13 smoothPath keeps the end points and stays inside the control box', () => {
  const pts = [{ x: 16, y: 232 }, { x: 170, y: 232 }, { x: 170, y: 168 }, { x: 250, y: 168 }, { x: 250, y: 112 }];
  const p = smoothPath(pts, 34, 3);
  expect(p[0]).toEqual(pts[0]);
  expect(p[p.length - 1]).toEqual(pts[4]);
  for (const q of p) { expect(q.x).toBeGreaterThanOrEqual(16); expect(q.x).toBeLessThanOrEqual(250); expect(q.y).toBeGreaterThanOrEqual(112); expect(q.y).toBeLessThanOrEqual(232); }
  for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y)).toBeLessThanOrEqual(6);
});
it('P3b3 Results: the capy head overhang stays below the title for every column variant', () => {
  const R = MENU.results;
  for (const banner of [true, false]) for (const energy of [true, false]) {
    const l = layoutColumn(resultsColumn({ banner, energy }, MIN));
    const headTop = l.middleY + ui(resultsCardTop() - R.card.headOverlap) * l.middleScale;
    expect(l.fits).toBe(true);
    expect(headTop, JSON.stringify({ banner, energy })).toBeGreaterThanOrEqual(ui(R.titleY + R.titleSize) + ui(4));
    expect(headTop).toBeGreaterThanOrEqual(0);
  }
});
