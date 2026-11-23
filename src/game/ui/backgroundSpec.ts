// D4-P5-R1 calm biome backdrop: flat/subtle vertical tint gradient, no ray fan. Pure, no Phaser.
import { TOKENS } from '../uiTokens';

export interface BgSpec {
  top: string;
  bottom: string;
  outer: string;
  w: number;
  h: number;
  dim: boolean;
}

export interface BgCtx {
  fillStyle: unknown;
  fillRect(x: number, y: number, w: number, h: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): { addColorStop(o: number, c: string): void };
}

const clampBiome = (b: number): number => Math.min(TOKENS.d4run.bg.length, Math.max(1, Math.round(b)));

export const bgKey = (biome: number, w: number, h: number, dim = false): string =>
  `d4/bg/${clampBiome(biome)}/${Math.ceil(w)}x${Math.ceil(h)}${dim ? '/dim' : ''}`;

// D4-P5-R1 calm biome backdrop: flat/subtle vertical tint, no ray fan.
export function bgSpec(biome: number, w: number, h: number, dim = false): BgSpec {
  const d4run = TOKENS.d4run;
  const [top, bottom] = d4run.bg[clampBiome(biome) - 1]!;
  return { top, bottom, outer: bottom, w, h, dim };
}

// D4-P5-R1 paint: single vertical linear gradient fillRect (plus subtle dim veil when dim), zero arcs/wedges.
export function paintBackground(ctx: BgCtx, s: BgSpec): void {
  const g = ctx.createLinearGradient(0, 0, 0, s.h);
  g.addColorStop(0, s.top);
  g.addColorStop(1, s.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.w, s.h);
  if (s.dim) {
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, 0, s.w, s.h);
  }
}
