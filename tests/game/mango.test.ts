import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { createSim } from '../../src/core';
import { drawMango } from '../../src/game/render/mango';
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
    drawMango(graphics, snapshot, 30, LIGHT, 500, false, 0);
    expect(scales).toEqual([[1, 1]]);
    expect(sim.snapshot().mango?.ageMs).toBe(0);
  });
  it('MEC-002 a newly appeared mango uses its own presentation birth time', () => {
    const { graphics, scales } = graphicsProbe();
    drawMango(graphics, createSim(loadBalance(), 1).snapshot(), 30, LIGHT, 610, false, 500);
    expect(scales).toEqual([[0.5, 0.5]]);
  });
  it('MEC-002 reduced motion shows the full mango immediately', () => {
    const { graphics, scales } = graphicsProbe();
    drawMango(graphics, createSim(loadBalance(), 1).snapshot(), 30, LIGHT, 500, true, 500);
    expect(scales).toEqual([[1, 1]]);
  });
});
