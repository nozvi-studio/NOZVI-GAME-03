// Shared balance fixture; patches always pass through real validation.
import json from '../../config/balance.json';
import { parseBalance, type Balance } from '../../src/core/balance';
import type { FamilyKey } from '../../src/core/types';
export const loadBalance = (patch?: (json: any) => void): Balance => {
  const copy = structuredClone(json);
  patch?.(copy);
  return parseBalance(copy);
};

// MEC-004-R17 / MEC-003-R15 isolate one family without changing its shipped weight.
export function soloTable(b: Balance, family: FamilyKey): Balance {
  const copy = structuredClone(b);
  copy.level.table = [{ from: 1, to: 30, weights: { [family]: family === 'rock' ? 3 : 2 },
    rockShapes: ['single', 'lineH', 'lineV', 'corner', 'block'], fenceShapes: ['line', 'L', 'T', 'Z', 'F', 'U', 'plus'], rottenRocks: false }];
  return parseBalance(copy);
}
