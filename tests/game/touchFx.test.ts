import { beforeEach, expect, it, vi } from 'vitest';
import { loadBalance } from '../support/balance';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ reduced: false, eases: [] as { ms: number; step: (v: number) => void }[] }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/game/render/palette', () => ({ reduceMotion: () => h.reduced }));
vi.mock('../../src/game/motion', async (orig) => ({
  ...(await orig<typeof import('../../src/game/motion')>()),
  motionFor: () => ({ ease: (_t: { v: number }, _to: number, ms: number, step: (v: number) => void) => { h.eases.push({ ms, step }); } }),
  motionCfgFor: () => loadBalance().motion,
}));
import { denied, liveParticles, tapBurst } from '../../src/game/ui/touchFx';

const c = loadBalance().motion.d3;
beforeEach(() => { h.reduced = false; h.eases.length = 0; });

it('D3-R23 a primary tap spawns one ring and six sparks, all released at the end', () => {
  const { scene } = sceneHarness();
  tapBurst(scene as never, 100, 200, 'primary');
  expect(liveParticles(scene as never)).toBe(1 + c.burstSparks);
  expect(h.eases[0]!.ms).toBe(c.burstMs);
  h.eases[0]!.step(1);
  expect(liveParticles(scene as never)).toBe(0);
});
it('D3-R23 a light tap spawns the ring only', () => {
  const { scene } = sceneHarness();
  tapBurst(scene as never, 0, 0, 'light');
  expect(liveParticles(scene as never)).toBe(1);
});
it('D3-R28 reduced motion: ring fade only, and denied does not move the target', () => {
  h.reduced = true;
  const { scene } = sceneHarness();
  tapBurst(scene as never, 0, 0, 'primary');
  expect(liveParticles(scene as never)).toBe(1); expect(h.eases[0]!.ms).toBe(c.ringFadeMs);
  const target = { x: 50, y: 0, alpha: 1, scaleX: 1, scaleY: 1, setAlpha() { return target; }, setScale() { return target; }, setPosition() { return target; } };
  const badge = { tint: 0, setTint(v: number) { badge.tint = v; }, clearTint() { badge.tint = -1; } };
  denied(scene as never, target as never, badge);
  expect(target.x).toBe(50); expect(badge.tint).toBeGreaterThan(0);
  h.eases.at(-1)!.step(1); expect(badge.tint).toBe(-1);
});
it('D3-R24 denied shakes the target around its rest x and returns to it', () => {
  const { scene } = sceneHarness();
  const target = { x: 50, y: 0, alpha: 1, scaleX: 1, scaleY: 1, setAlpha() { return target; }, setScale() { return target; }, setPosition() { return target; } };
  denied(scene as never, target as never);
  const e = h.eases.at(-1)!; expect(e.ms).toBe(c.shakeMs);
  e.step(1 / (4 * c.shakeCycles)); expect(target.x).not.toBe(50);
  e.step(1); expect(target.x).toBe(50);
});
