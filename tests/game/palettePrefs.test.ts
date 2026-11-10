import { afterEach, expect, it, vi } from 'vitest';
import { currentPalette, reduceMotion, setDisplaySettings, LIGHT } from '../../src/game/render/palette';
import { defaultSettings } from '../../src/meta';
afterEach(() => { vi.unstubAllGlobals(); setDisplaySettings(null); });
const os = (state: { dark: boolean; reduce: boolean }) => vi.stubGlobal('window', {
  matchMedia: (q: string) => ({ matches: q.includes('dark') ? state.dark : state.reduce }) });
it('D3-R3 the palette is always light, whatever the OS scheme or the saved board theme', () => {
  os({ dark: true, reduce: false });
  setDisplaySettings({ ...defaultSettings(), boardTheme: 'dark' });
  expect(currentPalette()).toBe(LIGHT);
  setDisplaySettings(null);
  expect(currentPalette()).toBe(LIGHT);
});
it('D3-R3 reduced motion still follows the setting, then the OS', () => {
  os({ dark: false, reduce: true });
  setDisplaySettings({ ...defaultSettings(), reducedMotion: false });
  expect(reduceMotion()).toBe(false);
  setDisplaySettings(defaultSettings());
  expect(reduceMotion()).toBe(true);
});
