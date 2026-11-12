import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/core';
import { drawSnake, snakeWidths } from '../../src/game/render/snake';
import { boardLook } from '../../src/game/render/biomePalette';
import { loadBalance } from '../support/balance';

function probe() {
  const circles: number[][] = [];
  const g = new Proxy({}, { get: (_o, m: string) => (...a: number[]) => { if (m === 'fillCircle') circles.push(a); return g; } }) as unknown as Phaser.GameObjects.Graphics;
  return { g, circles };
}
const snap = () => ({ ...createSim(loadBalance(), 1).snapshot(), snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }], tailFrom: { x: 2, y: 5 } }) as never;

describe('MOT-3-R12 turn bulge', () => {
  it('bulge 0 draws no extra disc; bulge > 0 adds one disc on the first body point with the scaled radius', () => {
    const a = probe(); drawSnake(a.g, snap(), 30, boardLook(1), 0, false, 0);
    const b = probe(); drawSnake(b.g, snap(), 30, boardLook(1), 0, false, 0.06);
    expect(b.circles.length).toBe(a.circles.length + 1);
    const extra = b.circles.at(-1)!;
    expect(extra[0]).toBeCloseTo((4 + 0.5) * 30, 10); expect(extra[1]).toBeCloseTo((5 + 0.5) * 30, 10);
    expect(extra[2]).toBeCloseTo(snakeWidths(30).body / 2 * 1.06, 10);
  });
});
