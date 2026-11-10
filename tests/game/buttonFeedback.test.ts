import { beforeEach, expect, it, vi } from 'vitest';
import { button } from '../../src/game/scenes/ui';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });

it('MOT-1-R3 greybox button animates its graphic and label (kind hudButton), not the hit container, and keeps the press rule', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = button(scene as never, 10, 20, 120, 40, 'Go', 'b', act);
  const [, visuals, kind, opts] = h.calls[0] as [unknown, unknown[], string, Record<string, unknown>];
  expect(visuals[0]).toBe(b.g); expect(visuals[1]).toBe(b.text); expect(kind).toBe('hudButton'); expect(opts.source).toBe(b.c);
  const c = b.c as unknown as { emit(k: string): void };
  c.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  c.emit('pointerdown'); c.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1); expect(h.fb.press).toHaveBeenCalledTimes(1);
});
