// D4-P4-R3 Loadout DOM screen over loadoutView/loadoutEdit (Aqua Marsh Mystic 2x2 skill cards + orb slots). Pure: no Phaser.
import type { SkillId } from '../../../core';
import { initEdit, tapCard, tapSlot, type LoadoutEditState } from '../../flow/loadoutEdit';
import { loadoutView } from '../../flow/loadoutView';
import { isReducedMotion, shakeDenied, staggerEnter } from '../animate';
import { icon } from '../icons';
import { mountMysticBackdrop } from '../mysticBackdrop';
import { mysticButtonIcon, mysticPageTitleSvg, mysticPlayIcon } from '../mysticIcons';
import type { ScreenRender } from '../uiBridge';
import { ctaButton, el, roundIconBtn } from './screenParts';

const SKILL_ART: Record<SkillId, string> = {
  slowmo: '/skills/slowmo.webp',
  tailSnip: '/skills/tailSnip.webp',
  shield: '/skills/shield.webp',
  mangoRain: '/skills/mangoRain.webp',
};

const SKILL_TONE: Record<SkillId, string> = {
  slowmo: 'is-slowmo',
  tailSnip: 'is-snip',
  shield: 'is-shield',
  mangoRain: 'is-rain',
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
  backBtn.innerHTML = mysticButtonIcon('back');
  const titleEl = el('h1', 'd4-loadout-title d4-mystic-title-wrap');
  const titleSr = el('span', 'd4-sr-only', { 'data-qa': 'loadout-title' });
  titleEl.innerHTML = mysticPageTitleSvg('LOADOUT');
  titleEl.appendChild(titleSr);
  header.append(backBtn, titleEl, el('span', 'd4-loadout-spacer'));

  const slotsRow = el('div', 'd4-loadout-slots');
  const grid = el('div', 'd4-loadout-grid');

  const go = (): void => {
    synth.play('uiGo');
    session.confirmLoadout(edit.selection);
    bridge.startRun(startLevel, debugRun, 'home');
  };
  const goBtn = ctaButton('loadout-play', t('home.playBig'), 'green', go);
  goBtn.insertAdjacentHTML('afterbegin', mysticPlayIcon());
  goBtn.classList.add('d4-home-play', 'd4-loadout-play');
  if (!isReducedMotion(root)) goBtn.classList.add('is-idle');
  const footer = el('footer', 'd4-loadout-footer');
  footer.appendChild(goBtn);

  screen.append(header, slotsRow, grid, footer);
  const disposeBackdrop = mountMysticBackdrop(screen);
  root.appendChild(screen);

  const render = (): void => {
    const view = loadoutView(edit, balance, { level: startLevel, carried: session.homeModel().carriedEnergy });
    titleSr.textContent = t(view.titleKey);

    slotsRow.innerHTML = '';
    for (const s of view.slots) {
      const tone = s.skill ? SKILL_TONE[s.skill] : 'is-empty';
      const cls = `d4-loadout-slot ${tone}${s.active ? ' is-active' : ''}`;
      const slotBtn = el('button', cls, {
        type: 'button',
        'data-qa': `loadout-slot-${s.index}`,
        'aria-label': s.skill ? `${t(`loadout.slot${s.index + 1}`)}: ${t(`skill.${s.skill}.name`)}` : t(`loadout.slot${s.index + 1}`),
      });
      const tag = el('span', 'd4-slot-tag');
      tag.textContent = t(`loadout.slot${s.index + 1}`).toUpperCase();
      const orb = el('span', 'd4-slot-orb');
      if (s.skill) {
        orb.appendChild(el('img', 'd4-skill-img', {
          src: SKILL_ART[s.skill],
          alt: '',
          decoding: 'async',
          draggable: 'false',
        }));
      } else {
        const plus = el('span', 'd4-slot-plus');
        plus.textContent = '+';
        orb.appendChild(plus);
      }
      slotBtn.append(tag, orb);
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

      const media = el('span', `d4-skill-medallion ${SKILL_TONE[c.id]}`);
      media.appendChild(el('img', 'd4-skill-img', {
        src: SKILL_ART[c.id],
        alt: '',
        decoding: 'async',
        draggable: 'false',
      }));
      if (c.locked) {
        const lockOverlay = el('span', 'd4-skill-lock-badge');
        lockOverlay.innerHTML = icon('lock', { size: 18 });
        media.appendChild(lockOverlay);
      }

      const name = el('span', 'd4-skill-name');
      name.textContent = t(c.nameKey);

      const pill = el('span', c.locked ? 'd4-skill-pill is-locked' : 'd4-skill-pill is-cost');
      if (c.locked) {
        pill.textContent = `L${c.unlockLevel}`;
      } else {
        pill.innerHTML = `${icon('bolt', { size: 13 })}<span>${c.cost}</span>`;
      }

      cardBtn.append(media, name, pill);
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
    disposeBackdrop();
    screen.remove();
  };
};
