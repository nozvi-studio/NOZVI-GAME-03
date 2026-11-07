import { afterEach, describe, expect, it, vi } from 'vitest';
import { deathCauseReport, defaultSettings, load, loadLog, memoryStore, SAVE_KEY } from '../../src/meta';
import { createSession } from '../../src/session';
import { createFlow, flowPause, flowStart, flowTick } from '../../src/game/flow/runFlow';
import { GameScene } from '../../src/game/scenes/GameScene';
import { HudScene } from '../../src/game/scenes/HudScene';
import { bindKeyboard } from '../../src/game/input/keyboard';
import { loadBalance } from '../support/balance';
import { setDisplaySettings } from '../../src/game/render/palette';
import { ui } from '../../src/game/ui/layout';
import { sceneHarness, Signals, type DrawObject } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  Geom: { Rectangle: Object.assign(class { constructor(..._a: number[]) {} }, { Contains: () => false }) } } }));
const sound = vi.hoisted(() => ({ unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() }));
vi.mock('../../src/game/audio/synth', () => ({ createSynth: () => sound }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); setDisplaySettings(null); });

const b = loadBalance();
const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };
const base = { bestScore: 5, settings: { sound: true }, bestLevel: 0, fullClear: false,
  unlockedCheckpoints: [] as number[], carriedEnergy: 0, lastLoadout: [null, null] };

/** Text double that reports a Lilita-like measured height (taller than the CSS line box) and an optional fixed width. */
function measureText(h: ReturnType<typeof setup>, width?: number): void {
  const add = h.scene.add as { text: (x: number, y: number, t: string, st?: { fontFamily?: string; fontSize?: string }) => DrawObject };
  const orig = add.text;
  add.text = (x, y, text, st) => {
    const o = orig(x, y, text, st), px = parseFloat(st?.fontSize ?? '0');
    if (st?.fontFamily?.includes('Lilita')) { o.height = px * 1.4; if (width !== undefined) o.width = width; }
    return o;
  };
}

function setup(saveData: object = {}, opts: { settings?: boolean; settingsActive?: boolean; startLevel?: number } = {}) {
  const browser = new Signals(), doc = new Signals(), media = new Signals();
  const document = { hidden: false, addEventListener: doc.on.bind(doc), removeEventListener: doc.off.bind(doc) };
  vi.stubGlobal('document', document);
  vi.stubGlobal('window', { addEventListener: browser.on.bind(browser), removeEventListener: browser.off.bind(browser),
    matchMedia: () => ({ matches: false, addEventListener: media.on.bind(media), removeEventListener: media.off.bind(media) }) });
  const store = memoryStore();
  store.set(SAVE_KEY, JSON.stringify({ version: 2, data: { ...base, ...saveData } }));
  const session = createSession({ balance: b, store, newSeed: () => 7, now: () => 0 });
  session.startRun(opts.startLevel ?? 1);
  const h = sceneHarness(), g = sceneHarness(), game = new GameScene(), hud = new HudScene();
  Object.assign(game, g.scene, { scene: { isActive: () => false } }); game.balance = b; game.session = session; game.flow = createFlow();
  vi.spyOn(game, 'startRun').mockImplementation(() => {});
  vi.spyOn(game, 'playBoardFx').mockImplementation(() => {}); // the real GameScene is never create()d here (no effects)
  const started: string[] = [], stopped: string[] = [], launched: [string, unknown][] = [];
  const overlay = { active: opts.settingsActive ?? false };
  h.registry.set('session', session); h.registry.set('balance', b);
  Object.assign(hud, h.scene, { scene: { get: (k: string) => (k === 'Game' ? game : k === 'Settings' && opts.settings ? {} : null),
    start: (k: string) => started.push(k), stop: (k: string) => stopped.push(k), launch: (k: string, d?: unknown) => launched.push([k, d]),
    isActive: (k: string) => k === 'Settings' && overlay.active } });
  hud.create();
  game.apply(flowStart(game.flow, b));
  return { ...h, hud, game, store, session, browser, doc, document, started, stopped, launched, overlay,
    click: (name: string) => { h.find(name).emit('pointerdown'); h.find(name).emit('pointerup'); },
    play: () => { game.apply(flowTick(game.flow, b, b.flow.countdownMs)); game.turn(0, -1); } }; // MEC-001-R2 first input starts
}

describe('P1 HUD flow, audio and session wiring', () => {
  it('MEC-001-R2 HUD shows the wait hint after the countdown until the first non-reverse input', () => {
    const h = setup();
    h.game.apply(flowTick(h.game.flow, b, b.flow.countdownMs));
    expect(h.game.flow.status).toBe('waiting'); expect(h.find('wait-hint').visible).toBe(true);
    h.game.turn(-1, 0); expect(h.game.flow.status).toBe('waiting'); expect(h.find('wait-hint').visible).toBe(true);
    h.game.turn(0, -1); expect(h.game.flow.status).toBe('playing'); expect(h.find('wait-hint').visible).toBe(false);
  });
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
  it('P3b2-R1 pause Quit stores run_end quit, applies the R6 carry, is not a death, then opens Results', () => {
    const h = setup({ carriedEnergy: 40 }); h.play();
    const energy = h.session.snapshot().energy;
    h.click('pause-button'); h.click('overlay-quit');
    const log = loadLog(h.store);
    expect(log.entries.filter(e => e.type === 'run_end')).toHaveLength(1);
    expect(log.entries.at(-1)).toMatchObject({ type: 'run_end', cause: 'quit', won: false });
    expect(log.deathCounts).toEqual({});
    expect(deathCauseReport(log, 600000).deaths).toBe(0); // quit stays out of the 40% gate
    const carry = Math.min(b.checkpoints.carryMax, Math.floor(energy * b.checkpoints.carryRatio));
    expect(load(h.store, rules).carriedEnergy).toBe(carry);
    expect(h.session.summary()).toMatchObject({ cause: 'quit', carriedEnergy: carry });
    h.flush(); expect(h.stopped).toEqual(['Game']); expect(h.started).toEqual(['Results']);
  });
  it('P3b2-R1 pressing Quit twice logs a single run_end', () => {
    const h = setup(); h.play(); h.click('pause-button'); h.click('overlay-quit'); h.click('overlay-quit');
    expect(loadLog(h.store).entries.filter(e => e.type === 'run_end')).toHaveLength(1);
  });
  it('GDD-13 M persists the sound setting through the session (HUD sound button moved to Settings)', () => {
    const h = setup(); bindKeyboard(h.game);
    h.browser.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(load(h.store, rules).settings.sound).toBe(false); expect(sound.setOn).toHaveBeenLastCalledWith(false);
    h.browser.emit('keydown', { code: 'KeyM', preventDefault() {} });
    expect(load(h.store, rules).settings.sound).toBe(true); expect(sound.play).toHaveBeenCalledWith('eat');
    expect(h.objects.some(o => o.name === 'sound-button')).toBe(false);
  });
  it('MEC-003 §8 level up banner queue: level, biome, new family (P3b2-R10)', () => {
    const h = setup();
    h.game.events.emit('sim-events', [{ type: 'ate', x: 1, y: 1, points: 2, golden: true },
      { type: 'levelUp', level: 6, biome: 2, challenge: false, biomeChanged: true, unlocked: 'fence', clearedLevelTimeMs: 1 }]);
    expect(sound.play.mock.calls.map(c => c[0])).toEqual(['golden', 'biome']);
    expect(h.find('banner').visible).toBe(true);
    expect(h.last('banner-title').text).toBe('Level 6'); expect(h.last('banner-subtitle').text).toBe('Fresh start!');
    h.flush(); expect(h.last('banner-title').text).toBe('Rice Paddy');
    h.flush(); expect(h.last('banner-title').text).toBe('Fences unlocked');
    h.flush(); expect(h.find('banner').visible).toBe(false);
  });
  it('MEC-001-R4 the shrink chip shows only when the same batch shrank the snake', () => {
    const h = setup();
    h.game.events.emit('sim-events', [{ type: 'shrunk', from: 9, to: b.snake.start.length },
      { type: 'levelUp', level: 2, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(h.last('banner-chip').text).toBe(`Your snake shrinks to ${b.snake.start.length} segments`);
    const n = h.objects.filter(o => o.name === 'banner-chip').length;
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 3, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(h.objects.filter(o => o.name === 'banner-chip')).toHaveLength(n);
  });
  it('P3a-R8 banner enters with slide + scale normally and as a pure fade when reduced', () => {
    const lv = [{ type: 'levelUp', level: 3, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }];
    const normal = setup(); normal.game.events.emit('sim-events', lv);
    const n = normal.find('banner'); expect(n.scale).toBeCloseTo(b.juice.banner.scaleFrom, 2); expect(n.alpha).toBe(0);
    setDisplaySettings({ ...defaultSettings(), reducedMotion: true });
    const calm = setup(); calm.game.events.emit('sim-events', lv);
    const c = calm.find('banner'); expect(c.scale).toBe(1); expect(c.alpha).toBe(0); expect(c.y).toBe(0);
  });
  it('MEC-003 §8 challenge level up queues the challenge banner', () => {
    const h = setup();
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 5, biome: 1, challenge: true, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(h.last('banner-title').text).toBe('Level 5');
    h.flush(); expect(h.last('banner-title').text).toBe('Challenge: Rock rain!');
  });
  it('P3b2-R10 level-up card stacks the subtitle below the measured Lilita title (no overlap)', () => {
    const h = setup(); measureText(h);
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 6, biome: 2, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    const title = h.last('banner-title'), sub = h.last('banner-subtitle');
    expect(title.height).toBeGreaterThan(ui(47.5)); expect(sub.y).toBeGreaterThanOrEqual(title.y + title.height);
  });
  it('P3b2-R10 biome card stacks tagline below the measured name', () => {
    const h = setup(); measureText(h);
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 6, biome: 2, challenge: false, biomeChanged: true, clearedLevelTimeMs: 1 }]);
    h.flush();
    const name = h.last('banner-title'), tag = h.last('banner-tagline');
    expect(tag.y).toBeGreaterThanOrEqual(name.y + name.height);
  });
  it('P3b2-R10 a long challenge title scales down to fit inside the card', () => {
    const h = setup(); measureText(h, 700);
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 5, biome: 1, challenge: true, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    h.flush();
    const title = h.last('banner-title');
    expect(title.text).toBe('Challenge: Rock rain!');
    expect(title.width * title.scale).toBeLessThanOrEqual(ui(318 - 32) + 0.001); expect(title.scale).toBeLessThan(1);
  });
  it('MEC-003 §8 a run that starts on a challenge level shows the challenge banner when the countdown ends', () => {
    const h = setup({ bestLevel: 12, unlockedCheckpoints: [4, 5] }, { startLevel: 5 });
    expect(h.find('banner').visible).toBe(false);
    h.game.apply(flowTick(h.game.flow, b, b.flow.countdownMs));
    expect(h.find('banner').visible).toBe(true); expect(h.last('banner-title').text).toBe('Challenge: Rock rain!');
    h.flush(); h.game.turn(0, -1); h.click('pause-button'); h.click('overlay-action'); h.game.apply(flowTick(h.game.flow, b, b.flow.countdownMs));
    expect(h.find('banner').visible).toBe(false); // a resume countdown does not repeat it
    const l1 = setup(); l1.game.apply(flowTick(l1.game.flow, b, b.flow.countdownMs)); expect(l1.find('banner').visible).toBe(false);
  });
  it('MEC-008 §8 checkpoint banner and first-unlock tip when the save gains a checkpoint', () => {
    const h = setup();
    (h.session.save().unlockedCheckpoints as number[]).push(4); // as if the session saved L4 on this levelUp
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 4, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(h.find('tip').text).toBe('Checkpoints are permanent. Your saved energy comes with you.');
    h.flush(); expect(h.last('banner-title').text).toBe('Next run starts at L4!');
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
    expect(h.find('tip').text).toBe('New skill: Slow-mo'); // tail points at the slot (Findings 5)
    expect(sound.play).toHaveBeenLastCalledWith('unlock');
    h.game.events.emit('sim-events', [{ type: 'skillUnlocked', skill: 'shield', slot: null }]);
    expect(h.find('tip').text).toBe('Shield unlocked! Pick it before your next run');
  });
  it('MEC-008-R11 the checkpoint hint is computed on create and level-up, not every frame', () => {
    const h = setup(), spy = vi.spyOn(h.session, 'homeModel');
    for (let i = 0; i < 5; i++) h.hud.update();
    expect(spy).not.toHaveBeenCalled();
    h.game.events.emit('sim-events', [{ type: 'levelUp', level: 2, biome: 1, challenge: false, biomeChanged: false, clearedLevelTimeMs: 1 }]);
    expect(spy).toHaveBeenCalledTimes(1);
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
    expect(h.find('level').text).toBe('Level 1'); expect(h.find('biome').text).toBe('Mango Orchard');
    h.session.frame(1); h.hud.update(); expect(h.find('energy').text).toBe('10'); // slow-mo cast spent 40
  });
  it('P1 death opens Results after the death delay; hidden pauses; shutdown removes listeners', () => {
    const h = setup(); h.play();
    h.document.hidden = true; h.doc.emit('visibilitychange'); expect(h.game.flow.status).toBe('paused');
    h.game.events.emit('sim-events', [{ type: 'died', cause: 'wall', x: 1, y: 1 }]);
    h.game.events.emit('run-over', h.session.snapshot());
    expect(h.delayed.map(d => d.delay)).toEqual([b.juice.death.cardInMs, b.juice.death.totalMs]);
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
  it('P3b2-R17 pause overlay offers Settings only when the Settings scene exists and launches it as an overlay', () => {
    const a = setup(); a.click('pause-button'); expect(a.find('overlay-settings').visible).toBe(false);
    const h = setup({}, { settings: true }); h.click('pause-button'); expect(h.find('overlay-settings').visible).toBe(true);
    h.click('overlay-settings'); expect(h.launched).toEqual([['Settings', { overlay: true }]]);
    expect(h.game.flow.status).toBe('paused');
  });
  it('P3b2-R17 D-pad is hidden unless settings.dpad; Resume re-reads settings changed while paused', () => {
    const h = setup(); expect(h.find('dpad-up').visible).toBe(false);
    h.click('pause-button'); h.session.updateSettings({ dpad: true }); // what the Settings overlay does (P3b-3)
    h.click('overlay-action'); expect(h.find('dpad-up').visible).toBe(true);
    expect(setup({ settings: { ...defaultSettings(), dpad: true } }).find('dpad-up').visible).toBe(true);
  });
  it('P3b2-R17 handoff 3: settings-closed re-reads D-pad, sound and haptics while still paused', () => {
    const h = setup({}, { settings: true }); h.click('pause-button'); h.click('overlay-settings');
    h.session.updateSettings({ dpad: true, sound: false });
    h.scene.game.events.emit('settings-closed');
    expect(h.find('dpad-up').visible).toBe(true); expect(sound.setOn).toHaveBeenLastCalledWith(false);
    expect(h.find('overlay-action').input?.enabled).toBe(true); expect(h.game.flow.status).toBe('paused');
    h.hud.events.emit('shutdown'); h.session.updateSettings({ dpad: false }); h.scene.game.events.emit('settings-closed');
    expect(h.find('dpad-up').visible).toBe(true); // listener removed on shutdown
  });
  it('P3b2-R17 handoff 2: haptics follow settings.haptics, re-read after settings-closed', () => {
    const h = setup({ settings: { ...defaultSettings(), haptics: false } });
    h.game.events.emit('sim-events', [{ type: 'ate', x: 1, y: 1, points: 1, golden: false }, { type: 'orbEaten', x: 1, y: 1, gained: 15 }]);
    expect(sound.buzz).not.toHaveBeenCalled(); expect(sound.play).toHaveBeenCalledWith('eat');
    h.session.updateSettings({ haptics: true }); h.scene.game.events.emit('settings-closed');
    h.game.events.emit('sim-events', [{ type: 'ate', x: 1, y: 1, points: 1, golden: false }]);
    expect(sound.buzz).toHaveBeenCalledWith(b.juice.haptics.eatMs);
    h.session.updateSettings({ haptics: false }); h.scene.game.events.emit('settings-closed'); sound.buzz.mockClear();
    h.game.events.emit('sim-events', [{ type: 'died', cause: 'wall', x: 1, y: 1 }]);
    expect(sound.buzz).not.toHaveBeenCalled();
  });
  it('P3b2-R17 handoff 1: skill keys are ignored while the Settings overlay is active', () => {
    const h = setup({ bestLevel: 3, carriedEnergy: 50 }, { settings: true, settingsActive: true });
    const spy = vi.spyOn(h.session, 'useSkill'); h.play();
    h.scene.input.keyboard.emit('keydown', { code: 'KeyJ', repeat: false, preventDefault() {} });
    expect(spy).not.toHaveBeenCalled();
    h.overlay.active = false;
    h.scene.input.keyboard.emit('keydown', { code: 'KeyJ', repeat: false, preventDefault() {} });
    expect(spy).toHaveBeenCalledWith(0);
  });
  it('P3b2-R18 a rejected cast shows the reject tip', () => {
    const h = setup({ lastLoadout: ['slowmo', null], bestLevel: 3, carriedEnergy: 0 });
    h.play(); h.game.events.emit('sim-events', [{ type: 'skillRejected', slot: 0, skill: 'slowmo', reason: 'energy' }]);
    expect(h.find('tip').text).toBe('Need 40 energy'); expect(h.find('slowmo-tint').visible).toBe(false);
  });
  it('P3b2-R18 an active skill shows its pill and the slow-mo tint', () => {
    const h = setup({ lastLoadout: ['slowmo', null], bestLevel: 3, carriedEnergy: 50 }); // 50 start energy >= Slow-mo cost 40
    h.play(); h.session.useSkill(0); h.hud.update();
    expect(h.find('pill-0').text).toBe('Slow-mo · 4 s left'); expect(h.find('slowmo-tint').visible).toBe(true);
  });
  it('P3b2-R13 countdown card shows on a fresh checkpoint start only', () => {
    const h = setup({ bestLevel: 12, unlockedCheckpoints: [4], lastLoadout: [null, null] }, { startLevel: 4 });
    h.game.apply(flowTick(h.game.flow, b, 16));
    expect(h.find('countdown-card-title').text).toBe('Starting at L4'); expect(h.find('countdown-card-title').visible).toBe(true);
    h.game.apply(flowTick(h.game.flow, b, b.flow.countdownMs)); h.game.turn(0, -1);
    h.click('pause-button'); h.click('overlay-action'); h.game.apply(flowTick(h.game.flow, b, 16));
    expect(h.find('countdown-card-title').visible).toBe(false); // resume countdown: digit only
  });
  it('MEC-001-R2 a turn during the countdown counts: the run starts on go without a wait hint', () => {
    const h = setup(); h.game.turn(0, -1);
    h.game.apply(flowTick(h.game.flow, b, b.flow.countdownMs));
    expect(h.game.flow.status).toBe('playing'); expect(h.find('wait-hint').visible).toBe(false);
  });
});
