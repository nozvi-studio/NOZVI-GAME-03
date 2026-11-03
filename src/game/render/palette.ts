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
export const DARK: Palette = {
  bg: 0x131d15, boardA: 0x2d4b27, boardB: 0x284322, snake: 0x93a5ff, belly: 0xc3ccff,
  food: 0xffb548, leaf: 0x7cc35e, rock: 0x6e6a60, rockHi: 0x938e80, danger: 0xff6b5b,
  warn: 0xffa940, gold: 0xffe066, wood: 0xb98550, woodHi: 0xdcae78, hedge: 0x86b663,
  hedgeHi: 0xb1d98f, earth: 0xb48659, earthSide: 0x5e3f26, ink: 0xe6f0dc, panel: 0x131d15,
};

// GDD-13 follow the prototype's system theme and accessibility preferences.
export const currentPalette = (): Palette => window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
export const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
