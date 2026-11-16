// D3-R21 / U6-R2 selection ring recipe: a filled rounded shape painted under the face (pure).
import { TOKENS } from '../../uiTokens';
export interface RingRecipe { w: number; h: number; r: number; color: string; outset: number; lift: number }
export function ringRecipe(w: number, h: number, r: number, lip: number, unit: number): RingRecipe {
  const S = TOKENS.d3.shape, o = S.selectedRing * unit;
  return { w: w + 2 * o, h: h + lip + 2 * o, r: r + o, color: TOKENS.d3.logo.mango, outset: o, lift: S.selectedLift * unit };
}
