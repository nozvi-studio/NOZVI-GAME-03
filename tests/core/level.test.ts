import { describe, expect, it } from 'vitest';
import { addProgress, needFor, tickMsFor, unlockedAt } from '../../src/core/level';
import { restoreSim, stateOf } from '../../src/core/sim';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();

describe('MEC-003 levels', () => {
  it('MEC-003 needFor is 4 + level', () => {
    expect(needFor(b, 0)).toBe(4);
    expect(needFor(b, 9)).toBe(13);
  });

  it('MEC-003 tickMs is max(95, 140 - 4 * level)', () => {
    expect([0, 5, 10, 12].map(level => tickMsFor(b, level))).toEqual([140, 120, 100, 95]);
  });

  it('MEC-003 progress overflow carries into the next levels', () => {
    const s = buildState(b);
    addProgress(s, b, 9);
    expect([s.level, s.progress]).toEqual([2, 0]);
    expect(s.events).toEqual([{ type: 'levelUp', level: 1 }, { type: 'levelUp', level: 2, unlocked: 'fence' }]);
  });

  it('MEC-003 unlock levels', () => {
    expect(unlockedAt(b, 2)).toBe('fence');
    expect(unlockedAt(b, 4)).toBe('terrain');
    expect(unlockedAt(b, 6)).toBe('maze');
    expect(unlockedAt(b, 3)).toBeUndefined();
  });

  it('MEC-003 max level pins progress to 0', () => {
    const s = buildState(b, { level: 9, progress: 12 });
    addProgress(s, b, 1);
    expect([s.level, s.progress]).toEqual([10, 0]);
    expect(s.events.splice(0)).toEqual([{ type: 'levelUp', level: 10 }]);
    addProgress(s, b, 2);
    expect([s.level, s.progress]).toEqual([10, 0]);
    expect(s.events).toEqual([]);
  });

  it('MEC-003 eating applies the new speed at once', () => {
    const sim = restoreSim(b, buildState(b, { progress: 3, mango: [9, 8], spawnInMs: QUIET }));
    sim.advance(140);
    expect(stateOf(sim).level).toBe(1);
    expect(stateOf(sim).tickMs).toBe(136);
    expect(sim.drainEvents()).toEqual([
      { type: 'ate', x: 9, y: 8, golden: false, points: 1 }, { type: 'levelUp', level: 1 },
    ]);
  });
});
