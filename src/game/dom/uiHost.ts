// D4-P1-R6 DOM overlay host: token-based mount/unmount, modal state, Escape, reduced-motion, Phaser loop/input hooks. Pure: no Phaser.
import { reduceMotion as defaultReduceMotion } from '../render/palette';
import type { LoopHooks } from './uiBridge';

export type MountKind = 'screen' | 'modal';

export interface MountSpec {
  id: string;
  kind: MountKind;
  render(el: HTMLElement): void | (() => void);
  onEscape?: () => void;
}

export interface UiHost {
  mount(spec: MountSpec): symbol;
  close(token: symbol): boolean;
  isModalOpen(): boolean;
  activeId(): string | null;
  syncReducedMotion(): void;
  dispose(): void;
}

export interface UiHostDeps {
  reduceMotion?: () => boolean;
  doc?: Document;
  bandLock?: (locked: boolean) => void;
}

interface ActiveView {
  token: symbol;
  spec: MountSpec;
  el: HTMLElement;
  cleanup?: () => void;
}

// D4-P1-R6 creates the DOM overlay host bound to #ui-root and injected Phaser loop/input hooks.
export function createUiHost(root: HTMLElement, hooks: LoopHooks, deps: UiHostDeps = {}): UiHost {
  const getReduced = deps.reduceMotion ?? defaultReduceMotion;
  const doc = deps.doc ?? (typeof document !== 'undefined' ? document : undefined);
  const bandLock = deps.bandLock;
  let active: ActiveView | null = null;
  let disposed = false;

  const applyScreenState = (enter: boolean): void => {
    if (enter) {
      const reduced = getReduced();
      const live = !reduced && (hooks.setMetaBg?.(true) ?? false);
      const liveSnake = live && (hooks.isSnakeRigReady?.() ?? false);
      root.classList.toggle('d4-live-bg', live);
      root.classList.toggle('d4-live-snake-hero', liveSnake);
      if (live) {
        hooks.canvasVisible(true);
        hooks.wake();
      } else {
        if (reduced) hooks.setMetaBg?.(false);
        hooks.sleep();
        hooks.canvasVisible(false);
      }
      bandLock?.(true);
    } else {
      hooks.setMetaBg?.(false);
      root.classList.remove('d4-live-bg', 'd4-live-snake-hero');
      bandLock?.(false);
      hooks.canvasVisible(true);
      hooks.wake();
    }
  };

  const syncReducedMotion = (): void => {
    root.classList.toggle('reduced-motion', getReduced());
    if (active?.spec.kind === 'screen') applyScreenState(true);
  };

  const applyKind = (kind: MountKind, enter: boolean): void => {
    if (kind === 'screen') {
      applyScreenState(enter);
    } else {
      hooks.inputEnabled(!enter);
      hooks.keyboardCapture(!enter);
    }
  };

  const unmountCurrent = (): void => {
    if (!active) return;
    const prev = active;
    active = null;
    prev.cleanup?.();
    prev.el.remove();
    applyKind(prev.spec.kind, false);
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!active || e.key !== 'Escape') return;
    if (active.spec.onEscape) {
      e.preventDefault();
      active.spec.onEscape();
    }
  };

  const mq = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const onMediaChange = (): void => { syncReducedMotion(); };

  doc?.addEventListener('keydown', onKeyDown, true);
  mq?.addEventListener?.('change', onMediaChange);
  syncReducedMotion();

  return {
    mount(spec: MountSpec): symbol {
      if (disposed) return Symbol('disposed');
      unmountCurrent();
      syncReducedMotion();
      const token = Symbol(spec.id);
      const el = (doc ?? root.ownerDocument).createElement('div');
      el.setAttribute('data-ui-active', '');
      el.dataset.qa = `ui-${spec.id}`;
      root.appendChild(el);
      applyKind(spec.kind, true);
      const cleanup = spec.render(el) || undefined;
      active = { token, spec, el, cleanup };
      return token;
    },
    close(token: symbol): boolean {
      if (!active || active.token !== token) return false;
      unmountCurrent();
      return true;
    },
    isModalOpen(): boolean {
      return active !== null;
    },
    activeId(): string | null {
      return active ? active.spec.id : null;
    },
    syncReducedMotion,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unmountCurrent();
      doc?.removeEventListener('keydown', onKeyDown, true);
      mq?.removeEventListener?.('change', onMediaChange);
    },
  };
}
