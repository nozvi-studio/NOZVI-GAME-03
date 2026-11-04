import type { CauseKey, HazardFamily, HitKind, SimState, TileKind } from '../types';
import { FAMILIES } from './registry';

// MEC-004-R3 the first matching family owns a solid cell's cause.
export function solidFamilyAt(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): HazardFamily | null {
  for (const f of fams) if (f.solidAt(s, x, y)) return f;
  return null;
}

export function solidCauseAt(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): CauseKey | null {
  return solidFamilyAt(s, x, y, fams)?.cause ?? null;
}

// MEC-004-R3 placement and BFS compose every family, including optional test families.
export function bfsWall(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): boolean {
  return fams.some(f => f.bfsWallAt(s, x, y));
}

export function reservedByFamilies(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): boolean {
  return fams.some(f => f.reservedAt(s, x, y));
}

export function tileAt(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): TileKind | null {
  for (const f of fams) {
    const tile = f.tileAt?.(s, x, y);
    if (tile != null) return tile;
  }
  return null;
}

export function headHitAt(s: SimState, x: number, y: number, fams: readonly HazardFamily[] = FAMILIES): { family: HazardFamily; kind: HitKind } | null {
  for (const family of fams) {
    const kind = family.headHit?.(s, x, y);
    if (kind != null) return { family, kind };
  }
  return null;
}
