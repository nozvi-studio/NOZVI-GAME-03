import { expect, it } from 'vitest';
import { layoutColumn, ui } from '../../src/game/ui/layout';
import { MENU } from '../../src/game/ui/menuMetrics';
import { TOKENS } from '../../src/game/uiTokens';
import { bootColumn, homeColumn, isCompactHeight, l1Link, logoLetters, logoSpec, loadoutCards, loadoutColumn, resultsCardTop, resultsColumn, settingsColumn, smoothPath } from '../../src/game/ui/menuLayout';
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

it('UIFIX-R9 compact mode starts below 700 CSS px of canvas height', () => {
  expect(isCompactHeight(640)).toBe(true);
  expect(isCompactHeight(699)).toBe(true);
  expect(isCompactHeight(700)).toBe(false);
  expect(isCompactHeight(960)).toBe(false);
});
it('UIFIX-R9 compact cards are shorter but still hold the icon disc, and the column scales up', () => {
  const full = loadoutCards(false), small = loadoutCards(true);
  expect(full).toEqual({ cardH: MENU.loadout.cardH, cardGap: MENU.loadout.cardGap });
  expect(small.cardH).toBeLessThan(full.cardH);
  expect(small.cardH).toBeGreaterThanOrEqual(MENU.loadout.disc + 8);     // 4 px margin above and below the disc
  expect(small.cardGap).toBeLessThanOrEqual(full.cardGap);
  const a = layoutColumn(loadoutColumn(MIN)), b = layoutColumn(loadoutColumn(MIN, true));
  expect(b.fits).toBe(true);
  expect(b.middleScale).toBeGreaterThan(a.middleScale);                  // text is larger on short phones
});

it('UIFIX-R10 Start from L1 is a link: smaller than the chip text, row-height hit area, padded sides', () => {
  const l = MENU.home;
  expect(l.l1.font).toBeLessThan(l.chips.font);
  const k = l1Link(80);
  expect(k.w).toBe(80 + 2 * l.chips.padX);
  expect(k.h).toBe(l.chipH);
});

it('D3-R11 logoSpec: MANGO yellow with mango line, SNAKE white with ink line, ink drop under both', () => {
  const s = logoSpec(0.92);
  expect(s.lines.map(l => l.key)).toEqual(['logo.mango', 'logo.snake']);
  expect(s.lines[0]).toMatchObject({ fill: TOKENS.d3.logo.mango, stroke: TOKENS.d3.logo.mangoLine });
  expect(s.lines[1]).toMatchObject({ fill: TOKENS.d3.white, stroke: TOKENS.d3.ink });
  for (const l of s.lines) { expect(l.back).toBe(TOKENS.d3.inkDeep); expect(l.backY - l.y).toBeCloseTo(6 * 0.92); }
  expect(s.fontPx).toBeCloseTo(70 * 0.92); expect(s.h).toBeCloseTo(150 * 0.92);
  expect(s.lines[0]!.y).toBeCloseTo((64 - 0.35 * 70) * 0.92); // centre of the caps, mock px from the logo top
});
