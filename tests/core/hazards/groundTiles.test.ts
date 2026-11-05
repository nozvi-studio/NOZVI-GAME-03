import { it, expect } from 'vitest';
import { newPatch, stepPatch, scaleTick, patchCellOn, patchHas } from '../../../src/core/hazards/blocks/groundTiles';
import { createSim } from '../../../src/core/sim';
import { loadBalance } from '../../support/balance';

it('MEC-004-R5 GroundTiles cell under the snake stays warn until the snake leaves', () => {
  const p = newPatch(1, [{ x: 3, y: 3 }, { x: 4, y: 3 }], 1500, 9000);
  let under = true;
  const snakeOn = (x: number, y: number) => under && x === 3 && y === 3;
  for (let i = 0; i < 1500; i++) stepPatch(p, 450, snakeOn);
  stepPatch(p, 450, snakeOn);
  expect(p.state).toBe('active');
  expect(p.cells.map(c => c.on)).toEqual([false, true]);
  under = false;
  stepPatch(p, 450, snakeOn);
  expect(p.cells[0]!.on).toBe(true);
  under = true;
  stepPatch(p, 450, snakeOn);
  expect(p.cells[0]!.on).toBe(true);
});

it('MEC-004-R7 effective tick on mud with slow-mo at base 128 is 410', () => {
  expect(scaleTick(128, 1.6, 2)).toBe(410);
  expect(scaleTick(128, 1, 2)).toBe(256);
  expect(scaleTick(140, 1.6, 1)).toBe(224);
  expect(scaleTick(128, 1.4, 2)).toBe(358); // FB-1: level-up slowdown start on mud.
  expect(scaleTick(128, 1, 1)).toBe(128);
});

it('MEC-012-R2 tile patch warns 1500 ms, is active for its life, fades 450 ms, then is removed', () => {
  const p = newPatch(1, [{ x: 3, y: 3 }], 1500, 9000);
  const advance = (ms: number) => {
    for (let i = 0; i < ms; i++) expect(stepPatch(p, 450, () => false)).toBe(true);
  };
  expect(patchHas(p, 3, 3)).toBe(true);
  expect(patchHas(p, 4, 3)).toBe(false);
  expect(patchCellOn(p, 3, 3)).toBe(false);
  advance(1499);
  expect(p.state).toBe('warn');
  expect(p.t).toBe(1499);
  advance(1);
  expect(p.state).toBe('active');
  expect(p.t).toBe(0);
  expect(patchCellOn(p, 3, 3)).toBe(true);
  expect(patchCellOn(p, 4, 3)).toBe(false);
  advance(8999);
  expect(p.state).toBe('active');
  advance(1);
  expect(p.state).toBe('fade');
  expect(p.t).toBe(0);
  expect(p.cells[0]!.on).toBe(false);
  expect(patchCellOn(p, 3, 3)).toBe(false);
  expect(patchHas(p, 3, 3)).toBe(true);
  advance(449);
  expect(p.state).toBe('fade');
  expect(stepPatch(p, 450, () => false)).toBe(false);
});

it('MEC-012-R2 new patches own their cells and optional ice ring', () => {
  const cells = [{ x: 3, y: 3 }];
  const ring = [{ x: 2, y: 3 }];
  const p = newPatch(7, cells, 1500, 9000, ring);
  cells[0]!.x = 0;
  ring[0]!.x = 0;
  expect(p).toEqual({ id: 7, state: 'warn', t: 0, warnMs: 1500, lifeMs: 9000,
    cells: [{ x: 3, y: 3, on: false }], ring: [{ x: 2, y: 3 }] });
  expect(newPatch(8, [], 1500, 9000)).not.toHaveProperty('ring');
});

it('MEC-012 section 7 snapshots expose tiles and the head tile before tile families register', () => {
  const sim = createSim(loadBalance(), 1);
  expect(sim.snapshot()).toMatchObject({ tiles: [], headTile: null });
});
