// D4-P1-R6 / D4-P3-R3 / D4-P4-R4 typed bridge interfaces between DOM screens/overlays and Phaser/Session. Pure types: no Phaser.
import type { Balance } from '../../core';
import type { Session } from '../../session';
import type { SkinId } from '../art/skins';
import type { Synth } from '../audio/synth';
import type { PauseView } from '../hud/overlayModel';
import type { MotionClock } from './clock';
import type { DeathHero } from './overlays/deathCardOverlay';
import type { StageRect } from './stageSync';

export type ScreenId = 'home' | 'characters' | 'loadout' | 'results' | 'settings';

/** ANIM-SNAKE-R10 meta-screen snake rig animation clips driven from DOM events. */
export type MetaHeroAnim = 'idle' | 'poke' | 'celebrate' | 'denied';

export interface MetaHeroSlot {
  readonly skin: SkinId;
  readonly readRect: () => StageRect;
  readonly initialAnim?: MetaHeroAnim;
  readonly loop?: boolean;
}

/** ANIM-SNAKE-R10 Phaser-free port for syncing a DOM hero slot to the MetaBgScene Rigby2D snake rig. */
export interface MetaHeroPort {
  setSlot(slot: MetaHeroSlot | null): boolean;
  play(anim: MetaHeroAnim, opts?: { loop?: boolean }): void;
  isLive(): boolean;
}

export interface LoopHooks {
  sleep(): void;
  wake(): void;
  inputEnabled(on: boolean): void;
  keyboardCapture(on: boolean): void;
  canvasVisible(on: boolean): void;
  /** META-BG-R1..R5: enable/disable the live Phaser meta background; returns true when live & ready. */
  setMetaBg?(active: boolean): boolean;
  /** ANIM-SNAKE-R10/R12: true when the Rigby2D snake hero is loaded and eligible on the Phaser renderer. */
  isSnakeRigReady?(): boolean;
}

export interface PhaserPort {
  ensureSkins(skins: readonly SkinId[], done: () => void): void;
  startScene(key: 'Game' | 'Settings' | 'Home' | 'Characters' | 'Results' | 'Loadout', data?: Record<string, unknown>): void;
  emit?(event: string): void;
  metaHero?: MetaHeroPort;
}

export interface PauseHandlers {
  onResume(): void;
  onSettings(): void;
  onQuit(): void;
}

export interface OverlayPort {
  isModalOpen(): boolean;
  showPause(v: PauseView, h: PauseHandlers): void;
  hidePause(): void;
  countdown(n: number | 'go' | null, card: { title: string; subtitle: string } | null): void;
  deathCard(line: { text: string }, lockMs: number, onContinue: () => void, hero?: DeathHero): void;
  hideAll(): void;
}

export interface ScreenCtx {
  bridge: UiBridge;
  debug: boolean;
  clock?: MotionClock;
  params?: Record<string, unknown>;
}

export type ScreenRender = (el: HTMLElement, ctx: ScreenCtx) => void | (() => void);

export interface UiBridge {
  session: Session;
  balance?: Balance;
  synth: Synth;
  t: (key: string, vars?: Record<string, string | number>) => string;
  overlays: OverlayPort;
  metaHero?: MetaHeroPort;
  open(id: ScreenId, params?: Record<string, unknown>): symbol;
  close(token: symbol): boolean;
  startRun(level?: number, debugRun?: boolean, source?: 'home' | 'results'): void;
  playAgain(): void;
  goSettings(): void;
  goCharacters(): void;
  goLoadout(level?: number): void;
  goHome(): void;
  openSettingsOverlay(onClosed: () => void): void;
  syncReducedMotion(): void;
  pause(): void;
  resume(): void;
  quitToHome(): void;
}
