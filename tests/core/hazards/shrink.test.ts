import { it, expect } from 'vitest';
// simInternal first: it loads the registry before the shrink module (registry <-> family import cycle).
import { createSimInternal, stateOf } from '../../../src/core/simInternal';
import { shrink, ringCells } from '../../../src/core/hazards/shrink';
import { resolveHeadCell } from '../../../src/core/hazards/collision';
import { spawnCtx, directorOptions } from '../../../src/core/hazards/director';
import { newMover } from '../../../src/core/hazards/blocks/mover';
import { bfsWall, reservedByFamilies, solidCauseAt } from '../../../src/core/hazards/queries';
import { familyRow, introducedAt } from '../../../src/core/level';
import { startLevelUp } from '../../../src/core/transition';
import { testCtx } from '../../../src/core/testing';
import type { SimState } from '../../../src/core/types';
import { loadBalance, soloTable } from '../../support/balance';
import { buildState } from '../../support/state';

const fixture = (level = 27) => {
  const b = soloTable(loadBalance(), 'shrink');
  const sim = createSimInternal(b, level, { startLevel: level }, { directorEnabled: false, freezeSnake: true });
  const s = stateOf(sim);
  s.rampActive = false;
  return { b, sim, s };
};
const onRing = (c: { x: number; y: number }) => c.x === 0 || c.y === 0 || c.x === 16 || c.y === 16;
const lane = (cells: [number, number][]) => newMover(cells.map(([x, y]) => ({ x, y })), 1200, 100, false, 0);

it('MEC-018-R2 ring has 64 cells on a 17 x 17 board', () => {
  const r = ringCells(17, 17);
  expect(r).toHaveLength(64);
  expect(r.every(onRing)).toBe(true);
});

it('MEC-018-R3 ring cells close after 2000 ms except under the snake or near the head', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 1, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 9 }, { x: 0, y: 10 }];
  s.dir = { x: 1, y: 0 };
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  expect(shrink.spawn(s, spawnCtx(s, b))).not.toBeNull();
  sim.advance(b.shrink.warnMs - 1);
  expect(solidCauseAt(s, 16, 16)).toBeNull();
  sim.advance(1);
  expect(solidCauseAt(s, 16, 16)).toBe('shrink');
  expect(solidCauseAt(s, 0, 9)).toBeNull();     // body on it
  expect(solidCauseAt(s, 0, 6)).toBeNull();     // Manhattan 3 from head (1,8): inside nearHeadDist 4
  expect(solidCauseAt(s, 0, 5)).toBe('shrink'); // Manhattan 4: outside (nearHead is strict <)
  expect(bfsWall(s, 0, 9)).toBe(true);
});

it('MEC-018-R3 a waiting cell closes as soon as the snake leaves it', () => {
  const { b, sim, s } = fixture();
  s.snake = [{ x: 1, y: 8 }, { x: 0, y: 8 }, { x: 0, y: 9 }, { x: 0, y: 10 }];
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  shrink.spawn(s, spawnCtx(s, b));
  sim.advance(b.shrink.warnMs);
  expect(solidCauseAt(s, 0, 10)).toBeNull();
  s.snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }];
  sim.advance(1);
  expect(solidCauseAt(s, 0, 10)).toBe('shrink');
});

it('MEC-018-R5 all ring cells reopen at warn + closed and the family is removed after crumble', () => {
  const { b, sim, s } = fixture();
  shrink.spawn(s, spawnCtx(s, b));
  sim.advance(b.shrink.warnMs + b.shrink.closedMs - 1);
  expect(solidCauseAt(s, 16, 16)).toBe('shrink');
  sim.advance(1);
  expect(solidCauseAt(s, 16, 16)).toBeNull();
  expect(s.families.shrink.active?.phase).toBe('crumble');
  sim.advance(b.hazard.crumbleMs);
  expect(s.families.shrink.active).toBeNull();
  expect(s.families.shrink.cooldownMs).toBeGreaterThan(0);
});

it('MEC-018-R6 a mango on the ring is displaced off the ring with a fresh timer and no rock', () => {
  const b = loadBalance();
  const s = buildState(b, { snake: [[8, 8], [7, 8], [6, 8]], dir: [1, 0], mango: [0, 3], level: 27 });
  s.mango!.leftMs = 1000;
  expect(shrink.spawn(s, spawnCtx(s, b))).not.toBeNull();
  const m = s.mango!;
  expect(onRing(m)).toBe(false);
  expect(m.leftMs).toBe(m.totalMs);
  expect(s.families.rottenRock).toEqual([]);
  expect(s.events.find(e => e.type === 'mangoDisplaced')).toMatchObject({ from: { x: 0, y: 3 }, to: { x: m.x, y: m.y } });
});

it('MEC-018-R1 shrink does not start while a coconut rolls', () => {
  const { b, s } = fixture();
  s.families.coconut.rolls.push({ id: 1, lane: 'row', index: 5, mover: lane([[0, 5], [1, 5], [2, 5]]) });
  const before = structuredClone(s);
  expect(shrink.spawn(s, spawnCtx(s, b))).toBeNull();
  expect(s).toEqual(before);
});

it('MEC-018-R1 shrink does not start while an NPC route touches the ring', () => {
  const { b, s } = fixture();
  s.families.npc.npcs.push({ id: 1, variant: 'cat', mover: lane([[0, 5], [1, 5], [2, 5]]) });
  const before = structuredClone(s);
  expect(shrink.spawn(s, spawnCtx(s, b))).toBeNull();
  expect(s).toEqual(before);
  s.families.npc.npcs[0]!.mover = lane([[5, 5], [6, 5], [7, 5]]);
  expect(shrink.spawn(s, spawnCtx(s, b))).not.toBeNull();
});

it('MEC-018-R1 shrink does not start when the ring would cut the head off from the mango', () => {
  const { b, s } = fixture();
  // Head on the ring, body closing the only interior neighbour: the path to the mango runs along the ring.
  s.snake = [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 1, y: 5 }, { x: 1, y: 6 }];
  s.dir = { x: 0, y: -1 };
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  const before = structuredClone(s);
  expect(shrink.spawn(s, spawnCtx(s, b))).toBeNull();
  expect(s).toEqual(before);
});

it('MEC-018-R7 orbs and rain mangoes on the ring are removed', () => {
  const { b, s } = fixture();
  s.energy = 4;
  s.orbs.push({ x: 0, y: 5, ageMs: 0 }, { x: 8, y: 8, ageMs: 0 });
  s.rainMangoes.push({ x: 16, y: 2, ageMs: 0, castId: 1 });
  shrink.spawn(s, spawnCtx(s, b));
  expect(s.orbs).toEqual([{ x: 8, y: 8, ageMs: 0 }]);
  expect(s.rainMangoes).toEqual([]);
  expect(s.energy).toBe(4);
  expect(s.events.some(e => e.type === 'orbExpired')).toBe(true);
  expect(s.events.some(e => e.type === 'rainMangoExpired')).toBe(true);
});

it('MEC-018-R7 ring cells are reserved while the ring is active', () => {
  const { b, s } = fixture();
  shrink.spawn(s, spawnCtx(s, b));
  expect(reservedByFamilies(s, 0, 7)).toBe(true);
  expect(reservedByFamilies(s, 8, 8)).toBe(false);
});

it('MEC-018-R8 shrink cells are not breakable', () => {
  const { b, sim, s } = fixture();
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  shrink.spawn(s, spawnCtx(s, b));
  sim.advance(b.shrink.warnMs);
  expect(shrink.breakable).toBe(false);
  s.shield = { leftMs: 5000 };
  expect(resolveHeadCell(s, 16, 16, testCtx(b, s))).toEqual({ kind: 'death', cause: 'shrink' });
  expect(s.shield).not.toBeNull();
  expect(resolveHeadCell(s, 8, 8, testCtx(b, s))).toEqual({ kind: 'clear' });
});

it('MEC-018-R9 shrink is not offered while maze or terrain is active', () => {
  const b = loadBalance();
  const s = buildState(b, { level: 27 });
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  const keys = () => directorOptions(s, b).map(o => o.family.key);
  expect(keys()).toContain('shrink');
  expect(keys()).toContain('maze');
  s.families.terrain.push({ family: 'terrain', t: 0, lifeMs: 9999, cells: [{ x: 5, y: 5, vis: 'down', delay: 0 }] } as never);
  expect(keys()).not.toContain('shrink');
  expect(keys()).not.toContain('maze');
  s.families.terrain = [];
  s.families.shrink.active = { t: 0, phase: 'warn', cells: ringCells(17, 17).map(c => ({ ...c, closed: false })) };
  expect(keys()).not.toContain('shrink');
  expect(keys()).not.toContain('maze');
  expect(keys()).not.toContain('terrain');
});

it('MEC-018-R10 shrink waits shrink.cooldownMs after it ends', () => {
  const { b, sim, s } = fixture();
  shrink.spawn(s, spawnCtx(s, b));
  sim.advance(b.shrink.warnMs + b.shrink.closedMs + b.hazard.crumbleMs);
  expect(s.families.shrink.active).toBeNull();
  expect(s.families.shrink.cooldownMs).toBeGreaterThan(b.shrink.cooldownMs - 2);
  expect(shrink.spawn(s, spawnCtx(s, b))).toBeNull();
  sim.advance(b.shrink.cooldownMs - 1);
  expect(shrink.spawn(s, spawnCtx(s, b))).toBeNull();
  sim.advance(2);
  expect(s.families.shrink.cooldownMs).toBe(0);
  expect(shrink.spawn(s, spawnCtx(s, b))).not.toBeNull();
});

it('MEC-018-R11 shrink is introduced at L27 only', () => {
  const b = loadBalance();
  for (let n = 1; n <= 30; n++) expect((familyRow(b, n).weights.shrink ?? 0) > 0).toBe(n >= 27);
  expect(introducedAt(b, 27)).toBe('shrink');
  expect(introducedAt(b, 26)).toBe('maze');
  expect(introducedAt(b, 28)).toBeUndefined();
});

it('MEC-018-R11 parseBalance rejects shrink before level 27', () => {
  expect(() => loadBalance(j => { j.level.table[0].weights.shrink = 2; })).toThrow(/shrink/);
});

it('MEC-003-R8 a closed ring survives a level up and reopens on its own timer', () => {
  const { b, sim, s } = fixture();
  s.mango = { x: 8, y: 8, golden: false, leftMs: 99999, totalMs: 99999 };
  shrink.spawn(s, spawnCtx(s, b));
  sim.advance(b.shrink.warnMs + 100);
  const lvl = s.level;
  startLevelUp(s as SimState, b, testCtx(b, s));
  expect(s.level).toBe(lvl + 1);
  expect(solidCauseAt(s, 16, 16)).toBe('shrink');
  sim.advance(b.shrink.closedMs - 100);
  expect(s.families.shrink.active?.phase).toBe('crumble');
  expect(solidCauseAt(s, 16, 16)).toBeNull();
});
