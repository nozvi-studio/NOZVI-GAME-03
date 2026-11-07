import { expect, it } from 'vitest';
import { hudIconKey, hudIconSvg, ICON_TONES, type IconName, type IconTone } from '../../src/game/hud/hudIcons';
import { TOKENS } from '../../src/game/uiTokens';

it('P3b2-R14 every icon/tone has a unique key and a well-formed SVG in the tone colour', () => {
  const keys = new Set<string>();
  for (const [name, tones] of Object.entries(ICON_TONES) as [IconName, readonly IconTone[]][])
    for (const tone of tones) {
      const key = hudIconKey(name, tone), svg = hudIconSvg(name, tone);
      expect(keys.has(key)).toBe(false); keys.add(key);
      expect(svg.startsWith('<svg')).toBe(true); expect(svg.endsWith('</svg>')).toBe(true);
    }
  expect(hudIconSvg('slowmo', 'off')).toContain(TOKENS.hud.skillOffIcon);
  expect(hudIconSvg('slowmo', 'active')).toContain(TOKENS.hud.skillActiveIcon);
  expect(hudIconSvg('tailSnip', 'ink')).toContain(TOKENS.text.primary);
  expect(hudIconSvg('bolt')).toContain(TOKENS.sky.energy);
  expect(hudIconSvg('star')).toContain(TOKENS.accent.gold);
});
