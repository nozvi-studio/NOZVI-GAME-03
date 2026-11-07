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
