// src/core/hazards/fixedTerrain.ts - MEC-019 fixed terrain family: live cells of the current template.
import type { Balance } from '../balance';
import { layoutFor } from '../fixedTerrain';
import type { FixedTerrainCell, HazardFamily, SimSnapshot, SimState } from '../types';

const at = (s: SimState, x: number, y: number): FixedTerrainCell | undefined =>
  s.families.fixedTerrain.cells.find(c => c.x === x && c.y === y);

// MEC-019-R3 the start level's layout is solid before the first step (also for a checkpoint start).
export function applyStartTerrain(s: SimState, b: Balance): void {
  if (!b.terrainSet) return;
  const l = layoutFor(b.terrainSet, b, s.level, s.terrainSeed);
  s.families.fixedTerrain = { templateId: l.templateId, variant: l.variant,
    cells: l.tiles.map(c => ({ ...c, state: 'solid' as const, leftMs: 0 })) };
}

// MEC-019-R9 presentation view; the name comes from the template in the balance.
export function fixedTerrainSnapshot(s: SimState, b: Balance): SimSnapshot['fixedTerrain'] {
  const st = s.families.fixedTerrain;
  return { name: b.terrainSet?.templates.find(t => t.id === st.templateId)?.name ?? null, cells: st.cells.map(c => ({ ...c })) };
}

// MEC-019-R5/R8 solid cells kill (cause terrain); every non-crumbling cell is a BFS wall; every cell is reserved.
export const fixedTerrain: HazardFamily = {
  key: 'fixedTerrain', cause: 'terrain', capClass: 'none', maxActiveKey: null, breakable: true,
  spawn: () => null,
  update() { /* Task 3 adds the warn and crumble timers */ },
  onBreak() { /* a Shield pass leaves the fixed cell in place; required of every breakable family (MEC-006-R24) */ },
  snapshot: s => structuredClone(s.families.fixedTerrain),
  solidAt: (s, x, y) => at(s, x, y)?.state === 'solid',
  bfsWallAt: (s, x, y) => { const c = at(s, x, y); return !!c && c.state !== 'crumble'; },
  reservedAt: (s, x, y) => !!at(s, x, y),
  count: s => s.families.fixedTerrain.cells.length,
};
