import type { Cell, Dir, Step } from '../../types';

export interface MoverState {
  path: Cell[];
  pos: number; // -1 until the first cell is entered.
  dirSign: 1 | -1;
  t: number;
  warnMs: number;
  cellMs: number;
  pingPong: boolean;
  lifeMs: number; // Remaining lifetime; zero at construction means one traversal.
  lifeT: number; // Lifetime interval clock, independent of blocked movement retries.
  state: 'warn' | 'move' | 'done';
}

export type MoverStep = 'keep' | 'done';
export interface MoverEnv {
  blocked(x: number, y: number): boolean;
  bodyOn(x: number, y: number): boolean;
  headAt(x: number, y: number): boolean;
}

// MEC-004-R5 own the telegraphed path; zero lifetime traverses it once.
export function newMover(path: readonly Cell[], warnMs: number, cellMs: number, pingPong: boolean, lifeMs: number): MoverState {
  return { path: path.map(cell => ({ ...cell })), pos: -1, dirSign: 1, t: 0,
    warnMs, cellMs, pingPong: pingPong && lifeMs > 0, lifeMs, lifeT: 0, state: 'warn' };
}

// MEC-004-R5 only a live mover occupies a cell.
export const moverCell = (m: MoverState): Cell | null => m.pos < 0 || m.state === 'done' ? null : m.path[m.pos]!;

// MEC-004-R5 next travel direction, retaining the last direction at an end.
export function moverDir(m: MoverState): Dir {
  const i = Math.max(0, m.pos), next = i + m.dirSign;
  const ahead = next >= 0 && next < m.path.length;
  const a = m.path[i], b = m.path[ahead ? next : i - m.dirSign];
  if (!a || !b) return { x: 0, y: 0 };
  const from = ahead ? a : b, to = ahead ? b : a;
  return { x: Math.sign(to.x - from.x) as Step, y: Math.sign(to.y - from.y) as Step };
}

// MEC-004-R5/R8 one sim ms; the family dispatches enter-head through HitCtx.hitHead.
export function stepMover(m: MoverState, env: MoverEnv, onBlocked: 'wait' | 'stop'): MoverStep | 'enter-head' {
  if (m.state === 'done') return 'done';
  // MEC-015-R6 charge once per interval after first entry, including body/solid waits.
  if (m.pingPong && m.pos >= 0 && m.lifeMs > 0) {
    m.lifeT += 1;
    if (m.lifeT >= m.cellMs) {
      m.lifeMs = Math.max(0, m.lifeMs - m.cellMs);
      m.lifeT = 0;
    }
  }
  m.t += 1;
  if (m.state === 'warn') {
    if (m.t < m.warnMs) return 'keep';
    m.state = 'move';
    m.t = m.cellMs;
  }
  if (m.t < m.cellMs) return 'keep';
  if (m.pingPong && m.lifeMs === 0 && m.pos >= 0 && (m.pos === 0 || m.pos === m.path.length - 1)) {
    m.state = 'done';
    return 'done';
  }
  let next = m.pos + m.dirSign;
  if (next < 0 || next >= m.path.length) {
    if (!m.pingPong || m.path.length < 2) {
      m.state = 'done';
      return 'done';
    }
    m.dirSign = m.dirSign === 1 ? -1 : 1;
    next = m.pos + m.dirSign;
  }
  const cell = m.path[next]!;
  if (env.blocked(cell.x, cell.y) || env.bodyOn(cell.x, cell.y)) {
    if (onBlocked === 'stop') {
      m.state = 'done';
      return 'done';
    }
    m.t = m.cellMs;
    return 'keep';
  }
  m.pos = next;
  m.t = 0;
  return env.headAt(cell.x, cell.y) ? 'enter-head' : 'keep';
}
