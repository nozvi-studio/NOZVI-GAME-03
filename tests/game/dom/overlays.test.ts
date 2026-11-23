// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { renderCountdown } from '../../../src/game/dom/overlays/countdownOverlay';
import { renderDeathCard } from '../../../src/game/dom/overlays/deathCardOverlay';
import { toggle } from '../../../src/game/dom/overlays/overlayParts';
import { renderPause } from '../../../src/game/dom/overlays/pauseOverlay';
import { FakeClock } from './fakeClock';
import { readRepoText } from './readText';

describe('D4-P4-R4 DOM overlays & overlays.css', () => {
  it('D4-P4-R4 overlays.css has no raw hex colors and keeps countdown layer pointer-events: none', async () => {
    const css = await readRepoText('src/game/dom/styles/overlays.css');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toMatch(/\.d4-countdown-layer[\s\S]*?pointer-events:\s*none/);
  });

  it('D4-P4-R4 toggle switch exposes role=switch, aria-checked and toggles on click', () => {
    const onToggle = vi.fn();
    const sw = toggle('settings-sound', 'Sound', false, onToggle);
    expect(sw.el.getAttribute('role')).toBe('switch');
    expect(sw.el.getAttribute('aria-checked')).toBe('false');
    sw.set(true);
    expect(sw.el.getAttribute('aria-checked')).toBe('true');
    sw.el.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('D4-P4-R4 pauseOverlay renders level, biome, optional hint and dispatches Resume/Settings/Quit', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onResume = vi.fn();
    const onSettings = vi.fn();
    const onQuit = vi.fn();
    const tap = vi.fn();

    const cleanup = renderPause(
      root,
      {
        title: 'PAUSED',
        subtitle: 'Level 4 · Sunlit Orchard',
        chip: 'Checkpoint L5 next',
        buttons: [
          { id: 'resume', label: 'Resume', tone: 'green' },
          { id: 'settings', label: 'Settings', tone: 'cream' },
          { id: 'quit', label: 'Quit', tone: 'danger' },
        ],
      },
      { onResume, onSettings, onQuit },
      tap,
    );

    expect(root.querySelector('[data-qa="pause-title"]')?.textContent).toBe('PAUSED');
    expect(root.querySelector('[data-qa="pause-subtitle"]')?.textContent).toBe('Level 4 · Sunlit Orchard');
    expect(root.querySelector('[data-qa="pause-chip"]')?.textContent).toBe('Checkpoint L5 next');

    root.querySelector<HTMLButtonElement>('[data-qa="pause-resume"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-qa="pause-settings"]')?.click();
    root.querySelector<HTMLButtonElement>('[data-qa="pause-quit"]')?.click();
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(tap).toHaveBeenCalledTimes(3);

    cleanup();
    expect(root.children.length).toBe(0);
    root.remove();
  });

  it('D4-P4-R4 countdownOverlay renders 3..1, GO!, optional card and clears on null', () => {
    const layer = document.createElement('div');
    renderCountdown(layer, 3, { title: 'Level 1', subtitle: 'Eat mangoes' });
    expect(layer.querySelector('[data-qa="countdown-n"]')?.textContent).toBe('3');
    expect(layer.querySelector('[data-qa="countdown-card"]')?.textContent).toContain('Level 1');

    renderCountdown(layer, 'go', null);
    expect(layer.querySelector('[data-qa="countdown-n"]')?.textContent).toBe('GO!');
    expect(layer.querySelector('[data-qa="countdown-card"]')).toBeNull();

    renderCountdown(layer, null, null);
    expect(layer.innerHTML).toBe('');
  });

  it('D4-P4-R4 deathCard respects skipLockMs before allowing click/Enter/Space and fires once', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const clock = new FakeClock();
    const onContinue = vi.fn();

    const cleanup = renderDeathCard(root, { text: 'Bonked the wall!' }, 300, onContinue, clock);
    const scrimEl = root.querySelector<HTMLElement>('[data-qa="death-scrim"]')!;
    expect(root.querySelector('[data-qa="death-line"]')?.textContent).toBe('Bonked the wall!');
    expect(scrimEl.classList.contains('is-locked')).toBe(true);

    // Early click and key are ignored
    scrimEl.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onContinue).not.toHaveBeenCalled();

    // After lockMs, click fires exactly once
    clock.advance(300);
    expect(scrimEl.classList.contains('is-locked')).toBe(false);
    scrimEl.click();
    scrimEl.click();
    expect(onContinue).toHaveBeenCalledTimes(1);

    cleanup();
    expect(clock.pending()).toBe(0);
    root.remove();
  });
});
