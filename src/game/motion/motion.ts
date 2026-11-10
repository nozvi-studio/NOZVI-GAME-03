import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { reduceMotion } from '../render/palette';
import { ui } from '../ui/layout';
import { createMotion, type Motion, type TweenHost } from './motionCore';

const cache = new WeakMap<object, Motion>();
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
