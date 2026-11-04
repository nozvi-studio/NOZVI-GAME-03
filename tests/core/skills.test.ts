import { describe, it, expect } from 'vitest';
import { createSim, type Sim, type SimEvent, type SimState } from '../../src/core';
import { exportState } from '../../src/core/sim';
import { simFromAscii } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
type Rejected = Extract<SimEvent, { type: 'skillRejected' }>;
const reason = (sim: Sim, slot: 0 | 1) => {
  sim.useSkill(slot);
  return (sim.drainEvents().find(e => e.type === 'skillRejected') as Rejected | undefined)?.reason;
};
const line = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => [n + 1 - i, 10]);
const mk = (energy: number, extra: Partial<SimState> = {}) => simFromAscii(b, [], {
  snake: line(3), quiet: true,
  options: { startLevel: 6, bestLevel: 6, startEnergy: energy, loadout: ['slowmo', 'tailSnip'] }, extraState: extra,
});

describe('MEC-006 skill activation', () => {
  it('MEC-006-R11 exposes synchronous skill input', () => {
    expect(createSim(b, 1)).toHaveProperty('useSkill', expect.any(Function));
  });
  it('MEC-006-R13 rejection reasons and their order (empty, active, energy, noTarget)', () => {
    const one = simFromAscii(b, [], { snake: line(4), quiet: true,
      options: { startLevel: 3, bestLevel: 3, startEnergy: 100, loadout: ['slowmo', null] } });
    expect(reason(one, 1)).toBe('empty');
    expect(reason(one, 0)).toBeUndefined();
    const act = mk(79); act.useSkill(0); act.drainEvents();
    expect(reason(act, 0)).toBe('active');
    expect(reason(mk(39), 0)).toBe('energy');
    expect(reason(mk(29), 1)).toBe('energy');
    expect(reason(mk(100), 1)).toBe('noTarget');
  });
  it('MEC-006-R15 success spends cost and emits energyChanged then skillUsed', () => {
    const sim = mk(100); sim.useSkill(0);
    expect(sim.drainEvents()).toEqual([
      { type: 'energyChanged', energy: 60, delta: -40, source: 'skill' },
      { type: 'skillUsed', slot: 0, skill: 'slowmo', level: 6, energyBefore: 100, energyAfter: 60 },
    ]);
    expect(sim.snapshot()).toMatchObject({ energy: 60, slowmo: { leftMs: 4000 }, skills: [
      { slot: 0, id: 'slowmo', cost: 40, affordable: true, active: true, leftMs: 4000 },
      { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 },
    ] });
  });
  it('MEC-006-R11 rejected press is not retried; turn queue unchanged by useSkill', () => {
    const sim = mk(10); sim.turn(0, -1);
    const before = exportState(sim).queue;
    sim.useSkill(0);
    expect(exportState(sim).queue).toEqual(before);
    expect(sim.snapshot().heading).toEqual({ x: 0, y: -1 });
    expect(sim.drainEvents()).toEqual([{ type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' }]);
    sim.advance(1000);
    expect(sim.drainEvents().some(e => e.type === 'skillUsed')).toBe(false);
    expect(sim.snapshot().energy).toBe(10);
  });
  it('MEC-006-R12 useSkill after the run is over is a no-op with no event', () => {
    const sim = mk(100, { status: 'over', outcome: { won: false, cause: 'wall' } });
    const before = exportState(sim); sim.useSkill(0); sim.useSkill(1);
    expect(exportState(sim)).toEqual(before); expect(sim.drainEvents()).toEqual([]);
  });
  it('MEC-006-R14 different skills can be active together and clones keep independent plain state', () => {
    const sim = simFromAscii(b, [], { snake: line(6), quiet: true,
      options: { bestLevel: 6, startEnergy: 100, loadout: ['slowmo', 'tailSnip'] } });
    sim.useSkill(0); sim.useSkill(1);
    expect(sim.snapshot()).toMatchObject({ energy: 30, skills: [
      { active: true, leftMs: 4000 }, { active: true, leftMs: 3000 },
    ] });
    const before = exportState(sim), clone = sim.clone();
    expect(JSON.parse(JSON.stringify(before))).toEqual(before);
    clone.advance(1);
    expect(exportState(sim)).toEqual(before);
    expect(clone.snapshot().slowmo).toEqual({ leftMs: 3999 });
  });
  it('MEC-006-R11 timed skill and turn calls are deterministic across advance chunking', () => {
    const sim = simFromAscii(b, [], { snake: line(6), quiet: true,
      options: { bestLevel: 6, startEnergy: 100, loadout: ['slowmo', 'tailSnip'] } });
    const chunked = sim.clone();
    for (const run of [sim, chunked]) { run.useSkill(0); run.useSkill(1); }
    const turns = [[0, 1], [-1, 0], [0, -1], [1, 0]] as const;
    for (let i = 0; i < 9; i++) {
      const [x, y] = turns[i % 4]!;
      sim.turn(x, y); chunked.turn(x, y);
      const ms = i === 8 ? 416 : 448;
      sim.advance(ms);
      for (let left = ms; left > 0;) { const dt = Math.min(left, 17); chunked.advance(dt); left -= dt; }
    }
    expect(sim.snapshot()).toMatchObject({ status: 'playing', timeMs: 4000, slowmo: null, snipWall: [] });
    expect(exportState(chunked)).toEqual(exportState(sim));
  });
  it('MEC-006-R14 shield and mangoRain activate and report active with their leftMs', () => {
    for (const id of ['shield', 'mangoRain'] as const) {
      const sim = createSim(b, 1, { bestLevel: 16, startEnergy: 100, loadout: [id, null] });
      sim.useSkill(0);
      expect(sim.snapshot().energy).toBe(100 - b.skills[id].cost);
      expect(sim.snapshot().skills[0]).toMatchObject({ id, active: true, leftMs: b.skills[id].durationMs });
      sim.useSkill(0);
      expect(sim.drainEvents().at(-1)).toEqual({ type: 'skillRejected', slot: 0, skill: id, reason: 'active' });
    }
  });
});
