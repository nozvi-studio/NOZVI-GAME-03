import { reservedByFamilies } from './hazards/queries';
import type { SimState } from './types';

// MEC-002-R2 the single P1 reserved list, including rain mangoes (MEC-002-R11).
export function isReserved(s: SimState, x: number, y: number): boolean {
  if (s.snake.some(c => c.x === x && c.y === y)) return true;
  if (s.mango && s.mango.x === x && s.mango.y === y) return true;
  if (s.orbs.some(c => c.x === x && c.y === y)) return true;
  if (s.rainMangoes.some(c => c.x === x && c.y === y)) return true;
  return reservedByFamilies(s, x, y);
}
