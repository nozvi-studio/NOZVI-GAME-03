import { afterEach, describe, expect, it, vi } from 'vitest';
import { load, memoryStore, SAVE_KEY } from '../../src/meta';
import { createSession } from '../../src/session';
import { createFlow, flowPause, flowStart, flowTick } from '../../src/game/flow/runFlow';
import { GameScene } from '../../src/game/scenes/GameScene';
import { HudScene } from '../../src/game/scenes/HudScene';
import { bindKeyboard } from '../../src/game/input/keyboard';
import { loadBalance } from '../support/balance';
import { sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));
const sound = vi.hoisted(() => ({ unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() }));
vi.mock('../../src/game/audio/synth', () => ({ createSynth: () => sound }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

const b = loadBalance();
const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };
const base = { bestScore: 5, settings: { sound: true }, bestLevel: 0, fullClear: false,
  unlockedCheckpoints: [] as number[], carriedEnergy: 0, lastLoadout: [null, null] };

function setup(saveData: object = {}) {
  const browser = new Signals(), doc = new Signals(), media = new Signals();
  const document = { hidden: false, addEventListener: doc.on.bind(doc), removeEventListener: doc.off.bind(doc) };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', { addEventListener: browser.on.bind(browser), removeEventListener: browser.off.bind(browser),
    matchMedia: () => ({ matches: false, addEventListener: media.on.bind(media), removeEventListener: media.off.bind(media) }) });
  const store = memoryStore();
  store.set(SAVE_KEY, JSON.stringify({ version: 2, data: { ...base, ...saveData } }));
  const session = createSession({ balance: b, store, newSeed: () => 7, now: () => 0 });
  session.startRun(1);
  const h = sceneHarness(), g = sceneHarness(), game = new GameScene(), hud = new HudScene();
  Object.assign(game, g.scene); game.balance = b; game.session = session; game.flow = createFlow();
  vi.spyOn(game, 'startRun').mockImplementation(() => {});
  const started: string[] = [], stopped: string[] = [];
  h.registry.set('session', session); h.registry.set('balance', b);
  Object.assign(hud, h.scene, { scene: { get: () => game, start: (k: string) => started.push(k), stop: (k: string) => stopped.push(k) } });
  hud.create();
  game.apply(flowStart(game.flow, b));
  return { ...h, hud, game, store, session, browser, doc, document, started, stopped,
    click: (name: string) => { h.find(name).emit('pointerdown'); h.find(name).emit('pointerup'); },
    play: () => { game.apply(flowTick(game.flow, b, b.flow.countdownMs)); } };
}

describe('P1 HUD flow, audio and session wiring', () => {
  it('P1 HUD has no Play card: Game opens on the countdown; pause shows Resume and Quit', () => {
    const h = setup();
    expect(h.find('overlay').visible).toBe(false);
    expect(h.game.flow.status).toBe('countdown');
    h.game.apply(flowTick(h.game.flow, b, 16));
    expect(h.find('countdown').text).toBe('3'); expect(sound.play).toHaveBeenCalledWith('tick');
    h.game.apply(flowTick(h.game.flow, b, 1484));
    expect(h.find('countdown').visible).toBe(false); expect(sound.play).toHaveBeenCalledWith('go');
    h.click('pause-button'); expect(h.game.flow.status).toBe('paused');
    expect(h.find('overlay').visible).toBe(true); expect(h.find('overlay-title').text).toBe('Paused');
    h.click('overlay-action'); expect(h.game.flow.status).toBe('countdown');
  });
  it('MEC-003-R20 pause Quit ends the run with cause quit and opens Results', () => {
    const h = setup(); h.play(); h.click('pause-button'); h.click('overlay-quit');
    expect(h.session.summary()).toMatchObject({ cause: 'quit' });
    h.flush(); expect(h.stopped).toEqual(['Game']); expect(h.started).toEqual(['Results']);
  });
  it('GDD-13 M and sound button persist settings through the session', () => {
    const h = setup(); bindKeyboard(h.game);
    h.browser.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(load(h.store, rules).settings.sound).toBe(false);
    expect(sound.setOn).toHaveBeenLastCalledWith(false);
    h.click('sound-button');
    expect(load(h.store, rules).settings.sound).toBe(true); expect(sound.play).toHaveBeenCalledWith('eat');
  });
  it('MEC-003 §8 level up banner: level, fresh start, biome, new family; challenge ignored', () => {
    const h = setup();
    h.game.events.emit('sim-events', [{ type: 'ate', x: 1, y: 1, points: 2, golden: true },
      { type: 'levelUp', level: 6, biome: 2, challenge: true, biomeChanged: true, unlocked: 'fence', clearedLevelTimeMs: 1 }]);
    expect(sound.play.mock.calls.map(c => c[0])).toEqual(['golden', 'level']);
    expect(h.find('banner').text).toBe('Level 6 · Fresh start!\nRice Paddy\nFences unlocked');
  });
  it('MEC-008 §8 checkpoint banner and first-unlock tip when the save gains a checkpoint', () => {
    const h = setup();
    (h.session.save().unlockedCheckpoints as number[]).push(4); // as if the session saved L4 on this levelUp
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 4, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(h.find('banner').text).toContain('Next run starts at L4!');
    expect(h.find('tip').text).toBe('Checkpoints are permanent. Your saved energy comes with you.');
  });
  it('MEC-006 §8 skill feedback: cast, reject (not empty), orb tip once, unlock tips', () => {
    const h = setup();
    h.game.events.emit('sim-events', [{ type: 'orbSpawned', x: 1, y: 1 }, { type: 'orbEaten', x: 1, y: 1, gained: 15 }]);
    expect(h.find('tip').text).toBe('Energy orb! Fuel for skills');
    h.game.events.emit('sim-events', [{ type: 'skillUsed', slot: 0, skill: 'slowmo', level: 1, energyBefore: 50, energyAfter: 10 },
      { type: 'skillRejected', slot: 0, skill: null, reason: 'empty' }]);
    expect(sound.play.mock.calls.map(c => c[0])).toEqual(['orb', 'skillSlowmo']);
    expect(sound.buzz.mock.calls.map(c => c[0])).toEqual([8, 20]);
    h.game.events.emit('sim-events', [{ type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' }]);
    expect(sound.play).toHaveBeenLastCalledWith('nope'); expect(h.find('tip').text).toBe('Need 40 energy');
    h.game.events.emit('sim-events', [{ type: 'skillUnlocked', skill: 'slowmo', slot: 0 }]);
    expect(h.find('tip').text).toBe('Slow-mo unlocked! Tap left to use it'); expect(sound.play).toHaveBeenLastCalledWith('unlock');
    h.game.events.emit('sim-events', [{ type: 'skillUnlocked', skill: 'shield', slot: null }]);
    expect(h.find('tip').text).toBe('Shield unlocked! Pick it before your next run');
  });
  it('MEC-007-R14/R15 skill keys cast only while playing; buttons hide for empty slots', () => {
    const h = setup({ bestLevel: 3, carriedEnergy: 50 });
    const spy = vi.spyOn(h.session, 'useSkill');
    h.scene.input.keyboard.emit('keydown', { code: 'KeyJ', repeat: false, preventDefault() {} });
    expect(spy).not.toHaveBeenCalled();
    h.play();
    h.scene.input.keyboard.emit('keydown', { code: 'KeyJ', repeat: true, preventDefault() {} });
    h.scene.input.keyboard.emit('keydown', { code: 'KeyE', repeat: false, preventDefault() {} });
    h.find('skill-0').emit('pointerdown');
    expect(spy.mock.calls).toEqual([[1], [0]]);
    h.hud.update();
    expect(h.find('skill-0').visible).toBe(true); expect(h.find('skill-1').visible).toBe(false);
    expect(h.find('level').text).toBe('L1 · Biome 1');
    h.session.frame(1); h.hud.update(); expect(h.find('energy').text).toBe('Energy 10/100'); // slow-mo cast spent 40
  });
  it('P1 death opens Results after the death delay; hidden pauses; shutdown removes listeners', () => {
    const h = setup(); h.play();
    h.document.hidden = true; h.doc.emit('visibilitychange'); expect(h.game.flow.status).toBe('paused');
    h.game.events.emit('run-over', h.session.snapshot());
    expect(h.delayed.at(-1)?.delay).toBe(b.flow.deathCardDelayMs);
    h.flush(); expect(h.started).toEqual(['Results']);
    h.hud.events.emit('shutdown'); h.game.apply(flowStart(h.game.flow, b));
    h.browser.emit('blur'); expect(h.game.flow.status).toBe('countdown');
    sound.play.mockClear(); h.game.events.emit('sim-events', [{ type: 'landed', hazardType: 'rock' }]);
    expect(sound.play).not.toHaveBeenCalled();
  });
  it('GDD-13 pausing hides countdown digits', () => {
    const h = setup();
    h.game.apply(flowTick(h.game.flow, b, 16)); h.game.apply(flowPause(h.game.flow));
    expect(h.find('countdown').visible).toBe(false);
  });
});
