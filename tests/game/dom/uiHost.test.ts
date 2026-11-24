// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { createUiHost } from '../../../src/game/dom/uiHost';
import type { LoopHooks } from '../../../src/game/dom/uiBridge';

const domSources = import.meta.glob('../../../src/game/dom/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function makeHooks(): LoopHooks {
  return {
    sleep: vi.fn(),
    wake: vi.fn(),
    inputEnabled: vi.fn(),
    keyboardCapture: vi.fn(),
    canvasVisible: vi.fn(),
  };
}

describe('D4-P1-R6 uiHost', () => {
  it('D4-P1-R6 mount renders into #ui-root with data-qa and pointer events enabled', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const host = createUiHost(root, makeHooks());
    const tok = host.mount({
      id: 'home',
      kind: 'screen',
      render: el => { el.textContent = 'hello'; },
    });
    const node = root.querySelector('[data-qa="ui-home"]');
    expect(node?.textContent).toBe('hello');
    expect(node?.hasAttribute('data-ui-active')).toBe(true);
    expect(host.activeId()).toBe('home');
    host.close(tok);
    host.dispose();
    root.remove();
  });

  it('D4-P1-R6 close with a stale token does nothing', () => {
    const root = document.createElement('div');
    const host = createUiHost(root, makeHooks());
    const tokA = host.mount({ id: 'a', kind: 'screen', render: () => {} });
    host.mount({ id: 'b', kind: 'screen', render: () => {} });
    expect(host.close(tokA)).toBe(false);
    expect(host.activeId()).toBe('b');
    host.dispose();
  });

  it('D4-P1-R6 screen mount sleeps the loop and hides the canvas; close wakes it', () => {
    const root = document.createElement('div');
    const hooks = makeHooks();
    const bandLock = vi.fn();
    const host = createUiHost(root, hooks, { bandLock });
    const tok = host.mount({ id: 'home', kind: 'screen', render: () => {} });
    expect(hooks.sleep).toHaveBeenCalledTimes(1);
    expect(hooks.canvasVisible).toHaveBeenCalledWith(false);
    expect(bandLock).toHaveBeenCalledWith(true);
    expect(host.close(tok)).toBe(true);
    expect(hooks.canvasVisible).toHaveBeenCalledWith(true);
    expect(hooks.wake).toHaveBeenCalledTimes(1);
    expect(bandLock).toHaveBeenCalledWith(false);
    host.dispose();
  });

  it('D4-P1-R6 modal mount disables Phaser input and keyboard capture; close restores them', () => {
    const root = document.createElement('div');
    const hooks = makeHooks();
    const host = createUiHost(root, hooks);
    const tok = host.mount({ id: 'pause', kind: 'modal', render: () => {} });
    expect(hooks.inputEnabled).toHaveBeenCalledWith(false);
    expect(hooks.keyboardCapture).toHaveBeenCalledWith(false);
    expect(host.isModalOpen()).toBe(true);
    host.close(tok);
    expect(hooks.inputEnabled).toHaveBeenCalledWith(true);
    expect(hooks.keyboardCapture).toHaveBeenCalledWith(true);
    expect(host.isModalOpen()).toBe(false);
    host.dispose();
  });

  it('D4-P1-R6 Escape calls onEscape only when a view is open', () => {
    const root = document.createElement('div');
    const host = createUiHost(root, makeHooks());
    const onEscape = vi.fn();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onEscape).not.toHaveBeenCalled();
    const tok = host.mount({ id: 'chars', kind: 'screen', render: () => {}, onEscape });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onEscape).toHaveBeenCalledTimes(1);
    host.close(tok);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onEscape).toHaveBeenCalledTimes(1);
    host.dispose();
  });

  it('D4-P1-R6 reduced-motion class follows reduceMotion()', () => {
    const root = document.createElement('div');
    let reduced = true;
    const host = createUiHost(root, makeHooks(), { reduceMotion: () => reduced });
    expect(root.classList.contains('reduced-motion')).toBe(true);
    reduced = false;
    host.syncReducedMotion();
    expect(root.classList.contains('reduced-motion')).toBe(false);
    host.dispose();
  });

  it('D4-P1-R6 replacing a view runs the previous cleanup and dispose removes listeners', () => {
    const root = document.createElement('div');
    const cleanup = vi.fn();
    const onEscape = vi.fn();
    const host = createUiHost(root, makeHooks());
    host.mount({ id: 'a', kind: 'screen', render: () => cleanup, onEscape });
    host.mount({ id: 'b', kind: 'screen', render: () => {} });
    expect(cleanup).toHaveBeenCalledTimes(1);
    host.dispose();
    expect(root.children.length).toBe(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('META-BG-R1/R5 live meta background keeps canvas visible & awake and toggles cleanly on reduced motion', () => {
    const root = document.createElement('div');
    let reduced = false;
    const setMetaBg = vi.fn((active: boolean) => active);
    const hooks: LoopHooks = { ...makeHooks(), setMetaBg };
    const host = createUiHost(root, hooks, { reduceMotion: () => reduced });
    const tok = host.mount({ id: 'home', kind: 'screen', render: () => {} });

    expect(setMetaBg).toHaveBeenCalledWith(true);
    expect(root.classList.contains('d4-live-bg')).toBe(true);
    expect(hooks.canvasVisible).toHaveBeenLastCalledWith(true);
    expect(hooks.wake).toHaveBeenCalledTimes(1);
    expect(hooks.sleep).not.toHaveBeenCalled();

    reduced = true;
    host.syncReducedMotion();
    expect(setMetaBg).toHaveBeenLastCalledWith(false);
    expect(root.classList.contains('d4-live-bg')).toBe(false);
    expect(hooks.sleep).toHaveBeenCalledTimes(1);
    expect(hooks.canvasVisible).toHaveBeenLastCalledWith(false);

    reduced = false;
    host.syncReducedMotion();
    expect(root.classList.contains('d4-live-bg')).toBe(true);
    expect(hooks.canvasVisible).toHaveBeenLastCalledWith(true);

    host.close(tok);
    expect(setMetaBg).toHaveBeenLastCalledWith(false);
    expect(root.classList.contains('d4-live-bg')).toBe(false);
    host.dispose();
  });

  it('D4-P1-R6 src/game/dom never imports phaser', () => {
    const entries = Object.entries(domSources);
    expect(entries.length).toBeGreaterThan(0);
    for (const [f, src] of entries) {
      expect(src, f).not.toMatch(/from\s+['"]phaser['"]/);
    }
  });
});
