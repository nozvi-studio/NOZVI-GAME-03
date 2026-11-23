// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { setActiveSkin } from '../../../src/game/art/skins';
import { createHomeScreen } from '../../../src/game/dom/screens/homeScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';

function mountHome(opts: { debug?: boolean; debugLevel?: number | null; checkpoints?: number[]; coins?: number } = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  if (opts.coins) { for (let i = 0; i < Math.ceil(opts.coins / 500); i++) session.debugAddCoins(); }
  if (opts.checkpoints?.length) {
    const orig = session.homeModel.bind(session);
    session.homeModel = () => ({ ...orig(), checkpoints: opts.checkpoints!, defaultStart: Math.max(...opts.checkpoints!) });
  }
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const startRun = vi.fn();
  const goCharacters = vi.fn();
  const goSettings = vi.fn();
  const onInstallSummarize = vi.fn();
  const clock = new FakeClock();
  const bridge: UiBridge = {
    session, synth, t,
    open: () => Symbol('x'), close: () => true, startRun,
    goSettings, goCharacters, goHome: vi.fn(), pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  const screen = createHomeScreen({
    debugLevel: () => opts.debugLevel ?? null,
    exportLog: async () => {},
    onInstallSummarize,
  });
  const cleanup = screen(root, { bridge, debug: opts.debug === true, clock }) || (() => {});
  return { root, startRun, goCharacters, goSettings, onInstallSummarize, clock, cleanup };
}

describe('D4-P3-R2 Simplified Home DOM screen', () => {
  afterEach(() => setActiveSkin('snake'));

  it('D4-P3-R2 shows wordmark, bubble, equipped hero, PLAY and status; no stepper/L1/loadout/best', () => {
    setActiveSkin('capy');
    const { root, clock, cleanup } = mountHome();
    expect(root.querySelector('[data-qa="hero-capy"]')).not.toBeNull();
    expect(root.querySelector('[data-qa="home-bubble"]')?.textContent).toBe("Let's eat!");
    expect(root.querySelector('[data-qa="home-play"]')).not.toBeNull();
    const status = root.querySelector('[data-qa="home-status"]')!;
    expect(status.tagName).not.toBe('BUTTON');
    expect(status.getAttribute('role')).toBeNull();
    for (const removed of ['home-prev', 'home-next', 'home-l1', 'home-loadout', 'home-best']) {
      expect(root.querySelector(`[data-qa="${removed}"]`)).toBeNull();
    }
    clock.advance(100);
    const img = root.querySelector<HTMLImageElement>('.d4-hero-img')!;
    expect(img.getAttribute('src')).toBe('/skins/capy.webp');
    expect(img.style.getPropertyValue('--lean-x')).toMatch(/^-[\d.]+px$/); // leans toward the mango on the left
    cleanup();
    root.remove();
    expect(clock.pending()).toBe(0);
  });

  it('D4-P3-R2 PLAY uses highest checkpoint or debug level; Characters dot reflects affordability', () => {
    const { root, startRun, goCharacters, goSettings, cleanup } = mountHome({ checkpoints: [5, 10], coins: 500 });
    expect(root.querySelector('[data-qa="home-bubble"]')?.textContent).toBe('Ready for L10!');
    expect(root.querySelector('[data-qa="home-chars-dot"]')).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-qa="home-play"]')?.click();
    expect(startRun).toHaveBeenCalledWith(10, false);
    root.querySelector<HTMLButtonElement>('[data-qa="home-characters"]')?.click();
    expect(goCharacters).toHaveBeenCalledTimes(1);
    root.querySelector<HTMLButtonElement>('[data-qa="home-settings"]')?.click();
    expect(goSettings).toHaveBeenCalledTimes(1);
    cleanup();
    root.remove();
  });

  it('D4-P3-R3 Enter/Space starts run only when focus is not on a button; debug export & summarize only in debug', () => {
    const { root, startRun, onInstallSummarize, cleanup } = mountHome({ debug: true, debugLevel: 12 });
    expect(onInstallSummarize).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-qa="home-export"]')).not.toBeNull();

    const settingsBtn = root.querySelector<HTMLButtonElement>('[data-qa="home-settings"]')!;
    settingsBtn.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(startRun).not.toHaveBeenCalled();

    settingsBtn.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(startRun).toHaveBeenCalledWith(12, true);

    cleanup();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(startRun).toHaveBeenCalledTimes(1);
    root.remove();
  });
});
