import { it, expect, expectTypeOf } from 'vitest';
// simInternal first: it loads the registry before the bomb module (registry <-> family import cycle).
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { plusArea, stepBlast, type BlastState } from '../../../src/core/hazards/blocks/areaBlast';
import { bomb, type BombInstance } from '../../../src/core/hazards/bomb';
import { resolveHeadCell } from '../../../src/core/hazards/collision';
import { hitCtx } from '../../support/fakeFamily';
import { spawnCtx } from '../../../src/core/hazards/director';
import { bfsWall, headHitAt, reservedByFamilies, solidCauseAt } from '../../../src/core/hazards/queries';
import { assertFamiliesDefined, DEFAULT_FAMILIES } from '../../../src/core/hazards/registry';
import { familyRow, introducedAt } from '../../../src/core/level';
import type { BombView, HazardFamily } from '../../../src/core/types';
import { loadBalance, soloTable } from '../../support/balance';

type B = ReturnType<typeof loadBalance>;
const landed = (b: B, x: number, y: number, countdownMs: number, activeMs: number, id = 1): BombInstance => ({
  id, x, y, t: 0, warnMs: b.bomb.warnMs, landed: true,
  blast: { area: plusArea(x, y, b.bomb.arm, 17, 17), countdownMs, activeMs, phase: 'count' } });
const fixture = (frozen = true) => {
  const b = soloTable(loadBalance(), 'bomb');
  const sim = createSimInternal(b, 23, { startLevel: 23 }, { directorEnabled: false, freezeSnake: frozen });
  const s = stateOf(sim);
  s.rampActive = false;
  return { b, sim, s };
};

it('MEC-017-R2 plus area has arm 2 and is clipped to the board', () => {
  expect(plusArea(8, 8, 2, 17, 17)).toHaveLength(9);
  expect(plusArea(0, 0, 2, 17, 17)).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }]);
});

it('MEC-017-R3 stepBlast counts down, activates once and finishes after activeMs', () => {
  const b2: BlastState = { area: plusArea(8, 8, 2, 17, 17), countdownMs: 2, activeMs: 2, phase: 'count' };
  expect([stepBlast(b2), stepBlast(b2), stepBlast(b2), stepBlast(b2)]).toEqual(['keep', 'activated', 'keep', 'done']);
  expect(b2.phase).toBe('done');
});

it('MEC-017-R1 bomb warns at least 900 ms and lands only when no snake cell is on it', () => {
  const { b, s } = fixture();
  expect(b.bomb.warnMs).toBeGreaterThanOrEqual(b.fairness.minWarnMs);
  const cells = bomb.spawn(s, spawnCtx(s, b));
  expect(cells).toHaveLength(1);
  const m = s.families.bomb.bombs[0]!;
  expect(solidCauseAt(s, m.x, m.y)).toBeNull();              // warn: passable
  expect(bfsWall(s, m.x, m.y)).toBe(true);
  const events: unknown[] = [];
  const ctx = { balance: b, snakeOn: (x: number, y: number) => x === m.x && y === m.y, emit: (e: unknown) => events.push(e), hitHead: () => {} };
  for (let i = 0; i < b.bomb.warnMs + 50; i++) bomb.update(s, ctx);
  expect(m.landed).toBe(false);
  const free = { ...ctx, snakeOn: () => false };
  bomb.update(s, free);
  expect(m.landed).toBe(true);
  expect(solidCauseAt(s, m.x, m.y)).toBe('bomb');
  expect(m.blast!.phase).toBe('count');
  expect(m.blast!.countdownMs).toBe(b.bomb.countdownMs);
});

it('MEC-017-R1 spawn rejects a cell whose area holds a reserved cell', () => {
  const { b, s } = fixture();
  s.mango = { x: 0, y: 0, golden: false, leftMs: 5000, totalMs: 5000 };
  for (let seed = 0; seed < 30; seed++) {
    s.families.bomb.bombs = [];
    if (!bomb.spawn(s, { ...spawnCtx(s, b) })) continue;
    const m = s.families.bomb.bombs[0]!;
    expect(plusArea(m.x, m.y, b.bomb.arm, 17, 17).some(c => c.x === 0 && c.y === 0)).toBe(false);
  }
});

it('MEC-017-R2 countdown lasts 3000 ms and the area is reserved during it', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 2, y: 15 }, { x: 1, y: 15 }, { x: 0, y: 15 }];
  s.families.bomb.bombs.push(landed(b, 8, 8, b.bomb.countdownMs, 96));
  for (const c of plusArea(8, 8, 2, 17, 17)) expect(reservedByFamilies(s, c.x, c.y)).toBe(true);
  sim.advance(b.bomb.countdownMs - 1);
  expect(sim.drainEvents().some(e => e.type === 'bombBlast')).toBe(false);
  expect(s.families.bomb.bombs[0]!.blast!.phase).toBe('count');
  sim.advance(1);
  expect(sim.drainEvents().find(e => e.type === 'bombBlast')).toMatchObject({ x: 8, y: 8, cells: plusArea(8, 8, 2, 17, 17) });
  expect(solidCauseAt(s, 8, 8)).toBeNull();
  expect(headHitAt(s, 8, 6)?.kind).toBe('area');
});

it('MEC-017-R3 head in the area when the blast fires dies with cause bomb; body in the area is safe', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 }, { x: 13, y: 8 }];
  s.families.bomb.bombs.push(landed(b, 8, 8, 10, 96));
  sim.advance(10);
  expect(sim.drainEvents().find(e => e.type === 'died')).toMatchObject({ cause: 'bomb', x: 10, y: 8 });
  const f2 = fixture();
  f2.s.snake = [{ x: 8, y: 12 }, { x: 8, y: 11 }, { x: 8, y: 10 }, { x: 8, y: 9 }, { x: 8, y: 8 }];
  f2.s.families.bomb.bombs.push(landed(f2.b, 8, 6, 10, 96));
  f2.sim.advance(200);
  expect(f2.s.status).toBe('playing');
  expect(f2.s.families.bomb.bombs).toEqual([]);
});

it('MEC-017-R3 blast is active for exactly one base tick at activation, also during slow-mo', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 2, y: 15 }, { x: 1, y: 15 }, { x: 0, y: 15 }];
  s.slowmo = { leftMs: 10000 };
  s.families.bomb.bombs.push(landed(b, 8, 8, 1, 1));       // stale activeMs: activation re-measures it
  sim.advance(1);
  const blast = s.families.bomb.bombs[0]!.blast!;
  expect(blast.phase).toBe('active');
  expect(blast.activeMs).toBe(96);
  sim.advance(95);
  expect(headHitAt(s, 8, 8)?.kind).toBe('area');
  sim.advance(1);
  expect(s.families.bomb.bombs).toEqual([]);
  expect(headHitAt(s, 8, 8)).toBeNull();
});

it('MEC-017-R4 shield absorbs one blast without bonk or rubble', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 9, y: 8 }, { x: 10, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 }];
  s.shield = { leftMs: 5000 };
  s.families.bomb.bombs.push(landed(b, 8, 8, 10, 96));
  const acc = s.acc;
  sim.advance(200);
  expect(s.status).toBe('playing');
  expect(s.shield).toBeNull();
  expect(s.families.rubble).toEqual([]);
  expect(sim.drainEvents().find(e => e.type === 'shieldBroke')).toMatchObject({ family: 'bomb', rubble: null });
  expect(s.acc).toBeGreaterThanOrEqual(acc);
});

it('MEC-017-R4 shield breaking the bomb cell defuses it (no bombBlast event)', () => {
  const { b, sim, s } = fixture(false);
  s.snake = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }];
  s.dir = { x: 1, y: 0 };
  s.mango = { x: 0, y: 16, golden: false, leftMs: 50000, totalMs: 50000 };
  s.shield = { leftMs: 50000 };
  s.families.bomb.bombs.push(landed(b, 8, 8, b.bomb.countdownMs, 96));
  sim.advance(200);
  const events = sim.drainEvents();
  expect(events.find(e => e.type === 'shieldBroke')).toMatchObject({ family: 'bomb', x: 8, y: 8 });
  expect(s.families.bomb.bombs).toEqual([]);
  sim.advance(b.bomb.countdownMs);
  expect([...events, ...sim.drainEvents()].some(e => e.type === 'bombBlast')).toBe(false);
});

it('MEC-017-R5 a blast does not affect other bombs, hazards, mangoes or orbs', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 2, y: 15 }, { x: 1, y: 15 }, { x: 0, y: 15 }];
  s.mango = { x: 8, y: 10, golden: false, leftMs: 50000, totalMs: 50000 };
  s.families.bomb.bombs.push(landed(b, 8, 8, 10, 96, 1), landed(b, 9, 8, b.bomb.countdownMs, 96, 2));
  sim.advance(200);
  expect(s.families.bomb.bombs.map(m => [m.id, m.blast!.phase, m.blast!.countdownMs])).toEqual([[2, 'count', b.bomb.countdownMs - 200]]);
  expect(s.mango).toMatchObject({ x: 8, y: 10 });
  expect(s.status).toBe('playing');
});

it('MEC-017-R6 bomb is introduced at L23 only', () => {
  const b = loadBalance();
  expect(introducedAt(b, 23)).toBe('bomb');
  expect(familyRow(b, 22).weights.bomb).toBeUndefined();
  for (let l = 23; l <= 30; l++) expect(familyRow(b, l).weights.bomb).toBe(2);
  expect(b.bomb).toEqual({ warnMs: 1200, countdownMs: 3000, arm: 2, maxActive: 1, tries: 40 });
  expect(bomb).toMatchObject({ key: 'bomb', cause: 'bomb', capClass: 'small', maxActiveKey: 'bomb.maxActive', breakable: true });
  expect(bomb.emitsIncoming ?? false).toBe(false);                // MEC-017-L3 the director emits hazardIncoming
});

it('MEC-017 BombView snapshot exposes state, time left and area', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 2, y: 15 }, { x: 1, y: 15 }, { x: 0, y: 15 }];
  s.families.bomb.bombs.push(landed(b, 8, 8, 2500, 96));
  const view = sim.snapshot().families.bomb;
  expectTypeOf(view).toEqualTypeOf<readonly BombView[]>();
  expect(view).toEqual([{ id: 1, x: 8, y: 8, state: 'count', leftMs: 2500, area: plusArea(8, 8, 2, 17, 17) }]);
});

it('MEC-004-R1 registry init fails clearly when a family is undefined (import-order cycle guard)', () => {
  expect(DEFAULT_FAMILIES.every(Boolean)).toBe(true);
  expect(() => assertFamiliesDefined([DEFAULT_FAMILIES[0]!, undefined as unknown as HazardFamily])).toThrowError(/index 1.*import/);
});

it('MEC-017-R3 a blast hits at most once even if the tick shortens after a Shield absorb', () => {
  const { b, s } = fixture();
  s.snake = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
  s.shield = { leftMs: 5000 };
  s.families.bomb.bombs.push({ ...landed(b, 8, 8, 0, 500), blast: { area: plusArea(8, 8, b.bomb.arm, 17, 17), countdownMs: 0, activeMs: 500, phase: 'active' } });
  const ctx = hitCtx(s);
  expect(resolveHeadCell(s, 6, 8, ctx)).toEqual({ kind: 'absorbed', family: 'bomb' });   // Shield absorbs the entry
  expect(s.shield).toBeNull();
  // A shorter tick lets a second snake move land inside the same active window: it must not hit again.
  expect(resolveHeadCell(s, 7, 8, ctx)).toEqual({ kind: 'clear' });
  expect(s.families.bomb.bombs[0]!.blast!.hit).toBe(true);
});
