import { expect, it } from 'vitest';
import { groundRects } from '../../src/game/render/board';
import { boardLook } from '../../src/game/render/biomePalette';

it('D3-R4 checker ground has no grid lines', () => {
  const look = boardLook(1);
  const rects = groundRects(look, 17, 17, 30);
  expect(rects).toHaveLength(17 * 17);
  for (const r of rects) {
    expect(r.alpha).toBe(1);
    expect(r.color).toBe((Math.round(r.x / 30) + Math.round(r.y / 30)) % 2 ? look.groundB : look.groundA);
  }
});
