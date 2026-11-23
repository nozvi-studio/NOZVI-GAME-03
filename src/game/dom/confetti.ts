// D4-P2-R5 zero-dependency celebration particles behind a CelebrationFx seam. Pure: no Phaser.
import { isReducedMotion } from './animate';
import { systemClock, type MotionClock } from './clock';
import { MOTION } from './motionTokens';

export interface CelebrationFx {
  burst(container: HTMLElement, originX: number, originY: number, palette?: readonly string[]): () => void;
}

export const CONFETTI_PALETTE: readonly string[] = [
  'var(--d4-green-face)',
  'var(--d4-gold-face)',
  'var(--d4-sky-face)',
  'var(--d4-purple-face)',
  'var(--d4-red-face)',
];

const SHAPES = ['circle', 'bar', 'star'] as const;
type Shape = (typeof SHAPES)[number];

const SHAPE_SVG: Record<Shape, string> = {
  circle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="10" height="10"><circle cx="6" cy="6" r="5" fill="currentColor"/></svg>',
  bar: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 8" width="12" height="7"><rect x="1" y="1" width="12" height="6" rx="3" fill="currentColor"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="12" height="12"><path d="M7 0.5L8.9 5.1L13.5 7L8.9 8.9L7 13.5L5.1 8.9L0.5 7L5.1 5.1Z" fill="currentColor"/></svg>',
};

// D4-P2-R5 zero-dependency celebration particles.
export function createSvgConfettiFx(clock: MotionClock = systemClock): CelebrationFx {
  return {
    burst(container: HTMLElement, originX: number, originY: number, palette: readonly string[] = CONFETTI_PALETTE): () => void {
      if (isReducedMotion(container)) return () => {};
      const doc = container.ownerDocument;
      const layer = doc.createElement('div');
      layer.className = 'd4-confetti-layer';
      container.appendChild(layer);

      const span = MOTION.confettiMax - MOTION.confettiMin + 1;
      const count = MOTION.confettiMin + Math.min(span - 1, Math.floor(clock.random() * span));

      for (let i = 0; i < count; i++) {
        const shape = SHAPES[i % SHAPES.length]!;
        const p = doc.createElement('span');
        p.dataset.confetti = shape;
        p.style.position = 'absolute';
        p.style.left = `${originX}px`;
        p.style.top = `${originY}px`;
        p.style.color = palette[i % palette.length]!;
        p.innerHTML = SHAPE_SVG[shape];
        layer.appendChild(p);

        const angle = (Math.PI * 2 * i) / count + (clock.random() - 0.5) * 0.4;
        const dist = MOTION.confettiSpreadPx * (0.45 + clock.random() * 0.55);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 24;
        const rot = Math.round((clock.random() - 0.5) * 360);

        if (typeof p.animate === 'function') {
          p.animate(
            [
              { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
              { transform: `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(1) rotate(${rot}deg)`, opacity: 0 },
            ],
            { duration: MOTION.confettiMs, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' },
          );
        }
      }

      let cleaned = false;
      const cleanup = (): void => {
        if (cleaned) return;
        cleaned = true;
        clock.clearTimeout(timerId);
        layer.remove();
      };
      const timerId = clock.setTimeout(cleanup, MOTION.confettiMs);
      return cleanup;
    },
  };
}

let activeFx: CelebrationFx | null = null;
const defaultFx = createSvgConfettiFx();

export function setCelebrationFx(fx: CelebrationFx | null): void {
  activeFx = fx;
}

export function burstConfetti(
  container: HTMLElement,
  originX: number,
  originY: number,
  palette?: readonly string[],
): () => void {
  return (activeFx ?? defaultFx).burst(container, originX, originY, palette);
}
