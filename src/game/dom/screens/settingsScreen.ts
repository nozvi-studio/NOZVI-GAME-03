// D4-P4-R2 Settings DOM screen over settingsView/togglePatch (full-screen and overlay sheet). Pure: no Phaser.
import { resolveDisplay } from '../../../meta';
import { applySettings, settingsExit, settingsView, togglePatch, type SettingsEntry, type SettingsToggle } from '../../flow/settingsView';
import { osDisplay } from '../../render/palette';
import { staggerEnter } from '../animate';
import { icon, type IconName } from '../icons';
import { scrim, sheet, toggle } from '../overlays/overlayParts';
import type { ScreenRender } from '../uiBridge';
import { el, roundIconBtn } from './screenParts';

const BADGE_CLS: Record<SettingsToggle, string> = {
  sound: 'd4-badge is-sky',
  haptics: 'd4-badge is-grape',
  dpad: 'd4-badge is-lime',
  reducedMotion: 'd4-badge is-butter',
};

const ROW_ICON: Record<SettingsToggle, IconName> = {
  sound: 'sound',
  haptics: 'haptics',
  dpad: 'dpad',
  reducedMotion: 'motion',
};

// D4-P4-R2 Settings DOM screen over settingsView/togglePatch (full and overlay).
export const settingsScreen: ScreenRender = (root, ctx) => {
  const { bridge, params, clock } = ctx;
  const { session, synth, t } = bridge;
  const entry: SettingsEntry = {
    overlay: params?.overlay === true,
    returnTo: typeof params?.returnTo === 'string' ? params.returnTo : undefined,
  };
  const onClosed = typeof params?.onClosed === 'function' ? (params.onClosed as () => void) : undefined;

  const exit = (): void => {
    synth.play('uiTap');
    const x = settingsExit(entry);
    if (x.action === 'close') onClosed?.();
    else bridge.goHome();
  };

  const buildRows = (card: HTMLElement): void => {
    card.innerHTML = '';
    const s = session.save().settings;
    const d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d);
    for (const r of v.rows) {
      const row = el('div', 'd4-settings-row', { 'data-qa': `settings-row-${r.id}` });
      const badge = el('span', BADGE_CLS[r.id]);
      badge.innerHTML = icon(ROW_ICON[r.id], { size: 22 });
      const copy = el('div', 'd4-settings-copy');
      const title = el('span', 'd4-settings-row-title');
      title.textContent = t(r.titleKey);
      const sub = el('span', 'd4-settings-row-sub');
      sub.textContent = t(r.subKey);
      copy.append(title, sub);
      const sw = toggle(`settings-${r.id}`, t(r.titleKey), r.on, () => {
        const curS = session.save().settings;
        const curD = resolveDisplay(curS, osDisplay());
        const patch = togglePatch(curS, curD, r.id);
        applySettings(session, patch, osDisplay());
        synth.setOn(session.save().settings.sound);
        synth.play('uiTap');
        if (r.id === 'reducedMotion') bridge.syncReducedMotion();
        buildRows(card);
      });
      row.append(badge, copy, sw.el);
      card.appendChild(row);
    }
  };

  const header = el('header', 'd4-settings-header');
  const backBtn = roundIconBtn('back', 'settings-back', t('loadout.back'), exit);
  const titleEl = el('h1', 'd4-settings-title', { 'data-qa': 'settings-title' });
  titleEl.textContent = t('settings.title');
  header.append(backBtn, titleEl, el('span'));

  const card = el('div', 'd4-card d4-settings-card');
  buildRows(card);

  const note = el('p', 'd4-settings-note');
  note.textContent = t('settings.autosave');

  if (entry.overlay) {
    const backdrop = scrim('is-frost');
    const dlg = sheet('settings-sheet');
    dlg.classList.add('d4-settings-sheet');
    dlg.append(header, card, note);
    backdrop.appendChild(dlg);
    root.appendChild(backdrop);
    return () => { backdrop.remove(); };
  }

  const screen = el('div', 'd4-screen d4-settings d4-backdrop-pattern');
  screen.append(header, card, note);
  root.appendChild(screen);
  const cancelStagger = staggerEnter(screen, { clock });

  return () => {
    cancelStagger();
    screen.remove();
  };
};
