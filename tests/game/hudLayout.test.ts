import { expect, it } from 'vitest';
import { bannerStripRect, hudLayout, skillTipPlacement, statsRow, stripRows, STRIP_MOCK, HUD_MOCK } from '../../src/game/hud/hudLayout';
import { cellPx } from '../../src/game/layout';
import { loadBalance } from '../support/balance';
import { BOARD, HEIGHT, WIDTH } from '../../src/game/layout';
import { ui } from '../../src/game/ui/layout';

for (const dpad of [false, true]) it(`P3b2-R8 layout at 540x960 has no overlap (dpad=${dpad})`, () => {
  const l = hudLayout(dpad), frame = ui(HUD_MOCK.boardPad);
  expect(l.statsY + l.statsH).toBeLessThanOrEqual(BOARD.y - frame);          // header + stats above the board frame
  expect(l.pause.cy + l.pause.r).toBeLessThanOrEqual(l.statsY);
  expect(l.chip.y).toBeGreaterThanOrEqual(BOARD.y + BOARD.size + frame);   // chip below the board frame
  const chipBottom = l.chip.y + l.chip.h;
  for (const s of l.skills) {
    expect(chipBottom).toBeLessThanOrEqual(s.groupTop);
    expect(s.costY + s.costH).toBeLessThanOrEqual(HEIGHT);
    expect(s.cx - s.r).toBeGreaterThanOrEqual(0); expect(s.cx + s.r).toBeLessThanOrEqual(WIDTH);
    expect(2 * s.r).toBeGreaterThanOrEqual(66); // >= 44 CSS px on a 360 px wide phone
  }
  expect(l.pause.hit).toBeGreaterThanOrEqual(66);
  if (!dpad) expect(l.dpad).toBeNull();
  else {
    const d = l.dpad!;
    expect(d.y).toBeGreaterThanOrEqual(chipBottom); expect(d.y + d.size).toBeLessThanOrEqual(HEIGHT);
    expect(d.x).toBeGreaterThanOrEqual(l.skills[0].cx + l.skills[0].r);
    expect(d.x + d.size).toBeLessThanOrEqual(l.skills[1].cx - l.skills[1].r);
    expect(d.btn).toBeGreaterThanOrEqual(66);
  }
});
it('P3b2-R8 skill buttons sit at the 24 px side margins of GameD2', () => {
  const l = hudLayout(false);
  expect(l.skills[0].cx).toBeCloseTo(ui(24) + ui(42)); expect(l.skills[1].cx).toBeCloseTo(WIDTH - ui(24) - ui(42));
});
it('P3b2-R8 stats row is centred, gap 10, and fits the side padding with the quoted mockup widths', () => {
  const r = statsRow({ quota: 30, score: 44, energy: 38 });
  const left = r.quota.x, right = r.energy.x + r.energy.w;
  expect(left).toBeGreaterThanOrEqual(16); expect(right).toBeLessThanOrEqual(390 - 16);
  expect((left + right) / 2).toBeCloseTo(195, 5);
  expect(r.score.x - (r.quota.x + r.quota.w)).toBeCloseTo(10); expect(r.energy.x - (r.score.x + r.score.w)).toBeCloseTo(10);
  expect(r.quota.w).toBeCloseTo(8 + 28 + 6 + 30 + 16); expect(r.score.w).toBeCloseTo(12 + 20 + 8 + 44 + 16);
  expect(r.energy.w).toBeCloseTo(10 + 16 + 8 + 46 + 8 + 38 + 14);
});

// Worst-case digits at the 19px stat font; Nunito 800 digits are about 0.6em wide (estimate, no canvas in unit tests).
const STAT_FONT = 19, DIGIT = 0.6 * STAT_FONT;
it('P3b2-R8 stats row fits the side padding with a 4-digit score (derived width)', () => {
  const r = statsRow({ quota: 30, score: 4 * DIGIT, energy: 38 });
  const left = r.quota.x, right = r.energy.x + r.energy.w;
  expect(left).toBeGreaterThanOrEqual(HUD_MOCK.sidePad); expect(right).toBeLessThanOrEqual(390 - HUD_MOCK.sidePad);
  expect((left + right) / 2).toBeCloseTo(195, 5);
  expect(r.score.w).toBeCloseTo(12 + 20 + 8 + 4 * DIGIT + 16);
});
it('P3b2-R8 stats row stays on screen even with a 5-char quota, 4-digit score and 3-digit energy', () => {
  const r = statsRow({ quota: 5 * DIGIT, score: 4 * DIGIT, energy: 3 * DIGIT });
  expect(r.quota.x).toBeGreaterThanOrEqual(0); expect(r.energy.x + r.energy.w).toBeLessThanOrEqual(390);
});
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
  const l = hudLayout(true), m = { margin: ui(16), tailLeft: ui(50), tailGap: ui(11) };
  for (const h of [ui(46), ui(60), ui(120)]) {
    const p = skillTipPlacement(l, slot, ui(200), h, m);
    expect(p.y).toBeGreaterThanOrEqual(BOARD.y + BOARD.size);        // never over the board
    expect(p.x).toBeGreaterThanOrEqual(m.margin); expect(p.x + ui(200)).toBeLessThanOrEqual(WIDTH - m.margin);
  }
  const p = skillTipPlacement(l, slot, ui(200), ui(46), m);
  expect(p.y + ui(46) + m.tailGap).toBeLessThanOrEqual(l.skills[slot].groupTop + 0.001);  // above the button group when it fits
});

it('UIFIX-R2 reject toast bubble bottom stays above the skill group top when the board-to-skills gap fits the toast', () => {
  const l = hudLayout(true), boardBottom = BOARD.y + BOARD.size, tail = ui(11), h = ui(46);
  for (const slot of [0, 1] as const) {
    const gap = l.skills[slot].groupTop - boardBottom, p = skillTipPlacement(l, slot, ui(200), h, { margin: ui(16), tailLeft: ui(50), tailGap: tail });
    expect(p.y).toBeGreaterThanOrEqual(boardBottom);                                  // board clamp always wins
    if (gap >= h + tail) expect(p.y + h).toBeLessThanOrEqual(l.skills[slot].groupTop); // no overlap with the button
  }
});

it('UIFIX-R6 D-pad is raised, keeps clear of the chip row and has a wider gap from the left skill button', () => {
  const l = hudLayout(true), d = l.dpad!, left = l.skills[0], right = l.skills[1];
  expect(HEIGHT - (d.y + d.size)).toBeGreaterThanOrEqual(ui(24));          // bottom margin was 16 mockup px
  expect(d.y).toBeGreaterThanOrEqual(l.chip.y + l.chip.h);                   // never over the chip / prompt row
  const gapL = d.x - (left.cx + left.r), gapR = (right.cx - right.r) - (d.x + d.size);
  expect(gapL).toBeGreaterThanOrEqual(ui(16));
  expect(gapL).toBeGreaterThan(gapR);
  expect(gapR).toBeGreaterThanOrEqual(ui(6));                                // still clear of the right skill
  expect(d.btn).toBeGreaterThanOrEqual(66);                                  // >= 44 CSS px at 360 wide
  expect(d.step).toBeGreaterThanOrEqual(d.btn);
  expect(2 * d.step + d.btn).toBeCloseTo(d.size);                            // grid spans the declared size
});
