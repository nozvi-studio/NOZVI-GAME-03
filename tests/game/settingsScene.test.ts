// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { memoryStore } from '../../src/meta';
import { createSession } from '../../src/session';
import { createUiBridge } from '../../src/game/dom/bridge';
import { settingsScreen } from '../../src/game/dom/screens/settingsScreen';
import type { LoopHooks } from '../../src/game/dom/uiBridge';
import { createUiHost } from '../../src/game/dom/uiHost';
import { SETTINGS_CLOSED } from '../../src/game/flow/settingsView';
import { SettingsScene, slideFrom } from '../../src/game/scenes/SettingsScene';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

it('P3b3-R7 / D4-P4-R2 a double Back tap on the overlay emits settings-closed and stops the scene once', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const hooks: LoopHooks = {
    sleep: vi.fn(), wake: vi.fn(), inputEnabled: vi.fn(), keyboardCapture: vi.fn(), canvasVisible: vi.fn(),
  };
  const host = createUiHost(root, hooks);
  const session = createSession({ balance: loadBalance(), store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const emit = vi.fn(), stop = vi.fn();
  const bridge = createUiBridge({
    host, root, session,
    synth: { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() },
    t,
    port: { ensureSkins: (_s, d) => d(), startScene: vi.fn(), emit },
    screens: { settings: settingsScreen },
    activeSkin: () => 'snake', debug: false,
  });

  const scene = new SettingsScene();
  Object.assign(scene, {
    registry: { get: (k: string) => (k === 'uiBridge' ? bridge : undefined) },
    scene: { stop },
    events: { once: vi.fn() },
  });
  scene.init({ overlay: true });
  scene.create();

  const backBtn = root.querySelector<HTMLButtonElement>('[data-qa="settings-back"]')!;
  backBtn.click();
  backBtn.click();
  expect(emit.mock.calls.filter(c => c[0] === SETTINGS_CLOSED)).toHaveLength(1);
  expect(stop).toHaveBeenCalledTimes(1);

  host.dispose();
  root.remove();
});

it('MOT-1-R8 slideFrom animates only switches whose value differs from the previous build', () => {
  const prev = new Map<string, boolean>([['sound', true], ['haptics', false]]);
  expect(slideFrom(prev, 'sound', true)).toBe(true);    // unchanged -> same start state (no slide)
  expect(slideFrom(prev, 'haptics', true)).toBe(false); // changed -> starts from previous value
  expect(slideFrom(prev, 'dpad', true)).toBe(true);     // first build -> no slide
});
