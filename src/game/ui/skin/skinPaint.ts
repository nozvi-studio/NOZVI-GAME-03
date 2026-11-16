// src/game/ui/skin/skinPaint.ts
// D3-R5 Canvas2D painter for a SkinRecipe. The outline is the full shape in the line colour; the face is the same shape inset by the line width.
import type { SkinRecipe } from './skinSpec';
import type { RingRecipe } from './ringSpec';

export interface Ctx2D {
  fillStyle: unknown;
  beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void; closePath(): void; fill(): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  save(): void; restore(): void; clip(): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(offset: number, color: string): void };
}
export function shape(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number, notch: number): void {
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
  const face = (): void => shape(ctx, lp, lp, rc.w - 2 * lp, rc.h - 2 * lp, Math.max(0, rc.r - lp), Math.max(0, rc.notch - lp));
  face(); ctx.fillStyle = g; ctx.fill();
  if (rc.gloss) { // D3-R14 clipped to the face: on a round button the gloss pill would leak past the rim at the top corners
    const q = rc.gloss, gg = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
    gg.addColorStop(0, `rgba(255,255,255,${q.top})`); gg.addColorStop(1, `rgba(255,255,255,${q.bottom})`);
    ctx.save(); face(); ctx.clip();
    shape(ctx, q.x, q.y, q.w, q.h, q.r, 0); ctx.fillStyle = gg; ctx.fill();
    ctx.restore();
  }
}

export function paintRing(ctx: Ctx2D, rc: RingRecipe): void {
  ctx.clearRect(0, 0, rc.w, rc.h); shape(ctx, 0, 0, rc.w, rc.h, rc.r, 0); ctx.fillStyle = rc.color; ctx.fill();
}
