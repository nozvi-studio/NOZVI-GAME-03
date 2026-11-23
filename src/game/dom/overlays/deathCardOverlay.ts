// D4-P4-R4 DeathCard: humorous seeded death line, skip-locked tap-anywhere to Results. Pure: no Phaser.
import { t } from '../../text';
import { systemClock, type MotionClock } from '../clock';
import { el } from '../screens/screenParts';
import { scrim, sheet } from './overlayParts';

// D4-P4-R4 DeathCard: humorous line, skip-locked tap-anywhere to Results.
export function renderDeathCard(
  root: HTMLElement,
  line: { text: string },
  lockMs: number,
  onContinue: () => void,
  clock: MotionClock = systemClock,
): () => void {
  const backdrop = scrim('is-frost');
  backdrop.classList.add('d4-death-scrim', 'is-locked');
  backdrop.dataset.qa = 'death-scrim';

  const card = sheet('death-sheet');
  const title = el('h2', 'd4-death-title', { 'data-qa': 'death-title' });
  title.textContent = t('death.title');
  const msg = el('p', 'd4-death-line', { 'data-qa': 'death-line' });
  msg.textContent = line.text;
  const hint = el('div', 'd4-death-hint', { 'data-qa': 'death-hint' });
  hint.textContent = t('death.tapContinue');
  card.append(title, msg, hint);
  backdrop.appendChild(card);
  root.appendChild(backdrop);

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
