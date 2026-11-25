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

  const mountDeath = (lockMs = 300) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const clock = new FakeClock();
    const onChoice = vi.fn();
    const cleanup = renderDeathCard(root, { lockMs, continueMs: 5000, onChoice }, clock);
    const q = (qa: string) => root.querySelector<HTMLElement>(`[data-qa="${qa}"]`)!;
    return { root, clock, onChoice, cleanup, q };
  };

  it('GAMEOVER-R1..R3 layout: GAME OVER title, hero slot, Play again + Continue with a 5 s countdown', () => {
    const { q, cleanup, root } = mountDeath();
    expect(q('death-title').textContent).toBe('GAME OVER');
    expect(root.querySelector('[data-qa="death-line"]')).toBeNull();
    expect(q('death-hero')).not.toBeNull();
    expect(q('death-again').textContent).toBe('Play again');
    expect(q('death-continue').dataset.mode).toBe('continue');
    expect(q('death-count').textContent).toBe('5');
    cleanup(); root.remove();
  });

  it('GAMEOVER-R3/R4 countdown ticks; Continue is a placeholder; at 0 it becomes Result', () => {
    const { q, clock, onChoice, cleanup, root } = mountDeath();
    clock.advance(300);
    q('death-continue').click(); expect(onChoice).not.toHaveBeenCalled();
    clock.advance(1000); expect(q('death-count').textContent).toBe('4');
    clock.advance(4000);
    expect(q('death-continue').dataset.mode).toBe('results');
    expect(q('death-continue').textContent).toBe('Result');
    q('death-continue').click(); q('death-continue').click();
    expect(onChoice).toHaveBeenCalledTimes(1); expect(onChoice).toHaveBeenCalledWith('results');
    cleanup(); expect(clock.pending()).toBe(0); root.remove();
  });

  it('GAMEOVER-R5 Play again is locked for lockMs, then fires once with again', () => {
    const { q, clock, onChoice, cleanup, root } = mountDeath();
    q('death-again').click(); expect(onChoice).not.toHaveBeenCalled();
    clock.advance(300);
    q('death-again').click(); q('death-again').click();
    expect(onChoice).toHaveBeenCalledTimes(1); expect(onChoice).toHaveBeenCalledWith('again');
    cleanup(); expect(clock.pending()).toBe(0); root.remove();
  });
});
