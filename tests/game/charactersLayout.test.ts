import { expect, it } from 'vitest';
import { charactersLayout, heroPath, D3_CHARS } from '../../src/game/flow/charactersLayout';

const HM = [640, 700, 780, 800];
const all = (l: ReturnType<typeof charactersLayout>) => [l.back, l.title, l.stage, l.podium, l.ribbon, l.perk, l.shelf, ...l.tokens, l.soon, l.action];
it('MEC-011-R14 every rect is inside the canvas at 640..800', () => {
  for (const hm of HM) for (const r of all(charactersLayout(hm, 5))) {
    expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.w).toBeLessThanOrEqual(360);
    expect(r.y).toBeGreaterThanOrEqual(0); expect(r.y + r.h, `${hm}`).toBeLessThanOrEqual(hm);
  }
});
it('MEC-011-R14 order top to bottom: top row, stage, ribbon, perk, shelf, action; no vertical overlap', () => {
  for (const hm of HM) { const l = charactersLayout(hm, 5);
    const seq = [l.back, l.stage, l.ribbon, l.perk, l.shelf, l.action];
    for (let i = 1; i < seq.length; i++) expect(seq[i]!.y, `${hm} #${i}`).toBeGreaterThanOrEqual(seq[i - 1]!.y);
    expect(l.perk.y + l.perk.h).toBeLessThanOrEqual(l.shelf.y); expect(l.shelf.y + l.shelf.h).toBeLessThanOrEqual(l.action.y);
  }
});
it('MEC-011-R14 the action button sits in the lower 45% and is at least 48 px high', () => {
  for (const hm of HM) { const a = charactersLayout(hm, 5).action; expect(a.y).toBeGreaterThanOrEqual(hm * 0.55); expect(a.h).toBeGreaterThanOrEqual(48); }
});
it('MEC-011-R21 5 tokens and the Soon token fit one row inside the shelf, each at least 48 px, no overlap', () => {
  const l = charactersLayout(640, 5), row = [...l.tokens, l.soon];
  expect(l.tokens).toHaveLength(5);
  for (const r of row) { expect(r.w).toBeGreaterThanOrEqual(48); expect(r.x).toBeGreaterThanOrEqual(l.shelf.x); expect(r.x + r.w).toBeLessThanOrEqual(l.shelf.x + l.shelf.w); }
  for (let i = 1; i < row.length; i++) expect(row[i]!.x).toBeGreaterThanOrEqual(row[i - 1]!.x + row[i - 1]!.w);
});
it('MEC-011-R14 extra height on tall screens goes around the stage, the top row does not move', () => {
  const s = charactersLayout(640, 5), tl = charactersLayout(780, 5);
  expect(tl.back.y).toBe(s.back.y); expect(tl.stage.h).toBeGreaterThan(s.stage.h); expect(tl.action.y - 780).toBe(s.action.y - 640);
});
it('MEC-011-R14 the hero path runs from the tail start to the head end, evenly sampled, inside the stage box', () => {
  const p = heroPath(), s = D3_CHARS.hero;
  expect(p[0]).toEqual({ x: s.tail.x, y: s.tail.y }); expect(p.at(-1)!.x).toBeCloseTo(s.end.x); expect(p.at(-1)!.y).toBeCloseTo(s.end.y);
  for (const q of p) { expect(q.x).toBeGreaterThanOrEqual(0); expect(q.x).toBeLessThanOrEqual(D3_CHARS.stageW); expect(q.y).toBeLessThanOrEqual(D3_CHARS.stageH); }
  for (let i = 1; i < p.length; i++) expect(Math.hypot(p[i]!.x - p[i - 1]!.x, p[i]!.y - p[i - 1]!.y)).toBeLessThanOrEqual(s.step * 1.01);
});
