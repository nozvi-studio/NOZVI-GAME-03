import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { drawTiles, drawIceArrow } from '../../src/game/render/tiles';
import { t } from '../../src/game/text';
import type { SimSnapshot } from '../../src/core';

function graphics() {
  const calls: string[] = [];
  const g: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ['fillStyle', 'fillRect', 'fillCircle', 'fillTriangle', 'lineStyle', 'strokeRect', 'lineBetween']) {
    g[method] = () => { calls.push(method); return g; };
  }
  return { g: g as unknown as Phaser.GameObjects.Graphics, calls };
}
const tile = (state: 'warn' | 'active' | 'fade', on = true): SimSnapshot['tiles'] => [
  { family: 'mud', id: 1, state, leftMs: 100, cells: [{ x: 1, y: 2, on }] },
];

it('MEC-012-R2 mud renderer draws active cells with three dots and skips inactive cells', () => {
  const { g, calls } = graphics();
  drawTiles(g, tile('active'), 20, 0);
  expect(calls.filter(c => c === 'fillRect')).toHaveLength(1);
  expect(calls.filter(c => c === 'fillCircle')).toHaveLength(3);
  calls.length = 0;
  drawTiles(g, tile('active', false), 20, 0);
  expect(calls).toEqual([]);
});

it('MEC-012-R2 mud warning blinks every 250 ms with dashed edges and a drop icon', () => {
  const { g, calls } = graphics();
  drawTiles(g, tile('warn', false), 20, 0);
  expect(calls).toContain('lineBetween'); expect(calls).toContain('fillTriangle');
  calls.length = 0;
  drawTiles(g, tile('warn', false), 20, 250);
  expect(calls).toEqual([]);
});

it('MEC-012-R2 reduced motion mud warning stays visible with a solid outline', () => {
  const { g, calls } = graphics();
  drawTiles(g, tile('warn', false), 20, 250, true);
  expect(calls).toContain('strokeRect'); expect(calls).not.toContain('lineBetween');
});

it('MEC-012-R11 mud introduction and death context strings resolve', () => {
  expect(t('banner.new.mud')).toBe('Mud! You slow down while your head is in it.');
  expect(t('death.context.mud')).not.toBe('death.context.mud');
});

it('MEC-012-R2 ice renderer uses shine lines, a snowflake warning and skips inactive cells', () => {
  const { g, calls } = graphics();
  const tiles: SimSnapshot['tiles'] = [{ ...tile('active')[0]!, family: 'ice' }];
  drawTiles(g, tiles, 20, 0);
  expect(calls.filter(c => c === 'fillRect')).toHaveLength(1);
  expect(calls.filter(c => c === 'lineBetween')).toHaveLength(2);
  calls.length = 0;
  drawTiles(g, [{ ...tiles[0]!, state: 'warn' }], 20, 0);
  expect(calls.filter(c => c === 'lineBetween').length).toBeGreaterThan(12);
  expect(calls).not.toContain('fillCircle');
  calls.length = 0;
  drawTiles(g, [{ ...tiles[0]!, cells: [{ x: 1, y: 2, on: false }] }], 20, 0);
  expect(calls).toEqual([]);
});

it('MEC-012-R9 head arrow appears only while the head is on active ice', () => {
  const { g, calls } = graphics();
  const snapshot: Pick<SimSnapshot, 'snake' | 'dir' | 'headTile'> = { snake: [{ x: 8, y: 8 }], dir: { x: 1, y: 0 }, headTile: 'ice' };
  drawIceArrow(g, snapshot, 20);
  expect(calls.filter(c => c === 'lineBetween')).toHaveLength(3);
  calls.length = 0;
  drawIceArrow(g, { ...snapshot, headTile: null }, 20);
  expect(calls).toEqual([]);
});

it('MEC-012-R11 ice introduction and death context strings resolve', () => {
  expect(t('banner.new.ice')).toBe("Ice! You slide straight until you're off it.");
  expect(t('death.context.ice')).not.toBe('death.context.ice');
});
