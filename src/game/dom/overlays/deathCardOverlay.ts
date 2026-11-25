// D4-P4-R4 DeathCard: humorous seeded death line, skip-locked tap-anywhere to Results. Pure: no Phaser.
import type { SkinId } from '../../art/skins';
import { t } from '../../text';
import { skinPortraitUrl } from '../heroStage';
import { systemClock, type MotionClock } from '../clock';
import { el } from '../screens/screenParts';
import { scrim, sheet } from './overlayParts';
import type { StageRect } from '../stageSync';

/** ANIM-SNAKE-R13 centered dead hero above the DeathCard: live Rigby2D rig (drawn by Phaser) or static skin portrait. */
export interface DeathHero {
  readonly skin: SkinId;
  readonly live: boolean;
  readonly onSlot?: (readRect: () => StageRect) => void;
}

// D4-P4-R4 DeathCard: humorous line, skip-locked tap-anywhere to Results.
export function renderDeathCard(
  root: HTMLElement,
  line: { text: string },
  lockMs: number,
  onContinue: () => void,
  clock: MotionClock = systemClock,
  hero?: DeathHero,
): () => void {
  const live = hero?.live === true;
  const backdrop = live ? el('div', 'd4-scrim is-live-hero') : scrim('is-frost');
  backdrop.classList.add('d4-death-scrim', 'is-locked');
  backdrop.dataset.qa = 'death-scrim';

  const card = sheet('death-sheet');
  const title = el('h2', 'd4-death-title', { 'data-qa': 'death-title' });
  title.textContent = t('death.title');
  // Owner 2026-11-25: Game Over shows only title + snake + tap hint; the humorous line is not rendered.
  void line;
  const hint = el('div', 'd4-death-hint', { 'data-qa': 'death-hint' });
  hint.textContent = t('death.tapContinue');
  card.append(title, hint);
  let slot: HTMLElement | null = null;
  if (hero) {
    // ANIM-SNAKE-R13 hero slot sits outside the opaque sheet so the Phaser rig shows through the transparent scrim.
    slot = el('div', live ? 'd4-death-hero is-live' : 'd4-death-hero', { 'data-qa': 'death-hero', 'aria-hidden': 'true' });
    slot.dataset.skin = hero.skin;
    const img = el('img', 'd4-death-hero-img', { src: skinPortraitUrl(hero.skin), alt: '', draggable: 'false' });
    slot.appendChild(img);
    backdrop.appendChild(slot);
  }
  backdrop.appendChild(card);
  root.appendChild(backdrop);
  if (slot && live && hero?.onSlot) {
    const s = slot;
    hero.onSlot(() => s.getBoundingClientRect());
  }

  let unlocked = lockMs <= 0;
  let fired = false;
  let timerId: number | null = null;

  const unlock = (): void => {
    unlocked = true;
    backdrop.classList.remove('is-locked');
    hint.classList.add('is-ready');
  };

  if (unlocked) {
    unlock();
  } else {
    timerId = clock.setTimeout(() => {
      timerId = null;
      unlock();
    }, lockMs);
  }

  const proceed = (): void => {
    if (!unlocked || fired) return;
    fired = true;
    onContinue();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      proceed();
    }
  };

  backdrop.addEventListener('click', proceed);
  document.addEventListener('keydown', onKey);

  return () => {
    if (timerId !== null) clock.clearTimeout(timerId);
    backdrop.removeEventListener('click', proceed);
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
  };
}
