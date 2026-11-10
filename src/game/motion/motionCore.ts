// MOT-0 Phaser-free tween adapter: kill-by-target (R4), tween budget (R7), reduced motion (R6).
// Spec: docs/superpowers/specs/2026-11-10-motion-0-foundation-design.md sections 5-6.
import type { MotionBalance } from '../../core/balance';
import { countUpValue, staggerDelay } from './curves';

export interface MotionTarget { x: number; y: number; alpha: number; scaleX: number; scaleY: number;
  setScale(x: number, y?: number): unknown; setAlpha(a: number): unknown; setPosition(x: number, y?: number): unknown }
export interface TextTarget { setText(s: string): unknown }
export interface EaseTarget { v: number }
export interface TweenHandle { stop(): unknown }
export interface TweenHost { add(cfg: Record<string, unknown>): TweenHandle; killTweensOf(t: object): unknown }
export interface MotionDeps { tweens: TweenHost; cfg: MotionBalance; softMs: number; reduced: () => boolean; finePointer: boolean;
  ui: (mockPx: number) => number; shake: { ampPx: number; ms: number } }
export interface Motion {
  snap(t: MotionTarget, peak: number, ms: number, onDone?: () => void): void;
  ease(t: EaseTarget, to: number, ms: number, onUpdate: (v: number) => void): void;
  pressDown(t: MotionTarget): void; release(t: MotionTarget): void; hover(t: MotionTarget, on: boolean): void;
  popIn(t: MotionTarget, index?: number): void; slideIn(t: MotionTarget, from: 'left' | 'right' | 'up' | 'down', index?: number): void;
  fadeIn(t: MotionTarget): void; fadeOut(t: MotionTarget): void; shake(t: MotionTarget): void;
  pulse(t: MotionTarget): () => void; countUp(t: TextTarget, from: number, to: number, fmt?: (n: number) => string): void;
  liveCount(): number; dispose(): void;
}

interface Rest { sx: number; sy: number; x: number; y: number; a: number }

export function createMotion(d: MotionDeps): Motion {
  const { cfg } = d;
  const live = new Set<object>();
  const rests = new WeakMap<object, Rest>();
  const rest = (t: MotionTarget): Rest => {
    let r = rests.get(t);
    if (!r) { r = { sx: t.scaleX, sy: t.scaleY, x: t.x, y: t.y, a: t.alpha }; rests.set(t, r); }
    return r;
  };
  const snapRest = (t: MotionTarget): void => { const r = rest(t); t.setScale(r.sx, r.sy); t.setPosition(r.x, r.y); t.setAlpha(r.a); };
  /** R4 + R7: kill the target's previous motion, then tween, or snap to the end state when the budget is full. */
  const play = (t: object, tween: Record<string, unknown>, finalState: () => void): TweenHandle | null => {
    d.tweens.killTweensOf(t);
    live.delete(t);
    if (live.size >= cfg.maxTweens) { finalState(); return null; }
    live.add(t);
    const userComplete = tween.onComplete as (() => void) | undefined;
    return d.tweens.add({ targets: t, ...tween, onComplete: () => { live.delete(t); userComplete?.(); finalState(); } });
  };
  const scaleTo = (t: MotionTarget, k: number, duration: number, ease: string): void => {
    const r = rest(t);
    play(t, { scaleX: r.sx * k, scaleY: r.sy * k, duration, ease }, () => t.setScale(r.sx * k, r.sy * k));
  };
  const fadeEntrance = (t: MotionTarget, delay: number): void => {
    const r = rest(t);
    t.setAlpha(0);
    play(t, { alpha: r.a, duration: d.softMs, delay }, () => snapRest(t));
  };
  const fade = (t: MotionTarget, to: number): void => {
    play(t, { alpha: to, duration: d.reduced() ? d.softMs : cfg.fadeMs }, () => t.setAlpha(to));
  };

  return {
    pressDown(t) {
      if (d.reduced()) { t.setAlpha(rest(t).a * cfg.reducedPressAlpha); return; }
      scaleTo(t, cfg.pressScale, cfg.tapDownMs, 'Quad.easeOut');
    },
    release(t) {
      const r = rest(t);
      if (d.reduced()) { t.setAlpha(r.a); return; }
      const upMs = Math.round(cfg.tapUpMs * 0.4);
      const phase2 = (): void => {
        play(t, { scaleX: r.sx, scaleY: r.sy, duration: cfg.tapUpMs - upMs, ease: 'Sine.easeInOut' }, () => snapRest(t));
      };
      play(t, { scaleX: r.sx * cfg.releaseOvershoot, scaleY: r.sy * cfg.releaseOvershoot, duration: upMs, ease: 'Quad.easeOut' }, phase2);
    },
    /** MOT-4-R5 one scale snap rest -> peak -> rest (half the time each); kill-by-target; no-op under reduced motion. */
    snap(t, peak, ms, onDone) {
      if (d.reduced()) { onDone?.(); return; }
      const r = rest(t), upMs = Math.round(ms / 2);
      const settle = (): void => {
        play(t, { scaleX: r.sx, scaleY: r.sy, duration: ms - upMs, ease: 'Sine.easeInOut' }, () => { snapRest(t); onDone?.(); });
      };
      play(t, { scaleX: r.sx * peak, scaleY: r.sy * peak, duration: upMs, ease: 'Quad.easeOut' }, settle);
    },
    /** MOT-4-R7/R9 tween a plain number (bars, score). The caller draws from onUpdate; the end value is always exact. */
    ease(t, to, ms, onUpdate) {
      if (d.reduced() || ms <= 0) { d.tweens.killTweensOf(t); live.delete(t); t.v = to; onUpdate(to); return; }
      play(t, { v: to, duration: ms, ease: 'Cubic.easeOut', onUpdate: () => onUpdate(t.v) }, () => { t.v = to; onUpdate(to); });
    },
    hover(t, on) {
      if (d.reduced() || !d.finePointer) return;
      scaleTo(t, on ? cfg.hoverScale : 1, cfg.tapDownMs, 'Quad.easeOut');
    },
    popIn(t, index = 0) {
      const r = rest(t);
      const delay = staggerDelay(index, cfg.staggerMs, cfg.staggerCapMs);
      if (d.reduced()) { fadeEntrance(t, delay); return; }
      t.setScale(r.sx * cfg.popFromScale, r.sy * cfg.popFromScale);
      t.setAlpha(0);
      play(t, { scaleX: r.sx, scaleY: r.sy, alpha: r.a, duration: cfg.popInMs, delay, ease: 'Back.easeOut', easeParams: [cfg.overshoot] },
        () => snapRest(t));
    },
    slideIn(t, from, index = 0) {
      const r = rest(t);
      const delay = staggerDelay(index, cfg.staggerMs, cfg.staggerCapMs);
      if (d.reduced()) { fadeEntrance(t, delay); return; }
      const off = d.ui(cfg.slidePx);
      t.setPosition(from === 'left' ? r.x - off : from === 'right' ? r.x + off : r.x, from === 'up' ? r.y - off : from === 'down' ? r.y + off : r.y);
      t.setAlpha(0);
      play(t, { x: r.x, y: r.y, alpha: r.a, duration: cfg.slideInMs, delay, ease: 'Cubic.easeOut' }, () => snapRest(t));
    },
    fadeIn(t) { fade(t, 1); },
    fadeOut(t) { fade(t, 0); },
    shake(t) {
      if (d.reduced()) return;
      const r = rest(t);
      play(t, { x: r.x + d.shake.ampPx, duration: d.shake.ms / 4, yoyo: true, repeat: 1 }, () => t.setPosition(r.x, r.y));
    },
    pulse(t) {
      if (d.reduced() || live.size >= cfg.maxTweens) return () => {};
      const r = rest(t);
      play(t, { scaleX: r.sx * (1 + cfg.pulseAmp), scaleY: r.sy * (1 + cfg.pulseAmp), duration: cfg.pulsePeriodMs / 2,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }, () => {});
      return () => { d.tweens.killTweensOf(t); live.delete(t); snapRest(t); };
    },
    countUp(t, from, to, fmt = String) {
      if (d.reduced()) { t.setText(fmt(to)); return; }
      const host = t as unknown as { motionP: number };
      host.motionP = 0;
      play(t, { motionP: 1, duration: cfg.countUpMs, ease: 'Linear', onUpdate: () => t.setText(fmt(countUpValue(from, to, host.motionP))) },
        () => t.setText(fmt(to)));
    },
    liveCount: () => live.size,
    dispose() { live.clear(); },
  };
}
