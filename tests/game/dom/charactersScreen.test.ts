// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { activeSkin, setActiveSkin } from '../../../src/game/art/skins';
import { setCelebrationFx } from '../../../src/game/dom/confetti';
import { charactersScreen } from '../../../src/game/dom/screens/charactersScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';

function mountChars(debug = false) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const goHome = vi.fn();
  const clock = new FakeClock();
  const bridge: UiBridge = {
    session, synth, t,
    open: () => Symbol('x'), close: () => true, startRun: vi.fn(),
    goSettings: vi.fn(), goCharacters: vi.fn(), goHome, pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  const cleanup = charactersScreen(root, { bridge, debug, clock }) || (() => {});
  return { root, session, synth, goHome, clock, cleanup, balance };
}

describe('D4-P3-R1 Characters DOM screen', () => {
  afterEach(() => {
    setActiveSkin('snake');
    setCelebrationFx(null);
  });

  it('D4-P3-R1 renders header, stage hero, identity, 6 tiles and equipped action', () => {
    const { root, clock, cleanup } = mountChars();
    expect(root.querySelector('[data-qa="chars-title"]')?.textContent).toBe('CHARACTERS');
    expect(root.querySelector('[data-qa="chars-name"]')?.textContent).toBe('Mango Snake');
    expect(root.querySelector('[data-qa="chars-action"]')?.textContent).toContain('Equipped');
    expect(root.querySelector<HTMLButtonElement>('[data-qa="chars-token-soon"]')?.disabled).toBe(true);
    for (const btn of root.querySelectorAll('button')) {
      expect(btn.dataset.qa).toBeTruthy();
    }
    cleanup();
    root.remove();
    expect(clock.pending()).toBe(0);
  });

  it('D4-P3-R1 buy deducts coins, equips, plays unlock, celebrates and bursts confetti', () => {
    const burst = vi.fn(() => () => {});
    setCelebrationFx({ burst });
    const { root, session, synth, clock, cleanup } = mountChars(true);
    root.querySelector<HTMLButtonElement>('[data-qa="chars-debug-coins"]')?.click();
    clock.advance(400);
    expect(session.skinsModel().coins).toBe(500);

    const heroBefore = root.querySelector('[data-qa^="hero-"]');
    root.querySelector<HTMLButtonElement>('[data-qa="chars-token-ginger"]')?.click();
    expect(root.querySelector('[data-qa^="hero-"]')).toBe(heroBefore);

    root.querySelector<HTMLButtonElement>('[data-qa="chars-action"]')?.click();
    clock.advance(400);
    expect(session.skinsModel()).toMatchObject({ coins: 200, equipped: 'ginger' });
    expect(activeSkin()).toBe('ginger');
    expect(synth.play).toHaveBeenCalledWith('unlock');
    expect(burst).toHaveBeenCalledTimes(1);
    expect(root.querySelector('[data-qa="chars-coins"] .d4-num')?.textContent).toBe('200');
    cleanup();
    root.remove();
    expect(clock.pending()).toBe(0);
  });

  it('D4-P3-R1 need state plays nope, denies hero, leaves coins unchanged; equip works; Back goes Home', () => {
    const { root, session, synth, goHome, clock, cleanup } = mountChars();
    root.querySelector<HTMLButtonElement>('[data-qa="chars-token-capy"]')?.click();
    expect(root.querySelector('[data-qa="chars-action"]')?.textContent).toContain('Need 800 more');
    root.querySelector<HTMLButtonElement>('[data-qa="chars-action"]')?.click();
    expect(synth.play).toHaveBeenCalledWith('nope');
    expect(root.querySelector<HTMLElement>('[data-qa="hero-capy"]')?.dataset.reaction).toBe('denied');
    expect(session.skinsModel().coins).toBe(0);

    session.debugAddCoins();
    session.buySkin('pup');
    session.equipSkin('snake');
    root.querySelector<HTMLButtonElement>('[data-qa="chars-token-pup"]')?.click();
    expect(root.querySelector('[data-qa="chars-action"]')?.textContent).toContain('EQUIP');
    root.querySelector<HTMLButtonElement>('[data-qa="chars-action"]')?.click();
    expect(session.skinsModel().equipped).toBe('pup');
    expect(activeSkin()).toBe('pup');

    root.querySelector<HTMLButtonElement>('[data-qa="chars-back"]')?.click();
    expect(goHome).toHaveBeenCalledTimes(1);
    cleanup();
    root.remove();
    expect(clock.pending()).toBe(0);
  });
});
