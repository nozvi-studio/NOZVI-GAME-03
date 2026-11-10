import { expect, it } from 'vitest';
import { defaultSave, load, memoryStore, save, SAVE_KEY, SAVE_VERSION } from '../../src/meta';
import type { KeyValueStore } from '../../src/meta';
const rules = { skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'], maxLevel: 30, carryMax: 50 };
const from = (data: unknown, version = 2) => load(memoryStore({ [SAVE_KEY]: JSON.stringify({ version, data }) }), rules);
it('MEC-008-R12 v2 round trip writes the versioned envelope', () => {
  const st = memoryStore(); const data = { ...defaultSave(), bestScore: 42, settings: { sound: false } };
  expect(save(st, data)).toBe(true);
  expect(JSON.parse(st.dump()[SAVE_KEY]!)).toEqual({ version: 2, data }); expect(load(st, rules)).toEqual(data);
});
it('MEC-008-R12 v1 save migrates to v2 keeping bestScore and sound', () => {
  expect(from({ bestScore: 120, settings: { sound: false } }, 1)).toEqual({ ...defaultSave(), bestScore: 120, settings: { sound: false } });
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
  expect(from({ bestScore: 99 }, 3)).toEqual(defaultSave());
});
it('MEC-008-R12 malformed envelopes and storage errors give defaults', () => {
  for (const raw of ['{', 'null', '[]', '{"version":2}', '{"version":-1,"data":{}}', '{"version":2,"data":null}'])
    expect(load(memoryStore({ [SAVE_KEY]: raw }), rules)).toEqual(defaultSave());
  const broken: KeyValueStore = { get: () => { throw Error('denied'); }, set: () => { throw Error('quota'); } };
  expect(load(broken, rules)).toEqual(defaultSave()); expect(save(broken, defaultSave())).toBe(false);
});
it('MEC-008-R12 validates each field independently and returns fresh defaults', () => {
  expect(from({ bestScore: -1, settings: { sound: false }, fullClear: 'yes', bestLevel: 8 })).toEqual({ ...defaultSave(), settings: { sound: false }, bestLevel: 8 });
  const a = defaultSave(); a.settings.sound = false; a.unlockedCheckpoints.push(4);
  expect(defaultSave().settings.sound).toBe(true); expect(defaultSave().unlockedCheckpoints).toEqual([]);
});
it('MEC-008-R12 save never overwrites a newer-version envelope', () => {
  const raw = JSON.stringify({ version: SAVE_VERSION + 1, data: { bestScore: 99 } });
  const st = memoryStore({ [SAVE_KEY]: raw });
  expect(save(st, defaultSave())).toBe(false); expect(st.dump()[SAVE_KEY]).toBe(raw);
});
it('MEC-008-R12 loading an older save keeps a one-time backup of the raw envelope', () => {
  const raw = JSON.stringify({ version: 1, data: { ...defaultSave(), bestScore: 9 } });
  const st = memoryStore({ [SAVE_KEY]: raw });
  expect(load(st, rules).bestScore).toBe(9);
  expect(st.dump()[`${SAVE_KEY}.v1.bak`]).toBe(raw);
  st.set(SAVE_KEY, JSON.stringify({ version: 1, data: { bestLevel: 1 } })); load(st, rules);
  expect(st.dump()[`${SAVE_KEY}.v1.bak`]).toBe(raw);
});
it('MEC-008-R12 a current-version or corrupt save writes no backup', () => {
  const st = memoryStore(); save(st, defaultSave()); load(st, rules); load(memoryStore({ [SAVE_KEY]: '{' }), rules);
  expect(Object.keys(st.dump())).toEqual([SAVE_KEY]);
});
