// D4-P4-R4 + GAMEOVER-R1..R5 Game Over overlay: title on top, dimmed backdrop, hero in the middle, two buttons at the bottom. Pure: no Phaser.
import type { SkinId } from '../../art/skins';
import { t } from '../../text';
import { skinPortraitUrl } from '../heroStage';
import { systemClock, type MotionClock } from '../clock';
import { el } from '../screens/screenParts';
import { scrim } from './overlayParts';
import { mysticPlayIcon } from '../mysticIcons';
import type { StageRect } from '../stageSync';

/** ANIM-SNAKE-R13 centered dead hero: live Rigby2D rig (drawn by Phaser) or static skin portrait. */
export interface DeathHero {
  readonly skin: SkinId;
  readonly live: boolean;
  readonly onSlot?: (readRect: () => StageRect) => void;
}

/** GAMEOVER-R5 what the player chose on the Game Over overlay. */
export type DeathChoice = 'again' | 'results';

export interface DeathCardOptions {
  /** Buttons ignore taps until this lock elapses (avoids a stray tap from gameplay). */
  readonly lockMs: number;
  /** GAMEOVER-R3 countdown on the Continue button; at 0 it turns into "See results". */
  readonly continueMs: number;
  readonly onChoice: (c: DeathChoice) => void;
}

const TICK_MS = 1000;

// GAMEOVER-R1..R5 Game Over overlay. Continue is an ad placeholder (no revive yet, owner 2026-11-25).
export function renderDeathCard(
  root: HTMLElement,
  opts: DeathCardOptions,
  clock: MotionClock = systemClock,
  hero?: DeathHero,
): () => void {
  const live = hero?.live === true;
  const backdrop = live ? el('div', 'd4-scrim is-live-hero') : scrim('is-frost');
  backdrop.classList.add('d4-death-scrim', 'd4-mystic', 'is-locked'); // d4-mystic: same glossy CTA as Home Play
  backdrop.dataset.qa = 'death-scrim';

  // GAMEOVER-R1 title on top
  const title = el('h2', 'd4-death-title', { 'data-qa': 'death-title' });
  title.textContent = t('death.title');

  // GAMEOVER-R2 hero in the middle (outside any opaque sheet so the Phaser rig shows through)
  const slot = el('div', live ? 'd4-death-hero is-live' : 'd4-death-hero', { 'data-qa': 'death-hero', 'aria-hidden': 'true' });
  if (hero) {
    slot.dataset.skin = hero.skin;
    slot.appendChild(el('img', 'd4-death-hero-img', { src: skinPortraitUrl(hero.skin), alt: '', draggable: 'false' }));
  }

  // GAMEOVER-R3..R5 two buttons at the bottom
  const actions = el('div', 'd4-death-actions', { 'data-qa': 'death-actions' });
  const again = el('button', 'd4-btn d4-btn--green d4-btn--cta d4-cta is-green d4-death-btn is-again', { type: 'button', 'data-qa': 'death-again' });
  const againLabel = el('span', 'd4-death-btn-label');
  againLabel.textContent = t('death.again');
  again.insertAdjacentHTML('afterbegin', mysticPlayIcon());
  again.appendChild(againLabel);
  const cont = el('button', 'd4-btn d4-btn--green d4-btn--cta d4-cta is-green d4-death-btn is-continue', { type: 'button', 'data-qa': 'death-continue' });
  const contLabel = el('span', 'd4-death-btn-label');
  const contCount = el('span', 'd4-death-count', { 'data-qa': 'death-count' });
  cont.append(contLabel, contCount);
  actions.append(again, cont);

  backdrop.append(title, slot, actions);
  root.appendChild(backdrop);
  if (hero && live && hero.onSlot) hero.onSlot(() => slot.getBoundingClientRect());

  let unlocked = opts.lockMs <= 0;
  let fired = false;
  let expired = false;
  let remainingMs = Math.max(0, opts.continueMs);
  let lockId: number | null = null;
  let tickId: number | null = null;

  const paint = (): void => {
    if (expired) {
      cont.dataset.mode = 'results';
      contLabel.textContent = t('death.results');
      contCount.textContent = '';
    } else {
      cont.dataset.mode = 'continue';
      contLabel.textContent = t('death.continue');
      contCount.textContent = String(Math.ceil(remainingMs / TICK_MS));
    }
  };

  const tick = (): void => {
    remainingMs = Math.max(0, remainingMs - TICK_MS);
    if (remainingMs <= 0) { expired = true; tickId = null; paint(); return; }
    paint();
    tickId = clock.setTimeout(tick, Math.min(TICK_MS, remainingMs));
  };

  const choose = (c: DeathChoice): void => {
    if (!unlocked || fired) return;
    fired = true;
    opts.onChoice(c);
  };

  const onAgain = (): void => choose('again');
  // GAMEOVER-R4 Continue is an ad placeholder: it does nothing until ads/revive land; after the countdown it leads to Results.
  const onCont = (): void => { if (expired) choose('results'); };

  if (remainingMs <= 0) expired = true;
  paint();
  if (!expired) tickId = clock.setTimeout(tick, Math.min(TICK_MS, remainingMs));

  const unlock = (): void => { unlocked = true; backdrop.classList.remove('is-locked'); };
  if (unlocked) unlock();
  else lockId = clock.setTimeout(() => { lockId = null; unlock(); }, opts.lockMs);

  again.addEventListener('click', onAgain);
  cont.addEventListener('click', onCont);

  return () => {
    if (lockId !== null) clock.clearTimeout(lockId);
    if (tickId !== null) clock.clearTimeout(tickId);
    again.removeEventListener('click', onAgain);
    cont.removeEventListener('click', onCont);
    backdrop.remove();
  };
}
