import { describe, it, expect } from 'vitest';
import type { SimEvent } from '../../src/core';
import { cellBfsWall, cellReserved, cellSolidCause } from '../../src/core/cells';
import { exportState } from '../../src/core/sim';
import { circle, simFromAscii, SQUARE } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const line = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => [n + 1 - i, 10]);
const options = { bestLevel: 6, startEnergy: 100, loadout: ['slowmo', 'tailSnip'] as const };
const mk = (n: number) => simFromAscii(b, [], { snake: line(n), quiet: true, options });
type Snipped = Extract<SimEvent, { type: 'tailSnipped' }>;

describe('MEC-006 Tail Snip', () => {
  it('MEC-006-R21 cut counts for lengths 3 through 10', () => {
    const cuts = [3, 4, 5, 6, 7, 8, 9, 10].map(n => {
      const sim = mk(n); sim.useSkill(1);
      const e = sim.drainEvents().find(x => x.type === 'tailSnipped') as Snipped | undefined;
      return e ? e.cut : 'noTarget';
    });
    expect(cuts).toEqual(['noTarget', 1, 2, 3, 3, 4, 4, 5]);
  });
  it('MEC-006-R20 tail snip at length 3 is noTarget with no energy spent', () => {
    const sim = mk(3); sim.useSkill(1);
    expect(sim.snapshot().energy).toBe(100);
    expect(sim.drainEvents()).toEqual([{ type: 'skillRejected', slot: 1, skill: 'tailSnip', reason: 'noTarget' }]);
  });
  it('MEC-006-R21 cut keeps head, direction and turn queue; tailFrom is the new tail', () => {
    const sim = mk(6); sim.turn(0, -1); const before = exportState(sim); sim.useSkill(1);
    expect(sim.snapshot()).toMatchObject({ snake: [{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }],
      tailFrom: { x: 5, y: 10 }, dir: before.dir, heading: { x: 0, y: -1 } });
    expect(exportState(sim).queue).toEqual(before.queue);
    expect(sim.drainEvents().at(-1)).toEqual({ type: 'tailSnipped', cut: 3,
      cells: [{ x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }] });
  });
  it('MEC-006-R22 cut cell in the head next cell is not a wall with queued or current direction', () => {
    for (const queued of [true, false]) {
      const sim = simFromAscii(b, [], { snake: SQUARE, dir: queued ? [0, 1] : [-1, 0], quiet: true, options });
      if (queued) sim.turn(-1, 0);
      sim.useSkill(1);
      expect(sim.drainEvents().at(-1)).toEqual({ type: 'tailSnipped', cut: 1, cells: [] });
      expect(sim.snapshot().snipWall).toEqual([]);
      sim.advance(140); expect(sim.snapshot().status).toBe('playing');
    }
  });
  it('MEC-006-R22 wall is solid until 3000 ms, crumbles until 3450, then disappears', () => {
    const sim = mk(6); sim.useSkill(1); sim.drainEvents(); circle(sim, 2999);
    expect(sim.snapshot().snipWall).toHaveLength(3);
    expect(sim.snapshot().snipWall.every(c => c.state === 'solid' && c.leftMs === 1)).toBe(true);
    circle(sim, 1);
    expect(sim.snapshot().snipWall.every(c => c.state === 'crumble' && c.leftMs === 450)).toBe(true);
    expect(sim.drainEvents()).toContainEqual({ type: 'skillEnded', skill: 'tailSnip', reason: 'timeout' });
    const state = exportState(sim);
    expect(cellSolidCause(state, 2, 10)).toBeNull();
    expect(cellBfsWall(state, 2, 10)).toBe(true); expect(cellReserved(state, 2, 10)).toBe(true);
    circle(sim, 449); expect(sim.snapshot().snipWall[0]?.leftMs).toBe(1);
    circle(sim, 1); expect(sim.snapshot().snipWall).toEqual([]);
  });
  it('MEC-006-R14 tail snip is active while its wall is solid and may recast during crumble', () => {
    const sim = mk(8); sim.useSkill(1); sim.drainEvents(); sim.useSkill(1);
    expect(sim.drainEvents()).toEqual([{ type: 'skillRejected', slot: 1, skill: 'tailSnip', reason: 'active' }]);
    circle(sim, 3000); sim.drainEvents(); sim.useSkill(1);
    expect(sim.drainEvents()).toContainEqual({ type: 'skillUsed', slot: 1, skill: 'tailSnip', level: 1, energyBefore: 70, energyAfter: 40 });
    expect(sim.snapshot().length).toBe(3);
    expect(exportState(sim).snipWalls[0]?.state).toBe('crumble');
  });
  it('MEC-006-R23 entering snip wall kills with cause snipWall; wall blocks BFS and placement', () => {
    const sim = simFromAscii(b, ['...S'], { snake: [[2, 0], [1, 0], [0, 0]], quiet: true });
    const state = exportState(sim);
    expect(cellBfsWall(state, 3, 0)).toBe(true); expect(cellReserved(state, 3, 0)).toBe(true);
    sim.advance(140);
    expect(sim.drainEvents()).toEqual([{ type: 'died', cause: 'snipWall', x: 2, y: 0 }]);
  });
  it('MEC-003-R8 snip walls survive a level up and end by their own lifetime', () => {
    const sim = simFromAscii(b, [...Array<string>(10).fill(''), '........M'], {
      snake: line(6), quiet: true, options, extraState: { progress: 3 },
    });
    sim.useSkill(1); sim.advance(140);
    expect(sim.snapshot().level).toBe(2);
    expect(sim.snapshot().snipWall.length).toBeGreaterThan(0);
    expect(sim.snapshot().snipWall.every(c => c.state === 'solid' && c.leftMs === b.skills.tailSnip.wallLifeMs - 140)).toBe(true);
  });
});
