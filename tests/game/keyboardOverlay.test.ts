import { afterEach, expect, it, vi } from 'vitest';
import { bindKeyboard } from '../../src/game/input/keyboard';
vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));
afterEach(() => vi.unstubAllGlobals());

function setup(settingsActive: boolean) {
  let handler: (e: KeyboardEvent) => void = () => {};
  vi.stubGlobal('window', { addEventListener: (_: string, h: typeof handler) => { handler = h; }, removeEventListener() {} });
  const flowKey = vi.fn(), turn = vi.fn();
  const scene = { sys: { isActive: () => true }, scene: { isActive: (k: string) => k === 'Settings' && settingsActive },
    events: { once() {}, emit() {} }, flowKey, turn };
  bindKeyboard(scene as never);
  const preventDefault = vi.fn();
  return { press: (code: string) => handler({ code, preventDefault } as unknown as KeyboardEvent), flowKey, turn, preventDefault };
}

it('P3b3-R7 game keys are ignored while the Settings overlay is active', () => {
  const k = setup(true);
  k.press('Space'); k.press('Escape'); k.press('ArrowUp');
  expect(k.flowKey).not.toHaveBeenCalled();
  expect(k.turn).not.toHaveBeenCalled();
});
it('MEC-001 keys still reach the game without the overlay', () => {
  const k = setup(false);
  k.press('Space'); k.press('ArrowUp');
  expect(k.flowKey).toHaveBeenCalledWith('Space');
  expect(k.turn).toHaveBeenCalledWith(0, -1);
});
