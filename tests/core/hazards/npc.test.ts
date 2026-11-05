import { it, expect, expectTypeOf } from 'vitest';
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { npc, routeCells } from '../../../src/core/hazards/npc';
import { moverCell, newMover } from '../../../src/core/hazards/blocks/mover';
import { spawnCtx, directorOptions, updateDirector } from '../../../src/core/hazards/director';
import { solidCauseAt, bfsWall, reservedByFamilies, headHitAt } from '../../../src/core/hazards/queries';
import { introducedAt, familyRow } from '../../../src/core/level';
import { buildTimeline } from '../../../src/core/fairness/timeline';
import { key, nearHead } from '../../../src/core/grid';
import { rngFrom } from '../../../src/core/rng';
import type { Cell, NpcView } from '../../../src/core/types';
import { loadBalance, soloTable } from '../../support/balance';
import { buildBoard } from '../../support/board';
import { hitCtx } from '../../support/fakeFamily';
import { moverCells, checkMoverTransitions } from '../../support/fuzz';

const mk = (cells: Cell[], cellMs = 400, lifeMs = 15000) => newMover(cells, 1500, cellMs, true, lifeMs);
const route = [2, 3, 4, 5, 6].map(x => ({ x, y: 3 }));
const fixture = (freezeSnake = true) => {
  const b = soloTable(loadBalance(), 'npc');
  const sim = createSimInternal(b, 21, { startLevel: 21 }, { directorEnabled: false, freezeSnake });
  const s = stateOf(sim);
  s.rampActive = false;
  return { b, sim, s };
};

it('MEC-015-R2 routeCells builds straight and L routes', () => {
  expect(routeCells({ x: 2, y: 2 }, 3, null, { x: 1, y: 0 }, { x: 0, y: 1 })).toEqual([
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }]);
  expect(routeCells({ x: 2, y: 2 }, 4, 2, { x: 1, y: 0 }, { x: 0, y: 1 })).toEqual([
    { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }]);
});
it('MEC-015-R1 variants follow config weights', () => {
  for (const chickenWeight of [1, 0]) {
    const b = loadBalance(j => { j.npc.variants.chicken.weight = chickenWeight; });
    const variants = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) {
      const s = buildBoard({ head: [8, 8], level: 21, seed });
      expect(npc.spawn(s, spawnCtx(s, b))).not.toBeNull();
      const n = s.families.npc.npcs[0]!;
      variants.add(n.variant);
      const cfg = b.npc.variants[n.variant];
      expect(n.mover.path.length).toBeGreaterThanOrEqual(cfg.routeLen[0]);
      expect(n.mover.path.length).toBeLessThanOrEqual(cfg.routeLen[1]);
      expect(n.mover.cellMs).toBe(cfg.cellMs);
      expect(n.mover.lifeMs).toBeGreaterThanOrEqual(b.npc.lifeMs);
      expect(n.mover.lifeMs).toBeLessThan(b.npc.lifeMs + b.npc.lifeRandMs);
      const directions = new Set(n.mover.path.slice(1).map((c, i) => {
        const prev = n.mover.path[i]!;
        expect(Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y)).toBe(1);
        return `${c.x - prev.x},${c.y - prev.y}`;
      }));
      expect(directions.size).toBeLessThanOrEqual(2);
      expect(new Set(n.mover.path.map(c => `${c.x},${c.y}`)).size).toBe(n.mover.path.length);
    }
    expect([...variants].sort()).toEqual(chickenWeight ? ['cat', 'chicken'] : ['cat']);
  }
});
it('MEC-015-R3 route is telegraphed for 1500 ms before the first move and respects rule 2', () => {
  const b = loadBalance(), s = buildBoard({ head: [8, 8], dir: [1, 0], level: 21 });
  const cells = npc.spawn(s, spawnCtx(s, b))!;
  expect(cells.length).toBeGreaterThan(1);
  for (const c of cells) {
    expect(Math.abs(c.x - 8) + Math.abs(c.y - 8)).toBeGreaterThanOrEqual(4);
    expect(nearHead(s.snake[0]!, s.dir, c.x, c.y, b.fairness.nearHeadDist, b.fairness.frontLaneCells)).toBe(false);
    expect(reservedByFamilies(s, c.x, c.y)).toBe(true);
    expect(solidCauseAt(s, c.x, c.y)).toBeNull();
    expect(bfsWall(s, c.x, c.y)).toBe(false);
  }
  const n = s.families.npc.npcs[0]!, ctx = hitCtx(s);
  for (let t = 1; t < 1500; t++) {
    npc.update(s, ctx);
    expect(moverCell(n.mover)).toBeNull();
  }
  npc.update(s, ctx);
  expect(moverCell(n.mover)).toEqual(cells[0]);
  expect(bfsWall(s, cells[0]!.x, cells[0]!.y)).toBe(true);
  expect(headHitAt(s, cells[0]!.x, cells[0]!.y)?.kind).toBe('mover');
});
it('MEC-015-R2 placement checks the whole route with the start as a BFS wall and preserves failed state', () => {
  const b = loadBalance(), s = buildBoard({ level: 21 }), before = structuredClone(s.families.npc);
  let tries = 0;
  expect(npc.spawn(s, { ...spawnCtx(s, b), candidateValid: (_s, cells, opts) => {
    tries++;
    expect(opts).toEqual({ nearDist: b.fairness.nearHeadDist, wallCells: [cells[0]] });
    return false;
  } })).toBeNull();
  expect(tries).toBeGreaterThan(0);
  expect(tries).toBeLessThanOrEqual(b.npc.tries);
  expect(s.families.npc).toEqual(before);
});
it('MEC-015-R4 ping-pong reverses at the ends', () => {
  const { sim, s } = fixture();
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk(route) });
  sim.advance(1500 + 400 * 4);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual(route[4]);
  sim.advance(400);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual(route[3]);
  sim.advance(400 * 4);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual(route[1]);
});
it('MEC-015-R5 an NPC waits for a body cell and the body is never hit', () => {
  const { sim, s } = fixture();
  s.snake = [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 }];
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk(route) });
  sim.advance(1500 + 400 * 6);
  expect(s.status).toBe('playing');
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual({ x: 3, y: 3 });
  s.snake = [{ x: 4, y: 1 }]; sim.advance(1);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual({ x: 4, y: 3 });
});
it('MEC-015-R5 NPC waits for a solid and retries when it disappears', () => {
  const b = loadBalance(), s = buildBoard({ walls: [[3, 3]] }), ctx = hitCtx(s);
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk(route) });
  for (let t = 0; t < b.npc.warnMs + 800; t++) npc.update(s, ctx);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual(route[0]);
  s.families.rock = []; npc.update(s, ctx);
  expect(moverCell(s.families.npc.npcs[0]!.mover)).toEqual(route[1]);
});
it('MEC-015-R6 NPC leaves at a route end after its life', () => {
  const { sim, s } = fixture();
  const mover = mk(route);
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover });
  sim.advance(1500 + 15000 - 1);
  expect(s.families.npc.npcs).toHaveLength(1);
  sim.advance(400 * route.length);
  expect(s.families.npc.npcs).toEqual([]);
  expect([0, route.length - 1]).toContain(mover.pos);
});
it.each(['cat', 'chicken'] as const)('MEC-015-R7 head moving into the NPC dies with the variant cause %s', variant => {
  const { sim, s } = fixture(false), head = s.snake[0]!, c = { x: head.x + 1, y: head.y };
  s.families.npc.npcs.push({ id: 1, variant, mover: { ...mk([c, { x: c.x, y: c.y + 1 }]), pos: 0, state: 'move', t: 0 } });
  sim.advance(sim.snapshot().tickMs);
  expect(sim.drainEvents().find(e => e.type === 'died')).toMatchObject({ cause: variant });
});
it('MEC-015-R7 shield knocks the NPC away', () => {
  const { sim, s } = fixture(false), head = s.snake[0]!, c = { x: head.x + 1, y: head.y };
  s.shield = { leftMs: 5000 };
  s.families.npc.npcs.push({ id: 1, variant: 'chicken', mover: { ...mk([c, { x: c.x, y: c.y + 1 }], 220), pos: 0, state: 'move', t: 0 } });
  sim.advance(sim.snapshot().tickMs);
  expect(s.status).toBe('playing'); expect(s.shield).toBeNull();
  expect(s.families.npc.npcs).toEqual([]);
  expect(sim.drainEvents().filter(e => e.type === 'shieldBroke')).toMatchObject([{ family: 'npc' }]);
});
it.each([false, true])('MEC-015-R7 an NPC entering the head reports its variant or breaks Shield (%s)', shield => {
  const { sim, s } = fixture();
  s.snake = [{ x: 4, y: 3 }, { x: 4, y: 4 }];
  s.shield = shield ? { leftMs: 5000 } : null;
  s.families.npc.npcs.push({ id: 1, variant: 'chicken', mover: mk(route, 220) });
  sim.advance(1500 + 440);
  const events = sim.drainEvents();
  expect(events.filter(e => e.type === 'moverHit')).toEqual([{ type: 'moverHit', family: 'npc', x: 4, y: 3 }]);
  expect(s.status).toBe(shield ? 'playing' : 'over');
  if (shield) expect(s.families.npc.npcs).toEqual([]);
  else expect(events.find(e => e.type === 'died')).toMatchObject({ cause: 'chicken' });
});
it('MEC-015-R8 npc is introduced at L21 only', () => {
  const b = loadBalance();
  for (let level = 1; level <= 30; level++) {
    expect(introducedAt(b, level) === 'npc').toBe(level === 21);
    expect(familyRow(b, level).weights.npc ?? 0).toBe(level >= 21 ? 2 : 0);
  }
});
it('MEC-015-R8 director announces NPCs once and enforces the small family cap', () => {
  const b = soloTable(loadBalance(), 'npc'), s = buildBoard({ level: 21 });
  s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  expect(s.families.npc.npcs).toHaveLength(1);
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'npc' }]);
  expect(directorOptions(s, b)).toEqual([]);
  expect(npc.spawn(s, spawnCtx(s, b))).toBeNull();
});
it('MEC-015-R3 snapshots expose NpcView with no live aliases and TR-B4 extracts warnings then movers', () => {
  const { b, sim, s } = fixture();
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk(route) });
  const snap = sim.snapshot();
  expectTypeOf(snap.families.npc).toEqualTypeOf<readonly NpcView[]>();
  expect(snap.families.npc).toEqual([{ id: 1, variant: 'cat', path: route, cell: null, state: 'warn', t: 0, warnMs: 1500 }]);
  expect(sim.clone().snapshot()).toEqual(snap);
  const warning = moverCells(snap, b.board.cols), since = new Map<string, number>(), errors: string[] = [];
  expect(warning).toHaveLength(route.length);
  expect(warning.every(m => m.id === 'npc:1' && m.phase === 'warn')).toBe(true);
  checkMoverTransitions([], warning, since, new Set(), 0, m => errors.push(m));
  sim.advance(1500);
  const current = moverCells(sim.snapshot(), b.board.cols);
  expect(current).toMatchObject([{ id: 'npc:1', phase: 'mover', cell: key(b.board.cols, 2, 3) }]);
  checkMoverTransitions(warning, current, since, new Set(), 1500, m => errors.push(m));
  expect(errors).toEqual([]);
  checkMoverTransitions(warning, current, new Map([['npc:1', 0]]), new Set([current[0]!.cell]), 1499, m => errors.push(m));
  expect(errors).toEqual([expect.stringContaining('I1 npc:1'), expect.stringContaining('I3 npc:1')]);
  s.families.npc.npcs[0]!.mover.path[0]!.x = 99;
  expect(snap.families.npc[0]!.path[0]).toEqual({ x: 2, y: 3 });
});
it('MEC-015-R4 fairness timeline follows the patrol after its warning', () => {
  const { b, s } = fixture();
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: mk(route) });
  const tl = buildTimeline(b, s, 20), cell = key(b.board.cols, 2, 3);
  expect(tl.lethal[0]!.has(cell)).toBe(false);
  expect(tl.lethal[Math.ceil(1500 / tl.tickMs)]!.has(cell)).toBe(true);
});
it('MEC-015-R1 R2 R3 tuning validates weights, route bounds and the shared warning floor', () => {
  for (const field of ['warnMs', 'lifeMs', 'maxActive', 'tries'])
    expect(() => loadBalance(j => { j.npc[field] = 0; })).toThrow(/npc/);
  expect(() => loadBalance(j => { j.npc.lifeRandMs = -1; })).toThrow(/npc.lifeRandMs/);
  expect(() => loadBalance(j => { j.npc.variants.cat.cellMs = 0; })).toThrow(/npc/);
  expect(() => loadBalance(j => { j.npc.variants.cat.weight = -1; })).toThrow(/npc/);
  expect(() => loadBalance(j => { j.npc.variants.cat.weight = 0; j.npc.variants.chicken.weight = 0; })).toThrow(/npc/);
  for (const bounds of [[2, 5], [5, 3]])
    expect(() => loadBalance(j => { j.npc.variants.cat.routeLen = bounds; })).toThrow(/npc/);
  expect(() => loadBalance(j => { j.npc.warnMs = j.fairness.minWarnMs - 1; })).toThrow(/npc.warnMs/);
  expect(() => loadBalance(j => { j.fairness.minWarnMs = 600; j.npc.warnMs = 600; })).not.toThrow();
  expect(() => loadBalance(j => { j.fairness.minWarnMs = 1; j.npc.warnMs = 559; })).toThrow(/npc.warnMs/);
});
