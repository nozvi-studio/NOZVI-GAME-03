import { expect, it } from 'vitest';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { PILL_TONES } from '../../src/game/ui/pillTones';
import { toInt } from '../../src/game/uiTokens';

it('UIFIX-R14 danger pill text is readable (>= 4.5:1) on its face', () => {
  expect(contrastRatio(toInt(PILL_TONES.danger.text), toInt(PILL_TONES.danger.face))).toBeGreaterThanOrEqual(4.5);
});
