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

// MEC-003 §8 greybox ground tint per biome (1..6); game-layer colors, not config.
export const BIOME_GROUND: readonly number[] = [0x8fd16a, 0xd9e58a, 0xbfe3f2, 0xd2a86b, 0xe8915a, 0x6b4fa3];
// MEC-006 §8 greybox colors for orbs, skills, slow-mo and shield.
export const P1_COLORS = { orb: 0x29d3e6, orbLine: 0x0b6b78, slowmo: 0x3d6dff, shield: 0x29d3e6, rubble: 0x4a4a4a,
  snipStripe: 0x2b3a8f, droplet: 0x3d9bff, skillOff: 0x9a9a9a } as const;
