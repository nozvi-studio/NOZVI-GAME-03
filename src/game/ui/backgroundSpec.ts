// D3-R10/R11 screen background: elliptical radial gradient plus a white ray fan (d3.css `.a`, `.a .rays`). Pure, no Phaser.
import { TOKENS } from '../uiTokens';

export interface BgSpec {
  stops: [number, string][]; cx: number; cy: number; rx: number; ry: number;
  rayCx: number; rayCy: number; rayR: number; rayColor: string; wedges: { a0: number; a1: number }[];
  w: number; h: number; outer: string;
}
export interface BgCtx {
  fillStyle: unknown;
  save(): void; restore(): void; translate(x: number, y: number): void; scale(x: number, y: number): void;
  beginPath(): void; moveTo(x: number, y: number): void; arc(x: number, y: number, r: number, a0: number, a1: number): void;
  closePath(): void; fill(): void; fillRect(x: number, y: number, w: number, h: number): void;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): { addColorStop(o: number, c: string): void };
}
const DEG = Math.PI / 180;
const clampBiome = (b: number): number => Math.min(TOKENS.d3.biomes.length, Math.max(1, Math.round(b)));
export const bgKey = (biome: number, w: number, h: number): string => `d3/bg/${clampBiome(biome)}/${Math.ceil(w)}x${Math.ceil(h)}`;

// D3-R10 one spec per biome and canvas size.
export function bgSpec(biome: number, w: number, h: number): BgSpec {
  const b = TOKENS.d3.bg, [c0, c1, c2] = TOKENS.d3.biomes[clampBiome(biome) - 1]!.bg;
  const n = Math.round(360 / (2 * b.rayDeg)), wedges: BgSpec['wedges'] = [];
  for (let k = 0; k < n; k++) { const a0 = (k * 2 * b.rayDeg - 90) * DEG; wedges.push({ a0, a1: a0 + b.rayDeg * DEG }); }
  return { stops: [[0, c0], [b.midStop, c1], [1, c2]], cx: w / 2, cy: h * b.centerY, rx: w * b.rx, ry: h * b.ry,
    rayCx: w / 2, rayCy: h * b.rayCenterY, rayR: Math.hypot(w, h), rayColor: `rgba(255,255,255,${b.rayAlpha})`, wedges, w, h, outer: c2 };
}

// D3-R10 paint: gradient in a y-squashed space (CSS ellipse), then one filled wedge per ray.
export function paintBackground(ctx: BgCtx, s: BgSpec): void {
  const k = s.ry / s.rx;
  ctx.save(); ctx.translate(s.cx, s.cy); ctx.scale(1, k);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s.rx);
  for (const [o, c] of s.stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(-s.cx, -s.cy / k, s.w, s.h / k);
  ctx.restore();
  ctx.fillStyle = s.rayColor;
  for (const wd of s.wedges) {
    ctx.beginPath(); ctx.moveTo(s.rayCx, s.rayCy); ctx.arc(s.rayCx, s.rayCy, s.rayR, wd.a0, wd.a1); ctx.closePath(); ctx.fill();
  }
}
