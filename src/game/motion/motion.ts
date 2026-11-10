import type Phaser from 'phaser';
import type { Balance, MotionBalance } from '../../core';
import { reduceMotion } from '../render/palette';
import { ui } from '../ui/layout';
import { createMotion, type Motion, type TweenHost } from './motionCore';

const cache = new WeakMap<object, Motion>();
/** D3-R23/R24 the motion tokens the scene's Motion adapter runs on. */
export function motionCfgFor(scene: Phaser.Scene): MotionBalance { return (scene.registry.get('balance') as Balance).motion; }
/** MOT-0 per-scene motion adapter: kill-by-target, tween budget, reduced motion (spec section 5/6). */
export function motionFor(scene: Phaser.Scene): Motion {
  let m = cache.get(scene);
  if (m) return m;
  const b = scene.registry.get('balance') as Balance;
  m = createMotion({ tweens: scene.tweens as unknown as TweenHost, cfg: b.motion, softMs: b.juice.reduced.softMs, reduced: reduceMotion,
    finePointer: !scene.sys.game.device.input.touch, ui, shake: { ampPx: b.ui.hud.rejectShakeAmpPx, ms: b.ui.hud.rejectShakeMs } });
  const made = m; cache.set(scene, made);
  scene.events.once('shutdown', () => { made.dispose(); cache.delete(scene); });
  return made;
}
