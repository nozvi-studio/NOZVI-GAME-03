import { expect, it } from 'vitest';
import { createSimInternal, stateOf } from '../../src/core/simInternal';
import { runLevel } from '../../tools/bot/runLevel';
import { loadGameBalance } from '../support/balance';

const g = loadGameBalance();
const LEVELS = [1, 3, 5, 6, 8, 11, 13, 16, 18, 21, 23, 26, 28], SEEDS = [1, 2, 3];

it.skipIf(import.meta.env.MODE !== 'fuzz').each(LEVELS)('MEC-019-R8 L%i: nothing ever shares a cell with fixed terrain (bot run)', level => {
  for (const seed of SEEDS) {
    runLevel(g, level, seed, s => {
      const tiles = new Set(s.families.fixedTerrain.cells.filter(c => c.state === 'solid').map(c => `${c.x},${c.y}`));
      if (s.mango) expect(tiles.has(`${s.mango.x},${s.mango.y}`)).toBe(false);
      for (const o of s.orbs) expect(tiles.has(`${o.x},${o.y}`)).toBe(false);
      for (const f of ['rock', 'fence', 'maze'] as const) for (const h of s.families[f]) for (const c of h.cells) expect(tiles.has(`${c.x},${c.y}`)).toBe(false);
    });
  }
}, 120000);

it('MEC-019 determinism: same seed gives the same terrain and state after 20 s', () => {
  const run = () => { const sim = createSimInternal(g, 42, { startLevel: 8 }, {}); sim.advance(20000); return stateOf(sim); };
  expect(run()).toEqual(run());
});
