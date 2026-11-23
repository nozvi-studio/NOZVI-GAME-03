// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { burstConfetti, createSvgConfettiFx, setCelebrationFx } from '../../../src/game/dom/confetti';
import { MOTION } from '../../../src/game/dom/motionTokens';
import { FakeClock } from './fakeClock';

describe('D4-P2-R5 confetti and CelebrationFx seam', () => {
  afterEach(() => setCelebrationFx(null));

  it('D4-P2-R5 spawns 14 to 18 particles using token colours only and cleans up', () => {
    const clock = new FakeClock();
    const fx = createSvgConfettiFx(clock);
    const host = document.createElement('div');

    clock.rnd = () => 0;
    fx.burst(host, 50, 60);
    const layer = host.querySelector('.d4-confetti-layer')!;
    const parts = Array.from(layer.querySelectorAll<HTMLElement>('[data-confetti]'));
    expect(parts.length).toBe(14);
    expect(new Set(parts.map(p => p.dataset.confetti))).toEqual(new Set(['circle', 'bar', 'star']));
    for (const p of parts) expect(p.style.color.startsWith('var(--d4-')).toBe(true);
    expect(layer.outerHTML).not.toMatch(/#[0-9a-f]{3,8}/i);

    clock.advance(MOTION.confettiMs);
    expect(host.querySelector('.d4-confetti-layer')).toBeNull();
    expect(clock.pending()).toBe(0);

    clock.rnd = () => 0.999;
    const dispose = fx.burst(host, 10, 20);
    expect(host.querySelectorAll('[data-confetti]').length).toBe(18);
    dispose();
    dispose();
    expect(host.querySelector('.d4-confetti-layer')).toBeNull();
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R5 skipped under reduced motion and supports custom CelebrationFx', () => {
    const clock = new FakeClock();
    const fx = createSvgConfettiFx(clock);
    const rm = document.createElement('div');
    rm.className = 'reduced-motion';
    fx.burst(rm, 10, 20);
    expect(rm.children.length).toBe(0);
    expect(clock.pending()).toBe(0);

    const spy = { burst: vi.fn(() => () => {}) };
    setCelebrationFx(spy);
    const box = document.createElement('div');
    burstConfetti(box, 10, 20);
    expect(spy.burst).toHaveBeenCalledWith(box, 10, 20, undefined);
  });
});
