import type Phaser from 'phaser';
import { expect, it } from 'vitest';
import { arrowTriangle, blinkOn, dashedSegments, drawMovers, pathDirs, shadowScale } from '../../src/game/render/movers';
import { drawCycles } from '../../src/game/render/cycles';
import { bombDigit, digitSegments, drawBlasts } from '../../src/game/render/blasts';
import { t } from '../../src/game/text';
import type { SimSnapshot } from '../../src/core';

function graphics() {
  const calls: string[] = [];
  const g: unknown = new Proxy({}, { get: (_o, name: string) => (): unknown => { calls.push(name); return g; } });
  return { g: g as Phaser.GameObjects.Graphics, calls };
}
const snap = (families: Partial<SimSnapshot['families']>): SimSnapshot =>
  ({ families: { coconut: [], gate: [], spike: [], npc: [], bird: null, bomb: [], ...families } }) as unknown as SimSnapshot;
const path = [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }];

it('MEC-013 §8 blinkOn toggles every 250 ms and stays on in reduced motion', () => {
  expect([blinkOn(0, false), blinkOn(250, false), blinkOn(500, false)]).toEqual([true, false, true]);
  expect(blinkOn(250, true)).toBe(true);
});
it('MEC-013 §8 pathDirs gives the roll direction of each lane cell and arrowTriangle points along it', () => {
  expect(pathDirs(path)).toEqual([{ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0 }]);
  const tri = arrowTriangle({ x: 2, y: 1 }, { x: 1, y: 0 }, 20);
  expect(tri).toHaveLength(6);
  expect(tri[0]).toBeGreaterThan(2 * 20 + 10);
});
it('MEC-016 §8 shadowScale shrinks with leftMs / shadowMs and clamps to 0..1', () => {
  expect(shadowScale(600, 600)).toBe(1); expect(shadowScale(300, 600)).toBe(0.5);
  expect(shadowScale(-5, 600)).toBe(0); expect(shadowScale(900, 600)).toBe(1);
});
it('MEC-017 §8 bombDigit is ceil(leftMs / 1000) and digit segments exist for 0-9', () => {
  expect([bombDigit(3000), bombDigit(2999), bombDigit(1), bombDigit(0)]).toEqual([3, 3, 1, 0]);
  for (let d = 0; d <= 9; d++) expect(digitSegments(d).length).toBeGreaterThan(0);
  expect(digitSegments(1).length).toBeLessThan(digitSegments(8).length);
});
it('MEC-017 §8 dashedSegments splits an edge into dashes', () => {
  const segs = dashedSegments(0, 0, 40, 0, 10);
  expect(segs).toHaveLength(2);
  expect(segs[0]).toEqual([0, 0, 10, 0]);
});

it('MEC-013 §8 coconut warning blinks with arrows; reduced motion keeps a solid outline; rolling is a circle', () => {
  const warn = snap({ coconut: [{ id: 1, path, cell: null, state: 'warn', t: 0, warnMs: 1000 }] });
  let r = graphics(); drawMovers(r.g, warn, 20, 0, false);
  expect(r.calls).toContain('fillTriangle');
  r = graphics(); drawMovers(r.g, warn, 20, 250, false);
  expect(r.calls).toEqual([]);
  r = graphics(); drawMovers(r.g, warn, 20, 250, true);
  expect(r.calls).toContain('strokeRect'); expect(r.calls).toContain('fillTriangle');
  const move = snap({ coconut: [{ id: 1, path, cell: { x: 2, y: 1 }, state: 'move', t: 5, warnMs: 1000 }] });
  r = graphics(); drawMovers(r.g, move, 20, 0, false);
  expect(r.calls).toContain('fillCircle');
});
it('MEC-015 §8 cat is a square with ears and chicken a circle with a beak', () => {
  const npc = (variant: 'cat' | 'chicken') => snap({ npc: [{ id: 1, variant, path, cell: { x: 2, y: 1 }, state: 'move', t: 0, warnMs: 0 }] });
  let r = graphics(); drawMovers(r.g, npc('cat'), 20, 0, false);
  expect(r.calls.filter(c => c === 'fillTriangle').length).toBeGreaterThanOrEqual(2);
  expect(r.calls).toContain('fillRect');
  r = graphics(); drawMovers(r.g, npc('chicken'), 20, 0, false);
  expect(r.calls).toContain('fillCircle'); expect(r.calls).toContain('fillTriangle');
});
it('MEC-016 §8 bird draws a shadow ellipse on the target mango', () => {
  const r = graphics();
  drawMovers(r.g, snap({ bird: { x: 4, y: 4, leftMs: 300, shadowMs: 600 } }), 20, 0, false);
  expect(r.calls).toContain('fillEllipse');
});
it('MEC-014 §8 gate open is dashed, warn blinks with a lock, closed is solid; spikes show dots and triangles', () => {
  const gate = (vis: 'down' | 'warn' | 'up') => snap({ gate: [{ id: 1, t: 0, lifeMs: 9000, state: 'live',
    fence: [{ x: 1, y: 1, on: true, ageMs: 0 }], gate: [{ x: 2, y: 1, delay: 0, vis }] }] });
  let r = graphics(); drawCycles(r.g, gate('down'), 20, 0, false);
  expect(r.calls).toContain('lineBetween');
  r = graphics(); drawCycles(r.g, gate('warn'), 20, 0, false);
  expect(r.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(1);
  r = graphics(); drawCycles(r.g, gate('warn'), 20, 250, false);
  expect(r.calls.filter(c => c === 'fillRect')).toHaveLength(1);        // fence post only; bar and lock blink off
  r = graphics(); drawCycles(r.g, gate('up'), 20, 0, false);
  expect(r.calls.filter(c => c === 'fillRect').length).toBeGreaterThan(1);
  const spike = (vis: 'down' | 'warn' | 'up') => snap({ spike: [{ id: 1, t: 0, lifeMs: 9000, ending: false, cells: [{ x: 1, y: 1, delay: 0, vis }] }] });
  r = graphics(); drawCycles(r.g, spike('down'), 20, 0, false);
  expect(r.calls).toContain('fillCircle'); expect(r.calls).not.toContain('fillTriangle');
  r = graphics(); drawCycles(r.g, spike('warn'), 20, 250, false);
  expect(r.calls).toEqual([]);
  r = graphics(); drawCycles(r.g, spike('warn'), 20, 250, true);
  expect(r.calls).toContain('strokeTriangle');
  r = graphics(); drawCycles(r.g, spike('up'), 20, 0, false);
  expect(r.calls).toContain('fillTriangle');
});
it('MEC-017 §8 bomb: warn blinks, count shows circle, digit and dashed outline, active fills the area', () => {
  const area = [{ x: 4, y: 4 }, { x: 5, y: 4 }];
  const bomb = (state: 'warn' | 'count' | 'active', leftMs: number) => snap({ bomb: [{ id: 1, x: 4, y: 4, state, leftMs, area }] });
  let r = graphics(); drawBlasts(r.g, bomb('warn', 500), 20, 250, false);
  expect(r.calls).toEqual([]);
  r = graphics(); drawBlasts(r.g, bomb('warn', 500), 20, 250, true);
  expect(r.calls).toContain('strokeRect');
  r = graphics(); drawBlasts(r.g, bomb('count', 2500), 20, 0, false);
  expect(r.calls).toContain('fillCircle'); expect(r.calls).toContain('lineBetween');
  r = graphics(); drawBlasts(r.g, bomb('active', 90), 20, 0, false);
  expect(r.calls.filter(c => c === 'fillRect')).toHaveLength(2);
});

it('MEC-013..017 §8 banners, death texts and the stolen-mango toast resolve', () => {
  for (const k of ['coconut', 'gate', 'spike', 'npc', 'bird', 'bomb']) expect(t(`banner.new.${k}`)).not.toMatch(/^banner\./);
  for (const c of ['coconut', 'gate', 'spike', 'cat', 'chicken', 'bomb']) expect(t(`death.${c}`)).not.toMatch(/^death\./);
  expect(t('toast.mangoStolen')).toBe('The bird took your mango!');
});
