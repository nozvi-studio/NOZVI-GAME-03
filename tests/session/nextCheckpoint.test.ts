import { describe, expect, it } from 'vitest';
import { applyLevelReached, defaultSave, nextMilestone } from '../../src/meta';
import { processEvents } from '../../src/session/session';
import { homeView } from '../../src/game/flow/homeModel';
import type { SimEvent } from '../../src/core';
import { b, setup } from './support';

const levelUp = (level: number): SimEvent =>
  ({ type: 'levelUp', level, biome: 0, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1000 });
const hintLevel = (s: ReturnType<typeof setup>['s']): number | undefined => homeView(s.homeModel()).hint?.level;

describe('UIFIX-R15 LAY-03 next checkpoint hint after a normal run', () => {
  it('UIFIX-R15 pure meta: reaching L10 step by step moves the hint from L10 to L15', () => {
    let d = defaultSave();
    expect(nextMilestone(d, b)).toEqual({ reach: 10, requiresClear: false });
    for (let lv = 2; lv <= 10; lv++) d = applyLevelReached(d, lv, b).data;
    expect(d.unlockedCheckpoints).toContain(4);
    expect(nextMilestone(d, b)).toEqual({ reach: 15, requiresClear: false });
  });
  it('UIFIX-R15 session: a normal run that reaches L10 shows "Next checkpoint at L15" on the home model', () => {
    const { s } = setup();
    s.startRun(1);
    expect(hintLevel(s)).toBe(10);
    for (let lv = 2; lv <= 10; lv++) processEvents(s, [levelUp(lv)]);
    expect(hintLevel(s)).toBe(15);
    s.quit();
    expect(hintLevel(s)).toBe(15);
  });
  it('UIFIX-R15 session: a level jump straight to L10 (not +1 steps) also unlocks the checkpoint', () => {
    const { s } = setup();
    s.startRun(1); processEvents(s, [levelUp(10)]);
    expect(hintLevel(s)).toBe(15);
  });
  it('UIFIX-R15 a legacy save with bestLevel >= 10 but no unlocked checkpoint still points at the next locked one', () => {
    const { s } = setup({ bestLevel: 12, unlockedCheckpoints: [] });
    s.startRun(1); processEvents(s, [levelUp(13)]);
    expect(hintLevel(s)).toBe(15);
  });
});
