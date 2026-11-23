import { expect, it } from 'vitest';
import { D4_RUN } from '../../src/game/hud/d3HudLayout';
import { frameRects } from '../../src/game/render/board';
import { boardLook } from '../../src/game/render/biomePalette';

it('D4-P5-R1 rounded tactile frame with 4px scaled lip and subtle inner top shadow', () => {
  const cell = 30, scale = cell / 24, size = 510, f = frameRects(boardLook(1), size, cell);
  const pad = D4_RUN.board.stroke * scale;
  expect(f.frame).toMatchObject({ x: -pad, y: -pad, w: size + 2 * pad, h: size + 2 * pad, r: D4_RUN.board.radius * scale, color: boardLook(1).frame, alpha: 1 });
  expect(f.drop.y - f.frame.y).toBeCloseTo(D4_RUN.board.lip * scale);
  expect(f.drop.alpha).toBe(1);
  expect(f.shadow).toMatchObject({ x: 0, y: 0, w: size, h: 15, alpha: 0.08 });
});
