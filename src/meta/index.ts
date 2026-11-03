// src/meta/index.ts — the only public entry of src/meta
export { memoryStore } from './storage';
export type { KeyValueStore } from './storage';
export { defaultSave, load, save, SAVE_KEY, SAVE_VERSION } from './save';
export type { Migration, SaveData } from './save';
