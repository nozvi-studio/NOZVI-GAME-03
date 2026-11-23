// D4-P3 shared DOM screen parts: el, roundIconBtn, ctaButton, coinPill. Pure: no Phaser.
import { countUp } from '../animate';
import type { MotionClock } from '../clock';
import { icon, type IconName } from '../icons';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  attrs?: Record<string, string>,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function roundIconBtn(
  ic: IconName,
  qa: string,
  label: string,
  onTap: () => void,
): HTMLButtonElement {
  const btn = el('button', 'd4-icon-btn', { type: 'button', 'data-qa': qa, 'aria-label': label });
  btn.innerHTML = icon(ic);
  btn.addEventListener('click', onTap);
  return btn;
}

export function ctaButton(
  qa: string,
  label: string,
  tone: 'green' | 'flat',
  onTap: () => void,
  ic?: IconName,
): HTMLButtonElement {
  const cls = tone === 'green' ? 'd4-btn d4-btn--green d4-btn--cta d4-cta is-green' : 'd4-btn d4-btn--disabled d4-btn--cta d4-cta is-flat';
  const attrs: Record<string, string> = { type: 'button', 'data-qa': qa };
  if (tone === 'flat') attrs['aria-disabled'] = 'true';
  const btn = el('button', cls, attrs);
  const icHtml = ic ? icon(ic, { size: 18 }) : '';
  const span = el('span');
  span.textContent = label;
  btn.innerHTML = icHtml;
  btn.appendChild(span);
  btn.addEventListener('click', onTap);
  return btn;
}

export function coinPill(qa: string, value: number): { el: HTMLElement; set(n: number, clock?: MotionClock): void; cancel(): void } {
  const pill = el('div', 'd4-chip d4-chip--gold', { 'data-qa': qa });
  pill.innerHTML = icon('coin', { size: 16 });
  const num = el('span', 'd4-num');
  num.textContent = String(value);
  pill.appendChild(num);
  let cur = value;
  let cancelCur: (() => void) | null = null;
  return {
    el: pill,
    set(next: number, clock?: MotionClock): void {
      cancelCur?.();
      cancelCur = countUp(num, cur, next, 380, clock);
      cur = next;
    },
    cancel(): void {
      cancelCur?.();
      cancelCur = null;
    },
  };
}
