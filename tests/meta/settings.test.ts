import { expect, it } from 'vitest';
import { defaultSettings, validSettings, resolveDisplay } from '../../src/meta/settings';
import { load, memoryStore, SAVE_KEY, SAVE_VERSION } from '../../src/meta';
it('P3-0-R4 defaults follow the OS for theme and motion', () => {
  expect(defaultSettings()).toEqual({ sound: true, haptics: true, dpad: false, reducedMotion: null, boardTheme: null });
});
it('P3-0-R4 invalid fields fall back one by one', () => {
  expect(validSettings({ sound: false, haptics: 'x', dpad: true, reducedMotion: true, boardTheme: 'neon' }))
    .toEqual({ sound: false, haptics: true, dpad: true, reducedMotion: true, boardTheme: null });
  expect(validSettings(null)).toEqual(defaultSettings());
});
it('P3-0-R4 resolveDisplay: explicit choice wins, null follows the OS', () => {
  expect(resolveDisplay(defaultSettings(), { dark: true, reducedMotion: true })).toEqual({ theme: 'dark', reducedMotion: true });
  expect(resolveDisplay({ ...defaultSettings(), boardTheme: 'light', reducedMotion: false }, { dark: true, reducedMotion: true }))
    .toEqual({ theme: 'light', reducedMotion: false });
});
it('P3-0-R4 v2 saves migrate to v3 keeping sound and progress', () => {
  expect(SAVE_VERSION).toBe(3);
  const kv = memoryStore({ [SAVE_KEY]: JSON.stringify({ version: 2, data: { bestScore: 5, settings: { sound: false },
    bestLevel: 7, fullClear: false, unlockedCheckpoints: [6], carriedEnergy: 10, lastLoadout: [null, null] } }) });
  const s = load(kv, { skillIds: ['slowmo'], maxLevel: 30, carryMax: 50 });
  expect(s.settings).toEqual({ ...defaultSettings(), sound: false });
  expect(s.bestLevel).toBe(7);
});
