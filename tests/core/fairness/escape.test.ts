import { expect, it } from 'vitest';
import { escapeExists, searchTimeline } from '../../../src/core/fairness/escape';
import { buildTimeline, type Timeline } from '../../../src/core/fairness/timeline';
import { key } from '../../../src/core/grid';
import { addTimedHazards, makeTimed } from '../../../src/core/hazards/timed';
import { ROCK } from '../../../src/core/hazards/rock';
import { FAMILIES, __setFamiliesForTest } from '../../../src/core/hazards/registry';
import type { Dir } from '../../../src/core/types';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { createSim, restoreSim } from '../../../src/core/sim';
import { effectiveTick } from '../../../src/core/skills';
import { buildBoard } from '../../support/board';
import { loadBalance } from '../../support/balance';
import { fakeFamily, withFamilies } from '../../support/fakeFamily';

it('MEC-004-R18 escapeExists is false in a dead-end corridor and true in open board', () => {
  const b = loadBalance();
  expect(escapeExists(b, buildBoard({ head: [8, 8], dir: [1, 0] }))).toBe(true);
  const walls: [number, number][] = [];
  for (let x = 8; x <= 13; x++) walls.push([x, 7], [x, 9]);
  walls.push([13, 8]);
  const trap = buildBoard({ head: [8, 8], body: [[7, 8], [6, 8], [5, 8]], dir: [1, 0], walls });
  expect(escapeExists(b, trap)).toBe(false);
});

it('MEC-004-R18 body cells free up as the tail moves', () => {
  const s = buildBoard({ head: [8, 8], dir: [1, 0],
    body: [[7, 8], [7, 7], [8, 7], [9, 7], [9, 8]], walls: [[8, 9]] });
  expect(escapeExists(loadBalance(), s)).toBe(true);
});

it('MEC-004-R18 ice allows only straight moves', () => {
  const s = buildBoard({ head: [8, 8], dir: [1, 0] });
  for (const blocked of [true, false]) {
    withFamilies(s, [
      { key: 'terrain', tile: { kind: 'ice', cells: [[8, 8], [9, 8], [10, 8]] } },
      { key: 'rock', cause: 'rock', solid: blocked ? [[11, 8]] : [] },
    ], () => expect(escapeExists(loadBalance(), s)).toBe(!blocked));
  }
});

it('MEC-004-R18 timeline sees a warning rock become lethal', () => {
  const b = loadBalance(), s = buildBoard({ level: 21 });
  s.rampActive = false;
  const rock = makeTimed('rock', [{ x: 10, y: 12 }], b.rock.warnMs, b.rock.lifeMs);
  rock.t = rock.warnMs - 900;
  addTimedHazards(s, rock);
  const original = structuredClone(s), tl = buildTimeline(b, s, 40), cell = key(b.board.cols, 10, 12);
  expect(tl.tickMs).toBe(100);
  expect(tl.lethal[8].has(cell)).toBe(false);
  expect(tl.lethal.slice(9).every(cells => cells.has(cell))).toBe(true);
  expect(s).toEqual(original);
});

it('MEC-004-R18 timeline uses the initial slowdown tick while the frozen clone keeps easing', () => {
  const b = loadBalance(), s = buildBoard({ level: 21 });
  s.rampActive = false;
  s.levelUpSlow = { factor: 1.6, easeMs: 1500, leftMs: 1500 };
  const sim = restoreSim(b, s, { directorEnabled: false, freezeSnake: true });
  sim.advance(1000);
  expect(stateOf(sim).snake).toEqual(s.snake);
  expect(stateOf(sim).levelUpSlow?.leftMs).toBe(500);
  expect(stateOf(sim).tickMs).toBeLessThan(effectiveTick(s, b));
  expect(buildTimeline(b, s, 10).tickMs).toBe(160);
});

it('MEC-004-R18 timeline records update-time hits without mutating the source', () => {
  const s = buildBoard({});
  withFamilies(s, [{ key: 'terrain', hit: { kind: 'area', cells: [[10, 10]] } }], () => {
    const tl = buildTimeline(loadBalance(), s, 2);
    expect(tl.lethal.every(cells => cells.has(key(17, 10, 10)))).toBe(true);
  });
});

it('MEC-004-R18 timeline continues past a frozen-head hit at k=2 to an activation at k=5', () => {
  const b = loadBalance(), s = buildBoard({ level: 21 });
  s.rampActive = false;
  const tick = effectiveTick(s, b), previous = FAMILIES;
  const rock = makeTimed('rock', [{ x: 10, y: 12 }], b.rock.warnMs, 2 * tick);
  rock.t = rock.warnMs - 5 * tick;
  addTimedHazards(s, rock);
  __setFamiliesForTest([
    { ...fakeFamily({ key: 'terrain', cause: 'ground' }),
      update(state, ctx) {
        if (state.timeMs === 2 * tick) ctx.hitHead('terrain', state.snake[0]!.x, state.snake[0]!.y, 'area', state.dir);
      },
      headHit: (state, x, y) => state.timeMs === 2 * tick && x === 8 && y === 8 ? 'area' : null,
    },
    ROCK,
  ]);
  try {
    const ordinary = restoreSim(b, s, { directorEnabled: false, freezeSnake: true });
    ordinary.advance(2 * tick);
    expect(ordinary.snapshot().outcome).toEqual({ won: false, cause: 'ground' });
    const moving = restoreSim(b, s, { directorEnabled: false, ignoreOutcomes: true });
    moving.advance(2 * tick);
    expect(moving.snapshot().outcome).toEqual({ won: false, cause: 'ground' });
    const frozen = restoreSim(b, s, { directorEnabled: false, freezeSnake: true, ignoreOutcomes: true });
    frozen.advance(2 * tick);
    const copy = frozen.clone();
    copy.advance(6 * tick);
    expect(copy.snapshot()).toMatchObject({ timeMs: 8 * tick, status: 'playing', outcome: null, snake: s.snake });
    expect(frozen.snapshot().timeMs).toBe(2 * tick);
    const original = structuredClone(s), tl = buildTimeline(b, s, 8), cell = key(b.board.cols, 10, 12);
    expect(tl.lethal[2].has(key(b.board.cols, 8, 8))).toBe(true);
    expect(tl.lethal[4].has(cell)).toBe(false);
    expect(tl.lethal[5].has(cell)).toBe(true);
    expect(tl.lethal[6].has(cell)).toBe(true);
    expect(tl.lethal[7].has(cell)).toBe(false);
    expect(tl.lethal[5].has(key(b.board.cols, 0, 0))).toBe(false);
    expect(s).toEqual(original);
  } finally { __setFamiliesForTest(previous); }
});

it.each([[16, 17], [17, 16], [18, 18]])('MEC-004-R20 escape rejects unsupported board %i x %i', (cols, rows) => {
  const b = loadBalance(j => { j.board = { cols, rows }; }), s = buildBoard({});
  expect(() => escapeExists(b, s)).toThrow(/17.*17/);
  const tl: Timeline = { cols, rows, tickMs: 100, steps: 0, lethal: [new Set()], ice: [new Set()] };
  expect(() => searchTimeline(tl, s)).toThrow(/17.*17/);
});

it.each([[0, 0], [1, 1], [2, 0]])('MEC-004-R18 search rejects non-unit direction (%i,%i)', (x, y) => {
  const s = buildBoard({}), tl = buildTimeline(loadBalance(), s, 1);
  s.dir = { x, y } as Dir;
  expect(() => searchTimeline(tl, s)).toThrow(/unit.*direction/);
});

it('MEC-004-R18 goal-safe first move visits the goal and still reaches the horizon', () => {
  const s = buildBoard({ head: [8, 8], dir: [1, 0] });
  const tl: Timeline = { cols: 17, rows: 17, tickMs: 100, steps: 2,
    lethal: [new Set(), new Set(), new Set([key(17, 10, 8), key(17, 9, 7), key(17, 9, 9)])],
    ice: [new Set(), new Set(), new Set()] };
  expect(searchTimeline(tl, s, { x: 9, y: 8 })).toMatchObject({ reachedHorizon: true, firstMoveToGoalSafe: null });
  expect(searchTimeline(tl, s, { x: 8, y: 7 }).firstMoveToGoalSafe).toEqual({ x: 0, y: -1 });
  expect(searchTimeline(tl, s).firstMoveToHorizon).not.toBeNull();
});

it('MEC-004-R17 internal sim observes spawns, clones options, and restores independent state', () => {
  const b = loadBalance(), observed: string[] = [];
  const sim = createSimInternal(b, 1, {}, { freezeSnake: true,
    observer: { spawned: family => { observed.push(family); } } });
  const clone = sim.clone();
  clone.advance(b.director.firstSpawnMs);
  expect(observed).toEqual(['rock']);
  expect(stateOf(clone).snake).toEqual(b.snake.start.map(([x, y]) => ({ x, y })));
  expect(stateOf(sim).timeMs).toBe(0);
  const disabled = restoreSim(b, stateOf(sim), { directorEnabled: false, freezeSnake: true });
  disabled.advance(b.director.firstSpawnMs + 1);
  expect(disabled.snapshot().hazards).toEqual([]);
  const normal = createSim(b, 1);
  normal.advance(140);
  expect(normal.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
});

it('MEC-004-R17 snapshot projections own all nested values and remain stable while the sim advances', () => {
  const b = loadBalance(), s = buildBoard({ walls: [[10, 12]], mango: [11, 11] });
  s.slowmo = { leftMs: 2000 }; s.levelUpSlow = { factor: 1.4, easeMs: 1000, leftMs: 500 };
  s.shield = { leftMs: 1000 }; s.queue = [{ x: 0, y: 1 }];
  s.orbs = [{ x: 4, y: 4, ageMs: 10 }];
  s.families.rottenRock = [{ family: 'rottenRock', x: 3, y: 3, state: 'solid', leftMs: 1000 }];
  s.families.terrain = [{ family: 'terrain', t: 5, lifeMs: 9000,
    cells: [{ x: 2, y: 2, delay: 0, up: false, vis: 'warn' }] }];
  s.families.snipWall = [{ family: 'snipWall', cells: [{ x: 1, y: 1 }], state: 'solid', leftMs: 1000 }];
  s.families.rubble = [{ family: 'rubble', x: 1, y: 2, state: 'solid', leftMs: 1000 }];
  s.rain = { castId: 1, leftMs: 1000, elapsedMs: 0, drops: 3, dropped: 0 };
  s.rainMangoes = [{ x: 4, y: 3, ageMs: 10, castId: 1 }];
  const sim = restoreSim(b, s), before = structuredClone(stateOf(sim)), snapshot = sim.snapshot();
  const mutate = (value: unknown): void => {
    if (value === null || typeof value !== 'object') return;
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'number') (value as Record<string, unknown>)[k] = v + 1;
      else mutate(v);
    }
  };
  mutate(snapshot);
  expect(stateOf(sim)).toEqual(before);
  const retained = sim.snapshot(), expected = structuredClone(retained);
  sim.advance(1);
  expect(retained).toEqual(expected);
});
