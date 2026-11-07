// tests/game/homeModel.test.ts
import { describe, it, expect } from 'vitest';
import { homeView, stepCheckpoint } from '../../src/game/flow/homeModel';
import type { HomeModel } from '../../src/session';
const base: HomeModel = { checkpoints: [], defaultStart: 1, carriedEnergy: 0,
  nextMilestone: { reach: 4, requiresClear: false }, showLoadout: false };
describe('homeModel', () => {
  it('MEC-008-R4 home shows only Play without checkpoints', () => {
    const v = homeView(base);
    expect(v.primary).toEqual({ key: 'home.play', level: 1 });
    expect(v.secondaryL1).toBe(false);
    expect(v.stepper).toEqual([]);
  });
  it('MEC-008-R4 home defaults to the highest unlocked checkpoint and offers L1', () => {
    const m = { ...base, checkpoints: [4, 8], defaultStart: 8 };
    const v = homeView(m);
    expect(v.primary).toEqual({ key: 'home.playCheckpoint', level: 8 });
    expect(v.secondaryL1).toBe(true);
    expect(v.stepper).toEqual([4, 8]);
    expect(homeView(m, 4).primary.level).toBe(4);
    expect(stepCheckpoint(m, 8, -1)).toBe(4);
    expect(stepCheckpoint(m, 4, -1)).toBe(4);
    expect(stepCheckpoint(m, 8, 1)).toBe(8);
  });
  it('MEC-008-R11 next milestone hint is L10, then L15, then clear L30, then hidden', () => {
    expect(homeView({ ...base, nextMilestone: { reach: 10, requiresClear: false } }).hint)
      .toEqual({ key: 'hud.nextCheckpoint', level: 10 });
    expect(homeView({ ...base, nextMilestone: { reach: 15, requiresClear: false } }).hint)
      .toEqual({ key: 'hud.nextCheckpoint', level: 15 });
    expect(homeView({ ...base, nextMilestone: { reach: 30, requiresClear: true } }).hint)
      .toEqual({ key: 'hud.nextCheckpointClear', level: 30 });
    expect(homeView({ ...base, nextMilestone: null }).hint).toBeNull();
  });
  it('MEC-008 §8 home carry line only when carriedEnergy > 0', () => {
    expect(homeView(base).carry).toBeNull();
    expect(homeView({ ...base, carriedEnergy: 18 }).carry).toBe(18);
  });
});

describe('homeModel P3b3 menu flags', () => {
  it('P3b3-R10 first-run Home is compact: big Play, no chips, no stepper', () => {
    const v = homeView(base);
    expect(v).toMatchObject({ compact: true, startAt: null, extras: false, showStepper: false });
  });
  it('P3b3-R10 carried energy alone keeps Play normal size and shows only the energy chip row', () => {
    const v = homeView({ ...base, carriedEnergy: 25 });
    expect(v).toMatchObject({ compact: false, startAt: null, extras: true, carry: 25, secondaryL1: false });
  });
  it('P3b3-R10 with checkpoints Home shows Start at Lx, Start from L1 and a stepper only for 2+ checkpoints (C1, C2)', () => {
    const one = homeView({ ...base, checkpoints: [4], defaultStart: 4 });
    expect(one).toMatchObject({ compact: false, startAt: 4, extras: true, showStepper: false, secondaryL1: true });
    const two = homeView({ ...base, checkpoints: [4, 6], defaultStart: 6 }, 4);
    expect(two).toMatchObject({ startAt: 4, showStepper: true });
  });
});
