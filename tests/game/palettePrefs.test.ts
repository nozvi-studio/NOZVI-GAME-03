import { afterEach, expect, it, vi } from 'vitest';
import { currentPalette, reduceMotion, setDisplaySettings, DARK, LIGHT } from '../../src/game/render/palette';
import { defaultSettings } from '../../src/meta';
afterEach(() => { vi.unstubAllGlobals(); setDisplaySettings(null); });
const os = (state: { dark: boolean; reduce: boolean }) => vi.stubGlobal('window', {
  matchMedia: (q: string) => ({ matches: q.includes('dark') ? state.dark : state.reduce }) });
it('P3-0-R5 explicit settings override the OS media queries', () => {
  os({ dark: true, reduce: true });
  setDisplaySettings({ ...defaultSettings(), boardTheme: 'light', reducedMotion: false });
  expect(currentPalette()).toBe(LIGHT);
  expect(reduceMotion()).toBe(false);
  os({ dark: false, reduce: false });
  setDisplaySettings({ ...defaultSettings(), boardTheme: 'dark', reducedMotion: true });
  expect(currentPalette()).toBe(DARK);
  expect(reduceMotion()).toBe(true);
});
it('P3-0-R5 null settings follow the OS live', () => {
  const state = { dark: false, reduce: false };
  os(state);
  setDisplaySettings(defaultSettings());
  expect(currentPalette()).toBe(LIGHT);
  expect(reduceMotion()).toBe(false);
  state.dark = true; state.reduce = true;
  expect(currentPalette()).toBe(DARK);
  expect(reduceMotion()).toBe(true);
});
it('P3-0-R5 setDisplaySettings(null) resets to OS defaults', () => {
  os({ dark: true, reduce: false });
  setDisplaySettings({ ...defaultSettings(), boardTheme: 'light' });
  expect(currentPalette()).toBe(LIGHT);
  setDisplaySettings(null);
  expect(currentPalette()).toBe(DARK);
});
