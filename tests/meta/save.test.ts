import { expect, it } from 'vitest';
import { defaultSave, defaultSettings, load, memoryStore, save, SAVE_KEY, SAVE_VERSION } from '../../src/meta';
import type { KeyValueStore } from '../../src/meta';
import { loadBalance } from '../support/balance';
const rules = { skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'], maxLevel: 30, carryMax: 50, skins: loadBalance().skins };
const from = (data: unknown, version = SAVE_VERSION) => load(memoryStore({ [SAVE_KEY]: JSON.stringify({ version, data }) }), rules);
it('MEC-008-R12 v2 round trip writes the versioned envelope', () => {
  const st = memoryStore(); const data = { ...defaultSave(), bestScore: 42, settings: { ...defaultSettings(), sound: false } };
  expect(save(st, data)).toBe(true);
  expect(JSON.parse(st.dump()[SAVE_KEY]!)).toEqual({ version: SAVE_VERSION, data }); expect(load(st, rules)).toEqual(data);
});
it('MEC-008-R12 v1 save migrates to v2 keeping bestScore and sound', () => {
  expect(from({ bestScore: 120, settings: { ...defaultSettings(), sound: false } }, 1)).toEqual({ ...defaultSave(), bestScore: 120, settings: { ...defaultSettings(), sound: false } });
});
it('MEC-008-R12 invalid carriedEnergy alone is reset to default without losing bestLevel', () => {
  const out = from({ ...defaultSave(), carriedEnergy: 'x', bestLevel: 14 });
  expect(out.carriedEnergy).toBe(0); expect(out.bestLevel).toBe(14);
});
it('MEC-008-R12 carriedEnergy 999 / -5 / 12.7 loads as 50 / 0 / 12', () => {
  expect([999, -5, 12.7].map(carriedEnergy => from({ carriedEnergy }).carriedEnergy)).toEqual([50, 0, 12]);
  expect([99, -5, 12.7].map(bestLevel => from({ bestLevel }).bestLevel)).toEqual([30, 0, 12]);
});
it('MEC-008-R12 checkpoints drop non-integers and out-of-range, de-duplicate and sort', () => {
  expect(from({ unlockedCheckpoints: [12, 4, 4, 0, 31, 2.5, 5] }).unlockedCheckpoints).toEqual([4, 5, 12]);
});
it('MEC-008-R12 lastLoadout not a 2-element array of ids or null becomes [null, null]', () => {
  for (const lastLoadout of [['slowmo'], ['laser', null]]) expect(from({ lastLoadout }).lastLoadout).toEqual([null, null]);
  expect(from({ lastLoadout: ['shield', 'shield'] }).lastLoadout).toEqual(['shield', 'shield']);
});
it('MEC-008-R12 future version still loads full defaults', () => {
  expect(from({ bestScore: 99 }, SAVE_VERSION + 1)).toEqual(defaultSave());
});
it('MEC-008-R12 malformed envelopes and storage errors give defaults', () => {
  for (const raw of ['{', 'null', '[]', '{"version":2}', '{"version":-1,"data":{}}', '{"version":2,"data":null}'])
    expect(load(memoryStore({ [SAVE_KEY]: raw }), rules)).toEqual(defaultSave());
  const broken: KeyValueStore = { get: () => { throw Error('denied'); }, set: () => { throw Error('quota'); } };
  expect(load(broken, rules)).toEqual(defaultSave()); expect(save(broken, defaultSave())).toBe(false);
});
it('MEC-008-R12 validates each field independently and returns fresh defaults', () => {
  expect(from({ bestScore: -1, settings: { ...defaultSettings(), sound: false }, fullClear: 'yes', bestLevel: 8 })).toEqual({ ...defaultSave(), settings: { ...defaultSettings(), sound: false }, bestLevel: 8 });
  const a = defaultSave(); a.settings.sound = false; a.unlockedCheckpoints.push(4);
  expect(defaultSave().settings.sound).toBe(true); expect(defaultSave().unlockedCheckpoints).toEqual([]);
});
it('MEC-008-R12 save never overwrites a newer-version envelope', () => {
  const raw = JSON.stringify({ version: SAVE_VERSION + 1, data: { bestScore: 99 } });
  const st = memoryStore({ [SAVE_KEY]: raw });
  expect(save(st, defaultSave())).toBe(false); expect(st.dump()[SAVE_KEY]).toBe(raw);
});
it('MEC-008-R12 loading an older save keeps a one-time backup of the raw envelope', () => {
  const raw = JSON.stringify({ version: 2, data: { ...defaultSave(), bestLevel: 9 } });
  const st = memoryStore({ [SAVE_KEY]: raw });
  expect(load(st, rules).bestLevel).toBe(9);
  expect(st.dump()[`${SAVE_KEY}.v2.bak`]).toBe(raw);
  st.set(SAVE_KEY, JSON.stringify({ version: 2, data: { bestLevel: 1 } })); load(st, rules);
  expect(st.dump()[`${SAVE_KEY}.v2.bak`]).toBe(raw);
});
it('MEC-008-R12 a current-version or corrupt save writes no backup', () => {
  const st = memoryStore(); save(st, defaultSave()); load(st, rules); load(memoryStore({ [SAVE_KEY]: '{' }), rules);
  expect(Object.keys(st.dump())).toEqual([SAVE_KEY]);
});
it('MEC-011-R11 a v3 save migrates to v4 with 0 coins and the snake owned and equipped', () => {
  const store = memoryStore();
  store.set(SAVE_KEY, JSON.stringify({ version: 3, data: { ...defaultSave(), bestScore: 42, coins: undefined } }));
  const d = load(store, rules);
  expect(d.bestScore).toBe(42);
  expect(d.coins).toBe(0); expect(d.ownedSkins).toEqual(['snake']); expect(d.equippedSkin).toBe('snake');
  expect(store.get(`${SAVE_KEY}.v3.bak`)).not.toBeNull();
});
it('MEC-011-R11 v4 round trip keeps coins, owned skins and the equipped skin', () => {
  const store = memoryStore();
  save(store, { ...defaultSave(), coins: 120, ownedSkins: ['snake', 'capy'], equippedSkin: 'capy' });
  expect(JSON.parse(store.get(SAVE_KEY)!).version).toBe(4);
  const d = load(store, rules);
  expect([d.coins, d.ownedSkins, d.equippedSkin]).toEqual([120, ['snake', 'capy'], 'capy']);
});
it('MEC-011-R12 load repairs skin fields', () => {
  const store = memoryStore();
  store.set(SAVE_KEY, JSON.stringify({ version: 4, data: { ...defaultSave(), coins: -3, ownedSkins: ['dragon'], equippedSkin: 'pup' } }));
  const d = load(store, rules);
  expect([d.coins, d.ownedSkins, d.equippedSkin]).toEqual([0, ['snake'], 'snake']);
});
