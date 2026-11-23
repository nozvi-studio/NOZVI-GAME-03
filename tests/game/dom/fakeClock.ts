// Deterministic MotionClock for happy-dom tests (avoids unreliable fake timers on rAF).
import type { MotionClock } from '../../../src/game/dom/clock';

interface TimerEntry { id: number; at: number; cb: () => void }

export class FakeClock implements MotionClock {
  t = 0;
  seq = 0;
  rnd: () => number = () => 0.5;
  private timers = new Map<number, TimerEntry>();
  private rafs = new Map<number, (t: number) => void>();

  now(): number { return this.t; }
  random(): number { return this.rnd(); }

  setTimeout(cb: () => void, ms: number): number {
    const id = ++this.seq;
    this.timers.set(id, { id, at: this.t + Math.max(0, ms), cb });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  raf(cb: (t: number) => void): number {
    const id = ++this.seq;
    this.rafs.set(id, cb);
    return id;
  }

  cancelRaf(id: number): void {
    this.rafs.delete(id);
  }

  frame(): void {
    const batch = Array.from(this.rafs.entries());
    this.rafs.clear();
    for (const [, cb] of batch) cb(this.t);
  }

  advance(ms: number): void {
    const target = this.t + Math.max(0, ms);
    const step = 16;
    while (this.t < target) {
      const nextFrame = Math.min(target, this.t + step);
      while (true) {
        let earliest: TimerEntry | null = null;
        for (const entry of this.timers.values()) {
          if (entry.at <= nextFrame && (!earliest || entry.at < earliest.at)) earliest = entry;
        }
        if (!earliest) break;
        this.timers.delete(earliest.id);
        this.t = earliest.at;
        earliest.cb();
      }
      this.t = nextFrame;
      if (this.rafs.size > 0) this.frame();
    }
  }

  pending(): number {
    return this.timers.size + this.rafs.size;
  }
}
