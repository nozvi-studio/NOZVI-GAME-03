import { addTimedHazards, replaceTimedHazards, timedHazards } from '../../src/core/hazards/timed';
import { describe, expect, it, vi } from 'vitest';
import { directorOptions, pickWeighted, spawnCtx, updateDirector } from '../../src/core/hazards/director';
import { makeTimed } from '../../src/core/hazards/timed';
import { nearHead } from '../../src/core/grid';
import { rngFrom, seedRng } from '../../src/core/rng';
import { restoreSim, stateOf } from '../../src/core/sim';
import type { FamilyKey, SimState, TerrainHazard } from '../../src/core/types';
import { __setFamiliesForTest, FAMILIES, FAMILY } from '../../src/core/hazards/registry';
import { solidCauseAt, tileAt } from '../../src/core/hazards/queries';
import { startLevelUp } from '../../src/core/transition';
import { testCtx } from '../../src/core/testing';
import { loadBalance } from '../support/balance';
import { fixed } from '../support/rngStub';
import { buildState } from '../support/state';
import { fakeFamily, withFamilies } from '../support/fakeFamily';

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
  const rng = rngFrom(seedRng(42));
  let first = true;
  updateDirector(s, b, { ...rng, next: () => { if (first) { first = false; return roll; } return rng.next(); } });
  return s.families.spike.groups.length ? 'spike' : s.families.gate.gates.length ? 'gate' : s.families.coconut.rolls.length ? 'coconut' : s.families.ice.patches.length ? 'ice' : s.families.mud.patches.length ? 'mud' : s.families.terrain[0]?.family ?? timedHazards(s)[0]?.family;
}

describe('MEC-004 director', () => {
  it.each([undefined, { target: null }])('MEC-004-R9 a family without count or a supported state throws with its key (%j)', state => {
    const s = due(1);
    Object.assign(s.families, { bird: state });
    const family = fakeFamily({ key: 'bird', capClass: 'modifier' });
    delete family.count;
    expect(() => directorOptions(s, b, [family])).toThrowError('Missing count for hazard family: bird');
  });
  it('MEC-004-R9 small cap counts all small families; modifier not counted; one big family at a time', () => {
    const s = due(1), balance = structuredClone(b);
    Object.assign(balance.level.table[0]!.weights, { rock: 3, fence: 2, terrain: 2, maze: 2, rubble: 1 });
    const fams = [fakeFamily({ key: 'rock', capClass: 'small', count: 1 }),
      fakeFamily({ key: 'fence', capClass: 'small', count: 1 }),
      fakeFamily({ key: 'terrain', capClass: 'big', count: 1 }),
      fakeFamily({ key: 'maze', capClass: 'big' }),
      fakeFamily({ key: 'rubble', capClass: 'modifier' })];
    expect(directorOptions(s, balance, fams).map(o => o.family.key)).toEqual(['rubble']);
  });
  it('MEC-004-R9 options follow registry order and table weights', () => {
    expect(directorOptions(due(11), b).map(o => [o.family.key, o.weight])).toEqual([['rock', 3], ['fence', 2], ['terrain', 2], ['mud', 2]]);
    expect(directorOptions(due(26), b).map(o => o.family.key)).toEqual(['rock', 'fence', 'maze', 'terrain', 'mud', 'ice', 'coconut', 'gate', 'spike']);
  });
  it('MEC-004-R9 per-family maxActive gates small and modifier options', () => {
    const s = due(11);
    const fams = [fakeFamily({ key: 'rock', capClass: 'small', count: 1 }),
      fakeFamily({ key: 'fence', capClass: 'modifier', count: 1 })].map(f => ({ ...f, maxActiveKey: 'terrain.maxActive' }));
    expect(directorOptions(s, b, fams)).toEqual([]);
  });
  it('MEC-003-R11 the capClass director spawns nothing while the level-up slowdown is active', () => {
    const s = due(6); s.levelUpSlow = { factor: 1.4, easeMs: 1000, leftMs: 1000 };
    const previous = FAMILIES, spawn = vi.fn(() => [{ x: 0, y: 0 }]);
    __setFamiliesForTest([{ ...fakeFamily({ key: 'rock', capClass: 'modifier' }), spawn }]);
    try { for (let i = 0; i < 999; i++) updateDirector(s, b, rngFrom(s.rng)); }
    finally { __setFamiliesForTest(previous); }
    expect(spawn).not.toHaveBeenCalled(); expect(s.spawnInMs).toBe(1); expect(s.mazeCooldownMs).toBe(0);
  });
  it('MEC-004-R16 a level up leaves every family instance in place', () => {
    const s = due(6), rock = makeTimed('rock', [{ x: 1, y: 1 }], 1500, 6000);
    rock.state = 'solid'; rock.cells[0]!.on = true; addTimedHazards(s, rock);
    s.families.terrain.push(terrain());
    const previous = FAMILIES;
    __setFamiliesForTest([...previous, fakeFamily({ key: 'rubble', tile: { kind: 'mud', cells: [[2, 2]] } })]);
    const answers = () => Array.from({ length: 289 }, (_, i) => [solidCauseAt(s, i % 17, Math.floor(i / 17)), tileAt(s, i % 17, Math.floor(i / 17))]);
    try {
      const before = JSON.stringify(s.families), queries = answers();
      startLevelUp(s, b, testCtx(b, s));
      expect(JSON.stringify(s.families)).toBe(before); expect(answers()).toEqual(queries);
    } finally { __setFamiliesForTest(previous); }
  });
  it('MEC-004-R11 terrain cells never spawn within Manhattan distance 3 of the head', () => {
    const s = due(11), rng = fixed([5, 5], [false]).rng;
    const cells = FAMILY.terrain.spawn(s, { ...spawnCtx(s, b), rng });
    expect(cells).not.toBeNull();
    for (const c of cells!) expect(Math.abs(c.x - 8) + Math.abs(c.y - 8)).toBeGreaterThan(3);
  });
  it('MEC-004-R10 observer receives a detached pre-spawn state and the successful cells', () => {
    const s = due(1), spawned = vi.fn();
    updateDirector(s, b, rngFrom(s.rng), { ...spawnCtx(s, b), observer: { spawned } });
    expect(spawned).toHaveBeenCalledTimes(1);
    const [family, cells, before, after] = spawned.mock.calls[0]!;
    expect(family).toBe('rock'); expect(cells).toEqual(s.families.rock[0]!.cells.map(({ x, y }) => ({ x, y })));
    expect(before.families.rock).toEqual([]); expect(before).not.toBe(s); expect(after).toBe(s);
    s.families.rock[0]!.cells[0]!.x = -1;
    expect(before.families.rock).toEqual([]);
  });
  it('MEC-004-R10 director does not clone state without an observer', () => {
    const s = due(1), clone = vi.spyOn(globalThis, 'structuredClone');
    try { updateDirector(s, b, rngFrom(s.rng)); expect(clone).not.toHaveBeenCalled(); }
    finally { clone.mockRestore(); }
  });
  it('MEC-004-R10 failed attempts are not observed and retry success has its own before state', () => {
    const s = due(6), previous = FAMILIES, spawned = vi.fn();
    const fail = vi.fn(() => null);
    __setFamiliesForTest([{ ...fakeFamily({ key: 'rock', capClass: 'small' }), spawn: fail }, FAMILY.fence]);
    try {
      updateDirector(s, b, fixed([]).rng, { ...spawnCtx(s, b), observer: { spawned } });
      expect(fail).toHaveBeenCalledTimes(1); expect(spawned).toHaveBeenCalledTimes(1);
      const [family, , before, after] = spawned.mock.calls[0]!;
      expect(family).toBe('fence'); expect(before.families.fence).toEqual([]);
      expect(after.families.fence).toHaveLength(1);
    } finally { __setFamiliesForTest(previous); }
  });
  it('MEC-004-R9 small cap counts every family with capClass small', () => {
    const s = due(1), rng = fixed([]);
    withFamilies(s, [{ key: 'terrain', capClass: 'small', count: 2 }], () => {
      updateDirector(s, b, rng.rng);
    });
    expect(rng.calls).toEqual([]);
    expect(s.families.rock).toEqual([]);
  });
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
  it('MEC-004 unlocks: fence from 6, mud from 7, terrain from 11, ice from 13, coconut from 16, gate from 17, spike from 18, maze from 26', () => {
    // Probe each weighted interval with real family spawns; no family stubs.
    expect([0, 0.6, 0.99].map(r => selected(1, r))).toEqual(['rock', 'rock', 'rock']);
    expect([0, 0.61, 0.99].map(r => selected(6, r))).toEqual(['rock', 'fence', 'fence']);
    expect([0, 0.5, 0.7, 0.99].map(r => selected(11, r))).toEqual(['rock', 'fence', 'terrain', 'mud']);
    expect(selected(7, 0.99)).toBe('mud');
    // MEC-004-R9 registry order places maze before terrain at L26.
    expect(selected(13, 0.99)).toBe('ice');
    expect(selected(15, 0.99)).toBe('ice');
    expect(selected(16, 0.99)).toBe('coconut');
    expect(selected(17, 0.99)).toBe('gate');
    expect(selected(18, 0.99)).toBe('spike');
    expect([0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.99].map(r => selected(26, r))).toEqual(['rock', 'fence', 'maze', 'terrain', 'mud', 'ice', 'coconut', 'gate', 'spike']);
  });
  it('MEC-004 maze and terrain never overlap; maze cooldown 26000', () => {
    const maze = due(26); smallCap(maze);
    addTimedHazards(maze, makeTimed('maze', [{ x: 15, y: 15 }], 2600, 14000));
    const a = fixed([]); updateDirector(maze, b, a.rng); expect(a.calls).toEqual([]); expect(maze.families.terrain).toEqual([]);
    const ground = due(26); smallCap(ground); ground.families.terrain.push(terrain());
    const c = fixed([]); updateDirector(ground, b, c.rng); expect(c.calls).toEqual([]);
    expect(timedHazards(ground).some(h => h.family === 'maze')).toBe(false);
    const s = due(26); updateDirector(s, b, fixed([], [], [0.35]).rng);
    expect(timedHazards(s)[0]?.family).toBe('maze'); expect(s.mazeCooldownMs).toBe(26000);
    replaceTimedHazards(s, []); s.families.terrain = []; s.spawnInMs = 1;
    updateDirector(s, b, fixed([], [], [0.4]).rng);
    expect(s.families.terrain).toHaveLength(1); expect(s.mazeCooldownMs).toBe(25999);
    replaceTimedHazards(s, []); s.families.terrain = []; s.spawnInMs = 1; s.mazeCooldownMs = 1;
    updateDirector(s, b, fixed([], [], [0.35]).rng);
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
    expect(timedHazards(s)).toEqual([]); expect(a.calls.filter(c => c === 'next')).toHaveLength(3);
    expect(a.calls.filter(c => c.startsWith('pick'))).toEqual(['pick(5)', 'pick(2)', 'pick(4)']);
  });
  it('MEC-004 hazardIncoming is emitted once for fence, maze, terrain, mud, ice coconut gate and spike, with rock deferred', () => {
    for (const [roll, family] of [[0, 'rock'], [0.2, 'fence'], [0.3, 'maze'], [0.4, 'terrain'], [0.5, 'mud'], [0.6, 'ice'], [0.7, 'coconut'], [0.8, 'gate'], [0.99, 'spike']] as const) {
      const s = due(26), rng = rngFrom(seedRng(42)); let first = true;
      // A fixed rng cannot serve: the first next() picks the family, and later draws must stay real so placement succeeds.
      updateDirector(s, b, { ...rng, next: () => { if (first) { first = false; return roll; } return rng.next(); } });
      expect(s.events).toEqual(family === 'rock' ? [] : [{ type: 'hazardIncoming', family }]);
    }
  });
  it('MEC-004 MEC-013-R1 new hazard cells respect near-head rules and the coconut lane exemption', () => {
    const rng = rngFrom(seedRng(42));
    for (let i = 0; i < 200; i++) {
      const s = due(1 + i % 30); updateDirector(s, b, rng);
      expect(timedHazards(s).length + s.families.terrain.length + s.families.mud.patches.length + s.families.ice.patches.length + s.families.coconut.rolls.length + s.families.gate.gates.length + s.families.spike.groups.length).toBe(1);
      for (const h of [...timedHazards(s), ...s.families.terrain, ...s.families.mud.patches, ...s.families.ice.patches, ...s.families.spike.groups]) for (const c of h.cells)
        expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, 4, 4)).toBe(false);
      for (const g of s.families.gate.gates) for (const c of [...g.fence, ...g.gate])
        expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, 4, 4)).toBe(false);
      for (const roll of s.families.coconut.rolls) {
        expect(roll.index).not.toBe(roll.lane === 'row' ? s.snake[0]!.y : s.snake[0]!.x);
        for (const c of roll.mover.path) expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, 0, b.fairness.frontLaneCells)).toBe(false);
      }
    }
  });
  it('MEC-004 spawnCtx rejects off-board, reserved, near-head and front-lane cells', () => {
    const s = due(26), ctx = spawnCtx(s, b);
    for (const [x, y] of [[-1, 0], [17, 0], [0, 17], [8, 8], [8, 5], [12, 8]]) expect(ctx.cellFree(x, y)).toBe(false);
    expect(ctx.cellFree(8, 5, 3)).toBe(true);
    expect(ctx.cellFree(0, 0)).toBe(true);
  });
});
