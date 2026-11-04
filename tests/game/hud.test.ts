import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSim } from '../../src/core';
import { defaultSave, load, memoryStore } from '../../src/meta';
import { flowPause, flowStart, flowTick } from '../../src/game/flow/runFlow';
import { GameScene } from '../../src/game/scenes/GameScene';
import { HudScene } from '../../src/game/scenes/HudScene';
import { bindKeyboard } from '../../src/game/input/keyboard';
import { loadBalance } from '../support/balance';
import { sceneHarness, Signals } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } } } }));
const sound = vi.hoisted(() => ({ unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() }));
vi.mock('../../src/game/audio/synth', () => ({ createSynth: () => sound }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function setup(reduced = false) {
  const browser = new Signals(), doc = new Signals(), media = new Signals();
  const document = { hidden: false, addEventListener: doc.on.bind(doc), removeEventListener: doc.off.bind(doc) };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', { addEventListener: browser.on.bind(browser), removeEventListener: browser.off.bind(browser),
    matchMedia: (q: string) => ({ matches: q.includes('reduced-motion') && reduced,
      addEventListener: media.on.bind(media), removeEventListener: media.off.bind(media) }) });
  const h = sceneHarness(), g = sceneHarness(), game = new GameScene(), hud = new HudScene();
  Object.assign(game, g.scene); game.balance = loadBalance();
  let sim = createSim(game.balance, 7);
  vi.spyOn(game, 'snapshot').mockImplementation(() => sim.snapshot());
  vi.spyOn(game, 'startRun').mockImplementation(() => { sim = createSim(game.balance, 8); });
  const store = memoryStore(), data = defaultSave(); data.bestScore = 5;
  h.registry.set('store', store); h.registry.set('save', data);
  Object.assign(hud, h.scene, { scene: { get: () => game } });
  hud.create();
  return { ...h, hud, game, store, browser, doc, document, sim,
    click: (name: string) => { h.find(name).emit('pointerdown'); h.find(name).emit('pointerup'); } };
}

describe('GDD-13 HUD flow, audio and save wiring', () => {
  it('GDD-13 ready → countdown → play ⇄ pause uses one shared flow and always shows the legend', () => {
    const h = setup();
    expect(h.find('overlay-title').text).toBe('Mango Snake: Hard');
    expect(h.find('overlay-best').text).toBe('Best score 5');
    expect(h.find('pause-button').input?.enabled).toBe(false);
    h.click('overlay-action');
    expect(h.game.startRun).toHaveBeenCalledOnce(); expect(sound.unlock).toHaveBeenCalledOnce();
    expect(h.game.flow.status).toBe('countdown'); expect(h.find('overlay').visible).toBe(false);
    h.game.apply(flowTick(h.game.flow, h.game.balance, 16));
    expect(h.find('countdown').text).toBe('3'); expect(sound.play).toHaveBeenCalledWith('tick');
    h.game.apply(flowTick(h.game.flow, h.game.balance, 1484));
    expect(h.find('countdown').visible).toBe(false); expect(sound.play).toHaveBeenCalledWith('go');
    h.click('pause-button'); expect(h.game.flow.status).toBe('paused');
    expect(h.find('overlay-title').text).toBe('Paused');
    expect(h.find('legend').visible).toBe(true);
    h.click('overlay-action'); expect(h.game.flow.status).toBe('countdown');
    expect(h.game.startRun).toHaveBeenCalledOnce();
  });
  it('GDD-13 M and sound button persist settings and enabling sound chirps', () => {
    const h = setup(); bindKeyboard(h.game);
    h.game.input.keyboard!.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(load(h.store)).toEqual({ ...defaultSave(), bestScore: 5, settings: { sound: false } });
    expect(sound.setOn).toHaveBeenLastCalledWith(false);
    h.click('sound-button');
    expect(load(h.store).settings.sound).toBe(true); expect(sound.play).toHaveBeenCalledWith('eat');
    h.game.events.emit('shutdown'); sound.setOn.mockClear();
    h.game.input.keyboard!.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(sound.setOn).not.toHaveBeenCalled();
  });
  it('GDD-13 sim events drive score, replace banners and play the specified feedback', () => {
    const h = setup(); h.click('overlay-action');
    h.game.events.emit('sim-events', [{ type: 'ate', x: 1, y: 1, points: 2, golden: true },
      { type: 'levelUp', level: 2, unlocked: 'fence' }, { type: 'landed', hazardType: 'rock' }, { type: 'rotted', x: 1, y: 1, leftRock: true }]);
    expect(sound.play.mock.calls.map(c => c[0])).toEqual(['golden', 'level', 'land', 'rot']);
    expect(sound.buzz.mock.calls.map(c => c[0])).toEqual([12, [15, 40, 15]]);
    expect(h.find('banner').text).toBe('Level 2: fences unlocked');
    h.game.events.emit('sim-events', [{ type: 'hazardIncoming', family: 'terrain' }]);
    expect(h.find('banner').text).toBe('The ground is shaking');
    expect(h.delayed.filter(t => !t.removed).map(t => t.delay)).toEqual([1800]);
    h.flush(); expect(h.find('banner').visible).toBe(false);
  });
  it('GDD-13 death saves a new best immediately and shows the card after 550ms', () => {
    const h = setup(); h.click('overlay-action');
    h.game.flow.status = 'over';
    h.game.events.emit('run-over', { ...h.sim.snapshot(), score: 12, level: 3, outcome: { won: false, cause: 'fence' } });
    expect(load(h.store).bestScore).toBe(12); expect(h.find('best').text).toBe('12');
    expect(h.find('pause-button').input?.enabled).toBe(false);
    expect(h.find('overlay').visible).toBe(false); expect(h.delayed.at(-1)?.delay).toBe(550);
    expect(sound.play).toHaveBeenCalledWith('die'); expect(sound.buzz).toHaveBeenCalledWith(90);
    h.flush(); expect(h.find('overlay-title').text).toBe('Game over');
    expect(h.find('overlay-text').text).toBe('You ran into a fence. Score 12, level 3.');
    expect(h.find('overlay-best').text).toBe('New best score!');
  });
  it('GDD-13 reduced-motion wins use zero delay and no death feedback; restarting cancels stale cards', () => {
    const h = setup(true); h.click('overlay-action'); h.game.flow.status = 'over';
    h.game.events.emit('run-over', { ...h.sim.snapshot(), outcome: { won: true } });
    expect(h.delayed.at(-1)?.delay).toBe(0); expect(sound.play).not.toHaveBeenCalledWith('die');
    h.flush(); expect(h.find('overlay-title').text).toBe('You filled the board!');
    h.game.events.emit('run-over', { ...h.sim.snapshot(), outcome: { won: false, cause: 'wall' } });
    h.game.apply(flowStart(h.game.flow, h.game.balance)); h.game.flow.status = 'over'; h.flush();
    expect(h.find('overlay').visible).toBe(false);
  });
  it('GDD-13 hidden and blur pause; shutdown removes browser and game listeners', () => {
    const h = setup(); h.click('overlay-action');
    h.document.hidden = true; h.doc.emit('visibilitychange'); expect(h.game.flow.status).toBe('paused');
    h.click('overlay-action'); h.browser.emit('blur'); expect(h.game.flow.status).toBe('paused');
    h.hud.events.emit('shutdown'); h.game.apply(flowStart(h.game.flow, h.game.balance));
    h.browser.emit('blur'); expect(h.game.flow.status).toBe('countdown');
    sound.play.mockClear(); h.game.events.emit('sim-events', [{ type: 'landed', hazardType: 'rock' }]);
    expect(sound.play).not.toHaveBeenCalled();
  });
  it('GDD-13 pausing hides countdown digits', () => {
    const h = setup(); h.click('overlay-action');
    h.game.apply(flowTick(h.game.flow, h.game.balance, 16)); h.game.apply(flowPause(h.game.flow));
    expect(h.find('countdown').visible).toBe(false);
  });
});
