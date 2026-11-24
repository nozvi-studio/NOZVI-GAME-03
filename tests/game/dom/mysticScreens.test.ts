// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import main from '../../../src/game/main.ts?raw';
import { memoryStore } from '../../../src/meta';
import { createSession } from '../../../src/session';
import { icon } from '../../../src/game/dom/icons';
import { mountMysticBackdrop } from '../../../src/game/dom/mysticBackdrop';
import { mysticMangoIcon, mysticSettingIcon } from '../../../src/game/dom/mysticIcons';
import { charactersScreen } from '../../../src/game/dom/screens/charactersScreen';
import { createHomeScreen } from '../../../src/game/dom/screens/homeScreen';
import { loadoutScreen } from '../../../src/game/dom/screens/loadoutScreen';
import { resultsScreen } from '../../../src/game/dom/screens/resultsScreen';
import { settingsScreen } from '../../../src/game/dom/screens/settingsScreen';
import type { UiBridge } from '../../../src/game/dom/uiBridge';
import { t } from '../../../src/game/text';
import { loadBalance } from '../../support/balance';
import { FakeClock } from './fakeClock';
import { readRepoText } from './readText';

function makeBridge() {
  const balance = loadBalance();
  const session = createSession({ balance, store: memoryStore(), newSeed: () => 1, now: () => 0 });
  const synth = { unlock: vi.fn(), setOn: vi.fn(), play: vi.fn(), buzz: vi.fn() };
  const bridge: UiBridge = {
    session, balance, synth, t,
    overlays: { isModalOpen: () => false, showPause: vi.fn(), hidePause: vi.fn(), countdown: vi.fn(), deathCard: vi.fn(), hideAll: vi.fn() },
    open: () => Symbol('x'), close: () => true, startRun: vi.fn(), playAgain: vi.fn(),
    goSettings: vi.fn(), goCharacters: vi.fn(), goLoadout: vi.fn(), goHome: vi.fn(),
    openSettingsOverlay: vi.fn(), syncReducedMotion: vi.fn(),
    pause: vi.fn(), resume: vi.fn(), quitToHome: vi.fn(),
  };
  return bridge;
}

describe('Mystic Art Direction — Home, Settings & Characters', () => {
  it('replaces characters person icon with a crown in the same stroke style', () => {
    const svg = icon('characters');
    expect(svg).not.toContain('<circle');
    expect(svg).toContain('<path');
    expect(svg).toContain('fill-opacity="0.22"');
  });

  it('mysticIcons render valid decorative SVGs with no scripts or handlers', () => {
    const samples = [
      mysticSettingIcon('sound'),
      mysticSettingIcon('haptics'),
      mysticSettingIcon('dpad'),
      mysticSettingIcon('reducedMotion'),
      mysticMangoIcon(),
    ];
    const host = document.createElement('div');
    for (const markup of samples) {
      expect(markup).not.toMatch(/<script/i);
      expect(markup).not.toMatch(/\son\w+=/i);
      host.innerHTML = markup;
      const svg = host.firstElementChild as SVGElement;
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('mountMysticBackdrop adds Aqua Marsh layer, 8 fireflies, body band class and cleans up', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const dispose = mountMysticBackdrop(el);
    expect(el.classList.contains('d4-mystic')).toBe(true);
    expect(document.body.classList.contains('d4-mystic-band')).toBe(true);
    expect(el.querySelectorAll('.d4-firefly').length).toBe(8);
    dispose();
    expect(el.querySelector('.d4-mystic-bg')).toBeNull();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);
    el.remove();
  });

  it('Home, Settings and Characters mount Mystic backdrop, async WebP avatars, in-place toggles and clean layouts', () => {
    const bridge = makeBridge();
    const clock = new FakeClock();
    const root = document.createElement('div');
    document.body.appendChild(root);

    // Home: clean (no bubble, no mango, no checkpoint pill)
    const cleanHome = createHomeScreen()(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-home.d4-mystic')).not.toBeNull();
    expect(root.querySelector('[data-qa="home-bubble"]')).toBeNull();
    expect(root.querySelector('[data-qa="home-mango"]')).toBeNull();
    expect(root.querySelector('[data-qa="home-status"]')).toBeNull();
    expect(root.querySelector<HTMLImageElement>('.d4-hero-img')?.getAttribute('decoding')).toBe('async');
    cleanHome();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);

    // Settings full-screen: clean rows without subtitles or autosave note; toggles update in-place for smooth CSS transitions
    const cleanSettings = settingsScreen(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-settings.d4-mystic')).not.toBeNull();
    expect(root.querySelectorAll('.d4-settings-icon svg').length).toBe(4);
    expect(root.querySelector('.d4-settings-row-sub')).toBeNull();
    expect(root.querySelector('.d4-settings-note')).toBeNull();
    const soundBtn = root.querySelector<HTMLButtonElement>('[data-qa="settings-sound"]')!;
    soundBtn.click();
    expect(root.querySelector('[data-qa="settings-sound"]')).toBe(soundBtn);
    cleanSettings();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);

    // Settings overlay from Pause
    const cleanOverlay = settingsScreen(root, { bridge, debug: false, clock, params: { overlay: true } }) || (() => {});
    expect(root.querySelector('.d4-settings-sheet.d4-mystic-sheet')).not.toBeNull();
    cleanOverlay();

    // Characters: no perk description line
    const cleanChars = charactersScreen(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-chars.d4-mystic')).not.toBeNull();
    expect(root.querySelector('[data-qa="chars-perk"]')).toBeNull();
    const tileImgs = root.querySelectorAll<HTMLImageElement>('.d4-tile-img');
    expect(tileImgs.length).toBe(5);
    for (const img of tileImgs) {
      expect(img.getAttribute('src')).toMatch(/^\/skins\/[a-z]+\.webp$/);
      expect(img.getAttribute('decoding')).toBe('async');
    }
    cleanChars();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);

    // Results (Game Over — stats-only, no character face, star icon on checkpoint chip)
    bridge.session.startRun(1, 'home');
    bridge.session.quit();
    const cleanResults = resultsScreen(root, { bridge, debug: false, clock }) || (() => {});
    expect(root.querySelector('.d4-results.d4-mystic')).not.toBeNull();
    expect(root.querySelector('[data-qa="results-characters"]')).not.toBeNull();
    expect(root.querySelector('[data-qa="results-settings"]')).not.toBeNull();
    expect(root.querySelector('.d4-hero')).toBeNull();
    cleanResults();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);

    // Loadout (2x2 cards with async WebP skill icons)
    const cleanLoadout = loadoutScreen(root, { bridge, debug: false, clock, params: { level: 5 } }) || (() => {});
    expect(root.querySelector('.d4-loadout.d4-mystic')).not.toBeNull();
    const skillImgs = root.querySelectorAll<HTMLImageElement>('.d4-skill-medallion .d4-skill-img');
    expect(skillImgs.length).toBe(4);
    for (const img of skillImgs) {
      expect(img.getAttribute('src')).toMatch(/^\/skills\/[a-zA-Z]+\.webp$/);
      expect(img.getAttribute('decoding')).toBe('async');
    }
    cleanLoadout();
    expect(document.body.classList.contains('d4-mystic-band')).toBe(false);
    root.remove();
  });

  it('mystic.css is imported in main.ts and includes responsive stage scaling, containment & reduced-motion guards', async () => {
    const css = await readRepoText('src/game/dom/styles/mystic.css');
    expect(main).toContain("import './dom/styles/mystic.css'");
    expect(css).toContain('transform: scale(var(--stage-scale, 1))');
    expect(css).toContain('contain: layout style paint');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('.reduced-motion .d4-firefly');
  });
});
