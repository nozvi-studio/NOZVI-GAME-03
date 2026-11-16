import { describe, expect, it } from 'vitest';
import { loadoutLayout, type LoadoutLayout } from '../../src/game/flow/loadoutLayout';
import { MENU } from '../../src/game/ui/menuMetrics';

const L = MENU.loadout.d3;
const flat = (l: LoadoutLayout) => [l.back, l.title, ...l.slots.flatMap(s => [s.face, s.label]), ...l.chips, ...l.cards, l.go];
const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
describe('D3-R19 loadoutLayout', () => {
  it('D3-R19 reproduces the 360x640 board anchors', () => {
    const l = loadoutLayout(640, { slotCount: 2, chips: 2, cardCount: 4 });
    expect(l.slots[0]!.face).toEqual({ x: 92, y: 74, w: 78, h: 78 }); expect(l.slots[1]!.face.x).toBe(190);
    expect(l.cards[0]).toEqual({ x: 12, y: 190, w: 336, h: 80 }); expect(l.cards[1]!.y).toBe(190 + 80 + 9);
    expect(l.go).toEqual({ x: 60, y: 640 - 82, w: 240, h: 72 }); expect(l.chips).toEqual([]); // U6-R4 no chips on the short board
  });
  it('U6-R5 one slot is centred; tall boards keep order, no overlap, Go pinned to the bottom (hm 640, 779, 800)', () => {
    expect(loadoutLayout(640, { slotCount: 1, chips: 0, cardCount: 4 }).slots[0]!.face.x).toBe((360 - L.slotSize) / 2);
    for (const hm of [640, 779, 800]) {
      const l = loadoutLayout(hm, { slotCount: 2, chips: 2, cardCount: 4 }), all = flat(l);
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlap(all[i]!, all[j]!), `${hm}:${i}/${j}`).toBe(false);
      expect(l.go.y + l.go.h).toBe(hm - L.goBottom);
      expect(l.cards[3]!.y + l.cards[3]!.h).toBeLessThanOrEqual(l.go.y - L.goClear + 0.001);
      for (const r of [...l.slots.map(s => s.face), ...l.cards, l.go]) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(48); // D3-R8
    }
    expect(loadoutLayout(779, { slotCount: 2, chips: 2, cardCount: 4 }).chips).toHaveLength(2); // U6-R4 tall shows chips
  });
});
