// src/core/hazards/registry.ts — hazard family registry (design §4.1). MEC-004
import type { HazardFamily, HazardInstance, FamilyKey, SimState, StepCtx, TerrainHazard, TimedHazard } from '../types';
import { FENCE } from './fence';
import { MAZE } from './maze';
import { ROCK } from './rock';
import { TERRAIN } from './terrain';

export const FAMILY: { rock: HazardFamily<TimedHazard>; fence: HazardFamily<TimedHazard>;
  maze: HazardFamily<TimedHazard>; terrain: HazardFamily<TerrainHazard> } = { rock: ROCK, fence: FENCE, maze: MAZE, terrain: TERRAIN };
// MEC-004 ordered registry: rock, fence, maze, terrain
export const FAMILIES = [ROCK, FENCE, MAZE, TERRAIN] as unknown as readonly HazardFamily<HazardInstance>[];

const fam = (k: FamilyKey) => FAMILY[k] as unknown as HazardFamily<HazardInstance>;
export const instancesOf = (s: SimState, k: FamilyKey): HazardInstance[] =>
  k === 'terrain' ? s.terrains : s.hazards.filter(h => h.family === k);

// MEC-004 first family (in FAMILIES order) with an instance answering the query at (x, y)
export function familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): FamilyKey | null {
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
}
