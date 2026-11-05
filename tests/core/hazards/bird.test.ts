import { it, expect, expectTypeOf } from 'vitest';
// simInternal first: it loads the registry before the bird module (registry <-> family import cycle).
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { bird, birdCanTarget } from '../../../src/core/hazards/bird';
import { newPatch } from '../../../src/core/hazards/blocks/groundTiles';
import { directorOptions, spawnCtx, updateDirector } from '../../../src/core/hazards/director';
import { bfsWall, headHitAt, reservedByFamilies, solidCauseAt } from '../../../src/core/hazards/queries';
import { bfsDistance, pathCost } from '../../../src/core/grid';
import { introducedAt, familyRow, smallHazardCap } from '../../../src/core/level';
import type { BirdView, Cell } from '../../../src/core/types';
import { loadBalance, soloTable } from '../../support/balance';
import { buildBoard } from '../../support/board';
import { fakeFamily } from '../../support/fakeFamily';

type P = [number, number];
const board = (head: P, mango: P, body?: P[]) => {
  const s = buildBoard({ head, mango, level: 22, body });
  s.rampActive = false;
  return s;
};
const fixture = () => {
  const b = soloTable(loadBalance(), 'bird');
  const sim = createSimInternal(b, 22, { startLevel: 22 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.rampActive = false;
  return { b, sim, s };
};

it('MEC-016-R1 bfsDistance and pathCost measure the shortest open path', () => {
  const open = () => false;
  expect(bfsDistance(5, 5, { x: 0, y: 0 }, { x: 3, y: 2 }, open)).toBe(5);
  expect(bfsDistance(5, 5, { x: 0, y: 0 }, { x: 0, y: 0 }, open)).toBe(0);
  const wallCol = (x: number, y: number) => x === 2;
  expect(bfsDistance(5, 5, { x: 0, y: 0 }, { x: 4, y: 0 }, wallCol)).toBeNull();
  // Leaving the slow cell (1,0) costs 3; the detour through row 1 costs 1 per step.
  const cost = (x: number, y: number) => (x === 1 && y === 0 ? 3 : 1);
  expect(pathCost(5, 5, { x: 0, y: 0 }, { x: 2, y: 0 }, open, cost)).toBe(4);
});

it('MEC-016-R1 bird targets only a regular mango reachable in time with enough rot time', () => {
  const b = loadBalance();
  const near = board([8, 8], [12, 8]);
  near.mango!.leftMs = 6000;
  expect(birdCanTarget(near, b)).toBe(true);
  near.mango!.golden = true;
  expect(birdCanTarget(near, b)).toBe(false);
  const lowRot = board([8, 8], [12, 8]);
  lowRot.mango!.leftMs = 2900;
  expect(birdCanTarget(lowRot, b)).toBe(false);
  const far = board([0, 0], [16, 16], [[0, 1], [0, 2], [0, 3]]); // 32 steps x 98 ms + 600 > 3000
  far.mango!.leftMs = 9000;
  expect(birdCanTarget(far, b)).toBe(false);
  const none = board([8, 8], [12, 8]);
  none.mango = null;
  expect(birdCanTarget(none, b)).toBe(false);
  const busy = board([8, 8], [12, 8]);
  busy.mango!.leftMs = 6000;
  busy.families.bird.target = { x: 12, y: 8, leftMs: 100 };
  expect(birdCanTarget(busy, b)).toBe(false);
});

it('MEC-016-R1 the reachable-in-time estimate scales the tick by the mud factor on mud path cells', () => {
  const b = loadBalance();
  const s = board([1, 8], [15, 2], [[1, 9], [1, 10], [1, 11]]); // 20 steps x 98 + 600 = 2560 <= 3000
  s.mango!.leftMs = 9000;
  expect(birdCanTarget(s, b)).toBe(true);
  // Every path crosses columns 3..7, so it leaves at least 5 mud cells: +5 x 98 ms -> 3050 > 3000.
  const cells: Cell[] = [];
  for (let x = 3; x <= 7; x++) for (let y = 0; y < b.board.rows; y++) cells.push({ x, y });
  const p = newPatch(1, cells, b.mud.warnMs, b.mud.lifeMs);
  p.state = 'active'; p.cells.forEach(c => { c.on = true; });
  s.families.mud.patches.push(p);
  expect(birdCanTarget(s, b)).toBe(false);
});

it('MEC-016-R2 rot timer keeps running under the shadow', () => {
  const { b, sim, s } = fixture();
  s.mango!.leftMs = 9000;
  s.families.bird.target = { x: s.mango!.x, y: s.mango!.y, leftMs: b.bird.shadowMs };
  sim.advance(500);
  expect(s.mango!.leftMs).toBe(8500);
  expect(s.families.bird.target!.leftMs).toBe(b.bird.shadowMs - 500);
});

it('MEC-016-R3 an uneaten mango is taken at shadow end: no rock, counters unchanged, new mango placed', () => {
  const { b, sim, s } = fixture();
  const before = { ...s.mango! }, eaten = s.eatenInLevel, run = s.eatenInRun, score = s.score;
  const progress = s.progress, energy = s.energy, rocks = s.families.rottenRock.length;
  s.mango!.leftMs = 9000;
  s.families.bird.target = { x: before.x, y: before.y, leftMs: b.bird.shadowMs };
  sim.advance(b.bird.shadowMs - 1);
  expect(sim.drainEvents().some(e => e.type === 'mangoStolen')).toBe(false);
  sim.advance(1);
  const ev = sim.drainEvents();
  expect(ev.find(e => e.type === 'mangoStolen')).toEqual({ type: 'mangoStolen', x: before.x, y: before.y });
  expect(ev.some(e => e.type === 'rotted')).toBe(false);
  expect([s.eatenInLevel, s.eatenInRun, s.score, s.progress, s.energy]).toEqual([eaten, run, score, progress, energy]);
  expect(s.families.rottenRock.length).toBe(rocks);
  expect(s.mango).not.toBeNull();
  expect(s.mango!.x !== before.x || s.mango!.y !== before.y).toBe(true);
  expect(s.mango!.leftMs).toBe(s.mango!.totalMs - 1); // placed in the hazard step, then one rot ms
  expect(s.families.bird.target).toBeNull();
});

it('MEC-016-R4 eating the target mango cancels the bird', () => {
  const b = soloTable(loadBalance(), 'bird');
  const sim = createSimInternal(b, 22, { startLevel: 22 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false;
  const head = s.snake[0]!;
  s.mango = { x: head.x + s.dir.x, y: head.y + s.dir.y, golden: false, leftMs: 9000, totalMs: 9000 };
  s.families.bird.target = { x: s.mango.x, y: s.mango.y, leftMs: b.bird.shadowMs };
  sim.advance(s.tickMs + 1);
  const ev = sim.drainEvents();
  expect(ev.some(e => e.type === 'ate')).toBe(true);
  expect(ev.some(e => e.type === 'mangoStolen')).toBe(false);
  expect(s.families.bird.target).toBeNull();
  // A rotted or moved mango also clears the target silently.
  const f = fixture();
  f.s.families.bird.target = { x: 0, y: 0, leftMs: 10 };
  f.s.mango = null;
  f.sim.advance(1);
  expect(f.s.families.bird.target).toBeNull();
  expect(f.sim.drainEvents().some(e => e.type === 'mangoStolen')).toBe(false);
});

it('MEC-016-R5 bird never kills and is never solid', () => {
  const { b, sim, s } = fixture();
  s.families.bird.target = { x: s.mango!.x, y: s.mango!.y, leftMs: b.bird.shadowMs };
  for (let y = 0; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
    expect(solidCauseAt(s, x, y)).toBeNull();
    expect(headHitAt(s, x, y)).toBeNull();
    expect(bfsWall(s, x, y)).toBe(false);
    expect(reservedByFamilies(s, x, y)).toBe(false);
  }
  expect(bird.cause).toBeNull();
  sim.advance(b.bird.shadowMs + 10);
  expect(s.status).toBe('playing');
});

it('MEC-016-R6 bird is outside the small cap, max 1', () => {
  const b = loadBalance();
  const s = board([8, 8], [12, 8]);
  s.mango!.leftMs = 6000;
  const full = fakeFamily({ key: 'rock', capClass: 'small', count: smallHazardCap(b, 22) });
  expect(directorOptions(s, b, [full, bird]).map(o => o.family.key)).toEqual(['bird']);
  expect(bird.spawn(s, spawnCtx(s, b))).toEqual([{ x: 12, y: 8 }]);
  expect(s.families.bird.target).toEqual({ x: 12, y: 8, leftMs: b.bird.shadowMs });
  expect(bird.count!(s)).toBe(1);
  expect(directorOptions(s, b, [full, bird])).toEqual([]);
  expect(bird.spawn(s, spawnCtx(s, b))).toBeNull();
});

it('MEC-016-L2 the director emits hazardIncoming for the bird; the family does not', () => {
  const b = soloTable(loadBalance(), 'bird');
  const s = board([8, 8], [12, 8]);
  s.mango!.leftMs = 6000;
  const ctx = spawnCtx(s, b);
  bird.spawn(s, { ...ctx });
  expect(s.events.some(e => e.type === 'hazardIncoming')).toBe(false);
  s.families.bird.target = null;
  s.spawnInMs = 1;
  updateDirector(s, b, ctx.rng);
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'bird' }]);
});

it('MEC-016-R7 bird is introduced at L22 only', () => {
  const b = loadBalance();
  expect(introducedAt(b, 22)).toBe('bird');
  for (let n = 1; n <= 30; n++) expect((familyRow(b, n).weights.bird ?? 0) > 0).toBe(n >= 22);
  expect(familyRow(b, 22).weights.bird).toBe(2);
  expect(familyRow(b, 30).weights.bird).toBe(2);
});

it('MEC-016 snapshot exposes a BirdView copy of the target', () => {
  const { b, sim, s } = fixture();
  expect(sim.snapshot().families.bird).toBeNull();
  s.families.bird.target = { x: 3, y: 4, leftMs: b.bird.shadowMs };
  const view = sim.snapshot().families.bird;
  expectTypeOf(view).toEqualTypeOf<BirdView | null>();
  expect(view).toEqual({ x: 3, y: 4, leftMs: b.bird.shadowMs, shadowMs: b.bird.shadowMs });
  s.families.bird.target.leftMs = 1;
  expect(view!.leftMs).toBe(b.bird.shadowMs);
});

it('MEC-016-L1 the solo director spawns the bird through the observer on a qualifying mango', () => {
  const b = soloTable(loadBalance(), 'bird');
  const spawned: { family: string; ok: boolean }[] = [];
  const sim = createSimInternal(b, 22, { startLevel: 22 }, { freezeSnake: true, observer: {
    spawned(family, _cells, before) { spawned.push({ family, ok: birdCanTarget(before, b) }); },
  } });
  const s = stateOf(sim);
  s.rampActive = false;
  for (let t = 0; t < 60000 && !spawned.length; t += 100) sim.advance(100);
  expect(spawned[0]).toEqual({ family: 'bird', ok: true });
  expect(sim.drainEvents().filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'bird' }]);
});
