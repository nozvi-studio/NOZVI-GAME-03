import { describe, it, expect } from 'vitest';
import { type SimState } from '../../src/core';
import { exportState } from '../../src/core/sim';
import { circle, simFromAscii } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const snake: [number, number][] = [[2, 0], [1, 0], [0, 0], [0, 1]];
const mk = (extra: Partial<SimState> = {}, rows: string[] = [], startLevel = 1) => simFromAscii(b, rows, {
  snake, quiet: true, options: { startLevel, bestLevel: 6, startEnergy: 100, loadout: ['slowmo', null] }, extraState: extra,
});

describe('MEC-006 Slow-mo', () => {
  it('MEC-006-R16 slow-mo ends with skillEnded timeout after 4000 ms', () => {
    const sim = mk(); sim.useSkill(0); sim.drainEvents();
    circle(sim, 3999); expect(sim.snapshot().slowmo).toEqual({ leftMs: 1 });
    expect(sim.drainEvents()).toEqual([]);
    circle(sim, 1); expect(sim.snapshot().slowmo).toBeNull();
    expect(sim.drainEvents()).toEqual([{ type: 'skillEnded', skill: 'slowmo', reason: 'timeout' }]);
  });
  it('MEC-006-R16 slow-mo timer is frozen in the transition and ends at 5000 ms', () => {
    const sim = mk({ progress: 3 }, ['...M']); sim.useSkill(0); sim.drainEvents();
    sim.advance(224); expect(sim.snapshot().phase).toBe('transition');
    expect(sim.snapshot().slowmo).toEqual({ leftMs: 3776 }); sim.drainEvents();
    sim.advance(1000); expect(sim.snapshot().slowmo).toEqual({ leftMs: 3776 }); sim.drainEvents();
    circle(sim, 3775); expect(sim.snapshot().slowmo).toEqual({ leftMs: 1 }); sim.drainEvents();
    circle(sim, 1);
    expect(sim.snapshot().timeMs).toBe(5000);
    expect(sim.drainEvents()).toContainEqual({ type: 'skillEnded', skill: 'slowmo', reason: 'timeout' });
  });
  it('MEC-006-R17 slow-mo tick = round(base x 1.6) including level-up', () => {
    const sim = mk({ progress: 3 }, ['...M']); sim.useSkill(0);
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(224);
    sim.advance(223); expect(sim.snapshot().level).toBe(2);
    sim.advance(1001); expect(sim.snapshot().tickMs).toBe(221);
  });
  it('MEC-006-R17 slow-mo multiplies a changing checkpoint ramp', () => {
    const sim = mk({}, ['...M'], 4); sim.useSkill(0);
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(224);
    sim.advance(223); expect(sim.snapshot().tickMs).toBe(224);
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(222);
  });
  it('MEC-006-R18 ending slow-mo causes at most one immediate step', () => {
    const sim = mk({ slowmo: { leftMs: 1 }, tickMs: 224, acc: 200 });
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(138); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 4, y: 0 });
  });
  it('MEC-006-EC12 slow-mo ending during a negative accumulator keeps it negative', () => {
    const sim = mk({ slowmo: { leftMs: 1 }, tickMs: 224, acc: -300 }); sim.advance(1);
    expect(exportState(sim).acc).toBe(-299); expect(sim.snapshot().tickAlpha).toBe(0);
    expect(sim.snapshot().snake[0]).toEqual({ x: 2, y: 0 });
  });
  it('MEC-006-R19 rot and hazard timers unchanged by slow-mo', () => {
    const sim = mk({}, ['........M', '........#']); sim.useSkill(0);
    circle(sim, 1000);
    expect(sim.snapshot().mango?.ageMs).toBe(1000);
    expect(sim.snapshot().hazards[0]?.t).toBe(1000);
  });
  it('MEC-002-R10 slow-mo does not slow rot', () => {
    const sim = mk({}, ['........M']); sim.useSkill(0); circle(sim, 1000);
    expect(sim.snapshot().mango?.ageMs).toBe(1000);
  });
});
