import { FAMILIES, __setFamiliesForTest } from '../../src/core/hazards/registry';
import { spawnCtx } from '../../src/core/hazards/director';
import { rngFrom, type Rng } from '../../src/core/rng';
import { testCtx } from '../../src/core/testing';
import type { CapClass, CauseKey, FamilyKey, HazardFamily, HitCtx, HitKind, SimEvent, SimState, SpawnCtx, StepCtx, TileKind } from '../../src/core/types';
import { loadBalance } from './balance';
import { applyHeadHit } from '../../src/core/hazards/collision';

export interface FakeSpec {
  key: FamilyKey; cause?: CauseKey | null; solid?: [number, number][]; wall?: [number, number][]; reserved?: [number, number][];
  tile?: { kind: TileKind; cells: [number, number][] }; hit?: { kind: HitKind; cells: [number, number][] };
  breakable?: boolean; capClass?: CapClass; count?: number;
}
const has = (cells: [number, number][] | undefined, x: number, y: number) => cells?.some(([cx, cy]) => cx === x && cy === y) ?? false;

// MEC-004-R3 deterministic descriptor stub; no fake state leaks into SimState.
export function fakeFamily(o: FakeSpec): HazardFamily {
  let solids = o.solid, hits = o.hit?.cells;
  return {
    key: o.key, cause: o.cause ?? null, breakable: o.breakable ?? false, capClass: o.capClass ?? 'none', maxActiveKey: null,
    spawn: () => null, update: () => {}, snapshot: () => null,
    solidAt: (_s, x, y) => has(solids, x, y), bfsWallAt: (_s, x, y) => has(o.wall, x, y), reservedAt: (_s, x, y) => has(o.reserved, x, y),
    tileAt: (_s, x, y) => has(o.tile?.cells, x, y) ? o.tile!.kind : null,
    headHit: (_s, x, y) => has(hits, x, y) ? o.hit!.kind : null,
    onBreak(_s, x, y) {
      solids = solids?.filter(([cx, cy]) => cx !== x || cy !== y);
      hits = hits?.filter(([cx, cy]) => cx !== x || cy !== y);
    },
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
  const ctx: ReturnType<typeof hitCtx> = { ...spawnCtx(s, b), ...testCtx(b, s), rng: rngFrom(s.rng),
    hitHead: (f, x, y, kind, dir) => applyHeadHit(s, ctx, f, x, y, kind, dir),
  };
  return ctx;
}
