import { instanceFamily } from '../support/instanceFamily';
import { describe, expect, it } from 'vitest';
import { cellBfsWall, cellReserved } from '../../src/core/cells';
import { TERRAIN, terrainWant } from '../../src/core/hazards/terrain';
import { restoreSim } from '../../src/core/sim';
import type { StepCtx, TerrainHazard } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { fixed } from '../support/rngStub';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
const terrain = (lifeMs = 18000): TerrainHazard => ({
  family: 'terrain', t: 0, lifeMs, cells: [{ x: 9, y: 8, delay: 0, up: false, vis: 'down' }],
});
function ctxWithSnake(cells: [number, number][]) {
  const ctx: StepCtx = { balance: b, emit: () => {}, snakeOn: (x, y) => cells.some(([cx, cy]) => cx === x && cy === y) };
  return { ctx, cells };
}
const run = (n: number, f: () => unknown) => { for (let i = 0; i < n; i++) f(); };

describe('MEC-004 terrain', () => {
  it('MEC-004 terrain cycle: start delay 600, then down 1100 → warn 900 → up 1400', () => {
    const T = terrain(), { ctx } = ctxWithSnake([]);
    run(1699, () => instanceFamily(TERRAIN).update(T, ctx)); expect(T.cells[0]!.vis).toBe('down');
    instanceFamily(TERRAIN).update(T, ctx); expect(T.cells[0]!.vis).toBe('warn');
    run(899, () => instanceFamily(TERRAIN).update(T, ctx)); expect(T.cells[0]!.vis).toBe('warn');
    instanceFamily(TERRAIN).update(T, ctx); expect(T.cells[0]!.vis).toBe('up'); expect(T.cells[0]!.up).toBe(true);
    run(1399, () => instanceFamily(TERRAIN).update(T, ctx)); expect(T.cells[0]!.vis).toBe('up');
    instanceFamily(TERRAIN).update(T, ctx); expect(T.cells[0]!.vis).toBe('down'); expect(T.cells[0]!.up).toBe(false);
    T.t = 2600;
    expect(terrainWant(T, { ...T.cells[0]!, delay: 260 }, b)).toBe('warn');
  });

  it('MEC-004 terrain waits for the snake', () => {
    const T = terrain(), s = ctxWithSnake([[9, 8]]);
    run(2600, () => instanceFamily(TERRAIN).update(T, s.ctx));
    expect(T.cells[0]!.vis).toBe('warn'); expect(T.cells[0]!.up).toBe(false);
    s.cells.length = 0; instanceFamily(TERRAIN).update(T, s.ctx);
    expect(T.cells[0]!.vis).toBe('up'); expect(T.cells[0]!.up).toBe(true);
  });

  it('MEC-004 terrain goes down after life and is removed 500 ms later', () => {
    const T = terrain(3000), { ctx } = ctxWithSnake([]);
    run(2999, () => instanceFamily(TERRAIN).update(T, ctx)); expect(T.cells[0]!.up).toBe(true);
    expect(instanceFamily(TERRAIN).update(T, ctx)).toBe('keep'); expect(T.cells[0]!.vis).toBe('down');
    expect(T.cells[0]!.up).toBe(false);
    run(499, () => instanceFamily(TERRAIN).update(T, ctx));
    expect(instanceFamily(TERRAIN).update(T, ctx)).toBe('remove'); expect(T.t).toBe(3500);
  });

  it.each(['down', 'warn', 'up'] as const)('MEC-004 non-up terrain is passable and up terrain kills with cause ground: %s', vis => {
    const s = buildState(b, { spawnInMs: QUIET }), T = terrain();
    T.t = vis === 'down' ? 0 : vis === 'warn' ? 1700 : 2600;
    T.cells[0]!.vis = vis; T.cells[0]!.up = vis === 'up'; s.families.terrain.push(T);
    const sim = restoreSim(b, s); sim.advance(140);
    if (vis === 'up') expect(sim.snapshot().outcome).toEqual({ won: false, cause: 'ground' });
    else {
      expect(sim.snapshot().status).toBe('playing');
      expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
    }
  });

  it('MEC-004 terrain is never a BFS wall', () => {
    const s = buildState(b), T = terrain(); s.families.terrain.push(T);
    for (const up of [false, true]) {
      T.cells[0]!.up = up;
      expect(instanceFamily(TERRAIN).bfsWallAt(T, 9, 8)).toBe(false);
      expect(instanceFamily(TERRAIN).reservedAt(T, 9, 8)).toBe(true);
      expect(cellBfsWall(s, 9, 8)).toBe(false); expect(cellReserved(s, 9, 8)).toBe(true);
    }
  });

  it('MEC-004 terrain spawn RNG order (wave)', () => {
    const a = fixed([0, 1, 2], [true, true], [0.5]);
    const h = instanceFamily(TERRAIN).spawn({ balance: b, level: 4, cellFree: () => true }, a.rng);
    expect(a.calls).toEqual(['chance(0.5)', 'chance(0.5)', 'int(3)', 'int(12)', 'int(16)', 'next']);
    expect(h?.cells).toHaveLength(12); expect(h?.lifeMs).toBe(21000);
    expect(h?.cells.map(c => [c.x, c.y, c.delay])).toEqual([
      [1, 2, 0], [1, 3, 0], [2, 2, 260], [2, 3, 260], [3, 2, 520], [3, 3, 520],
      [4, 2, 780], [4, 3, 780], [5, 2, 1040], [5, 3, 1040], [6, 2, 1300], [6, 3, 1300],
    ]);
  });

  it('MEC-004 terrain spawn (checker)', () => {
    const a = fixed([1, 2], [false]), distances: (number | undefined)[] = [];
    const h = instanceFamily(TERRAIN).spawn({ balance: b, level: 4, cellFree: (_x, _y, d) => { distances.push(d); return true; } }, a.rng);
    expect(a.calls).toEqual(['chance(0.5)', 'int(14)', 'int(14)', 'next']);
    expect(h?.cells).toHaveLength(16); expect(distances).toEqual(Array<number>(16).fill(4));
    expect(h?.cells.map(c => c.delay)).toEqual([0, 1700, 0, 1700, 1700, 0, 1700, 0, 0, 1700, 0, 1700, 1700, 0, 1700, 0]);
    expect(h?.cells[0]).toMatchObject({ x: 1, y: 2, up: false, vis: 'down' });
  });
});
