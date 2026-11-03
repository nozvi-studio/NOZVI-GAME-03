// tests/core/determinism.test.ts
import { describe, expect, it } from 'vitest';
import { createSim, stateOf } from '../../src/core/sim';
import type { Sim } from '../../src/core/types';
import { loadBalance } from '../support/balance';
import { snapHash } from '../support/fuzz';

const b = loadBalance();
const TURNS: [number, -1 | 0 | 1, -1 | 0 | 1][] = [[300, 0, 1], [700, 1, 0], [1200, 0, -1], [1900, -1, 0], [2600, 0, 1], [4100, 1, 0]];
function play(sim: Sim, chunks: number[], until = 8000): void {
  let t = 0, i = 0, c = 0;
  while (t < until) {
    while (i < TURNS.length && TURNS[i]![0] === t) { sim.turn(TURNS[i]![1], TURNS[i]![2]); i++; }
    const next = Math.min(until, TURNS[i]?.[0] ?? until, t + chunks[c++ % chunks.length]!);
    sim.advance(next - t); t = next;
  }
}

describe('MEC-004 determinism', () => {
  it('MEC-004 different seeds diverge', () => {
    const a = createSim(b, 1), c = createSim(b, 2);
    a.advance(6000); c.advance(6000);
    expect(snapHash(a)).not.toBe(snapHash(c));
  });
  it('MEC-004 same seed and inputs give the same snapshot hash for any advance split', () => {
    const a = createSim(b, 7), c = createSim(b, 7), d = createSim(b, 7);
    play(a, [1]); play(c, [16]); play(d, [7, 100, 33]);
    expect(snapHash(c)).toBe(snapHash(a)); expect(snapHash(d)).toBe(snapHash(a));
  });
  it('MEC-004 clone evolves identically and independently', () => {
    const a = createSim(b, 11); play(a, [16], 3000);
    expect(a.snapshot().status).toBe('playing');
    const before = snapHash(a), c = a.clone();
    c.turn(0, 1); c.advance(2000);
    expect(snapHash(c)).not.toBe(before);
    expect(snapHash(a)).toBe(before);
    a.turn(0, 1); a.advance(2000);
    expect(snapHash(c)).toBe(snapHash(a));
  });
  it('MEC-004 SimState is plain data (JSON round trip is lossless)', () => {
    const a = createSim(b, 5); play(a, [16], 3000);
    const s = stateOf(a);
    expect(s.status).toBe('playing');
    expect(s.hazards.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
