import { beforeEach, expect, it, vi } from 'vitest';
import { pillGeom, pillHitRect } from '../../src/game/ui/geometry';
import { pillButton } from '../../src/game/ui/widgets';
import { TOKENS } from '../../src/game/uiTokens';
import { sceneHarness } from '../support/scene';

const h = vi.hoisted(() => ({ calls: [] as unknown[][], rects: [] as number[][],
  fb: { press: vi.fn(), release: vi.fn(), over: vi.fn(), out: vi.fn(), fire: vi.fn((a: () => void) => a()) } }));
vi.mock('phaser', () => ({ default: { Scene: class {}, Geom: { Rectangle: class { constructor(...a: number[]) { h.rects.push(a); } static Contains = () => true } } } }));
vi.mock('../../src/game/ui/touchFx', () => ({ tapBurst: vi.fn(), denied: vi.fn() }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: (...a: unknown[]) => { h.calls.push(a); return h.fb; } }));
beforeEach(() => { h.calls.length = 0; h.rects.length = 0; for (const f of Object.values(h.fb)) f.mockClear(); });

it('MOT-1-R2 pillButton keeps the face-plus-shelf hit rect and attaches the pill wrapper to face and label only', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = pillButton(scene as never, 100, 200, 200, 60, 'Go', 'p', act, 'green', { navigates: true });
  const geom = pillGeom(200, 60, TOKENS.d3.shape.lipBig), hit = pillHitRect(geom);
  expect(h.rects.at(-1)).toEqual([hit.x, hit.y, hit.w, hit.h]);
  const [, visuals, kind, opts] = h.calls.at(-1) as [unknown, unknown[], string, Record<string, unknown>];
  expect(visuals[0]).toBe(b.g); expect(visuals[1]).toBe(b.text); expect(visuals.length).toBe(2);
  expect(kind).toBe('pill');
  expect(opts).toMatchObject({ dipPx: geom.pressedDy, navigates: true }); expect(opts.source).toBe(b.c);
});
it('MOT-1-R2 pillButton fires its action only after a press on it, through the wrapper', () => {
  const { scene } = sceneHarness(), act = vi.fn();
  const b = pillButton(scene as never, 0, 0, 200, 60, 'Go', 'p', act) as unknown as { c: { emit(k: string): void } };
  b.c.emit('pointerup'); expect(act).not.toHaveBeenCalled(); expect(h.fb.press).not.toHaveBeenCalled();
  b.c.emit('pointerdown'); expect(h.fb.press).toHaveBeenCalledTimes(1);
  b.c.emit('pointerup'); expect(h.fb.release).toHaveBeenCalled(); expect(act).toHaveBeenCalledTimes(1);
});
