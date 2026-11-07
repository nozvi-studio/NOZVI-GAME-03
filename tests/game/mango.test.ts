import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/core';
import { drawMango } from '../../src/game/render/mango';
import { DEFAULT_LOOK } from '../../src/game/render/biomePalette';
import { PART } from '../../src/game/render/boardParts';
import { LIGHT } from '../../src/game/render/palette';
import { loadBalance } from '../support/balance';

// Records the rendering command boundary without loading an engine or browser.
function graphicsProbe(): { graphics: Phaser.GameObjects.Graphics; scales: number[][] } {
  const scales: number[][] = [];
  const graphics = new Proxy({}, {
    get: (_, method) => (...args: number[]) => {
      if (method === 'scaleCanvas') scales.push(args);
      return graphics;
    },
  }) as Phaser.GameObjects.Graphics;
  return { graphics, scales };
}

describe('MEC-002 mango presentation time', () => {
  it('MEC-002 mango grows on the ready board while simulation age remains zero', () => {
    const sim = createSim(loadBalance(), 1);
    const snapshot = sim.snapshot();
    expect(snapshot.mango?.ageMs).toBe(0);
    const { graphics, scales } = graphicsProbe();
    drawMango(graphics, snapshot, 30, LIGHT, DEFAULT_LOOK, 500, false, 0);
    expect(scales).toEqual([[1, 1]]);
    expect(sim.snapshot().mango?.ageMs).toBe(0);
  });
  it('MEC-002 a newly appeared mango uses its own presentation birth time', () => {
    const { graphics, scales } = graphicsProbe();
    drawMango(graphics, createSim(loadBalance(), 1).snapshot(), 30, LIGHT, DEFAULT_LOOK, 610, false, 500);
    expect(scales).toEqual([[0.5, 0.5]]);
  });
  it('MEC-002 reduced motion shows the full mango immediately', () => {
    const { graphics, scales } = graphicsProbe();
    drawMango(graphics, createSim(loadBalance(), 1).snapshot(), 30, LIGHT, DEFAULT_LOOK, 500, true, 500);
    expect(scales).toEqual([[1, 1]]);
  });
});

describe('P3b1-R8 mango art', () => {
  const record = (golden: boolean) => {
    const calls: [string, ...unknown[]][] = [];
    const g = new Proxy({}, { get: (_o, name: string) => (...a: unknown[]) => { calls.push([name, ...a]); return g; } }) as unknown as Phaser.GameObjects.Graphics;
    const sim = createSim(loadBalance(), 1), snap = { ...sim.snapshot(), mango: { ...sim.snapshot().mango!, golden } };
    drawMango(g, snap, 30, LIGHT, DEFAULT_LOOK, 500, true, 0);
    return calls;
  };
  it('P3b1-R8 draws the FoodIcon leaf polygon, a rotated body ellipse and the highlight stroke', () => {
    const calls = record(false);
    const leaf = calls.find(c => c[0] === 'fillPoints')!;
    expect((leaf[1] as unknown[]).length).toBe(17);
    expect(calls.filter(c => c[0] === 'rotateCanvas').some(c => Math.abs((c[1] as number) + 0.349) < 0.01)).toBe(true);
    expect(calls.some(c => c[0] === 'fillStyle' && c[1] === PART.mango.body)).toBe(true);
    expect(calls.some(c => c[0] === 'strokePoints')).toBe(true);
  });
  it('P3b1-R8 golden mango recolours the body to the gold token, normal mango keeps the body token', () => {
    const bodyFill = (golden: boolean) => {
      const calls = record(golden), i = calls.findIndex(c => c[0] === 'fillEllipse');
      return calls.slice(0, i).reverse().find(c => c[0] === 'fillStyle')![1];
    };
    expect(bodyFill(true)).toBe(LIGHT.gold);
    expect(bodyFill(false)).toBe(PART.mango.body);
  });
});
