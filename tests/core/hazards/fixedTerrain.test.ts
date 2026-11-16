import { describe, expect, it } from 'vitest';
import { cellReserved } from '../../../src/core/cells';
import { variantFor } from '../../../src/core/fixedTerrain';
import { familyAt } from '../../../src/core/hazards/registry';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { loadBalance, loadGameBalance } from '../../support/balance';

const g = loadGameBalance();
const seedFor = (level: number, v: number): number => {
  for (let s = 1; s < 1000; s++) if (variantFor(g, level, s) === v) return s;
  throw new Error('no seed');
};
const quiet = (level: number, seed: number) => createSimInternal(g, seed, { startLevel: level }, { directorEnabled: false });

describe('MEC-019 fixedTerrain family', () => {
  it('MEC-019-R3 the start level terrain is solid before the first step', () => {
    const s = stateOf(quiet(1, seedFor(1, 0)));
    expect(s.families.fixedTerrain.templateId).toBe('b1s1');
    expect(s.families.fixedTerrain.cells.map(c => [c.x, c.y, c.state])).toEqual([6, 7, 8, 9, 10].map(x => [x, 4, 'solid']));
    expect(stateOf(quiet(13, seedFor(13, 0))).families.fixedTerrain.templateId).toBe('b3s2');
  });
  it('a balance without a terrain set has no terrain', () => {
    const s = stateOf(createSimInternal(loadBalance(), 1, {}, {}));
    expect(s.families.fixedTerrain).toEqual({ templateId: null, variant: 0, cells: [] });
  });
  it('MEC-019-R5 hitting terrain kills with cause terrain', () => {
    const sim = quiet(1, seedFor(1, 0)), s = stateOf(sim);
    s.snake = [{ x: 6, y: 6 }, { x: 6, y: 7 }, { x: 6, y: 8 }]; s.dir = { x: 0, y: -1 }; s.queue = []; s.mango = null;
    for (let i = 0; i < 5000 && s.status === 'playing'; i++) sim.advance(1);
    expect(s.outcome).toEqual({ won: false, cause: 'terrain' });
    expect(sim.drainEvents().at(-1)).toMatchObject({ type: 'died', cause: 'terrain' });
  });
  it('MEC-019-R8 terrain cells are solid, reserved and BFS walls; mangoes never spawn on them', () => {
    const s = stateOf(quiet(1, seedFor(1, 0)));
    expect(familyAt(s, 6, 4, 'solidAt')).toBe('fixedTerrain');
    expect(familyAt(s, 6, 4, 'bfsWallAt')).toBe('fixedTerrain');
    expect(cellReserved(s, 6, 4)).toBe(true);
    for (let seed = 1; seed <= 60; seed++) {
      const t = stateOf(quiet(3, seed)), m = t.mango!;
      expect(t.families.fixedTerrain.cells.some(c => c.x === m.x && c.y === m.y)).toBe(false);
    }
  });
  it('MEC-019-R9 the snapshot carries the cells and the template name', () => {
    const snap = quiet(1, seedFor(1, 0)).snapshot();
    expect(snap.fixedTerrain.name).toBe('Orchard Row');
    expect(snap.fixedTerrain.cells).toHaveLength(5);
  });
  it('MEC-019-R8 the director never places a hazard on terrain (60 s on L3)', () => {
    const sim = createSimInternal(g, 7, { startLevel: 3 }, { freezeSnake: true, ignoreOutcomes: true }), s = stateOf(sim);
    const tiles = s.families.fixedTerrain.cells.map(c => `${c.x},${c.y}`);
    for (let i = 0; i < 600; i++) {
      sim.advance(100);
      const snap = sim.snapshot();
      for (const h of snap.hazards) for (const c of h.cells) expect(tiles).not.toContain(`${c.x},${c.y}`);
      for (const p of snap.tiles) for (const c of p.cells) expect(tiles).not.toContain(`${c.x},${c.y}`);
    }
  });
});
