// D4-P4-R2 Settings DOM screen over settingsView/togglePatch (full-screen and overlay sheet). Pure: no Phaser.
import { resolveDisplay } from '../../../meta';
import { applySettings, settingsExit, settingsView, togglePatch, type SettingsEntry, type SettingsToggle } from '../../flow/settingsView';
import { osDisplay } from '../../render/palette';
import { isReducedMotion, staggerEnter } from '../animate';
import { mountMysticBackdrop } from '../mysticBackdrop';
import { mysticButtonIcon, mysticPageTitleSvg, mysticSettingIcon } from '../mysticIcons';
import { scrim, sheet, toggle } from '../overlays/overlayParts';
import type { ScreenRender } from '../uiBridge';
import { el, roundIconBtn } from './screenParts';

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

  // Build rows once and update switch states in-place so CSS slide/bounce transitions run smoothly.
  const switches = new Map<SettingsToggle, ReturnType<typeof toggle>>();
  const syncSwitches = (): void => {
    const s = session.save().settings;
    const d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d);
    for (const r of v.rows) switches.get(r.id)?.set(r.on);
  };

  const buildRows = (card: HTMLElement): void => {
    const s = session.save().settings;
    const d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d);
    for (const r of v.rows) {
      const row = el('div', 'd4-settings-row', { 'data-qa': `settings-row-${r.id}` });
      const iconWrap = el('span', 'd4-settings-icon');
      iconWrap.innerHTML = mysticSettingIcon(r.id);
      const copy = el('div', 'd4-settings-copy');
      const title = el('span', 'd4-settings-row-title');
      title.textContent = t(r.titleKey);
      copy.append(title);
      const sw = toggle(`settings-${r.id}`, t(r.titleKey), r.on, () => {
        const curS = session.save().settings;
        const curD = resolveDisplay(curS, osDisplay());
        const patch = togglePatch(curS, curD, r.id);
        applySettings(session, patch, osDisplay());
        synth.setOn(session.save().settings.sound);
        synth.play('uiTap');
        if (r.id === 'reducedMotion') bridge.syncReducedMotion();
        syncSwitches();
        if (!isReducedMotion(card)) {
          sw.el.classList.remove('is-pop');
          void sw.el.offsetWidth;
          sw.el.classList.add('is-pop');
        }
      });
      switches.set(r.id, sw);
      row.append(iconWrap, copy, sw.el);
      card.appendChild(row);
    }
  };

  const backBtn = roundIconBtn('back', 'settings-back', t('loadout.back'), exit);
  backBtn.innerHTML = mysticButtonIcon('back');
  const titleEl = el('h1', entry.overlay ? 'd4-settings-title' : 'd4-settings-title d4-mystic-title-wrap',
    entry.overlay ? { 'data-qa': 'settings-title' } : undefined);
  if (entry.overlay) {
    titleEl.textContent = t('settings.title');
  } else {
    const sr = el('span', 'd4-sr-only', { 'data-qa': 'settings-title' });
    sr.textContent = t('settings.title');
    titleEl.innerHTML = mysticPageTitleSvg(t('settings.title'));
    titleEl.appendChild(sr);
  }

  const card = el('div', 'd4-card d4-settings-card');
  buildRows(card);

  if (entry.overlay) {
    const header = el('header', 'd4-settings-header');
    header.append(backBtn, titleEl, el('span'));
    const backdrop = scrim('is-frost');
    const dlg = sheet('settings-sheet');
    dlg.classList.add('d4-settings-sheet', 'd4-mystic-sheet');
    dlg.append(header, card);
    backdrop.appendChild(dlg);
    root.appendChild(backdrop);
    return () => { backdrop.remove(); };
  }

  const top = el('div', 'd4-settings-top');
  top.appendChild(backBtn);

  const screen = el('div', 'd4-screen d4-settings d4-backdrop-pattern');
  screen.append(top, titleEl, card);
  const disposeBackdrop = mountMysticBackdrop(screen);
  root.appendChild(screen);
  const cancelStagger = staggerEnter(screen, { clock });

  return () => {
    cancelStagger();
    disposeBackdrop();
    screen.remove();
  };
};
