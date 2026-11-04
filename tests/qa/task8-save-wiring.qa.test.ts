// tests/qa/task8-save-wiring.qa.test.ts — black-box QA tests for save wiring and best score logic
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSim } from '../../src/core';
import { defaultSave, load, memoryStore } from '../../src/meta';
import { GameScene } from '../../src/game/scenes/GameScene';
import { HudScene } from '../../src/game/scenes/HudScene';
import { bindKeyboard } from '../../src/game/input/keyboard';
import { loadBalance } from '../support/balance';
import { sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({
  default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } },
}));

const mockSound = vi.hoisted(() => ({
  unlock: vi.fn(),
  setOn: vi.fn(),
  play: vi.fn(),
  buzz: vi.fn(),
}));

vi.mock('../../src/game/audio/synth', () => ({
  createSynth: () => mockSound,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function createTestHud(initialBest = 10, soundEnabled = true) {
  const browser = new Signals();
  const doc = new Signals();
  const media = new Signals();
  const document = {
    hidden: false,
    addEventListener: doc.on.bind(doc),
    removeEventListener: doc.off.bind(doc),
  };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', {
    addEventListener: browser.on.bind(browser),
    removeEventListener: browser.off.bind(browser),
    matchMedia: (q: string) => ({
      matches: false,
      addEventListener: media.on.bind(media),
      removeEventListener: media.off.bind(media),
    }),
  });

  const h = sceneHarness();
  const g = sceneHarness();
  const game = new GameScene();
  const hud = new HudScene();

  Object.assign(game, g.scene);
  game.balance = loadBalance();
  const sim = createSim(game.balance, 42);
  vi.spyOn(game, 'snapshot').mockImplementation(() => sim.snapshot());
  vi.spyOn(game, 'startRun').mockImplementation(() => {});

  const store = memoryStore();
  const data = defaultSave();
  data.bestScore = initialBest;
  data.settings.sound = soundEnabled;

  h.registry.set('store', store);
  h.registry.set('save', data);

  Object.assign(hud, h.scene, { scene: { get: () => game } });
  hud.create();

  return {
    ...h,
    hud,
    game,
    store,
    data,
    sim,
    click: (name: string) => {
      const target = h.find(name);
      target.emit('pointerdown');
      target.emit('pointerup');
    },
    triggerGameOver: (score: number, level = 0, cause: any = 'wall') => {
      game.flow.status = 'over';
      game.events.emit('run-over', {
        ...sim.snapshot(),
        score,
        level,
        outcome: { won: false, cause },
      });
    },
  };
}

describe('QA Task 8: Save Wiring & Best Score (Black-Box)', () => {
  it('QA-T6-18 GDD-8.4 best score only updated when higher (lower or equal score does not overwrite best)', () => {
    const env = createTestHud(50);
    expect(env.find('best').text).toBe('50');

    // Case 1: Run ends with lower score (30 < 50) -> best score remains 50
    env.triggerGameOver(30);
    expect(load(env.store).bestScore).toBe(0); // store not written when lower
    expect(env.data.bestScore).toBe(50);
    expect(env.find('best').text).toBe('50');
    env.flush();
    expect(env.find('overlay-best').text).toBe('Best score 50');

    // Case 2: Run ends with equal score (50 == 50) -> best score remains 50, not marked as new best
    env.triggerGameOver(50);
    expect(load(env.store).bestScore).toBe(0); // store not written when equal
    expect(env.data.bestScore).toBe(50);
    expect(env.find('best').text).toBe('50');
    env.flush();
    expect(env.find('overlay-best').text).toBe('Best score 50');

    // Case 3: Run ends with higher score (75 > 50) -> best score updated to 75 and persisted
    env.triggerGameOver(75);
    expect(load(env.store).bestScore).toBe(75);
    expect(env.data.bestScore).toBe(75);
    expect(env.find('best').text).toBe('75');
    env.flush();
    expect(env.find('overlay-best').text).toBe('New best score!');
  });

  it('QA-T8-31 P0-Design §7.1, §8 start card shows best score only when best > 0', () => {
    const zeroEnv = createTestHud(0);
    expect(zeroEnv.find('overlay-best').text).toBe('');

    const hasBestEnv = createTestHud(42);
    expect(hasBestEnv.find('overlay-best').text).toBe('Best score 42');
  });

  it('QA-T8-32 P0-Design §7.1, §8 death card with score 0 and best 0 shows empty best line', () => {
    const env = createTestHud(0);
    env.triggerGameOver(0);
    env.flush();
    expect(env.find('overlay-best').text).toBe('');
    expect(load(env.store).bestScore).toBe(0);
  });

  it('QA-T8-33 P0-Design §7.1, §8 sound button persists toggle state to store', () => {
    const env = createTestHud(10, true);
    expect(env.data.settings.sound).toBe(true);

    env.click('sound-button');
    expect(env.data.settings.sound).toBe(false);
    expect(load(env.store).settings.sound).toBe(false);

    env.click('sound-button');
    expect(env.data.settings.sound).toBe(true);
    expect(load(env.store).settings.sound).toBe(true);
    expect(mockSound.play).toHaveBeenCalledWith('eat');
  });

  it('QA-T8-34 P0-Design §7.1, §8 KeyM shortcut toggles and persists sound setting', () => {
    const env = createTestHud(10, true);
    bindKeyboard(env.game);

    env.game.input.keyboard!.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(env.data.settings.sound).toBe(false);
    expect(load(env.store).settings.sound).toBe(false);

    env.game.input.keyboard!.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(env.data.settings.sound).toBe(true);
    expect(load(env.store).settings.sound).toBe(true);
  });
});
