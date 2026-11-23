// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { setActiveSkin } from '../../../src/game/art/skins';
import { setCelebrationFx } from '../../../src/game/dom/confetti';
import { resultsScreen } from '../../../src/game/dom/screens/resultsScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';

function mountResults(opts: { withRun?: boolean; unlockSkills?: boolean } = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  if (opts.withRun !== false) {
    session.startRun(1, 'home');
    session.quit();
  }
  if (opts.unlockSkills) {
    const orig = session.loadoutModel.bind(session);
    session.loadoutModel = () => ({ ...orig(), slotCount: 1, unlocked: ['slowmo'] });
  }
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const playAgain = vi.fn();
  const goHome = vi.fn();
  const goLoadout = vi.fn();
  const clock = new FakeClock();
  const bridge: UiBridge = {
    session, balance, synth, t,
    overlays: { isModalOpen: () => false, showPause: vi.fn(), hidePause: vi.fn(), countdown: vi.fn(), deathCard: vi.fn(), hideAll: vi.fn() },
    open: () => Symbol('x'), close: () => true, startRun: vi.fn(), playAgain,
    goSettings: vi.fn(), goCharacters: vi.fn(), goLoadout, goHome,
    openSettingsOverlay: vi.fn(), syncReducedMotion: vi.fn(),
    pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  const cleanup = resultsScreen(root, { bridge, debug: false, clock }) || (() => {});
  return { root, session, synth, playAgain, goHome, goLoadout, clock, cleanup };
}

describe('D4-P4-R1 Results DOM screen', () => {
  afterEach(() => {
    setActiveSkin('snake');
    setCelebrationFx(null);
  });

  it('D4-P4-R1 renders title, score, 3 stats, Play Again and Home; hides Skills when none unlocked', () => {
    const { root, playAgain, goHome, clock, cleanup } = mountResults();
    expect(root.querySelector('[data-qa="results-title"]')?.textContent).toBeTruthy();
    expect(root.querySelector('[data-qa="results-score"]')).not.toBeNull();
    expect(root.querySelectorAll('.d4-results-stat').length).toBe(3);
    expect(root.querySelector('[data-qa="results-skills"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-qa="results-again"]')?.click();
    expect(playAgain).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>('[data-qa="results-home"]')?.click();
    expect(goHome).toHaveBeenCalledTimes(1);

    cleanup();
    expect(clock.pending()).toBe(0);
    root.remove();
  });

  it('D4-P4-R1 shows Skills button when at least one skill is unlocked and navigates to Loadout', () => {
    const { root, goLoadout, cleanup } = mountResults({ unlockSkills: true });
    const skillsBtn = root.querySelector<HTMLButtonElement>('[data-qa="results-skills"]');
    expect(skillsBtn).not.toBeNull();
    skillsBtn?.click();
    expect(goLoadout).toHaveBeenCalledTimes(1);
    cleanup();
    root.remove();
  });
});
