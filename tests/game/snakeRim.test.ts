import { expect, it } from 'vitest';
import type { SimSnapshot } from '../../src/core';
import { drawSnake, SNAKE_RIM_CELL } from '../../src/game/render/snake';
import { DARK, LIGHT } from '../../src/game/render/palette';
import { gfx } from '../support/gfx';

const snap = { snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }], headFrom: { x: 2, y: 3 }, tailFrom: { x: 1, y: 3 }, tickAlpha: 1,
  dir: { x: 1, y: 0 }, status: 'playing', outcome: null } as unknown as SimSnapshot;
const RIM = 0x7cf2d4;

for (const p of [LIGHT, DARK]) it('UIFIX-R5 a rim colour is drawn under the body and head, wider than the body', () => {
  const { g, calls } = gfx(); drawSnake(g, snap, 20, p, 0, false, RIM);
  const lines = calls.filter(c => c[0] === 'lineStyle');
  expect(lines[0]![2]).toBe(RIM);                                              // first pass is the rim
  expect(lines[0]![1] as number).toBeCloseTo(20 * 0.78 + 2 * 20 * SNAKE_RIM_CELL);
  expect(lines.some(c => c[2] === p.snake)).toBe(true);                        // body still drawn after it
  expect(calls.findIndex(c => c[0] === 'fillStyle' && c[1] === RIM)).toBeLessThan(calls.findIndex(c => c[0] === 'fillStyle' && c[1] === p.snake));
});
it('UIFIX-R5 no rim colour is drawn when rim is null (default)', () => {
  const { g, calls } = gfx(); drawSnake(g, snap, 20, LIGHT, 0, false);
  expect(calls.some(c => c[1] === RIM || c[2] === RIM)).toBe(false);
});
