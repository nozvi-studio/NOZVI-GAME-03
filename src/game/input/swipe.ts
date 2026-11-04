import Phaser from 'phaser';
import { BOARD } from '../layout';
import type { GameScene } from '../scenes/GameScene';
import { swipeDir, swipePoint, swipeThreshold } from './swipeMath';

// GDD-13 one board-started pointer drives chained swipes in CSS pixels.
export function bindSwipe(scene: GameScene, boardZone: Phaser.GameObjects.Zone): void {
  let anchor: { x: number; y: number } | null = null;
  let pointerId: number | null = null;
  let touchId: number | null = null;
  const down = (pointer: Phaser.Input.Pointer): void => {
    if (pointerId !== null) return;
    anchor = swipePoint(pointer.event, pointer.identifier);
    if (anchor) {
      pointerId = pointer.id;
      touchId = 'changedTouches' in pointer.event ? pointer.identifier : null;
    }
  };
  const move = (pointer: Phaser.Input.Pointer): void => {
    if (!anchor || pointer.id !== pointerId) return;
    const point = swipePoint(pointer.event, pointer.identifier);
    if (!point) return;
    const b = scene.balance;
    const threshold = swipeThreshold(BOARD.size / scene.scale.displayScale.x, b.ui.swipeMinPx, b.ui.swipeBoardFactor);
    const dir = swipeDir(point.x - anchor.x, point.y - anchor.y, threshold);
    if (!dir) return;
    scene.turn(...dir);
    anchor = point;
  };
  const clear = (): void => { anchor = null; pointerId = null; touchId = null; };
  const up = (pointer: Phaser.Input.Pointer): void => { if (pointer.id === pointerId) clear(); };
  // GDD-13 HUD scene capture may swallow Phaser pointerup; native releases still end the board swipe.
  const mouseUp = (): void => { if (touchId === null) clear(); };
  const touchEnd = (event: TouchEvent): void => {
    for (let i = 0; i < event.changedTouches.length; i++) {
      if (event.changedTouches[i].identifier === touchId) { clear(); break; }
    }
  };
  boardZone.on('pointerdown', down);
  scene.input.on('pointermove', move);
  scene.input.on('pointerup', up);
  scene.input.on('pointerupoutside', up);
  scene.game.canvas.addEventListener('pointercancel', clear);
  window.addEventListener('mouseup', mouseUp, true);
  window.addEventListener('touchend', touchEnd, true);
  window.addEventListener('touchcancel', touchEnd, true);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    clear();
    boardZone.off('pointerdown', down);
    scene.input.off('pointermove', move);
    scene.input.off('pointerup', up);
    scene.input.off('pointerupoutside', up);
    scene.game.canvas.removeEventListener('pointercancel', clear);
    window.removeEventListener('mouseup', mouseUp, true);
    window.removeEventListener('touchend', touchEnd, true);
    window.removeEventListener('touchcancel', touchEnd, true);
  });
}
