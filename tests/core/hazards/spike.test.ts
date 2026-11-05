import { it, expect, expectTypeOf } from 'vitest';
import { spike, type SpikeGroup } from '../../../src/core/hazards/spike';
import { solidCauseAt, bfsWall, reservedByFamilies } from '../../../src/core/hazards/queries';
import { spawnCtx, updateDirector, directorOptions } from '../../../src/core/hazards/director';
import { resolveHeadCell } from '../../../src/core/hazards/collision';
import { introducedAt, familyRow } from '../../../src/core/level';
import { restoreSim, stateOf } from '../../../src/core/sim';
import { rngFrom } from '../../../src/core/rng';
import { FAMILIES, __setFamiliesForTest } from '../../../src/core/hazards/registry';
import { runFamilyFuzz } from '../../support/familyFuzz';
import { buildTimeline } from '../../../src/core/fairness/timeline';
import { key } from '../../../src/core/grid';
import type { SpikeView } from '../../../src/core/types';
import { buildBoard } from '../../support/board';
import { hitCtx } from '../../support/fakeFamily';
import { loadBalance, soloTable } from '../../support/balance';

const group = (cells: [number, number][], t = 2000): SpikeGroup => ({ id: 1, t, lifeMs: 12000, ending: false,
  cells: cells.map(([x, y]) => ({ x, y, delay: 0, up: false, vis: 'down' })) });
const fixture = (t = 2000) => {
  const b = loadBalance(), s = buildBoard({ head: [8, 3], level: 18 }), g = group([[2, 12], [3, 12]], t);
  s.families.spike.groups.push(g);
  s.levelTimeMs = b.spike.downMs + b.spike.warnMs;
  return { b, s, g, ctx: hitCtx(s) };
};

it('MEC-014-R6 all spike groups pop up on the same global beat', () => {
  const { s, ctx } = fixture();
  s.families.spike.groups.push({ ...group([[12, 12]], 5000), id: 2 });
  spike.update(s, ctx);
  expect(solidCauseAt(s, 2, 12)).toBe('spike');
  expect(solidCauseAt(s, 12, 12)).toBe('spike');
});
it('MEC-014-R6 a new group stays down until it was shown for showMs', () => {
  const { b, s, g, ctx } = fixture(0);
  for (let i = 1; i < b.spike.showMs; i++) {
    spike.update(s, ctx);
    expect(g.cells.every(c => !c.up && c.vis === 'down')).toBe(true);
  }
  spike.update(s, ctx);
  expect(solidCauseAt(s, 2, 12)).toBe('spike');
});
it('MEC-014-R7 a spike under the snake keeps warning until the snake leaves', () => {
  const { s, g, ctx } = fixture();
  s.snake.push({ x: 2, y: 12 });
  spike.update(s, ctx);
  expect(g.cells[0]).toMatchObject({ up: false, vis: 'warn' });
  expect(solidCauseAt(s, 2, 12)).toBeNull();
  s.snake.pop(); spike.update(s, ctx);
  expect(solidCauseAt(s, 2, 12)).toBe('spike');
});
it('MEC-014-R8 shield breaks one up spike for the rest of the group life', () => {
  const { b, s, g, ctx } = fixture();
  spike.update(s, ctx); s.shield = { leftMs: 5000 };
  expect(resolveHeadCell(s, 2, 12, ctx)).toEqual({ kind: 'broke', family: 'spike' });
  expect(s.shield).toBeNull();
  expect(g.cells).toHaveLength(1);
  const period = b.spike.downMs + b.spike.warnMs + b.spike.upMs;
  for (let i = 0; i <= g.lifeMs + period; i++) {
    s.levelTimeMs++; spike.update(s, ctx);
    expect(solidCauseAt(s, 2, 12)).toBeNull();
    expect(reservedByFamilies(s, 2, 12)).toBe(false);
  }
  expect(s.families.spike.groups).toEqual([]);
});
it('MEC-014-R6 a group ends on a down phase after its life', () => {
  const { b, s, g, ctx } = fixture();
  g.t = g.lifeMs - 1; spike.update(s, ctx);
  expect(g.ending).toBe(true);
  expect(solidCauseAt(s, 2, 12)).toBe('spike');
  s.levelTimeMs = b.spike.downMs; spike.update(s, ctx);
  expect(s.families.spike.groups).toHaveLength(1);
  s.levelTimeMs = b.spike.downMs + b.spike.warnMs + b.spike.upMs;
  spike.update(s, ctx);
  expect(s.families.spike.groups).toEqual([]);
});
it('MEC-014-R6 level-up resets the beat while preserving a surviving group', () => {
  const { s, ctx } = fixture(); spike.update(s, ctx);
  s.levelTimeMs = 0; spike.update(s, ctx);
  expect(s.families.spike.groups).toHaveLength(1);
  expect(solidCauseAt(s, 2, 12)).toBeNull();
  expect(s.families.spike.groups[0]!.cells[0]!.vis).toBe('down');
});
it('MEC-014-R7 spike cells are reserved in every phase and never BFS walls', () => {
  const { b, s, ctx } = fixture();
  for (const t of [0, b.spike.downMs, b.spike.downMs + b.spike.warnMs]) {
    s.levelTimeMs = t; spike.update(s, ctx);
    expect(reservedByFamilies(s, 2, 12)).toBe(true);
    expect(bfsWall(s, 2, 12)).toBe(false);
  }
});
it('MEC-014-R9 spike is introduced at L18 only', () => {
  const b = loadBalance();
  for (let level = 1; level <= 30; level++) {
    expect(introducedAt(b, level) === 'spike').toBe(level === 18);
    expect(familyRow(b, level).weights.spike ?? 0).toBe(level >= 18 ? 2 : 0);
  }
});
it('MEC-014-R5 spawn makes configured shapes with lifetime bounds and zero-delay down cells', () => {
  const b = loadBalance(), sizes = new Set<number>();
  for (let seed = 1; seed <= 40; seed++) {
    const s = buildBoard({ head: [8, 3], level: 18, seed });
    const cells = spike.spawn(s, spawnCtx(s, b));
    expect(cells).not.toBeNull();
    const g = s.families.spike.groups[0]!;
    sizes.add(g.cells.length);
    expect(g).toMatchObject({ id: 1, t: 0, ending: false });
    expect(g.lifeMs).toBeGreaterThanOrEqual(b.spike.lifeMs);
    expect(g.lifeMs).toBeLessThan(b.spike.lifeMs + b.spike.lifeRandMs);
    expect(g.cells.every(c => c.delay === 0 && !c.up && c.vis === 'down')).toBe(true);
    expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([]);
  }
  expect([...sizes].sort()).toEqual([1, 2]);
});
it('MEC-014-R5 failed placement preserves state and supplies no BFS walls', () => {
  const b = loadBalance(), s = buildBoard({ level: 18 }), before = structuredClone(s.families.spike);
  let tries = 0;
  expect(spike.spawn(s, { ...spawnCtx(s, b), candidateValid: (_s, _cells, opts) => {
    tries++; expect(opts).toEqual({ nearDist: b.fairness.nearHeadDist, wallCells: [] }); return false;
  } })).toBeNull();
  expect(tries).toBe(b.spike.tries);
  expect(s.families.spike).toEqual(before);
});
it('MEC-014-R5 director emits one incoming event and enforces the group cap', () => {
  const b = soloTable(loadBalance(), 'spike'), s = buildBoard({ level: 18, mango: [8, 1] });
  for (let i = 0; i < b.spike.maxActive; i++) {
    s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  }
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual(
    Array.from({ length: b.spike.maxActive }, () => ({ type: 'hazardIncoming', family: 'spike' })));
  expect(directorOptions(s, b)).toEqual([]);
  expect(spike.spawn(s, spawnCtx(s, b))).toBeNull();
});
it('MEC-004-R2 MEC-014-R6 snapshots expose SpikeView without internal flags or live aliases', () => {
  const { b, s, g } = fixture(), sim = restoreSim(b, s), snap = sim.snapshot();
  expectTypeOf(snap.families.spike).toEqualTypeOf<readonly SpikeView[]>();
  expect(snap.families.spike[0]).toEqual({ id: 1, t: g.t, lifeMs: g.lifeMs, ending: false,
    cells: g.cells.map(({ x, y, delay, vis }) => ({ x, y, delay, vis })) });
  expect(sim.clone().snapshot()).toEqual(snap);
  const live = stateOf(sim), copy = spike.snapshot(live);
  live.families.spike.groups[0]!.cells[0]!.x = 99;
  expect(copy).toMatchObject([{ cells: [{ x: 2 }, { x: 3 }] }]);
  expect(snap.families.spike[0]!.cells[0]!.x).toBe(2);
});
it('MEC-014-R6 fairness timeline follows the global beat', () => {
  const { b, s, ctx } = fixture(); spike.update(s, ctx);
  const tl = buildTimeline(b, s, 20), cell = key(b.board.cols, 2, 12);
  expect(tl.lethal[0]!.has(cell)).toBe(true);
  expect(tl.lethal[Math.ceil(b.spike.upMs / tl.tickMs)]!.has(cell)).toBe(false);
});
it('MEC-014-R6 warning and show floors use the shared fairness minimum and tick rule', () => {
  for (const field of ['warnMs', 'showMs']) {
    expect(() => loadBalance(j => { j.spike[field] = 899; })).toThrow(new RegExp('spike.' + field));
    expect(() => loadBalance(j => { j.fairness.minWarnMs = 600; j.spike[field] = 600; })).not.toThrow();
    expect(() => loadBalance(j => { j.fairness.minWarnMs = 600; j.spike[field] = 599; })).toThrow(new RegExp('spike.' + field));
    expect(() => loadBalance(j => { j.fairness.minWarnMs = 1; j.spike[field] = 559; })).toThrow(new RegExp('spike.' + field));
  }
  expect(() => loadBalance(j => { j.spike.shapePool = ['unknown']; })).toThrow(/spike.shapePool/);
});

it('MEC-004-R17 MEC-014-R6 invariants detect spikes rising without their display warning', () => {
  const previous = FAMILIES;
  __setFamiliesForTest(previous.map(f => f.key !== 'spike' ? f : { ...spike, update(s, ctx) {
    spike.update(s, ctx);
    for (const g of s.families.spike.groups) for (const c of g.cells) { c.up = true; c.vis = 'up'; }
  } }));
  try {
    const violations = runFamilyFuzz({ family: 'spike', mode: 'solo', startLevel: 18, seeds: 1, durationMs: 10000, escape: 'off' });
    expect(violations.some(v => /I3 spike:/.test(v))).toBe(true);
  } finally { __setFamiliesForTest(previous); }
});
