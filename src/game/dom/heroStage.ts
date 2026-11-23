// D4-P2-R3 live SVG hero stage: breathing, auto-blink, eye tracking, tap-to-poke and emotional reactions. Pure: no Phaser.
import { EXPRESSIONS, deadFace, headLayersSvg, type CapyExpression } from '../art/capyRig';
import { heroSvg } from '../art/heroSvg';
import type { SkinId } from '../art/skins';
import { systemClock, type MotionClock } from './clock';
import { MOTION } from './motionTokens';

export type HeroReaction = 'poke' | 'celebrate' | 'denied' | 'hurt';

export interface HeroStageOpts {
  skin: SkinId;
  expression?: CapyExpression;
  clock?: MotionClock;
  reduceMotion?: () => boolean;
  interactive?: boolean;
  label?: string;
}

export interface HeroStage {
  readonly el: HTMLElement;
  setSkin(skin: SkinId): void;
  setExpression(e: CapyExpression): void;
  lookAt(dx: number, dy: number): void;
  react(kind: HeroReaction): void;
  destroy(): void;
}

const fmt = (v: number): string => String(+v.toFixed(3));

// D4-P2-R3 live hero micro-animations on direct SVG DOM.
export function createHeroStage(container: HTMLElement, opts: HeroStageOpts): HeroStage {
  const clock = opts.clock ?? systemClock;
  const interactive = opts.interactive ?? true;
  let skin: SkinId = opts.skin;
  let resting: CapyExpression = opts.expression ?? 'idle';
  let currentFace: CapyExpression = resting;
  let activeReaction: HeroReaction | null = null;
  let destroyed = false;

  const isReduced = (): boolean => (opts.reduceMotion ? opts.reduceMotion() : container.closest('.reduced-motion') !== null);

  const el = container.ownerDocument.createElement('div');
  el.className = 'd4-hero';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', opts.label ?? skin);
  el.dataset.qa = `hero-${skin}`;
  container.appendChild(el);

  let blinkWaitId: number | null = null;
  let blinkEndId: number | null = null;
  let reactEndId: number | null = null;
  let pokeStepIds: number[] = [];
  let lookRafId: number | null = null;
  let curOx = 0, curOy = 0, targetOx = 0, targetOy = 0;

  const clearBlink = (): void => {
    if (blinkWaitId !== null) { clock.clearTimeout(blinkWaitId); blinkWaitId = null; }
    if (blinkEndId !== null) { clock.clearTimeout(blinkEndId); blinkEndId = null; }
  };

  const clearReactionTimers = (): void => {
    if (reactEndId !== null) { clock.clearTimeout(reactEndId); reactEndId = null; }
    for (const id of pokeStepIds) clock.clearTimeout(id);
    pokeStepIds = [];
    el.classList.remove('is-poke', 'is-hop', 'is-recoil');
    el.style.transform = '';
    delete el.dataset.reaction;
  };

  const clearLookRaf = (): void => {
    if (lookRafId !== null) { clock.cancelRaf(lookRafId); lookRafId = null; }
  };

  const applyPupils = (): void => {
    if (EXPRESSIONS[currentFace].eyes !== 'open') return;
    const tr = curOx === 0 && curOy === 0 ? '' : `translate(${fmt(curOx)} ${fmt(curOy)})`;
    for (const g of el.querySelectorAll<SVGGElement>('[data-part="pupil"]')) {
      if (tr) g.setAttribute('transform', tr);
      else g.removeAttribute('transform');
    }
  };

  const swapFace = (e: CapyExpression): void => {
    currentFace = e;
    const headInner = el.querySelector<SVGGElement>('[data-hero-head] > g');
    if (headInner) {
      headInner.innerHTML = headLayersSvg(skin, e);
      applyPupils();
    }
  };

  const scheduleBlink = (): void => {
    clearBlink();
    if (destroyed || isReduced() || activeReaction !== null) return;
    if (EXPRESSIONS[resting].eyes !== 'open') return;
    const delay = MOTION.blinkMinMs + clock.random() * (MOTION.blinkMaxMs - MOTION.blinkMinMs);
    blinkWaitId = clock.setTimeout(() => {
      blinkWaitId = null;
      if (destroyed || activeReaction !== null) return;
      swapFace('idle_blink');
      blinkEndId = clock.setTimeout(() => {
        blinkEndId = null;
        if (destroyed || activeReaction !== null) return;
        swapFace(resting);
        scheduleBlink();
      }, MOTION.blinkMs);
    }, delay);
  };

  const renderFull = (): void => {
    el.dataset.qa = `hero-${skin}`;
    el.setAttribute('aria-label', opts.label ?? skin);
    el.classList.toggle('is-live', !isReduced());
    el.innerHTML = heroSvg(skin, currentFace);
    applyPupils();
  };

  const stepLook = (): void => {
    lookRafId = null;
    if (destroyed) return;
    curOx += (targetOx - curOx) * MOTION.lookLerp;
    curOy += (targetOy - curOy) * MOTION.lookLerp;
    if (Math.hypot(targetOx - curOx, targetOy - curOy) < 0.02) {
      curOx = targetOx;
      curOy = targetOy;
      applyPupils();
      return;
    }
    applyPupils();
    lookRafId = clock.raf(stepLook);
  };

  const lookAt = (dx: number, dy: number): void => {
    if (destroyed) return;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) {
      targetOx = 0;
      targetOy = 0;
    } else {
      const mag = MOTION.lookMax * Math.min(1, dist / MOTION.lookFullAt);
      targetOx = (dx / dist) * mag;
      targetOy = (dy / dist) * mag;
    }
    clearLookRaf();
    if (isReduced()) {
      curOx = targetOx;
      curOy = targetOy;
      applyPupils();
      return;
    }
    lookRafId = clock.raf(stepLook);
  };

  const react = (kind: HeroReaction): void => {
    if (destroyed) return;
    clearBlink();
    clearReactionTimers();
    activeReaction = kind;
    el.dataset.reaction = kind;
    const reduced = isReduced();

    if (kind === 'hurt') {
      swapFace(deadFace(skin));
      return;
    }

    if (kind === 'poke') {
      swapFace(skin === 'snake' ? 'idle_tongue' : 'happy');
      if (!reduced) {
        el.classList.add('is-poke');
        if (typeof el.animate === 'function') {
          el.animate(
            MOTION.pokeSquash.map(([sx, sy]) => ({ transform: `scale(${sx}, ${sy})` })),
            { duration: MOTION.pokeMs, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
          );
        } else {
          const stepMs = Math.floor(MOTION.pokeMs / MOTION.pokeSquash.length);
          MOTION.pokeSquash.forEach(([sx, sy], i) => {
            pokeStepIds.push(clock.setTimeout(() => {
              el.style.transform = i === MOTION.pokeSquash.length - 1 ? '' : `scale(${sx}, ${sy})`;
            }, i * stepMs));
          });
        }
      }
      reactEndId = clock.setTimeout(() => {
        reactEndId = null;
        activeReaction = null;
        clearReactionTimers();
        swapFace(resting);
        scheduleBlink();
      }, MOTION.pokeMs);
      return;
    }

    if (kind === 'celebrate') {
      swapFace('win');
      if (!reduced) el.classList.add('is-hop');
      reactEndId = clock.setTimeout(() => {
        reactEndId = null;
        activeReaction = null;
        clearReactionTimers();
        swapFace(resting);
        scheduleBlink();
      }, MOTION.celebrateMs);
      return;
    }

    // denied
    swapFace('alert');
    if (!reduced) el.classList.add('is-recoil');
    reactEndId = clock.setTimeout(() => {
      reactEndId = null;
      activeReaction = null;
      clearReactionTimers();
      swapFace(resting);
      scheduleBlink();
    }, MOTION.deniedMs);
  };

  const onPointerDown = (e: PointerEvent): void => {
    if (!interactive || destroyed) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      lookAt(e.clientX - (rect.left + rect.width / 2), e.clientY - (rect.top + rect.height / 2));
    }
    react('poke');
  };

  if (interactive) el.addEventListener('pointerdown', onPointerDown);
  renderFull();
  scheduleBlink();

  return {
    el,
    setSkin(next: SkinId): void {
      if (destroyed) return;
      skin = next;
      renderFull();
    },
    setExpression(e: CapyExpression): void {
      if (destroyed) return;
      resting = e;
      activeReaction = null;
      clearReactionTimers();
      swapFace(e);
      scheduleBlink();
    },
    lookAt,
    react,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      clearBlink();
      clearReactionTimers();
      clearLookRaf();
      if (interactive) el.removeEventListener('pointerdown', onPointerDown);
      el.remove();
    },
  };
}
