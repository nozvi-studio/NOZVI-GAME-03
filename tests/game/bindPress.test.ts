import { expect, it, vi } from 'vitest';
import { bindPress } from '../../src/game/scenes/ui';
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
const fake = () => {
  const h = new Map<string, (...a: unknown[]) => void>();
  return { c: { on: (k: string, f: (...a: unknown[]) => void) => { h.set(k, f); } } as never, fire: (k: string, ...a: unknown[]) => h.get(k)?.(...a) };
};
it('P3-0-R7 bindPress forwards event data and stops propagation only when asked', () => {
  const ev = { stopPropagation: vi.fn() };
  const got: unknown[] = [];
  const a = fake();
  bindPress(a.c, e => got.push(e), () => {}, e => got.push(e), true);
  a.fire('pointerdown', {}, 0, 0, ev); a.fire('pointerup', {}, 0, 0, ev);
  expect(got).toEqual([ev, ev]);
  expect(ev.stopPropagation).toHaveBeenCalledTimes(2);
  const b = fake(); ev.stopPropagation.mockClear();
  bindPress(b.c, () => {}, () => {}, () => {});
  b.fire('pointerdown', {}, 0, 0, ev); b.fire('pointerup', {}, 0, 0, ev);
  expect(ev.stopPropagation).not.toHaveBeenCalled();
});
it('P3-0-R7 bindPress fires action only after a press on the target', () => {
  const action = vi.fn(); const a = fake();
  bindPress(a.c, () => {}, () => {}, action);
  a.fire('pointerup'); expect(action).not.toHaveBeenCalled();
  a.fire('pointerdown'); a.fire('pointerup'); expect(action).toHaveBeenCalledTimes(1);
});
