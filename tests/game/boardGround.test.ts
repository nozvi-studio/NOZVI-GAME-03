import { expect, it } from 'vitest';
import { groundRects } from '../../src/game/render/board';
import { boardLook } from '../../src/game/render/biomePalette';
import { GRID_LINE } from '../../src/game/render/boardParts';

it('P3b1-R3 ground is a cell checker of the two biome colours plus one grid line per cell edge', () => {
  const look = boardLook(1, 'light');
  const rects = groundRects(look, 4, 3, 20);
  const checker = rects.filter(r => r.alpha === 1);
  expect(checker).toHaveLength(12);
  const at = (x: number, y: number) => checker.find(r => r.x === x * 20 && r.y === y * 20)!;
  expect(at(0, 0).color).toBe(look.groundA);
  expect(at(1, 0).color).toBe(look.groundB);
  expect(at(0, 1).color).toBe(look.groundB);
  expect(at(1, 1).color).toBe(look.groundA);
  const lines = rects.filter(r => r.alpha !== 1);
  expect(lines).toHaveLength(4 + 3);
  for (const l of lines) { expect(l.color).toBe(look.grid); expect(l.alpha).toBe(look.gridAlpha); expect(Math.min(l.w, l.h)).toBeCloseTo(20 * GRID_LINE); }
});

it('P3b1-R3 grid lines sit on the trailing edge of each cell (mockup 18-20 of every 20 px)', () => {
  const lines = groundRects(boardLook(2, 'dark'), 2, 2, 20).filter(r => r.alpha !== 1);
  expect(lines.filter(l => l.w < l.h).map(l => l.x + l.w)).toEqual([20, 40]);
});
