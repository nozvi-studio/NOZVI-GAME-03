import { describe, expect, it } from 'vitest';
import { colorOf } from '../../src/game/juice/colors';
import { LIGHT, DARK, P1_COLORS } from '../../src/game/render/palette';
import { trimOldest } from '../../src/game/juice/juiceMap';
import { Effects } from '../../src/game/render/effects';
import { DrawObject, sceneHarness } from '../support/scene';

describe('P3a-R11 caps and colours', () => {
  it('every ColorId resolves to a number in both themes', () => {
    for (const p of [LIGHT, DARK]) for (const id of ['food', 'gold', 'rock', 'snake', 'danger', 'orb', 'slowmo', 'tailSnip', 'shield', 'mangoRain'] as const)
      expect(Number.isInteger(colorOf(id, p)), id).toBe(true);
    expect(colorOf('slowmo', LIGHT)).toBe(P1_COLORS.slowmo);
  });
  it('a 1000-burst storm never holds more than maxParticles', () => {
    const list: number[] = [];
    for (let i = 0; i < 1000; i++) { list.push(i); trimOldest(list, 300); }
    expect(list.length).toBe(300); expect(list[299]).toBe(999);
  });
});

describe('P3a-R11 Effects behaviour', () => {
  const make = () => {
    const h = sceneHarness();
    return new Effects(h.scene as never, new DrawObject() as never, 20, false, { maxParticles: 5, maxFloats: 2, gulpMs: 100 });
  };
  it('P3a-R11 particles stay under maxParticles', () => {
    const fx = make();
    for (let i = 0; i < 100; i++) fx.burst(1, 1, 0xffffff, 10);
    expect((fx as any).particles.length).toBeLessThanOrEqual(5);
  });
  it('P3a-R11 floats stay under maxFloats', () => {
    const fx = make();
    for (let i = 0; i < 3; i++) fx.floatText(1, 1, 10, false);
    expect((fx as any).floats.length).toBe(2);
  });
  it('P3a-R4 glow decays at alpha/ms', () => {
    const fx = make();
    fx.glow(0.6, 600); fx.update(300);
    expect(fx.levelFlash).toBeCloseTo(0.3, 5);
  });
  it('P3a-R3 tint fades out after autoClearMs', () => {
    const fx = make();
    fx.setTint(0xff0000, 0.2, 100, 200);
    fx.update(150);
    expect((fx as any).tintTarget).toBe(0.2);
    fx.update(100);
    expect((fx as any).tintTarget).toBe(0);
  });
});
