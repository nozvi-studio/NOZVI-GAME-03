import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { keyAction } from './keyMap';

// GDD-13 keyboard and HUD use the same run-flow and turn paths.
// MEC-001 turns are queued on the native keydown itself (like swipe), not via Phaser's
// keyboard plugin, which buffers DOM key events and only dispatches them on the next game step.
export function bindKeyboard(scene: GameScene): void {
  const onKey = (event: KeyboardEvent): void => {
    if (!scene.sys.isActive()) return;
    const action = keyAction(event.code);
    if (!action) return;
    event.preventDefault();
    if (action.type === 'turn') scene.turn(action.dx, action.dy);
    else if (action.type === 'sound') scene.events.emit('toggle-sound');
    else scene.flowKey(action.code);
  };
  window.addEventListener('keydown', onKey);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', onKey));
}
