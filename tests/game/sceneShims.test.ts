// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../src/meta';
import { createSession } from '../../src/session';
import { createUiBridge } from '../../src/game/dom/bridge';
import type { LoopHooks } from '../../src/game/dom/uiBridge';
import { createUiHost } from '../../src/game/dom/uiHost';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

import { CharactersScene } from '../../src/game/scenes/CharactersScene';
import { HomeScene } from '../../src/game/scenes/HomeScene';
import { LoadoutScene } from '../../src/game/scenes/LoadoutScene';
import { ResultsScene } from '../../src/game/scenes/ResultsScene';
import { SettingsScene } from '../../src/game/scenes/SettingsScene';

function fakeScene(bridge: unknown) {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    registry: { get: (k: string) => (k === 'uiBridge' ? bridge : undefined) },
    events: {
      once: (ev: string, fn: () => void) => { (listeners[ev] ??= []).push(fn); },
      emit: (ev: string) => { for (const fn of listeners[ev] ?? []) fn(); listeners[ev] = []; },
    },
  };
}

describe('D4-P3-R3 HomeScene & CharactersScene thin shims', () => {
  it('D4-P3-R3 stale SHUTDOWN after next create never wipes the new screen (both directions) and restores canvas for Game', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const hooks: LoopHooks = {
      sleep: vi.fn(), wake: vi.fn(), inputEnabled: vi.fn(), keyboardCapture: vi.fn(), canvasVisible: vi.fn(),
    };
    const host = createUiHost(root, hooks);
    const session = createSession({ balance: loadBalance(), store: memoryStore(), newSeed: () => 1, now: () => 0 });
    const bridge = createUiBridge({
      host, session, synth: { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() }, t,
      port: { ensureSkins: (_s, d) => d(), startScene: vi.fn() },
      screens: { home: el => { el.textContent = 'HOME'; }, characters: el => { el.textContent = 'CHARS'; } },
      activeSkin: () => 'snake', debug: false,
    });

    const home = Object.assign(new HomeScene(), fakeScene(bridge));
    const chars = Object.assign(new CharactersScene(), fakeScene(bridge));

    home.create();
    expect(host.activeId()).toBe('home');
    // Simulate scene.start('Characters'): Characters.create() runs BEFORE Home.SHUTDOWN
    chars.create();
    home.events.emit('shutdown');
    expect(host.activeId()).toBe('characters');

    // Reverse direction: Home.create() runs BEFORE Characters.SHUTDOWN
    home.create();
    chars.events.emit('shutdown');
    expect(host.activeId()).toBe('home');

    // Leaving Home for GameScene closes Home and restores canvas
    home.events.emit('shutdown');
    expect(host.activeId()).toBeNull();
    expect(hooks.canvasVisible).toHaveBeenLastCalledWith(true);
    expect(hooks.wake).toHaveBeenCalled();

    // Shim without bridge is a safe no-op
    const headless = Object.assign(new HomeScene(), fakeScene(undefined));
    expect(() => headless.create()).not.toThrow();

    host.dispose();
    root.remove();
  });

  it('D4-P4-R1/R2/R3 ResultsScene, SettingsScene and LoadoutScene shims open/close token-safely', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const hooks: LoopHooks = {
      sleep: vi.fn(), wake: vi.fn(), inputEnabled: vi.fn(), keyboardCapture: vi.fn(), canvasVisible: vi.fn(),
    };
    const host = createUiHost(root, hooks);
    const session = createSession({ balance: loadBalance(), store: memoryStore(), newSeed: () => 1, now: () => 0 });
    const bridge = createUiBridge({
      host, session, synth: { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() }, t,
      port: { ensureSkins: (_s, d) => d(), startScene: vi.fn(), emit: vi.fn() },
      screens: {
        results: el => { el.textContent = 'RESULTS'; },
        settings: el => { el.textContent = 'SETTINGS'; },
        loadout: el => { el.textContent = 'LOADOUT'; },
      },
      activeSkin: () => 'snake', debug: false,
    });

    const results = Object.assign(new ResultsScene(), fakeScene(bridge));
    const loadout = Object.assign(new LoadoutScene(), fakeScene(bridge));
    const settings = Object.assign(new SettingsScene(), fakeScene(bridge));

    results.create();
    expect(host.activeId()).toBe('results');
    loadout.init({ level: 5 });
    loadout.create();
    results.events.emit('shutdown');
    expect(host.activeId()).toBe('loadout');

    settings.init({ returnTo: 'Home' });
    settings.create();
    loadout.events.emit('shutdown');
    expect(host.activeId()).toBe('settings');

    settings.events.emit('shutdown');
    expect(host.activeId()).toBeNull();

    host.dispose();
    root.remove();
  });
});
