import { describe, it, expect } from 'vitest';
import { simFromAscii, circle, SQUARE } from '../../src/core/testing';
import { createSim, exportState } from '../../src/core/sim';
import { nearHead } from '../../src/core/grid';
import { isReserved } from '../../src/core/reserved';
import { placeMango } from '../../src/core/mango';
import { rngFrom } from '../../src/core/rng';
import { goodCells, orbTick } from '../../src/core/energy';
import { testCtx } from '../../src/core/testing';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const types = (evs: { type: string }[]) => evs.map(e => e.type);
const orbSim = (startEnergy: number) => simFromAscii(b, ['...o'], {
  snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true,
  options: { startLevel: 2, startEnergy },
});

describe('MEC-006 energy and orbs', () => {
  it('MEC-006-R8 orb gives +15, no growth, no progress, no score', () => {
    const sim = orbSim(20);
    sim.advance(140);
    const ev = sim.drainEvents();
    expect(types(ev)).toEqual(['orbEaten', 'energyChanged']);
    expect(ev).toEqual([
      { type: 'orbEaten', x: 3, y: 0, gained: 15 },
      { type: 'energyChanged', energy: 35, delta: 15, source: 'orb' },
    ]);
    expect(sim.snapshot()).toMatchObject({ energy: 35, energyMax: 100, length: 4, score: 0, progress: 0, orbs: [], eatenInLevel: 0, eatenInRun: 0 });
    expect(sim.snapshot().snake).toEqual([{ x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }]);
  });

  it('MEC-006-R1 start energy from options; non-integer or > max throws', () => {
    expect(createSim(b, 1, { startEnergy: 37 }).snapshot().energy).toBe(37);
    expect(createSim(b, 1).snapshot().energy).toBe(0);
    for (const startEnergy of [12.5, 101, -1, NaN, Infinity]) {
      expect(() => createSim(b, 1, { startEnergy })).toThrow(RangeError);
    }
  });

  it('MEC-006-R2 gains clamp at 100; no change over 60 s with no pickups', () => {
    const sim = orbSim(90); sim.advance(140);
    expect(sim.drainEvents()).toEqual([
      { type: 'orbEaten', x: 3, y: 0, gained: 10 },
      { type: 'energyChanged', energy: 100, delta: 10, source: 'orb' },
    ]);
    expect(sim.snapshot().energy).toBe(100);
    const idle = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: { startEnergy: 50 } });
    circle(idle, 60000);
    expect(idle.snapshot()).toMatchObject({ status: 'playing', energy: 50 });
    expect(types(idle.drainEvents())).not.toContain('energyChanged');
  });

  it('MEC-006-EC1 orb at full energy emits orbEaten gained 0 and no energyChanged', () => {
    const sim = orbSim(100); sim.advance(140);
    expect(sim.drainEvents()).toEqual([{ type: 'orbEaten', x: 3, y: 0, gained: 0 }]);
    expect(sim.snapshot()).toMatchObject({ energy: 100, orbs: [] });
  });

  it('MEC-006-R3 energy is kept across a level up and the transition', () => {
    const sim = simFromAscii(b, ['...M'], {
      snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true,
      options: { startEnergy: 50 }, extraState: { progress: 3 },
    });
    expect(sim.snapshot().energy).toBe(50);
    sim.advance(140); expect(sim.snapshot()).toMatchObject({ energy: 50, phase: 'transition' });
    sim.drainEvents(); sim.advance(1000);
    expect(sim.drainEvents()).toEqual([{ type: 'transitionEnd', level: 2 }]);
    expect(sim.snapshot()).toMatchObject({ energy: 50, phase: 'playing' });
    circle(sim, 5999); expect(types(sim.drainEvents())).not.toContain('orbSpawned');
    circle(sim, 1); expect(types(sim.drainEvents())).toContain('orbSpawned');
  });

  it('MEC-006-R4 no orb ever spawns on level 1; first orb at 6000 ms after reaching level 2', () => {
    const l1 = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true });
    circle(l1, 60000);
    expect(types(l1.drainEvents())).not.toContain('orbSpawned');
    expect(exportState(l1).orbSpawnMs).toBe(0);
    const l2 = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: { startLevel: 2 } });
    circle(l2, 5999); expect(types(l2.drainEvents())).not.toContain('orbSpawned');
    circle(l2, 1); expect(types(l2.drainEvents())).toContain('orbSpawned');
  });

  it('MEC-006-R5 attempt skipped at 2 orbs with no catch-up spawn', () => {
    const sim = simFromAscii(b, [], {
      snake: SQUARE, dir: [0, 1], quiet: true, options: { startLevel: 2 },
      extraState: { orbs: [{ x: 14, y: 14, ageMs: 0 }, { x: 15, y: 14, ageMs: 0 }] },
    });
    circle(sim, 6000); expect(types(sim.drainEvents())).not.toContain('orbSpawned');
    circle(sim, 1999); expect(types(sim.drainEvents())).not.toContain('orbExpired');
    circle(sim, 1);
    expect(sim.drainEvents().filter(e => e.type === 'orbExpired')).toEqual([
      { type: 'orbExpired', x: 14, y: 14 }, { type: 'orbExpired', x: 15, y: 14 },
    ]);
    circle(sim, 3999); expect(types(sim.drainEvents())).not.toContain('orbSpawned');
    circle(sim, 1); expect(types(sim.drainEvents())).toContain('orbSpawned');
  });

  it('MEC-002-R12 orbs and the regular mango never share a cell', () => {
    const sim = simFromAscii(b, ['...o'], { snake: SQUARE, dir: [0, 1], quiet: true });
    const s = exportState(sim);
    expect(isReserved(s, 3, 0)).toBe(true);
    const filled = simFromAscii(b, Array.from({ length: 17 }, (_, y) =>
      Array.from({ length: 17 }, (_, x) => x === 16 && y === 16 ? '.' : x === 15 && y === 16 ? 'o' : 'w').join('')),
    { snake: SQUARE, quiet: true });
    const onlyFree = exportState(filled);
    expect(placeMango(onlyFree, b, rngFrom(onlyFree.rng))).toBe(true);
    expect(onlyFree.mango).toMatchObject({ x: 16, y: 16 });
  });

  it('MEC-006-R6 orb candidates exclude reserved, unreachable and near-head cells', () => {
    const rows = Array<string>(17).fill('.'.repeat(17)).map(row => row.split(''));
    for (const [x, y] of [[10, 9], [9, 10], [11, 10], [10, 11]]) rows[y!]![x!] = '#';
    rows[14]![14] = 'M'; rows[15]![14] = 'o';
    const s = exportState(simFromAscii(b, rows.map(row => row.join('')), {
      snake: [[2, 2], [1, 2], [0, 2], [0, 1]], quiet: true,
    }));
    const candidates = goodCells(s, b);
    expect(candidates.length).toBeGreaterThan(0);
    for (const cell of [{ x: 10, y: 10 }, { x: 14, y: 14 }, { x: 14, y: 15 }, ...s.snake]) {
      expect(candidates).not.toContainEqual(cell);
    }
    for (const { x, y } of candidates) {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(17);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(17);
      expect(isReserved(s, x, y)).toBe(false);
      expect(nearHead(s.snake[0]!, s.dir, x, y, 3, b.fairness.frontLaneCells)).toBe(false);
    }
    expect(candidates).toEqual([...candidates].sort((a, c) => a.y - c.y || a.x - c.x));
  });

  it('MEC-006-R5 no good cells skips the attempt without fallback or RNG consumption', () => {
    const rows = Array<string>(17).fill('w'.repeat(17)); rows[1] = 'ww.' + 'w'.repeat(14);
    const s = exportState(simFromAscii(b, rows, {
      snake: SQUARE, quiet: true, options: { startLevel: 2 }, extraState: { orbSpawnMs: 5999 },
    }));
    const rng = structuredClone(s.rng), ctx = testCtx(b, s);
    expect(goodCells(s, b)).toEqual([]);
    orbTick(s, b, ctx);
    expect(s.orbs).toEqual([]); expect(s.orbSpawnMs).toBe(0);
    expect(ctx.events).toEqual([]); expect(s.rng).toEqual(rng);
  });

  it('MEC-006-R7 orb expires at 8000 ms; leftMs reported', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true,
      options: { startLevel: 2 }, extraState: { orbs: [{ x: 14, y: 14, ageMs: 0 }] } });
    expect(sim.snapshot().orbs).toEqual([{ x: 14, y: 14, leftMs: 8000 }]);
    circle(sim, 7999);
    expect(sim.snapshot().orbs).toContainEqual({ x: 14, y: 14, leftMs: 1 });
    sim.drainEvents(); circle(sim, 1);
    expect(sim.drainEvents()).toEqual([{ type: 'orbExpired', x: 14, y: 14 }]);
    expect(sim.snapshot().orbs.some(o => o.x === 14 && o.y === 14)).toBe(false);
  });

  it('MEC-006-R9 golden mango gives +10 energy on level 1', () => {
    const sim = simFromAscii(b, ['...G'], { snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true });
    sim.advance(140);
    const events = sim.drainEvents();
    expect(types(events)).toEqual(['ate', 'energyChanged']);
    expect(events[1]).toEqual({ type: 'energyChanged', energy: 10, delta: 10, source: 'golden' });
  });

  it('MEC-002-R5 golden gives 3 score, 2 progress, 1 growth, 10 energy', () => {
    const sim = simFromAscii(b, ['...G'], { snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true });
    sim.advance(140);
    expect(sim.drainEvents()[0]).toEqual({ type: 'ate', x: 3, y: 0, golden: true, points: 3, progressGain: 2, source: 'mango' });
    expect(sim.snapshot()).toMatchObject({ score: 3, progress: 2, length: 5, energy: 10 });
  });

  it('MEC-006-R9 golden energy clamps and emits nothing at full energy', () => {
    for (const [startEnergy, energy, delta] of [[95, 100, 5], [100, 100, 0]]) {
      const sim = simFromAscii(b, ['...G'], { snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true, options: { startEnergy } });
      sim.advance(140);
      expect(sim.snapshot().energy).toBe(energy);
      expect(sim.drainEvents().filter(e => e.type === 'energyChanged')).toEqual(delta ? [{ type: 'energyChanged', energy, delta, source: 'golden' }] : []);
    }
  });

  it('MEC-006-R10 orb timers frozen during level transition', () => {
    const sim = simFromAscii(b, ['...M'], { snake: [[2, 0], [1, 0], [0, 0], [0, 1]], quiet: true,
      options: { startLevel: 4 }, extraState: { progress: 4, orbs: [{ x: 14, y: 14, ageMs: 0 }] } });
    sim.advance(141); const before = exportState(sim);
    expect(before.phase).toBe('transition');
    sim.advance(998);
    expect(exportState(sim)).toMatchObject({ orbSpawnMs: before.orbSpawnMs, orbs: before.orbs, transitionLeftMs: 1 });
  });
});
