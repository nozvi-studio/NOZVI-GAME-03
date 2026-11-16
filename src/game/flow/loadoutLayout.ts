import { MENU } from '../ui/menuMetrics';
import type { Rect } from '../ui/menuLayout';
const L = MENU.loadout.d3, W = 360;
export interface LoadoutLayout { back: Rect; title: Rect; slots: { face: Rect; label: Rect }[]; chips: Rect[]; cards: Rect[]; go: Rect }
// D3-R19 / U6-R5 Loadout rects in mock px for a canvas `hm` mock px tall.
export function loadoutLayout(hm: number, o: { slotCount: 1 | 2; chips: number; cardCount: number }): LoadoutLayout {
  const goY = hm - L.goBottom - L.goH;
  const x0 = o.slotCount === 1 ? (W - L.slotSize) / 2 : (W - 2 * L.slotSize - L.slotGap) / 2;
  const slots = Array.from({ length: o.slotCount }, (_, i) => {
    const x = x0 + i * (L.slotSize + L.slotGap);
    return { face: { x, y: L.slotY, w: L.slotSize, h: L.slotSize }, label: { x, y: L.slotY + L.slotLabelDy, w: L.slotSize, h: L.slotLabelH } };
  });
  const showChips = hm >= L.chipsMinH && o.chips > 0, slotsBottom = L.slotY + L.slotLabelDy + L.slotLabelH;
  const chipsY = slotsBottom + L.chipsGap, chipsBlock = showChips ? L.chipsH + L.chipsGap : 0;
  const block = o.cardCount * L.cardH + (o.cardCount - 1) * L.cardGap, base = L.cardsTop + chipsBlock;
  const slack = hm > L.baseH ? Math.max(0, goY - L.goClear - (base + block)) : 0; // the 640 board keeps its exact anchors
  const top = base + Math.min(L.topExtraMax, slack / 2);
  const gap = L.cardGap + (o.cardCount > 1 ? Math.min(L.gapExtraMax, (slack - Math.min(L.topExtraMax, slack / 2)) / (o.cardCount - 1)) : 0);
  const chipW = (W - 2 * L.cardX - (o.chips - 1) * L.chipsGap) / Math.max(1, o.chips);
  return {
    back: { x: L.backX, y: L.backY, w: L.round, h: L.round },
    title: { x: L.titleSide, y: L.titleY, w: W - 2 * L.titleSide, h: L.titleH },
    slots, chips: showChips ? Array.from({ length: o.chips }, (_, i) => ({ x: L.cardX + i * (chipW + L.chipsGap), y: chipsY, w: chipW, h: L.chipsH })) : [],
    cards: Array.from({ length: o.cardCount }, (_, i) => ({ x: L.cardX, y: top + i * (L.cardH + gap), w: L.cardW, h: L.cardH })),
    go: { x: L.goX, y: goY, w: W - 2 * L.goX, h: L.goH },
  };
}
