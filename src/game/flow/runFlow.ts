// src/game/flow/runFlow.ts — pure run state machine (design §7.1; prototype start/pause/resume L651–675, keys L721–729)
import type { Balance } from '../../core';

export type FlowStatus = 'ready' | 'countdown' | 'playing' | 'paused' | 'over';
export interface FlowState { status: FlowStatus; countLeftMs: number; lastCount: number }
export type FlowEffect =
  | { type: 'newRun' } | { type: 'tick'; n: number } | { type: 'go' } | { type: 'showPaused' } | { type: 'hideOverlay' };

export const createFlow = (): FlowState => ({ status: 'ready', countLeftMs: 0, lastCount: 0 });
const countdown = (f: FlowState, b: Balance): void => { f.status = 'countdown'; f.countLeftMs = b.flow.countdownMs; f.lastCount = 0; };

// GDD-13 start and resume countdowns without advancing the simulation.
export function flowStart(f: FlowState, b: Balance): FlowEffect[] {
  const fx: FlowEffect[] = f.status === 'ready' || f.status === 'over' ? [{ type: 'newRun' }] : [];
  countdown(f, b);
  fx.push({ type: 'hideOverlay' });
  return fx;
}
export function flowPause(f: FlowState): FlowEffect[] {
  if (f.status !== 'playing' && f.status !== 'countdown') return [];
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
  if (f.status === 'playing' || f.status === 'countdown') return flowPause(f);
  if (f.status === 'paused') return flowResume(f, b);
  return code === 'Space' ? flowStart(f, b) : [];
}
export function flowTurn(f: FlowState, b: Balance): { forward: boolean; effects: FlowEffect[] } {
  const effects = f.status === 'ready' || f.status === 'over' ? flowStart(f, b) : [];
  return { forward: f.status === 'playing' || f.status === 'countdown', effects };
}
export function flowTick(f: FlowState, b: Balance, dtMs: number): FlowEffect[] {
  if (f.status !== 'countdown') return [];
  f.countLeftMs -= dtMs;
  const fx: FlowEffect[] = [];
  const n = Math.ceil(f.countLeftMs / (b.flow.countdownMs / b.flow.countdownDigits));
  if (n !== f.lastCount && n > 0) { f.lastCount = n; fx.push({ type: 'tick', n }); }
  if (f.countLeftMs <= 0) { f.status = 'playing'; fx.push({ type: 'go' }); }
  return fx;
}
export const flowOver = (f: FlowState): void => { f.status = 'over'; };
