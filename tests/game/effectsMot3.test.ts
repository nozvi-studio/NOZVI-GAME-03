import { describe, expect, it } from 'vitest';
import { Effects, type EffectCaps } from '../../src/game/render/effects';
import { LIGHT } from '../../src/game/render/palette';
import { turnTilt } from '../../src/game/motion/curves';
import { DrawObject, sceneHarness } from '../support/scene';

const caps: EffectCaps = { maxParticles: 10, maxFloats: 2, gulpMs: 100, ringMax: 2, sparkleMax: 3, overshoot: 1.7, sparkleRadius: 0.2, sparkleThickness: 0.06 };
const make = (reduced = false) => new Effects(sceneHarness().scene as never, new DrawObject() as never, 20, reduced, caps);
const priv = (fx: Effects) => fx as unknown as { rings: unknown[]; stars: unknown[]; particles: unknown[] };

describe('MOT-3 Effects', () => {
  it('MOT-3-R2 rings never exceed ringMax (oldest dropped)', () => {
    const fx = make();
    for (let i = 0; i < 6; i++) fx.ringPulse(1, 1, 0xff0000, 2.2, 320);
    expect(priv(fx).rings.length).toBe(2);
  });
  it('MOT-3-R13 stars never exceed sparkleMax and burst trims to maxParticles minus live stars', () => {
    const fx = make();
    for (let i = 0; i < 9; i++) fx.sparkle(2, 2, 0xffcc00, 420);
    expect(priv(fx).stars.length).toBe(3);
    for (let i = 0; i < 40; i++) fx.burst(1, 1, 0xffffff, 10);
    expect(priv(fx).particles.length).toBeLessThanOrEqual(caps.maxParticles - 3);
  });
  it('MOT-3-R13 a star dies after its life and clearSparkles removes all at once', () => {
    const fx = make();
    fx.sparkle(2, 2, 0xffcc00, 420); fx.update(421); expect(priv(fx).stars.length).toBe(0);
    fx.sparkle(2, 2, 0xffcc00, 420); fx.sparkle(3, 3, 0xffcc00, 420); fx.clearSparkles(); expect(priv(fx).stars.length).toBe(0);
  });
  it('MOT-3-R13 a live star draws two crossed rects; a ring draws one stroked circle', () => {
    const fx = make(), g = new DrawObject();
    fx.sparkle(2, 2, 0xffcc00, 420); fx.update(210); fx.draw(g as never, LIGHT);
    expect(g.commands.filter(c => c[0] === 'fillRect').length).toBe(2);
    fx.ringPulse(1, 1, 0xff0000, 2.2, 320); g.clear(); fx.draw(g as never, LIGHT);
    expect(g.commands.filter(c => c[0] === 'strokeCircle').length).toBe(1);
  });
  it('MOT-3-R12 turn tilt starts at +-deg toward the new direction and returns to 0 at turnMs', () => {
    const fx = make();
    fx.turnTilt(1, 0, 10, 140); expect(fx.turnDeg).toBeCloseTo(10, 10); expect(fx.turnBulge).toBeCloseTo(1, 10);
    fx.update(70); expect(fx.turnDeg).toBeCloseTo(turnTilt(70, 140, 10, 1.7), 10);
    fx.update(70); expect(fx.turnDeg).toBeCloseTo(0, 10); expect(fx.turnBulge).toBeCloseTo(0, 10);
    fx.turnTilt(-1, 0, 10, 140); expect(fx.turnDeg).toBeCloseTo(-10, 10);
    fx.turnTilt(0, -1, 10, 140); expect(fx.turnDeg).toBeCloseTo(-10, 10); // up tilts left like left; down tilts right
    fx.turnTilt(0, 1, 10, 140); expect(fx.turnDeg).toBeCloseTo(10, 10);
  });
  it('MOT-3-R12 a rapid second turn restarts the ease from full amplitude', () => {
    const fx = make();
    fx.turnTilt(1, 0, 10, 140); fx.update(100); fx.turnTilt(0, 1, 10, 140);
    expect(fx.turnDeg).toBeCloseTo(10, 10); fx.update(140); expect(fx.turnDeg).toBeCloseTo(0, 10);
  });
  it('MOT-3-R15 reduced motion: ring, sparkle and tilt are no-ops', () => {
    const fx = make(true);
    fx.ringPulse(1, 1, 1, 2, 100); fx.sparkle(1, 1, 1, 100); fx.turnTilt(1, 0, 10, 140);
    expect(priv(fx).rings.length).toBe(0); expect(priv(fx).stars.length).toBe(0); expect(fx.turnDeg).toBe(0);
  });
  it('MOT-3 reset clears rings, stars and tilt', () => {
    const fx = make();
    fx.ringPulse(1, 1, 1, 2, 100); fx.sparkle(1, 1, 1, 100); fx.turnTilt(1, 0, 10, 140); fx.reset();
    expect(priv(fx).rings.length).toBe(0); expect(priv(fx).stars.length).toBe(0); expect(fx.turnDeg).toBe(0); expect(fx.turnBulge).toBe(0);
  });
});
