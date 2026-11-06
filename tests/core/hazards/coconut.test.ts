import { expect, it } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { coconut, laneCandidates } from '../../../src/core/hazards/coconut';
import { moverCell, newMover } from '../../../src/core/hazards/blocks/mover';
import { spawnCtx, updateDirector } from '../../../src/core/hazards/director';
import { reservedByFamilies } from '../../../src/core/hazards/queries';
import { resolveHeadCell } from '../../../src/core/hazards/collision';
import { introducedAt } from '../../../src/core/level';
import { rngFrom } from '../../../src/core/rng';
import { placeMango } from '../../../src/core/mango';
import { loadBalance, soloTable } from '../../support/balance';
import { buildBoard } from '../../support/board';
import { hitCtx } from '../../support/fakeFamily';

const row = (y: number) => Array.from({ length: loadBalance().board.cols }, (_, x) => ({ x, y }));
const fixture = () => {
  const b = soloTable(loadBalance(), 'coconut');
  const sim = createSimInternal(b, 16, { startLevel: 16 }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.snake = [{ x: 5, y: 3 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 }];
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 3, mover: newMover(row(3), b.coconut.warnMs, b.coconut.cellMs, false, 0) });
  return { b, s, sim };
};

it('MEC-013-R1 lanes exclude the head row/column and any lane with a front-lane cell in deterministic order', () => {
  const b = loadBalance(), s = buildBoard({ head: [8, 8], dir: [1, 0] });
  const expected = [
    ...Array.from({ length: b.board.rows }, (_, index) => ({ lane: 'row' as const, index })).filter(l => l.index !== 8),
    ...Array.from({ length: b.board.cols }, (_, index) => ({ lane: 'col' as const, index })).filter(l => l.index < 8 || l.index > 12),
  ].flatMap(l => [{ ...l, from: 'start' }, { ...l, from: 'end' }]);
  expect(laneCandidates(s, b)).toEqual(expected);
});

it('MEC-013-R1 spawn uses candidateValid and tries lanes without replacement', () => {
  const b = loadBalance(), s = buildBoard({});
  const tried: unknown[] = [];
  expect(coconut.spawn(s, { ...spawnCtx(s, b), candidateValid: (_s, cells, opts) => {
    expect(opts).toEqual({ nearDist: 0, exemptNearHead: true, wallCells: [] });
    tried.push(cells); return false;
  } })).toBeNull();
  expect(tried).toHaveLength(b.coconut.tries);
  expect(new Set(tried.map(c => JSON.stringify(c))).size).toBe(b.coconut.tries);
  expect(s.families.coconut.rolls).toEqual([]);
});

it('MEC-013-R2 lane cells are reserved while warning and rolling, but never solid or BFS walls', () => {
  const b = loadBalance(), s = buildBoard({});
  const cells = coconut.spawn(s, spawnCtx(s, b));
  expect(cells).not.toBeNull();
  const ctx = hitCtx(s);
  for (let ms = 0; ms <= b.coconut.warnMs; ms++) {
    for (const c of cells!) {
      expect(reservedByFamilies(s, c.x, c.y)).toBe(true);
      expect(coconut.solidAt(s, c.x, c.y)).toBe(false);
      expect(coconut.bfsWallAt(s, c.x, c.y)).toBe(false);
    }
    if (ms < b.coconut.warnMs) coconut.update(s, ctx);
  }
  expect(s.families.coconut.rolls[0]!.mover.state).toBe('move');
});

it('MEC-013-R2 placeMango never picks a cell on a warning or rolling coconut lane', () => {
  for (const phase of ['warn', 'move'] as const) {
    const b = loadBalance(), s = buildBoard({});
    const mover = newMover(row(0), b.coconut.warnMs, b.coconut.cellMs, false, 0);
    mover.state = phase; mover.pos = phase === 'warn' ? -1 : 0;
    s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 0, mover });
    // Leave the lane and one safe cell available; picking the first candidate exposes a missing reservation.
    for (let y = 1; y < b.board.rows; y++) for (let x = 0; x < b.board.cols; x++) {
      if (x !== 0 || y !== 1) s.orbs.push({ x, y, ageMs: 0 });
    }
    const rng = rngFrom(s.rng);
    expect(placeMango(s, b, { ...rng, pick: pool => pool[0]! })).toBe(true);
    expect(s.mango).toMatchObject({ x: 0, y: 1 });
  }
});

it('MEC-013-R3 coconut rolls one cell per 90 ms after a 1500 ms warning and kills the head', () => {
  const { b, sim, s } = fixture();
  sim.advance(b.coconut.warnMs - 1);
  expect(moverCell(s.families.coconut.rolls[0]!.mover)).toBeNull();
  sim.advance(1);
  expect(moverCell(s.families.coconut.rolls[0]!.mover)).toEqual({ x: 0, y: 3 });
  sim.advance(b.coconut.cellMs * 5 - 1);
  expect(s.status).toBe('playing');
  sim.advance(1);
  expect(s.status).toBe('over');
  const events = sim.drainEvents();
  expect(events.filter(e => e.type === 'moverHit')).toEqual([{ type: 'moverHit', family: 'coconut', x: 5, y: 3 }]);
  expect(events).toContainEqual({ type: 'died', cause: 'coconut', x: 5, y: 3 });
  expect(sim.drainEvents()).toEqual([]);
  expect(s.outcome?.cause).toBe('coconut');
});

it.each(['body', 'solid'] as const)('MEC-013-R4 coconut shatters on a %s cell without entering it', obstacle => {
  const { b, sim, s } = fixture();
  s.snake[0] = { x: 5, y: 2 };
  if (obstacle === 'body') s.snake[1] = { x: 5, y: 3 };
  else s.families.rubble.push({ family: 'rubble', x: 5, y: 3, state: 'solid', leftMs: 5000 });
  const roll = s.families.coconut.rolls[0]!;
  sim.advance(b.coconut.warnMs + b.coconut.cellMs * 5);
  expect(s.status).toBe('playing');
  expect(s.families.coconut.rolls).toEqual([]);
  expect(roll.mover.pos).toBe(4);
});

it.each([false, true])('MEC-013-R5 shield breaks a coconut with non-zero moverDir, reverse=%s', reverse => {
  const { b, sim, s } = fixture();
  const path = row(3); if (reverse) path.reverse();
  s.families.coconut.rolls[0]!.mover = newMover(path, b.coconut.warnMs, b.coconut.cellMs, false, 0);
  s.dir = { x: 0, y: 1 }; // Direction must come from the coconut, not the snake.
  s.shield = { leftMs: 5000 };
  sim.advance(b.coconut.warnMs + b.coconut.cellMs * (reverse ? 11 : 5));
  expect(s.status).toBe('playing');
  expect(s.shield).toBeNull();
  expect(s.families.coconut.rolls).toEqual([]);
  expect(sim.drainEvents()).toContainEqual({ type: 'shieldBroke', family: 'coconut', x: 5, y: 3 });
  expect(s.families.rubble).toEqual([]);
  expect(s.acc).toBeLessThan(0);
});

it('MEC-013-R5 head moving onto a coconut dies or breaks it with Shield', () => {
  for (const shield of [false, true]) {
    const { b, sim, s } = fixture();
    sim.advance(b.coconut.warnMs);
    expect(coconut.headHit!(s, 0, 3)).toBe('mover');
    s.shield = shield ? { leftMs: 5000 } : null;
    expect(resolveHeadCell(s, 0, 3, hitCtx(s))).toEqual(shield ? { kind: 'broke', family: 'coconut' } : { kind: 'death', cause: 'coconut' });
    if (shield) expect(s.families.coconut.rolls).toEqual([]);
  }
});

it('MEC-013-R5 head moving onto a coconut emits moverHit exactly once with or without Shield', () => {
  for (const shield of [false, true]) {
    const { b, sim, s } = fixture();
    sim.advance(b.coconut.warnMs);
    sim.drainEvents();
    s.shield = shield ? { leftMs: 5000 } : null;
    const ctx = hitCtx(s);
    resolveHeadCell(s, 0, 3, ctx);
    expect(ctx.events.filter(e => e.type === 'moverHit')).toEqual([{ type: 'moverHit', family: 'coconut', x: 0, y: 3 }]);
  }
});

it('MEC-013-R6 one coconut per lane and at most coconut.maxActive', () => {
  const b = loadBalance(), s = buildBoard({});
  expect(coconut.spawn(s, spawnCtx(s, b))).not.toBeNull();
  const first = s.families.coconut.rolls[0]!;
  expect(laneCandidates(s, b).some(l => l.lane === first.lane && l.index === first.index)).toBe(false);
  expect(coconut.spawn(s, spawnCtx(s, b))).not.toBeNull();
  expect(coconut.spawn(s, spawnCtx(s, b))).toBeNull();
  expect(coconut.count!(s)).toBe(b.coconut.maxActive);
});

it('MEC-013-R7 a coconut passes over the mango and orbs without changing them', () => {
  const { b, s } = fixture();
  s.snake[0] = { x: 5, y: 2 };
  s.mango = { x: 9, y: 3, golden: true, leftMs: 5000, totalMs: 5000 };
  s.orbs = [{ x: 10, y: 3, ageMs: 0 }];
  s.rainMangoes = [{ x: 11, y: 3, ageMs: 0, castId: 1 }];
  const before = structuredClone({ mango: s.mango, orbs: s.orbs, rain: s.rainMangoes });
  const ctx = hitCtx(s);
  for (let i = 0; i < b.coconut.warnMs + b.coconut.cellMs * b.board.cols; i++) coconut.update(s, ctx);
  expect({ mango: s.mango, orbs: s.orbs, rain: s.rainMangoes }).toEqual(before);
  expect(s.families.coconut.rolls).toEqual([]);
});

it('MEC-013-R7 EC1 a warning lane may cross existing mangoes and orbs', () => {
  const b = loadBalance(), s = buildBoard({ mango: [4, 0] });
  s.orbs = [{ x: 5, y: 0, ageMs: 0 }];
  s.rainMangoes = [{ x: 6, y: 0, ageMs: 0, castId: 1 }];
  const before = structuredClone({ mango: s.mango, orbs: s.orbs, rain: s.rainMangoes });
  const ctx = spawnCtx(s, b);
  const cells = coconut.spawn(s, { ...ctx, rng: { ...ctx.rng, int: () => 0 } });
  expect(cells).toEqual(row(0));
  expect({ mango: s.mango, orbs: s.orbs, rain: s.rainMangoes }).toEqual(before);
});

it('MEC-013-R2 coconut snapshots expose the warning path and rolling cell without live aliases', () => {
  const { b, s, sim } = fixture();
  const before = sim.snapshot();
  expect(before.families.coconut).toEqual([{ id: 1, path: row(3), cell: null, state: 'warn', t: 0, warnMs: b.coconut.warnMs }]);
  sim.advance(b.coconut.warnMs);
  expect(sim.snapshot().families.coconut[0]!.cell).toEqual({ x: 0, y: 3 });
  expect(coconut.snapshot(s)).toEqual(sim.snapshot().families.coconut);
  s.families.coconut.rolls[0]!.mover.path[0]!.x = 99;
  expect(before.families.coconut[0]!.path[0]).toEqual({ x: 0, y: 3 });
});

it('MEC-013-R8 coconut is introduced at L16 only', () => {
  const b = loadBalance();
  for (let level = 1; level <= b.level.maxLevel; level++) {
    expect(introducedAt(b, level) === 'coconut').toBe(level === 16);
    const row = b.level.table.find(r => r.from <= level && level <= r.to)!;
    // P2c: challenge rows carry their own weights, so the P2c-tuned weight 1 is pinned on non-challenge levels only.
    if (level < 16 || level % 5 !== 0) expect(row.weights.coconut ?? 0).toBe(level < 16 ? 0 : level < 20 ? 1 : 2);
  }
});

it('MEC-013-R2 director emits exactly one incoming event for a coconut', () => {
  const b = soloTable(loadBalance(), 'coconut'), s = buildBoard({ level: 16, mango: [8, 1] });
  s.spawnInMs = 1;
  updateDirector(s, b, rngFrom(s.rng));
  expect(s.families.coconut.rolls).toHaveLength(1);
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'coconut' }]);
});

it('MEC-013 tuning rejects invalid timings and sub-minimum warnings', () => {
  for (const key of ['warnMs', 'cellMs', 'tries', 'maxActive']) {
    expect(() => loadBalance(j => { j.coconut[key] = 0; })).toThrow();
  }
  expect(() => loadBalance(j => { j.coconut.warnMs = j.fairness.minWarnMs - 1; })).toThrow(/coconut.warnMs/);
});
