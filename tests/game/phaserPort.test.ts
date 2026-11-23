import { afterEach, describe, expect, it, vi } from 'vitest';
import { setActiveSkin } from '../../src/game/art/skins';

const h = vi.hoisted(() => ({ goTo: vi.fn(), ensureCalls: [] as { skins: readonly string[]; done: () => void }[] }));
vi.mock('phaser', () => ({ default: { Scene: class {} } }));
vi.mock('../../src/game/motion', () => ({ goTo: h.goTo }));
vi.mock('../../src/game/art/capyTextures', () => ({
  ensureSkinTextures: (_sc: unknown, skins: readonly string[], done: () => void) => {
    h.ensureCalls.push({ skins, done });
  },
}));

import { createPhaserPort } from '../../src/game/scenes/phaserPort';
import { beginRun } from '../../src/game/scenes/ui';

describe('D4-P3-R3 PhaserPort and beginRun skin texture preload', () => {
  afterEach(() => {
    h.goTo.mockReset();
    h.ensureCalls.length = 0;
    setActiveSkin('snake');
  });

  it('D4-P3-R3 ensureSkins waits for loader completion before firing done', () => {
    const fakeScene = { textures: { exists: () => false }, load: {} };
    const game = { scene: { getScenes: () => [fakeScene], getScene: () => fakeScene } };
    const port = createPhaserPort(game as never);
    const done = vi.fn();
    port.ensureSkins(['capy'], done);
    expect(done).not.toHaveBeenCalled();
    expect(h.ensureCalls[0]?.skins).toEqual(['capy']);
    h.ensureCalls[0]!.done();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('D4-P3-R3 beginRun preloads the active skin before starting Game', () => {
    setActiveSkin('ginger');
    const startRun = vi.fn();
    const sc = {
      textures: {},
      load: {},
      registry: { get: () => ({ startRun }) },
      scene: { launch: vi.fn() },
    };
    beginRun(sc as never, 4, 'results', false);
    expect(startRun).not.toHaveBeenCalled();
    expect(h.ensureCalls[0]?.skins).toEqual(['ginger']);
    h.ensureCalls[0]!.done();
    expect(startRun).toHaveBeenCalledWith(4, 'results', false);
    expect(h.goTo).toHaveBeenCalledTimes(1);
  });
});
