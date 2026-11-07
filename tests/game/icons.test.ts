import { expect, it, vi } from 'vitest';
import { drawIcon, ICON_IDS } from '../../src/game/ui/icons';
const fake = () => {
  const calls: string[] = [];
  const g: Record<string, unknown> = {};
  for (const k of ['fillStyle', 'lineStyle', 'fillCircle', 'strokeCircle', 'fillRoundedRect', 'fillTriangle', 'lineBetween', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'fillPath'])
    g[k] = vi.fn(() => { calls.push(k); return g; });
  return { g: g as never, calls };
};
it('P3b3-R14 every icon id draws something', () => {
  expect(ICON_IDS).toEqual(['back', 'gear', 'lock', 'bolt', 'flag', 'home', 'slowmo', 'tailSnip', 'shield', 'mangoRain', 'sound', 'haptics', 'dpad', 'motion']);
  for (const id of ICON_IDS) {
    const { g, calls } = fake();
    drawIcon(g, id, 24, 0x5a3b3b);
    expect(calls.some(c => c.startsWith('fill') || c.startsWith('stroke') || c === 'lineBetween'), id).toBe(true);
  }
});
