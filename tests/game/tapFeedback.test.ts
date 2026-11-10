import { beforeEach, expect, it, vi } from 'vitest';
import { roundIconButton, tap } from '../../src/game/ui/menuWidgets';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {}, Math: { DegToRad: (d: number) => d } } }));
vi.mock('../../src/game/ui/touchFx', () => ({ tapBurst: vi.fn(), denied: vi.fn() }));
vi.mock('../../src/game/ui/icons', () => ({ drawIcon: vi.fn() }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });
type Emitter = { emit(k: string): void };

it('MOT-1-R6 tap without a visual behaves as before and attaches nothing', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const z = tap(scene as never, 0, 0, 50, 50, 'z', act) as unknown as Emitter;
  z.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  z.emit('pointerdown'); z.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1);
  z.emit('pointerdown'); z.emit('pointerout'); z.emit('pointerup'); expect(act).toHaveBeenCalledTimes(1);
  expect(h.calls.length).toBe(0);
});
it('MOT-1-R6 tap with fx animates the visual, never the zone, and keeps the press-started-here rule', () => {
  const { scene } = sceneHarness(), act = vi.fn(), visual = scene.add.container(0, 0);
  const z = tap(scene as never, 0, 0, 50, 50, 'z', act, { visual: visual as never, kind: 'card', navigates: true }) as unknown as Emitter;
  const [, v, kind, opts] = h.calls[0] as [unknown, unknown, string, Record<string, unknown>];
  expect(v).toBe(visual); expect(kind).toBe('card'); expect(opts).toMatchObject({ navigates: true }); expect(opts.source).toBe(z);
  z.emit('pointerup'); expect(act).not.toHaveBeenCalled();
  z.emit('pointerdown'); expect(h.fb.press).toHaveBeenCalledTimes(1);
  z.emit('pointerup'); expect(h.fb.release).toHaveBeenCalled(); expect(act).toHaveBeenCalledTimes(1);
  z.emit('pointerdown'); z.emit('pointerout'); expect(h.fb.release).toHaveBeenCalledTimes(3);
});
it('MOT-1-R6 roundIconButton binds its face image and icon as the round visual (D3-R6) and keeps the hit zone size', () => {
  const { scene, objects } = sceneHarness(), act = vi.fn();
  const c = roundIconButton(scene as never, 40, 50, 48, 'back', 'rb', act, false, { navigates: true });
  const [, v, kind, opts] = h.calls[0] as [unknown, unknown, string, Record<string, unknown>];
  const kids = (c as unknown as { list: unknown[] }).list; expect(v).toEqual([kids[1], kids[2]]); expect(kind).toBe('round'); expect(opts).toMatchObject({ navigates: true });
  const zone = objects.find(o => o.name === 'rb-hit')!;
  expect(opts.source).toBe(zone); expect(zone.width).toBeGreaterThanOrEqual(48); expect(zone.width).toBe(zone.height);
});
