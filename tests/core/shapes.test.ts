import { describe, expect, it } from 'vitest';
import { fencePool, lineFence, mazeCells, rockPool, transform } from '../../src/core/hazards/shapes';
import { fixed } from '../support/rngStub';
import { loadBalance } from '../support/balance';

const b = loadBalance();
describe('MEC-004 shapes', () => {
  it.each([
    [0, ['single']], [1, ['single']],
    [2, ['single', 'lineH', 'lineV']], [3, ['single', 'lineH', 'lineV']],
    [4, ['single', 'lineH', 'lineV', 'corner', 'block']],
  ])('MEC-004 rockPool by level %i', (level, want) => {
    expect(rockPool(b, level as number)).toEqual(want);
  });

  it.each([
    [2, ['line', 'L']], [3, ['line', 'L', 'T', 'Z']],
    [4, ['line', 'L', 'T', 'Z', 'F', 'U', 'plus']],
  ])('MEC-004 fencePool by level %i', (level, want) => {
    expect(fencePool(b, level as number)).toEqual(want);
  });
  it('MEC-004 maze layouts have 20, 30, 20 and 28 cells; layout 4 drops (12,5) and (4,11)', () => {
    const cells = b.maze.layouts.map(mazeCells);
    expect(cells.map(c => c.length)).toEqual([20, 30, 20, 28]);
    expect(cells[3]).not.toContainEqual({ x: 12, y: 5 });
    expect(cells[3]).not.toContainEqual({ x: 4, y: 11 });
    expect(cells[0]!.slice(0, 3)).toEqual([{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }]);   // L486 seg order
  });

  it('MEC-004 lineFence: length 5 + int(1 + min(4, level - 2)), one gap from length 7 (L449–455)', () => {
    const a = fixed([0]);
    expect(lineFence(b, 2, a.rng)).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
    expect(a.calls).toEqual(['int(1)']);
    const c = fixed([3, 2]);                              // len 8, gapAt 1 + 2 = 3
    expect(lineFence(b, 6, c.rng)).toEqual([[0, 0], [1, 0], [2, 0], [4, 0], [5, 0], [6, 0], [7, 0]]);
    expect(c.calls).toEqual(['int(5)', 'int(6)']);
  });

  it('MEC-004 transform: int(4) quarter turns [x,y]→[-y,x], then chance mirror [x,y]→[-x,y], then shift to 0 (L457–463)', () => {
    const a = fixed([1], [false]);
    expect(transform([[0, 0], [1, 0], [2, 0]], a.rng, 0.5)).toEqual([[0, 0], [0, 1], [0, 2]]);
    expect(a.calls).toEqual(['int(4)', 'chance(0.5)']);
    const m = fixed([0], [true]);
    expect(transform([[0, 0], [1, 0], [1, 1]], m.rng, 0.5)).toEqual([[1, 0], [0, 0], [0, 1]]);
  });
});
