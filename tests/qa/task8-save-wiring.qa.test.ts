// tests/qa/task8-save-wiring.qa.test.ts — black-box QA tests for save wiring and best score logic
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadBalance } from '../support/balance';
import { defaultSave, load, memoryStore, SAVE_KEY } from '../../src/meta';
import { createSession } from '../../src/session';
import { createFlow } from '../../src/game/flow/runFlow';
import { GameScene } from '../../src/game/scenes/GameScene';
import { HudScene } from '../../src/game/scenes/HudScene';
import { bindKeyboard } from '../../src/game/input/keyboard';
import { sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({
  default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    Geom: { Rectangle: Object.assign(class { constructor(..._a: number[]) {} }, { Contains: () => false }) } },
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
    matchMedia: () => ({
      matches: false,
      addEventListener: media.on.bind(media),
      removeEventListener: media.off.bind(media),
    }),
  });

  const b = loadBalance();
  const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };
  const store = memoryStore();
  const data = defaultSave();
  data.bestScore = initialBest;
  data.settings.sound = soundEnabled;
  store.set(SAVE_KEY, JSON.stringify({ version: 2, data }));

  const session = createSession({ balance: b, store, newSeed: () => 7, now: () => 0 });
  session.startRun(1);

  const h = sceneHarness();
  const g = sceneHarness();
  const game = new GameScene();
  const hud = new HudScene();

  Object.assign(game, g.scene, { scene: { isActive: () => false } });
  game.balance = b;
  game.session = session;
  game.flow = createFlow();
  vi.spyOn(game, 'startRun').mockImplementation(() => {});

  const started: string[] = [];
  const stopped: string[] = [];
  h.registry.set('session', session);
  h.registry.set('balance', b);

  Object.assign(hud, h.scene, {
    scene: {
      get: () => game,
      start: (k: string) => started.push(k),
      stop: (k: string) => stopped.push(k),
    },
  });
  hud.create();

  return {
    ...h,
    hud,
    game,
    browser,
    store,
    rules,
    session,
    started,
    stopped,
    click: (name: string) => {
      const target = h.find(name);
      target.emit('pointerdown');
      target.emit('pointerup');
    },
  };
}

describe('QA Task 8: Save Wiring & Best Score (Black-Box)', () => {
  // updated for P1 DECISIONS P1-D1: session owns best score; HUD reads 'session' from the registry
  it.skip(
    'QA-T6-18 GDD-8.4 best score only updated when higher (superseded by P1 DECISIONS P1-D1: session owns best score; P0 HUD harness cannot express Results overlay-best; covered by QA-P1T8-21/22)',
    () => {},
  );

  // updated for P1: P0 Play card replaced by Results scene
  it.skip(
    'QA-T8-31 P0-Design §7.1, §8 start card shows best score only when best > 0 (superseded by P1: P0 Play card replaced by Results scene; see MEC-007-R2 / DECISIONS P1 Task 9)',
    () => {},
  );

  // updated for P1: P0 death card replaced by Results scene
  it.skip(
    'QA-T8-32 P0-Design §7.1, §8 death card with score 0 and best 0 shows empty best line (superseded by P1: P0 death card replaced by Results scene; see MEC-007-R2 / DECISIONS P1 Task 9)',
    () => {},
  );

  it.skip(
    'QA-T8-33 P0-Design §7.1, §8 sound button persists toggle state to store (superseded by P3b-2: the HUD sound button moved to Settings, P3b-3; M key covered by QA-T8-34)',
    () => {},
  );

  // updated for P1 DECISIONS P1-D1: session owns sound saves; HUD reads 'session' from the registry
  it('QA-T8-34 P0-Design §7.1, §8 KeyM shortcut toggles and persists sound setting', () => {
    const env = createTestHud(10, true);
    bindKeyboard(env.game);

    env.browser.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(env.session.save().settings.sound).toBe(false);
    expect(load(env.store, env.rules).settings.sound).toBe(false);

    env.browser.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(env.session.save().settings.sound).toBe(true);
    expect(load(env.store, env.rules).settings.sound).toBe(true);
  });
});
