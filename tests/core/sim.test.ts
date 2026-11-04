import { describe, expect, it } from 'vitest';
import { createSim, restoreSim, stateOf } from '../../src/core/sim';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();

describe('MEC-001 Sim', () => {
  it('MEC-001 snapshot is a copy', () => {
    const sim = createSim(b, 1);
    sim.snapshot().snake[0]!.x = 0;
    expect(stateOf(sim).snake[0]!.x).toBe(8);
  });

  it('MEC-001 drainEvents empties the queue', () => {
    const sim = restoreSim(b, buildState(b, { mango: [9, 8], spawnInMs: QUIET }));
    sim.advance(140);
    expect(sim.drainEvents()).toEqual([{ type: 'ate', x: 9, y: 8, golden: false, points: 1, progressGain: 1, source: 'mango' }]);
    expect(sim.drainEvents()).toEqual([]);
  });
});
