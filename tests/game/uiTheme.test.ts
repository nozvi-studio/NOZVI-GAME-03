import { expect, it } from 'vitest';
import { contrastRatio } from '../../src/game/render/biomePalette';
import { DARK } from '../../src/game/render/palette';
import { TOKENS, toInt, uiTheme, UI_THEME } from '../../src/game/uiTokens';

it('UIFIX-R4 light theme reuses the D2 tokens unchanged', () => {
  expect(uiTheme('light')).toEqual({ bg: TOKENS.surface.cream, title: TOKENS.text.primary, soft: TOKENS.text.soft,
    card: TOKENS.surface.card, ink: TOKENS.text.primary, cardSoft: TOKENS.text.soft });
});
it('UIFIX-R4 dark background matches the dark board palette background', () => {
  expect(toInt(uiTheme('dark').bg)).toBe(DARK.bg);
});
it('UIFIX-R4 every dark text/background pair reaches WCAG 4.5:1', () => {
  const d = UI_THEME.dark;
  const pairs: [string, string, string][] = [
    ['HUD title on screen', d.title, d.bg], ['HUD biome name on screen', d.soft, d.bg],
    ['card ink on card', d.ink, d.card], ['card soft text on card', d.cardSoft, d.card],
    ['Settings title on screen', d.title, d.bg],
  ];
  for (const [name, fg, bg] of pairs) expect(contrastRatio(toInt(fg), toInt(bg)), name).toBeGreaterThanOrEqual(4.5);
});
it('UIFIX-R4 the dark card is distinguishable from the dark background', () => {
  expect(UI_THEME.dark.card).not.toBe(UI_THEME.dark.bg);
});
