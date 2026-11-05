// MEC-004-R5 shared pure cycle timing; callers subtract the origin and cell delay.
export interface CyclePhases { downMs: number; warnMs: number; upMs: number }
export interface CycleCell { x: number; y: number; delay: number; up: boolean; vis: 'down' | 'warn' | 'up' }

// MEC-004-R5 cells remain down before their cycle origin, then repeat down/warn/up.
export function cyclePhase(p: CyclePhases, t: number): CycleCell['vis'] {
  if (t < 0) return 'down';
  const m = t % (p.downMs + p.warnMs + p.upMs);
  return m < p.downMs ? 'down' : m < p.downMs + p.warnMs ? 'warn' : 'up';
}

// MEC-004-R5 a cell cannot rise under any snake cell; it warns until free.
export function stepCycleCell(c: CycleCell, p: CyclePhases, t: number, snakeOn: (x: number, y: number) => boolean): void {
  const target = cyclePhase(p, t);
  c.vis = target === 'up' && snakeOn(c.x, c.y) ? 'warn' : target;
  c.up = c.vis === 'up';
}
