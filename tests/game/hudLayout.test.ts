import { expect, it } from 'vitest';
import { hudLayout, statsRow, HUD_MOCK } from '../../src/game/hud/hudLayout';
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
it('P3b2-R8 stats row is centred, gap 10, and fits the side padding with 4-digit score', () => {
  const r = statsRow({ quota: 30, score: 44, energy: 38 });
  const left = r.quota.x, right = r.energy.x + r.energy.w;
  expect(left).toBeGreaterThanOrEqual(16); expect(right).toBeLessThanOrEqual(390 - 16);
  expect((left + right) / 2).toBeCloseTo(195, 5);
  expect(r.score.x - (r.quota.x + r.quota.w)).toBeCloseTo(10); expect(r.energy.x - (r.score.x + r.score.w)).toBeCloseTo(10);
  expect(r.quota.w).toBeCloseTo(8 + 28 + 6 + 30 + 16); expect(r.score.w).toBeCloseTo(12 + 20 + 8 + 44 + 16);
  expect(r.energy.w).toBeCloseTo(10 + 16 + 8 + 46 + 8 + 38 + 14);
});
