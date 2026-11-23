import { expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

import { CharactersScene } from '../../src/game/scenes/CharactersScene';

it('D4-P3-R3 CharactersScene thin shim opens characters on create and closes its token on shutdown', () => {
  const token = Symbol('chars');
  const open = vi.fn(() => token);
  const close = vi.fn(() => true);
  let onShutdown: (() => void) | undefined;
  const sc = Object.assign(new CharactersScene(), {
    registry: { get: (k: string) => (k === 'uiBridge' ? { open, close } : undefined) },
    events: { once: (_ev: string, fn: () => void) => { onShutdown = fn; } },
  });
  sc.init({ debug: true });
  sc.create();
  expect(open).toHaveBeenCalledWith('characters');
  onShutdown?.();
  expect(close).toHaveBeenCalledWith(token);
});
