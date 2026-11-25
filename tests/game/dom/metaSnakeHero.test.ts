// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { setActiveSkin } from '../../../src/game/art/skins';
import { setCelebrationFx } from '../../../src/game/dom/confetti';
import { charactersScreen } from '../../../src/game/dom/screens/charactersScreen';
import { createHomeScreen } from '../../../src/game/dom/screens/homeScreen';
import { loadoutScreen } from '../../../src/game/dom/screens/loadoutScreen';
import { resultsScreen } from '../../../src/game/dom/screens/resultsScreen';
import type { LoopHooks, MetaHeroPort, MetaHeroSlot, UiBridge } from '../../../src/game/dom/uiBridge';
import { createUiHost } from '../../../src/game/dom/uiHost';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';
import { readRepoText } from './readText';

function makeMetaHeroSpy() {
  const setSlot = vi.fn((_slot: MetaHeroSlot | null) => true);
  const play = vi.fn();
  const metaHero: MetaHeroPort = {
    setSlot,
    play,
    isLive: () => true,
  };
  return { metaHero, setSlot, play };
}

function makeBridge(metaHero: MetaHeroPort) {
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const bridge: UiBridge = {
    session,
    balance,
    synth,
    t,
    overlays: { isModalOpen: () => false, showPause: vi.fn(), hidePause: vi.fn(), countdown: vi.fn(), deathCard: vi.fn(), hideAll: vi.fn() },
    metaHero,
    open: () => Symbol('x'),
    close: () => true,
    startRun: vi.fn(),
    playAgain: vi.fn(),
    goSettings: vi.fn(),
    goCharacters: vi.fn(),
    goLoadout: vi.fn(),
    goHome: vi.fn(),
    openSettingsOverlay: vi.fn(),
    syncReducedMotion: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    quitToHome: vi.fn(),
  };
  return { bridge, session, synth };
}

afterEach(() => {
  setActiveSkin('snake');
  setCelebrationFx(null);
});

describe('ANIM-SNAKE-R10..R12 DOM meta screen bindings & fallback', () => {
  it('ANIM-SNAKE-R11 Home binds snake hero slot, emits poke on tap, and clears slot on unmount', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { metaHero, setSlot, play } = makeMetaHeroSpy();
    const { bridge } = makeBridge(metaHero);
    const clock = new FakeClock();

    const cleanup = createHomeScreen()(root, { bridge, debug: false, clock }) || (() => {});
    expect(setSlot).toHaveBeenCalledTimes(1);
    expect(setSlot.mock.calls[0]?.[0]).toMatchObject({ skin: 'snake' });

    const heroEl = root.querySelector<HTMLElement>('[data-qa="hero-snake"]')!;
    heroEl.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(play).toHaveBeenCalledWith('poke');

    cleanup();
    expect(setSlot).toHaveBeenLastCalledWith(null);
    root.remove();
  });

  it('ANIM-SNAKE-R11 Characters binds preview skin, emits poke/denied/celebrate, and clears on unmount', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    setCelebrationFx({ burst: vi.fn(() => () => {}) });
    const { metaHero, setSlot, play } = makeMetaHeroSpy();
    const { bridge, session } = makeBridge(metaHero);
    const clock = new FakeClock();

    const cleanup = charactersScreen(root, { bridge, debug: true, clock }) || (() => {});
    expect(setSlot).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 'snake' }));

    // Tap snake hero -> poke
    root.querySelector<HTMLElement>('[data-qa="hero-snake"]')?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(play).toHaveBeenCalledWith('poke');

    // Switch to locked capy -> updates slot skin to capy; clicking Need emits denied
    root.querySelector<HTMLButtonElement>('[data-qa="chars-token-capy"]')?.click();
    expect(setSlot).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 'capy' }));
    root.querySelector<HTMLButtonElement>('[data-qa="chars-action"]')?.click();
    expect(play).toHaveBeenCalledWith('denied');

    // Grant coins & buy ginger -> emits celebrate
    session.debugAddCoins();
    root.querySelector<HTMLButtonElement>('[data-qa="chars-token-ginger"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-qa="chars-action"]')?.click();
    expect(play).toHaveBeenCalledWith('celebrate');

    cleanup();
    expect(setSlot).toHaveBeenLastCalledWith(null);
    root.remove();
  });

  it('ANIM-SNAKE-R11 Results mounts celebrating snake hero on new best only, and keeps other skins/non-best unchanged', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    setCelebrationFx({ burst: vi.fn(() => () => {}) });
    const { metaHero, setSlot, play } = makeMetaHeroSpy();
    const { bridge, session } = makeBridge(metaHero);
    const clock = new FakeClock();

    // New best run with snake skin -> hero mounted + celebrate emitted
    session.summary = () => ({
      score: 120,
      bestScore: 120,
      newBest: true,
      level: 3,
      startLevel: 1,
      levelsCleared: 2,
      cause: 'wall',
      won: false,
      eaten: 12,
      biome: 1,
      newCheckpoints: [],
      carriedEnergy: 0,
      firstRun: false,
    });
    const cleanGold = resultsScreen(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-results-hero-wrap [data-qa="hero-snake"]')).not.toBeNull();
    expect(setSlot).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 'snake' }));
    clock.advance(1000);
    expect(play).toHaveBeenCalledWith('celebrate');
    cleanGold();
    expect(setSlot).toHaveBeenLastCalledWith(null);

    // Same new best with non-snake skin -> no hero mounted
    setActiveSkin('capy');
    setSlot.mockClear();
    const cleanCapy = resultsScreen(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-results-hero-wrap')).toBeNull();
    expect(setSlot).not.toHaveBeenCalled();
    cleanCapy();
    root.remove();
  });

  it('ANIM-SNAKE-R11 ANIM-CAT-R6 Loadout mounts the idle hero slot for rigged skins only (snake, ginger; not pup)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const { metaHero, setSlot } = makeMetaHeroSpy();
    const { bridge } = makeBridge(metaHero);
    const clock = new FakeClock();

    const cleanSnake = loadoutScreen(root, { bridge, debug: false, clock, params: { level: 5 } }) || (() => {});
    expect(root.querySelector('.d4-loadout-hero-wrap [data-qa="hero-snake"]')).not.toBeNull();
    expect(setSlot).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 'snake' }));
    cleanSnake();
    expect(setSlot).toHaveBeenLastCalledWith(null);

    setActiveSkin('ginger');
    setSlot.mockClear();
    const cleanGinger = loadoutScreen(root, { bridge, debug: false, clock, params: { level: 5 } }) || (() => {});
    expect(root.querySelector('.d4-loadout-hero-wrap [data-qa="hero-ginger"]')).not.toBeNull();
    expect(setSlot).toHaveBeenLastCalledWith(expect.objectContaining({ skin: 'ginger' }));
    cleanGinger();

    setActiveSkin('pup');
    setSlot.mockClear();
    const cleanPup = loadoutScreen(root, { bridge, debug: false, clock, params: { level: 5 } }) || (() => {});
    expect(root.querySelector('.d4-loadout-hero-wrap')).toBeNull();
    expect(setSlot).not.toHaveBeenCalled();
    cleanPup();
    root.remove();
  });

  it('ANIM-SNAKE-R12 uiHost toggles d4-live-snake-hero with live WebGL rig and clears on Reduce Motion; CSS hides only snake img', async () => {
    const root = document.createElement('div');
    let reduced = false;
    let snakeReady = true;
    const hooks: LoopHooks = {
      sleep: vi.fn(),
      wake: vi.fn(),
      inputEnabled: vi.fn(),
      keyboardCapture: vi.fn(),
      canvasVisible: vi.fn(),
      setMetaBg: active => active,
      isSnakeRigReady: () => snakeReady,
    };
    const host = createUiHost(root, hooks, { reduceMotion: () => reduced });
    const tok = host.mount({ id: 'home', kind: 'screen', render: () => {} });
    expect(root.classList.contains('d4-live-snake-hero')).toBe(true);

    reduced = true;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-snake-hero')).toBe(false);

    reduced = false;
    snakeReady = false;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-snake-hero')).toBe(false);

    snakeReady = true;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-snake-hero')).toBe(true);

    host.close(tok);
    expect(root.classList.contains('d4-live-snake-hero')).toBe(false);
    host.dispose();

    const css = await readRepoText('src/game/dom/styles/mystic.css');
    expect(css).toContain('#ui-root.d4-live-bg.d4-live-snake-hero .d4-hero[data-qa="hero-snake"] .d4-hero-img');
  });

  it('ANIM-CAT-R6 uiHost toggles live hero classes for ginger and tuxedo and mystic.css hides their DOM portraits only', async () => {
    const root = document.createElement('div');
    let reduced = false;
    let ready = true;
    const hooks: LoopHooks = {
      sleep: vi.fn(),
      wake: vi.fn(),
      inputEnabled: vi.fn(),
      keyboardCapture: vi.fn(),
      canvasVisible: vi.fn(),
      setMetaBg: active => active,
      isSnakeRigReady: () => ready,
    };
    const host = createUiHost(root, hooks, { reduceMotion: () => reduced });
    const tok = host.mount({ id: 'home', kind: 'screen', render: () => {} });
    expect(root.classList.contains('d4-live-snake-hero')).toBe(true);
    expect(root.classList.contains('d4-live-ginger-hero')).toBe(true);
    expect(root.classList.contains('d4-live-tuxedo-hero')).toBe(true);

    reduced = true;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-ginger-hero')).toBe(false);
    expect(root.classList.contains('d4-live-tuxedo-hero')).toBe(false);

    reduced = false;
    ready = false;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-ginger-hero')).toBe(false);
    expect(root.classList.contains('d4-live-tuxedo-hero')).toBe(false);

    ready = true;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-ginger-hero')).toBe(true);
    expect(root.classList.contains('d4-live-tuxedo-hero')).toBe(true);

    host.close(tok);
    expect(root.classList.contains('d4-live-ginger-hero')).toBe(false);
    expect(root.classList.contains('d4-live-tuxedo-hero')).toBe(false);
    host.dispose();

    const css = await readRepoText('src/game/dom/styles/mystic.css');
    expect(css).toContain('#ui-root.d4-live-bg.d4-live-ginger-hero .d4-hero[data-qa="hero-ginger"] .d4-hero-img');
    expect(css).toContain('#ui-root.d4-live-bg.d4-live-tuxedo-hero .d4-hero[data-qa="hero-tuxedo"] .d4-hero-img');
    expect(css).not.toContain('hero-pup');
    expect(css).not.toContain('hero-capy');
  });
});
