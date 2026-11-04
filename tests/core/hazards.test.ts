import { instanceFamily } from '../support/instanceFamily';
import { addTimedHazards } from '../../src/core/hazards/timed';
import { describe, expect, it } from 'vitest';
import { makeTimed, updateTimed } from '../../src/core/hazards/timed';
import { ROCK } from '../../src/core/hazards/rock';
import { FENCE } from '../../src/core/hazards/fence';
import { MAZE } from '../../src/core/hazards/maze';
import { spawnCtx } from '../../src/core/hazards/director';
import { cellBfsWall, cellReserved } from '../../src/core/cells';
import { restoreSim } from '../../src/core/sim';
import type { SimEvent, SpawnCtx, StepCtx, TimedPhase } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { fixed } from '../support/rngStub';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
function ctxWithSnake(cells: [number, number][]) {
  const events: SimEvent[] = [];
  const ctx: StepCtx = {
    balance: b, emit: e => events.push(e),
    snakeOn: (x, y) => cells.some(([cx, cy]) => cx === x && cy === y),
  };
  return { ctx, events, cells };
}
const run = (n: number, f: () => unknown) => { for (let i = 0; i < n; i++) f(); };

describe('MEC-004 timed hazards', () => {
  it.each(['warn', 'crumble'] as const)('MEC-004 warning and crumbling hazard cells are passable: %s', phase => {
    const s = buildState(b, { spawnInMs: QUIET });
    const h = makeTimed('rock', [{ x: 9, y: 8 }], 1500, 6000);
    h.state = phase;
    addTimedHazards(s, h);
    const sim = restoreSim(b, s); sim.advance(140);
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
  });

  it.each(['fence', 'maze', 'rock'] as const)('MEC-004 a solid hazard cell kills with its family cause: %s', family => {
    const s = buildState(b, { spawnInMs: QUIET });
    const h = makeTimed(family, [{ x: 9, y: 8 }], 1500, 6000);
    h.state = 'solid'; h.cells[0]!.on = true; addTimedHazards(s, h);
    const sim = restoreSim(b, s); sim.advance(140);
    expect(sim.snapshot().outcome).toEqual({ won: false, cause: family });
  });

  it('MEC-004 cause order: rotten before hazard', () => {
    const s = buildState(b, { spawnInMs: QUIET, rottenRocks: [[9, 8]] });
    const h = makeTimed('rock', [{ x: 9, y: 8 }], 1500, 6000);
    h.state = 'solid'; h.cells[0]!.on = true; addTimedHazards(s, h);
    const sim = restoreSim(b, s); sim.advance(140);
    expect(sim.snapshot().outcome).toEqual({ won: false, cause: 'rotten' });
  });

  it.each(['warn', 'solid', 'crumble'] as TimedPhase[])('MEC-004 hazard cells in any state are reserved and BFS walls: %s', phase => {
    const s = buildState(b);
    const h = makeTimed('rock', [{ x: 2, y: 2 }], 1500, 6000);
    h.state = phase; addTimedHazards(s, h);
    expect(cellReserved(s, 2, 2)).toBe(true);
    expect(cellBfsWall(s, 2, 2)).toBe(true);
    expect(cellReserved(s, 2, 3)).toBe(false);
    expect(cellBfsWall(s, 2, 3)).toBe(false);
  });

  it('MEC-004 hazard life is drawn after a successful placement', () => {
    const a = fixed([0, 1, 2], [], [0.5]);
    expect(instanceFamily(ROCK).spawn({ balance: b, level: 1, cellFree: () => true }, a.rng)?.lifeMs).toBe(8000);
    expect(a.calls).toEqual(['pick(1)', 'int(17)', 'int(17)', 'next']);
    const fail = fixed([]);
    expect(instanceFamily(ROCK).spawn({ balance: b, level: 1, cellFree: () => false }, fail.rng)).toBeNull();
    expect(fail.calls).not.toContain('next');
  });

  it('MEC-004 rock picks the shape once, then 40 tries with origin int(17), int(17)', () => {
    const a = fixed([]);
    expect(instanceFamily(ROCK).spawn({ balance: b, level: 1, cellFree: () => false }, a.rng)).toBeNull();
    expect(a.calls).toEqual(['pick(1)', ...Array<string>(80).fill('int(17)')]);
  });

  it('MEC-004 fence RNG order', () => {
    const a = fixed([0, 3, 2, 0, 1, 2], [false], [0.5]);
    const h = instanceFamily(FENCE).spawn({ balance: b, level: 16, cellFree: () => true }, a.rng);
    expect(a.calls).toEqual(['pick(7)', 'int(5)', 'int(6)', 'int(4)', 'chance(0.5)', 'int(10)', 'int(17)', 'next']);
    expect(h?.kind).toBe('line'); expect(h?.warnMs).toBe(2000); expect(h?.lifeMs).toBe(11000);
    expect(h?.cells).toHaveLength(7);
  });

  it('MEC-004 maze drops non-free cells and needs 6', () => {
    const allowed = [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 }, { x: 12, y: 4 }];
    const ctx: Omit<SpawnCtx, 'candidateValid'> = { balance: b, level: 6, cellFree: (x, y) => allowed.some(c => c.x === x && c.y === y) };
    const five = { ...ctx, cellFree: (x: number, y: number) => ctx.cellFree(x, y) && x !== 12 };
    const a = fixed([]);
    expect(instanceFamily(MAZE).spawn(five, a.rng)).toBeNull(); expect(a.calls).toEqual(['pick(4)']);
    expect(instanceFamily(MAZE).spawn(ctx, fixed([]).rng)?.cells).toHaveLength(6);
    // MEC-004-R10/R11 real board filtering removes near-head and front-lane cells.
    for (const [layout, length] of [20, 23, 11, 26].entries()) {
      const s = buildState(b);
      const cells = MAZE.spawn(s, { ...spawnCtx(s, b), rng: fixed([layout]).rng });
      expect(cells).toHaveLength(length); expect(s.families.maze[0]?.warnMs).toBe(2600);
    }
  });
  it('MEC-004 warn → solid → crumble → removed with exact durations', () => {
    const h = makeTimed('rock', [{ x: 1, y: 1 }], 1500, 6000);
    const { ctx, events } = ctxWithSnake([]);
    run(1499, () => updateTimed(h, ctx)); expect(h.state).toBe('warn');
    updateTimed(h, ctx); expect(h.state).toBe('solid'); expect(h.cells[0]!.on).toBe(true);
    expect(events).toEqual([{ type: 'dust', x: 1, y: 1 }, { type: 'landed', hazardType: 'rock' }]);
    run(5999, () => updateTimed(h, ctx)); expect(h.state).toBe('solid'); expect(h.cells[0]!.ageMs).toBe(6000);
    updateTimed(h, ctx); expect(h.state).toBe('crumble'); expect(h.cells[0]!.on).toBe(false);
    let r: string = 'keep'; run(449, () => { r = updateTimed(h, ctx); }); expect(r).toBe('keep');
    expect(updateTimed(h, ctx)).toBe('remove');
  });

  it('MEC-004 a solid cell never turns on under the snake and lands once the body has passed', () => {
    const h = makeTimed('fence', [{ x: 1, y: 1 }, { x: 2, y: 1 }], 10, 1000, 'line');
    const s = ctxWithSnake([[2, 1]]);
    run(10, () => updateTimed(h, s.ctx));
    expect(h.cells.map(c => c.on)).toEqual([true, false]);
    s.cells.length = 0;
    updateTimed(h, s.ctx);
    expect(h.cells.map(c => c.on)).toEqual([true, true]);
    expect(s.events.filter(e => e.type === 'landed')).toHaveLength(1);
    expect(s.events.filter(e => e.type === 'dust')).toHaveLength(2);
  });
});
