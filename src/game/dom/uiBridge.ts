// D4-P1-R6 / D4-P3-R3 typed bridge interfaces between DOM screens/overlays and Phaser/Session. Pure types: no Phaser.
import type { Session } from '../../session';
import type { SkinId } from '../art/skins';
import type { Synth } from '../audio/synth';
import type { MotionClock } from './clock';

export type ScreenId = 'home' | 'characters' | 'loadout' | 'results' | 'settings';

export interface LoopHooks {
  sleep(): void;
  wake(): void;
  inputEnabled(on: boolean): void;
  keyboardCapture(on: boolean): void;
  canvasVisible(on: boolean): void;
}

export interface PhaserPort {
  ensureSkins(skins: readonly SkinId[], done: () => void): void;
  startScene(key: 'Game' | 'Settings' | 'Home' | 'Characters', data?: Record<string, unknown>): void;
}

export interface ScreenCtx {
  bridge: UiBridge;
  debug: boolean;
  clock?: MotionClock;
}

export type ScreenRender = (el: HTMLElement, ctx: ScreenCtx) => void | (() => void);

export interface UiBridge {
  session: Session;
  synth: Synth;
  t: (key: string, vars?: Record<string, string | number>) => string;
  open(id: ScreenId): symbol;
  close(token: symbol): boolean;
  startRun(level?: number, debugRun?: boolean): void;
  goSettings(): void;
  goCharacters(): void;
  goHome(): void;
  pause(): void;
  resume(): void;
  quitToHome(): void;
}
