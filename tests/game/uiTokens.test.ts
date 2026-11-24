import { expect, it } from 'vitest';
import { TOKENS, toInt, FONT_UI, FONT_TITLE } from '../../src/game/uiTokens';
it('P3-0-R1 surviving D2 tokens keep their mockup values (dead ones removed, D3-R1)', () => {
  expect(TOKENS.surface).toEqual({ marshDeep: '#083D42', card: '#FFFCF6', white: '#FFFFFF', stone: '#E3DCD2' });
  expect(TOKENS.text).toEqual({ primary: '#5A3B3B', soft: '#8A6A6A', slate: '#3F4D5E' });
  expect(TOKENS.green).toEqual({ face: '#79D391', deep: '#4A9A63', line: '#3E7A52' });
  expect(TOKENS.accent).toEqual({ orange: '#F4A157', orangeDeep: '#DB8238', butter: '#F8D468', gold: '#FFC845' });
  expect(TOKENS.sky).toEqual({ top: '#B3DEF3', bottom: '#9DD3EE', energy: '#3CC6DA' });
  expect(TOKENS.snake).toEqual({ body: '#6F93F5', belly: '#E4ECFF' });
  expect(TOKENS.shadow.card).toEqual({ y: 4, blur: 10, spread: -3, color: '#6E5046', alpha: 0.15 });
  expect(TOKENS.title).toEqual({ strokePx: 9, shadowY: 6 });
  expect(TOKENS.screen).toEqual({ w: 390 });
});
it('P3-0-R1 toInt converts #RRGGBB to a Phaser colour', () => {
  expect(toInt('#F8F2E8')).toBe(0xf8f2e8);
  expect(() => toInt('red')).toThrow();
});
it('P3-0-R1 font stacks name the mockup fonts with a system fallback', () => {
  expect(FONT_UI).toBe('Nunito, system-ui, sans-serif');
  expect(FONT_TITLE).toBe('"Lilita One", Nunito, system-ui, sans-serif');
});
