// D4-P4-R4 Pause sheet: one checkpoint chip (U5 fix), Resume/Settings/Quit over frosted scrim. Pure: no Phaser.
import type { PauseView } from '../../hud/overlayModel';
import { icon } from '../icons';
import { el } from '../screens/screenParts';
import type { PauseHandlers } from '../uiBridge';
import { scrim, sheet } from './overlayParts';

// D4-P4-R4 Pause sheet: one checkpoint chip (U5 fix), Resume/Settings/Quit.
export function renderPause(root: HTMLElement, v: PauseView, h: PauseHandlers, onTapSfx?: () => void): () => void {
  const backdrop = scrim('is-frost');
  const card = sheet('pause-sheet');

  const title = el('h2', 'd4-pause-title', { 'data-qa': 'pause-title' });
  title.textContent = v.title;
  const sub = el('p', 'd4-pause-sub', { 'data-qa': 'pause-subtitle' });
  sub.textContent = v.subtitle;
  card.append(title, sub);

  if (v.chip !== null) {
    const chip = el('div', 'd4-chip', { 'data-qa': 'pause-chip' });
    chip.innerHTML = icon('flag', { size: 15 });
    const txt = el('span');
    txt.textContent = v.chip;
    chip.appendChild(txt);
    card.appendChild(chip);
  }

  const actions = el('div', 'd4-pause-actions');
  for (const b of v.buttons) {
    const cls = b.id === 'resume'
      ? 'd4-btn d4-btn--green d4-btn--cta'
      : b.id === 'settings'
        ? 'd4-btn d4-btn--neutral'
        : 'd4-btn d4-btn--coral';
    const btn = el('button', cls, { type: 'button', 'data-qa': `pause-${b.id}` });
    if (b.id === 'settings') btn.innerHTML = `${icon('settings', { size: 18 })}<span>${b.label}</span>`;
    else if (b.id === 'resume') btn.innerHTML = `${icon('play', { size: 18 })}<span>${b.label}</span>`;
    else btn.textContent = b.label;
    btn.addEventListener('click', () => {
      onTapSfx?.();
      if (b.id === 'resume') h.onResume();
      else if (b.id === 'settings') h.onSettings();
      else h.onQuit();
    });
    actions.appendChild(btn);
  }
  card.appendChild(actions);
  backdrop.appendChild(card);
  root.appendChild(backdrop);

  return () => {
    backdrop.remove();
  };
}
