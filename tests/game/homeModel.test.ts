// tests/game/homeModel.test.ts — MEC-008-R4 D4-P3 simplified Home (owner ruling 2026-11-23)
import { describe, expect, it } from 'vitest';
import { canAffordUnowned, homeView } from '../../src/game/flow/homeModel';
import type { HomeModel, SkinsModel } from '../../src/session';

const base: HomeModel = {
  checkpoints: [],
  defaultStart: 1,
  carriedEnergy: 0,
  nextMilestone: { reach: 10, requiresClear: false },
  showLoadout: false,
};

describe('homeModel (D4-P3 simplified Home)', () => {
  it('MEC-008-R4 simplified Home plays L1 without checkpoints', () => {
    const v = homeView(base);
    expect(v.playLevel).toBe(1);
  });

  it('MEC-008-R4 simplified Home plays the highest unlocked checkpoint', () => {
    const v = homeView({ ...base, checkpoints: [5, 10], defaultStart: 10 });
    expect(v.playLevel).toBe(10);
  });

  it('MEC-008-R11 status pill shows next checkpoint L10, then L15, then clear L30, then Starts at', () => {
    expect(homeView({ ...base, nextMilestone: { reach: 10, requiresClear: false } }).status)
      .toEqual({ key: 'home.status.next', level: 10 });
    expect(homeView({ ...base, nextMilestone: { reach: 15, requiresClear: false } }).status)
      .toEqual({ key: 'home.status.next', level: 15 });
    expect(homeView({ ...base, nextMilestone: { reach: 30, requiresClear: true } }).status)
      .toEqual({ key: 'home.status.nextClear', level: 30 });
    expect(homeView({ ...base, checkpoints: [30], defaultStart: 30, nextMilestone: null }).status)
      .toEqual({ key: 'home.status.startsAt', level: 30 });
  });

  it('D4-P3-R2 bubble says Lets eat on first run and Ready for Ln otherwise', () => {
    expect(homeView(base).bubble).toEqual({ key: 'home.bubble.first', level: 1 });
    expect(homeView({ ...base, checkpoints: [10], defaultStart: 10 }).bubble)
      .toEqual({ key: 'home.bubble.ready', level: 10 });
  });

  it('D4-P3-R2 canAffordUnowned only when coins cover an unowned skin price', () => {
    const mk = (coins: number, ownedAll = false): SkinsModel => ({
      coins,
      equipped: 'snake',
      skins: [
        { id: 'snake', rarity: 'default', price: 0, owned: true },
        { id: 'ginger', rarity: 'common', price: 300, owned: ownedAll },
      ],
    });
    expect(canAffordUnowned(mk(299))).toBe(false);
    expect(canAffordUnowned(mk(300))).toBe(true);
    expect(canAffordUnowned(mk(999, true))).toBe(false);
  });
});
