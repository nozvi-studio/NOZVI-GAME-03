import { expect, it } from 'vitest';
import { formatReport } from '../../tools/bot/report';

it('MEC-019-R14 lists terrain deaths per template', () => {
  const r = formatReport([
    { level: 3, seed: 1, outcome: 'death', cause: 'terrain', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 2, outcome: 'death', cause: 'terrain', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 3, outcome: 'death', cause: 'rock', biome: 1, terrain: 'b1s2' },
    { level: 3, seed: 4, outcome: 'clear', biome: 1, terrain: 'b1s2' },
  ]);
  expect(r.markdown).toContain('### Terrain deaths per template');
  expect(r.markdown).toContain('| b1s2 | 2 | 3 | 67% |');
  expect(r.warnings).toContain('WARN biome 1: terrain 67% of deaths (> 40%)');
});
