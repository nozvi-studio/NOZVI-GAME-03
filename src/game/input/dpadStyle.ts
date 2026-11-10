import { TOKENS } from '../uiTokens';

export type DpadState = 'heading' | 'idle' | 'blocked';
export interface DpadStyle { border: { widthMock: number; color: string }; alpha: number; glow: boolean }

// Mockup px / alpha moved out of dpad.ts (idle 0.85, blocked 0.35).
const BORDER = { widthMock: 2, color: TOKENS.surface.stone } as const;
const ALPHA: Record<DpadState, number> = { heading: 1, idle: 0.85, blocked: 0.35 };

/** UIFIX-R13 COL-05: one border for every D-pad button; only glow and alpha vary with state. */
export function dpadStyle(state: DpadState): DpadStyle {
  return { border: { ...BORDER }, alpha: ALPHA[state], glow: state === 'heading' };
}
