// D4-P3-R2 simplified Home DOM screen: PLAY only (owner ruling 2026-11-23). Pure: no Phaser.
import { activeSkin } from '../../art/skins';
import { debugStartLevel } from '../../flow/debugFlag';
import { canAffordUnowned, homeView } from '../../flow/homeModel';
import { isReducedMotion, staggerEnter } from '../animate';
import { systemClock } from '../clock';
import { createHeroStage } from '../heroStage';
import { mountMysticBackdrop } from '../mysticBackdrop';
import { mysticButtonIcon, mysticPlayIcon, mysticWordmarkSvg } from '../mysticIcons';
import type { ScreenRender } from '../uiBridge';
import { ctaButton, el, roundIconBtn } from './screenParts';

export interface HomeScreenDeps {
  debugLevel?: () => number | null;
  exportLog?: (json: string) => Promise<void>;
  onInstallSummarize?: () => void;
}

export function createHomeScreen(deps: HomeScreenDeps = {}): ScreenRender {
  // D4-P3-R2 simplified Home: PLAY only (owner ruling 2026-11-23).
  return (root, ctx) => {
    const { bridge, debug, clock = systemClock } = ctx;
    const { session, synth, t } = bridge;
    const m = session.homeModel();
    const v = homeView(m);
    const skins = session.skinsModel();

    const screen = el('div', 'd4-screen d4-home d4-backdrop-pattern');

    // Top bar
    const top = el('div', 'd4-home-top');
    let fallbackBox: HTMLTextAreaElement | null = null;
    if (debug) {
      deps.onInstallSummarize?.();
      const expBtn = el('button', 'd4-btn d4-btn--neutral d4-debug-pill', {
        type: 'button',
        'data-qa': 'home-export',
        'aria-label': t('home.exportLog'),
      });
      expBtn.textContent = t('home.exportLog');
      expBtn.addEventListener('click', () => {
        const json = session.exportLog();
        const showDone = (): void => {
          const toast = el('div', 'd4-chip d4-chip--green d4-home-export-toast', { 'data-qa': 'home-export-done' });
          toast.textContent = t('home.exportDone');
          screen.appendChild(toast);
        };
        const fallback = (): void => {
          fallbackBox?.remove();
          fallbackBox = el('textarea');
          fallbackBox.value = json;
          fallbackBox.readOnly = true;
          fallbackBox.addEventListener('blur', () => { fallbackBox?.remove(); fallbackBox = null; });
          screen.appendChild(fallbackBox);
          fallbackBox.focus();
          fallbackBox.select();
        };
        if (deps.exportLog) {
          void deps.exportLog(json).then(showDone, fallback);
        } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(json).then(showDone, fallback);
        } else {
          fallback();
        }
      });
      top.appendChild(expBtn);
    }

    const topRight = el('div', 'd4-home-top-right');
    const charsBtn = roundIconBtn('characters', 'home-characters', t('home.characters'), () => {
      synth.play('uiTap');
      bridge.goCharacters();
    });
    charsBtn.innerHTML = mysticButtonIcon('crown');
    charsBtn.classList.add('d4-home-chars-btn');
    if (canAffordUnowned(skins)) {
      charsBtn.appendChild(el('span', 'd4-dot', { 'data-qa': 'home-chars-dot', 'aria-hidden': 'true' }));
    }
    const settingsBtn = roundIconBtn('settings', 'home-settings', t('home.settings'), () => {
      synth.play('uiTap');
      bridge.goSettings();
    });
    settingsBtn.innerHTML = mysticButtonIcon('settings');
    topRight.append(charsBtn, settingsBtn);
    top.appendChild(topRight);

    // Wordmark (chunky rounded-stroke SVG matching main-menu.png)
    const wordmark = el('div', 'd4-home-wordmark');
    wordmark.innerHTML = mysticWordmarkSvg(t('logo.mango'), t('logo.snake'));

    // Hero Center (clean mascot portrait only — no bubble, no mango)
    const heroSection = el('section', 'd4-home-hero');
    const stageRow = el('div', 'd4-home-stage-row');
    const heroWrap = el('div', 'd4-home-hero-wrap');
    const skin = activeSkin();
    const hero = createHeroStage(heroWrap, { skin, mode: 'portrait', clock });
    // ANIM-SNAKE-R11 sync Home hero slot to MetaBgScene snake rig (idle loop, tap -> poke).
    hero.el.addEventListener('pointerdown', () => {
      synth.play('uiTap');
      bridge.metaHero?.play('poke');
    });
    stageRow.append(heroWrap);
    heroSection.append(stageRow);

    // Primary PLAY CTA only (no checkpoint pill)
    const actions = el('div', 'd4-home-actions');
    const play = (): void => {
      const dbgLvl = deps.debugLevel
        ? deps.debugLevel()
        : (typeof location !== 'undefined' ? debugStartLevel(location.search, 30) : null);
      if (dbgLvl !== null) bridge.startRun(dbgLvl, true);
      else bridge.startRun(v.playLevel, false);
    };
    const playBtn = ctaButton('home-play', t('home.playBig'), 'green', play);
    playBtn.insertAdjacentHTML('afterbegin', mysticPlayIcon());
    playBtn.classList.add('d4-home-play');
    if (!isReducedMotion(root)) playBtn.classList.add('is-idle');
    actions.append(playBtn);

    screen.append(top, wordmark, heroSection, actions);
    const disposeBackdrop = mountMysticBackdrop(screen);
    root.appendChild(screen);
    bridge.metaHero?.setSlot({ skin, readRect: () => hero.el.getBoundingClientRect() });

    // Enter / Space starts a run only when focus is not on a button (prevents double-fire)
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (document.activeElement instanceof HTMLButtonElement) return;
      e.preventDefault();
      play();
    };
    document.addEventListener('keydown', onKeyDown);

    const cancelStagger = staggerEnter(screen, { clock });

    return () => {
      cancelStagger();
      document.removeEventListener('keydown', onKeyDown);
      fallbackBox?.remove();
      bridge.metaHero?.setSlot(null);
      hero.destroy();
      disposeBackdrop();
      screen.remove();
    };
  };
}

export const homeScreen: ScreenRender = createHomeScreen();
