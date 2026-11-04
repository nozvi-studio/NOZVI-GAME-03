// Pure keyboard map for the Game scene (no Phaser import).
import type { Step } from '../../core';

export type FlowKeyCode = 'Space' | 'KeyP' | 'Escape';
export type KeyAction =
  | { type: 'turn'; dx: Step; dy: Step }
  | { type: 'sound' }
  | { type: 'flow'; code: FlowKeyCode };

const TURNS: Readonly<Record<string, readonly [Step, Step]>> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const FLOW: ReadonlySet<string> = new Set(['Space', 'KeyP', 'Escape']);

// MEC-001 / GDD-13 map KeyboardEvent.code to a turn, sound toggle or flow key (null = not ours).
export function keyAction(code: string): KeyAction | null {
  const turn = TURNS[code];
  if (turn) return { type: 'turn', dx: turn[0], dy: turn[1] };
  if (code === 'KeyM') return { type: 'sound' };
  if (FLOW.has(code)) return { type: 'flow', code: code as FlowKeyCode };
  return null;
}
