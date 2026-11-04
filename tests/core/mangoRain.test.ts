import { describe, it, expect } from 'vitest';
import { quota } from '../../src/core/level';
import { exportState, stateOf } from '../../src/core/sim';
import { simFromAscii, SQUARE } from '../../src/core/testing';
import type { Sim, SimEvent, SimState } from '../../src/core/types';
import { loadBalance } from '../support/balance';

const b = loadBalance();
const opts = { startLevel: 16, bestLevel: 16, startEnergy: 100, loadout: ['shield', 'mangoRain'] as const };
const SNAKE: [number, number][] = [[2, 0], [1, 0], [0, 0], [0, 1]];
type Ate = Extract<SimEvent, { type: 'ate' }>;
const FAR = { x: 12, y: 12, golden: false, totalMs: 1e9, leftMs: 1e9 };

// Advance in a circle (one left turn per step, like testing.circle without snapshots), recording events with sim time.
function timed(sim: Sim, ms: number): { t: number; e: SimEvent }[] {
  const out: { t: number; e: SimEvent }[] = [], s = stateOf(sim);
  for (let i = 0; i < ms; i++) {
    if (!s.queue.length) sim.turn(-s.dir.y as -1 | 0 | 1, s.dir.x);
    sim.advance(1);
    for (const e of sim.drainEvents()) out.push({ t: s.timeMs, e });
  }
  return out;
}
const rainSim = (seed: number, rows: string[] = []) =>
  simFromAscii(b, rows, { snake: SQUARE, dir: [0, 1], seed, quiet: true, options: opts, extraState: { mango: { ...FAR } } });

describe('MEC-006 Mango Rain', () => {
  it('MEC-006-R32 rain progress capped at floor(need × 0.5) per cast; extras give score only', () => {
    const sim = simFromAscii(b, ['...mmmmm'], { snake: SNAKE, quiet: true, options: opts,
      extraState: { rainBudgets: [{ castId: 1, left: 3 }], rainMangoes: [3, 4, 5, 6, 7].map(x => ({ x, y: 0, ageMs: 0, castId: 1 })) } });
    sim.advance(5 * 140);
    const ate = sim.drainEvents().filter(e => e.type === 'ate') as Ate[];
    expect(ate.map(e => e.progressGain)).toEqual([1, 1, 1, 0, 0]);
    expect(ate[0]).toEqual({ type: 'ate', x: 3, y: 0, golden: false, points: b.mango.points.normal, progressGain: 1, source: 'rain' });
    expect(sim.snapshot()).toMatchObject({ progress: 3, score: 5, length: 9, eatenInLevel: 0, eatenInRun: 0 });
  });
  it('MEC-006-R32 cast budget is floor(need at cast × barCapFraction)', () => {
    const sim = rainSim(1); sim.useSkill(1);
    expect(stateOf(sim).rainBudgets).toEqual([{ castId: 1, left: Math.floor(quota(b, 16) * 0.5) }]);
  });
  it('MEC-006-R29 drop count 6–10 and schedule over 6000 ms, deterministic per seed', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const sim = rainSim(seed); sim.useSkill(1);
      const { drops } = stateOf(sim).rain!;
      expect(drops).toBeGreaterThanOrEqual(6); expect(drops).toBeLessThanOrEqual(10);
      expect(sim.drainEvents().filter(e => e.type === 'rainDrop' || e.type === 'rainDropSkipped')).toHaveLength(1);
    }
    for (const seed of [1, 2, 3]) {
      const run = () => {
        const sim = rainSim(seed); sim.useSkill(1);
        const first = sim.drainEvents().filter(e => e.type === 'rainDrop');
        const drops = stateOf(sim).rain!.drops;
        const ev = timed(sim, 6000);
        return { sim, drops, first, ev };
      };
      const a = run(), c = run();
      const times = [0, ...a.ev.filter(x => x.e.type === 'rainDrop' || x.e.type === 'rainDropSkipped').map(x => x.t)];
      const step = Math.floor(6000 / a.drops);
      expect(times).toEqual(Array.from({ length: a.drops }, (_, i) => i * step));
      expect(a.sim.snapshot().rain).toBeNull();
      expect(a.ev).toContainEqual({ t: 6000, e: { type: 'skillEnded', skill: 'mangoRain', reason: 'timeout' } });
      expect([...a.first, ...a.ev.map(x => x.e)].filter(e => e.type === 'rainDrop'))
        .toEqual([...c.first, ...c.ev.map(x => x.e)].filter(e => e.type === 'rainDrop'));
    }
  });
  it('MEC-006-R30 no candidate skips the drop with rainDropSkipped', () => {
    const rows = Array.from({ length: 17 }, (_, y) => Array.from({ length: 17 }, (_, x) => (x < 2 && y < 2 ? '.' : 'w')).join(''));
    const sim = rainSim(4, rows); sim.useSkill(1);
    const drops = stateOf(sim).rain!.drops;
    const ev = [...sim.drainEvents(), ...timed(sim, 6000).map(x => x.e)];
    expect(ev.filter(e => e.type === 'rainDropSkipped')).toHaveLength(drops);
    expect(ev.some(e => e.type === 'rainDrop')).toBe(false);
    expect(sim.snapshot().energy).toBe(100 - b.skills.mangoRain.cost);
  });
  it('MEC-006-R31 rain mango vanishes at 8000 ms without rock', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: opts,
      extraState: { mango: { ...FAR }, rainMangoes: [{ x: 10, y: 10, ageMs: 0, castId: 1 }] } });
    const before = timed(sim, 7999);
    expect(sim.snapshot().rainMangoes).toEqual([{ x: 10, y: 10, leftMs: 1 }]);
    const ev = [...before, ...timed(sim, 1)].map(x => x.e);
    expect(ev).toContainEqual({ type: 'rainMangoExpired', x: 10, y: 10 });
    expect(ev.some(e => e.type === 'rotted')).toBe(false);
    expect(sim.snapshot()).toMatchObject({ rainMangoes: [], rottenRocks: [] });
  });
  it('MEC-002-R11 rain mango never becomes a rotten rock', () => {
    const sim = simFromAscii(b, [], { snake: SQUARE, dir: [0, 1], quiet: true, options: opts,
      extraState: { mango: { ...FAR }, rainMangoes: [{ x: 10, y: 10, ageMs: 0, castId: 1 }] } });
    const ev = timed(sim, 8000).map(x => x.e);
    expect(ev.some(e => e.type === 'rotted')).toBe(false);
    expect(sim.snapshot().rottenRocks).toEqual([]);
  });
  it('MEC-002-R3 rain mangoes and orbs do not change eatenInLevel or eatenInRun', () => {
    const sim = simFromAscii(b, ['...mo'], { snake: SNAKE, quiet: true, options: opts });
    sim.advance(2 * 140);
    const ev = sim.drainEvents();
    expect(ev.some(e => e.type === 'ate')).toBe(true); expect(ev.some(e => e.type === 'orbEaten')).toBe(true);
    expect(sim.snapshot()).toMatchObject({ eatenInLevel: 0, eatenInRun: 0 });
  });
  it('MEC-006-R33 eating a rain mango keeps the regular mango and its timer', () => {
    const live = simFromAscii(b, ['...m'], { snake: SNAKE, quiet: true, options: opts,
      extraState: { mango: { x: 12, y: 12, golden: false, totalMs: 8000, leftMs: 8000 } } });
    live.advance(140);
    expect(live.snapshot().mango).toMatchObject({ x: 12, y: 12, totalMs: 8000, leftMs: 8000 - 140 });
  });
  const levelUpRain = (extra: Partial<SimState> = {}) => {
    const need = quota(b, 16);
    return simFromAscii(b, ['...m'], { snake: SNAKE, quiet: true, options: opts, extraState: {
      progress: need - 1, rain: { castId: 1, leftMs: 3000, elapsedMs: 3000, drops: 6, dropped: 4 },
      rainBudgets: [{ castId: 1, left: 3 }], nextCastId: 2, ...extra } });
  };
  it('MEC-006-R34 rain continues after a level-up with its budget', () => {
    const sim = levelUpRain({ mango: { ...FAR } });
    sim.advance(140);
    expect(sim.drainEvents().some(e => e.type === 'levelUp')).toBe(true);
    expect(sim.snapshot().phase).toBe('transition');
    expect(stateOf(sim).rainBudgets).toEqual([{ castId: 1, left: 2 }]);
    sim.advance(1); const r1 = sim.snapshot().rain;
    sim.advance(998); const r2 = sim.snapshot().rain;
    expect(r1).not.toBeNull(); expect(r2).toEqual(r1);
  });
  it('MEC-002-R8 level up from a rain mango keeps the regular mango and its timer', () => {
    const sim = levelUpRain({ mango: { x: 12, y: 12, golden: false, totalMs: 8000, leftMs: 8000 - 860 } });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ phase: 'transition', mango: { x: 12, y: 12, ageMs: 1000 } });
    sim.advance(1); expect(sim.snapshot().mango).toMatchObject({ x: 12, y: 12, ageMs: 1000 });
    sim.advance(998); expect(sim.snapshot().mango).toMatchObject({ x: 12, y: 12, ageMs: 1000 });
  });
  it('MEC-008-R8 rain mangoes advance the ramp', () => {
    const sim = simFromAscii(b, ['...m'], { snake: SNAKE, quiet: true,
      options: { startLevel: 12, bestLevel: 16, startEnergy: 0, loadout: ['shield', 'mangoRain'] } });
    sim.advance(141);
    expect(sim.snapshot()).toMatchObject({ rampMangoesLeft: 4, tickMs: 136 });
  });
  it('MEC-006-EC15 snip wall and rubble crumble at the level transition', () => {
    const sim = levelUpRain({ mango: { ...FAR },
      snipWalls: [{ family: 'snipWall', cells: [{ x: 9, y: 9 }], state: 'solid', leftMs: 3000 }],
      rubble: [{ family: 'rubble', x: 8, y: 8, state: 'solid', leftMs: 1500 }] });
    sim.advance(140);
    expect(sim.snapshot()).toMatchObject({ phase: 'transition',
      snipWall: [{ x: 9, y: 9, state: 'crumble', leftMs: 450 }], rubble: [{ x: 8, y: 8, state: 'crumble', leftMs: 450 }] });
    expect(stateOf(sim).snipWalls.some(w => w.state === 'solid')).toBe(false);
  });
  it('MEC-006-R35 during transition only crumble, fade-out and transition timers advance', () => {
    const sim = levelUpRain({ mango: { x: 12, y: 12, golden: false, totalMs: 8000, leftMs: 7000 },
      orbs: [{ x: 14, y: 14, ageMs: 100 }], slowmo: { leftMs: 2000 }, shield: { leftMs: 3000 },
      rainMangoes: [{ x: 3, y: 0, ageMs: 0, castId: 1 }, { x: 10, y: 2, ageMs: 50, castId: 1 }],
      snipWalls: [{ family: 'snipWall', cells: [{ x: 9, y: 9 }], state: 'solid', leftMs: 3000 }],
      rubble: [{ family: 'rubble', x: 8, y: 8, state: 'solid', leftMs: 1500 }],
      rottenRocks: [{ family: 'rottenRock', x: 7, y: 7, state: 'solid', leftMs: 5000 }],
      terrains: [{ family: 'terrain', t: 100, lifeMs: 600000, cells: [{ x: 15, y: 3, delay: 0, up: false, vis: 'down' }] }],
      spawnInMs: 3, mazeCooldownMs: 7, orbSpawnMs: 11 });
    const live = sim;
    while (live.snapshot().phase === 'playing' && live.snapshot().timeMs < 1000) live.advance(1);   // slow-mo: 224 ms tick
    live.drainEvents();
    expect(live.snapshot().phase).toBe('transition');
    // Crumble is 450 ms, so compare inside the crumble window (crumbling items disappear before 999).
    live.advance(1); const a = norm(exportState(live));
    live.advance(448); const z = norm(exportState(live));
    expect(z).toEqual(a);
  });
});

function norm(s: SimState): SimState {
  const c = structuredClone(s);
  c.timeMs = 0; c.transitionLeftMs = 0; c.events = [];
  for (const x of [...c.rubble, ...c.snipWalls, ...c.rottenRocks]) x.leftMs = 0;
  for (const h of c.hazards) h.t = 0;
  for (const T of c.terrains) T.t = 0;
  return c;
}
