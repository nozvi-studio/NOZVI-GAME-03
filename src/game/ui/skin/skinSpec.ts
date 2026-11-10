// src/game/ui/skin/skinSpec.ts
// D3-R5 pure paint recipes for the skin kit: no Phaser, no canvas. Sizes are game px; `unit` = game px per mock px (ui(1)).
import { TOKENS, type D3Tone } from '../../uiTokens';

const D = TOKENS.d3, S = D.shape;
export type SkinKind = 'button' | 'round' | 'chip' | 'panel' | 'bar' | 'ribbon' | 'skill';
export type SkinTone = D3Tone;
export type SkinState = 'rest' | 'pressed' | 'disabled' | 'lip';
export interface SkinGloss { x: number; y: number; w: number; h: number; r: number; top: number; bottom: number }
export interface SkinRecipe {
  kind: SkinKind; w: number; h: number; r: number; stops: readonly string[];
  line: { px: number; color: string } | null; gloss: SkinGloss | null; notch: number;
}
const RIBBON_NOTCH = 0.25, GLOSS_INSET = 3;
const isBig = (kind: SkinKind, tone: SkinTone): boolean => kind === 'skill' || (kind === 'button' && tone === 'primary');

/** D3-R5 depth of the static lip under a face. */
export function lipPx(kind: SkinKind, tone: SkinTone, unit: number): number {
  if (kind === 'bar') return 0;
  return unit * (kind === 'skill' ? S.lipSkill : isBig(kind, tone) ? S.lipBig : S.lip);
}
/** D3-R5 corner radius per kind. */
export function skinRadius(kind: SkinKind, _w: number, h: number, unit: number): number {
  if (kind === 'ribbon') return 0;
  if (kind === 'panel') return unit * S.radiusPanel;
  if (kind === 'button') return Math.min(h / 2, unit * S.radiusBig);
  return h / 2;
}
/** D3-R5/R21 recipe for one face. `lip` = flat lip-coloured shape; `disabled` = off tone, no gloss; `pressed` = dimmer gloss. */
export function skinRecipe(kind: SkinKind, tone: SkinTone, w: number, h: number, state: SkinState, unit: number): SkinRecipe {
  const t = D.tone[state === 'disabled' ? 'off' : tone];
  const r = skinRadius(kind, w, h, unit), notch = kind === 'ribbon' ? h * RIBBON_NOTCH : 0;
  if (state === 'lip') return { kind, w, h, r, stops: [t.lip, t.lip], line: null, gloss: null, notch };
  const fill = kind === 'bar' && tone !== 'track';
  const linePx = unit * (isBig(kind, tone) ? S.lineBig : S.line);
  const glossy = state !== 'disabled' && tone !== 'off' && kind !== 'panel' && kind !== 'ribbon' && !(kind === 'bar' && !fill);
  const mul = state === 'pressed' ? S.pressedGloss : 1;
  const inset = (fill ? 0 : linePx) + unit * GLOSS_INSET, gh = h * S.glossFrac;
  return {
    kind, w, h, r, stops: t.face, notch,
    line: fill ? null : { px: linePx, color: t.line },
    gloss: glossy ? { x: inset, y: inset, w: w - 2 * inset, h: gh, r: Math.min(Math.max(0, r - inset), gh / 2), top: S.glossTop * mul, bottom: S.glossBottom * mul } : null,
  };
}
