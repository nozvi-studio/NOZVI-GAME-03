// D4-P2-R3..R5 injectable clock interface so happy-dom tests run deterministically without real timers/rAF. Pure: no Phaser.
export interface MotionClock {
  now(): number;
  raf(cb: (t: number) => void): number;
  cancelRaf(id: number): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
  random(): number;
}

export const systemClock: MotionClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  raf: cb => window.requestAnimationFrame(cb),
  cancelRaf: id => { window.cancelAnimationFrame(id); },
  setTimeout: (cb, ms) => window.setTimeout(cb, ms),
  clearTimeout: id => { window.clearTimeout(id); },
  random: () => Math.random(),
};
