import { TOKENS, toInt } from '../uiTokens';

// D3-R4 per-biome board look: frame, two-tone checker of one hue, outline set (biome 6 = light set). Pure: no Phaser.
export interface BoardLook {
  biome: number; frame: number; groundA: number; groundB: number;
  outline: { snake: number; mango: number; rock: number; warn: number };
  snake: { body: number; head: number; belly: number };
  edge: number; woodEdge: number; // hazard outlines (= outline.rock)
}
const STORM = 6;

export function mixInt(a: number, b: number, t: number): number {
  const ch = (s: number): number => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
const channel = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (c: number): number => 0.2126 * channel((c >> 16) & 255) + 0.7152 * channel((c >> 8) & 255) + 0.0722 * channel(c & 255);
export function contrastRatio(a: number, b: number): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function boardLook(biome: number): BoardLook {
  const n = Math.min(STORM, Math.max(1, Math.round(biome)));
  const b = TOKENS.d3.biomes[n - 1]!, o = n === STORM ? TOKENS.d3.outlineStorm : TOKENS.d3.outline, s = TOKENS.d3.snake;
  const outline = { snake: toInt(o.snake), mango: toInt(o.mango), rock: toInt(o.rock), warn: toInt(o.warn) };
  return { biome: n, frame: toInt(b.frame), groundA: toInt(b.cells[0]), groundB: toInt(b.cells[1]), outline,
    snake: { body: toInt(s.body), head: toInt(s.head), belly: toInt(s.belly) }, edge: outline.rock, woodEdge: outline.rock };
}
export const DEFAULT_LOOK: BoardLook = boardLook(1);
