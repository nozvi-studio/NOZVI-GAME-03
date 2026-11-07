import { afterEach, expect, it, vi } from 'vitest';
import { GameScene } from '../../src/game/scenes/GameScene';
import type { Effects } from '../../src/game/render/effects';
import { DARK, currentPalette, setDisplaySettings } from '../../src/game/render/palette';
import { defaultSettings } from '../../src/meta';
import { loadBalance } from '../support/balance';
import { DrawObject, sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Core: { Events: { BLUR: 'blur', HIDDEN: 'hidden' } } } }));
afterEach(() => { vi.unstubAllGlobals(); setDisplaySettings(null); });
function mounted() {
  const h = sceneHarness(), game = new GameScene(), events = new Signals(), background = vi.fn();
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  h.registry.set('balance', loadBalance());
  Object.assign(game, h.scene, {
    add: { ...h.scene.add, image: () => new DrawObject(), renderTexture: () => new DrawObject() },
    children: { getByName: () => null }, textures: { exists: () => false },
    cameras: { main: { setBackgroundColor: background } },
    game: { events, canvas: { addEventListener() {}, removeEventListener() {} } },
  });
  vi.spyOn(game, 'startRun').mockImplementation(() => {});
  game.create();
  return { game, events, background, scene: h.scene as unknown as { events: Signals } };
}
// The listener's observable effect: recolor() pushes the resolved palette bg to the camera.
const darkSettings = (): void => setDisplaySettings({ ...defaultSettings(), boardTheme: 'dark' });
it('P3b1-R3 settings-closed re-reads the board theme: the listener recolors the camera with the dark palette', () => {
  const { events, background } = mounted();
  darkSettings();
  expect(currentPalette()).toBe(DARK);
  background.mockClear();
  events.emit('settings-closed');
  expect(background).toHaveBeenCalledTimes(1);
  expect(background).toHaveBeenCalledWith(DARK.bg);
});
it('P3b1-R3 the settings-closed listener is removed on SHUTDOWN and a scene restart does not double-register', () => {
  const first = mounted();
  first.scene.events.emit('shutdown');
  darkSettings(); first.background.mockClear();
  first.events.emit('settings-closed');
  expect(first.background).not.toHaveBeenCalled();           // listener removed with the scene
  const second = mounted();                                  // fresh scene instance, fresh game.events
  second.background.mockClear();
  second.events.emit('settings-closed');
  expect(second.background).toHaveBeenCalledTimes(1);        // exactly one listener per create()
});
it('GDD-13 gameplay and floating scores clip inside rounded board while the outline stays above them', () => {
  const h = sceneHarness(), game = new GameScene(), native = new Signals();
  vi.stubGlobal('window', { addEventListener: native.on.bind(native), removeEventListener: native.off.bind(native),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  h.registry.set('balance', loadBalance());
  Object.assign(game, h.scene, {
    add: { ...h.scene.add, image: () => new DrawObject(), renderTexture: () => new DrawObject() },
    children: { getByName: () => null }, textures: { exists: () => false },
    cameras: { main: { setBackgroundColor() {} } },
    game: { events: new Signals(), canvas: { addEventListener() {}, removeEventListener() {} } },
  });
  vi.spyOn(game, 'startRun').mockImplementation(() => {});
  game.create();
  const content = h.find('board'), border = h.find('board-border'), clip = h.find('board-clip');
  expect(content).toBeDefined();
  expect(clip.commands).toContainEqual(['fillRoundedRect', 0, 0, 504, 504, 18]);
  // Phaser documents masking on root containers; the external border must stay separate.
  expect(content.mask).toBeDefined(); expect(border.mask).toBeUndefined();
  expect(content.list).not.toContain(border);
  // Exercise the real score effect owned by GameScene against the renderer boundary double.
  (game as unknown as { effects: Effects }).effects.floatText(0, 0, 1, false);
  expect(content.list.at(-1)?.text).toBe('+1');
  expect(h.objects.indexOf(border)).toBeGreaterThan(h.objects.indexOf(content));
});
