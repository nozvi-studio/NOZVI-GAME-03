import { TOKENS as T } from '../uiTokens';

export type PillTone = 'green' | 'orange' | 'cream' | 'danger';
export const PILL_TONES: Record<PillTone, { face: string; deep: string; line: string; text: string; stroke: boolean }> = {
  green: { face: T.green.face, deep: T.green.deep, line: T.green.line, text: T.surface.white, stroke: true },
  orange: { face: T.accent.orange, deep: T.accent.orangeDeep, line: T.accent.orangeDeep, text: T.surface.white, stroke: true },
  cream: { face: T.surface.card, deep: T.surface.stone, line: T.text.soft, text: T.text.primary, stroke: false },
  danger: { face: T.surface.card, deep: T.surface.stone, line: T.danger.line, text: T.danger.text, stroke: false }, // UIFIX-R14 POL-04 soft red
};
