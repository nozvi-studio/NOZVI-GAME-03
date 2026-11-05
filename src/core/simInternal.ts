import type { Balance } from './balance';
import { createSim, restoreSim, stateOf as readonlyStateOf } from './sim';
import type { Sim, SimOptions, SimState, SpawnObserver } from './types';

/** MEC-004-R17/R18 test-support options; never part of serialized state. */
export interface InternalOptions {
  directorEnabled?: boolean;
  freezeSnake?: boolean;
  observer?: SpawnObserver;
}

// MEC-004-R17 expose controlled runs to tests/tools without extending the game API.
export function createSimInternal(balance: Balance, seed: number, options: SimOptions, internal: InternalOptions): Sim {
  return restoreSim(balance, stateOf(createSim(balance, seed, options)), internal);
}

/** Mutable live alias for tests/tools only. */
export function stateOf(sim: Sim): SimState { return readonlyStateOf(sim) as SimState; }
