// src/core/invuln.ts - MEC-019-R7 invulnerability timer.
import { headHitAt, solidFamilyAt } from './hazards/queries';
import type { SimState, StepCtx } from './types';

// MEC-019-R7 counts down; when the time is over it lasts until the head is on a free cell.
export function invulnTick(s: SimState, ctx: StepCtx): void {
  const v = s.invuln;
  if (!v) return;
  if (v.leftMs > 0) v.leftMs -= 1;
  if (v.leftMs > 0) return;
  const h = s.snake[0]!;
  if (solidFamilyAt(s, h.x, h.y) || headHitAt(s, h.x, h.y) || s.snake.some((c, i) => i > 0 && c.x === h.x && c.y === h.y)) return;
  s.invuln = null;
  ctx.emit({ type: 'invulnEnded' });
}
