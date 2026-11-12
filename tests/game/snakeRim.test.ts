import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { drawSnake } from '../../src/game/render/snake';
import { boardLook } from '../../src/game/render/biomePalette';
import { gfx } from '../support/gfx';

const snap = { snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }], headFrom: { x: 2, y: 3 }, tailFrom: { x: 1, y: 3 }, tickAlpha: 1,
  dir: { x: 1, y: 0 }, status: 'playing', outcome: null } as unknown as SimSnapshot;

it('D3-R12 B2 outline is drawn in every biome in look.outline.snake', () => {
  for (const [n, color] of [[1, 0x2b2f9e], [6, 0x7cf2d4]] as const) {
    const { g, calls } = gfx(); drawSnake(g, snap, 20, boardLook(n), 0, false);
    const lines = calls.filter(c => c[0] === 'lineStyle');
    expect(lines[0]![2]).toBe(color);
    expect(lines[0]![1] as number).toBeCloseTo(20 * 0.96);
  }
});
