// src/game/flow/runFlow.ts — pure run state machine (design §7.1; prototype start/pause/resume L651–675, keys L721–729)
import type { Balance } from '../../core';

export type FlowStatus = 'ready' | 'countdown' | 'waiting' | 'playing' | 'paused' | 'over';
// started: the run has moved at least once (a resume countdown returns to playing, a fresh start to waiting).
export interface FlowState { status: FlowStatus; countLeftMs: number; lastCount: number; started: boolean }
export type FlowEffect =
  | { type: 'newRun' } | { type: 'tick'; n: number } | { type: 'go' } | { type: 'begin' } | { type: 'showPaused' } | { type: 'hideOverlay' };

export const createFlow = (): FlowState => ({ status: 'ready', countLeftMs: 0, lastCount: 0, started: false });
const countdown = (f: FlowState, b: Balance): void => { f.status = 'countdown'; f.countLeftMs = b.flow.countdownMs; f.lastCount = 0; };

// GDD-13 start and resume countdowns without advancing the simulation.
export function flowStart(f: FlowState, b: Balance): FlowEffect[] {
  const fresh = f.status === 'ready' || f.status === 'over';
  const fx: FlowEffect[] = fresh ? [{ type: 'newRun' }] : [];
  if (fresh) f.started = false;
  countdown(f, b);
  fx.push({ type: 'hideOverlay' });
  return fx;
}
export function flowPause(f: FlowState): FlowEffect[] {
  if (f.status !== 'playing' && f.status !== 'countdown' && f.status !== 'waiting') return [];
  f.status = 'paused';
  return [{ type: 'showPaused' }];
}
export function flowResume(f: FlowState, b: Balance): FlowEffect[] {
  if (f.status !== 'paused') return [];
  countdown(f, b);
  return [{ type: 'hideOverlay' }];
}
export const flowTogglePause = (f: FlowState, b: Balance): FlowEffect[] => (f.status === 'paused' ? flowResume(f, b) : flowPause(f));
export function flowKey(f: FlowState, b: Balance, code: 'Space' | 'KeyP' | 'Escape'): FlowEffect[] {
  if (f.status === 'playing' || f.status === 'countdown' || f.status === 'waiting') return flowPause(f);
  if (f.status === 'paused') return flowResume(f, b);
  return code === 'Space' ? flowStart(f, b) : [];
}
export function flowTurn(f: FlowState, b: Balance, dx = 0, dy = 0): { forward: boolean; effects: FlowEffect[] } {
  // P1: run start comes from Home/Loadout/Results (explicit flowStart), never from a turn.
  if (f.status === 'waiting') {
    // MEC-001-R2 the first non-reverse direction input starts movement; the reverse of the start direction is ignored.
    const [sx, sy] = b.snake.startDir;
    if (dx === -sx && dy === -sy) return { forward: false, effects: [] };
    f.status = 'playing'; f.started = true;
    return { forward: true, effects: [{ type: 'begin' }] };
  }
  if (f.status === 'countdown' && !f.started) {
    // MEC-001-R2 a non-reverse turn during the start countdown counts as the first input (reverse is not forwarded).
    const [sx, sy] = b.snake.startDir;
    if (dx === -sx && dy === -sy) return { forward: false, effects: [] };
    f.started = true;
    return { forward: true, effects: [] };
  }
  return { forward: f.status === 'playing' || f.status === 'countdown', effects: [] };
}
export function flowTick(f: FlowState, b: Balance, dtMs: number): FlowEffect[] {
  if (f.status !== 'countdown') return [];
  f.countLeftMs -= dtMs;
  const fx: FlowEffect[] = [];
  const n = Math.ceil(f.countLeftMs / (b.flow.countdownMs / b.flow.countdownDigits));
  if (n !== f.lastCount && n > 0) { f.lastCount = n; fx.push({ type: 'tick', n }); }
  if (f.countLeftMs <= 0) { // MEC-001-R2
    f.status = f.started ? 'playing' : 'waiting'; fx.push({ type: 'go' });
    if (f.started) fx.push({ type: 'begin' }); // hides the wait hint when input already came during the countdown
  }
  return fx;
}
export const flowOver = (f: FlowState): void => { f.status = 'over'; };
