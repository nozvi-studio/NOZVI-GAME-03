import type { HazardFamily, FamilyKey, SimState, SpawnCtx, StepCtx } from '../../src/core/types';
import type { Rng } from '../../src/core/rng';
import { buildState } from './state';
import { loadBalance } from './balance';
import { spawnCtx } from '../../src/core/hazards/director';

// MEC-004-R2 run the P0 instance-level assertions against the new state-level API.
// Each call isolates one instance; spawn assumes one successful call creates exactly one instance.
// Use normal SimState fixtures for interactions between multiple instances or families.
export function instanceFamily<K extends Exclude<FamilyKey, 'mud'>>(family: HazardFamily & { readonly key: K }) {
  type Instance = SimState['families'][K][number];
  const state = (instance: Instance, ctx: { balance: SpawnCtx['balance'] }): SimState => {
    const s = buildState(ctx.balance);
    (s.families[family.key] as Instance[]).push(instance);
    return s;
  };
  return {
    spawn(ctx: Omit<SpawnCtx, 'candidateValid'>, rng: Rng): Instance | null {
      const s = buildState(ctx.balance);
      if (!family.spawn(s, { ...spawnCtx(s, ctx.balance), ...ctx, rng })) return null;
      return s.families[family.key][0] as Instance;
    },
    update(instance: Instance, ctx: StepCtx): 'keep' | 'remove' {
      const s = state(instance, ctx);
      family.update(s, { ...ctx, hitHead: () => { throw new Error('Unexpected update-time hit in a P0/P1 family'); } });
      return s.families[family.key].length ? 'keep' : 'remove';
    },
    solidAt: (instance: Instance, x: number, y: number) => family.solidAt(state(instance, { balance: loadBalance() }), x, y),
    bfsWallAt: (instance: Instance, x: number, y: number) => family.bfsWallAt(state(instance, { balance: loadBalance() }), x, y),
    reservedAt: (instance: Instance, x: number, y: number) => family.reservedAt(state(instance, { balance: loadBalance() }), x, y),
  };
}

