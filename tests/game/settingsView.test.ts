import { afterEach, expect, it, vi } from 'vitest';
import { applySettings, settingsCardEdge, settingsExit, settingsView, SETTINGS_CLOSED, toggleTrackStyle, togglePatch } from '../../src/game/flow/settingsView';
import { defaultSettings } from '../../src/meta/settings';
import { currentPalette, LIGHT, setDisplaySettings } from '../../src/game/render/palette';
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
});
it('P3b3-R6 reduced motion shows the resolved (OS-following) value', () => {
  const v = settingsView(defaultSettings(), { theme: 'dark', reducedMotion: true });
  expect(v.rows[3]).toMatchObject({ on: true, valueKey: 'settings.on' });
});
it('D3-R3 the settings view has no board theme', () => {
  const v = settingsView(defaultSettings(), disp);
  expect('theme' in v).toBe(false);
  expect(v.rows.map((r) => r.id)).not.toContain('boardTheme');
});
it('P3b3-R6 toggling writes an explicit value (never null)', () => {
  expect(togglePatch(defaultSettings(), disp, 'sound')).toEqual({ sound: false });
  expect(togglePatch(defaultSettings(), disp, 'dpad')).toEqual({ dpad: true });
  expect(togglePatch(defaultSettings(), { theme: 'light', reducedMotion: true }, 'reducedMotion')).toEqual({ reducedMotion: false });
});
it('P3b3-R7 exit: Home start by default, overlay closes and keeps the caller scene', () => {
  expect(settingsExit({})).toEqual({ action: 'start', scene: 'Home' });
  expect(settingsExit({ returnTo: 'Results' })).toEqual({ action: 'start', scene: 'Results' });
  expect(settingsExit({ overlay: true })).toEqual({ action: 'close' });
  expect(SETTINGS_CLOSED).toBe('settings-closed');
});
it('P3b3-R7 applySettings saves immediately; D3-R3 the palette stays light', () => {
  const saved = { current: defaultSettings() };
  const updateSettings = vi.fn((p: object) => { saved.current = { ...saved.current, ...p }; });
  const session = { updateSettings, save: () => ({ settings: saved.current }) } as never;
  const d = applySettings(session, { dpad: true }, os);
  expect(d.reducedMotion).toBe(false);
  expect(updateSettings).toHaveBeenCalledWith({ dpad: true });
  expect(currentPalette()).toBe(LIGHT);
});
it('UIFIX-R14 toggle track border equals the card edge in both themes and both states', () => {
  for (const theme of ['light', 'dark'] as const)
    for (const on of [true, false]) expect(toggleTrackStyle(on, theme).border).toBe(settingsCardEdge(theme));
});
it('UIFIX-R14 on and off tracks differ by fill so state never relies on the border', () => {
  expect(toggleTrackStyle(true, 'light').fill).not.toBe(toggleTrackStyle(false, 'light').fill);
  expect(toggleTrackStyle(true, 'dark').fill).not.toBe(toggleTrackStyle(false, 'dark').fill);
});
