import { SKIN_BODY, activeSkin, type SkinId } from '../art/skins';
import { TOKENS, toInt } from '../uiTokens';

// D3-R4 per-biome board look: frame, two-tone checker of one hue, outline set (biome 6 = light set). Pure: no Phaser.
export interface BoardLook {
  biome: number; frame: number; groundA: number; groundB: number;
  outline: { snake: number; mango: number; rock: number; warn: number };
  snake: { body: number; head: number; belly: number; stripe: number };
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

// MEC-011-R4 the snake colours of a look come from the equipped skin; the default skin keeps the D3 tokens.
export function boardLook(biome: number, skin: SkinId = activeSkin()): BoardLook {
  const n = Math.min(STORM, Math.max(1, Math.round(biome)));
  const b = TOKENS.d3.biomes[n - 1]!, o = n === STORM ? TOKENS.d3.outlineStorm : TOKENS.d3.outline, body = SKIN_BODY[skin], s = body ?? TOKENS.d3.snake;
  const outline = { snake: toInt(body ? (n === STORM ? body.outlineStorm : body.outline) : o.snake), mango: toInt(o.mango), rock: toInt(o.rock), warn: toInt(o.warn) };
  return { biome: n, frame: toInt(b.frame), groundA: toInt(b.cells[0]), groundB: toInt(b.cells[1]), outline,
    snake: { body: toInt(s.body), head: toInt(s.head), belly: toInt(s.belly), stripe: toInt(s.stripe) }, edge: outline.rock, woodEdge: outline.rock };
}
/** D3-R2 outline colour each hazard family draws with in a biome; every entry keeps >= 3:1 on both cells of all biomes. */
export const HAZARD_EDGES: Record<'fence' | 'hedge' | 'mud' | 'ice' | 'stone' | 'coconut' | 'bomb' | 'npc' | 'spike' | 'gate' | 'shrink', (l: BoardLook) => number> = {
  fence: l => l.woodEdge, hedge: l => l.edge, mud: l => l.woodEdge, ice: l => l.edge, stone: l => l.edge, coconut: l => l.edge,
  bomb: l => l.outline.warn, npc: l => l.edge, spike: l => l.edge, gate: l => l.edge, shrink: l => l.outline.warn,
};
export const DEFAULT_LOOK: BoardLook = boardLook(1, 'snake');
