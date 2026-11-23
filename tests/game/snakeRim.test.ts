import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { drawSnake } from '../../src/game/render/snake';
import { boardLook } from '../../src/game/render/biomePalette';
import { gfx } from '../support/gfx';

const snap = { snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }], headFrom: { x: 2, y: 3 }, tailFrom: { x: 1, y: 3 }, tickAlpha: 1,
  dir: { x: 1, y: 0 }, status: 'playing', outcome: null } as unknown as SimSnapshot;

it('D3-R12 B2 outline is drawn in every biome in look.outline.snake', () => {
  for (const n of [1, 6] as const) {
    const look = boardLook(n);
    const { g, calls } = gfx(); drawSnake(g, snap, 20, look, 0, 1.2, false);
    const lines = calls.filter(c => c[0] === 'lineStyle');
    expect(lines[0]![2]).toBe(look.outline.snake);
    expect(lines[0]![1] as number).toBeCloseTo(20 * 0.96);
  }
});
