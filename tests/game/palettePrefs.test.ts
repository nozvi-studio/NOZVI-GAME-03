import { afterEach, expect, it, vi } from 'vitest';
import { currentPalette, reduceMotion, setDisplayPrefs, DARK, LIGHT } from '../../src/game/render/palette';
afterEach(() => vi.unstubAllGlobals());
it('P3-0-R5 explicit prefs override the OS media queries', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  setDisplayPrefs({ theme: 'light', reducedMotion: false });
  expect(currentPalette()).toBe(LIGHT);
  expect(reduceMotion()).toBe(false);
  setDisplayPrefs({ theme: 'dark', reducedMotion: true });
  expect(currentPalette()).toBe(DARK);
  expect(reduceMotion()).toBe(true);
});
