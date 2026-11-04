import { addTimedHazards, replaceTimedHazards, timedHazards } from '../../src/core/hazards/timed';
import { describe, expect, it } from 'vitest';
import { pickWeighted, spawnCtx, updateDirector } from '../../src/core/hazards/director';
import { makeTimed } from '../../src/core/hazards/timed';
import { nearHead } from '../../src/core/grid';
import { rngFrom, seedRng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { FamilyKey, SimState, TerrainHazard } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { fixed } from '../support/rngStub';
import { buildState } from '../support/state';

const b = loadBalance();
function due(level: number): SimState { return buildState(b, { level, spawnInMs: 1, mango: [9, 8] }); }
function terrain(): TerrainHazard {
  return { family: 'terrain', t: 0, lifeMs: 18000, cells: [{ x: 16, y: 16, delay: 0, up: false, vis: 'down' }] };
}
function smallCap(s: SimState): void {
  for (let i = 0; i < 10; i++) addTimedHazards(s, makeTimed('rock', [{ x: 16, y: i }], 1500, 6000));
}
function selected(level: number, roll: number): FamilyKey | undefined {
  const s = due(level);
  updateDirector(s, b, fixed([], [], [roll]).rng);
  return s.families.terrain[0]?.family ?? timedHazards(s)[0]?.family;
}

describe('MEC-004 director', () => {
  it('MEC-004 pickWeighted follows the prototype loop (L550–551)', () => {
    expect(pickWeighted([3, 2], fixed([], [], [0]).rng)).toBe(0);
    expect(pickWeighted([3, 2], fixed([], [], [0.6]).rng)).toBe(0);
    expect(pickWeighted([3, 2], fixed([], [], [0.61]).rng)).toBe(1);
  });
  it('MEC-004 first spawn after 2500 ms, then max(1600, 5000 - 120 * level)', () => {
    const s0 = buildState(b, { spawnInMs: 2500, mango: [0, 0] });
    // Hold the snake tick accumulator so the fixture survives until the director fires.
    s0.acc = -20000;
    const sim = restoreSim(b, s0), s = stateOf(sim);
    sim.advance(2499); expect(timedHazards(s)).toHaveLength(0);
    sim.advance(1); expect(timedHazards(s)).toHaveLength(1); expect(s.spawnInMs).toBe(4880);
    sim.advance(4879); expect(timedHazards(s)).toHaveLength(1);
    sim.advance(1); expect(timedHazards(s)).toHaveLength(2);
    const late = due(30); updateDirector(late, b, fixed([]).rng); expect(late.spawnInMs).toBe(1600);
  });
  it.each(['warn', 'solid', 'crumble'] as const)('MEC-004 cap counts non-maze hazards in any state: %s', phase => {
    const s = due(1);
    for (let x = 0; x < 2; x++) {
      const h = makeTimed('rock', [{ x, y: 0 }], 1500, 6000); h.state = phase; addTimedHazards(s, h);
    }
    const a = fixed([]); updateDirector(s, b, a.rng);
    expect(timedHazards(s)).toHaveLength(2); expect(a.calls).toEqual([]);
    const mazeOnly = due(1); addTimedHazards(mazeOnly, makeTimed('maze', [{ x: 16, y: 16 }], 2600, 14000));
    updateDirector(mazeOnly, b, fixed([]).rng);
    expect(timedHazards(mazeOnly).map(h => h.family)).toEqual(['maze', 'rock']);
  });
  it('MEC-004 unlocks: fence from 6, terrain from 11, maze from 26', () => {
    // Probe each weighted interval with real family spawns; no family stubs.
    expect([0, 0.6, 0.99].map(r => selected(1, r))).toEqual(['rock', 'rock', 'rock']);
    expect([0, 0.61, 0.99].map(r => selected(6, r))).toEqual(['rock', 'fence', 'fence']);
    expect([0, 0.5, 0.99].map(r => selected(11, r))).toEqual(['rock', 'fence', 'terrain']);
    expect([0, 0.4, 0.7, 0.99].map(r => selected(26, r))).toEqual(['rock', 'fence', 'terrain', 'maze']);
  });
  it('MEC-004 maze and terrain never overlap; maze cooldown 26000', () => {
    const maze = due(26); smallCap(maze);
    addTimedHazards(maze, makeTimed('maze', [{ x: 15, y: 15 }], 2600, 14000));
    const a = fixed([]); updateDirector(maze, b, a.rng); expect(a.calls).toEqual([]); expect(maze.families.terrain).toEqual([]);
    const ground = due(26); smallCap(ground); ground.families.terrain.push(terrain());
    const c = fixed([]); updateDirector(ground, b, c.rng); expect(c.calls).toEqual([]);
    expect(timedHazards(ground).some(h => h.family === 'maze')).toBe(false);
    const s = due(26); updateDirector(s, b, fixed([], [], [0.99]).rng);
    expect(timedHazards(s)[0]?.family).toBe('maze'); expect(s.mazeCooldownMs).toBe(26000);
    replaceTimedHazards(s, []); s.families.terrain = []; s.spawnInMs = 1;
    updateDirector(s, b, fixed([], [], [0.99]).rng);
    expect(s.families.terrain).toHaveLength(1); expect(s.mazeCooldownMs).toBe(25999);
    replaceTimedHazards(s, []); s.families.terrain = []; s.spawnInMs = 1; s.mazeCooldownMs = 1;
    updateDirector(s, b, fixed([], [], [0.99]).rng);
    expect(timedHazards(s)[0]?.family).toBe('maze'); expect(s.mazeCooldownMs).toBe(26000);
  });
  it('MEC-004 MEC-003-R15 terrain max active is 1 at every enabled level', () => {
    for (const [level, count, want] of [[11, 1, 1], [16, 1, 1], [30, 1, 1]]) {
      const s = due(level); smallCap(s); s.mazeCooldownMs = 1000;
      for (let i = 0; i < count; i++) s.families.terrain.push(terrain());
      updateDirector(s, b, fixed([]).rng); expect(s.families.terrain).toHaveLength(want);
    }
  });
  it('MEC-004 a failed option is removed and the pick is redone with a new next()', () => {
    const s = due(7);
    for (let x = 0; x < 17; x++) for (let y = 0; y < 17; y++)
      if (x !== 9 || y !== 8) s.families.rottenRock.push({ family: 'rottenRock', x, y, state: 'solid', leftMs: b.mango.rottenRockLifeMs });
    const a = fixed([]); updateDirector(s, b, a.rng);
    expect(timedHazards(s)).toEqual([]); expect(a.calls.filter(c => c === 'next')).toHaveLength(2);
    expect(a.calls.filter(c => c.startsWith('pick'))).toEqual(['pick(5)', 'pick(2)']);
  });
  it('MEC-004 hazardIncoming is emitted for fence, maze and terrain, not rock', () => {
    for (const [roll, family] of [[0, 'rock'], [0.4, 'fence'], [0.7, 'terrain'], [0.99, 'maze']] as const) {
      const s = due(26); updateDirector(s, b, fixed([], [], [roll]).rng);
      expect(s.events).toEqual(family === 'rock' ? [] : [{ type: 'hazardIncoming', family }]);
    }
  });
  it('MEC-004 new hazard cells are never near the head', () => {
    const rng = rngFrom(seedRng(42));
    for (let i = 0; i < 200; i++) {
      const s = due(1 + i % 30); updateDirector(s, b, rng);
      expect(timedHazards(s).length + s.families.terrain.length).toBe(1);
      for (const h of [...timedHazards(s), ...s.families.terrain]) for (const c of h.cells)
        expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, h.family === 'terrain' ? 3 : 4, 4)).toBe(false);
    }
  });
  it('MEC-004 spawnCtx rejects off-board, reserved, near-head and front-lane cells', () => {
    const s = due(26), ctx = spawnCtx(s, b);
    for (const [x, y] of [[-1, 0], [17, 0], [0, 17], [8, 8], [8, 5], [12, 8]]) expect(ctx.cellFree(x, y)).toBe(false);
    expect(ctx.cellFree(8, 5, 3)).toBe(true);
    expect(ctx.cellFree(0, 0)).toBe(true);
  });
});
