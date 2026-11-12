import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { snakeHeadPoint, snakeWidths } from '../../src/game/render/snake';
import { SNAKE } from '../../src/game/render/boardParts';
import { loadBalance } from '../support/balance';

const balance = loadBalance();

const snap = (alpha: number): SimSnapshot => ({
  snake: [{ x: 3, y: 2 }, { x: 2, y: 2 }], headFrom: { x: 2, y: 2 }, tailFrom: { x: 1, y: 2 }, tickAlpha: alpha,
} as unknown as SimSnapshot);

it('ART-001 capy head follows the interpolated snake head centre', () => {
  expect(snakeHeadPoint(snap(0), 10)).toEqual({ x: 25, y: 25 });
  expect(snakeHeadPoint(snap(1), 10)).toEqual({ x: 35, y: 25 });
  expect(snakeHeadPoint(snap(0.5), 10)).toEqual({ x: 30, y: 25 });
});
it('D3-R12 body widths stay fixed fractions of a cell', () => {
  const w = snakeWidths(30, 1.2);
  expect(w.headOutline).toBeCloseTo(3); expect(w.body).toBeCloseTo(22.8); expect(w.outline).toBeCloseTo(28.8);
});
it('D3-R12 head disc derives from the face size and stays hidden behind it, even at full gulp', () => {
  for (const face of [1, 1.2, 1.5]) {
    const w = snakeWidths(30, face);
    const fullGulpDiameter = 2 * (w.head * (1 + SNAKE.gulp) + w.headOutline);
    expect(fullGulpDiameter).toBeLessThanOrEqual(30 * face);
  }
  expect(snakeWidths(30, 1.5).head).toBeGreaterThan(snakeWidths(30, 1.2).head);
});
it('D3-R12 in-game face size comes from balance ui.capy.headCellScale', () => {
  expect(balance.ui.capy.headCellScale).toBeGreaterThan(0);
  const w = snakeWidths(30, balance.ui.capy.headCellScale);
  expect(2 * (w.head * (1 + SNAKE.gulp) + w.headOutline)).toBeLessThanOrEqual(30 * balance.ui.capy.headCellScale);
});
