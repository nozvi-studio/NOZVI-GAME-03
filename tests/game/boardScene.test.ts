import { afterEach, expect, it, vi } from 'vitest';
import { GameScene } from '../../src/game/scenes/GameScene';
import type { Effects } from '../../src/game/render/effects';
import { loadBalance } from '../support/balance';
import { DrawObject, sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Core: { Events: { BLUR: 'blur', HIDDEN: 'hidden' } } } }));
afterEach(() => vi.unstubAllGlobals());
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
