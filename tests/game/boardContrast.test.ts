import { expect, it } from 'vitest';
import { boardLook, contrastRatio } from '../../src/game/render/biomePalette';

// D3-R2 board outlines keep >= 3:1 against both cells of every biome.
it('D3-R2 snake, mango, rock and warn outlines vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const k of ['snake', 'mango', 'rock', 'warn'] as const) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(l.outline[k], cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});
