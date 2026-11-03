// tests/core/rng.test.ts
import { describe, expect, it } from 'vitest';
import { rngFrom, seedRng } from '../../src/core/rng';

describe('MEC-004 rng', () => {
  it('MEC-004 rng: mulberry32 is reproducible per seed', () => {
    const r = rngFrom(seedRng(42));
    expect([r.next(), r.next(), r.next()]).toEqual([0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
  });
  it('MEC-004 rng: int(n) = floor(next() * n)', () => {
    const r = rngFrom(seedRng(7));
    expect([0, 1, 2, 3, 4].map(() => r.int(10))).toEqual([0, 0, 9, 6, 5]);
  });
  it('MEC-004 rng: state is a plain 32-bit integer that resumes exactly', () => {
    const st = seedRng(1); const r = rngFrom(st); r.next();
    const copy = JSON.parse(JSON.stringify(st)) as typeof st;
    expect(Number.isInteger(st.s) && st.s >= 0 && st.s < 2 ** 32).toBe(true);
    expect(rngFrom(copy).next()).toBe(r.next());
  });
  it('MEC-004 rng: next() stays in [0, 1) over 10000 draws', () => {
    const r = rngFrom(seedRng(3));
    for (let i = 0; i < 10000; i++) { const v = r.next(); expect(v >= 0 && v < 1).toBe(true); }
  });
  it('MEC-004 rng: pick uses int(length)', () => {
    const r = rngFrom(seedRng(7));
    const arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
    expect([r.pick(arr), r.pick(arr), r.pick(arr)]).toEqual(['a', 'a', 'j']);
  });
  it('MEC-004 rng: pick throws on an empty array', () => {
    expect(() => rngFrom(seedRng(1)).pick([])).toThrow(/empty/);
  });
  it('MEC-004 rng: chance(p) is next() < p', () => {
    const r = rngFrom(seedRng(42));
    expect(r.chance(0.61)).toBe(true);
    expect(r.chance(0.44)).toBe(false);
  });
});
