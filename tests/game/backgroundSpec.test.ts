import { expect, it } from 'vitest';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { bgKey, bgSpec, paintBackground, type BgCtx } from '../../src/game/ui/backgroundSpec';
import { TOKENS, toInt } from '../../src/game/uiTokens';

it('D4-P5-R1 bgSpec has no wedges or ray colour for biomes 1..6 and clamps biome', () => {
  for (let b = 1; b <= 6; b++) {
    const s = bgSpec(b, 540, 960);
    expect(s.top).toBe(TOKENS.d4run.bg[b - 1]![0]);
    expect(s.bottom).toBe(TOKENS.d4run.bg[b - 1]![1]);
    expect(s.outer).toBe(s.bottom);
    expect('wedges' in s).toBe(false);
    expect('rayColor' in s).toBe(false);
  }
  expect(bgSpec(0, 540, 960).outer).toBe(TOKENS.d4run.bg[0]![1]);
  expect(bgSpec(9, 540, 960).outer).toBe(TOKENS.d4run.bg[5]![1]);
});

it('D4-P5-R1 paintBackground issues zero arc calls and one gradient fill (+ optional dim veil)', () => {
  const fills: unknown[] = [];
  const stops: [number, string][] = [];
  const ctx: BgCtx = {
    fillStyle: '',
    fillRect() { fills.push(ctx.fillStyle); },
    createLinearGradient: () => ({ addColorStop(o, c) { stops.push([o, c]); } }),
  };
  paintBackground(ctx, bgSpec(1, 540, 960, false));
  expect(fills.length).toBe(1);
  expect(stops).toEqual([[0, TOKENS.d4run.bg[0]![0]], [1, TOKENS.d4run.bg[0]![1]]]);

  fills.length = 0;
  paintBackground(ctx, bgSpec(1, 540, 960, true));
  expect(fills.length).toBe(2);
});

it('D4-P5-R1 all 6 Mystic biome backgrounds keep >= 4.5:1 contrast against white HUD text', () => {
  for (let b = 1; b <= 6; b++) {
    const [top, bottom] = TOKENS.d4run.bg[b - 1]!;
    expect(contrastRatio(0xffffff, toInt(top)), `biome ${b} top`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(0xffffff, toInt(bottom)), `biome ${b} bottom`).toBeGreaterThanOrEqual(4.5);
  }
});

it('D4-P5-R1 Storm background keeps >= 4.5:1 against white HUD text', () => {
  const [top, bottom] = TOKENS.d4run.bg[5]!;
  expect(contrastRatio(0xffffff, toInt(top))).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(0xffffff, toInt(bottom))).toBeGreaterThanOrEqual(4.5);
});

it('D4-P5-R1 bgKey uses d4/bg namespace with integer size and optional dim suffix', () => {
  expect(bgKey(3, 540, 1169.6)).toBe('d4/bg/3/540x1170');
  expect(bgKey(1, 540, 960, true)).toBe('d4/bg/1/540x960/dim');
});
