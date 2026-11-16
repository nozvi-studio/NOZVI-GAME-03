import { expect, it } from 'vitest';
import { TOKENS } from '../../src/game/uiTokens';
it('P3b3-R1 the logo palette matches the D2 mockup HTML', () => {
  expect(TOKENS.menu.logoColors).toEqual(['#F79DBB', '#F8D468', '#8CC9F0', '#97DB9B', '#C6B0F5']);
});
