import { describe, it, expect } from 'vitest';
import { processEvents } from '../../src/session/session';
import { load, loadLog, LOG_KEY, SAVE_KEY } from '../../src/meta';
import type { SimEvent } from '../../src/core';
import { rules, setup, WALL_DEATH_MS } from './support';

const levelUp = (level: number, clearedLevelTimeMs = 1000): SimEvent =>
  ({ type: 'levelUp', level, biome: 0, challenge: false, biomeChanged: false, clearedLevelTimeMs });
const died: SimEvent = { type: 'died', cause: 'wall', x: 0, y: 0 };

describe('session', () => {
  it('MEC-008-R5 run start consumes carriedEnergy and passes it as startEnergy', () => {
    const { s, store } = setup({ bestLevel: 12, unlockedCheckpoints: [4], carriedEnergy: 30, lastLoadout: ['slowmo', 'tailSnip'] });
    s.startRun(4);
    expect(s.snapshot()).toMatchObject({ energy: 30, level: 4 });
    expect(load(store, rules).carriedEnergy).toBe(0);
    expect(s.snapshot().skills.map(k => k.id)).toEqual(['slowmo', 'tailSnip']);
  });
  it('MEC-008-R7 pausing saves the provisional carry', () => {
    const { s, store } = setup({ bestLevel: 3, carriedEnergy: 37 });
    s.startRun(1); s.frame(100); s.pause();
    expect(load(store, rules).carriedEnergy).toBe(18);
    expect(loadLog(store).entries.map(e => e.type)).toEqual(['run_start']);
  });
  it('MEC-003-R20 quit ends the run with cause quit and does not count as a death', () => {
    const { s, store } = setup();
    s.startRun(1); s.frame(500); s.quit();
    expect(s.summary()).toMatchObject({ won: false, cause: 'quit', level: 1, startLevel: 1, levelsCleared: 0 });
    const log = loadLog(store);
    expect(log.entries.at(-1)).toMatchObject({ type: 'run_end', cause: 'quit', durationMs: 500, won: false });
    expect(log.deathCounts).toEqual({});
    expect(store.get(LOG_KEY)).not.toBeNull();
  });
  it('MEC-008-R4 home defaults to the highest unlocked checkpoint and offers L1', () => {
    expect(setup({ bestLevel: 20, unlockedCheckpoints: [4, 8] }).s.homeModel()).toMatchObject({ checkpoints: [4, 8], defaultStart: 8 });
    expect(setup().s.homeModel()).toMatchObject({ checkpoints: [], defaultStart: 1, carriedEnergy: 0 });
  });
  it('MEC-007-R1 loadout screen skipped when no skill is unlocked (best level 1-2)', () => {
    expect(setup({ bestLevel: 0 }).s.homeModel().showLoadout).toBe(false);
    expect(setup({ bestLevel: 2 }).s.homeModel().showLoadout).toBe(false);
    expect(setup({ bestLevel: 3 }).s.homeModel().showLoadout).toBe(true);
  });
  it('MEC-007-R3 loadout model opens with the sanitized last loadout', () => {
    expect(setup({ bestLevel: 12, lastLoadout: ['shield', 'shield'] }).s.loadoutModel())
      .toEqual({ selection: ['shield', 'slowmo'], slotCount: 2, unlocked: ['slowmo', 'tailSnip', 'shield'] });
  });
  it('MEC-007-R9 confirm saves lastLoadout; back does not', () => {
    const a = setup({ bestLevel: 12 });
    a.s.confirmLoadout(['tailSnip', 'slowmo']);
    expect(load(a.store, rules).lastLoadout).toEqual(['tailSnip', 'slowmo']);
    const c = setup({ bestLevel: 12, lastLoadout: ['shield', null] });
    const before = c.store.get(SAVE_KEY);
    c.s.loadoutModel();
    expect(c.store.get(SAVE_KEY)).toBe(before);
  });
  it('MEC-007-R2 play again starts with sanitized lastLoadout without the screen', () => {
    const { s, store } = setup({ bestLevel: 12, lastLoadout: ['shield', 'shield'] });
    s.startRun(1); s.frame(WALL_DEATH_MS);
    expect(s.summary()).not.toBeNull();
    s.startRun(s.lastStartLevel()!, 'results');
    expect(s.snapshot().skills.map(k => k.id)).toEqual(['shield', 'slowmo']);
    s.hidden();
    expect(loadLog(store).entries.at(-1)).toMatchObject({ type: 'run_start', entry: 'results', runId: 2 });
  });
  it('MEC-007-R10 createSim receives startLevel, startEnergy, loadout and bestLevel', () => {
    const { s } = setup({ bestLevel: 12, unlockedCheckpoints: [4], carriedEnergy: 20, lastLoadout: ['tailSnip', 'shield'] });
    s.startRun(4);
    expect(s.snapshot()).toMatchObject({ level: 4, energy: 20 });
    expect(s.snapshot().skills.map(k => k.id)).toEqual(['tailSnip', 'shield']);
    const z = setup({ bestLevel: 0 });
    expect(() => z.s.startRun(1)).not.toThrow();
    expect(z.s.snapshot().skills.map(k => k.id)).toEqual([null, null]);
  });
  it('MEC-007-R13 mid-run unlock does not change lastLoadout', () => {
    const { s, store } = setup({ bestLevel: 2 });
    s.startRun(1);
    processEvents(s, [levelUp(3), { type: 'skillUnlocked', skill: 'slowmo', slot: 0 }]);
    expect(load(store, rules).lastLoadout).toEqual([null, null]);
  });
  it('MEC-008-R1 bestLevel updates on run start and on every levelUp', () => {
    const { s, store } = setup({ bestLevel: 0 });
    s.startRun(1);
    expect(load(store, rules).bestLevel).toBe(1);
    processEvents(s, [levelUp(3)]);
    expect(load(store, rules).bestLevel).toBe(3);
    expect(s.summary()).toBeNull();
  });
  it('MEC-008-R3 unlocked checkpoints are saved mid-run and never removed', () => {
    const { s, store } = setup({ bestLevel: 9, unlockedCheckpoints: [5] });
    s.startRun(1);
    processEvents(s, [levelUp(10)]);
    expect(load(store, rules).unlockedCheckpoints).toEqual([4, 5]);
    s.pause();
    const recs = () => loadLog(store).entries.filter(e => e.type === 'checkpoint_unlocked');
    expect(recs()).toEqual([expect.objectContaining({ level: 4, reachedLevel: 10, runId: 1 })]);
    processEvents(s, [levelUp(10)]); s.pause();
    expect(recs()).toHaveLength(1);
  });
  it('MEC-008-R10 bestLevel saved at L11 mid-run gives slowmo tailSnip shield on the next loadout even after an immediate death', () => {
    const { s } = setup({ bestLevel: 1 });
    s.startRun(1);
    processEvents(s, [levelUp(11), died]);
    expect(s.loadoutModel().unlocked).toEqual(['slowmo', 'tailSnip', 'shield']);
  });
  it('MEC-008-R6 carry at run end is written on death', () => {
    const { s, store } = setup({ bestLevel: 3, carriedEnergy: 37 });
    s.startRun(1); s.frame(WALL_DEATH_MS);
    expect(load(store, rules).carriedEnergy).toBe(18);
    expect(s.summary()!.carriedEnergy).toBe(18);
  });
  it('MEC-008-R2 runWon via session sets fullClear and unlocks 12', () => {
    const { s, store } = setup({ bestLevel: 29 });
    s.startRun(1);
    processEvents(s, [{ type: 'runWon', score: 0, timeMs: 0 }]);
    const saved = load(store, rules);
    expect(saved.fullClear).toBe(true);
    expect(saved.unlockedCheckpoints).toContain(12);
    expect(s.summary()).toMatchObject({ won: true, cause: 'clear' });
  });
  it('MEC-003-R19 run_end record has level score cause durationMs startLevel levelsCleared won', () => {
    const { s, store } = setup();
    s.startRun(1); s.frame(WALL_DEATH_MS);
    expect(loadLog(store).entries.at(-1)).toEqual({ type: 'run_end', t: expect.any(Number), runId: 1, level: 1,
      score: s.snapshot().score, cause: 'wall', durationMs: WALL_DEATH_MS, startLevel: 1, levelsCleared: 0, won: false, turns: 0 });
    expect(s.summary()).toMatchObject({ won: false, cause: 'wall', score: s.snapshot().score });
  });
  it('MEC-003-R19 run_end turns counts only turns accepted by the MEC-001 queue', () => {
    const { s, store } = setup();
    s.startRun(1);
    s.turn(1, 0);  // same as start direction: dropped
    s.turn(-1, 0); // reverse: dropped
    s.turn(0, 1);  // perpendicular: accepted
    s.turn(0, 1);  // repeat of the queued turn: dropped
    s.quit();
    expect(loadLog(store).entries.at(-1)).toMatchObject({ type: 'run_end', turns: 1 });
  });
  it('MEC-003-R19 skill_used and level_up records carry the MEC fields', () => {
    const { s, store } = setup({ bestLevel: 12 });
    s.startRun(1);
    processEvents(s, [{ type: 'skillUsed', slot: 0, skill: 'slowmo', level: 6, energyBefore: 60, energyAfter: 30 }, levelUp(7, 9000)]);
    s.hidden();
    const e = loadLog(store).entries;
    expect(e).toContainEqual(expect.objectContaining({ type: 'skill_used', skill: 'slowmo', level: 6, energyBefore: 60, runId: 1 }));
    expect(e).toContainEqual(expect.objectContaining({ type: 'level_up', level: 7, levelTimeMs: 9000, runId: 1 }));
  });
  it('P1-D5 log is written only at run end, pause and hidden', () => {
    const { s, store } = setup();
    s.startRun(1); s.frame(100);
    expect(store.get(LOG_KEY)).toBeNull();
    s.hidden();
    expect(store.get(LOG_KEY)).not.toBeNull();
  });
  it('P1 session startRun throws RangeError for a locked checkpoint', () => {
    const { s } = setup({ bestLevel: 12, unlockedCheckpoints: [4] });
    expect(() => s.startRun(6)).toThrow(RangeError);
    expect(() => s.startRun(1)).not.toThrow();
  });
  it('P1 session frame after the run is over returns no events and summary is stable', () => {
    const { s } = setup();
    expect(s.frame(100)).toEqual([]);
    expect(s.summary()).toBeNull();
    s.startRun(1);
    expect(s.frame(WALL_DEATH_MS).some(e => e.type === 'died')).toBe(true);
    const sum = s.summary();
    expect(s.frame(1000)).toEqual([]);
    expect(s.summary()).toEqual(sum);
    s.quit(); s.pause();
    expect(s.summary()).toEqual(sum);
  });
  it('P1 session setSound, save and exportLog', () => {
    const { s, store } = setup();
    s.setSound(false);
    expect(load(store, rules).settings.sound).toBe(false);
    expect(s.save().settings.sound).toBe(false);
    expect(JSON.parse(s.exportLog())).toMatchObject({ version: 1 });
  });
  it('MEC-007-R14 session.useSkill forwards to the sim; no-op without a run', () => {
    const { s } = setup({ bestLevel: 3, carriedEnergy: 50 });
    s.startRun(1); s.useSkill(0);
    expect(s.frame(1)).toContainEqual(expect.objectContaining({ type: 'skillUsed', skill: 'slowmo' }));
    const fresh = setup().s;
    expect(() => fresh.useSkill(0)).not.toThrow();
    expect(fresh.frame(1)).toEqual([]);
  });
  it('P1 session.turn after over is ignored', () => {
    const { s } = setup();
    s.startRun(1); s.frame(WALL_DEATH_MS);
    expect(s.summary()).not.toBeNull();
    expect(() => s.turn(0, 1)).not.toThrow();
    expect(s.frame(100)).toEqual([]);
  });
});

describe('session debug start', () => {
  it('MEC-003-R21 debug start allows a locked level and writes no progress, replay stays debug', () => {
    const { s } = setup();
    s.startRun(25, 'home', true);
    expect(s.snapshot().level).toBe(25);
    processEvents(s, [levelUp(26)]);
    expect(s.save().bestLevel).toBe(0);
    expect(s.save().unlockedCheckpoints).toEqual([]);
    processEvents(s, [{ type: 'runWon' } as SimEvent]);
    expect(s.save().fullClear).toBe(false);
    s.startRun(25, 'results');
    processEvents(s, [levelUp(27)]);
    expect(s.save().bestLevel).toBe(0);
  });
  it('MEC-003-R21 non-debug start of a locked level still throws; debug rejects out-of-range', () => {
    const { s } = setup();
    expect(() => s.startRun(25)).toThrow(RangeError);
    expect(() => s.startRun(31, 'home', true)).toThrow(RangeError);
  });
});
