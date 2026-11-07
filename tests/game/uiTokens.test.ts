import { expect, it } from 'vitest';
import { TOKENS, toInt, FONT_UI, FONT_TITLE } from '../../src/game/uiTokens';
it('P3-0-R1 tokens match UI-MOCKUPS §3', () => {
  expect(TOKENS.surface).toEqual({ cream: '#F8F2E8', card: '#FFFCF6', white: '#FFFFFF', sand: '#EFE6D8', stone: '#E3DCD2', peach: '#FBE3C8' });
  expect(TOKENS.text).toEqual({ primary: '#5A3B3B', soft: '#8A6A6A', faint: '#B79F8A', slate: '#3F4D5E', logoOutline: '#6B4C82', walnut: '#B98558' });
  expect(TOKENS.green).toEqual({ face: '#79D391', shade: '#5DB878', deep: '#4A9A63', line: '#3E7A52', mint: '#CFEBD0', mint2: '#C2E4C6' });
  expect(TOKENS.accent).toEqual({ orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845', pink: '#F6C2D3', periwinkle: '#8EA0FF' });
  expect(TOKENS.sky).toEqual({ top: '#B3DEF3', bottom: '#9DD3EE', silhouette: '#C4E7F7', stat: '#BCDDF4', lavender: '#C6B0F5', energy: '#3CC6DA' });
  expect(TOKENS.snake).toEqual({ body: '#6F93F5', shade: '#3F63D1', belly: '#E4ECFF' });
  expect(TOKENS.shadow.card).toEqual({ y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 });
  expect(TOKENS.title).toEqual({ strokePx: 9, shadowY: 6 });
  expect(TOKENS.screen).toEqual({ w: 390, h: 844, sidePad: 16 });
});
it('P3-0-R1 toInt converts #RRGGBB to a Phaser colour', () => {
  expect(toInt('#F8F2E8')).toBe(0xf8f2e8);
  expect(() => toInt('red')).toThrow();
});
it('P3-0-R1 font stacks name the mockup fonts with a system fallback', () => {
  expect(FONT_UI).toBe('Nunito, system-ui, sans-serif');
  expect(FONT_TITLE).toBe('"Lilita One", Nunito, system-ui, sans-serif');
});
