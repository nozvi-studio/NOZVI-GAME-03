// D4-P4-R4 shared DOM overlay parts: scrim, sheet, accessible 48px toggle switch. Pure: no Phaser.
import { el } from '../screens/screenParts';

export function scrim(cls: 'is-frost' | 'is-light'): HTMLElement {
  return el('div', `d4-scrim ${cls}`);
}

export function sheet(qa: string): HTMLElement {
  return el('div', 'd4-sheet is-pop', { 'data-qa': qa, role: 'dialog', 'aria-modal': 'true' });
}

export function toggle(
  qa: string,
  label: string,
  on: boolean,
  onTap: () => void,
): { el: HTMLButtonElement; set(next: boolean): void } {
  const btn = el('button', 'd4-toggle-btn', {
    type: 'button',
    role: 'switch',
    'aria-checked': String(on),
    'aria-label': label,
    'data-qa': qa,
  });
  const track = el('span', 'd4-toggle-track');
  track.appendChild(el('span', 'd4-toggle-knob'));
  btn.appendChild(track);
  btn.addEventListener('click', onTap);
  return {
    el: btn,
    set(next: boolean): void {
      btn.setAttribute('aria-checked', String(next));
    },
  };
}
