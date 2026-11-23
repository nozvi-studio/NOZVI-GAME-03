// D4-P4-R3 Loadout DOM screen over loadoutView/loadoutEdit (single-border sky selection). Pure: no Phaser.
import type { SkillId } from '../../../core';
import { initEdit, tapCard, tapSlot, type LoadoutEditState } from '../../flow/loadoutEdit';
import { loadoutView } from '../../flow/loadoutView';
import { shakeDenied, staggerEnter } from '../animate';
import { icon, type IconName } from '../icons';
import type { ScreenRender } from '../uiBridge';
import { ctaButton, el, roundIconBtn } from './screenParts';

const SKILL_ICON: Record<SkillId, IconName> = {
  slowmo: 'clock',
  tailSnip: 'scissors',
  shield: 'shield',
  mangoRain: 'rain',
};

const SKILL_BADGE: Record<SkillId, string> = {
  slowmo: 'd4-badge is-grape',
  tailSnip: 'd4-badge is-butter',
  shield: 'd4-badge is-sky',
  mangoRain: 'd4-badge is-lime',
};

// D4-P4-R3 Loadout DOM screen over loadoutView/loadoutEdit (single-border selection).
export const loadoutScreen: ScreenRender = (root, ctx) => {
  const { bridge, params, clock } = ctx;
  const { session, balance, synth, t } = bridge;
  if (!balance) return;

  const startLevel = typeof params?.level === 'number' ? params.level : (session.lastStartLevel() ?? session.homeModel().defaultStart);
  const debugRun = params?.debug === true;
  let edit: LoadoutEditState = initEdit(session.loadoutModel());

  const screen = el('div', 'd4-screen d4-loadout d4-backdrop-pattern');

  const header = el('header', 'd4-loadout-header');
  const backBtn = roundIconBtn('back', 'loadout-back', t('loadout.back'), () => {
    synth.play('uiTap');
    bridge.goHome();
  });
  const titleEl = el('h1', 'd4-settings-title', { 'data-qa': 'loadout-title' });
  header.append(backBtn, titleEl, el('span'));

  const metaRow = el('div', 'd4-loadout-meta');
  const slotsRow = el('div', 'd4-loadout-slots');
  const grid = el('div', 'd4-loadout-grid');

  const go = (): void => {
    synth.play('uiGo');
    session.confirmLoadout(edit.selection);
    bridge.startRun(startLevel, debugRun, 'home');
  };
  const goBtn = ctaButton('loadout-play', t('loadout.go'), 'green', go, 'play');
  const footer = el('footer');
  footer.appendChild(goBtn);

  screen.append(header, metaRow, slotsRow, grid, footer);
  root.appendChild(screen);

  const render = (): void => {
    const view = loadoutView(edit, balance, { level: startLevel, carried: session.homeModel().carriedEnergy });
    titleEl.textContent = t(view.titleKey);

    metaRow.innerHTML = '';
    const startChip = el('div', 'd4-chip', { 'data-qa': 'loadout-start' });
    startChip.innerHTML = `${icon('flag', { size: 14 })}<span>${t('home.startAt', { level: view.startAt })}</span>`;
    metaRow.appendChild(startChip);
    if (view.energy !== null) {
      const enChip = el('div', 'd4-chip d4-chip--sky', { 'data-qa': 'loadout-energy' });
      enChip.innerHTML = `${icon('bolt', { size: 14 })}<span>${view.energy}</span>`;
      metaRow.appendChild(enChip);
    }

    slotsRow.innerHTML = '';
    for (const s of view.slots) {
      const slotBtn = el('button', s.active ? 'd4-loadout-slot is-active' : 'd4-loadout-slot', {
        type: 'button',
        'data-qa': `loadout-slot-${s.index}`,
      });
      const label = s.skill ? t(`skill.${s.skill}.name`) : t(`loadout.slot${s.index + 1}`);
      slotBtn.innerHTML = `${s.skill ? icon(SKILL_ICON[s.skill], { size: 18 }) : ''}<span>${label}</span>`;
      slotBtn.addEventListener('click', () => {
        const next = tapSlot(edit, s.index);
        if (next !== edit) {
          edit = next;
          synth.play('uiTap');
          render();
        }
      });
      slotsRow.appendChild(slotBtn);
    }

    grid.innerHTML = '';
    for (const c of view.cards) {
      const cls = c.locked ? 'd4-skill is-locked' : c.slot !== null ? 'd4-skill is-selected' : 'd4-skill';
      const cardBtn = el('button', cls, { type: 'button', 'data-qa': `loadout-card-${c.id}` });
      const badge = el('span', c.locked ? 'd4-badge' : SKILL_BADGE[c.id]);
      badge.innerHTML = icon(c.locked ? 'lock' : SKILL_ICON[c.id], { size: 22 });

      const copy = el('div', 'd4-skill-copy');
      const name = el('span', 'd4-skill-name');
      name.textContent = t(c.nameKey);
      const desc = el('span', 'd4-skill-desc');
      desc.textContent = c.locked
        ? t('loadout.unlocksAt', { level: c.unlockLevel })
        : c.desc ? t(c.desc.key, c.desc.vars) : '';
      copy.append(name, desc);

      const right = el('div', 'd4-skill-right');
      if (!c.locked) {
        const cost = el('span', 'd4-chip d4-chip--sky');
        cost.innerHTML = `${icon('bolt', { size: 13 })}<span>${c.cost}</span>`;
        right.appendChild(cost);
      }
      if (c.slot !== null) {
        const picked = el('span', 'd4-chip d4-chip--green');
        picked.textContent = t('loadout.picked', { n: c.slot + 1 });
        right.appendChild(picked);
      }
      cardBtn.append(badge, copy, right);
      cardBtn.addEventListener('click', () => {
        const next = tapCard(edit, c.id);
        if (next === edit) {
          synth.play('nope');
          shakeDenied(cardBtn, clock);
          return;
        }
        edit = next;
        synth.play('uiTap');
        render();
      });
      grid.appendChild(cardBtn);
    }
  };

  render();
  const cancelStagger = staggerEnter(screen, { clock });

  return () => {
    cancelStagger();
    screen.remove();
  };
};
