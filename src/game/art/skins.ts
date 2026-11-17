// ART-003 skin layer: ids and palettes. A skin changes shapes and colours, never the ART-001 anchors. Pure, no Phaser.
export const SKIN_IDS = ['snake', 'ginger', 'pup', 'tuxedo', 'capy'] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const isSkinId = (id: string): id is SkinId => (SKIN_IDS as readonly string[]).includes(id);

export interface SkinPalette {
  outline: string; faceTop: string; faceBottom: string; ears: string; muzzle: string;
  pupil: string; nose: string; blush: string; highlight: string; tongue: string;
  stroke: number; innerStroke: number; featureStroke: number;
}

export const SKIN_PALETTES: Record<SkinId, SkinPalette> = {
  capy: {
    outline: '#4A2E1B', faceTop: '#D6AB7C', faceBottom: '#C79A6B', ears: '#B1865A', muzzle: '#B1865A',
    pupil: '#17261B', nose: '#4A2E1B', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  // Blue family of the light-mode snake (render/palette.ts body 0x2b3a8f = the outline so the head edge merges into the
  // body, belly 0x5468d4 = lower face); the face stays light enough for the dark pupils. "ears" is the limb colour.
  snake: {
    outline: '#2B3A8F', faceTop: '#7F95F0', faceBottom: '#5468D4', ears: '#5468D4', muzzle: '#C3CEFA',
    pupil: '#17261B', nose: '#2B3A8F', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  ginger: { outline: '#7A3E12', faceTop: '#FFB866', faceBottom: '#F6A04D', ears: '#F6A04D', muzzle: '#FFF4E3',
    pupil: '#17261B', nose: '#7A3E12', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D', stroke: 2, innerStroke: 1.2, featureStroke: 1.4 },
  pup: { outline: '#6B4423', faceTop: '#F4D9AE', faceBottom: '#E9C48F', ears: '#9A6236', muzzle: '#FFF7EA',
    pupil: '#17261B', nose: '#3A2414', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D', stroke: 2, innerStroke: 1.2, featureStroke: 1.4 },
  tuxedo: { outline: '#1B1F2A', faceTop: '#59627A', faceBottom: '#454D63', ears: '#454D63', muzzle: '#FFFFFF',
    pupil: '#0E1118', nose: '#1B1F2A', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D', stroke: 2, innerStroke: 1.2, featureStroke: 1.4 },
};

// MEC-011-R4 in-run body colours per skin (null = the D3 snake tokens). `outlineStorm` is used on the dark storm biome.
export const SKIN_BODY: Record<SkinId, { body: string; head: string; belly: string; stripe: string; outline: string; outlineStorm: string } | null> = {
  snake: null,
  ginger: { body: '#F6A04D', head: '#FFB866', belly: '#FFE2BF', stripe: '#FFFFFF', outline: '#7A3E12', outlineStorm: '#FFE2BF' },
  pup: { body: '#E9C48F', head: '#F4D9AE', belly: '#FFF3DC', stripe: '#FFFFFF', outline: '#6B4423', outlineStorm: '#FFF3DC' },
  tuxedo: { body: '#4A5266', head: '#59627A', belly: '#E8ECF5', stripe: '#FFFFFF', outline: '#1B1F2A', outlineStorm: '#E8ECF5' },
  capy: { body: '#C79A6B', head: '#D6AB7C', belly: '#F1DCC0', stripe: '#FFFFFF', outline: '#4A2E1B', outlineStorm: '#F1DCC0' },
};
// MEC-011-R25 presentation effects per skin; Common skins have none.
export const SKIN_EFFECTS: Record<SkinId, { eat: boolean; trail: boolean }> = {
  snake: { eat: false, trail: false }, ginger: { eat: false, trail: false }, pup: { eat: false, trail: false },
  tuxedo: { eat: false, trail: false }, capy: { eat: true, trail: true },
};

let current: SkinId = 'snake';
// ART-003 the one place that says which skin is drawn; set from the save at boot and when the player equips (MEC-011-R9).
export const activeSkin = (): SkinId => current;
export function setActiveSkin(id: string): void { current = isSkinId(id) ? id : 'snake'; }
