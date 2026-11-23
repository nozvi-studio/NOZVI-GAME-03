// ART-003 skin layer: ids and palettes. A skin changes shapes and colours, never the ART-001 anchors. Pure, no Phaser.
export const SKIN_IDS = ['snake', 'ginger', 'pup', 'tuxedo', 'capy'] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const isSkinId = (id: string): id is SkinId => (SKIN_IDS as readonly string[]).includes(id);

export interface SkinPalette {
  outline: string; faceTop: string; faceBottom: string; ears: string; muzzle: string;
  pupil: string; nose: string; blush: string; highlight: string; tongue: string;
  // D4-P2-R1 flat cel shading
  crown: string;
  shade: string;
  innerEar: string;
  leaf: string | null;
  leafVein: string | null;
  stroke: number; innerStroke: number; featureStroke: number;
}

export const SKIN_PALETTES: Record<SkinId, SkinPalette> = {
  capy: {
    outline: '#7A4A26', faceTop: '#D9AE80', faceBottom: '#C79A6B', ears: '#B8895C', muzzle: '#E8CBA8',
    pupil: '#17261B', nose: '#6B3E20', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    crown: '#E8C59E', shade: '#C59565', innerEar: '#EBC2A4', leaf: '#58CC02', leafVein: '#46A302',
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  // Blue family of the light-mode snake (render/palette.ts body 0x2b3a8f = the outline so the head edge merges into the
  // body, belly 0x5468d4 = lower face); the face stays light enough for the dark pupils. "ears" is the limb colour.
  snake: {
    outline: '#2B3A8F', faceTop: '#7F95F0', faceBottom: '#5468D4', ears: '#5468D4', muzzle: '#C3CEFA',
    pupil: '#17261B', nose: '#2B3A8F', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    crown: '#A6B6F7', shade: '#637BE0', innerEar: '#A6B6F7', leaf: null, leafVein: null,
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  ginger: {
    outline: '#A3541C', faceTop: '#FFB866', faceBottom: '#F6A04D', ears: '#F6A04D', muzzle: '#FFF4E3',
    pupil: '#17261B', nose: '#A3541C', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    crown: '#FFD094', shade: '#ED9842', innerEar: '#FFD4DD', leaf: null, leafVein: null,
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  pup: {
    outline: '#8A5A30', faceTop: '#F4D9AE', faceBottom: '#E9C48F', ears: '#A86D3E', muzzle: '#FFF7EA',
    pupil: '#17261B', nose: '#5C3A1E', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    crown: '#FBE8C8', shade: '#E2BC84', innerEar: '#C98E5C', leaf: null, leafVein: null,
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
  tuxedo: {
    outline: '#2E3448', faceTop: '#59627A', faceBottom: '#454D63', ears: '#454D63', muzzle: '#FFFFFF',
    pupil: '#0E1118', nose: '#2E3448', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    crown: '#747E99', shade: '#485068', innerEar: '#FFC9D4', leaf: null, leafVein: null,
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
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
