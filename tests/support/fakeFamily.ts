import { FAMILIES, __setFamiliesForTest } from '../../src/core/hazards/registry';
import { spawnCtx } from '../../src/core/hazards/director';
import { rngFrom, type Rng } from '../../src/core/rng';
import { testCtx } from '../../src/core/testing';
import type { CapClass, CauseKey, FamilyKey, HazardFamily, HitCtx, HitKind, SimEvent, SimState, SpawnCtx, StepCtx, TileKind } from '../../src/core/types';
import { loadBalance } from './balance';

export interface FakeSpec {
  key: FamilyKey; cause?: CauseKey | null; solid?: [number, number][]; wall?: [number, number][]; reserved?: [number, number][];
  tile?: { kind: TileKind; cells: [number, number][] }; hit?: { kind: HitKind; cells: [number, number][] };
  breakable?: boolean; capClass?: CapClass; count?: number;
}
const has = (cells: [number, number][] | undefined, x: number, y: number) => cells?.some(([cx, cy]) => cx === x && cy === y) ?? false;

// MEC-004-R3 deterministic descriptor stub; no fake state leaks into SimState.
export function fakeFamily(o: FakeSpec): HazardFamily {
  return {
    key: o.key, cause: o.cause ?? null, breakable: o.breakable ?? false, capClass: o.capClass ?? 'none', maxActiveKey: null,
    spawn: () => null, update: () => {}, snapshot: () => null,
    solidAt: (_s, x, y) => has(o.solid, x, y), bfsWallAt: (_s, x, y) => has(o.wall, x, y), reservedAt: (_s, x, y) => has(o.reserved, x, y),
    tileAt: (_s, x, y) => has(o.tile?.cells, x, y) ? o.tile!.kind : null,
    headHit: (_s, x, y) => has(o.hit?.cells, x, y) ? o.hit!.kind : null,
    count: () => o.count ?? 0,
  };
}

export function withFamilies(_s: SimState, specs: FakeSpec[], fn: () => void): void {
  const previous = FAMILIES;
  __setFamiliesForTest(specs.map(fakeFamily));
  try { fn(); } finally { __setFamiliesForTest(previous); }
}

export function hitCtx(s: SimState): SpawnCtx & StepCtx & HitCtx & { rng: Rng; events: SimEvent[] } {
  const b = loadBalance();
  return { ...spawnCtx(s, b), ...testCtx(b, s), rng: rngFrom(s.rng),
    // Task 1 families have no update-time hits; collision dispatch arrives in Task 2.
    hitHead: () => { throw new Error('Update-time hits require the MEC-004-R8 collision pipeline'); },
  };
}
