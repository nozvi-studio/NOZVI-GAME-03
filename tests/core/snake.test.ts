import { describe, expect, it } from 'vitest';
import { createSim, restoreSim, stateOf } from '../../src/core/sim';
import { loadBalance } from '../support/balance';
import { buildState, QUIET } from '../support/state';

const b = loadBalance();
const simOf = (o: Parameters<typeof buildState>[1] = {}) => restoreSim(b, buildState(b, { spawnInMs: QUIET, ...o }));

describe('MEC-001 snake', () => {
  it('MEC-001 turn ignores reverse and same direction and queues at most 3 turns', () => {
    const sim = simOf();
    sim.turn(-1, 0); sim.turn(1, 0);
    expect(stateOf(sim).queue).toEqual([]);
    sim.turn(0, 1); sim.turn(0, -1); sim.turn(-1, 0); sim.turn(0, -1); sim.turn(1, 0);
    expect(stateOf(sim).queue).toEqual([{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }]);
  });

  it('MEC-001 the snake steps once per tickMs and dies at the wall without moving', () => {
    const sim = simOf();
    sim.advance(139); expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 8 });
    sim.advance(1); expect(sim.snapshot().snake[0]).toEqual({ x: 9, y: 8 });
    sim.advance(140 * 7); expect(sim.snapshot().snake[0]).toEqual({ x: 16, y: 8 });
    sim.drainEvents();
    sim.advance(140);
    const snap = sim.snapshot();
    expect(snap.status).toBe('over');
    expect(snap.outcome).toEqual({ won: false, cause: 'wall' });
    expect(snap.snake[0]).toEqual({ x: 16, y: 8 });
    expect(sim.drainEvents()).toEqual([{ type: 'died', cause: 'wall', x: 16, y: 8 }]);
  });

  it('MEC-001 eating grows the snake and scores', () => {
    const sim = simOf({ mango: [9, 8] });
    sim.advance(140);
    const s = stateOf(sim);
    expect(s.snake.map(c => [c.x, c.y])).toEqual([[9, 8], [8, 8], [7, 8], [6, 8]]);
    expect([s.score, s.eaten, s.progress]).toEqual([1, 1, 1]);
    expect(sim.drainEvents()).toEqual([{ type: 'ate', x: 9, y: 8, golden: false, points: 1 }]);
    expect(s.tailFrom).toEqual({ x: 6, y: 8 });
  });

  it('MEC-001 start state', () => {
    const snap = createSim(b, 1).snapshot();
    expect(snap.snake).toEqual([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]);
    expect(snap.dir).toEqual({ x: 1, y: 0 });
    expect(snap.heading).toEqual(snap.dir);
    expect(snap.tickMs).toBe(140);
    expect(snap.status).toBe('playing');
    expect(snap.outcome).toBeNull();
    expect(snap.headFrom).toEqual({ x: 8, y: 8 });
    expect(snap.tailFrom).toEqual({ x: 6, y: 8 });
  });

  it('MEC-001 a queued turn is applied at the next step', () => {
    const sim = simOf();
    sim.turn(0, 1);
    expect(sim.snapshot().heading).toEqual({ x: 0, y: 1 });
    sim.advance(140);
    expect(sim.snapshot().snake[0]).toEqual({ x: 8, y: 9 });
    expect(sim.snapshot().dir).toEqual({ x: 0, y: 1 });
    expect(stateOf(sim).queue).toEqual([]);
  });

  it('MEC-001 self collision', () => {
    const snake: [number, number][] = [[5, 5], [6, 5], [6, 6], [5, 6], [4, 6]];
    const sim = simOf({ snake, dir: [0, 1] });
    sim.advance(140);
    expect(sim.snapshot().outcome).toEqual({ won: false, cause: 'self' });
    expect(stateOf(sim).snake.map(c => [c.x, c.y])).toEqual(snake);
  });

  it('MEC-001 moving into the cell the tail just left is allowed', () => {
    const sim = simOf({ snake: [[5, 5], [6, 5], [6, 6], [5, 6]], dir: [0, 1] });
    sim.advance(140);
    expect(sim.snapshot().status).toBe('playing');
    expect(sim.snapshot().snake[0]).toEqual({ x: 5, y: 6 });
  });

  it('MEC-001 eating next to the tail grows the snake and keeps the tail', () => {
    const sim = simOf({
      snake: [[5, 5], [5, 4], [6, 4], [7, 4], [7, 5], [7, 6], [6, 6]], dir: [0, 1], mango: [5, 6],
    });
    sim.advance(140);
    const s = stateOf(sim);
    expect(s.status).toBe('playing');
    expect(s.snake).toHaveLength(8);
    expect(s.snake[s.snake.length - 1]).toEqual({ x: 6, y: 6 });
    expect(s.tailFrom).toEqual({ x: 6, y: 6 });
  });

  it('MEC-001 a rotten rock kills with cause rotten', () => {
    const sim = simOf({ rottenRocks: [[9, 8]] });
    sim.advance(140);
    expect(sim.snapshot().outcome).toEqual({ won: false, cause: 'rotten' });
  });

  it('MEC-001 death keeps headFrom and tailFrom', () => {
    const sim = simOf();
    sim.advance(140 * 9);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.snapshot().headFrom).toEqual({ x: 15, y: 8 });
    expect(sim.snapshot().tailFrom).toEqual({ x: 13, y: 8 });
  });

  it('MEC-001 headFrom/tailFrom follow the last move', () => {
    const sim = simOf();
    sim.advance(140);
    expect(sim.snapshot().headFrom).toEqual({ x: 8, y: 8 });
    expect(sim.snapshot().tailFrom).toEqual({ x: 6, y: 8 });
  });

  it('MEC-001 tickAlpha is acc / tickMs and 1 when over', () => {
    const sim = simOf();
    sim.advance(70);
    expect(sim.snapshot().tickAlpha).toBe(0.5);
    sim.advance(140 * 9);
    expect(sim.snapshot().status).toBe('over');
    expect(sim.snapshot().tickAlpha).toBe(1);
  });

  it('MEC-001 advance after over is a no-op', () => {
    const sim = simOf();
    sim.advance(140 * 9);
    sim.drainEvents();
    const before = JSON.stringify(sim.snapshot());
    sim.advance(5000);
    expect(JSON.stringify(sim.snapshot())).toBe(before);
    expect(sim.drainEvents()).toEqual([]);
  });

  it('MEC-001 turn is ignored after over', () => {
    const sim = simOf();
    sim.advance(140 * 9);
    sim.turn(0, 1);
    expect(stateOf(sim).queue).toEqual([]);
  });

  it('MEC-001 advance rejects a negative or fractional ms', () => {
    const sim = simOf();
    expect(() => sim.advance(-1)).toThrow(RangeError);
    expect(() => sim.advance(1.5)).toThrow(RangeError);
  });
});
