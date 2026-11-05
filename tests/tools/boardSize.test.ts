import { it, expect } from 'vitest';
import { median, boardSizeVerdict, reachableFreeCells } from '../../tools/bot/boardSize';
import { loadBalance } from '../support/balance';
import { buildBoard } from '../support/board';

const CELLS = 289;
const r = (level: number, share: number, clearRate: number) => ({ level, medianReachable: share * CELLS, boardCells: CELLS, share, clearRate });
it('MEC-004-R20 median of an even list is the mean of the middle two', () => {
  expect(median([4, 1, 3, 2])).toBe(2.5);
  expect(median([5, 1, 3])).toBe(3);
});
it('MEC-004-R20 board-size escalates on reachable share < 40% or L26-30 clear rate < half of L21-25', () => {
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.5, 0.5), 0.8, 0.5).escalate).toBe(false);
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.39, 0.5), 0.8, 0.5).reasons).toContain('L30 median reachable 39% < 40%');
  expect(boardSizeVerdict(r(25, 0.6, 0.8), r(30, 0.5, 0.3), 0.8, 0.3).reasons).toContain('L26-30 clear rate 30% < half of L21-25 (80%)');
});
it('MEC-004-R20 reachableFreeCells counts the open board minus the snake body', () => {
  expect(reachableFreeCells(buildBoard({ head: [8, 8], dir: [1, 0], body: [[7, 8], [6, 8], [5, 8]] }), loadBalance())).toBe(CELLS - 3);
});
