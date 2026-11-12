import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { snakeHeadPoint, snakeWidths } from '../../src/game/render/snake';

const snap = (alpha: number): SimSnapshot => ({
  snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }], headFrom: { x: 2, y: 2 }, tailFrom: { x: 1, y: 2 }, tickAlpha: alpha,
} as unknown as SimSnapshot);

it('ART-001 capy head follows the interpolated snake head centre', () => {
  expect(snakeHeadPoint(snap(0), 10)).toEqual({ x: 25, y: 25 });
  expect(snakeHeadPoint(snap(1), 10)).toEqual({ x: 35, y: 25 });
  expect(snakeHeadPoint(snap(0.5), 10)).toEqual({ x: 30, y: 25 });
});
it('D3-R12 head disc is 1.4 cells wide plus outline', () => {
  const w = snakeWidths(30);
  expect(w.head).toBeCloseTo(21); expect(w.headOutline).toBeCloseTo(3); expect(w.body).toBeCloseTo(22.8); expect(w.outline).toBeCloseTo(28.8);
});
