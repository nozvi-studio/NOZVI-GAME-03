// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { renderDeathCard } from '../../../src/game/dom/overlays/deathCardOverlay';
import { skinPortraitUrl } from '../../../src/game/dom/heroStage';
import { FakeClock } from './fakeClock';
import { readRepoText } from './readText';

const mount = (hero?: Parameters<typeof renderDeathCard>[5]) => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const cleanup = renderDeathCard(root, { text: 'Oops' }, 0, vi.fn(), new FakeClock(), hero);
  return { root, cleanup };
};

describe('ANIM-SNAKE-R13 DeathCard centered dead hero', () => {
  it('ANIM-SNAKE-R13 no hero option keeps the plain frosted card', () => {
    const { root, cleanup } = mount();
    expect(root.querySelector('[data-qa="death-hero"]')).toBeNull();
    expect(root.querySelector('.d4-death-scrim')!.classList.contains('is-live-hero')).toBe(false);
    cleanup();
  });

  it('ANIM-SNAKE-R13 static fallback shows the skin portrait in a slot above the card', () => {
    const onSlot = vi.fn();
    const { root, cleanup } = mount({ skin: 'capy', live: false, onSlot });
    const slot = root.querySelector<HTMLElement>('[data-qa="death-hero"]')!;
    expect(slot).not.toBeNull();
    expect(slot.dataset.skin).toBe('capy');
    expect(slot.classList.contains('is-live')).toBe(false);
    expect(slot.querySelector('img')!.getAttribute('src')).toBe(skinPortraitUrl('capy'));
    expect(slot.nextElementSibling?.getAttribute('data-qa')).toBe('death-sheet');
    expect(root.querySelector('.d4-death-scrim')!.classList.contains('is-live-hero')).toBe(false);
    expect(onSlot).not.toHaveBeenCalled();
    cleanup();
  });

  it('ANIM-SNAKE-R13 live hero hides the portrait, drops the frost and hands the slot rect to Phaser', () => {
    const onSlot = vi.fn();
    const { root, cleanup } = mount({ skin: 'snake', live: true, onSlot });
    const slot = root.querySelector<HTMLElement>('[data-qa="death-hero"]')!;
    expect(slot.classList.contains('is-live')).toBe(true);
    const scrimEl = root.querySelector('.d4-death-scrim')!;
    expect(scrimEl.classList.contains('is-live-hero')).toBe(true);
    expect(scrimEl.classList.contains('is-frost')).toBe(false);
    expect(onSlot).toHaveBeenCalledTimes(1);
    const readRect = onSlot.mock.calls[0][0] as () => DOMRect;
    expect(typeof readRect().width).toBe('number');
    cleanup();
    expect(root.querySelector('[data-qa="death-hero"]')).toBeNull();
  });

  it('ANIM-SNAKE-R13 css hides the live portrait and stacks the hero above the sheet', async () => {
    const css = await readRepoText('src/game/dom/styles/overlays.css');
    expect(css).toMatch(/\.d4-death-scrim[^{]*\{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/\.d4-death-hero\.is-live img[^{]*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.d4-death-scrim\.is-live-hero[^{]*\{[^}]*backdrop-filter:\s*none/);
  });
});
