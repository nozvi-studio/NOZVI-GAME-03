// MEC-011-R14 Characters screen rects in 360-wide mock px (board: docs/design/mockups/d3/skins.html section A). Pure, no Phaser.
export interface R { x: number; y: number; w: number; h: number }
export const D3_CHARS = {
  w: 360, short: 640, side: 10, round: 48, top: 12, titleH: 34, titleY: 15, titleX: 66, titleRight: 96, coinH: 40, coinY: 16, coinRight: 10,
  stageTop: 74, stageW: 250, stageH: 150, podium: { dy: -12, side: 60, h: 30 }, ribbon: { w: 216, h: 56, gap: -4 },
  rarity: { gap: 6, h: 26 }, perk: { gap: 7, h: 18, side: 20 },
  shelf: { h: 132, gap: 20, label: { y: 9, h: 14 }, token: 50, tokenY: 34, pad: 9, labelDy: 57 },
  action: { side: 16, h: 64, bottom: 26, gap: 18 }, debug: { w: 64, h: 28, dy: 50 },
} as const;
export interface CharactersLayout {
  back: R; title: R; coins: { right: number; y: number; h: number }; stage: R; podium: R; ribbon: R;
  rarity: { cx: number; y: number; h: number }; perk: R; shelf: R; shelfLabel: R; tokens: R[]; soon: R; tokenLabelDy: number; action: R; debugCoins: R;
}
// Fixed block heights; every px above 640 is added to the stage (R14).
export function charactersLayout(hm: number, count: number): CharactersLayout {
  const D = D3_CHARS, W = D.w, extra = Math.max(0, hm - D.short);
  const stage: R = { x: (W - D.stageW) / 2, y: D.stageTop, w: D.stageW, h: D.stageH + extra };
  const podium: R = { x: D.podium.side, y: stage.y + stage.h + D.podium.dy, w: W - 2 * D.podium.side, h: D.podium.h };
  const ribbon: R = { x: (W - D.ribbon.w) / 2, y: podium.y + podium.h + D.ribbon.gap, w: D.ribbon.w, h: D.ribbon.h };
  const rarity = { cx: W / 2, y: ribbon.y + ribbon.h + D.rarity.gap, h: D.rarity.h };
  const perk: R = { x: D.perk.side, y: rarity.y + rarity.h + D.perk.gap, w: W - 2 * D.perk.side, h: D.perk.h };
  const action: R = { x: D.action.side, y: hm - D.action.bottom - D.action.h, w: W - 2 * D.action.side, h: D.action.h };
  const shelf: R = { x: D.side, y: action.y - D.action.gap - D.shelf.h, w: W - 2 * D.side, h: D.shelf.h };
  const n = count + 1, inner = shelf.w - 2 * D.shelf.pad, step = (inner - D.shelf.token) / (n - 1);
  const cell = (i: number): R => ({ x: shelf.x + D.shelf.pad + i * step, y: shelf.y + D.shelf.tokenY, w: D.shelf.token, h: D.shelf.token });
  return {
    back: { x: D.top, y: D.top, w: D.round, h: D.round }, title: { x: D.titleX, y: D.titleY, w: W - D.titleX - D.titleRight, h: D.titleH },
    coins: { right: D.coinRight, y: D.coinY, h: D.coinH }, stage, podium, ribbon, rarity, perk, shelf,
    shelfLabel: { x: shelf.x, y: shelf.y + D.shelf.label.y, w: shelf.w, h: D.shelf.label.h },
    tokens: Array.from({ length: count }, (_, i) => cell(i)), soon: cell(count), tokenLabelDy: D.shelf.labelDy, action,
    debugCoins: { x: W - D.coinRight - D.debug.w, y: D.coinY + D.debug.dy, w: D.debug.w, h: D.debug.h },
  };
}
