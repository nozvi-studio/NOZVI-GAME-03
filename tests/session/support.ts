// Session test support: fake clock, memory store and a seeded session.
import { createSession } from '../../src/session';
import { memoryStore, SAVE_KEY } from '../../src/meta';
import { loadBalance } from '../support/balance';

export const b = loadBalance();
export const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };
export const baseSave = { bestScore: 0, settings: { sound: true }, bestLevel: 0, fullClear: false,
  unlockedCheckpoints: [] as number[], carriedEnergy: 0, lastLoadout: [null, null] as (string | null)[] };

export function setup(saveData?: object) {
  const store = memoryStore(); let t = 1000;
  if (saveData) store.set(SAVE_KEY, JSON.stringify({ version: 2, data: { ...baseSave, ...saveData } }));
  const s = createSession({ balance: b, store, newSeed: () => 7, now: () => (t += 10) });
  return { s, store };
}

/** No turns from an L1 start: the head leaves the board on the 9th step at 9 x 140 ms. */
export const WALL_DEATH_MS = 1260;
