import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';

vi.mock('phaser', () => ({
  default: {
    Scene: class {},
    Scenes: { Events: { UPDATE: 'update', SHUTDOWN: 'shutdown' } },
    Loader: { Events: { FILE_LOAD_ERROR: 'loaderror' } },
    Scale: { Events: { RESIZE: 'resize' } },
    BlendModes: { ADD: 1 },
    WEBGL: 2,
  },
}));

vi.mock('../../../src/game/motion', () => ({
  goTo: vi.fn(),
}));

import { createPhaserPort } from '../../../src/game/scenes/phaserPort';
import { META_BG_KEY } from '../../../src/game/scenes/MetaBgScene';
import { goTo } from '../../../src/game/motion';

describe('META-BG-R2 createPhaserPort', () => {
  it('META-BG-R2 ignores MetaBg when picking the active foreground scene', () => {
    const metaBg = { scene: { key: META_BG_KEY } } as unknown as Phaser.Scene;
    const home = { scene: { key: 'Home' } } as unknown as Phaser.Scene;
    const game = {
      loop: { wake: vi.fn() },
      scene: {
        getScenes: vi.fn(() => [metaBg, home]),
        getScene: vi.fn(() => home),
      },
      events: { emit: vi.fn() },
    } as unknown as Phaser.Game;

    const port = createPhaserPort(game);
    port.startScene('Characters');
    expect(goTo).toHaveBeenCalledWith(home, 'Characters', undefined, 'forward');
  });
});
