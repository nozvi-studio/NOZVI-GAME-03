import { expect, it } from 'vitest';
import { defaultSave, applyLevelReached, applyRunWon, carryEnergy, nextMilestone } from '../../src/meta';
import raw from '../../config/balance.json';
const cfg = { checkpoints: raw.checkpoints };
it('MEC-008-R2 reaching L10 unlocks start L4; reaching L30 without clearing does not unlock L12', () => {
  const a = applyLevelReached(defaultSave(), 10, cfg);
  expect(a.newCheckpoints).toEqual([4]); expect(a.data.unlockedCheckpoints).toEqual([4]);
  const z = applyLevelReached(a.data, 30, cfg);
  expect(z.data.unlockedCheckpoints).toEqual([4, 6, 8, 10]); expect(z.data.bestLevel).toBe(30);
});
it('MEC-008-R6 carry of 37 energy is 18, of 100 is 50, of 0 is 0', () => {
  expect([37, 100, 0, 200].map(e => carryEnergy(e, cfg))).toEqual([18, 50, 0, 50]);
});
it('MEC-008-R2 runWon unlocks L12 and sets fullClear', () => {
  const out = applyRunWon(applyLevelReached(defaultSave(), 30, cfg).data, cfg);
  expect(out.newCheckpoints).toEqual([12]); expect(out.data.fullClear).toBe(true);
  expect(out.data.unlockedCheckpoints).toEqual([4, 6, 8, 10, 12]);
});
it('MEC-008-R1 applyLevelReached raises bestLevel and never lowers it', () => {
  expect(applyLevelReached({ ...defaultSave(), bestLevel: 12 }, 4, cfg).data.bestLevel).toBe(12);
});
it('MEC-008-R3 unlocked checkpoints are never removed', () => {
  const before = { ...defaultSave(), unlockedCheckpoints: [5] };
  const out = applyLevelReached(before, 10, cfg);
  expect(out.data.unlockedCheckpoints).toEqual([4, 5]); expect(out.newCheckpoints).toEqual([4]);
  expect(applyLevelReached(out.data, 10, cfg).newCheckpoints).toEqual([]);
  expect(before.unlockedCheckpoints).toEqual([5]); expect(before.bestLevel).toBe(0);
});
it('MEC-008-R11 next milestone hint is L10, then L15, then clear L30, then hidden', () => {
  expect(nextMilestone(defaultSave(), cfg)).toEqual({ reach: 10, requiresClear: false });
  expect(nextMilestone(applyLevelReached(defaultSave(), 10, cfg).data, cfg)).toEqual({ reach: 15, requiresClear: false });
  const at30 = applyLevelReached(defaultSave(), 30, cfg).data;
  expect(nextMilestone(at30, cfg)).toEqual({ reach: 30, requiresClear: true });
  expect(nextMilestone(applyRunWon(at30, cfg).data, cfg)).toBeNull();
});
