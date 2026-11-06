import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { snakeHeadPoint } from '../../src/game/render/snake';

const snap = (alpha: number): SimSnapshot => ({
  snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }], headFrom: { x: 2, y: 2 }, tailFrom: { x: 1, y: 2 }, tickAlpha: alpha,
} as unknown as SimSnapshot);

it('ART-001 capy head follows the interpolated snake head centre', () => {
  expect(snakeHeadPoint(snap(0), 10)).toEqual({ x: 25, y: 25 });
  expect(snakeHeadPoint(snap(1), 10)).toEqual({ x: 35, y: 25 });
  expect(snakeHeadPoint(snap(0.5), 10)).toEqual({ x: 30, y: 25 });
});
