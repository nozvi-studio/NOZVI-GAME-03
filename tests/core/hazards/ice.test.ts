import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { ice, iceRing } from '../../../src/core/hazards/ice';
import { newPatch } from '../../../src/core/hazards/blocks/groundTiles';
import { bfsWall, reservedByFamilies, tileAt } from '../../../src/core/hazards/queries';
import { spawnCtx, updateDirector } from '../../../src/core/hazards/director';
import { candidateValid } from '../../../src/core/hazards/placement';
import { startLevelUp } from '../../../src/core/transition';
import { testCtx } from '../../../src/core/testing';
import { stepSnake } from '../../../src/core/snake';
import { effectiveTick } from '../../../src/core/skills';
import { familyRow } from '../../../src/core/level';
import { rngFrom, type Rng } from '../../../src/core/rng';
import { loadBalance, soloTable } from '../../support/balance';

function setup(solo = true) {
  const b = solo ? soloTable(loadBalance(), 'ice') : loadBalance();
  const sim = createSimInternal(b, 13, { startLevel: 13 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false; s.mango = null; s.retryMs = -100000;
  s.tickMs = effectiveTick(s, b);
  return { b, sim, s };
}
function active(cells = [9, 10, 11].map(x => ({ x, y: 8 }))) {
  const p = newPatch(1, cells, 1500, 10000, iceRing(cells));
  p.state = 'active'; p.cells.forEach(c => { c.on = true; });
  return p;
}

it('MEC-012-R9 turns queued on ice are applied on the first step off the ice', () => {
  const { sim, s } = setup();
  s.families.ice.patches.push(active());
  const tick = sim.snapshot().tickMs;
  sim.advance(tick);
  expect(sim.snapshot().headTile).toBe('ice');
  sim.turn(0, -1);
  sim.advance(tick * 3);
  expect(sim.snapshot().snake[0]).toEqual({ x: 12, y: 8 });
  expect(s.queue).toEqual([{ x: 0, y: -1 }]);
  sim.advance(tick);
  expect(sim.snapshot().snake[0]).toEqual({ x: 12, y: 7 });
});

it('MEC-012-R7 ring of a 2-cell line has 6 cells', () => {
  expect(iceRing([{ x: 5, y: 5 }, { x: 6, y: 5 }])).toEqual([
    { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 4, y: 5 }, { x: 7, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 },
  ]);
  const square = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }];
  expect(iceRing(square)).toHaveLength(8);
  expect(iceRing([...square, square[0]!].reverse())).toEqual(iceRing(square));
});

it('MEC-012-R7 ice candidate touching the edge or a reserved ring cell is rejected', () => {
  const { b, s } = setup();
  const valid = (cells: { x: number; y: number }[]) => candidateValid(s, b, cells,
    { nearDist: b.fairness.nearHeadDist, wallCells: cells, extraFree: iceRing(cells) });
  expect(valid([{ x: 0, y: 2 }, { x: 1, y: 2 }])).toBe(false);
  const cells = [{ x: 3, y: 3 }, { x: 4, y: 3 }];
  expect(valid(cells)).toBe(true);
  s.mango = { x: 3, y: 2, golden: false, totalMs: 8000, leftMs: 8000 };
  expect(valid(cells)).toBe(false);
  // Exercise the family itself: every origin draw repeats this blocked candidate.
  const rng: Rng = { pick: a => a[0]!, int: n => n === 4 ? 0 : 3, chance: () => false, next: () => 0 };
  expect(ice.spawn(s, { ...spawnCtx(s, b), rng })).toBeNull();
  expect(s.families.ice.patches).toEqual([]);
});

it('MEC-012-R8 ice cells are BFS walls and ring cells are reserved', () => {
  const { sim, s } = setup();
  const p = active(); s.families.ice.patches.push(p);
  for (const state of ['warn', 'active', 'fade'] as const) {
    p.state = state;
    expect(bfsWall(s, 10, 8)).toBe(true);
    expect(reservedByFamilies(s, 10, 8)).toBe(true);
    expect(reservedByFamilies(s, 10, 7)).toBe(true);
    expect(bfsWall(s, 10, 7)).toBe(false);
    expect(tileAt(s, 10, 8)).toBe(state === 'active' ? 'ice' : null);
    const snap = sim.snapshot().tiles[0]!;
    expect(snap.family).toBe('ice'); expect(snap.ring).toEqual(p.ring);
    expect(snap.ring).not.toBe(p.ring); expect(snap.cells).not.toBe(p.cells);
  }
});

it('MEC-012-R9 head on warning ice can turn', () => {
  const { sim, s } = setup();
  const p = active([{ x: 8, y: 8 }]); p.state = 'warn'; p.cells[0]!.on = false;
  s.families.ice.patches.push(p);
  sim.turn(0, -1); sim.advance(sim.snapshot().tickMs);
  expect(s.snake[0]).toEqual({ x: 8, y: 7 });
  expect(s.queue).toEqual([]);
});

it('MEC-012-R11 ice is introduced at L13 only', () => {
  const { b } = setup(false);
  for (let level = 2; level <= 30; level++) {
    const sim = createSimInternal(b, 13, { startLevel: level - 1 }, { directorEnabled: false });
    const s = stateOf(sim), ctx = testCtx(b, s);
    startLevelUp(s, b, ctx);
    const event = ctx.events.find(e => e.type === 'levelUp');
    expect(event?.type === 'levelUp' && event.unlocked === 'ice').toBe(level === 13);
    // P2c: challenge rows (L5 10 15 20 25 30) carry their own weights, so 2 is pinned on non-challenge levels only.
    if (level < 13 || level % 5 !== 0) expect(familyRow(b, level).weights.ice ?? 0).toBe(level >= 13 ? 2 : 0);
  }
});

it('MEC-012-R4 an ice slide continues through a level up (EC9)', () => {
  const { b, sim, s } = setup();
  const p = active([8, 9, 10].map(x => ({ x, y: 8 })));
  s.families.ice.patches.push(p); sim.turn(0, -1);
  const before = structuredClone(p), head = { ...s.snake[0]! };
  s.snake.push({ x: 4, y: 8 }, { x: 3, y: 8 });
  startLevelUp(s, b, testCtx(b, s));
  expect(s.snake[0]).toEqual(head); expect(s.snake).toHaveLength(b.snake.start.length);
  expect(s.families.ice.patches[0]).toEqual(before);
  // Advance actual movement steps through the changing level-up slowdown tick.
  const nextStep = () => { const h = s.snake[0]; do { sim.advance(1); } while (s.snake[0] === h && s.status === 'playing'); };
  nextStep(); expect(s.snake[0]).toEqual({ x: 9, y: 8 });
  nextStep(); nextStep(); expect(s.snake[0]).toEqual({ x: 11, y: 8 });
  nextStep(); expect(s.snake[0]).toEqual({ x: 11, y: 7 });
});

it('MEC-012-R12 died context is ice for deaths starting on ice', () => {
  const { b, sim, s } = setup();
  s.families.ice.patches.push(active([{ x: 8, y: 8 }]));
  s.snake = [{ x: 8, y: 8 }, { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 8 }, { x: 10, y: 8 }];
  sim.turn(0, -1);
  stepSnake(s, b, rngFrom(s.rng));
  expect(s.status).toBe('over');
  expect(sim.drainEvents()).toContainEqual({ type: 'died', cause: 'self', x: 8, y: 8, context: 'ice' });
});

it('MEC-012-R1 ice spawn uses configured mirror chance and emits exactly one incoming event', () => {
  const { b, s } = setup();
  b.ice.mirrorChance = 0.2;
  const calls: string[] = [], ints = [1, 0, 0, 2, 2];
  const rng: Rng = { pick: a => { calls.push('pick'); return a[0]!; },
    int: n => { calls.push(`int(${n})`); return ints.shift()!; },
    chance: p => { calls.push(`chance(${p})`); return false; }, next: () => { calls.push('next'); return 0.25; } };
  const cells = ice.spawn(s, { ...spawnCtx(s, b), rng });
  expect(cells).toEqual([{ x: 2, y: 2 }, { x: 2, y: 3 }]);
  expect(calls).toEqual(['pick', 'int(4)', 'chance(0.2)', 'int(17)', 'int(16)', 'int(17)', 'int(16)', 'next']);
  expect(s.families.ice.patches[0]).toMatchObject({ state: 'warn', lifeMs: 11000, ring: iceRing(cells!) });
  s.families.ice.patches = []; s.events = [];
  s.mango = { x: 16, y: 16, golden: false, totalMs: 8000, leftMs: 8000 };
  s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'ice' }]);
  s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  expect(s.families.ice.patches).toHaveLength(2);
});

it('MEC-012-R1 balance rejects invalid ice timing shapes pool and mirror probabilities', () => {
  for (const patch of [
    (m: any) => { m.warnMs = 899; }, (m: any) => { m.tries = 0; }, (m: any) => { m.maxActive = 0; },
    (m: any) => { m.shapePool = ['missing']; }, (m: any) => { m.shapes.line2 = []; },
    (m: any) => { m.shapes.line2 = [[0, 0], [2, 0]]; }, (m: any) => { m.mirrorChance = 2; },
  ]) expect(() => loadBalance(j => patch(j.ice))).toThrow(/ice/);
});

it('MEC-012-R3 entering ice never kills or consumes Shield', () => {
  const { sim, s } = setup(); s.families.ice.patches.push(active()); s.shield = { leftMs: 5000 };
  sim.advance(sim.snapshot().tickMs * 4);
  expect(s.snake[0]).toEqual({ x: 12, y: 8 }); expect(s.status).toBe('playing'); expect(s.shield).not.toBeNull();
  expect(sim.drainEvents().some(e => e.type === 'shieldBroke')).toBe(false);
});
