// D4-P4-R4 passive countdown layer (pointer-events: none so MEC-001-R2 turns still count). Pure: no Phaser.
import { t } from '../../text';
import { el } from '../screens/screenParts';

// D4-P4-R4 passive countdown layer (pointer-events none, MEC-001-R2 turns still count).
export function renderCountdown(
  layer: HTMLElement,
  n: number | 'go' | null,
  card: { title: string; subtitle: string } | null,
): void {
  layer.innerHTML = '';
  if (n === null) {
    layer.classList.remove('is-active');
    return;
  }
  layer.classList.add('is-active');
  const num = el('div', 'd4-countdown-n', { 'data-qa': 'countdown-n' });
  num.textContent = n === 'go' ? t('countdown.go') : String(n);
  layer.appendChild(num);
  void num.offsetWidth;
  num.classList.add('is-pulse');

  if (card) {
    const c = el('div', 'd4-countdown-card', { 'data-qa': 'countdown-card' });
    const title = el('div', 'd4-countdown-card-title');
    title.textContent = card.title;
    const sub = el('div', 'd4-countdown-card-sub');
    sub.textContent = card.subtitle;
    c.append(title, sub);
    layer.appendChild(c);
  }
}
