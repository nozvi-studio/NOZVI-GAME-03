import { it, expect } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { loadBalance, soloTable } from '../../support/balance';
import { mud } from '../../../src/core/hazards/mud';
import { newPatch } from '../../../src/core/hazards/blocks/groundTiles';
import { spawnCtx, updateDirector } from '../../../src/core/hazards/director';
import { candidateValid } from '../../../src/core/hazards/placement';
import { startLevelUp } from '../../../src/core/transition';
import { testCtx } from '../../../src/core/testing';
import { effectiveTick } from '../../../src/core/skills';
import { rngFrom } from '../../../src/core/rng';
import type { Rng } from '../../../src/core/rng';
import { placeMango } from '../../../src/core/mango';
import { goodCells } from '../../../src/core/energy';
import { parseBalance } from '../../../src/core/balance';
import { familyRow } from '../../../src/core/level';
import { ROCK } from '../../../src/core/hazards/rock';

function setup(solo = true) {
  const b = solo ? soloTable(loadBalance(), 'mud') : loadBalance();
  const sim = createSimInternal(b, 7, { startLevel: 7 }, { directorEnabled: false });
  const s = stateOf(sim);
  s.rampActive = false;
  s.mango = null;
  s.retryMs = -100000;
  return { b, sim, s };
}
function active(cells = [{ x: 9, y: 8 }, { x: 10, y: 8 }]) {
  const p = newPatch(1, cells, 1500, 9000);
  p.state = 'active'; p.cells.forEach(c => { c.on = true; });
  return p;
}

it('MEC-012-R6 head on active mud doubles the tick: L7 256 ms, with slow-mo 410 ms', () => {
  const { b, sim, s } = setup();
  s.families.mud.patches.push(active());
  sim.advance(128);
  expect(sim.snapshot().headTile).toBe('mud');
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(256);
  s.slowmo = { leftMs: 4000 };
  expect(effectiveTick(s, b)).toBe(410);
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(410);
});

it('MEC-012-R4 mud patches keep their lifecycle through a level up (EC9)', () => {
  const { b, sim, s } = setup();
  const p = active([{ x: 2, y: 2 }]); p.t = 500;
  s.families.mud.patches.push(p);
  startLevelUp(s, b, testCtx(b, s));
  expect(s.level).toBe(8);
  expect(s.families.mud.patches[0]).toMatchObject({ state: 'active', t: 500 });
  sim.advance(100);
  expect(s.families.mud.patches[0]).toMatchObject({ state: 'active', t: 600 });
});

it('MEC-004-R7 mud multiplies the level-up slowdown (FB-1): x1.4 at base 128 gives 358 ms', () => {
  const { sim, s } = setup();
  s.families.mud.patches.push(active());
  sim.advance(128);
  s.levelUpSlow = { factor: 1.4, easeMs: 1000, leftMs: 1001 };
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(358);
  s.slowmo = { leftMs: 4000 };
  sim.advance(1);
  expect(sim.snapshot().tickMs).toBe(410);
});

it('MEC-012-R1 mud spawn picks shape, transforms and tries origins in P0 fence RNG order', () => {
  const { b, s } = setup();
  const calls: string[] = [], ints = [1, 8, 8, 0, 0];
  const rng: Rng = {
    pick<T>(a: readonly T[]): T { calls.push('pick'); return a[0]!; },
    int(n) { calls.push(`int(${n})`); return ints.shift()!; },
    next() { calls.push('next'); return 0.25; },
    chance(p) { calls.push(`chance(${p})`); return this.next() < p; },
  };
  expect(mud.spawn(s, { ...spawnCtx(s, b), rng })).toEqual([{ x: 0, y: 0 }, { x: 0, y: 1 }]);
  expect(calls).toEqual(['pick', 'int(4)', 'chance(0.5)', 'next', 'int(17)', 'int(16)', 'int(17)', 'int(16)', 'next']);
  expect(s.families.mud).toMatchObject({ nextId: 2, patches: [{ id: 1, state: 'warn', t: 0, lifeMs: 9750 }] });
  expect(s.events.at(-1)).toEqual({ type: 'hazardIncoming', family: 'mud' });
});

it('MEC-012-R1 no tile cell spawns near the head or in the front lane', () => {
  const { b, s } = setup();
  for (let seed = 0; seed < 500; seed++) {
    s.rng.s = seed;
    s.families.mud = { patches: [], nextId: 1 };
    const cells = mud.spawn(s, spawnCtx(s, b));
    expect(cells).not.toBeNull();
    for (const c of cells!) {
      expect(Math.abs(c.x - 8) + Math.abs(c.y - 8)).toBeGreaterThanOrEqual(4);
      expect(c.y === 8 && c.x >= 9 && c.x <= 12).toBe(false);
    }
  }
});

it('MEC-012-R1 director emits exactly one mud incoming event and honors the patch cap', () => {
  const { b, s } = setup();
  s.mango = { x: 16, y: 16, golden: false, totalMs: 8000, leftMs: 8000 };
  s.spawnInMs = 1;
  updateDirector(s, b, rngFrom(s.rng));
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'mud' }]);
  s.spawnInMs = 1;
  updateDirector(s, b, rngFrom(s.rng));
  expect(s.families.mud.patches).toHaveLength(2);
  s.spawnInMs = 1;
  updateDirector(s, b, rngFrom(s.rng));
  expect(s.families.mud.patches).toHaveLength(2);
});

it('MEC-012-R3 entering mud or ice never kills and never consumes shield', () => {
  const { sim, s } = setup();
  s.families.mud.patches.push(active()); s.shield = { leftMs: 5000 };
  sim.advance(128 + 256 + 256);
  expect(s.snake[0]).toEqual({ x: 11, y: 8 });
  expect(s.status).toBe('playing'); expect(s.shield).not.toBeNull();
  expect(sim.drainEvents().some(e => e.type === 'shieldBroke' || e.type === 'skillEnded')).toBe(false);
});

it('MEC-012-R5 mango orbs and hazards are never placed on mud', () => {
  const { b, s } = setup();
  const cells = Array.from({ length: b.board.rows * b.board.cols }, (_, i) => ({ x: i % b.board.cols, y: Math.floor(i / b.board.cols) }))
    .filter(c => !(c.x === 0 && c.y === 0));
  for (const phase of ['warn', 'active', 'fade'] as const) {
    const p = active(cells); p.state = phase; s.families.mud.patches = [p]; s.mango = null;
    expect(goodCells(s, b)).toEqual([{ x: 0, y: 0 }]);
    expect(candidateValid(s, b, [{ x: 2, y: 2 }], { nearDist: 4, wallCells: [] })).toBe(false);
    expect(ROCK.spawn(s, spawnCtx(s, b))).toBeNull();
    expect(placeMango(s, b, rngFrom(s.rng))).toBe(true);
    expect(s.mango).toMatchObject({ x: 0, y: 0 });
  }
});

it('MEC-012-R6 leaving mud causes at most one immediate step', () => {
  const { sim, s } = setup();
  s.families.mud.patches.push(active([{ x: 8, y: 8 }]));
  sim.advance(256);
  expect(s.snake[0]).toEqual({ x: 9, y: 8 });
  // Excess accumulation stresses the tick-change clamp when the head leaves mud.
  s.acc = 255;
  sim.advance(1);
  expect(s.snake[0]).toEqual({ x: 10, y: 8 });
  expect(s.acc).toBe(1);
  sim.advance(1);
  expect(s.snake[0]).toEqual({ x: 10, y: 8 });
});

it('MEC-012-R11 mud is introduced at L7 only', () => {
  const { b } = setup(false);
  expect(() => parseBalance(b)).not.toThrow();
  for (let level = 2; level <= 30; level++) {
    const sim = createSimInternal(b, 7, { startLevel: level - 1 }, { directorEnabled: false });
    const s = stateOf(sim), ctx = testCtx(b, s);
    startLevelUp(s, b, ctx);
    const event = ctx.events.find(e => e.type === 'levelUp');
    expect(event?.type === 'levelUp' && event.unlocked === 'mud').toBe(level === 7);
    // P2c: challenge rows (L5 10 15 20 25 30) carry their own weights, so 2 is pinned on non-challenge levels only.
    if (level < 7 || level % 5 !== 0) expect(familyRow(b, level).weights.mud ?? 0).toBe(level >= 7 ? 2 : 0);
  }
});

it('MEC-012-R12 died context is mud for deaths starting on mud', () => {
  const { sim, s } = setup();
  s.families.mud.patches.push(active([{ x: 8, y: 8 }]));
  s.families.rottenRock.push({ family: 'rottenRock', x: 9, y: 8, state: 'solid', leftMs: 5000 });
  sim.advance(256);
  expect(sim.drainEvents()).toContainEqual({ type: 'died', cause: 'rotten', x: 8, y: 8, context: 'mud' });
});

it('MEC-012-R2 snapshot owns tile cells and optional ring through every lifecycle state', () => {
  const { b, sim, s } = setup();
  const p = active([{ x: 2, y: 2 }]); p.ring = [{ x: 2, y: 1 }]; s.families.mud.patches.push(p);
  for (const state of ['warn', 'active', 'fade'] as const) {
    p.state = state; p.t = 12;
    const tile = sim.snapshot().tiles[0]!;
    expect(tile).toMatchObject({ family: 'mud', id: 1, state, leftMs: (state === 'warn' ? p.warnMs : state === 'active' ? p.lifeMs : b.hazard.crumbleMs) - 12, ring: p.ring });
    expect(tile.cells).not.toBe(p.cells); expect(tile.ring).not.toBe(p.ring);
  }
});

it('MEC-012-R1 balance rejects invalid mud timing factor shapes and pool', () => {
  for (const patch of [
    (m: any) => { m.warnMs = 899; }, (m: any) => { m.tickFactor = 1; },
    (m: any) => { m.tries = 0; }, (m: any) => { m.maxActive = 0; },
    (m: any) => { m.shapePool = ['missing']; }, (m: any) => { m.shapes.pair = []; },
    (m: any) => { m.shapes.pair = [[0, 0], [2, 0]]; }, (m: any) => { m.mirrorChance = -1; },
  ]) expect(() => loadBalance(j => patch(j.mud))).toThrow(/mud/);
});

it('MEC-012-R1 mud uses its own configured mirror chance and spawn context RNG', () => {
  const { b, s } = setup(); b.mud.mirrorChance = 0.2;
  const ctx = spawnCtx(s, b), chances: number[] = [];
  expect(ctx.rng).toBeDefined();
  const rng: Rng = { pick: a => a[0]!, int: n => n === 4 ? 0 : 2,
    chance: p => { chances.push(p); return false; }, next: () => 0 };
  expect(mud.spawn(s, { ...ctx, rng })).not.toBeNull();
  expect(chances).toEqual([0.2]);
});
