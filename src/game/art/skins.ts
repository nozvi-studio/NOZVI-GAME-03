// ART-003 skin layer: ids and palettes. A skin changes shapes and colours, never the ART-001 anchors. Pure, no Phaser.
export const SKIN_IDS = ['snake', 'capy'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

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
    outline: '#2B3A8F', faceTop: '#7F95F0', faceBottom: '#5468D4', ears: '#5468D4', muzzle: '#9DB0F5',
    pupil: '#17261B', nose: '#2B3A8F', blush: '#FF8FA3', highlight: '#FFFFFF', tongue: '#E5484D',
    stroke: 2, innerStroke: 1.2, featureStroke: 1.4,
  },
};

const DEFAULT_SKIN: SkinId = 'snake';
// ART-003 the one place that picks the skin; P4 will read the save here.
export const activeSkin = (): SkinId => DEFAULT_SKIN;
