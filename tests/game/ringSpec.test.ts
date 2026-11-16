import { expect, it } from 'vitest';
import { ringRecipe, ringTexture, type TextureHost } from '../../src/game/ui/skin';
import { TOKENS } from '../../src/game/uiTokens';

const S = TOKENS.d3.shape;
it('D3-R21 ring is 4 px outside the outline in mango yellow with a 2 px lift (U6-R2)', () => {
  const rc = ringRecipe(78, 78, 39, 6, 1);
  expect(rc.outset).toBe(S.selectedRing); expect(rc.lift).toBe(S.selectedLift);
  expect(rc.color).toBe(TOKENS.d3.logo.mango);
  expect(rc.w).toBe(78 + 2 * 4); expect(rc.h).toBe(78 + 6 + 2 * 4); expect(rc.r).toBe(39 + 4);
});
it('D3-R21 ring scales with the unit and is cached per shape', () => {
  expect(ringRecipe(78, 78, 39, 6, 2.5).outset).toBe(10);
  const made: string[] = [];
  const host: TextureHost = { exists: k => made.includes(k), createCanvas: k => { made.push(k); return { context: ctx(), refresh() {} }; } };
  const a = ringTexture(host, 78, 78, 39, 6, 1), b = ringTexture(host, 78, 78, 39, 6, 1);
  expect(a).toBe(b); expect(made).toHaveLength(1);
});
const ctx = () => new Proxy({}, { get: (_t, p) => p === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => undefined, set: () => true }) as never;
