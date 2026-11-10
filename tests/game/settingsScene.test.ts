import { expect, it, vi } from 'vitest';
import { SettingsScene, slideFrom } from '../../src/game/scenes/SettingsScene';
import { SETTINGS_CLOSED } from '../../src/game/flow/settingsView';
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));

it('P3b3-R7 a double Back tap on the overlay emits settings-closed and stops the scene once', () => {
  const emit = vi.fn(), stop = vi.fn(), play = vi.fn();
  const scene = new SettingsScene();
  Object.assign(scene, { entry: { overlay: true }, synth: { play }, game: { events: { emit } }, scene: { stop, start: vi.fn() } });
  const back = (scene as unknown as { back(): void }).back.bind(scene);
  back(); back();
  expect(emit.mock.calls.filter(c => c[0] === SETTINGS_CLOSED)).toHaveLength(1);
  expect(stop).toHaveBeenCalledTimes(1);
});

it('MOT-1-R8 slideFrom animates only switches whose value differs from the previous build', () => {
  const prev = new Map<string, boolean>([['sound', true], ['haptics', false]]);
  expect(slideFrom(prev, 'sound', true)).toBe(true);    // unchanged -> same start state (no slide)
  expect(slideFrom(prev, 'haptics', true)).toBe(false); // changed -> starts from previous value
  expect(slideFrom(prev, 'dpad', true)).toBe(true);     // first build -> no slide
});
