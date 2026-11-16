// Shared balance fixture; patches always pass through real validation.
import json from '../../config/balance.json';
import { parseBalance, type Balance } from '../../src/core/balance';
import type { FamilyKey } from '../../src/core/types';
import terrainJson from '../../config/terrain.json';
import { withTerrain } from '../../src/core/fixedTerrain';
export const loadBalance = (patch?: (json: any) => void): Balance => {
  const copy = structuredClone(json);
  patch?.(copy);
  return parseBalance(copy);
};
/** MEC-019 shipped balance plus the shipped terrain templates. */
export const loadGameBalance = (patch?: (json: any) => void): Balance => withTerrain(loadBalance(patch), structuredClone(terrainJson));

// MEC-004-R17 / MEC-003-R15 isolate one family without changing its shipped weight.
export function soloTable(b: Balance, family: FamilyKey): Balance {
  const copy = structuredClone(b);
  const row = (from: number, to: number, weights: Record<string, number>) => ({ from, to, weights,
    rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: false });
  // MEC-018-R11 parseBalance only allows shrink weights from L27, so its solo table starts there.
  copy.level.table = family === 'shrink' ? [row(1, 26, {}), row(27, 30, { shrink: 2 })]
    : [row(1, 30, { [family]: family === 'rock' ? 3 : 2 })];
  return parseBalance(copy);
}
