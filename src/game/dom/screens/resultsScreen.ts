// D4-P4-R1 Results DOM screen over resultsView (Aqua Marsh Mystic concept, mascot payoff, odometer, confetti). Pure: no Phaser.
import { biome } from '../../../core';
import { activeSkin } from '../../art/skins';
import { resultsView } from '../../flow/resultsView';
import { countUp, isReducedMotion, staggerEnter } from '../animate';
import { systemClock } from '../clock';
import { burstConfetti } from '../confetti';
import { createHeroStage } from '../heroStage';
import { icon } from '../icons';
import { MOTION } from '../motionTokens';
import { mountMysticBackdrop } from '../mysticBackdrop';
import { mysticBoltIcon, mysticButtonIcon, mysticPageTitleSvg, mysticPlayIcon } from '../mysticIcons';
import type { ScreenRender } from '../uiBridge';
import { ctaButton, el, roundIconBtn } from './screenParts';

// D4-P4-R1 Results DOM screen over resultsView (no nested boxes, mascot payoff).
export const resultsScreen: ScreenRender = (root, ctx) => {
  const { bridge, clock = systemClock } = ctx;
  const { session, synth, t, balance } = bridge;
  const summary = session.summary();
  const maxBiomes = balance ? biome(balance, balance.level.maxLevel) : 6;
  const v = summary ? resultsView(summary, session.homeModel().nextMilestone, maxBiomes) : null;
  const confettiDisposers: (() => void)[] = [];

  const screen = el('div', 'd4-screen d4-results d4-backdrop-pattern');

  // Top-right quick buttons (Characters crown + Settings gear, matching Home & game-over.png)
  const navBar = el('div', 'd4-results-nav');
  const charsBtn = roundIconBtn('characters', 'results-characters', t('home.characters'), () => {
    synth.play('uiTap');
    bridge.goCharacters();
  });
  charsBtn.innerHTML = mysticButtonIcon('crown');
  const settingsBtn = roundIconBtn('settings', 'results-settings', t('home.settings'), () => {
    synth.play('uiTap');
    bridge.goSettings();
  });
  settingsBtn.innerHTML = mysticButtonIcon('settings');
  navBar.append(charsBtn, settingsBtn);

  const top = el('div', 'd4-results-top');

  // Mascot reaction + bubble
  const stage = el('section', 'd4-results-stage', { 'data-qa': 'results-stage' });
  const isWin = v?.titleKey === 'results.youWin';
  const isGold = v?.bestChip.gold === true;
  const bubble = el('div', 'd4-bubble', { 'data-qa': 'results-bubble' });
  if (isGold) {
    bubble.textContent = t('results.d4.newRecord');
  } else if (v) {
    bubble.textContent = t(v.headline.key) + (v.headline.context ? ` ${t(v.headline.context)}` : '');
  } else {
    bubble.textContent = t('results.gameOver');
  }
  const heroWrap = el('div', 'd4-results-hero-wrap');
  const hero = createHeroStage(heroWrap, {
    skin: activeSkin(),
    mode: 'portrait',
    clock,
    interactive: true,
  });
  hero.el.addEventListener('pointerdown', () => synth.play('uiTap'));
  stage.append(bubble, heroWrap);

  // Outcome Display Title (chunky SVG matching game-over.png)
  const titleText = isWin ? t('results.d4.victory') : isGold ? t('results.d4.newBest') : t('results.d4.gameOver');
  const titleTone = isWin ? 'green' : isGold ? 'gold' : 'white';
  const titleEl = el('h1', 'd4-results-title d4-mystic-title-wrap');
  if (isWin) titleEl.classList.add('is-win');
  else if (isGold) titleEl.classList.add('is-gold');
  const titleSr = el('span', 'd4-sr-only', { 'data-qa': 'results-title' });
  titleSr.textContent = titleText;
  titleEl.innerHTML = mysticPageTitleSvg(titleText, titleTone);
  titleEl.appendChild(titleSr);

  // Odometer Score + Best Pill
  const scoreWrap = el('div', 'd4-results-score-wrap');
  const scoreEl = el('div', 'd4-results-score', { 'data-qa': 'results-score' });
  scoreEl.textContent = '0';
  const bestPill = el('div', isGold ? 'd4-chip d4-chip--gold is-gold' : 'd4-chip d4-results-best-pill', { 'data-qa': 'results-best' });
  bestPill.innerHTML = icon('trophy', { size: 15 });
  const bestTxt = el('span');
  bestTxt.textContent = v ? t(v.bestChip.key, v.bestChip.vars) : '';
  bestPill.appendChild(bestTxt);
  scoreWrap.append(scoreEl, bestPill);

  top.append(stage, titleEl, scoreWrap);

  // 3-Column White Tactile Stat Card (LEVEL / EATEN / BIOME)
  const stats = el('div', 'd4-results-stats', { 'data-qa': 'results-stats' });
  for (const s of v?.stats ?? []) {
    const col = el('div', 'd4-results-stat');
    const lbl = el('span', 'd4-results-stat-label');
    lbl.textContent = t(s.labelKey);
    const val = el('span', 'd4-results-stat-val');
    val.textContent = s.value;
    col.append(lbl, val);
    stats.appendChild(col);
  }

  // Rows: checkpoint, carried energy, next checkpoint bar, first-run tip
  const rows = el('div', 'd4-results-rows');
  for (const r of v?.rows ?? []) {
    if (r.kind === 'checkpoint') {
      const cp = el('div', 'd4-chip d4-chip--gold', { 'data-qa': 'results-checkpoint' });
      cp.innerHTML = icon('flag', { size: 15 });
      const cpTxt = el('span');
      cpTxt.textContent = t('results.nextRunAt', { level: r.level });
      cp.appendChild(cpTxt);
      rows.appendChild(cp);
    } else if (r.kind === 'energy') {
      const en = el('div', 'd4-chip d4-chip--sky', { 'data-qa': 'results-energy' });
      en.innerHTML = icon('bolt', { size: 15 });
      const enTxt = el('span');
      enTxt.textContent = `${t('results.carryLabel')}: ${r.value}`;
      en.appendChild(enTxt);
      rows.appendChild(en);
    } else if (r.kind === 'next') {
      const prog = el('div', 'd4-results-progress', { 'data-qa': 'results-progress' });
      const barRow = el('div', 'd4-results-bar-row');
      const flagWrap = el('span', 'd4-results-flag-orb');
      flagWrap.innerHTML = icon('flag', { size: 15 });
      const bar = el('div', 'd4-results-bar');
      const fill = el('div', 'd4-results-bar-fill');
      fill.style.setProperty('--fill', `${Math.round(r.fill * 100)}%`);
      bar.appendChild(fill);
      const lvlChip = el('span', 'd4-chip d4-chip--gold d4-results-cp-chip');
      lvlChip.textContent = r.requiresClear ? t('results.nextCpClear', { level: r.level }) : t('results.nextCp', { level: r.level });
      barRow.append(flagWrap, bar, lvlChip);
      prog.appendChild(barRow);
      rows.appendChild(prog);
    }
  }
  if (v?.firstRunTip) {
    const tip = el('p', 'd4-results-tip', { 'data-qa': 'results-tip' });
    tip.textContent = v.firstRunTip;
    rows.appendChild(tip);
  }

  // Footer Actions: Play Again + Home + Cyan Skills Orb (when any skill unlocked)
  const footer = el('footer', 'd4-results-footer');
  const again = (): void => {
    synth.play('uiTap');
    bridge.playAgain();
  };
  const againBtn = ctaButton('results-again', t('playAgain'), 'green', again);
  againBtn.insertAdjacentHTML('afterbegin', mysticPlayIcon());
  againBtn.classList.add('d4-home-play');
  if (!isReducedMotion(root)) againBtn.classList.add('is-idle');

  const subRow = el('div', 'd4-results-sub-actions');
  const homeBtn = el('button', 'd4-btn d4-btn--neutral d4-results-home-btn', {
    type: 'button',
    'data-qa': 'results-home',
  });
  homeBtn.innerHTML = `${icon('home', { size: 20 })}<span>${t('results.home')}</span>`;
  homeBtn.addEventListener('click', () => {
    synth.play('uiTap');
    bridge.goHome();
  });
  subRow.appendChild(homeBtn);

  const lm = session.loadoutModel();
  if (lm.slotCount >= 1 && lm.unlocked.length > 0) {
    const skillsBtn = roundIconBtn('bolt', 'results-skills', t('results.skills'), () => {
      synth.play('uiTap');
      bridge.goLoadout();
    });
    skillsBtn.innerHTML = mysticBoltIcon();
    skillsBtn.classList.add('d4-results-skills-orb');
    subRow.appendChild(skillsBtn);
  }
  footer.append(againBtn, subRow);

  screen.append(navBar, top, stats, rows, footer);
  const disposeBackdrop = mountMysticBackdrop(screen);
  root.appendChild(screen);

  // Trigger mascot reaction & score odometer
  if (isWin || isGold) hero.react('celebrate');
  else hero.react('hurt');

  const targetScore = v?.score ?? 0;
  let confettiTimer: number | null = null;
  const cancelCount = countUp(scoreEl, 0, targetScore, MOTION.countUpMs, clock);
  if (isGold) {
    const fireGold = (): void => {
      synth.play('unlock');
      const r = stage.getBoundingClientRect();
      confettiDisposers.push(burstConfetti(stage, r.width / 2 || 140, r.height / 2 || 60));
    };
    if (isReducedMotion(screen) || targetScore === 0) fireGold();
    else confettiTimer = clock.setTimeout(fireGold, MOTION.countUpMs);
  }

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (document.activeElement instanceof HTMLButtonElement) return;
    e.preventDefault();
    again();
  };
  document.addEventListener('keydown', onKeyDown);
  const cancelStagger = staggerEnter(screen, { clock });

  return () => {
    cancelStagger();
    cancelCount();
    if (confettiTimer !== null) clock.clearTimeout(confettiTimer);
    document.removeEventListener('keydown', onKeyDown);
    hero.destroy();
    for (const d of confettiDisposers) d();
    disposeBackdrop();
    screen.remove();
  };
};
