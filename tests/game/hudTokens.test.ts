import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
it('P3b2-R4 HUD tokens match GameD2 / PauseD2 / CountdownD2 / SkillActiveD2', () => {
  expect(TOKENS.hud).toEqual({
    skillOffIcon: '#9DB1C2', skillActiveIcon: '#2E7F93', glow: '#FFE98A', glowAlpha: 0.85,
    pauseScrimAlpha: 0.5, countScrimAlpha: 0.28,
    tooltip: '#5A3B3B', tooltipText: '#FFFFFF', mintInk: '#234B35',
    ring: '#3CC6DA', slowTint: '#8CC8F0', slowTintAlpha: 0.2, slowBoardAlpha: 0.22,
  });
});
