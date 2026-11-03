// tests/core/grid.test.ts
import { describe, expect, it } from 'vitest';
import { inBounds, key, nearHead, reachable } from '../../src/core/grid';

describe('MEC-004 grid', () => {
  it('MEC-004 key is row-major', () => { expect(key(17, 3, 2)).toBe(37); });

  it('MEC-004 inBounds rejects off-board cells', () => {
    expect(inBounds(17, 17, -1, 0)).toBe(false);
    expect(inBounds(17, 17, 16, 16)).toBe(true);
    expect(inBounds(17, 17, 17, 0)).toBe(false);
    expect(inBounds(17, 17, 0, 17)).toBe(false);
  });

  it('MEC-004 nearHead uses Manhattan distance < d', () => {
    const head = { x: 8, y: 8 }, dir = { x: 1, y: 0 } as const;
    expect(nearHead(head, dir, 8, 11, 4, 4)).toBe(true);
    expect(nearHead(head, dir, 8, 12, 4, 4)).toBe(false);
  });

  it('MEC-004 nearHead covers 4 lane cells ahead for any d', () => {
    const head = { x: 8, y: 8 }, dir = { x: 1, y: 0 } as const;
    expect(nearHead(head, dir, 12, 8, 1, 4)).toBe(true);
    expect(nearHead(head, dir, 13, 8, 1, 4)).toBe(false);
    expect(nearHead(head, dir, 4, 8, 1, 4)).toBe(false);
  });

  it('MEC-004 nearHead lane follows dir', () => {
    expect(nearHead({ x: 8, y: 8 }, { x: 0, y: -1 }, 8, 4, 1, 4)).toBe(true);
  });

  it('MEC-004 reachable stops at walls and finds pockets', () => {
    const a = reachable(5, 5, { x: 0, y: 0 }, x => x === 2);
    expect(a.has(key(5, 4, 4))).toBe(false);
    expect(a.size).toBe(10);
    const b = reachable(5, 5, { x: 0, y: 0 }, (x, y) => x === 2 && y !== 4);
    expect(b.has(key(5, 4, 4))).toBe(true);
    expect(b.size).toBe(21);
  });

  it('MEC-004 reachable never leaves the board', () => {
    const s = reachable(5, 5, { x: 0, y: 0 }, () => false);
    expect(s.size).toBe(25);
    for (const k of s) expect(k >= 0 && k < 25).toBe(true);
  });
});
