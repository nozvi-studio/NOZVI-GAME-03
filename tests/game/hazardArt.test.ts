import { expect, it } from 'vitest';
import { drawHazards, drawRock, drawTerrains, drawWarn } from '../../src/game/render/hazards';
import { boardLook } from '../../src/game/render/biomePalette';
import { loadBalance } from '../support/balance';
import { gfx } from '../support/gfx';
import type { SimSnapshot } from '../../src/core';

const b = loadBalance();
const themes = ['light', 'dark'] as const;
const rockHazard = (state: 'warn' | 'solid' | 'crumble', cells = [{ x: 3, y: 4, on: true, ageMs: 400 }]): SimSnapshot['hazards'] =>
  [{ type: 'rock', state, t: 100, warnMs: 1500, lifeMs: 10000, cells }];

it('P3b1-R4 pebble < rock < boulder (first ellipse is the drop shadow, width = body width)', () => {
  const widths = (['pebble', 'rock', 'boulder'] as const).map(kind => {
    const p = gfx(); drawRock(p.g, { x: 50, y: 50 }, 30, boardLook(1, 'light'), 1, kind);
    return p.calls.find(c => c[0] === 'fillEllipse')![3] as number;
  });
  expect(widths[0]!).toBeLessThan(widths[1]!); expect(widths[1]!).toBeLessThan(widths[2]!);
});

it('P3b1-R4 a rock has an outline ring in the board edge colour and a highlight; crumble adds crack and debris', () => {
  for (const theme of themes) {
    const look = boardLook(2, theme), solid = gfx(), crumbling = gfx();
    drawRock(solid.g, { x: 50, y: 50 }, 30, look, 1, 'rock', false);
    drawRock(crumbling.g, { x: 50, y: 50 }, 30, look, 1, 'rock', true);
    expect(solid.calls.some(c => c[0] === 'fillStyle' && c[1] === look.edge)).toBe(true);
    expect(solid.count('rotateCanvas')).toBe(1);
    expect(solid.count('lineBetween')).toBe(0);
    expect(crumbling.count('lineBetween')).toBe(4);               // crack polyline M11 2 L8.5 7.5 12 10.5 9 14.5 11 19
    expect(crumbling.count('fillRoundedRect')).toBe(4);           // two debris chips, edge + fill each
  }
});

it('P3b1-R5 hazard warning keeps ring + dashes + "!" shape in both themes, blinking or reduced', () => {
  for (const theme of themes) for (const reduced of [false, true]) for (const ms of [0, 90, 400]) {
    const p = gfx();
    drawWarn(p.g, { x: 2, y: 3 }, 30, ms, 0.4, boardLook(3, theme), 'hazard', false, reduced);
    expect(p.count('strokeRoundedRect')).toBe(1);                // constant outline ring
    expect(p.count('lineBetween')).toBeGreaterThan(8);           // dashed border
    expect(p.count('fillCircle')).toBe(1);                       // dot of the "!"
    expect(p.calls.some(c => c[0] === 'fillRoundedRect')).toBe(true);
  }
});

it('P3b1-R5 rising-ground warning draws the chevron shape, not just a tint', () => {
  const p = gfx();
  drawWarn(p.g, { x: 2, y: 3 }, 30, 0, 0.5, boardLook(3, 'light'), 'rise', false, true);
  expect(p.count('strokeRoundedRect')).toBe(1);
  expect(p.count('fillCircle')).toBe(0);
  const chevron = p.calls.filter(c => c[0] === 'lineStyle').at(-1)!;
  expect(chevron[1]).toBeCloseTo(30 * 0.13);
});

it('P3b1-R5 reduced motion never blinks: fill alpha is constant over time, motion mode varies it', () => {
  const alphas = (reduced: boolean): number[] => [0, 60, 130].map(ms => {
    const p = gfx(); drawWarn(p.g, { x: 0, y: 0 }, 30, ms, 0.5, boardLook(1, 'light'), 'hazard', false, reduced);
    return p.calls.filter(c => c[0] === 'fillStyle')[0]![2] as number;
  });
  expect(new Set(alphas(true)).size).toBe(1);
  expect(new Set(alphas(false)).size).toBeGreaterThan(1);
});

it('P3b1-R5 a warning rock also previews the rock faintly; a solid rock does not draw a ring', () => {
  const warn = gfx(), solid = gfx(), look = boardLook(1, 'light');
  drawHazards(warn.g, rockHazard('warn', [{ x: 3, y: 4, on: false, ageMs: 0 }]), 30, look, b, false);
  drawHazards(solid.g, rockHazard('solid'), 30, look, b, false);
  expect(warn.count('strokeRoundedRect')).toBe(1);
  expect(warn.count('fillEllipse')).toBeGreaterThan(0);          // faint rock preview
  expect(solid.count('strokeRoundedRect')).toBe(0);
  expect(solid.count('rotateCanvas')).toBe(1);
});

const fenceHazard = (cells: { x: number; y: number }[]): SimSnapshot['hazards'] =>
  [{ type: 'fence', state: 'solid', t: 100, warnMs: 2000, lifeMs: 10000, cells: cells.map(c => ({ ...c, on: true, ageMs: 400 })) }];

it('P3b1-R6 a lone fence cell is one post; two horizontally joined cells add two rails; rails are drawn before posts', () => {
  const look = boardLook(2, 'light');
  const one = gfx(); drawHazards(one.g, fenceHazard([{ x: 1, y: 1 }]), 30, look, b, false);
  expect(one.count('fillRoundedRect')).toBe(2);                              // post: edge + fill
  const two = gfx(); drawHazards(two.g, fenceHazard([{ x: 1, y: 1 }, { x: 2, y: 1 }]), 30, look, b, false);
  expect(two.count('fillRoundedRect')).toBe(8);                              // 2 rail boxes + 2 posts, each edge + fill
  const rects = two.calls.filter(c => c[0] === 'fillRoundedRect');
  const first = rects[0]!, last = rects.at(-1)!;
  expect(first[3]).toBeCloseTo(30);                                          // first box is a full-length rail (w = cell)
  expect(last[3]).toBeCloseTo(30 * 0.4 - 2 * 30 * 0.076);                    // last box is a post fill
});

it('P3b1-R6 fences use the biome wood edge: brown on light grounds, white on dark ones', () => {
  const light = gfx(), dark = gfx();
  drawHazards(light.g, fenceHazard([{ x: 1, y: 1 }]), 30, boardLook(2, 'light'), b, false);
  drawHazards(dark.g, fenceHazard([{ x: 1, y: 1 }]), 30, boardLook(2, 'dark'), b, false);
  expect(light.calls.find(c => c[0] === 'fillStyle')![1]).toBe(boardLook(2, 'light').woodEdge);
  expect(dark.calls.find(c => c[0] === 'fillStyle')![1]).toBe(boardLook(2, 'dark').woodEdge);
  expect(boardLook(2, 'light').woodEdge).not.toBe(boardLook(2, 'dark').woodEdge);
});

it('P3b1-R6 a maze hazard draws glow, edge and fill passes over every bar', () => {
  const p = gfx();
  drawHazards(p.g, [{ type: 'maze', state: 'solid', t: 100, warnMs: 2600, lifeMs: 10000,
    cells: [{ x: 1, y: 1, on: true, ageMs: 400 }, { x: 2, y: 1, on: true, ageMs: 400 }] }], 30, boardLook(6, 'light'), b, false);
  expect(p.count('fillRoundedRect')).toBe(3 * 3);                            // 2 bars + 1 connector, x (glow, edge, fill)
});

it('P3b1-R6 rising ground: warn tile has ring + chevron, up tile is a two-face stone with a look edge', () => {
  const look = boardLook(3, 'light');
  const mk = (vis: 'down' | 'warn' | 'up'): SimSnapshot['terrains'] => [{ t: 5000, lifeMs: 20000, cells: [{ x: 2, y: 2, vis, delay: 0 }] }];
  const warn = gfx(); drawTerrains(warn.g, mk('warn'), 30, look, b, false);
  expect(warn.count('strokeRoundedRect')).toBe(1);
  const up = gfx(); drawTerrains(up.g, mk('up'), 30, look, b, false);
  expect(up.calls.some(c => c[0] === 'fillStyle' && c[1] === look.edge)).toBe(true);
  expect(up.count('fillRoundedRect')).toBe(1 + 2 * 2);                       // zone mark + (front, top) x (edge, fill)
});
