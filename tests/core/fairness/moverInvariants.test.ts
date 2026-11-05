import { expect, it } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { newMover } from '../../../src/core/hazards/blocks/mover';
import { key } from '../../../src/core/grid';
import { checkMoverTransitions, CoconutSpawnTracker, fuzzSeed, moverCells, type MoverMark } from '../../support/fuzz';
import { loadBalance, soloTable } from '../../support/balance';
import { buildBoard } from '../../support/board';
import { coconut } from '../../../src/core/hazards/coconut';
import { spawnCtx } from '../../../src/core/hazards/director';

it('MEC-013-R2 fuzz exempts only the same mango at its recorded coconut spawn position', () => {
  const b = loadBalance(), s = buildBoard({ mango: [4, 0] }), tracker = new CoconutSpawnTracker();
  const before = structuredClone(s), ctx = spawnCtx(s, b);
  expect(coconut.spawn(s, { ...ctx, rng: { ...ctx.rng, int: () => 0 } })).not.toBeNull();
  expect(tracker.record(before, s)).toBe(1);
  expect(tracker.record(before, s)).toBe(0);
  expect(tracker.mangoReserved(s)).toBe(false);
  s.mango!.x = 5;
  expect(tracker.mangoReserved(s)).toBe(true);
  s.mango!.x = 4;
  s.mango = { ...s.mango! };
  expect(tracker.mangoReserved(s)).toBe(true);
});

it('MEC-013-R2 fuzz detects a new mango on a lane with no mango at coconut spawn', () => {
  const b = loadBalance(), s = buildBoard({}), tracker = new CoconutSpawnTracker();
  s.mango = null;
  const before = structuredClone(s), ctx = spawnCtx(s, b);
  coconut.spawn(s, { ...ctx, rng: { ...ctx.rng, int: () => 0 } });
  tracker.record(before, s);
  s.mango = { x: 4, y: 0, golden: false, leftMs: 5000, totalMs: 5000 };
  expect(tracker.mangoReserved(s)).toBe(true);
});

it('MEC-013-R2 fuzz keeps reservations from other coconut rolls and other hazard families', () => {
  const b = loadBalance(), s = buildBoard({ mango: [4, 0] }), tracker = new CoconutSpawnTracker();
  const before = structuredClone(s), ctx = spawnCtx(s, b);
  coconut.spawn(s, { ...ctx, rng: { ...ctx.rng, int: () => 0 } });
  tracker.record(before, s);
  // An unrecorded roll must not inherit another roll's existing-mango exemption.
  s.families.coconut.rolls.push({ id: 2, lane: 'col', index: 4,
    mover: newMover(Array.from({ length: b.board.rows }, (_, y) => ({ x: 4, y })), b.coconut.warnMs, b.coconut.cellMs, false, 0) });
  expect(tracker.mangoReserved(s)).toBe(true);
  s.families.coconut.rolls.pop();
  s.families.rubble.push({ family: 'rubble', x: 4, y: 0, state: 'solid', leftMs: 5000 });
  expect(tracker.mangoReserved(s)).toBe(true);
});

it('MEC-013-R6 fuzz counts observed coconut spawns', () => {
  expect(fuzzSeed(soloTable(loadBalance(), 'coconut'), 3, 20000).spawned.coconut).toBeGreaterThan(0);
});

it('MEC-013-R2 TR-B4 extraction marks the whole warning lane and only the occupied moving cell', () => {
  const b = loadBalance(), sim = createSimInternal(b, 1, {}, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim), path = Array.from({ length: b.board.cols }, (_, x) => ({ x, y: 0 }));
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 0, mover: newMover(path, b.coconut.warnMs, b.coconut.cellMs, false, 0) });
  expect(moverCells(sim.snapshot(), b.board.cols)).toHaveLength(b.board.cols);
  expect(moverCells(sim.snapshot(), b.board.cols).every(m => m.phase === 'warn')).toBe(true);
  sim.advance(b.coconut.warnMs);
  expect(moverCells(sim.snapshot(), b.board.cols)).toEqual([{ id: 'coconut:1', cell: key(b.board.cols, 0, 0), phase: 'mover', warnMs: b.coconut.warnMs }]);
});

const mark = (phase: 'warn' | 'mover', cell = 0): MoverMark => ({ id: 'coconut:1', cell, phase, warnMs: 1500 });
it('MEC-013-R4 TR-B4 I1 rejects body entry and permits a head hit', () => {
  const bad: string[] = [], warnings = new Map([['coconut:1', 0]]);
  checkMoverTransitions([mark('mover')], [mark('mover', 1)], warnings, new Set([1]), 1501, m => bad.push(m));
  expect(bad).toHaveLength(1); expect(bad[0]).toMatch(/I1/);
  bad.length = 0;
  checkMoverTransitions([mark('mover')], [mark('mover', 1)], warnings, new Set(), 1501, m => bad.push(m));
  expect(bad).toEqual([]);
});

it('MEC-013-R2 TR-B4 I3 requires the full warning once, then permits subsequent moves without a fresh warning', () => {
  const bad: string[] = [], warnings = new Map<string, number>();
  const check = (previous: MoverMark[], current: MoverMark[], time: number) =>
    checkMoverTransitions(previous, current, warnings, new Set(), time, m => bad.push(m));
  check([], [mark('warn')], 10);
  check([mark('warn')], [mark('mover')], 1509);
  expect(bad).toHaveLength(1); expect(bad[0]).toMatch(/I3/);
  bad.length = 0;
  check([mark('warn')], [mark('mover')], 1510);
  check([mark('mover')], [mark('mover', 1)], 1600);
  check([mark('mover', 1)], [], 1601);
  expect(bad).toEqual([]); expect(warnings.size).toBe(0);
});

it('MEC-013-R2 TR-B4 I3 rejects a mover that appears without a warning', () => {
  const bad: string[] = [];
  checkMoverTransitions([], [mark('mover')], new Map(), new Set(), 2000, m => bad.push(m));
  expect(bad).toHaveLength(1); expect(bad[0]).toMatch(/I3/);
});

it('MEC-013-R2 TR-B4 warning age includes the spawn millisecond before the first snapshot', () => {
  const bad: string[] = [], warnings = new Map<string, number>();
  const warning = { ...mark('warn'), elapsedMs: 1 };
  checkMoverTransitions([], [warning], warnings, new Set(), 11, m => bad.push(m));
  checkMoverTransitions([warning], [mark('mover')], warnings, new Set(), 1510, m => bad.push(m));
  expect(bad).toEqual([]);
});
