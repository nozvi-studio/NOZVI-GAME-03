import { describe, it, expect } from 'vitest';
import { loadBalance } from '../support/balance';

const b = loadBalance();

describe('MEC-003-R22 level-up slowdown config', () => {
  it('MEC-003-R22 balance has tiers 6-15 x1.4 / 1000 ms and 16-30 x1.6 / 1500 ms', () => {
    expect(b.levelUpSlowdown.tiers).toEqual([
      { from: 6, to: 15, factor: 1.4, easeMs: 1000 },
      { from: 16, to: 30, factor: 1.6, easeMs: 1500 },
    ]);
  });
  it('MEC-003-R22 parseBalance rejects unsorted, overlapping, out-of-range or non-slowing tiers', () => {
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].from = 15; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].from = 1; })).toThrow(/levelUpSlowdown.tiers\[0\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[1].to = 31; })).toThrow(/levelUpSlowdown.tiers\[1\]/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].factor = 1; })).toThrow(/levelUpSlowdown.tiers\[0\].factor/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers[0].easeMs = 0; })).toThrow(/levelUpSlowdown.tiers\[0\].easeMs/);
    expect(() => loadBalance(j => { j.levelUpSlowdown.tiers = []; })).not.toThrow();
  });
});
