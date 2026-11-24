import { describe, expect, it } from 'vitest';
import { coverCamera } from '../../../src/game/bg/coverFit';

describe('META-BG-R3 coverCamera', () => {
  it('META-BG-R3 covers 540x960 canvas with 572x1024 content without letterboxing', () => {
    const c = coverCamera(540, 960, 572, 1024);
    expect(c.zoom).toBeCloseTo(540 / 572, 6);
    expect(c.zoom * 572).toBeGreaterThanOrEqual(540 - 1e-6);
    expect(c.zoom * 1024).toBeGreaterThanOrEqual(960 - 1e-6);
    expect(c.centerX).toBe(286);
    expect(c.centerY).toBe(512);
  });

  it('META-BG-R3 covers tall 540x1200 canvas using vertical scale', () => {
    const c = coverCamera(540, 1200, 572, 1024);
    expect(c.zoom).toBeCloseTo(1200 / 1024, 6);
    expect(c.zoom * 572).toBeGreaterThanOrEqual(540 - 1e-6);
    expect(c.zoom * 1024).toBeCloseTo(1200, 6);
    expect(c.centerX).toBe(286);
    expect(c.centerY).toBe(512);
  });

  it('META-BG-R3 handles wider viewports using horizontal scale', () => {
    const c = coverCamera(800, 600, 572, 1024);
    expect(c.zoom).toBeCloseTo(800 / 572, 6);
  });

  it('META-BG-R3 guards invalid non-positive dimensions with safe fallback', () => {
    const c = coverCamera(0, 960, 572, 1024);
    expect(c.zoom).toBe(1);
    expect(c.centerX).toBe(286);
    expect(c.centerY).toBe(512);
  });
});
