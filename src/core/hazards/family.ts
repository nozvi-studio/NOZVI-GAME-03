import type { Cell, FamilyKey, HazardFamily, HazardInstance, InstanceRules, SimState } from '../types';
import { addTimedHazards } from './timed';

// MEC-004-R2 lift the unchanged P0/P1 instance lifecycle into a state-level descriptor.
export function defineFamily<K extends FamilyKey, S extends HazardInstance>(
  key: K, rules: InstanceRules<S>, get: (s: SimState) => S[], set: (s: SimState, instances: S[]) => void,
): HazardFamily & { readonly key: K } {
  return {
    key, cause: rules.cause, capClass: rules.capClass, maxActiveKey: rules.maxActiveKey, breakable: rules.breakable,
    emitsIncoming: rules.emitsIncoming ?? false,
    ...(rules.onBreak ? { onBreak: rules.onBreak } : {}),
    spawn(s, ctx) {
      const instance = rules.spawn(ctx, ctx.rng, s);
      if (!instance) return null;
      if (instance.family === 'rock' || instance.family === 'fence' || instance.family === 'maze') addTimedHazards(s, instance);
      else get(s).push(instance);
      const cells: Cell[] = 'cells' in instance ? instance.cells : [instance];
      return cells.map(({ x, y }) => ({ x, y }));
    },
    update(s, ctx) { set(s, get(s).filter(instance => rules.update(instance, ctx) !== 'remove')); },
    snapshot: s => structuredClone(get(s)),
    solidAt: (s, x, y) => get(s).some(instance => rules.solidAt(instance, x, y)),
    bfsWallAt: (s, x, y) => get(s).some(instance => rules.bfsWallAt(instance, x, y)),
    reservedAt: (s, x, y) => get(s).some(instance => rules.reservedAt(instance, x, y)),
    count: s => get(s).length,
  };
}
