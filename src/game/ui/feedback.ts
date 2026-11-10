// MOT-1-R1 the single widget feedback wrapper. Calls only the MOT-0 adapter; never scene.tweens.add.
import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { motionFor } from '../motion';
import { createMotion, type Motion, type MotionTarget, type TweenHost } from '../motion/motionCore';
import { reduceMotion } from '../render/palette';
import { createFeedback, type Feedback, type FeedbackOpts } from './feedbackCore';
import { halfMotionCfg, type FeedbackKind } from './feedbackModel';
import { ui } from './layout';

export interface FeedbackSource { on(event: string, fn: (...args: any[]) => void): unknown }
export interface AttachOpts extends FeedbackOpts { source: FeedbackSource }

const halves = new WeakMap<object, Motion>();
/** Per-scene half-delta adapter for kind `card` (plan decision 2); same host, flags and shake as `motionFor`. */
function halfMotionFor(scene: Phaser.Scene): Motion {
  const cached = halves.get(scene);
  if (cached) return cached;
  const b = scene.registry.get('balance') as Balance;
  const made = createMotion({ tweens: scene.tweens as unknown as TweenHost, cfg: halfMotionCfg(b.motion), softMs: b.juice.reduced.softMs,
    reduced: reduceMotion, finePointer: !scene.sys.game.device.input.touch, ui, shake: { ampPx: b.ui.hud.rejectShakeAmpPx, ms: b.ui.hud.rejectShakeMs } });
  halves.set(scene, made);
  scene.events.once('shutdown', () => { made.dispose(); halves.delete(scene); });
  return made;
}

const registered = new WeakMap<object, Feedback>();
/** The feedback attached to a hit object (`pillButton` container, `tap` zone, HUD button), if any. */
export const feedbackOf = (source: object): Feedback | undefined => registered.get(source);

/** Bind feedback for `visual` (never the hit object, MOT-1-R2) and hover/destroy listeners on `opts.source`. */
export function attachFeedback(scene: Phaser.Scene, visual: MotionTarget | MotionTarget[], kind: FeedbackKind, opts: AttachOpts): Feedback {
  const visuals = (Array.isArray(visual) ? visual : [visual]) as MotionTarget[];
  const b = scene.registry.get('balance') as Balance;
  const fb = createFeedback({ motion: motionFor(scene), half: halfMotionFor(scene), cfg: b.motion, reduced: reduceMotion,
    delay: (ms, fn) => { scene.time.delayedCall(ms, fn); } }, visuals, kind, { navigates: opts.navigates, dipPx: opts.dipPx });
  opts.source.on('pointerover', () => fb.over());
  opts.source.on('pointerout', () => fb.out());
  opts.source.on('destroy', () => fb.destroy());
  registered.set(opts.source, fb);
  return fb;
}

/** Pivot container at (cx, cy) with an offset `inner` so children keep ABSOLUTE coordinates but scale about the pivot centre. */
export function pivotAt(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, cx: number, cy: number):
  { pivot: Phaser.GameObjects.Container; inner: Phaser.GameObjects.Container } {
  const inner = scene.add.container(-cx, -cy);
  const pivot = scene.add.container(cx, cy, [inner]);
  parent.add(pivot);
  return { pivot, inner };
}
