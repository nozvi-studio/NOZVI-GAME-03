// MOT-1 Phaser-free widget feedback state machine. Spec: 2026-11-10-motion-1-widget-feedback-design.md sections 2-3.
// Talks only to the injected MOT-0 Motion instances (never scene.tweens). `half` is the half-delta adapter used by kind 'card'.
import type { MotionBalance } from '../../core/balance';
import type { Motion, MotionTarget } from '../motion/motionCore';
import { hasHover, type FeedbackKind } from './feedbackModel';

export interface FeedbackDeps { motion: Motion; half: Motion; cfg: MotionBalance; reduced: () => boolean; delay: (ms: number, fn: () => void) => void }
export interface FeedbackOpts { navigates?: boolean; dipPx?: number }
export interface Feedback {
  press(): void; release(): void; over(): void; out(): void;
  /** Run the widget action: immediately, or after tapUpMs (one-shot) when the widget navigates (MOT-1-R4). */
  fire(action: () => void): void;
  /** One overshoot to rest (selection change, MOT-1-R10). */
  pop(): void;
  /** Refused action: shake, or a flat alpha dip under reduced motion (MOT-1-R11). */
  reject(): void;
  setDisabled(on: boolean): void;
  /** The source object was destroyed: no further motion (see plan decision 3). */
  destroy(): void;
}

export function createFeedback(d: FeedbackDeps, visuals: readonly MotionTarget[], kind: FeedbackKind, opts: FeedbackOpts = {}): Feedback {
  const m = kind === 'card' ? d.half : d.motion;
  const baseY = visuals.map(v => v.y), baseA = visuals.map(v => v.alpha);
  let pressed = false, hovering = false, disabled = false, latched = false, dead = false;
  // MOT-1-R5 the face and label sink by dipPx (shelf static); skipped under reduced motion.
  const dip = (on: boolean): void => {
    const dy = opts.dipPx ?? 0;
    if (dy === 0 || d.reduced()) return;
    visuals.forEach((v, i) => v.setPosition(v.x, baseY[i]! + (on ? dy : 0)));
  };
  return {
    press() {
      if (dead || disabled) return;
      pressed = true; hovering = false;
      for (const v of visuals) m.pressDown(v); // first call also captures the rest transform, before the dip
      dip(true);
    },
    release() {
      if (!pressed) return;
      pressed = false; hovering = false;
      dip(false);
      for (const v of visuals) m.release(v);
    },
    over() {
      if (dead || disabled || pressed || !hasHover(kind)) return;
      hovering = true;
      for (const v of visuals) m.hover(v, true);
    },
    out() {
      if (!hovering) return;
      hovering = false;
      for (const v of visuals) m.hover(v, false);
    },
    fire(action) {
      if (!opts.navigates) { action(); return; }
      if (latched) return;
      latched = true;
      const ms = d.reduced() ? 0 : d.cfg.tapUpMs;
      if (ms === 0) action(); else d.delay(ms, action);
    },
    pop() {
      if (dead) return;
      for (const v of visuals) m.release(v);
    },
    reject() {
      if (dead) return;
      if (d.reduced()) { for (const v of visuals) m.pressDown(v); d.delay(d.cfg.tapDownMs, () => { for (const v of visuals) m.release(v); }); return; }
      for (const v of visuals) m.shake(v);
    },
    setDisabled(on) {
      disabled = on; pressed = false; hovering = false;
      visuals.forEach((v, i) => { v.setAlpha(on ? d.cfg.disabledAlpha : baseA[i]!); });
    },
    destroy() { dead = true; },
  };
}

export interface SlideHost {
  events: { on(ev: string, fn: (time: number, delta: number) => void): unknown; off(ev: string, fn: (time: number, delta: number) => void): unknown };
}
/**
 * MOT-1-R8 update-driven 0..1 progress for the switch slide (the MOT-0 adapter has no progress tween).
 * Calls frame(0) at once, frame(t) per scene update, ends with exactly frame(1), then detaches. Returns a cancel function.
 */
export function runSlide(host: SlideHost, ms: number, frame: (t: number) => void): () => void {
  let elapsed = 0, done = false;
  const stop = (): void => { if (done) return; done = true; host.events.off('update', step); };
  const step = (_time: number, delta: number): void => {
    elapsed += delta;
    const t = Math.min(1, elapsed / ms);
    frame(t);
    if (t >= 1) stop();
  };
  host.events.on('update', step);
  frame(0);
  return stop;
}
