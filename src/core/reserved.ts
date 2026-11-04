import { FAMILIES, instancesOf } from './hazards/registry';
import type { SimState } from './types';

// MEC-002-R2 the single P1 reserved list (orbs: Task 5, rain mangoes: Task 7).
export function isReserved(s: SimState, x: number, y: number): boolean {
  if (s.snake.some(c => c.x === x && c.y === y)) return true;
  if (s.mango && s.mango.x === x && s.mango.y === y) return true;
  return FAMILIES.some(f => instancesOf(s, f.key).some(i => f.reservedAt(i, x, y)));
}
