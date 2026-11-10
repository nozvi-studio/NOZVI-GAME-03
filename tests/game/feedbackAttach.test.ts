import { describe, expect, it, vi } from 'vitest';
import { attachFeedback, feedbackOf, pivotAt } from '../../src/game/ui/feedback';
import { Signals, sceneHarness } from '../support/scene';
import { loadBalance } from '../support/balance';

vi.mock('phaser', () => ({ default: { Scene: class {} } }));
const cfg = loadBalance().motion;
const target = () => { const t = { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1,
  setScale(x: number, y = x) { t.scaleX = x; t.scaleY = y; return t; }, setAlpha(a: number) { t.alpha = a; return t; },
  setPosition(x: number, y = x) { t.x = x; t.y = y; return t; } }; return t; };
const sceneWith = () => {
  const h = sceneHarness(), adds: Record<string, unknown>[] = [];
  h.registry.set('balance', loadBalance());
  Object.assign(h.scene, { tweens: { add: (c: Record<string, unknown>) => { adds.push(c); return { stop: () => {} }; }, killTweensOf: () => {} } });
  Object.assign(h.scene.sys, { game: { device: { input: { touch: false } } } });
  return { h, adds };
};

describe('MOT-1 attachFeedback', () => {
  it('MOT-1-R1 binds hover on the source, tweens through the adapter and registers feedbackOf', () => {
    const { h, adds } = sceneWith(), src = new Signals(), v = target();
    const fb = attachFeedback(h.scene as never, v as never, 'round', { source: src });
    expect(feedbackOf(src)).toBe(fb);
    src.emit('pointerover'); expect(adds[0]).toMatchObject({ targets: v, scaleX: cfg.hoverScale });
    src.emit('pointerout'); expect(adds[1]).toMatchObject({ scaleX: 1 });
  });
  it('MOT-1-R3 card kind goes through the half-delta adapter', () => {
    const { h, adds } = sceneWith(), src = new Signals();
    attachFeedback(h.scene as never, [target() as never], 'card', { source: src }).press();
    expect(adds[0]!.scaleX as number).toBeCloseTo(1 - (1 - cfg.pressScale) / 2, 10);
  });
  it('MOT-1-R7 a destroy event on the source stops further feedback', () => {
    const { h, adds } = sceneWith(), src = new Signals();
    const fb = attachFeedback(h.scene as never, target() as never, 'pill', { source: src });
    src.emit('destroy'); fb.press(); src.emit('pointerover');
    expect(adds.length).toBe(0);
  });
  it('MOT-1-R4 navigates uses scene.time.delayedCall with tapUpMs', () => {
    const { h } = sceneWith(), src = new Signals(); let n = 0;
    attachFeedback(h.scene as never, target() as never, 'pill', { source: src, navigates: true }).fire(() => n++);
    expect(n).toBe(0); expect(h.delayed[0]!.delay).toBe(cfg.tapUpMs);
    h.flush(); expect(n).toBe(1);
  });
  it('MOT-1-R10 pivotAt nests inner at (-cx, -cy) inside a pivot at (cx, cy) inside the parent', () => {
    const { h } = sceneWith(), parent = h.scene.add.container(0, 0);
    const { pivot, inner } = pivotAt(h.scene as never, parent as never, 100, 50);
    expect([pivot.x, pivot.y, inner.x, inner.y]).toEqual([100, 50, -100, -50]);
    expect(parent.list).toContain(pivot); expect(pivot.list).toContain(inner);
  });
});
