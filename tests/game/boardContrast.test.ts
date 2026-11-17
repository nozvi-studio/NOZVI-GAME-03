import { expect, it } from 'vitest';
import { boardLook, contrastRatio, HAZARD_EDGES } from '../../src/game/render/biomePalette';
import { SKIN_IDS } from '../../src/game/art/skins';

// D3-R2 board outlines keep >= 3:1 against both cells of every biome.
it('D3-R2 snake, mango, rock and warn outlines vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const k of ['snake', 'mango', 'rock', 'warn'] as const) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(l.outline[k], cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});

it('D3-R2 every hazard family outline vs both cells, biomes 1..6', () => {
  for (let n = 1; n <= 6; n++) {
    const l = boardLook(n);
    for (const [k, edge] of Object.entries(HAZARD_EDGES)) for (const cell of [l.groundA, l.groundB])
      expect(contrastRatio(edge(l), cell), `biome ${n} ${k}`).toBeGreaterThanOrEqual(3);
  }
});

for (const skin of SKIN_IDS) it(`MEC-011-R4 D3-R2 ${skin}: the body outline keeps the board contrast on both cells of all 6 biomes`, () => {
  for (let biome = 1; biome <= 6; biome++) {
    const look = boardLook(biome, skin);
    for (const cell of [look.groundA, look.groundB]) expect(contrastRatio(look.outline.snake, cell), `${skin} biome ${biome}`).toBeGreaterThanOrEqual(3);
  }
});
