// D4-P2-R4 Tier 2 UI tactile & spring motion helpers: staggerEnter, countUp, shakeDenied. Pure: no Phaser.
import { systemClock, type MotionClock } from './clock';
import { MOTION } from './motionTokens';

export function isReducedMotion(el: Element): boolean {
  return el.closest('.reduced-motion') !== null;
}

// D4-P2-R4 staggered entrance
export function staggerEnter(
  container: HTMLElement,
  opts: { selector?: string; clock?: MotionClock } = {},
): () => void {
  const clock = opts.clock ?? systemClock;
  const items = opts.selector
    ? Array.from(container.querySelectorAll<HTMLElement>(opts.selector))
    : Array.from(container.children).filter((c): c is HTMLElement => c instanceof HTMLElement);

  if (isReducedMotion(container)) {
    for (const item of items) {
      item.style.setProperty('--d4-delay', '0ms');
      item.classList.add('d4-enter', 'is-in');
    }
    return () => {};
  }

  items.forEach((item, i) => {
    item.classList.remove('is-in');
    item.classList.add('d4-enter');
    item.style.setProperty('--d4-delay', `${i * MOTION.staggerMs}ms`);
  });

  let cancelled = false;
  const rafId = clock.raf(() => {
    if (cancelled) return;
    for (const item of items) item.classList.add('is-in');
  });

  return () => {
    if (cancelled) return;
    cancelled = true;
    clock.cancelRaf(rafId);
  };
}

// D4-P2-R4 odometer count-up (ease-out quart)
export function countUp(
  el: HTMLElement,
  from: number,
  to: number,
  ms: number,
  clock: MotionClock = systemClock,
  format: (n: number) => string = n => String(n),
): () => void {
  if (ms <= 0 || from === to || isReducedMotion(el)) {
    el.textContent = format(Math.round(to));
    return () => {};
  }
  const start = clock.now();
  let cancelled = false;
  let rafId = 0;

  const step = (now: number): void => {
    if (cancelled) return;
    const p = Math.min(1, Math.max(0, (now - start) / ms));
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = format(Math.round(from + (to - from) * eased));
    if (p < 1) {
      rafId = clock.raf(step);
    }
  };

  el.textContent = format(Math.round(from));
  rafId = clock.raf(step);

  return () => {
    if (cancelled) return;
    cancelled = true;
    clock.cancelRaf(rafId);
  };
}

// D4-P2-R4 denied shake
export function shakeDenied(el: HTMLElement, clock: MotionClock = systemClock): void {
  if (isReducedMotion(el)) return;
  if (typeof el.animate === 'function') {
    el.animate(
      MOTION.shakePx.map(px => ({ transform: `translateX(${px}px)` })),
      { duration: MOTION.shakeMs, easing: 'ease-out' },
    );
    return;
  }
  const stepMs = Math.floor(MOTION.shakeMs / MOTION.shakePx.length);
  MOTION.shakePx.forEach((px, i) => {
    clock.setTimeout(() => {
      el.style.transform = i === MOTION.shakePx.length - 1 ? '' : `translateX(${px}px)`;
    }, i * stepMs);
  });
}
