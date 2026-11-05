import { inBounds } from '../grid';
import { isReserved } from '../reserved';
import { effectiveTick } from '../skills';
import type { CauseKey, Cell, Dir, FamilyKey, HazardFamily, HitKind, SimState, StepCtx, TileKind } from '../types';
import { headHitAt, solidFamilyWithPriority, tileAt } from './queries';
import { FAMILIES } from './registry';

export type HeadCellResult =
  | { kind: 'clear' }
  | { kind: 'death'; cause: CauseKey }
  | { kind: 'broke'; family: FamilyKey }
  | { kind: 'absorbed'; family: FamilyKey };

// MEC-004-R6 snake-move solid and head-hit stage.
export function resolveHeadCell(s: SimState, x: number, y: number, ctx: StepCtx): HeadCellResult {
  const solid = solidFamilyWithPriority(s, x, y);
  const hit = solid ? { family: solid, kind: 'mover' as const } : headHitAt(s, x, y);
  if (!hit || hit.family.cause === null) return { kind: 'clear' };
  // MEC-013-R5 head entry emits the same mover contact event as update-time coconut entry.
  if (hit.kind === 'mover' && hit.family.key === 'coconut') ctx.emit({ type: 'moverHit', family: 'coconut', x, y });
  if (s.shield && (hit.kind === 'area' || hit.family.breakable)) {
    consumeShield(s, ctx, hit.family, x, y, hit.kind, s.dir);
    return { kind: hit.kind === 'area' ? 'absorbed' : 'broke', family: hit.family.key };
  }
  return { kind: 'death', cause: hit.family.causeAt?.(s, x, y) ?? hit.family.cause };
}

// MEC-004-R8 update-time hit dispatch.
export function applyHeadHit(s: SimState, ctx: StepCtx, key: FamilyKey, x: number, y: number, kind: HitKind, dir: Dir): void {
  if (s.status !== 'playing') return;
  const family = FAMILIES.find(f => f.key === key);
  if (!family || family.cause === null) return;
  if (s.shield && (kind === 'area' || family.breakable)) {
    consumeShield(s, ctx, family, x, y, kind, dir);
    return;
  }
  const context = deathContext(s, s.snake[0]!);
  const cause = family.causeAt?.(s, x, y) ?? family.cause;
  s.status = 'over';
  s.outcome = { won: false, cause };
  ctx.emit({ type: 'died', cause, x, y, ...(context ? { context } : {}) });
}

// MEC-004-R15 tile at the head when a fatal step or hit begins.
export function deathContext(s: SimState, headBefore: Cell): TileKind | undefined {
  return tileAt(s, headBefore.x, headBefore.y) ?? undefined;
}

// MEC-006-R26..R28 mover/solid breaks bonk and leave rubble; area absorption does neither.
function consumeShield(s: SimState, ctx: StepCtx, family: HazardFamily, x: number, y: number, kind: HitKind, dir: Dir): void {
  const b = ctx.balance;
  if (kind === 'mover') family.onBreak?.(s, x, y);
  s.shield = null;
  ctx.emit({ type: 'skillEnded', skill: 'shield', reason: 'consumed' });
  let rubble: Cell | null = null;
  if (kind === 'mover') {
    const rx = x + dir.x, ry = y + dir.y;
    if (inBounds(b.board.cols, b.board.rows, rx, ry) && !isReserved(s, rx, ry)) {
      rubble = { x: rx, y: ry };
      s.families.rubble.push({ family: 'rubble', ...rubble, state: 'solid', leftMs: b.skills.shield.rubbleLifeMs });
    }
    // MEC-012-EC7 lead ruling: bonk duration intentionally includes the current head tile.
    s.acc = -b.skills.shield.bonkPauseTicks * effectiveTick(s, b);
  }
  ctx.emit({ type: 'shieldBroke', x, y, family: family.key, rubble });
}
