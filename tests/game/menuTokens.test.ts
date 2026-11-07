import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
it('P3b3-R1 menu tokens match the D2 mockup HTML', () => {
  expect(TOKENS.menu.logoColors).toEqual(['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5']);
  expect(TOKENS.menu.heroBands).toEqual(['#F6C2D3', '#FBE19A', '#BCDDF4']);
  expect(TOKENS.menu.heroBandStops).toEqual([0.34, 0.67]);
  expect(TOKENS.menu.statButter).toBe('#FBE19A');
  expect(TOKENS.menu.bestSoft).toBe('#FFF3D1');
  expect(TOKENS.menu.mintBanner).toBe('#D7EBD2');
  expect(TOKENS.menu.mintBannerText).toBe('#234B35');
  expect(TOKENS.menu.slotRing).toBe('#FFE98A');
  expect(TOKENS.menu.pickRing).toBe('#7FC98C');
  expect(TOKENS.menu.costChip).toBe('#E6F5F8');
  expect(TOKENS.menu.rowDivider).toBe('#F3EBDD');
  expect(TOKENS.menu.themeLight).toEqual(['#CFEBD0', '#C2E4C6']);
  expect(TOKENS.menu.themeDark).toEqual(['#3B4A5A', '#33414F']);
});
