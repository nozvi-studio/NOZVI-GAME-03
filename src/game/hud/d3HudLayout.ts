// D3-R9 in-run layout in D3 board px (360 wide). Pure, no Phaser.
export const D3_RUN = {
  short: { h: 640, top: 0 }, tall: { h: 780, top: 37 },
  side: 10, boardTop: 112, boardSize: 340,
  pause: { x: 12, y: 12, d: 48 }, ribbon: { w: 160, h: 51, y: 10, font: 22, stroke: 4 }, score: { right: 12, y: 14, h: 40, icon: 22, font: 17, padX: 12, gap: 6 },
  mango: { y: 70, h: 34, side: 14, icon: 34, gap: 8, barH: 26, labelW: 44, labelFont: 18, shadowY: 2 },
  bottom: { block: 146, gapMin: 24, spareShare: 0.45 },
  skill: { d: 78, side: 22, sideDpad: 12, dyDpad: 62, icon: 38, lock: 34, gauge: 5, gaugeInset: 6, ring: 5, ringOut: 5, trackAlpha: 0.3, chargeSteps: 24,
    badge: { right: -4, bottom: -6, minW: 30, h: 24, font: 13, padX: 8, line: 3 } },
  energy: { x: 112, dy: 8, h: 22, icon: 22, gap: 6, labelW: 24, xDpad: 16, rightDpad: 96, font: 15, shadowY: 2 },
  hint: { dy: 42, h: 20, x: 100, font: 14, shadowY: 2 },
  chip: { dy: 100, dyTall: 112, h: 36, hDpad: 30, rightDpad: 14, dyDpad: -3, font: 15, padX: 16 },
  dpad: { key: 50, dx: 54, upDy: 30, midDy: 76, downDy: 122, gap: 8, block: 172 },
  debug: { nextW: 52, keyW: 64, h: 24, side: 10, bottom: 4 },
} as const;

export interface R { x: number; y: number; w: number; h: number }
export interface D3HudLayout {
  board: R; pause: R; ribbon: R; score: { right: number; y: number; h: number };
  mango: { icon: R; bar: R; label: R };
  skills: readonly [R, R]; energy: { icon: R; bar: R; label: R };
  hint: R | null; chip: { cx: number; right: number | null; y: number; h: number; short: boolean };
  dpad: { up: R; left: R; right: R; down: R } | null;
}
const W = 360;
// MEC-003-R21 ?debug=1 only: "+1" bottom left, "Key" bottom right, on the canvas bottom edge under the skill buttons (D-pad on or off).
export function debugRects(hm: number): { next: R; key: R } {
  const G = D3_RUN.debug, y = hm - G.bottom - G.h;
  return { next: { x: G.side, y, w: G.nextW, h: G.h }, key: { x: W - G.side - G.keyW, y, w: G.keyW, h: G.h } };
}
const topOff = (hm: number): number => { const D = D3_RUN; return D.short.top + (D.tall.top - D.short.top) * (hm - D.short.h) / (D.tall.h - D.short.h); };
// D3-R9 board rect in board px: full width minus the side padding, under the top bar.
export function boardRect(hm: number): { x: number; y: number; size: number } {
  const D = D3_RUN; return { x: D.side, y: D.boardTop + topOff(hm), size: D.boardSize };
}
const row = (x: number, y: number, w: number, h: number, iconW: number, gap: number, labelW: number): { icon: R; bar: R; label: R } => ({
  icon: { x, y: y + (h - iconW) / 2, w: iconW, h: iconW },
  bar: { x: x + iconW + gap, y, w: w - iconW - labelW - 2 * gap, h },
  label: { x: x + w - labelW, y, w: labelW, h },
});
// D3-R9 every in-run rect for a canvas `hm` board px tall, D-pad on or off.
export function d3HudLayout(hm: number, dpad: boolean): D3HudLayout {
  const D = D3_RUN, T = topOff(hm), b = boardRect(hm), be = b.y + b.size, u = (hm - D.short.h) / (D.tall.h - D.short.h);
  const M = D.mango, mrowY = T + M.y, mw = W - 2 * M.side;
  const mango = row(M.side, mrowY + (M.h - M.barH) / 2, mw, M.barH, M.icon, M.gap, M.labelW);
  mango.icon = { x: M.side, y: mrowY, w: M.icon, h: M.icon };
  const base = {
    board: { x: b.x, y: b.y, w: b.size, h: b.size },
    pause: { x: D.pause.x, y: T + D.pause.y, w: D.pause.d, h: D.pause.d },
    ribbon: { x: (W - D.ribbon.w) / 2, y: T + D.ribbon.y, w: D.ribbon.w, h: D.ribbon.h },
    score: { right: D.score.right, y: T + D.score.y, h: D.score.h }, mango,
  };
  const E = D.energy, S = D.skill;
  if (!dpad) {
    const spare = hm - be - D.bottom.block, g = be + Math.max(D.bottom.gapMin, Math.round(spare * D.bottom.spareShare));
    const ew = W - 2 * E.x;
    return { ...base,
      skills: [{ x: S.side, y: g, w: S.d, h: S.d }, { x: W - S.side - S.d, y: g, w: S.d, h: S.d }],
      energy: row(E.x, g + E.dy, ew, E.h, E.icon, E.gap, E.labelW),
      hint: { x: D.hint.x, y: g + D.hint.dy, w: W - 2 * D.hint.x, h: D.hint.h },
      chip: { cx: W / 2, right: null, y: g + D.chip.dy + (D.chip.dyTall - D.chip.dy) * Math.min(1, Math.max(0, u)), h: D.chip.h, short: false },
      dpad: null };
  }
  const P = D.dpad, spare = hm - be - P.gap - P.block, g = be + P.gap + Math.max(0, Math.round(spare * D.bottom.spareShare));
  const key = (cx: number, y: number): R => ({ x: cx - P.key / 2, y, w: P.key, h: P.key });
  return { ...base,
    skills: [{ x: S.sideDpad, y: g + S.dyDpad, w: S.d, h: S.d }, { x: W - S.sideDpad - S.d, y: g + S.dyDpad, w: S.d, h: S.d }],
    energy: row(E.xDpad, g, W - E.xDpad - E.rightDpad, E.h, E.icon, E.gap, E.labelW),
    hint: null,
    chip: { cx: W - D.chip.rightDpad, right: D.chip.rightDpad, y: g + D.chip.dyDpad, h: D.chip.hDpad, short: true },
    dpad: { up: key(W / 2, g + P.upDy), left: key(W / 2 - P.dx, g + P.midDy), right: key(W / 2 + P.dx, g + P.midDy), down: key(W / 2, g + P.downDy) } };
}
