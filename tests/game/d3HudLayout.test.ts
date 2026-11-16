import { expect, it } from 'vitest';
import { boardRect, d3HudLayout, debugRects, type R } from '../../src/game/hud/d3HudLayout';

const HM = [640, 700, 780, 800];
const rects = (l: ReturnType<typeof d3HudLayout>): [string, R][] => {
  const out: [string, R][] = [['board', l.board], ['band', l.band], ['pause', l.pause], ['ribbon', l.ribbon], ['mangoBar', l.mango.bar],
    ['skillA', l.skills[0]], ['skillB', l.skills[1]], ['energyBar', l.energy.bar]];
  if (l.hint) out.push(['hint', l.hint]);
  if (l.dpad) for (const k of ['up', 'left', 'right', 'down'] as const) out.push([k, l.dpad[k]]);
  return out;
};
const overlap = (a: R, b: R) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

it('D3-R9 BAND-R1 board: 36 px under the old top (148 on 640, 185 on 780); 340 wide with 10 px sides once the canvas is tall enough', () => {
  expect(boardRect(640)).toEqual({ x: 24, y: 148, size: 312 });   // short canvas: the square shrinks, stays centred
  const tall = boardRect(780); expect(tall.y).toBeCloseTo(185); expect(tall.size).toBe(340); expect(tall.x).toBe(10);
  expect(boardRect(680).size).toBe(340); expect(boardRect(670).size).toBeLessThan(340);
});
it('BAND-R1 the banner band is 30 px high, board wide, 11 px above the board (frame 7 + 4 clear) and 3 px below the mango row, D-pad on and off', () => {
  for (const hm of HM) for (const dpad of [false, true]) {
    const l = d3HudLayout(hm, dpad);
    expect(l.band.h).toBe(30); expect(l.band.x).toBe(l.board.x); expect(l.band.w).toBe(l.board.w);
    expect(l.band.y + l.band.h + 11).toBeCloseTo(l.board.y);
    expect(l.band.y).toBeCloseTo(l.mango.icon.y + l.mango.icon.h + 3);
  }
});
it('D3-R9 every rect is inside the canvas and nothing overlaps, D-pad on and off', () => {
  for (const hm of HM) for (const dpad of [false, true]) {
    const rs = rects(d3HudLayout(hm, dpad));
    for (const [k, r] of rs) { expect(r.x, k).toBeGreaterThanOrEqual(0); expect(r.x + r.w, k).toBeLessThanOrEqual(360); expect(r.y, k).toBeGreaterThanOrEqual(0); expect(r.y + r.h, `${hm} ${dpad} ${k}`).toBeLessThanOrEqual(hm); }
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) expect(overlap(rs[i]![1], rs[j]![1]), `${hm} ${dpad} ${rs[i]![0]}/${rs[j]![0]}`).toBe(false);
  }
});
it('D3-R8 Pause, skills and D-pad keys are at least 48 px', () => {
  for (const hm of HM) for (const dpad of [false, true]) {
    const l = d3HudLayout(hm, dpad), taps = [l.pause, l.skills[0], l.skills[1], ...(l.dpad ? [l.dpad.up, l.dpad.left, l.dpad.right, l.dpad.down] : [])];
    for (const r of taps) { expect(r.w).toBeGreaterThanOrEqual(48); expect(r.h).toBeGreaterThanOrEqual(48); }
  }
});
it('D3-R9 board anchors on 640: skills at y 484, energy bar 112..248, chip top 584', () => {
  const l = d3HudLayout(640, false);
  expect(l.skills[0]).toEqual({ x: 22, y: 484, w: 78, h: 78 });
  expect(l.skills[1].x + l.skills[1].w).toBe(338);
  expect(l.energy.bar.x).toBeGreaterThanOrEqual(112); expect(l.energy.bar.x + l.energy.bar.w + 6 + 24).toBeCloseTo(248);
  expect(l.chip.y).toBe(584); expect(l.chip.short).toBe(false); expect(l.hint).not.toBeNull();
});
it('D3-R9 spare height on tall screens goes around the bottom group, not into one band', () => {
  const short = d3HudLayout(640, false), tall = d3HudLayout(780, false);
  const gapAbove = (l: typeof short) => l.skills[0].y - (l.board.y + l.board.h);
  const gapBelow = (l: typeof short, hm: number) => hm - (l.chip.y + l.chip.h);
  expect(gapAbove(tall)).toBeGreaterThan(gapAbove(short));
  expect(gapBelow(tall, 780)).toBeGreaterThan(gapBelow(short, 640));
});
it('D3-R9 R3 D-pad mode: keys centred, energy bar above, short chip on the right', () => {
  const l = d3HudLayout(640, true);
  expect(l.dpad!.up.x + 25).toBe(180); expect(l.dpad!.left.x + 25).toBe(126); expect(l.dpad!.right.x + 25).toBe(234);
  expect(l.energy.bar.y + l.energy.bar.h).toBeLessThan(l.dpad!.up.y);
  expect(l.chip.short).toBe(true); expect(l.chip.right).toBe(14); expect(l.hint).toBeNull();
});
it('MEC-003-R21 debug "+1" / "Key" sit on the bottom edge and overlap no HUD rect, 640 and 780, D-pad on and off', () => {
  for (const hm of [640, 780]) for (const dpad of [false, true]) {
    const l = d3HudLayout(hm, dpad), d = debugRects(hm), chipW = 200;
    const chip: R = l.chip.right === null ? { x: l.chip.cx - chipW / 2, y: l.chip.y, w: chipW, h: l.chip.h } : { x: 360 - l.chip.right - chipW, y: l.chip.y, w: chipW, h: l.chip.h };
    const score: R = { x: 360 - l.score.right - 120, y: l.score.y, w: 120, h: l.score.h };
    const all: [string, R][] = [...rects(l), ['chip', chip], ['quota', l.mango.label], ['score', score], ['skillsAll', l.skills[0]]];
    for (const b of [d.next, d.key]) {
      expect(b.y + b.h).toBeLessThanOrEqual(hm);
      for (const [name, r] of all) expect(overlap(b, r), `${hm} ${dpad} ${name}`).toBe(false);
    }
  }
});
