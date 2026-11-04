import { describe, it, expect } from 'vitest';
import { createSim, slotCount, unlockedSkills, unlockTable, type Loadout } from '../../src/core';
import { simFromAscii } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const snake: [number, number][] = [[2, 0], [1, 0], [0, 0], [0, 1]];
const clear = (startLevel: number, bestLevel: number, loadout: Loadout, progress: number, golden = false) => {
  const sim = simFromAscii(b, [golden ? '...G' : '...M'], { snake, quiet: true,
    options: { startLevel, bestLevel, loadout }, extraState: { progress } });
  sim.advance(140); return sim;
};

describe('MEC-007 loadout and unlocks', () => {
  it('MEC-007-R11 createSim throws on duplicate, unknown, locked or slot 2 with one slot', () => {
    for (const [bestLevel, loadout] of [
      [6, ['slowmo', 'slowmo']], [6, ['laser', null]], [6, ['shield', null]], [3, [null, 'slowmo']],
      [6, []], [6, ['slowmo']], [6, [null, null, null]], [6, [undefined, null]], [6, 'slowmo'], [6, null],
      [6, Array(2)], [6, [, null]], [6, [null, ,]],
    ] as const) {
      expect(() => createSim(b, 1, { bestLevel, loadout: loadout as unknown as Loadout })).toThrow(RangeError);
    }
    for (const bestLevel of [0, -1, 31, 1.5, NaN, Infinity]) {
      expect(() => createSim(b, 1, { bestLevel })).toThrow(RangeError);
    }
  });
  it('MEC-007-R11 options default to a fresh empty loadout and copy the caller loadout', () => {
    expect(createSim(b, 1).snapshot().skills.map(s => s.id)).toEqual([null, null]);
    const loadout: [null | 'slowmo', null] = ['slowmo', null];
    const sim = createSim(b, 1, { bestLevel: 3, loadout }); loadout[0] = null;
    expect(sim.snapshot().skills[0]?.id).toBe('slowmo');
    expect(createSim(b, 1, { bestLevel: 30, loadout: ['shield', 'mangoRain'] }).snapshot().skills.map(s => s.id)).toEqual(['shield', 'mangoRain']);
  });
  it('MEC-007-R12 reaching level 3 first time fills slot 0 with slowmo', () => {
    const sim = clear(2, 2, [null, null], 3);
    expect(sim.drainEvents().slice(-3)).toEqual([
      expect.objectContaining({ type: 'levelUp', level: 3 }), { type: 'rampEnded', level: 3 },
      { type: 'skillUnlocked', skill: 'slowmo', slot: 0 },
    ]);
    expect(sim.snapshot().skills[0]?.id).toBe('slowmo');
  });
  it('MEC-007-R12 reaching level 6 emits slotUnlocked then skillUnlocked tailSnip slot 1', () => {
    const sim = clear(5, 5, ['slowmo', null], 4);
    expect(sim.drainEvents().slice(-2)).toEqual([
      { type: 'slotUnlocked', slot: 1 }, { type: 'skillUnlocked', skill: 'tailSnip', slot: 1 },
    ]);
    expect(sim.snapshot().skills.map(s => s.id)).toEqual(['slowmo', 'tailSnip']);
  });
  it('MEC-007-R12 reaching level 11 with full slots emits skillUnlocked slot null', () => {
    const sim = clear(10, 10, ['slowmo', 'tailSnip'], 6);
    expect(sim.drainEvents().at(-1)).toEqual({ type: 'skillUnlocked', skill: 'shield', slot: null });
    expect(sim.snapshot().skills.map(s => s.id)).toEqual(['slowmo', 'tailSnip']);
  });
  it('MEC-007-R12 no unlock event below or at the saved best level', () => {
    for (const best of [11, 12]) {
      const sim = clear(10, best, ['slowmo', 'tailSnip'], 6);
      expect(sim.snapshot().level).toBe(11);
      expect(sim.drainEvents().filter(e => e.type === 'skillUnlocked' || e.type === 'slotUnlocked')).toEqual([]);
    }
  });
  it('MEC-007-R12 event order ate energyChanged shrunk levelUp rampEnded slotUnlocked skillUnlocked', () => {
    const sim = clear(5, 5, ['slowmo', null], 4, true);
    expect(sim.drainEvents().map(e => e.type)).toEqual([
      'ate', 'energyChanged', 'shrunk', 'levelUp', 'rampEnded', 'slotUnlocked', 'skillUnlocked',
    ]);
  });
  it('MEC-007 unlockedSkills and slotCount table for best levels 1 through 30', () => {
    for (let level = 1; level <= 30; level++) {
      const expected = level < 3 ? [] : level < 6 ? ['slowmo'] : level < 11 ? ['slowmo', 'tailSnip']
        : level < 16 ? ['slowmo', 'tailSnip', 'shield'] : ['slowmo', 'tailSnip', 'shield', 'mangoRain'];
      expect(unlockedSkills(b, level)).toEqual(expected); expect(slotCount(b, level)).toBe(level < 6 ? 1 : 2);
    }
    expect(unlockTable(b)).toEqual({ order: ['slowmo', 'tailSnip', 'shield', 'mangoRain'],
      unlockLevel: { slowmo: 3, tailSnip: 6, shield: 11, mangoRain: 16 }, secondSlotLevel: 6 });
  });
});
