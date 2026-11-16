// src/game/ui/skin/skinTextures.ts
// D3-R5 one canvas texture per (kind, tone, state, size), painted once and kept for the life of the game.
import { paintRing, paintSkin, type Ctx2D } from './skinPaint';
import { ringRecipe } from './ringSpec';
import { skinRecipe, type SkinKind, type SkinState, type SkinTone } from './skinSpec';

export interface CanvasTex { context: Ctx2D; refresh(): unknown }
export interface TextureHost { exists(key: string): boolean; createCanvas(key: string, w: number, h: number): CanvasTex | null }
export const skinKey = (kind: SkinKind, tone: SkinTone, state: SkinState, w: number, h: number): string =>
  `d3/${kind}/${tone}/${state}/${Math.ceil(w)}x${Math.ceil(h)}`;
export function skinTexture(host: TextureHost, kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState, unit: number): string {
  const W = Math.ceil(w), H = Math.ceil(h), key = skinKey(kind, tone, state, W, H);
  if (host.exists(key)) return key;
  const tex = host.createCanvas(key, W, H);
  if (!tex) throw new Error(`skinTextures: cannot create ${key}`);
  paintSkin(tex.context, skinRecipe(kind, tone, W, H, state, unit));
  tex.refresh();
  return key;
}
/** Phaser's TextureManager satisfies TextureHost (CanvasTexture has `context` and `refresh`). */
export const hostOf = (scene: { textures: unknown }): TextureHost => scene.textures as TextureHost;

export const ringKey = (w: number, h: number, r: number, lip: number): string => `d3/ring/${Math.ceil(w)}x${Math.ceil(h)}/${Math.round(r)}/${Math.round(lip)}`;
export function ringTexture(host: TextureHost, w: number, h: number, r: number, lip: number, unit: number): string {
  const key = ringKey(w, h, r, lip);
  if (host.exists(key)) return key;
  const rc = ringRecipe(w, h, r, lip, unit), tex = host.createCanvas(key, Math.ceil(rc.w), Math.ceil(rc.h));
  if (!tex) throw new Error(`skinTextures: cannot create ${key}`);
  paintRing(tex.context, rc); tex.refresh(); return key;
}
