// src/core/hazards/registry.ts — hazard family registry (design §4.1). MEC-004
import type { HazardFamily, HazardInstance, TableFamily, SimState, StepCtx, TerrainHazard, TimedHazard, RottenRock, SnipWall } from '../types';
import { FENCE } from './fence';
import { MAZE } from './maze';
import { ROCK } from './rock';
import { TERRAIN } from './terrain';
import { rottenRockFamily } from './rottenRock';
import { snipWallFamily } from './snipWall';

type RegisteredKey = TableFamily | 'rottenRock' | 'snipWall';

export const FAMILY: { rock: HazardFamily<TimedHazard>; fence: HazardFamily<TimedHazard>;
  maze: HazardFamily<TimedHazard>; terrain: HazardFamily<TerrainHazard>; rottenRock: HazardFamily<RottenRock>; snipWall: HazardFamily<SnipWall> } = {
  rock: ROCK, fence: FENCE, maze: MAZE, terrain: TERRAIN, rottenRock: rottenRockFamily, snipWall: snipWallFamily,
};
// MEC-004/MEC-006-R23 ordered registry; rubble follows in Task 7.
export const FAMILIES = [ROCK, FENCE, MAZE, TERRAIN, rottenRockFamily, snipWallFamily] as unknown as readonly (HazardFamily<HazardInstance> & { key: RegisteredKey })[];

const fam = (k: TableFamily) => FAMILY[k] as unknown as HazardFamily<HazardInstance>;
export const instancesOf = (s: SimState, k: RegisteredKey): HazardInstance[] =>
  k === 'snipWall' ? s.snipWalls : k === 'rottenRock' ? s.rottenRocks : k === 'terrain' ? s.terrains : s.hazards.filter(h => h.family === k);

// MEC-004 first family (in FAMILIES order) with an instance answering the query at (x, y)
export function familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): RegisteredKey | null {
  // MEC-001-R2/MEC-002-R7 retain P0 collision priority even for overlapping test fixtures.
  if (q === 'solidAt' && s.rottenRocks.some(r => rottenRockFamily.solidAt(r, x, y))) return 'rottenRock';
  for (const f of FAMILIES) for (const h of instancesOf(s, f.key)) if (f[q](h, x, y)) return f.key;
  return null;
}

// MEC-004 update all hazards in spawn order, then all terrains; remove after each pass (L1000–1001, L575, L595)
export function stepHazards(s: SimState, ctx: StepCtx): void {
  const gone = new Set<HazardInstance>();   // transient, never stored
  for (const h of s.hazards) if (fam(h.family).update(h, ctx) === 'remove') gone.add(h);
  if (gone.size) s.hazards = s.hazards.filter(h => !gone.has(h));
  gone.clear();
  for (const T of s.terrains) if (FAMILY.terrain.update(T, ctx) === 'remove') gone.add(T);
  if (gone.size) s.terrains = s.terrains.filter(T => !gone.has(T));
  // MEC-002-R7 rotten rocks tick before mango rot, so a new rock retains its full lifetime.
  s.rottenRocks = s.rottenRocks.filter(r => rottenRockFamily.update(r, ctx) !== 'remove');
  s.snipWalls = s.snipWalls.filter(w => snipWallFamily.update(w, ctx) !== 'remove');
}
