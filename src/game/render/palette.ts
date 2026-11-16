import { defaultSettings, resolveDisplay, type Settings } from '../../meta';
export type Palette = Record<
  'bg' | 'boardA' | 'boardB' | 'snake' | 'belly' | 'food' | 'leaf' | 'rock' | 'rockHi' |
  'danger' | 'warn' | 'gold' | 'wood' | 'woodHi' | 'hedge' | 'hedgeHi' | 'earth' | 'earthSide' |
  'ink' | 'panel', number>;

export const LIGHT: Palette = {
  bg: 0xdfe9c8, boardA: 0xa9cf6f, boardB: 0x9cc462, snake: 0x2b3a8f, belly: 0x5468d4,
  food: 0xf29f25, leaf: 0x3f7d2c, rock: 0x7d7768, rockHi: 0xa8a291, danger: 0xd43d2f,
  warn: 0xef8414, gold: 0xf7c62f, wood: 0x7e4f24, woodHi: 0xb07a42, hedge: 0x2f5a24,
  hedgeHi: 0x4f8a3c, earth: 0xb98352, earthSide: 0x6f4a2b, ink: 0x22311a, panel: 0xfafcf4,
};

// GDD-13 follow the prototype's system theme and accessibility preferences.
const media = (q: string): boolean => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
export const osDisplay = () => ({ dark: false, reducedMotion: media('(prefers-reduced-motion: reduce)') });
let saved: Settings | null = null;
/** P3-0-R5 Boot and Settings push the saved settings; null values keep following the OS, resolved on every call. */
export const setDisplaySettings = (s: Settings | null): void => { saved = s; };
const display = () => resolveDisplay(saved ?? defaultSettings(), osDisplay());
/** D3-R3 the UI and the board always render the light look; the saved board theme and the OS scheme are ignored. */
export const currentPalette = (): Palette => LIGHT;
export const reduceMotion = (): boolean => display().reducedMotion;

// MEC-006 §8 greybox colors for orbs, skills, slow-mo and shield.
export const P1_COLORS = { orb: 0x29d3e6, orbLine: 0x0b6b78, slowmo: 0x3d6dff, shield: 0x29d3e6,
  snipStripe: 0x2b3a8f, droplet: 0x3d9bff, skillOff: 0x9a9a9a } as const;
