// src/game/juice/JuicePlayer.ts - thin player: one mapJuice call per event, then plays the cue (P3a-R1..R9). No Phaser import.
import type { Balance } from '../../core';
import type { Synth } from '../audio/synth';
import { pickDeathLine } from './deathLine';
import { deathTimeline, mapJuice } from './juiceMap';
import type { BoardVisual, JuiceInput, ScreenVisual } from './types';

export interface BoardFxSink { playBoardFx(list: readonly BoardVisual[]): void }
export interface ScreenSink { play(v: ScreenVisual): void }
export interface DeathCardView { show(line: string): void; armSkip(onSkip: () => void): void; destroy(): void }
export interface JuiceDeps {
  balance: Balance; synth: Pick<Synth, 'play' | 'buzz'>;
  board: BoardFxSink; screen: ScreenSink;
  settings: () => { sound: boolean; haptics: boolean };
  reduced: () => boolean;
  seed: () => number;
  makeCard: () => DeathCardView;
  later: (ms: number, fn: () => void) => { remove(): void };
  onDone: () => void;
}

export class JuicePlayer {
  private timers: { remove(): void }[] = [];
  private dying = false;
  private done = false;
  private card: DeathCardView | null = null;
  constructor(private d: JuiceDeps) {}

  handle(ev: JuiceInput): void { this.handleBatch([ev]); }

  /**
   * P3a-R1..R9: play every cue of the batch in order, but buzz once with the LAST haptic: navigator.vibrate cancels
   * the running pattern, so a checkpoint buzz right after the level-up pattern would otherwise erase it.
   */
  handleBatch(list: readonly JuiceInput[]): void {
    if (this.done) return;
    const s = this.d.settings(), reduced = this.d.reduced();
    let haptic: number | number[] | null = null, dying: Parameters<typeof pickDeathLine>[0] | null = null;
    for (const ev of list) {
      const cue = mapJuice(ev, { balance: this.d.balance, sound: s.sound, haptics: s.haptics, reduced });
      for (const n of cue.sounds) this.d.synth.play(n);
      if (cue.haptic !== null) haptic = cue.haptic;
      if (cue.board.length) this.d.board.playBoardFx(cue.board);
      for (const v of cue.screen) this.d.screen.play(v);
      if (cue.death && !this.dying && dying === null) dying = cue.death.cause;
    }
    if (haptic !== null) this.d.synth.buzz(haptic);
    if (dying !== null) this.startDeath(dying);
  }

  /** P3a-R7: the HUD's run-over hook. Deaths are already scheduled by handle(); a win just waits the same total. */
  runOver(_won: boolean): void {
    if (this.dying || this.done) return;
    this.timers.push(this.d.later(deathTimeline(this.d.balance, this.d.reduced()).totalMs, () => this.finish()));
  }

  private startDeath(cause: Parameters<typeof pickDeathLine>[0]): void {
    this.dying = true;
    const tl = deathTimeline(this.d.balance, this.d.reduced());
    const line = pickDeathLine(cause, this.d.seed());
    this.timers.push(this.d.later(tl.cardInMs, () => {
      this.card = this.d.makeCard(); this.card.show(line);
      this.timers.push(this.d.later(tl.cardInMs + tl.skipLockMs, () => this.card?.armSkip(() => this.finish())));
    }));
    this.timers.push(this.d.later(tl.totalMs, () => this.finish()));
  }
  private finish(): void {
    if (this.done) return;
    this.destroy(); this.d.onDone();
  }
  destroy(): void {
    this.done = true;
    for (const t of this.timers) t.remove();
    this.timers = []; this.card?.destroy(); this.card = null;
  }
}
