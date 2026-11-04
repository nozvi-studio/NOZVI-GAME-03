import { afterEach, expect, it, vi } from 'vitest';
import type { GameScene } from '../../src/game/scenes/GameScene';
import type Phaser from 'phaser';
import { bindSwipe } from '../../src/game/input/swipe';
import { loadBalance } from '../support/balance';
import { DrawObject, sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const h = sceneHarness(), browser = new Signals(), canvas = new Signals(), turns: number[][] = [];
  vi.stubGlobal('window', { addEventListener: browser.on.bind(browser), removeEventListener: browser.off.bind(browser) });
  const game = Object.assign(h.scene, { balance: loadBalance(), scale: { displayScale: { x: 1 } },
    turn: (x: number, y: number) => turns.push([x, y]),
    game: { canvas: { addEventListener: canvas.on.bind(canvas), removeEventListener: canvas.off.bind(canvas) } } });
  const board = new DrawObject();
  bindSwipe(game as unknown as GameScene, board as unknown as Phaser.GameObjects.Zone);
  return { ...h, browser, board, turns };
}
it('GDD-13 releasing a board swipe over a HUD button cannot leave mouse hover turning', () => {
  const h = setup(), pointer = { id: 0, identifier: 0, event: { clientX: 100, clientY: 100 } };
  h.board.emit('pointerdown', pointer);
  h.scene.input.emit('pointermove', { ...pointer, event: { clientX: 130, clientY: 100 } });
  expect(h.turns).toEqual([[1, 0]]);
  // HUD captures Phaser pointerup: only the native release reaches the swipe adapter.
  h.browser.emit('mouseup', {});
  h.scene.input.emit('pointermove', { ...pointer, event: { clientX: 180, clientY: 100 } });
  expect(h.turns).toEqual([[1, 0]]);
});
it('GDD-13 native touch release tracks the active finger and shutdown removes its listeners', () => {
  const h = setup();
  const pointer = (identifier: number, x: number) => ({ id: 1, identifier,
    event: { changedTouches: [{ identifier, clientX: x, clientY: 100 }] } });
  h.board.emit('pointerdown', pointer(7, 100));
  h.browser.emit('touchend', { changedTouches: [{ identifier: 9 }] });
  h.scene.input.emit('pointermove', pointer(7, 130)); expect(h.turns).toEqual([[1, 0]]);
  h.browser.emit('touchend', { changedTouches: [{ identifier: 7 }] });
  h.board.emit('pointerdown', pointer(8, 200));
  h.scene.input.emit('pointermove', pointer(8, 200)); expect(h.turns).toEqual([[1, 0]]);
  h.scene.events.emit('shutdown'); h.browser.emit('touchend', { changedTouches: [{ identifier: 8 }] });
  h.scene.input.emit('pointermove', pointer(8, 250)); expect(h.turns).toEqual([[1, 0]]);
});
