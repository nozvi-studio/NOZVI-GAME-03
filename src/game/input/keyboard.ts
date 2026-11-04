import Phaser from 'phaser';
import type { Step } from '../../core';
import type { GameScene } from '../scenes/GameScene';

const KEYS: Record<string, [Step, Step]> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

// GDD-13 keyboard and HUD use the same run-flow and turn paths.
export function bindKeyboard(scene: GameScene): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;
  const onKey = (event: KeyboardEvent): void => {
    const dir = KEYS[event.code];
    if (dir) { event.preventDefault(); scene.turn(...dir); return; }
    if (event.code === 'KeyM') { event.preventDefault(); scene.events.emit('toggle-sound'); return; }
    if (event.code === 'Space' || event.code === 'KeyP' || event.code === 'Escape') {
      event.preventDefault();
      scene.flowKey(event.code);
    }
  };
  keyboard.on('keydown', onKey);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard.off('keydown', onKey));
}
