// MOT-2-R9/R10 Results sequence runner (Phaser-free). Plays a resultsTimeline over existing objects; skip() jumps to the rest state.
import type { Motion, MotionTarget, TextTarget } from '../motion/motionCore';
import type { SeqItem } from './entranceOrder';

export interface SeqDeps {
  motion: Pick<Motion, 'popIn' | 'slideIn' | 'fadeIn' | 'pulse' | 'countUp'>;
  later(ms: number, fn: () => void): { remove(): void };
  kill(t: object): void; // in-flight tween stop for skip (the one allowed direct tween call, ruling 7)
  pulsePeriodMs: number; reduced: boolean; off: boolean;
}
export type SeqTargets = Record<string, MotionTarget | undefined>;
interface Rest { x: number; y: number; sx: number; sy: number; a: number }

export function runResultsSequence(d: SeqDeps, timeline: SeqItem[], targets: SeqTargets, score: { text: TextTarget; value: number }): { skip(): void; done(): boolean } {
  const final = String(score.value);
  const rests = new Map<string, Rest>(), timers: { remove(): void }[] = [], stops: (() => void)[] = [];
  let finished = false;
  const restore = (): void => {
    for (const [id, r] of rests) { const t = targets[id]!; d.kill(t); t.setScale(r.sx, r.sy); t.setPosition(r.x, r.y); t.setAlpha(r.a); }
  };
  if (d.off) { score.text.setText(final); return { skip: () => {}, done: () => true }; } // R13 rest state, nothing animated
  for (const [id, t] of Object.entries(targets)) if (t) rests.set(id, { x: t.x, y: t.y, sx: t.scaleX, sy: t.scaleY, a: t.alpha });
  if (d.reduced) { // MOT-0-R6 one fade, no stagger, final score at once
    score.text.setText(final);
    for (const t of Object.values(targets)) if (t) { t.setAlpha(0); d.motion.fadeIn(t); }
    return { skip: () => { restore(); }, done: () => true };
  }
  for (const t of Object.values(targets)) t?.setAlpha(0);
  score.text.setText('0');
  const play = (it: SeqItem): void => {
    const t = targets[it.item]; if (!t) return;
    // Show the rest alpha first: Motion captures a target's rest state lazily on first use, and popIn/slideIn
    // hide it again synchronously (no flash). Without this the rest alpha is 0 and the target never appears.
    if (it.kind === 'pop') { t.setAlpha(rests.get(it.item)!.a); d.motion.popIn(t, 0); }
    else if (it.kind === 'slide') { t.setAlpha(rests.get(it.item)!.a); d.motion.slideIn(t, 'down', 0); } // slides up from below
    else if (it.kind === 'fade') d.motion.fadeIn(t);
    else if (it.kind === 'count') { t.setAlpha(rests.get(it.item)!.a); d.motion.countUp(score.text, 0, score.value); }
    else { // pulse: two periods, then stop (best star on a new best)
      t.setAlpha(rests.get(it.item)!.a); // pulse never touches alpha: show the (hidden-first) star now
      const stop = d.motion.pulse(t); stops.push(stop);
      timers.push(d.later(2 * d.pulsePeriodMs, stop));
    }
  };
  const played = timeline.filter(it => targets[it.item]);
  const last = played[played.length - 1];
  for (const it of played) timers.push(d.later(it.atMs, () => { play(it); if (it === last) finished = true; }));
  return {
    skip() {
      if (finished) return; finished = true;
      timers.forEach(t => t.remove()); stops.forEach(s => s());
      restore(); score.text.setText(final); // R10 the score is the exact final integer
    },
    done: () => finished,
  };
}
