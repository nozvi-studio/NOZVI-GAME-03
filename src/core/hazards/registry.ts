// MEC-004-R1 ordered registry. Descriptors contain no simulation state.
import type { FamilyKey, HazardFamily, HitCtx, SimState, StepCtx } from '../types';
import { FENCE } from './fence';
import { MAZE } from './maze';
import { ROCK } from './rock';
import { TERRAIN } from './terrain';
import { rottenRockFamily } from './rottenRock';
import { snipWallFamily } from './snipWall';
import { rubbleFamily } from './rubble';
import { timedHazards, updateTimed } from './timed';

const DEFAULT_FAMILIES: readonly HazardFamily[] = [ROCK, FENCE, MAZE, TERRAIN, rottenRockFamily, snipWallFamily, rubbleFamily];
export let FAMILIES: readonly HazardFamily[] = DEFAULT_FAMILIES;
export const FAMILY: Record<FamilyKey, HazardFamily> = {
  rock: ROCK, fence: FENCE, maze: MAZE, terrain: TERRAIN, rottenRock: rottenRockFamily, snipWall: snipWallFamily, rubble: rubbleFamily,
};

/** Test-only global seam. Always restore with null in a finally block. */
export function __setFamiliesForTest(f: readonly HazardFamily[] | null): void { FAMILIES = f ?? DEFAULT_FAMILIES; }

// MEC-002-R7 preserve rotten-rock collision priority at the P1 collision boundary.
export function familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): FamilyKey | null {
  if (q === 'solidAt' && FAMILIES.includes(rottenRockFamily) && rottenRockFamily.solidAt(s, x, y)) return 'rottenRock';
  return FAMILIES.find(f => f[q](s, x, y))?.key ?? null;
}

// MEC-004-R2 preserve the P1 interleaved timed-family event order, then registry order.
export function stepHazards(s: SimState, ctx: StepCtx & Partial<HitCtx>): void {
  // Existing families never hit during update; Task 2 supplies the collision dispatcher.
  const familyCtx: StepCtx & HitCtx = { ...ctx, hitHead: ctx.hitHead ?? (() => { throw new Error('Update-time hits require the MEC-004-R8 collision pipeline'); }) };
  if (FAMILIES === DEFAULT_FAMILIES) {
    const gone = new Set(timedHazards(s).filter(h => updateTimed(h, ctx) === 'remove'));
    if (gone.size) for (const key of ['rock', 'fence', 'maze'] as const) s.families[key] = s.families[key].filter(h => !gone.has(h));
    for (const f of FAMILIES.slice(3)) f.update(s, familyCtx);
  } else {
    for (const f of FAMILIES) f.update(s, familyCtx);
  }
}
