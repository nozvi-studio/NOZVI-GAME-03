import { expect, it } from 'vitest';
import { biome } from '../../src/core';
import { boardLook, contrastRatio, DEFAULT_LOOK, mixInt } from '../../src/game/render/biomePalette';
import { DARK, LIGHT, themeOf } from '../../src/game/render/palette';
import { toInt } from '../../src/game/uiTokens';
import { loadBalance } from '../support/balance';

const themes = ['light', 'dark'] as const;

it('P3b1-R1 every level 1-30 resolves a look in both themes with a readable edge and a visible checker', () => {
  const b = loadBalance();
  for (const theme of themes) for (let level = 1; level <= 30; level++) {
    const look = boardLook(biome(b, level), theme);
    expect(look.theme).toBe(theme);
    expect(look.groundA).not.toBe(look.groundB);
    expect(contrastRatio(look.edge, look.groundA)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(look.edge, look.groundB)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(look.woodEdge, look.groundA)).toBeGreaterThanOrEqual(3);
    expect(look.gridAlpha).toBeGreaterThan(0);
    expect(look.gridAlpha).toBeLessThan(1);
  }
});

it('P3b1-R1 light grounds match BiomeBoardsD2 and the six biomes are all different', () => {
  expect([1, 2, 3, 4, 5, 6].map(n => [boardLook(n, 'light').groundA, boardLook(n, 'light').groundB])).toEqual([
    [toInt('#CFEBD0'), toInt('#F4E7A6')], [toInt('#D9EDC2'), toInt('#EADFA4')], [toInt('#DCEFFB'), toInt('#F5FBFF')],
    [toInt('#EBDDBC'), toInt('#DCC79B')], [toInt('#F8D2A6'), toInt('#F0BF8A')], [toInt('#3B3363'), toInt('#332C58')],
  ]);
  expect(boardLook(1, 'light').edge).toBe(toInt('#2B3248'));
  expect(boardLook(6, 'light').edge).toBe(toInt('#FFFFFF'));
  expect(new Set([1, 2, 3, 4, 5, 6].map(n => boardLook(n, 'dark').groundA)).size).toBe(6);
});

it('P3b1-R1 dark theme darkens biomes 1-5 and keeps Storm Garden', () => {
  expect(boardLook(2, 'dark').groundA).toBe(mixInt(toInt('#D9EDC2'), toInt('#131D15'), 0.7));
  expect(boardLook(6, 'dark').groundA).toBe(boardLook(6, 'light').groundA);
  expect(boardLook(3, 'dark').edge).toBe(toInt('#FFFFFF'));
});

it('P3b1-R1 out-of-range biomes clamp, DEFAULT_LOOK is Orchard light, themeOf maps the palettes', () => {
  expect(boardLook(0, 'light')).toEqual(boardLook(1, 'light'));
  expect(boardLook(99, 'dark')).toEqual(boardLook(6, 'dark'));
  expect(DEFAULT_LOOK).toEqual(boardLook(1, 'light'));
  expect(themeOf(LIGHT)).toBe('light');
  expect(themeOf(DARK)).toBe('dark');
});

it('P3b1-R1 contrastRatio is the WCAG ratio', () => {
  expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(21, 1);
  expect(contrastRatio(0x808080, 0x808080)).toBeCloseTo(1, 5);
});
