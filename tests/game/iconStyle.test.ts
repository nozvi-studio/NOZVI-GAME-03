import { expect, it, vi } from 'vitest';
import { hudIconSvg, ICON_TONES, type IconName } from '../../src/game/hud/hudIcons';
import { drawIcon, ICON_IDS } from '../../src/game/ui/icons';
import { TOKENS } from '../../src/game/uiTokens';

const S = TOKENS.d3.shape.iconStroke;
it('D3-R19 every menu icon draws its outline with the shared stroke width', () => {
  for (const id of ICON_IDS) {
    const widths: number[] = [], g: Record<string, unknown> = {};
    for (const k of ['fillStyle', 'fillCircle', 'strokeCircle', 'fillRoundedRect', 'fillTriangle', 'lineBetween', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'fillPath', 'arc'])
      g[k] = vi.fn(() => g);
    g.lineStyle = vi.fn((w: number) => { widths.push(w); return g; });
    drawIcon(g as never, id, 48, 0x123456);
    expect(widths, id).toEqual([S * 48 / 24]);
  }
});
it('D3-R19 every HUD icon is either solid or stroked with the shared width', () => {
  for (const name of Object.keys(ICON_TONES) as IconName[]) {
    const svg = hudIconSvg(name), widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
    for (const w of widths) expect(w, name).toBe(S);
  }
});
it('D3-R19 the board icon names exist in both sets', () => {
  expect(ICON_IDS).toContain('check');
  expect(hudIconSvg('slowmo')).toContain(`stroke-width="${S}"`);
});
