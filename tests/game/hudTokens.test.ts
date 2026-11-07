import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
it('P3b2-R4 HUD tokens match GameD2 / PauseD2 / CountdownD2 / SkillActiveD2', () => {
  expect(TOKENS.hud).toEqual({
    skillOffFace: '#E9F1F7', skillOffIcon: '#9DB1C2', skillActiveIcon: '#2E7F93', skillUsedFace: '#EFE6D8',
    glow: '#FFE98A', glowAlpha: 0.85, shelf: '#508CB4', shelfAlpha: 0.3,
    ring: '#3CC6DA', ringTrack: '#FFFFFF', ringTrackAlpha: 0.75, energyTrack: '#D9EEF3', quota: '#2E9E5B',
    scrim: '#5A3B3B', pauseScrimAlpha: 0.5, countScrimAlpha: 0.28,
    tooltip: '#5A3B3B', tooltipText: '#FFFFFF', mintCard: '#D7EBD2', mintInk: '#234B35',
    slowTint: '#8CC8F0', slowTintAlpha: 0.2, slowBoardAlpha: 0.22,
    countdown: '#F8D468', countdownStrokePx: 22, countdownShadowY: 12, countdownSizePx: 270, cardShadowAlpha: 0.45,
  });
});
