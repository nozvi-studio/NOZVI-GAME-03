// MEC-004-R1 ordered registry. Descriptors contain no simulation state.
import type { FamilyKey, HazardFamily, HitCtx, SimState, StepCtx } from '../types';
import { FENCE } from './fence';
import { MAZE } from './maze';
import { ROCK } from './rock';
import { TERRAIN } from './terrain';
import { rottenRockFamily } from './rottenRock';
import { snipWallFamily } from './snipWall';
import { rubbleFamily } from './rubble';
import { mud } from './mud';
import { ice } from './ice';
import { coconut } from './coconut';
import { spike } from './spike';
import { gate } from './gate';
import { npc } from './npc';
import { timedHazards, updateTimed } from './timed';
import { solidFamilyWithPriority } from './queries';

export const DEFAULT_FAMILIES: readonly HazardFamily[] = [ROCK, FENCE, MAZE, TERRAIN, rottenRockFamily, snipWallFamily, rubbleFamily, mud, ice, coconut, gate, spike, npc];
export let FAMILIES: readonly HazardFamily[] = DEFAULT_FAMILIES;
export const FAMILY: Record<keyof SimState['families'], HazardFamily> & Partial<Record<FamilyKey, HazardFamily>> = {
  rock: ROCK, fence: FENCE, maze: MAZE, terrain: TERRAIN, rottenRock: rottenRockFamily, snipWall: snipWallFamily, rubble: rubbleFamily,
  mud, ice, coconut, gate, spike, npc,
};

/** Test-only global seam. Always restore with null in a finally block. */
export function __setFamiliesForTest(f: readonly HazardFamily[] | null): void { FAMILIES = f ?? DEFAULT_FAMILIES; }

// MEC-004 family-key compatibility query for existing callers.
export function familyAt(s: SimState, x: number, y: number, q: 'solidAt' | 'bfsWallAt' | 'reservedAt'): FamilyKey | null {
  if (q === 'solidAt') return solidFamilyWithPriority(s, x, y)?.key ?? null;
  return FAMILIES.find(f => f[q](s, x, y))?.key ?? null;
}

// MEC-004-R2 preserve the P1 interleaved timed-family event order, then registry order.
export function stepHazards(s: SimState, ctx: StepCtx & Partial<HitCtx>): void {
  // Legacy direct callers can omit hitHead; the Sim always supplies the dispatcher.
  const familyCtx: StepCtx & HitCtx = { ...ctx, hitHead: ctx.hitHead ?? (() => { throw new Error('Update-time hits require the MEC-004-R8 collision pipeline'); }) };
  if (FAMILIES === DEFAULT_FAMILIES) {
    const gone = new Set(timedHazards(s).filter(h => updateTimed(h, ctx) === 'remove'));
    if (gone.size) for (const key of ['rock', 'fence', 'maze'] as const) s.families[key] = s.families[key].filter(h => !gone.has(h));
    for (const f of FAMILIES.slice(3)) {
      if (s.status === 'over') break; // MEC-004-R8 later families do not update after a fatal hit.
      f.update(s, familyCtx);
    }
  } else {
    for (const f of FAMILIES) {
      if (s.status === 'over') break;
      f.update(s, familyCtx);
    }
  }
}
