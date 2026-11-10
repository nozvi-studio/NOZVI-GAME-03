// src/game/ui/skin/skinPaint.ts
// D3-R5 Canvas2D painter for a SkinRecipe. The outline is the full shape in the line colour; the face is the same shape inset by the line width.
import type { SkinRecipe } from './skinSpec';

export interface Ctx2D {
  fillStyle: unknown;
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void; closePath(): void; fill(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
}
function shape(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number, notch: number): void {
  ctx.beginPath();
  if (notch > 0) { // ribbon: V notch on both ends
    ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - notch, y + h / 2); ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h); ctx.lineTo(x + notch, y + h / 2);
  } else {
    const q = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q);
  }
  ctx.closePath();
}
export function paintSkin(ctx: Ctx2D, rc: SkinRecipe): void {
  ctx.clearRect(0, 0, rc.w, rc.h);
  const lp = rc.line?.px ?? 0;
  if (rc.line) { shape(ctx, 0, 0, rc.w, rc.h, rc.r, rc.notch); ctx.fillStyle = rc.line.color; ctx.fill(); }
  const g = ctx.createLinearGradient(0, lp, 0, rc.h - lp), last = rc.stops.length - 1;
  rc.stops.forEach((c, i) => g.addColorStop(last === 0 ? 0 : i / last, c));
  shape(ctx, lp, lp, rc.w - 2 * lp, rc.h - 2 * lp, Math.max(0, rc.r - lp), Math.max(0, rc.notch - lp));
  ctx.fillStyle = g; ctx.fill();
  if (rc.gloss) {
    const q = rc.gloss, gg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    gg.addColorStop(0, `rgba(255,255,255,${q.top})`); gg.addColorStop(1, `rgba(255,255,255,${q.bottom})`);
    shape(ctx, q.x, q.y, q.w, q.h, q.r, 0); ctx.fillStyle = gg; ctx.fill();
  }
}
