import { addTimedHazards, timedHazards } from '../../src/core/hazards/timed';
import { describe, expect, it } from 'vitest';
import { isReserved } from '../../src/core/reserved';
import { cellBfsWall, cellReserved } from '../../src/core/cells';
import { makeTimed } from '../../src/core/hazards/timed';
import { buildState } from '../support/state';
import { loadBalance } from '../support/balance';

const b = loadBalance();
describe('MEC-002 reserved list', () => {
  it('MEC-002-R2 isReserved covers snake, mango, rotten rock (both states), hazards (warn/solid/crumble) and terrain cells', () => {
    const s = buildState(b, { mango: [2, 2] });
    s.families.rottenRock = [
      { family: 'rottenRock', x: 3, y: 3, state: 'solid', leftMs: 5000 },
      { family: 'rottenRock', x: 4, y: 3, state: 'crumble', leftMs: 450 },
    ];
    for (const [i, family] of (['rock', 'fence', 'maze'] as const).entries()) {
      for (const [j, state] of (['warn', 'solid', 'crumble'] as const).entries()) {
        const h = makeTimed(family, [{ x: i, y: j + 10 }], 1500, 6000);
        h.state = state; addTimedHazards(s, h);
      }
    }
    s.families.terrain = [{ family: 'terrain', t: 0, lifeMs: 5000, cells: [{ x: 5, y: 5, up: false, vis: 'down', delay: 0 }] }];
    const cells = [...s.snake, s.mango!, ...s.families.rottenRock, ...timedHazards(s).flatMap(h => h.cells), ...s.families.terrain[0]!.cells];
    for (const c of cells) {
      expect(isReserved(s, c.x, c.y), JSON.stringify(c)).toBe(true);
      expect(cellReserved(s, c.x, c.y)).toBe(true);
    }
    expect(isReserved(s, 16, 16)).toBe(false);
    for (const r of s.families.rottenRock) expect(cellBfsWall(s, r.x, r.y)).toBe(true);
  });
});
