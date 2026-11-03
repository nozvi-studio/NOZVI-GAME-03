// tests/qa/task2.qa.test.ts — independent black-box QA tests for Task 2
import { describe, it, expect } from 'vitest';
import { parseBalance, type Dir } from '../../src/core';
import { seedRng, rngFrom } from '../../src/core/rng';
import { key, inBounds, nearHead, reachable } from '../../src/core/grid';
import rawBalance from '../../config/balance.json';
import { loadBalance } from '../support/balance';

describe('QA Task 2: RNG (Black-Box)', () => {
  it('QA-T2-01 P0-Design §3, §9 same seed produces identical sequence', () => {
    const r1 = rngFrom(seedRng(123456789)), r2 = rngFrom(seedRng(123456789));
    for (let i = 0; i < 1000; i++) expect(r1.next()).toBe(r2.next());
  });

  it('QA-T2-02 P0-Design §3 different seeds produce diverging sequences', () => {
    const r1 = rngFrom(seedRng(12345));
    const r2 = rngFrom(seedRng(54321));
    const draws1 = Array.from({ length: 20 }, () => r1.next());
    const draws2 = Array.from({ length: 20 }, () => r2.next());
    expect(draws1).not.toEqual(draws2);
  });

  it('QA-T2-03 P0-Design §4, §9 state is JSON-serializable plain data', () => {
    const st = seedRng(42);
    expect(typeof st.s).toBe('number');
    const jsonStr = JSON.stringify(st);
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toEqual(st);
    const r = rngFrom(parsed);
    expect(r.next()).toBeGreaterThanOrEqual(0);
  });

  it('QA-T2-04 P0-Design §4, §9 clone mid-sequence and resume independently', () => {
    const st = seedRng(42);
    const r = rngFrom(st);
    for (let i = 0; i < 50; i++) r.next();

    const cloneSt = structuredClone(st);
    const cloneR = rngFrom(cloneSt);

    const orig50 = Array.from({ length: 50 }, () => r.next());
    const clone50 = Array.from({ length: 50 }, () => cloneR.next());
    expect(clone50).toEqual(orig50);

    const savedState = st.s;
    cloneR.next();
    expect(st.s).toBe(savedState);
  });

  it('QA-T2-05 P0-Design §3 next() in [0, 1) range check', () => {
    for (const seed of [0, 1, 0xffffffff]) {
      const r = rngFrom(seedRng(seed));
      for (let i = 0; i < 10000; i++) {
        const v = r.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
        expect(Number.isNaN(v)).toBe(false);
      }
    }
  });

  it('QA-T2-06 P0-Design §3 int(n) floor(next()*n) distribution', () => {
    const r = rngFrom(seedRng(999));
    for (let i = 0; i < 1000; i++) expect(r.int(1)).toBe(0);

    const counts = new Set<number>();
    for (let i = 0; i < 10000; i++) {
      const v = r.int(10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
      counts.add(v);
    }
    expect(counts.size).toBe(10);
  });

  it('QA-T2-07 P0-Design §3 pick(arr) returns valid elements', () => {
    const r = rngFrom(seedRng(777));
    for (let i = 0; i < 100; i++) expect(r.pick(['only'])).toBe('only');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 1000; i++) expect(items).toContain(r.pick(items));
  });

  it('QA-T2-08 P0-Design §3 chance(p) boundary values 0 and 1', () => {
    const r = rngFrom(seedRng(555));
    for (let i = 0; i < 1000; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it('QA-T2-09 P0-Design §3 chance(0.5) statistical distribution', () => {
    const r = rngFrom(seedRng(333));
    let trueCount = 0;
    const total = 20000;
    for (let i = 0; i < total; i++) if (r.chance(0.5)) trueCount++;
    const ratio = trueCount / total;
    expect(ratio).toBeGreaterThan(0.485);
    expect(ratio).toBeLessThan(0.515);
  });
});

describe('QA Task 2: parseBalance (Black-Box)', () => {
  it('QA-T2-10 P0-Design §6, §9 parse balance.json successfully', () => {
    const b = parseBalance(rawBalance);
    expect(b).toBeDefined();
    expect(b.board.cols).toBe(17);
    expect(b.board.rows).toBe(17);
    expect(b.speed.startMs).toBe(140);
    expect(b.speed.minMs).toBe(95);

    const loaded = loadBalance();
    expect(loaded.board.cols).toBe(17);
  });

  it('QA-T2-11 P0-Design §3, §6 rejects non-object inputs', () => {
    expect(() => parseBalance(null as any)).toThrow();
    expect(() => parseBalance(undefined as any)).toThrow();
    expect(() => parseBalance([] as any)).toThrow();
    expect(() => parseBalance('not an object' as any)).toThrow();
    expect(() => parseBalance(12345 as any)).toThrow();
  });

  it('QA-T2-12 P0-Design §6 rejects missing required groups', () => {
    const groups = ['board', 'snake', 'speed', 'level', 'mango', 'fairness', 'hazard', 'rock', 'fence', 'maze', 'terrain', 'director', 'flow', 'ui'];
    for (const g of groups) {
      const copy = structuredClone(rawBalance) as Record<string, unknown>;
      delete copy[g];
      expect(() => parseBalance(copy)).toThrow();
    }
  });

  it('QA-T2-13 P0-Design §6 rejects minMs greater than startMs', () => {
    const copy = structuredClone(rawBalance);
    copy.speed.minMs = 150;
    copy.speed.startMs = 140;
    expect(() => parseBalance(copy)).toThrow();
  });

  it('QA-T2-14 P0-Design §6 rejects non-positive values', () => {
    const mutations = [
      (c: any) => { c.board.cols = 0; },
      (c: any) => { c.board.rows = -1; },
      (c: any) => { c.speed.startMs = 0; },
      (c: any) => { c.director.intervalBaseMs = -500; },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(rawBalance);
      mutate(copy);
      expect(() => parseBalance(copy)).toThrow();
    }
  });

  it('QA-T2-15 P0-Design §6 rejects invalid field types', () => {
    const mutations = [
      (c: any) => { c.board.cols = '17'; },
      (c: any) => { c.level.unlock.fence = true; },
      (c: any) => { c.snake.start = '8,8'; },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(rawBalance);
      mutate(copy);
      expect(() => parseBalance(copy)).toThrow();
    }
  });

  it('QA-T2-16 P0-Design §6 rejects malformed coordinates and vectors', () => {
    const mutations = [
      (c: any) => { c.snake.start = [[8]]; },
      (c: any) => { c.snake.startDir = [1, 0, 0]; },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(rawBalance);
      mutate(copy);
      expect(() => parseBalance(copy)).toThrow();
    }
  });

  it.skip('QA-T2-17 MEC-004-R13 rejects warnMs below 900ms bound (P2a: MEC-004-R13 warn bound not in P0 scope)', () => {
    const c1 = structuredClone(rawBalance);
    c1.rock.warnMs = 800;
    expect(() => parseBalance(c1)).toThrow();

    const c2 = structuredClone(rawBalance);
    c2.terrain.warnMs = 850;
    expect(() => parseBalance(c2)).toThrow();
  });

  it('QA-T2-18 P0-Design §6 rejects negative director weights', () => {
    const c1 = structuredClone(rawBalance);
    c1.director.weights.rock = -1;
    expect(() => parseBalance(c1)).toThrow();
  });

  it('QA-T2-19 P0-Design §6, §8 rejects empty config without silent defaults', () => {
    expect(() => parseBalance({})).toThrow();
  });
});

describe('QA Task 2: Grid and BFS (Black-Box)', () => {
  it('QA-T2-20 P0-Design §3 key uniqueness across 17x17 board', () => {
    const seen = new Set<number>();
    for (let x = 0; x < 17; x++) {
      for (let y = 0; y < 17; y++) {
        seen.add(key(17, x, y));
      }
    }
    expect(seen.size).toBe(289);
  });

  it('QA-T2-21 P0-Design §3, §6 inBounds on corners and edges', () => {
    const cells = [[0, 0], [16, 0], [0, 16], [16, 16], [8, 0], [0, 8], [16, 8], [8, 16]];
    for (const [x, y] of cells) expect(inBounds(17, 17, x, y)).toBe(true);
  });

  it('QA-T2-22 P0-Design §3, §5 inBounds rejects out-of-bounds coordinates', () => {
    const off = [[-1, 0], [0, -1], [17, 8], [8, 17], [17, 17], [-5, 20]];
    for (const [x, y] of off) expect(inBounds(17, 17, x, y)).toBe(false);
  });

  it('QA-T2-23 P0-Design §5, MEC-004-R11 nearHead distance boundary behind head', () => {
    const head = { x: 8, y: 8 }, dir: Dir = { x: 1, y: 0 };
    expect(nearHead(head, dir, 5, 8, 4, 4)).toBe(true);  // dist 3 < 4
    expect(nearHead(head, dir, 4, 8, 4, 4)).toBe(false); // dist 4 == 4
    expect(nearHead(head, dir, 3, 8, 4, 4)).toBe(false); // dist 5 > 4
  });

  it('QA-T2-24 P0-Design §5, MEC-004-R11 nearHead distance boundary lateral', () => {
    const head = { x: 8, y: 8 }, dir: Dir = { x: 1, y: 0 };
    expect(nearHead(head, dir, 8, 5, 4, 4)).toBe(true);  // dist 3 < 4
    expect(nearHead(head, dir, 8, 4, 4, 4)).toBe(false); // dist 4 == 4
    expect(nearHead(head, dir, 8, 3, 4, 4)).toBe(false); // dist 5 > 4
  });

  it('QA-T2-25 P0-Design §5, MEC-004-R11 nearHead front lane 4 cells ahead', () => {
    const head = { x: 8, y: 8 }, dir: Dir = { x: 1, y: 0 };
    for (let x = 9; x <= 12; x++) expect(nearHead(head, dir, x, 8, 4, 4)).toBe(true); // k=1..4
    expect(nearHead(head, dir, 13, 8, 4, 4)).toBe(false); // k=5
  });

  it('QA-T2-26 P0-Design §5, MEC-004-R11 nearHead front lane independent of d', () => {
    const head = { x: 8, y: 8 }, dir: Dir = { x: 1, y: 0 };
    expect(nearHead(head, dir, 11, 8, 3, 4)).toBe(true);
    expect(nearHead(head, dir, 12, 8, 3, 4)).toBe(true);
  });

  it('QA-T2-27 P0-Design §5, MEC-004-R11 nearHead uses current dir vector', () => {
    const head = { x: 8, y: 8 };
    expect(nearHead(head, { x: 0, y: -1 }, 8, 4, 4, 4)).toBe(true);
    expect(nearHead(head, { x: 0, y: -1 }, 8, 3, 4, 4)).toBe(false);
    expect(nearHead(head, { x: 0, y: 1 }, 8, 12, 4, 4)).toBe(true);
    expect(nearHead(head, { x: 0, y: 1 }, 8, 13, 4, 4)).toBe(false);
    expect(nearHead(head, { x: -1, y: 0 }, 4, 8, 4, 4)).toBe(true);
    expect(nearHead(head, { x: -1, y: 0 }, 3, 8, 4, 4)).toBe(false);
  });

  it('QA-T2-28 P0-Design §5, MEC-004-R4 reachable open board', () => {
    const reach = reachable(17, 17, { x: 0, y: 0 }, () => false);
    expect(reach.has(key(17, 16, 16))).toBe(true);
    expect(reach.size).toBe(289);
  });

  it('QA-T2-29 P0-Design §5, MEC-004-R4 reachable start == target', () => {
    const reach = reachable(17, 17, { x: 8, y: 8 }, () => false);
    expect(reach.has(key(17, 8, 8))).toBe(true);
  });

  it('QA-T2-30 P0-Design §5, MEC-004-R4 reachable fully walled target', () => {
    const isWall = (x: number, y: number) => (x === 7 && y === 8) || (x === 9 && y === 8) || (x === 8 && y === 7) || (x === 8 && y === 9);
    expect(reachable(17, 17, { x: 2, y: 2 }, isWall).has(key(17, 8, 8))).toBe(false);
  });

  it('QA-T2-31 P0-Design §5, MEC-004-R4 reachable target behind 1-cell gap', () => {
    const isWall = (x: number, y: number) => x === 8 && y !== 8;
    expect(reachable(17, 17, { x: 2, y: 8 }, isWall).has(key(17, 14, 8))).toBe(true);
  });

  it('QA-T2-32 P0-Design §5, MEC-004-R4 reachable no diagonal moves', () => {
    const isWall = (x: number, y: number) => (x === 1 && y === 0) || (x === 0 && y === 1);
    const reach = reachable(17, 17, { x: 5, y: 5 }, isWall);
    expect(reach.has(key(17, 0, 0))).toBe(false);
    expect(reach.has(key(17, 1, 1))).toBe(true);
  });

  it('QA-T2-33 P0-Design §5, MEC-004-R4 reachable walls at board edges, no wrap-around', () => {
    const isWall = (x: number, y: number) => (x === 0 && y === 7) || (x === 1 && y === 8) || (x === 0 && y === 9);
    expect(reachable(17, 17, { x: 16, y: 8 }, isWall).has(key(17, 0, 8))).toBe(false);
  });

  it('QA-T2-34 P0-Design §5, MEC-004-R4 reachable snake tail cell not a wall', () => {
    const isWall = (x: number, y: number) => (x === 7 && y === 8) || (x === 9 && y === 8) || (x === 8 && y === 9) || (x === 8 && y === 6);
    expect(reachable(17, 17, { x: 8, y: 5 }, isWall).has(key(17, 8, 8))).toBe(true);
  });

  it('QA-T2-35 P0-Design §5, MEC-004-R4 reachable terrain cells are not walls', () => {
    expect(reachable(17, 17, { x: 2, y: 2 }, () => false).has(key(17, 8, 8))).toBe(true);
  });
});
