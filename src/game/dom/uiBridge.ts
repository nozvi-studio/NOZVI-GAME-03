// D4-P1-R6 typed bridge interfaces between DOM screens/overlays and Phaser/Session. Pure types: no Phaser.
import type { Session } from '../../session';
import type { Synth } from '../audio/synth';

export type ScreenId = 'home' | 'characters' | 'loadout' | 'results' | 'settings';

export interface LoopHooks {
  sleep(): void;
  wake(): void;
  inputEnabled(on: boolean): void;
  keyboardCapture(on: boolean): void;
  canvasVisible(on: boolean): void;
}

export interface UiBridge {
  session: Session;
  synth: Synth;
  t: (key: string, vars?: Record<string, string | number>) => string;
  open(id: ScreenId): void;
  startRun(): void;
  pause(): void;
  resume(): void;
  quitToHome(): void;
}
