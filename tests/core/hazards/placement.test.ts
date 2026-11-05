import { expect, it } from 'vitest';
import { candidateValid, keepsMangoReachable, reachableFrom } from '../../../src/core/hazards/placement';
import { key } from '../../../src/core/grid';
import { spawnCtx } from '../../../src/core/hazards/director';
import { ROCK } from '../../../src/core/hazards/rock';
import { FENCE } from '../../../src/core/hazards/fence';
import { MAZE } from '../../../src/core/hazards/maze';
import { fixed } from '../../support/rngStub';
import { buildBoard } from '../../support/board';
import { loadBalance } from '../../support/balance';
import { withFamilies } from '../../support/fakeFamily';

const b = loadBalance();

it('MEC-004-R12 a fence that would cut off the mango is rejected', () => {
  const s = buildBoard({ head: [2, 8], dir: [0, -1], mango: [14, 8] });
  const wall = Array.from({ length: 17 }, (_, y) => ({ x: 10, y }));
  expect(keepsMangoReachable(s, b, wall)).toBe(false);
  expect(candidateValid(s, b, wall, { nearDist: 4, wallCells: wall })).toBe(false);
  expect(candidateValid(s, b, wall, { nearDist: 4, wallCells: [] })).toBe(true); // Terrain adds no BFS walls.
  const gapped = wall.filter(c => c.y !== 3);
  expect(candidateValid(s, b, gapped, { nearDist: 4, wallCells: gapped })).toBe(true);
});

it('MEC-004-R12 spawns are not blocked when the mango was already unreachable', () => {
  const s = buildBoard({ head: [2, 8], dir: [0, -1], mango: [16, 16], walls: [[15, 16], [16, 15]] });
  expect(keepsMangoReachable(s, b, [{ x: 8, y: 0 }])).toBe(true);
});

it('MEC-004-R12 no mango imposes no reachability constraint', () => {
  const s = buildBoard({}); s.mango = null;
  expect(keepsMangoReachable(s, b, [{ x: 0, y: 0 }])).toBe(true);
});

it('MEC-004-R4 reachableFrom uses family BFS walls, body without tail, and extra walls', () => {
  const s = buildBoard({ head: [2, 8], body: [[2, 9], [2, 10], [2, 11]], walls: [[10, 0]] });
  const seen = reachableFrom(s, b, new Set([key(17, 11, 0)]));
  for (const [x, y] of [[2, 9], [2, 10], [10, 0], [11, 0]]) expect(seen.has(key(17, x!, y!))).toBe(false);
  expect(seen.has(key(17, 2, 11))).toBe(true);
});

it('MEC-004-R11 no new cell near the head or in the front lane', () => {
  const s = buildBoard({ head: [8, 8], dir: [1, 0] });
  for (const cell of [{ x: 9, y: 9 }, { x: 12, y: 8 }]) {
    expect(candidateValid(s, b, [cell], { nearDist: 4, wallCells: [] })).toBe(false);
    expect(candidateValid(s, b, [cell], { nearDist: 4, wallCells: [], exemptNearHead: true })).toBe(true);
  }
  expect(candidateValid(s, b, [{ x: 8, y: 13 }], { nearDist: 4, wallCells: [] })).toBe(true);
});

it('MEC-004-R10 candidate cells and extraFree must be in bounds and unreserved', () => {
  const s = buildBoard({ mango: [16, 16] }), cell = { x: 0, y: 0 };
  s.orbs.push({ x: 1, y: 0, ageMs: 0 });
  s.rainMangoes.push({ x: 2, y: 0, ageMs: 0, castId: 1 });
  withFamilies(s, [{ key: 'rubble', reserved: [[3, 0]] }], () => {
    for (const blocked of [{ x: -1, y: 0 }, { x: 0, y: 17 }, { x: 16, y: 16 },
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, s.snake[0]!]) {
      expect(candidateValid(s, b, [blocked], { nearDist: 4, wallCells: [], exemptNearHead: true })).toBe(false);
      expect(candidateValid(s, b, [cell], { nearDist: 4, wallCells: [], extraFree: [blocked] })).toBe(false);
    }
  });
  // Helper cells need no near-head exemption; they are not the spawned cells.
  expect(candidateValid(s, b, [cell], { nearDist: 4, wallCells: [], extraFree: [{ x: 9, y: 9 }] })).toBe(true);
});

it('MEC-004-R10 spawn returns null and changes nothing when no candidate is valid', () => {
  const s = buildBoard({ mango: [16, 16] });
  const all: [number, number][] = Array.from({ length: 289 }, (_, i) => [i % 17, Math.floor(i / 17)]);
  const before = structuredClone(s);
  withFamilies(s, [{ key: 'rubble', reserved: all }], () => {
    expect(ROCK.spawn(s, spawnCtx(s, b))).toBeNull();
  });
  expect(s.rng).not.toEqual(before.rng);
  expect(JSON.stringify({ ...s, rng: before.rng })).toBe(JSON.stringify(before));
});

it.each([ROCK, FENCE, MAZE])('MEC-004-R12 $key rejects a candidate closing the last mango route', family => {
  const balance = loadBalance(j => {
    j.rock.tries = 1; j.fence.tries = 1;
    j.fence.shapes.L = [[0, 0]];
    j.maze.minCells = 1; j.maze.layouts = [{ segments: [[10, 0, 10, 16]], exclude: [] }];
  });
  const walls: [number, number][] = Array.from({ length: 16 }, (_, i) => [10, i + 1]);
  const s = buildBoard({ head: [2, 8], dir: [0, -1], mango: [14, 8], walls, level: 7 });
  const before = structuredClone(s);
  const ints = family.key === 'rock' ? [0, 10, 0] : family.key === 'fence' ? [1, 0, 10, 0] : [0];
  expect(family.spawn(s, { ...spawnCtx(s, balance), rng: fixed(ints).rng })).toBeNull();
  expect(s).toEqual(before);
});
