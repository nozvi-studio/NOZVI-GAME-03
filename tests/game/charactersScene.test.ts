import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createSession, type Session } from '../../src/session';
import { memoryStore } from '../../src/meta';
import { activeSkin, setActiveSkin } from '../../src/game/art/skins';
import { CharactersScene } from '../../src/game/scenes/CharactersScene';
import { loadBalance } from '../support/balance';
import { sceneHarness, type DrawObject } from '../support/scene';

const h = vi.hoisted(() => ({ goTo: [] as unknown[][], made: [] as { name: string }[] }));
vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } }, Geom: { Rectangle: class {}, } } }));
vi.mock('../../src/game/motion', async (orig) => ({ ...(await orig<object>()),
  goTo: (...a: unknown[]) => { h.goTo.push(a); return true; }, enter: () => 0,
  motionFor: () => ({ popIn: () => {}, fadeIn: () => {}, fadeOut: () => {}, ease: () => {} }) }));
vi.mock('../../src/game/ui/touchFx', () => ({ tapBurst: vi.fn(), denied: vi.fn() }));
vi.mock('../../src/game/ui/feedback', () => ({ attachFeedback: () => ({ press: () => {}, release: () => {}, fire: (a: () => void) => a() }), pivotAt: () => ({}) }));
vi.mock('../../src/game/ui/skin', () => ({ hostOf: () => ({}), skinTexture: () => 'tex', ringTexture: () => 'ring', lipPx: () => 0 }));
vi.mock('../../src/game/art/capyTextures', () => ({ ensureSkinTextures: () => {} }));
vi.mock('../../src/game/audio/synth', () => ({ createSynth: () => ({ setOn: () => {}, play: () => {}, unlock: () => {} }) }));
vi.mock('../../src/game/render/palette', () => ({ reduceMotion: () => false, osDisplay: () => ({}) }));
vi.mock('../../src/game/ui/background', () => ({ screenBackground: (s: { add: { image(): unknown } }) => s.add.image() }));
vi.mock('../../src/game/ui/widgets', async () => {
  const { DrawObject: D } = await import('../support/scene');
  const named = (name: string, text: string): DrawObject => { const o = new D().setName(name).setText(text); h.made.push(o); return o; };
  const button = (_s: unknown, _x: number, _y: number, _w: number, _hh: number, text: string, name: string, action: () => void) => {
    const c = named(name, text); c.on('pointerup', action); return { c, g: c, text: c, w: 0, h: 0, lip: c };
  };
  return { chip: (_s: unknown, _x: number, _y: number, text: string, _f: string, name = '') => named(name, text),
    pillButton: button, card: () => new D(), titleText: (_s: unknown, _x: number, _y: number, text: string) => named('', text) };
});

let harness: ReturnType<typeof sceneHarness>, session: Session;
const make = (data?: { debug?: boolean }, reuse = false): void => {
  harness = sceneHarness(); h.goTo.length = 0; h.made.length = 0;
  const balance = loadBalance();
  if (!reuse) session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  harness.registry.set('session', session); harness.registry.set('balance', balance);
  const sc = new CharactersScene();
  Object.assign(sc, harness.scene); (sc as unknown as { textures: { exists(): boolean } }).textures = { exists: () => true } as never;
  (sc as unknown as { init(d?: object): void }).init(data); (sc as unknown as { create(): void }).create();
};
const find = (n: string): DrawObject | undefined => [...harness.objects, ...(h.made as DrawObject[])].reverse().find(o => o.name === n);
const text = (n: string): string => find(n)!.text;
const press = (n: string): void => { const o = find(n)!; o.emit('pointerdown'); o.emit('pointerup'); };
beforeEach(() => make());
afterEach(() => setActiveSkin('snake'));

it('MEC-011-R15 on entry the equipped skin is previewed and its token is selected', () => {
  expect(text('chars-name')).toBe('Mango Snake'); expect(text('chars-action')).toBe('Equipped');
});
it('MEC-011-R15 tapping a token previews it and changes nothing in the save', () => {
  press('chars-token-capy');
  expect(text('chars-name')).toBe('Capybara'); expect(text('chars-rarity')).toBe('★ Rare'); expect(session.skinsModel().equipped).toBe('snake');
});
it('MEC-011-R17 the action label follows the state', () => {
  press('chars-token-capy'); expect(text('chars-action')).toBe('Need 800 more');
  session.debugAddCoins(); session.debugAddCoins(); make(undefined, true); press('chars-token-capy');
  expect(text('chars-action')).toBe('BUY 800');
});
it('MEC-011-R6/R18 BUY pays, equips, updates the coin chip and the token', () => {
  session.debugAddCoins(); make(undefined, true); press('chars-token-ginger'); press('chars-action');
  expect(session.skinsModel()).toMatchObject({ coins: 200, equipped: 'ginger' });
  expect(text('chars-coins')).toBe('200'); expect(text('chars-action')).toBe('Equipped'); expect(activeSkin()).toBe('ginger');
});
it('MEC-011-R17 a tap on "Need n more" changes nothing', () => {
  const before = JSON.stringify(session.skinsModel());
  press('chars-token-capy'); press('chars-action');
  expect(JSON.stringify(session.skinsModel())).toBe(before);
});
it('MEC-011-R7 EQUIP on an owned skin equips it and sets the active skin', () => {
  session.debugAddCoins(); session.buySkin('pup'); session.equipSkin('snake'); make(undefined, true);
  press('chars-token-pup'); expect(text('chars-action')).toBe('EQUIP'); press('chars-action');
  expect(session.skinsModel().equipped).toBe('pup'); expect(activeSkin()).toBe('pup');
});
it('MEC-011-R10 the +500 control exists only with debug', () => {
  expect(find('chars-debug-coins')).toBeUndefined();
  make({ debug: true }); expect(find('chars-debug-coins')).toBeDefined();
  press('chars-debug-coins'); expect(session.skinsModel().coins).toBe(loadBalance().skins.debugGrant); expect(text('chars-coins')).toBe(String(loadBalance().skins.debugGrant));
});
it('MEC-011-R20 Back returns to Home', () => {
  press('chars-back-hit');
  expect(h.goTo.at(-1)![1]).toBe('Home'); expect(h.goTo.at(-1)![3]).toBe('back');
});
