import { describe, expect, it } from 'vitest';
import { FAMILIES, FAMILY, familyAt, instancesOf, stepHazards } from '../../src/core/hazards/registry';
import { makeTimed } from '../../src/core/hazards/timed';
import type { SimEvent } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { buildState } from '../support/state';

const b = loadBalance();
describe('MEC-004 registry', () => {
  it('MEC-006-R35 registry order is rock fence maze terrain rottenRock snipWall rubble', () => {
    expect(FAMILIES.map(f => f.key)).toEqual(['rock', 'fence', 'maze', 'terrain', 'rottenRock', 'snipWall', 'rubble']);
    expect(FAMILIES.map(f => FAMILY[f.key])).toEqual(FAMILIES);
  });
  it('MEC-004 capClass small: rock and fence only', () => {
    expect(FAMILIES.map(f => f.capClass)).toEqual(['small', 'small', 'big', 'big', 'none', 'none', 'none']);
    expect(FAMILIES.map(f => f.maxActiveKey).slice(4)).toEqual([null, null, null]);
  });
  it('MEC-006-R23 causes: rock, fence, maze, ground, rotten, snipWall, rubble', () => {
    expect(FAMILIES.map(f => f.cause)).toEqual(['rock', 'fence', 'maze', 'ground', 'rotten', 'snipWall', 'rubble']);
  });
  it('MEC-006-R24 breakable false only for rubble; every breakable family has onBreak', () => {
    expect(FAMILIES.map(f => f.breakable)).toEqual([true, true, true, true, true, true, false]);
    expect(FAMILIES.filter(f => f.breakable).every(f => typeof f.onBreak === 'function')).toBe(true);
  });
  it('MEC-004 bfsWallAt: timed cells in any state true, terrain false', () => {
    const s = buildState(b);
    for (const family of ['rock', 'fence', 'maze'] as const) {
      const h = makeTimed(family, [{ x: 2, y: 2 }], 1500, 6000); s.hazards.push(h);
      for (const phase of ['warn', 'solid', 'crumble'] as const) {
        h.state = phase;
        expect(FAMILY[family].bfsWallAt(h, 2, 2)).toBe(true);
        expect(FAMILY[family].bfsWallAt(h, 3, 2)).toBe(false);
      }
      expect(instancesOf(s, family)).toEqual([h]);
    }
    s.terrains.push({ family: 'terrain', t: 0, lifeMs: 18000, cells: [{ x: 3, y: 2, delay: 0, up: true, vis: 'up' }] });
    expect(instancesOf(s, 'terrain')).toEqual(s.terrains);
    expect(familyAt(s, 2, 2, 'reservedAt')).toBe('rock');
    expect(familyAt(s, 3, 2, 'bfsWallAt')).toBeNull();
    expect(familyAt(s, 3, 2, 'solidAt')).toBe('terrain');
  });
  it('MEC-004 updates in spawn order and removes expired instances after each pass', () => {
    const s = buildState(b), events: SimEvent[] = [];
    s.hazards.push(makeTimed('fence', [{ x: 1, y: 1 }], 1, 1000), makeTimed('rock', [{ x: 2, y: 2 }], 1, 1000));
    const expired = makeTimed('maze', [{ x: 3, y: 3 }], 1, 1000);
    expired.state = 'crumble'; expired.t = 449; s.hazards.push(expired);
    s.terrains.push({ family: 'terrain', t: 3499, lifeMs: 3000, cells: [] });
    stepHazards(s, { balance: b, snakeOn: () => false, emit: e => events.push(e) });
    expect(events).toEqual([
      { type: 'dust', x: 1, y: 1 }, { type: 'landed', hazardType: 'fence' },
      { type: 'dust', x: 2, y: 2 }, { type: 'landed', hazardType: 'rock' },
    ]);
    expect(s.hazards.map(h => h.family)).toEqual(['fence', 'rock']); expect(s.terrains).toEqual([]);
  });
});
