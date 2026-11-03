// tests/meta/save.test.ts
import { describe, expect, it } from 'vitest';
import { defaultSave, load, memoryStore, save, SAVE_KEY } from '../../src/meta';
import type { KeyValueStore } from '../../src/meta';

describe('GDD-8.4 save', () => {
  it('GDD-8.4 round trip writes the versioned envelope', () => {
    const st = memoryStore();
    expect(save(st, { bestScore: 42, settings: { sound: false } })).toBe(true);
    expect(JSON.parse(st.dump()[SAVE_KEY]!)).toEqual({ version: 1, data: { bestScore: 42, settings: { sound: false } } });
    expect(load(st)).toEqual({ bestScore: 42, settings: { sound: false } });
  });
  it('GDD-8.4 missing, corrupt, wrong shape and future version give defaults', () => {
    expect(load(memoryStore())).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{"version":1,"data":{"bestScore":"9"}}' }))).toEqual(defaultSave());
    expect(load(memoryStore({ [SAVE_KEY]: '{"version":2,"data":{"bestScore":9,"settings":{"sound":true}}}' }))).toEqual(defaultSave());
  });
  it('GDD-8.4 older versions run migrations in order up to the current version', () => {
    const order: number[] = [];
    const st = memoryStore({ [SAVE_KEY]: '{"version":0,"data":{"best":7}}' });
    const out = load(st, { 0: d => { order.push(0); return { bestScore: (d as { best: number }).best, settings: { sound: true } }; } });
    expect(order).toEqual([0]);
    expect(out).toEqual({ bestScore: 7, settings: { sound: true } });
  });
  it('GDD-8.4 storage errors are swallowed', () => {
    const broken: KeyValueStore = { get: () => { throw new Error('denied'); }, set: () => { throw new Error('quota'); } };
    expect(load(broken)).toEqual(defaultSave());
    expect(save(broken, defaultSave())).toBe(false);
  });
  it('GDD-8.4 a missing migration step gives defaults', () => {
    expect(load(memoryStore({ [SAVE_KEY]: '{"version":0,"data":{"best":7}}' }))).toEqual(defaultSave());
  });
  it('GDD-8.4 negative or fractional bestScore is wrong shape', () => {
    for (const bestScore of [-1, 1.5]) {
      const st = memoryStore({ [SAVE_KEY]: JSON.stringify({ version: 1, data: { bestScore, settings: { sound: true } } }) });
      expect(load(st)).toEqual(defaultSave());
    }
  });
  it('GDD-8.4 prototype keys are ignored', () => {
    expect(load(memoryStore({ 'mango-snake-hard2-best': '50', 'mango-snake-sound': 'off' }))).toEqual(defaultSave());
  });
});
