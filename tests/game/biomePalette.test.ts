import { expect, it } from 'vitest';
import { boardLook, contrastRatio, DEFAULT_LOOK, mixInt } from '../../src/game/render/biomePalette';
import { TOKENS, toInt } from '../../src/game/uiTokens';
import { SKIN_BODY } from '../../src/game/art/skins';

it('D4-P5-R1 each biome takes frame and cells from TOKENS.d4run', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    expect(l).toMatchObject({
      biome: n,
      frame: toInt(TOKENS.d4run.frame[n - 1]!),
      groundA: toInt(TOKENS.d4run.cells[n - 1]![0]),
      groundB: toInt(TOKENS.d4run.cells[n - 1]![1]),
    });
  }
});
it('D3-R4 B1 B2 biome 6 uses the light outline set, others the dark set; edge = rock outline', () => {
  expect(boardLook(1).outline.snake).toBe(toInt(TOKENS.d3.outline.snake));
  expect(boardLook(6).outline.snake).toBe(toInt(TOKENS.d3.outlineStorm.snake));
  for (const n of [1, 6]) expect(boardLook(n).edge).toBe(boardLook(n).outline.rock);
});
it('D3-R4 biome is clamped to 1..6 and DEFAULT_LOOK is biome 1', () => {
  expect(boardLook(0).biome).toBe(1); expect(boardLook(9).biome).toBe(6);
  expect(DEFAULT_LOOK).toEqual(boardLook(1));
});
it('D3-R2 snake outline is >= 3:1 against both cell colours of every biome', () => {
  for (let n = 1; n <= 6; n++) { const l = boardLook(n);
    expect(contrastRatio(l.outline.snake, l.groundA)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(l.outline.snake, l.groundB)).toBeGreaterThanOrEqual(3); }
});
it('P3b1-R1 contrastRatio is the WCAG ratio and mixInt blends', () => {
  expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(21, 1);
  expect(contrastRatio(0x808080, 0x808080)).toBeCloseTo(1, 5);
  expect(mixInt(0x000000, 0xffffff, 0)).toBe(0);
});
it('MEC-011-R4 the board look takes the snake colours from the skin; the snake skin keeps the D3 tokens', () => {
  const base = boardLook(2, 'snake'), capy = boardLook(2, 'capy'), storm = boardLook(6, 'capy');
  expect(base.snake.body).toBe(toInt(TOKENS.d3.snake.body)); expect(base.outline.snake).toBe(toInt(TOKENS.d3.outline.snake));
  expect(capy.snake.body).toBe(toInt(SKIN_BODY.capy!.body)); expect(capy.outline.snake).toBe(toInt(SKIN_BODY.capy!.outline));
  expect(storm.outline.snake).toBe(toInt(SKIN_BODY.capy!.outlineStorm));
  expect(capy.outline.mango).toBe(base.outline.mango); // only the snake entries change
});
