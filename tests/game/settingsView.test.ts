import { afterEach, expect, it, vi } from 'vitest';
import { applySettings, settingsExit, settingsView, SETTINGS_CLOSED, themePatch, togglePatch } from '../../src/game/flow/settingsView';
import { defaultSettings } from '../../src/meta/settings';
import { currentPalette, DARK, LIGHT, setDisplaySettings } from '../../src/game/render/palette';
const os = { dark: false, reducedMotion: false };
const disp = { theme: 'light' as const, reducedMotion: false };
afterEach(() => setDisplaySettings(null));

it('P3b3-R6 rows list sound, haptics, dpad and reduced motion with mockup keys', () => {
  const v = settingsView(defaultSettings(), disp);
  expect(v.rows.map(r => [r.id, r.titleKey, r.subKey, r.on, r.valueKey])).toEqual([
    ['sound', 'settings.sound', 'settings.sound.sub', true, 'settings.on'],
    ['haptics', 'settings.haptics', 'settings.haptics.sub', true, 'settings.on'],
    ['dpad', 'settings.dpad', 'settings.dpad.sub', false, 'settings.off'],
    ['reducedMotion', 'settings.motion', 'settings.motion.sub', false, 'settings.off'],
  ]);
  expect(v.theme).toBe('light');
});
it('P3b3-R6 reduced motion and theme show the resolved (OS-following) value', () => {
  const v = settingsView(defaultSettings(), { theme: 'dark', reducedMotion: true });
  expect(v.rows[3]).toMatchObject({ on: true, valueKey: 'settings.on' });
  expect(v.theme).toBe('dark');
});
it('P3b3-R6 toggling writes an explicit value (never null)', () => {
  expect(togglePatch(defaultSettings(), disp, 'sound')).toEqual({ sound: false });
  expect(togglePatch(defaultSettings(), disp, 'dpad')).toEqual({ dpad: true });
  expect(togglePatch(defaultSettings(), { theme: 'light', reducedMotion: true }, 'reducedMotion')).toEqual({ reducedMotion: false });
  expect(themePatch('dark')).toEqual({ boardTheme: 'dark' });
});
it('P3b3-R7 exit: Home start by default, overlay closes and keeps the caller scene', () => {
  expect(settingsExit({})).toEqual({ action: 'start', scene: 'Home' });
  expect(settingsExit({ returnTo: 'Results' })).toEqual({ action: 'start', scene: 'Results' });
  expect(settingsExit({ overlay: true })).toEqual({ action: 'close' });
  expect(SETTINGS_CLOSED).toBe('settings-closed');
});
it('P3b3-R7 applySettings saves immediately and updates the palette', () => {
  const saved = { current: defaultSettings() };
  const session = { updateSettings: vi.fn((p: object) => { saved.current = { ...saved.current, ...p }; }), save: () => ({ settings: saved.current }) } as never;
  const d = applySettings(session, themePatch('dark'), os);
  expect(d).toEqual({ theme: 'dark', reducedMotion: false });
  expect(currentPalette()).toBe(DARK);
  applySettings(session, themePatch('light'), os);
  expect(currentPalette()).toBe(LIGHT);
});
