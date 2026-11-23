// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { createUiBridge } from '../../../src/game/dom/bridge';
import type { LoopHooks, PhaserPort } from '../../../src/game/dom/uiBridge';
import { createUiHost } from '../../../src/game/dom/uiHost';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';

function makeHooks(): LoopHooks {
  return { sleep: vi.fn(), wake: vi.fn(), inputEnabled: vi.fn(), keyboardCapture: vi.fn(), canvasVisible: vi.fn() };
}

function makeDeps() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const hooks = makeHooks();
  const host = createUiHost(root, hooks);
  const session = createSession({ balance: loadBalance(), store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  let deferredDone: (() => void) | null = null;
  const calls: string[] = [];
  const port: PhaserPort = {
    ensureSkins: vi.fn((skins, done) => { calls.push(`ensure:${skins.join(',')}`); deferredDone = done; }),
    startScene: vi.fn((key, data) => { calls.push(`start:${key}:${JSON.stringify(data ?? {})}`); }),
  };
  const bridge = createUiBridge({
    host,
    session,
    synth,
    t,
    port,
    screens: {
      home: el => { el.innerHTML = '<p data-qa="s-home">home</p>'; },
      characters: el => { el.innerHTML = '<p data-qa="s-characters">chars</p>'; },
    },
    activeSkin: () => 'capy',
    debug: false,
  });
  return { root, host, hooks, synth, port, bridge, calls, fireDone: () => deferredDone?.() };
}

describe('D4-P3-R3 ui bridge', () => {
  it('D4-P3-R3 open returns a token and stale close after next open never wipes the new screen', () => {
    const { root, host, bridge } = makeDeps();
    const a = bridge.open('home');
    expect(root.querySelector('[data-qa="s-home"]')).not.toBeNull();
    const b = bridge.open('characters');
    expect(bridge.close(a)).toBe(false);
    expect(host.activeId()).toBe('characters');
    expect(root.querySelector('[data-qa="s-characters"]')).not.toBeNull();
    expect(bridge.close(b)).toBe(true);
    expect(host.activeId()).toBeNull();
    host.dispose();
    root.remove();
  });

  it('D4-P3-R3 startRun ensures active skin textures before Game and ignores double taps', () => {
    const { root, host, synth, bridge, calls, fireDone } = makeDeps();
    bridge.startRun(5, false);
    bridge.startRun(5, false);
    expect(synth.unlock).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['ensure:capy']);
    fireDone();
    expect(calls).toEqual(['ensure:capy', 'start:Game:{"level":5,"source":"home","debug":false}']);
    host.dispose();
    root.remove();
  });

  it('D4-P3-R3 Escape on characters navigates home, Escape on home does nothing, unknown screen throws', () => {
    const { root, host, port, bridge } = makeDeps();
    bridge.open('home');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(port.startScene).not.toHaveBeenCalled();

    bridge.open('characters');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(port.startScene).toHaveBeenCalledWith('Home');

    expect(() => bridge.open('results')).toThrow('no screen: results');
    host.dispose();
    root.remove();
  });
});
