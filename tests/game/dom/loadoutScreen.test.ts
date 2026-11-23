// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { loadoutScreen } from '../../../src/game/dom/screens/loadoutScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';

function mountLoadout() {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const orig = session.loadoutModel.bind(session);
  session.loadoutModel = () => ({ ...orig(), slotCount: 2, unlocked: ['slowmo', 'tailSnip'], equipped: ['slowmo'] });
  const confirmSpy = vi.spyOn(session, 'confirmLoadout');
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const startRun = vi.fn();
  const goHome = vi.fn();
  const clock = new FakeClock();
  const bridge: UiBridge = {
    session, balance, synth, t,
    overlays: { isModalOpen: () => false, showPause: vi.fn(), hidePause: vi.fn(), countdown: vi.fn(), deathCard: vi.fn(), hideAll: vi.fn() },
    open: () => Symbol('x'), close: () => true, startRun, playAgain: vi.fn(),
    goSettings: vi.fn(), goCharacters: vi.fn(), goLoadout: vi.fn(), goHome,
    openSettingsOverlay: vi.fn(), syncReducedMotion: vi.fn(),
    pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  const cleanup = loadoutScreen(root, { bridge, debug: false, clock, params: { level: 5 } }) || (() => {});
  return { root, session, confirmSpy, synth, startRun, goHome, clock, cleanup };
}

describe('D4-P4-R3 Loadout DOM screen', () => {
  it('D4-P4-R3 renders slots and cards, rejects locked skill, equips unlocked skill and confirms on Go!', () => {
    const { root, confirmSpy, synth, startRun, goHome, clock, cleanup } = mountLoadout();
    expect(root.querySelector('[data-qa="loadout-title"]')).not.toBeNull();
    expect(root.querySelectorAll('.d4-loadout-slot').length).toBe(2);
    expect(root.querySelectorAll('.d4-skill').length).toBe(4);

    // Locked skill rejects with nope
    root.querySelector<HTMLButtonElement>('[data-qa="loadout-card-mangoRain"]')?.click();
    expect(synth.play).toHaveBeenCalledWith('nope');

    // Select slot 2 and pick tailSnip
    root.querySelector<HTMLButtonElement>('[data-qa="loadout-slot-1"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-qa="loadout-card-tailSnip"]')?.click();
    expect(root.querySelector('[data-qa="loadout-card-tailSnip"]')?.classList.contains('is-selected')).toBe(true);

    // Go! saves selection and starts run at level 5
    root.querySelector<HTMLButtonElement>('[data-qa="loadout-play"]')?.click();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(startRun).toHaveBeenCalledWith(5, false, 'home');

    // Back navigates Home
    root.querySelector<HTMLButtonElement>('[data-qa="loadout-back"]')?.click();
    expect(goHome).toHaveBeenCalledTimes(1);

    cleanup();
    clock.advance(1000);
    expect(clock.pending()).toBe(0);
    root.remove();
  });
});
