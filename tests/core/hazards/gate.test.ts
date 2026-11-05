import { it, expect, expectTypeOf } from 'vitest';
import { gate, type GateInstance } from '../../../src/core/hazards/gate';
import { solidCauseAt, bfsWall, reservedByFamilies } from '../../../src/core/hazards/queries';
import { spawnCtx, directorOptions, updateDirector } from '../../../src/core/hazards/director';
import { resolveHeadCell } from '../../../src/core/hazards/collision';
import { escapeExists, searchTimeline } from '../../../src/core/fairness/escape';
import { buildTimeline } from '../../../src/core/fairness/timeline';
import { key, reachable } from '../../../src/core/grid';
import { effectiveTick } from '../../../src/core/skills';
import { introducedAt, familyRow } from '../../../src/core/level';
import { rngFrom } from '../../../src/core/rng';
import { restoreSim, stateOf } from '../../../src/core/sim';
import { FAMILIES, __setFamiliesForTest } from '../../../src/core/hazards/registry';
import { runFamilyFuzz } from '../../support/familyFuzz';
import { buildBoard } from '../../support/board';
import { hitCtx } from '../../support/fakeFamily';
import { loadBalance, soloTable } from '../../support/balance';
import { fixed } from '../../support/rngStub';
import type { GateView } from '../../../src/core/types';

const liveGate = (): GateInstance => ({ id: 1, t: 1500, lifeMs: 14000, state: 'live',
  fence: [4, 5, 7, 8].map(x => ({ x, y: 10, on: true, ageMs: 0 })),
  gate: [{ x: 6, y: 10, delay: 0, up: true, vis: 'up' }] });
const fixture = () => {
  const b = loadBalance(), s = buildBoard({ head: [8, 3], level: 17 }), g = liveGate();
  s.families.gate.gates.push(g);
  return { b, s, g, ctx: hitCtx(s) };
};
const advance = (f: ReturnType<typeof fixture>, ms: number) => {
  for (let i = 0; i < ms; i++) gate.update(f.s, f.ctx);
};

// MEC-014-R1 unrotated gate U at (5,5); placement still uses the real fairness checks.
const uFixture = (count: 1 | 2, mouth = 0) => {
  const b = loadBalance(j => { j.gate.shapePool = ['U']; });
  const s = buildBoard({ head: [12, 12], level: 17 });
  const rng = fixed([0, count - 1, ...(count === 1 ? [mouth] : []), 0, 5, 5]).rng;
  expect(gate.spawn(s, { ...spawnCtx(s, b), rng })).not.toBeNull();
  return { b, s, g: s.families.gate.gates[0]!, ctx: hitCtx(s) };
};

it('MEC-004-R2 MEC-014-R2 gate snapshots survive clone/restore without live aliases', () => {
  const f = fixture(), sim = restoreSim(f.b, f.s), snap = sim.snapshot();
  expect(snap.families.gate).toEqual([{ id: 1, t: 1500, lifeMs: 14000, state: 'live',
    fence: [4, 5, 7, 8].map(x => ({ x, y: 10, on: true, ageMs: 0 })),
    gate: [{ x: 6, y: 10, delay: 0, vis: 'up' }],
  }]);
  expectTypeOf(snap.families.gate[0]!.fence).toEqualTypeOf<readonly {
    x: number; y: number; on: boolean; ageMs: number;
  }[]>();
  expectTypeOf(snap.families.gate).toEqualTypeOf<readonly GateView[]>();
  expect(sim.clone().snapshot()).toEqual(snap);
  const live = stateOf(sim), copy = gate.snapshot(live);
  live.families.gate.gates[0]!.gate[0]!.x = 99;
  live.families.gate.gates[0]!.fence[0]!.x = 98;
  expect(copy).toMatchObject([{ gate: [{ x: 6 }] }]);
  expect(snap.families).toMatchObject({ gate: [{ gate: [{ x: 6 }] }] });
  expect(copy).toMatchObject([{ fence: [{ x: 4 }, { x: 5 }, { x: 7 }, { x: 8 }] }]);
  expect(snap.families.gate[0]!.fence[0]!.x).toBe(4);
});

it('MEC-014-R4 fence cells are BFS walls with cause fence; a closed gate cell has cause gate and is no BFS wall', () => {
  const { s, g } = fixture();
  expect(solidCauseAt(s, 4, 10)).toBe('fence');
  expect(solidCauseAt(s, 6, 10)).toBe('gate');
  expect(bfsWall(s, 6, 10)).toBe(false);
  for (const state of ['warn', 'live', 'crumble'] as const) {
    g.state = state;
    expect(bfsWall(s, 4, 10)).toBe(true);
    expect(reservedByFamilies(s, 6, 10)).toBe(true);
    expect(reservedByFamilies(s, 4, 10)).toBe(true);
  }
});
it('MEC-014-R2 gate cells close for closedMs and open for openMs with a 900 ms warning', () => {
  const f = fixture(), { b, g } = f;
  g.gate[0]!.up = false; g.gate[0]!.vis = 'down';
  advance(f, b.gate.openMs - 1);
  expect(g.gate[0]!.vis).toBe('down');
  advance(f, 1); expect(g.gate[0]!.vis).toBe('warn');
  advance(f, b.gate.warnMs - 1); expect(g.gate[0]!.vis).toBe('warn');
  advance(f, 1); expect(g.gate[0]!.vis).toBe('up');
  advance(f, b.gate.closedMs - 1); expect(g.gate[0]!.up).toBe(true);
  advance(f, 1); expect(g.gate[0]!.vis).toBe('down');
});
it('MEC-014-R1 gate spawn makes a line of 5-7 or a U with 1-2 gate cells', () => {
  const b = loadBalance(), sizes = new Set<number>(), counts = new Set<number>();
  for (let seed = 1; seed <= 200; seed++) {
    const s = buildBoard({ head: [8, 8], dir: [1, 0], level: 17, seed });
    const cells = gate.spawn(s, spawnCtx(s, b));
    expect(cells).not.toBeNull();
    const g = s.families.gate.gates[0]!, all = [...g.fence, ...g.gate];
    expect(cells).toHaveLength(all.length);
    expect([1, 2]).toContain(g.gate.length);
    const line = all.every(c => c.x === all[0]!.x) || all.every(c => c.y === all[0]!.y);
    expect(line ? all.length >= 5 && all.length <= 7 : all.length === 12).toBe(true);
    if (line) for (const c of g.gate) {
      const coords = all.map(p => all[0]!.x === all[1]!.x ? p.y : p.x);
      expect(coords.slice().sort((a, b) => a - b).slice(1, -1)).toContain(all[0]!.x === all[1]!.x ? c.y : c.x);
    }
    expect(g).toMatchObject({ id: 1, t: 0, state: 'warn' });
    expect(g.fence.every(c => !c.on)).toBe(true);
    expect(g.gate.every(c => !c.up && c.vis === 'down')).toBe(true);
    sizes.add(all.length); counts.add(g.gate.length);
  }
  expect([...sizes].sort((a, b) => a - b)).toEqual([5, 6, 7, 12]);
  expect([...counts].sort()).toEqual([1, 2]);
});
it('MEC-014-R3 a gate cell under the snake keeps warning and closes after the snake leaves', () => {
  const f = fixture();
  f.g.t += f.b.gate.openMs + f.b.gate.warnMs - 1;
  f.g.gate[0]!.up = false;
  f.s.snake[0] = { x: 6, y: 10 };
  advance(f, 1); expect(f.g.gate[0]).toMatchObject({ up: false, vis: 'warn' });
  f.s.snake[0] = { x: 8, y: 3 };
  advance(f, 1); expect(f.g.gate[0]).toMatchObject({ up: true, vis: 'up' });
});
it('MEC-014-R2/R3 fence cells land only when free and crumble turns all cells off until removal', () => {
  const f = fixture(), { g, b, s } = f;
  g.t = 0; g.state = 'warn';
  for (const c of g.fence) c.on = false;
  g.gate[0]!.up = false; g.gate[0]!.vis = 'down';
  s.snake[0] = { x: 4, y: 10 };
  advance(f, b.gate.landWarnMs - 1);
  expect(g.fence.every(c => !c.on)).toBe(true);
  advance(f, 1);
  expect(g.state).toBe('live');
  expect(g.fence[0]!.on).toBe(false);
  expect(g.fence[1]!.on).toBe(true);
  expect(g.gate[0]!.vis).toBe('down');
  s.snake[0] = { x: 8, y: 3 };
  advance(f, 1); expect(g.fence[0]!.on).toBe(true);
  g.t = b.gate.landWarnMs + g.lifeMs - 1;
  advance(f, 1);
  expect(g.state).toBe('crumble');
  expect(g.fence.every(c => !c.on)).toBe(true);
  expect(g.gate.every(c => !c.up && c.vis === 'down')).toBe(true);
  expect(gate.count!(s)).toBe(1);
  advance(f, b.hazard.crumbleMs - 1); expect(gate.count!(s)).toBe(1);
  advance(f, 1); expect(gate.count!(s)).toBe(0);
});
it('MEC-014-R8 shield breaks one closed gate cell for the rest of the gate life', () => {
  const f = fixture();
  f.g.t += f.b.gate.openMs + f.b.gate.warnMs;
  f.s.shield = { leftMs: 5000 };
  expect(resolveHeadCell(f.s, 6, 10, f.ctx)).toEqual({ kind: 'broke', family: 'gate' });
  expect(f.s.shield).toBeNull();
  for (let ms = f.g.t; ms <= f.b.gate.landWarnMs + f.g.lifeMs + f.b.hazard.crumbleMs; ms++) {
    expect(solidCauseAt(f.s, 6, 10)).toBeNull();
    gate.update(f.s, f.ctx);
  }
  expect(f.g.fence).toHaveLength(4);
});
it('MEC-014-R8 solid fence cells report fence deaths and Shield removes just that fence cell', () => {
  const f = fixture();
  expect(resolveHeadCell(f.s, 4, 10, f.ctx)).toEqual({ kind: 'death', cause: 'fence' });
  f.s.shield = { leftMs: 5000 };
  expect(resolveHeadCell(f.s, 4, 10, f.ctx)).toEqual({ kind: 'broke', family: 'gate' });
  advance(f, 100);
  expect(solidCauseAt(f.s, 4, 10)).toBeNull();
  expect(f.g.fence).toHaveLength(3);
});
it.each([1, 2] as const)('MEC-014-R1 a closed U mouth seals the 2x2 interior with %i gate cells', count => {
  const f = uFixture(count), { b, s, g } = f;
  g.t = b.gate.landWarnMs + b.gate.openMs + b.gate.warnMs - 1;
  advance(f, 1);
  expect(g.gate.map(({ x, y }) => [x, y])).toEqual(count === 1 ? [[6, 5]] : [[6, 5], [7, 5]]);
  expect(solidCauseAt(s, 5, 5)).toBe('fence');
  expect(solidCauseAt(s, 8, 5)).toBe('fence');
  const inside = { x: 6, y: 6 };
  const closed = reachable(b.board.cols, b.board.rows, inside, (x, y) => solidCauseAt(s, x, y) !== null);
  expect([...closed].sort((a, b) => a - b)).toEqual([108, 109, 125, 126]);
  g.t += b.gate.closedMs - 1;
  advance(f, 1);
  const open = reachable(b.board.cols, b.board.rows, inside, (x, y) => solidCauseAt(s, x, y) !== null);
  expect(open.has(key(b.board.cols, 6, 4))).toBe(true);
});
it('MEC-014-R1 a one-cell U gate can select either mouth cell without changing the P0 fence U', () => {
  const { b, s, g } = uFixture(1, 1);
  expect(g.gate.map(({ x, y }) => [x, y])).toEqual([[7, 5]]);
  expect(g.fence.some(c => c.x === 6 && c.y === 5)).toBe(true);
  expect(b.fence.shapes.U).toEqual([[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 1], [3, 0]]);
  expect(reservedByFamilies(s, 6, 5)).toBe(true);
});
it.each([1, 2] as const)('MEC-014-R10 a snake inside a U trap escapes through reopening with %i gate cells', count => {
  const f = uFixture(count), { b, s, g } = f;
  // The U spawns away from the snake; the snake enters before the mouth closes.
  s.snake = [{ x: 6, y: 6 }, { x: 6, y: 7 }, { x: 7, y: 7 }, { x: 7, y: 6 }];
  s.dir = { x: 1, y: 0 }; s.rampActive = false;
  g.t = b.gate.landWarnMs + b.gate.openMs + b.gate.warnMs - 1;
  advance(f, 1);
  expect(s.snake[0]).toEqual({ x: 6, y: 6 });
  expect(solidCauseAt(s, 6, 5)).toBe('gate');
  expect(solidCauseAt(s, 7, 5)).toBe(count === 1 ? 'fence' : 'gate');
  const outside = { x: 6, y: 4 }, outsideKey = key(b.board.cols, outside.x, outside.y);
  expect(reachable(b.board.cols, b.board.rows, s.snake[0]!, (x, y) => solidCauseAt(s, x, y) !== null).has(outsideKey)).toBe(false);
  const steps = Math.ceil(b.fairness.escapeHorizonMs / effectiveTick(s, b));
  const tl = buildTimeline(b, s, steps), openStep = Math.ceil(b.gate.closedMs / tl.tickMs);
  expect(tl.lethal[openStep - 1]!.has(key(b.board.cols, 6, 5))).toBe(true);
  expect(tl.lethal[openStep]!.has(key(b.board.cols, 6, 5))).toBe(false);
  expect(escapeExists(b, s)).toBe(true);
  expect(searchTimeline(tl, s, outside).firstMoveToGoalSafe).not.toBeNull();
  // A permanently sealed mouth offers survival laps, but no route to the exterior.
  for (const cells of tl.lethal) { cells.add(key(b.board.cols, 6, 5)); cells.add(key(b.board.cols, 7, 5)); }
  expect(searchTimeline(tl, s, outside).firstMoveToGoalSafe).toBeNull();
});
it('MEC-014-R10 fairness sees late-live closed gates reopen while fence cells stay solid', () => {
  const f = fixture(), { b, s, g } = f;
  g.t = b.gate.landWarnMs + b.gate.openMs + b.gate.warnMs;
  const tick = effectiveTick(s, b), openStep = Math.ceil(b.gate.closedMs / tick);
  const timeline = buildTimeline(b, s, openStep);
  const gateCell = key(b.board.cols, 6, 10), fenceCell = key(b.board.cols, 4, 10);
  expect(timeline.lethal[0]!.has(gateCell)).toBe(true);
  expect(timeline.lethal[openStep - 1]!.has(gateCell)).toBe(true);
  expect(timeline.lethal[openStep]!.has(gateCell)).toBe(false);
  expect(timeline.lethal.every(cells => cells.has(fenceCell))).toBe(true);
  expect(escapeExists(b, s)).toBe(true);
});
it('MEC-014-R9 gate is introduced at L17 only', () => {
  const b = loadBalance();
  for (let level = 1; level <= 30; level++) {
    expect(introducedAt(b, level) === 'gate').toBe(level === 17);
    expect(familyRow(b, level).weights.gate ?? 0).toBe(level >= 17 ? 2 : 0);
  }
});
it('MEC-014-R1 director emits one incoming event and gate maxActive counts every lifecycle phase', () => {
  const b = soloTable(loadBalance(), 'gate'), s = buildBoard({ level: 17, mango: [8, 1] });
  s.spawnInMs = 1; updateDirector(s, b, rngFrom(s.rng));
  expect(s.events.filter(e => e.type === 'hazardIncoming')).toEqual([{ type: 'hazardIncoming', family: 'gate' }]);
  for (const state of ['warn', 'live', 'crumble'] as const) {
    s.families.gate.gates[0]!.state = state;
    expect(directorOptions(s, b)).toEqual([]);
    expect(gate.spawn(s, spawnCtx(s, b))).toBeNull();
  }
});
it('MEC-014-R1 failed placement preserves state and supplies only fence cells as BFS walls', () => {
  const b = loadBalance(), s = buildBoard({ level: 17 }), before = structuredClone(s.families.gate);
  let tries = 0;
  expect(gate.spawn(s, { ...spawnCtx(s, b), cellFree: () => true, candidateValid: (_s, cells, opts) => {
    tries++;
    expect(opts.nearDist).toBe(b.fairness.nearHeadDist);
    expect(cells.length - opts.wallCells.length).toBeGreaterThanOrEqual(1);
    expect(cells.length - opts.wallCells.length).toBeLessThanOrEqual(2);
    return false;
  } })).toBeNull();
  expect(tries).toBe(b.gate.tries);
  expect(s.families.gate).toEqual(before);
});
it('MEC-014-R2 balance rejects short warnings, invalid rhythms and invalid shapes or line ranges', () => {
  for (const key of ['warnMs', 'landWarnMs'])
    expect(() => loadBalance(j => { j.gate[key] = 899; })).toThrow(new RegExp('gate.' + key));
  expect(() => loadBalance(j => { j.gate.closedMs = j.gate.openMs; })).toThrow(/gate.closedMs/);
  expect(() => loadBalance(j => { j.gate.shapePool = ['L']; })).toThrow(/gate.shapePool/);
  for (const lineLen of [[7, 5], [0, 7], [5, 8], [4, 7], [5]])
    expect(() => loadBalance(j => { j.gate.lineLen = lineLen; })).toThrow(/gate.lineLen/);
});

it('MEC-014-R2 gate warnings use the shared fairness minimum and L1 tick rule', () => {
  expect(() => loadBalance(j => { j.fairness.minWarnMs = 600; j.gate.warnMs = 600; j.gate.landWarnMs = 600; })).not.toThrow();
  for (const field of ['warnMs', 'landWarnMs']) {
    expect(() => loadBalance(j => { j.fairness.minWarnMs = 600; j.gate[field] = 599; })).toThrow(new RegExp('gate.' + field));
    expect(() => loadBalance(j => { j.fairness.minWarnMs = 1; j.gate[field] = 559; })).toThrow(new RegExp('gate.' + field));
  }
});

it('MEC-004-R17 MEC-014-R3 family invariants detect gate cells closing without a warning', () => {
  const previous = FAMILIES;
  __setFamiliesForTest(previous.map(f => f.key !== 'gate' ? f : { ...gate, update(s, ctx) {
    gate.update(s, ctx);
    for (const g of s.families.gate.gates) for (const c of g.gate) { c.up = true; c.vis = 'up'; }
  } }));
  try {
    const violations = runFamilyFuzz({ family: 'gate', mode: 'solo', startLevel: 17, seeds: 1, durationMs: 10000, escape: 'off' });
    expect(violations.some(v => /I3 gate:/.test(v))).toBe(true);
  } finally { __setFamiliesForTest(previous); }
});
