// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { settingsScreen } from '../../../src/game/dom/screens/settingsScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';

function mountSettings(params?: Record<string, unknown>) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const goHome = vi.fn();
  const syncReducedMotion = vi.fn();
  const clock = new FakeClock();
  const bridge: UiBridge = {
    session, balance, synth, t,
    overlays: { isModalOpen: () => false, showPause: vi.fn(), hidePause: vi.fn(), countdown: vi.fn(), deathCard: vi.fn(), hideAll: vi.fn() },
    open: () => Symbol('x'), close: () => true, startRun: vi.fn(), playAgain: vi.fn(),
    goSettings: vi.fn(), goCharacters: vi.fn(), goLoadout: vi.fn(), goHome,
    openSettingsOverlay: vi.fn(), syncReducedMotion,
    pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  const cleanup = settingsScreen(root, { bridge, debug: false, clock, params }) || (() => {});
  return { root, session, synth, goHome, syncReducedMotion, clock, cleanup };
}

describe('D4-P4-R2 Settings DOM screen', () => {
  it('D4-P4-R2 full screen renders 4 switches, persists toggles immediately, syncs reducedMotion and Back goes Home', () => {
    const { root, session, synth, goHome, syncReducedMotion, clock, cleanup } = mountSettings({ returnTo: 'Home' });
    expect(root.querySelector('[data-qa="settings-title"]')?.textContent).toBe('Settings');
    const switches = root.querySelectorAll('[role="switch"]');
    expect(switches.length).toBe(4);

    const beforeSound = session.save().settings.sound;
    root.querySelector<HTMLButtonElement>('[data-qa="settings-sound"]')?.click();
    expect(session.save().settings.sound).toBe(!beforeSound);
    expect(synth.setOn).toHaveBeenCalledWith(!beforeSound);

    root.querySelector<HTMLButtonElement>('[data-qa="settings-reducedMotion"]')?.click();
    expect(syncReducedMotion).toHaveBeenCalledTimes(1);

    root.querySelector<HTMLButtonElement>('[data-qa="settings-back"]')?.click();
    expect(goHome).toHaveBeenCalledTimes(1);

    cleanup();
    expect(clock.pending()).toBe(0);
    root.remove();
  });

  it('D4-P4-R2 overlay mode renders inside a frosted sheet and Back invokes onClosed instead of goHome', () => {
    const onClosed = vi.fn();
    const { root, goHome, cleanup } = mountSettings({ overlay: true, onClosed });
    expect(root.querySelector('[data-qa="settings-sheet"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-qa="settings-back"]')?.click();
    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(goHome).not.toHaveBeenCalled();
    cleanup();
    root.remove();
  });
});
