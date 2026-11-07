import { expect, it } from 'vitest';
import { defaultSave, defaultSettings, load, memoryStore, save, SAVE_KEY, SAVE_VERSION } from '../../src/meta';
import type { KeyValueStore } from '../../src/meta';
const rules = { skillIds: ['slowmo', 'tailSnip', 'shield', 'mangoRain'], maxLevel: 30, carryMax: 50 };
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
