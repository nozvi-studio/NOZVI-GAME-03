import { expect, it } from 'vitest';
import { frameRects } from '../../src/game/render/board';
import { boardLook } from '../../src/game/render/biomePalette';

it('D3-R12 frame overhangs 0.4 cell, drop shadow 0.2 cell lower, inner shadow 0.5 cell on top', () => {
  const cell = 30, size = 510, f = frameRects(boardLook(1), size, cell);
  expect(f.frame).toMatchObject({ x: -12, y: -12, w: 534, h: 534, r: 39, color: boardLook(1).frame, alpha: 1 });
  expect(f.drop.y - f.frame.y).toBeCloseTo(6); expect(f.drop.alpha).toBe(0.5);
  expect(f.shadow).toMatchObject({ x: 0, y: 0, w: size, h: 15, alpha: 0.16 });
});
