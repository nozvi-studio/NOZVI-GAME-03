import { describe, it, expect } from 'vitest';
import { simFromAscii } from '../../src/core/testing';
import { loadBalance } from '../support/balance';
import { rampTick } from '../../src/core/ramp';

const b = loadBalance();
const types = (evs: { type: string }[]) => evs.map(e => e.type);
const snake: [number, number][] = [[2, 0], [1, 0], [0, 0], [0, 1]];

describe('MEC-008 speed ramp', () => {
  it('MEC-008-R8 ramp from L4 gives ticks 140 139 138 136 135 134', () => {
    expect([0, 1, 2, 3, 4, 5].map(k => rampTick(b, 4, k))).toEqual([140, 139, 138, 136, 135, 134]);
  });

  it('MEC-008-R8 ramp from L12 gives ticks 140 136 131 127 122 118', () => {
    expect([0, 1, 2, 3, 4, 5].map(k => rampTick(b, 12, k))).toEqual([140, 136, 131, 127, 122, 118]);
  });

  it('MEC-008-R8 ramp ends on the first level up before 5 mangoes', () => {
    const sim = simFromAscii(b, ['...M'], { snake, quiet: true, options: { startLevel: 4 }, extraState: { progress: 4 } });
    sim.advance(139); expect(sim.snapshot().snake[0]).toEqual({ x: 2, y: 0 });
    sim.advance(1);
    const events = sim.drainEvents();
    expect(types(events).slice(-3)).toEqual(['shrunk', 'levelUp', 'rampEnded']);
    expect(events.at(-1)).toEqual({ type: 'rampEnded', level: 5 });
    expect(sim.snapshot()).toMatchObject({ phase: 'transition', rampActive: false, rampMangoesLeft: 0 });
    sim.advance(1000 + 131); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    expect(sim.snapshot().tickMs).toBe(132);
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 4, y: 0 });
    expect(types(sim.drainEvents())).not.toContain('rampEnded');
  });

  it('MEC-008-R8 start at L1 keeps tick 140 and emits no rampEnded', () => {
    const sim = simFromAscii(b, ['...M'], { snake, quiet: true, extraState: { rampEaten: 4 } });
    sim.advance(140);
    expect(types(sim.drainEvents())).not.toContain('rampEnded');
    expect(sim.snapshot()).toMatchObject({ rampActive: false, tickMs: 140 });
  });

  it('MEC-008-R8 fifth ramp mango ends the ramp: ate energyChanged rampEnded', () => {
    const sim = simFromAscii(b, ['...G'], { snake, quiet: true, options: { startLevel: 4 }, extraState: { rampEaten: 4 } });
    sim.advance(135);
    expect(types(sim.drainEvents())).toEqual(['ate', 'energyChanged', 'rampEnded']);
    expect(sim.snapshot()).toMatchObject({ rampMangoesLeft: 0, rampActive: false });
  });

  it('MEC-008-R9 the new ramp tick applies from the next step', () => {
    const sim = simFromAscii(b, ['...M'], { snake, quiet: true, options: { startLevel: 4 } });
    sim.advance(140); expect(sim.snapshot().tickMs).toBe(140);
    sim.advance(1); expect(sim.snapshot().tickMs).toBe(139);
    sim.advance(137); expect(sim.snapshot().snake[0]).toEqual({ x: 3, y: 0 });
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 4, y: 0 });
  });

  it('MEC-008-R8 snapshot rampMangoesLeft counts down 5 4 3', () => {
    const sim = simFromAscii(b, ['...M'], { snake, quiet: true, options: { startLevel: 4 } });
    expect(sim.snapshot().rampMangoesLeft).toBe(5);
    sim.advance(140); expect(sim.snapshot().rampMangoesLeft).toBe(4);
    const second = simFromAscii(b, ['....M'], {
      snake: [[3, 0], [2, 0], [1, 0], [0, 0], [0, 1]], quiet: true,
      options: { startLevel: 4 }, extraState: { rampEaten: 1, progress: 1 },
    });
    second.advance(139); expect(second.snapshot().rampMangoesLeft).toBe(3);
  });
});
