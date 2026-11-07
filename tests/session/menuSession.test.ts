import { expect, it } from 'vitest';
import { loadBalance } from '../support/balance';
import { setup, WALL_DEATH_MS } from './support';
import { load, SAVE_KEY } from '../../src/meta';
import { defaultSettings } from '../../src/meta/settings';

it('P3b3-R4 updateSettings persists immediately and keeps other fields', () => {
  const { s, store } = setup();
  s.updateSettings({ dpad: true, boardTheme: 'dark' });
  expect(s.save().settings).toEqual({ ...defaultSettings(), dpad: true, boardTheme: 'dark' });
  const b = loadBalance();
  const again = load(store, { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax });
  expect(again.settings.boardTheme).toBe('dark');
  expect(JSON.parse(store.get(SAVE_KEY)!).data.settings.dpad).toBe(true);
});
it('P3b3-R4 updateSettings ignores invalid values field by field', () => {
  const { s } = setup();
  s.updateSettings({ boardTheme: 'neon' as never, haptics: false });
  expect(s.save().settings.boardTheme).toBeNull();
  expect(s.save().settings.haptics).toBe(false);
});
it('P3b3-R4 setSound still works and uses the same save', () => {
  const { s } = setup();
  s.setSound(false);
  expect(s.save().settings.sound).toBe(false);
});
it('P3b3-R5 summary reports eaten, biome, firstRun and no new checkpoints on a first wall death', () => {
  const { s } = setup();
  s.startRun(1);
  s.frame(WALL_DEATH_MS + 200);
  expect(s.summary()).toMatchObject({ eaten: 0, biome: 1, firstRun: true, newCheckpoints: [] });
});
it('P3b3-R5 firstRun is false once a best score is stored', () => {
  const { s } = setup({ bestScore: 12 });
  s.startRun(1);
  s.frame(WALL_DEATH_MS + 200);
  expect(s.summary()!.firstRun).toBe(false);
});
it('P3b3-R5 starting a run at an unlocked checkpoint reports no new checkpoints; quit keeps the fields', () => {
  const { s } = setup({ bestLevel: 20, unlockedCheckpoints: [4, 6, 8] });
  s.startRun(8);
  s.quit();
  expect(s.summary()).toMatchObject({ cause: 'quit', newCheckpoints: [], biome: 2 });
});
