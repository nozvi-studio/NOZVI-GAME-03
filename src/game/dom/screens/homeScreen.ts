// D4-P3-R2 simplified Home DOM screen: PLAY only (owner ruling 2026-11-23). Pure: no Phaser.
import { activeSkin } from '../../art/skins';
import { debugStartLevel } from '../../flow/debugFlag';
import { canAffordUnowned, homeView } from '../../flow/homeModel';
import { isReducedMotion, staggerEnter } from '../animate';
import { systemClock } from '../clock';
import { createHeroStage } from '../heroStage';
import { icon } from '../icons';
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
    charsBtn.classList.add('d4-home-chars-btn');
    if (canAffordUnowned(skins)) {
      charsBtn.appendChild(el('span', 'd4-dot', { 'data-qa': 'home-chars-dot', 'aria-hidden': 'true' }));
    }
    const settingsBtn = roundIconBtn('settings', 'home-settings', t('home.settings'), () => {
      synth.play('uiTap');
      bridge.goSettings();
    });
    topRight.append(charsBtn, settingsBtn);
    top.appendChild(topRight);

    // Wordmark
    const wordmark = el('div', 'd4-home-wordmark');
    const wmTop = el('div', 'd4-title d4-home-wordmark-top');
    wmTop.textContent = t('logo.mango');
    const wmBot = el('div', 'd4-title d4-home-wordmark-bot');
    wmBot.textContent = t('logo.snake');
    wordmark.append(wmTop, wmBot);

    // Hero Center
    const heroSection = el('section', 'd4-home-hero');
    const bubble = el('div', 'd4-bubble', { 'data-qa': 'home-bubble' });
    bubble.textContent = t(v.bubble.key, { level: v.bubble.level });

    const stageRow = el('div', 'd4-home-stage-row');
    const mango = el('div', 'd4-home-mango', { 'data-qa': 'home-mango', 'aria-hidden': 'true' });
    mango.innerHTML = icon('mango', { size: 46 });
    const heroWrap = el('div', 'd4-home-hero-wrap');
    const hero = createHeroStage(heroWrap, { skin: activeSkin(), clock });
    hero.el.addEventListener('pointerdown', () => synth.play('uiTap'));
    heroWrap.appendChild(bubble); // anchored above the hero head, not the mango+hero row
    stageRow.append(mango, heroWrap);
    heroSection.append(stageRow);

    // Primary PLAY CTA + Passive Status Pill
    const actions = el('div', 'd4-home-actions');
    const play = (): void => {
      const dbgLvl = deps.debugLevel
        ? deps.debugLevel()
        : (typeof location !== 'undefined' ? debugStartLevel(location.search, 30) : null);
      if (dbgLvl !== null) bridge.startRun(dbgLvl, true);
      else bridge.startRun(v.playLevel, false);
    };
    const playBtn = ctaButton('home-play', t('home.playBig'), 'green', play, 'play');
    playBtn.classList.add('d4-home-play');
    if (!isReducedMotion(root)) playBtn.classList.add('is-idle');

    const status = el('div', 'd4-chip d4-home-status', { 'data-qa': 'home-status' });
    status.innerHTML = icon('flag', { size: 15 });
    const statusText = el('span');
    statusText.textContent = t(v.status.key, { level: v.status.level });
    status.appendChild(statusText);
    actions.append(playBtn, status);

    screen.append(top, wordmark, heroSection, actions);
    root.appendChild(screen);

    // Eye tracking toward the mango on the left
    let trackRaf: number | null = null;
    let phase = 0;
    const trackOnce = (): void => {
      hero.lookAt(-36, -6 + Math.sin(phase) * 5);
    };
    if (isReducedMotion(screen)) {
      trackOnce();
    } else {
      const tick = (): void => {
        trackRaf = null;
        phase += 0.08;
        trackOnce();
        trackRaf = clock.raf(tick);
      };
      trackOnce();
      trackRaf = clock.raf(tick);
    }

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
      if (trackRaf !== null) clock.cancelRaf(trackRaf);
      document.removeEventListener('keydown', onKeyDown);
      fallbackBox?.remove();
      hero.destroy();
      screen.remove();
    };
  };
}

export const homeScreen: ScreenRender = createHomeScreen();
