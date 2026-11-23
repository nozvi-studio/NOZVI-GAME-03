// D4-P3-R1 Characters DOM screen over charactersView (MEC-011-R14..R21). Pure: no Phaser.
import { isSkinId, setActiveSkin, type SkinId } from '../../art/skins';
import { charactersView } from '../../flow/charactersView';
import { isReducedMotion, shakeDenied, staggerEnter } from '../animate';
import { burstConfetti } from '../confetti';
import { createHeroStage, skinPortraitUrl } from '../heroStage';
import { icon } from '../icons';
import { mountMysticBackdrop } from '../mysticBackdrop';
import { mysticButtonIcon, mysticPageTitleSvg } from '../mysticIcons';
import type { ScreenRender } from '../uiBridge';
import { coinPill, ctaButton, el, roundIconBtn } from './screenParts';

const SKIN_HALO: Record<SkinId, string> = {
  snake: 'var(--d4-sky-tint)',
  ginger: 'var(--d4-gold-tint)',
  pup: 'var(--d4-green-tint)',
  tuxedo: 'var(--d4-surface)',
  capy: 'var(--d4-purple-tint)',
};

const RARITY_CLS: Record<string, string> = {
  default: 'd4-chip',
  common: 'd4-chip d4-chip--sky',
  rare: 'd4-chip d4-chip--purple',
};

// D4-P3-R1 Characters DOM screen over charactersView (MEC-011-R14..R21).
export const charactersScreen: ScreenRender = (root, ctx) => {
  const { bridge, debug, clock } = ctx;
  const { session, synth, t } = bridge;
  const eq = session.skinsModel().equipped;
  let preview: SkinId = isSkinId(eq) ? eq : 'snake';
  const confettiDisposers: (() => void)[] = [];

  const screen = el('div', 'd4-screen d4-chars d4-backdrop-pattern');

  // Top bar + Title
  const top = el('header', 'd4-chars-top');
  const backBtn = roundIconBtn('back', 'chars-back', t('loadout.back'), () => {
    synth.play('uiTap');
    bridge.goHome();
  });
  backBtn.innerHTML = mysticButtonIcon('back');
  const title = el('h1', 'd4-chars-title d4-mystic-title-wrap');
  const titleSr = el('span', 'd4-sr-only', { 'data-qa': 'chars-title' });
  titleSr.textContent = t('characters.title');
  title.innerHTML = mysticPageTitleSvg(t('characters.title'));
  title.appendChild(titleSr);
  const coinsWrap = el('div', 'd4-chars-coins-wrap');
  const coins = coinPill('chars-coins', session.skinsModel().coins);
  coinsWrap.appendChild(coins.el);
  if (debug) {
    const dbg = el('button', 'd4-btn d4-btn--gold d4-debug-pill', {
      type: 'button',
      'data-qa': 'chars-debug-coins',
      'aria-label': 'Add debug coins',
    });
    dbg.textContent = t('characters.debugCoins', { n: 500 });
    dbg.addEventListener('click', () => {
      session.debugAddCoins();
      synth.play('uiTap');
      render();
    });
    coinsWrap.appendChild(dbg);
  }
  top.append(backBtn, title, coinsWrap);

  // Adaptive Showcase Stage
  const stage = el('section', 'd4-chars-stage', { 'data-qa': 'chars-stage' });
  const halo = el('div', 'd4-chars-halo');
  const heroWrap = el('div', 'd4-chars-hero-wrap');
  stage.append(halo, heroWrap);
  const hero = createHeroStage(heroWrap, { skin: preview, mode: 'portrait', clock });
  hero.el.addEventListener('pointerdown', () => synth.play('uiTap'));

  // Identity Block (clean name + rarity only, no perk subtitle)
  const identity = el('div', 'd4-chars-identity');
  const idRow = el('div', 'd4-chars-id-row');
  const nameEl = el('span', 'd4-chars-name', { 'data-qa': 'chars-name' });
  const rarityEl = el('span', 'd4-chip', { 'data-qa': 'chars-rarity' });
  idRow.append(nameEl, rarityEl);
  identity.append(idRow);

  // 3x2 Grid
  const grid = el('div', 'd4-chars-grid');
  const tileBtns = new Map<SkinId, HTMLButtonElement>();
  const initial = charactersView(session.skinsModel(), preview);
  for (const tok of initial.tokens) {
    if (!isSkinId(tok.id)) continue;
    const id = tok.id;
    const btn = el('button', 'd4-tile', {
      type: 'button',
      'data-qa': `chars-token-${id}`,
      'aria-label': t(`skin.${id}.name`),
    });
    const badge = el('span', 'd4-tile-badge');
    const thumb = el('span', 'd4-tile-thumb');
    thumb.appendChild(el('img', 'd4-tile-img', { src: skinPortraitUrl(id), alt: '', decoding: 'async', draggable: 'false' }));
    const foot = el('span', 'd4-tile-foot');
    btn.append(badge, thumb, foot);
    btn.addEventListener('click', () => {
      if (preview === id) return;
      preview = id;
      synth.play('uiTap');
      hero.setSkin(id);
      if (!isReducedMotion(screen)) {
        heroWrap.classList.remove('is-swap');
        void heroWrap.offsetWidth;
        heroWrap.classList.add('is-swap');
        btn.classList.remove('is-pop');
        void btn.offsetWidth;
        btn.classList.add('is-pop');
      }
      render();
    });
    tileBtns.set(id, btn);
    grid.appendChild(btn);
  }
  const soonBtn = el('button', 'd4-tile', {
    type: 'button',
    'data-qa': 'chars-token-soon',
    'aria-label': t('characters.soon'),
    disabled: '',
  });
  const soonQ = el('span', 'd4-tile-thumb');
  soonQ.textContent = '?';
  const soonFoot = el('span', 'd4-tile-foot');
  soonFoot.textContent = t('characters.soon');
  soonBtn.append(soonQ, soonFoot);
  grid.appendChild(soonBtn);

  // Footer CTA
  const footer = el('footer', 'd4-chars-footer');
  let actionBtn: HTMLButtonElement | null = null;

  screen.append(top, stage, identity, grid, footer);
  const disposeBackdrop = mountMysticBackdrop(screen);
  root.appendChild(screen);

  const onAction = (): void => {
    const v = charactersView(session.skinsModel(), preview);
    if (v.action.kind === 'buy') {
      if (session.buySkin(v.preview).ok) {
        setActiveSkin(v.preview);
        synth.play('unlock');
        hero.react('celebrate');
        const r = stage.getBoundingClientRect();
        confettiDisposers.push(burstConfetti(stage, r.width / 2 || 160, r.height / 2 || 100));
        render();
      }
      return;
    }
    if (v.action.kind === 'equip') {
      if (session.equipSkin(v.preview)) {
        setActiveSkin(v.preview);
        synth.play('uiTap');
        render();
      }
      return;
    }
    if (v.action.kind === 'need') {
      synth.play('nope');
      if (actionBtn) shakeDenied(actionBtn, clock);
      hero.react('denied');
    }
  };

  const render = (): void => {
    const v = charactersView(session.skinsModel(), preview);
    coins.set(v.coins, clock);
    stage.style.setProperty('--halo', SKIN_HALO[preview]);
    nameEl.textContent = v.name;
    rarityEl.className = RARITY_CLS[v.rarity] ?? 'd4-chip';
    rarityEl.textContent = t(`rarity.${v.rarity}`);

    for (const tok of v.tokens) {
      if (!isSkinId(tok.id)) continue;
      const btn = tileBtns.get(tok.id);
      if (!btn) continue;
      btn.classList.toggle('is-selected', tok.selected);
      btn.setAttribute('aria-pressed', String(tok.selected));
      const badge = btn.querySelector('.d4-tile-badge') as HTMLElement;
      const foot = btn.querySelector('.d4-tile-foot') as HTMLElement;
      if (tok.state === 'equipped') {
        badge.className = 'd4-tile-badge is-equipped';
        badge.innerHTML = icon('check', { size: 11 });
        badge.style.display = '';
        foot.textContent = t('characters.equipped');
      } else if (tok.state === 'locked') {
        badge.className = 'd4-tile-badge';
        badge.innerHTML = icon('lock', { size: 11 });
        badge.style.display = '';
        foot.innerHTML = `${icon('coin', { size: 11 })}<span>${tok.price}</span>`;
      } else {
        badge.style.display = 'none';
        foot.textContent = t('characters.owned');
      }
    }

    const a = v.action;
    const label = a.kind === 'equipped' ? t('characters.equipped')
      : a.kind === 'equip' ? t('characters.equip')
        : a.kind === 'buy' ? t('characters.buy', { n: a.price })
          : t('characters.need', { n: a.missing });
    const tone = a.kind === 'buy' || a.kind === 'equip' ? 'green' : 'flat';
    const ic = a.kind === 'equipped' ? 'check' : a.kind === 'need' ? 'lock' : a.kind === 'buy' ? 'coin' : undefined;
    footer.innerHTML = '';
    actionBtn = ctaButton('chars-action', label, tone, onAction, ic);
    footer.appendChild(actionBtn);
  };

  render();
  const cancelStagger = staggerEnter(screen, { clock });

  return () => {
    cancelStagger();
    coins.cancel();
    hero.destroy();
    for (const d of confettiDisposers) d();
    disposeBackdrop();
    screen.remove();
  };
};
