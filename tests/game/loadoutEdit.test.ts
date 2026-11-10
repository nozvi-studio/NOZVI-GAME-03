// tests/game/loadoutEdit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { initEdit, tapCard, tapSlot } from '../../src/game/flow/loadoutEdit';
import type { LoadoutModel } from '../../src/session';
import { badgeIsNew } from '../../src/game/scenes/LoadoutScene';
import { isRejected } from '../../src/game/ui/feedbackModel';
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Scale: { Events: { RESIZE: 'resize' } } } }));
const m: LoadoutModel = { unlocked: ['slowmo', 'tailSnip', 'shield'], slotCount: 2, selection: ['slowmo', 'tailSnip'] };
describe('loadoutEdit', () => {
  it('MEC-007-R7 tapping a card in the other slot swaps the slots', () => {
    const s = tapCard(initEdit(m), 'tailSnip');
    expect(s.selection).toEqual(['tailSnip', 'slowmo']);
    expect(s.activeSlot).toBe(1);
  });
  it('MEC-007-R7 tapping an unchosen card replaces the active slot, then the active slot moves', () => {
    const s = tapCard(tapSlot(initEdit(m), 1), 'shield');
    expect(s.selection).toEqual(['slowmo', 'shield']);
    expect(s.activeSlot).toBe(0);
  });
  it('MEC-007-R6 locked cards cannot be picked and slot 2 is ignored with one slot', () => {
    const one = initEdit({ unlocked: ['slowmo'], slotCount: 1, selection: ['slowmo', null] });
    expect(tapCard(one, 'mangoRain')).toEqual(one);
    expect(tapSlot(one, 1).activeSlot).toBe(0);
  });
  it('MEC-007-R8 no sequence of taps leaves an empty slot or a duplicate', () => {
    let s = initEdit(m);
    for (const id of ['shield', 'slowmo', 'slowmo', 'tailSnip', 'shield', 'shield'] as const) {
      s = tapCard(s, id);
      expect(s.selection.every(x => x !== null)).toBe(true);
      expect(new Set(s.selection).size).toBe(2);
    }
  });
  it('MOT-1-R11 a locked card or a slot beyond slotCount returns the same state object (rejected)', () => {
    const one = initEdit({ unlocked: ['slowmo'], slotCount: 1, selection: ['slowmo', null] });
    expect(isRejected(one, tapCard(one, 'mangoRain'))).toBe(true);
    expect(isRejected(one, tapSlot(one, 1))).toBe(true);
    expect(isRejected(one, tapSlot(one, 0))).toBe(false);
  });
  it('MOT-1-R10 badgeIsNew is true when a card gains or changes its picked slot after the first render', () => {
    expect(badgeIsNew(null, 'slowmo', 0)).toBe(false);                      // first render: no pop
    const prev = new Map<string, number | null>([['slowmo', null], ['shield', 0]]);
    expect(badgeIsNew(prev, 'slowmo', 1)).toBe(true);
    expect(badgeIsNew(prev, 'shield', 0)).toBe(false);
    expect(badgeIsNew(prev, 'shield', null)).toBe(false);
  });
});
