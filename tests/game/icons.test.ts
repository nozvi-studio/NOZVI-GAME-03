import { expect, it, vi } from 'vitest';
import { drawIcon, ICON_IDS } from '../../src/game/ui/icons';
const fake = () => {
  const calls: string[] = [];
  const args: Record<string, number[][]> = {};
  const g: Record<string, unknown> = {};
  for (const k of ['fillStyle', 'lineStyle', 'fillCircle', 'strokeCircle', 'fillRoundedRect', 'fillTriangle', 'lineBetween', 'beginPath', 'moveTo', 'lineTo', 'strokePath', 'closePath', 'fillPath', 'arc'])
    g[k] = vi.fn((...a: number[]) => { calls.push(k); (args[k] ??= []).push(a); return g; });
  return { g: g as never, calls, args };
};
it('P3b3-R14 every icon id draws something', () => {
  expect(ICON_IDS).toEqual(['back', 'sliders', 'lock', 'bolt', 'flag', 'home', 'slowmo', 'tailSnip', 'shield', 'mangoRain', 'sound', 'haptics', 'dpad', 'motion', 'check', 'face']);
  for (const id of ICON_IDS) {
    const { g, calls } = fake();
    drawIcon(g, id, 24, 0x5a3b3b);
    expect(calls.some(c => c.startsWith('fill') || c.startsWith('stroke') || c === 'lineBetween'), id).toBe(true);
  }
});
it('D3-R19 sound icon: cone starts at the box right edge and waves are arcs', () => {
  const { g, calls, args } = fake();
  drawIcon(g, 'sound', 24, 0xffffff);
  const box = args['fillRoundedRect']![0]!;
  const boxRight = box[0]! + box[2]!;
  const t = args['fillTriangle']![0]!;
  expect(Math.min(t[0]!, t[2]!, t[4]!)).toBeGreaterThanOrEqual(boxRight);
  expect(calls.filter(c => c === 'arc').length).toBeGreaterThanOrEqual(2);
});
