// tests/game/skinSpec.test.ts
import { expect, it } from 'vitest';
import { lipPx, skinRadius, skinRecipe } from '../../src/game/ui/skin/skinSpec';
import { TOKENS } from '../../src/game/uiTokens';

const D = TOKENS.d3, U = 2; // unit: 2 game px per mock px

it('D3-R5 a primary button gets the big outline, a 28-unit radius cap and a gloss band', () => {
  const r = skinRecipe('button', 'primary', 560, 168, 'rest', U);
  expect(r.line).toEqual({ px: D.shape.lineBig * U, color: D.tone.primary.line });
  expect(r.r).toBe(D.shape.radiusBig * U);
  expect(r.stops).toEqual(D.tone.primary.face);
  expect(r.gloss).not.toBeNull();
  expect(r.gloss!.top).toBe(D.shape.glossTop);
  expect(r.gloss!.h).toBeCloseTo(168 * D.shape.glossFrac);
});
it('D3-R21 pressed halves the gloss; disabled uses the off tone without gloss', () => {
  const rest = skinRecipe('button', 'secondary', 300, 88, 'rest', U);
  const pressed = skinRecipe('button', 'secondary', 300, 88, 'pressed', U);
  expect(pressed.gloss!.top).toBeCloseTo(rest.gloss!.top * D.shape.pressedGloss);
  expect(pressed.gloss!.bottom).toBeCloseTo(rest.gloss!.bottom * D.shape.pressedGloss);
  const off = skinRecipe('button', 'secondary', 300, 88, 'disabled', U);
  expect(off.stops).toEqual(D.tone.off.face); expect(off.gloss).toBeNull(); expect(off.line!.color).toBe(D.tone.off.line);
});
it('D3-R5 the lip state is a flat shape in the lip colour, same size and radius', () => {
  const face = skinRecipe('round', 'light', 92, 92, 'rest', U), lip = skinRecipe('round', 'light', 92, 92, 'lip', U);
  expect(lip.stops).toEqual([D.tone.light.lip, D.tone.light.lip]);
  expect(lip.line).toBeNull(); expect(lip.gloss).toBeNull();
  expect([lip.w, lip.h, lip.r]).toEqual([face.w, face.h, face.r]);
});
it('D3-R5 lip depth per kind: primary button 8, skill 6, others 4, bar 0', () => {
  expect(lipPx('button', 'primary', U)).toBe(D.shape.lipBig * U);
  expect(lipPx('skill', 'skillA', U)).toBe(D.shape.lipSkill * U);
  expect(lipPx('button', 'light', U)).toBe(D.shape.lip * U);
  expect(lipPx('chip', 'light', U)).toBe(D.shape.lip * U);
  expect(lipPx('bar', 'track', U)).toBe(0);
});
it('D3-R5 radius per kind: pill kinds use half height, panel the panel radius, ribbon square', () => {
  expect(skinRadius('chip', 200, 80, U)).toBe(40);
  expect(skinRadius('skill', 156, 156, U)).toBe(78);
  expect(skinRadius('panel', 600, 700, U)).toBe(D.shape.radiusPanel * U);
  expect(skinRadius('ribbon', 320, 100, U)).toBe(0);
  expect(skinRadius('button', 300, 40, U)).toBe(20);
});
it('D3-R5 panels, ribbons and bar tracks have no gloss; a bar fill has gloss and no outline', () => {
  expect(skinRecipe('panel', 'light', 600, 700, 'rest', U).gloss).toBeNull();
  expect(skinRecipe('ribbon', 'ribbon', 320, 100, 'rest', U).gloss).toBeNull();
  expect(skinRecipe('bar', 'track', 400, 52, 'rest', U).gloss).toBeNull();
  const fill = skinRecipe('bar', 'mango', 400, 40, 'rest', U);
  expect(fill.gloss).not.toBeNull(); expect(fill.line).toBeNull();
});
it('D3-R5 a ribbon has a notch of a quarter of its height', () => {
  expect(skinRecipe('ribbon', 'ribbon', 320, 100, 'rest', U).notch).toBe(25);
  expect(skinRecipe('button', 'primary', 320, 100, 'rest', U).notch).toBe(0);
});
