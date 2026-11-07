import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { drawTiles, drawIceArrow } from '../../src/game/render/tiles';
import { t } from '../../src/game/text';
import type { SimSnapshot } from '../../src/core';
import { boardLook } from '../../src/game/render/biomePalette';
import { gfx } from '../support/gfx';

function graphics() {
  const calls: string[] = [];
  const g: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ['fillStyle', 'fillRect', 'fillRoundedRect', 'strokeRoundedRect', 'fillEllipse', 'fillCircle', 'fillTriangle', 'lineStyle', 'strokeRect', 'lineBetween']) {
    g[method] = () => { calls.push(method); return g; };
  }
  return { g: g as unknown as Phaser.GameObjects.Graphics, calls };
}
const tile = (state: 'warn' | 'active' | 'fade', on = true): SimSnapshot['tiles'] => [
  { family: 'mud', id: 1, state, leftMs: 100, cells: [{ x: 1, y: 2, on }] },
];

it('MEC-012-R2 / P3b1-R7 mud renderer draws a plain rounded fill (no wood ring), a puddle and two bubbles; inactive cells are skipped', () => {
  const { g, calls } = graphics();
  drawTiles(g, tile('active'), 20, 0);
  expect(calls.filter(c => c === 'fillRoundedRect')).toHaveLength(1);
  expect(calls.filter(c => c === 'fillEllipse')).toHaveLength(1);
  expect(calls.filter(c => c === 'fillCircle')).toHaveLength(2);
  calls.length = 0;
  drawTiles(g, tile('active', false), 20, 0);
  expect(calls).toEqual([]);
});

it('P3b1-R7 warn states take their edge colour from the board look in both themes (mud wood edge, ice edge)', () => {
  for (const theme of ['light', 'dark'] as const) {
    const look = boardLook(2, theme);
    const mud = gfx(); drawTiles(mud.g, tile('warn'), 20, 0, false, look);
    expect(mud.calls.find(c => c[0] === 'lineStyle')![2]).toBe(look.woodEdge);
    const ice = gfx(); drawTiles(ice.g, [{ ...tile('warn')[0]!, family: 'ice' }], 20, 0, false, look);
    expect(ice.calls.find(c => c[0] === 'lineStyle')![2]).toBe(look.edge);
  }
});

it('P3b1-R7 active and fading ice draw a ring in the board edge colour in both themes', () => {
  for (const theme of ['light', 'dark'] as const) for (const state of ['active', 'fade'] as const) {
    const look = boardLook(2, theme), p = gfx();
    drawTiles(p.g, [{ ...tile(state)[0]!, family: 'ice' }], 20, 0, false, look);
    const i = p.names().indexOf('strokeRoundedRect');
    expect(i).toBeGreaterThan(-1);
    expect(p.calls[i - 1]![0]).toBe('lineStyle');
    expect(p.calls[i - 1]![2]).toBe(look.edge);
  }
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
  expect(calls.filter(c => c === 'fillRoundedRect')).toHaveLength(1);
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
