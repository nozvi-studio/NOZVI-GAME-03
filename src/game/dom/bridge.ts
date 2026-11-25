// D4-P3-R3 / D4-P4-R4 typed bridge over UiHost: token mounts, overlay port, Escape routing, and skin preload before Game. Pure: no Phaser.
import type { Balance } from '../../core';
import type { Session } from '../../session';
import type { SkinId } from '../art/skins';
import type { Synth } from '../audio/synth';
import { homeView } from '../flow/homeModel';
import { SETTINGS_CLOSED } from '../flow/settingsView';
import type { MotionClock } from './clock';
import { renderCountdown } from './overlays/countdownOverlay';
import { renderDeathCard } from './overlays/deathCardOverlay';
import { renderPause } from './overlays/pauseOverlay';
import type { OverlayPort, PauseHandlers, PhaserPort, ScreenCtx, ScreenId, ScreenRender, UiBridge } from './uiBridge';
import type { UiHost } from './uiHost';

export interface UiBridgeDeps {
  host: UiHost;
  root?: HTMLElement;
  session: Session;
  balance?: Balance;
  synth: Synth;
  t: UiBridge['t'];
  port: PhaserPort;
  screens: Partial<Record<ScreenId, ScreenRender>>;
  activeSkin: () => SkinId;
  debug: boolean;
  clock?: MotionClock;
}

// D4-P3-R3 / D4-P4-R4 typed bridge over UiHost: token mounts, overlay port, skin preload before Game.
export function createUiBridge(deps: UiBridgeDeps): UiBridge {
  let starting = false;
  let pauseToken: symbol | null = null;
  let deathToken: symbol | null = null;
  let settingsOverlayToken: symbol | null = null;
  let countdownLayer: HTMLElement | null = null;

  const ensureCountdownLayer = (): HTMLElement | null => {
    if (countdownLayer && countdownLayer.isConnected) return countdownLayer;
    const hostRoot = deps.root ?? (typeof document !== 'undefined' ? document.getElementById('ui-root') : null);
    if (!hostRoot) return null;
    const layer = hostRoot.ownerDocument.createElement('div');
    layer.className = 'd4-countdown-layer';
    layer.setAttribute('aria-hidden', 'true');
    hostRoot.appendChild(layer);
    countdownLayer = layer;
    return layer;
  };

  // D4-P4-R4 overlay port: modal tokens over the live GameScene canvas; countdown stays passive.
  const overlays: OverlayPort = {
    isModalOpen(): boolean {
      return deps.host.isModalOpen();
    },
    showPause(v, h: PauseHandlers): void {
      if (pauseToken && deps.host.activeId() === 'pause') return;
      pauseToken = deps.host.mount({
        id: 'pause',
        kind: 'modal',
        render: el => renderPause(el, v, h, () => deps.synth.play('uiTap')),
        onEscape: () => h.onResume(),
      });
    },
    hidePause(): void {
      if (!pauseToken) return;
      deps.host.close(pauseToken);
      pauseToken = null;
    },
    countdown(n, card): void {
      if (n === null && !countdownLayer) return;
      const layer = ensureCountdownLayer();
      if (!layer) return;
      renderCountdown(layer, n, card);
    },
    deathCard(opts, hero): void {
      deathToken = deps.host.mount({
        id: 'death',
        kind: 'modal',
        render: el => renderDeathCard(el, { ...opts, onChoice: c => {
          if (deathToken) {
            deps.host.close(deathToken);
            deathToken = null;
          }
          opts.onChoice(c);
        } }, deps.clock, hero),
      });
    },
    hideAll(): void {
      if (pauseToken) { deps.host.close(pauseToken); pauseToken = null; }
      if (deathToken) { deps.host.close(deathToken); deathToken = null; }
      if (settingsOverlayToken) { deps.host.close(settingsOverlayToken); settingsOverlayToken = null; }
      if (countdownLayer) {
        countdownLayer.remove();
        countdownLayer = null;
      }
    },
  };

  const bridge: UiBridge = {
    session: deps.session,
    balance: deps.balance,
    synth: deps.synth,
    t: deps.t,
    overlays,
    metaHero: deps.port.metaHero,
    open(id: ScreenId, params?: Record<string, unknown>): symbol {
      const render = deps.screens[id];
      if (!render) throw new Error(`no screen: ${id}`);
      const ctx: ScreenCtx = { bridge, debug: deps.debug, clock: deps.clock, params };
      const onEscape = id === 'characters' || id === 'results' || id === 'loadout'
        ? () => bridge.goHome()
        : id === 'settings'
          ? () => {
            const ret = typeof params?.returnTo === 'string' ? params.returnTo : 'Home';
            deps.port.startScene(ret as 'Home');
          }
          : undefined;
      return deps.host.mount({
        id,
        kind: 'screen',
        render: el => render(el, ctx),
        onEscape,
      });
    },
    close(token: symbol): boolean {
      return deps.host.close(token);
    },
    startRun(level?: number, debugRun = false, source: 'home' | 'results' = 'home'): void {
      if (starting) return;
      starting = true;
      deps.synth.unlock();
      const targetLevel = level ?? homeView(deps.session.homeModel()).playLevel;
      deps.port.ensureSkins([deps.activeSkin()], () => {
        starting = false;
        deps.port.startScene('Game', { level: targetLevel, source, debug: debugRun });
      });
    },
    playAgain(): void {
      const lvl = deps.session.lastStartLevel() ?? homeView(deps.session.homeModel()).playLevel;
      bridge.startRun(lvl, false, 'results');
    },
    goCharacters(): void {
      deps.port.startScene('Characters', { debug: deps.debug });
    },
    goSettings(): void {
      deps.port.startScene('Settings', { returnTo: 'Home' });
    },
    goLoadout(level?: number): void {
      const lvl = level ?? deps.session.lastStartLevel() ?? homeView(deps.session.homeModel()).playLevel;
      deps.port.startScene('Loadout', { level: lvl, debug: deps.debug });
    },
    goHome(): void {
      deps.port.startScene('Home');
    },
    openSettingsOverlay(onClosed: () => void): void {
      const render = deps.screens.settings;
      if (!render) return;
      overlays.hidePause();
      let closed = false;
      const finish = (): void => {
        if (closed) return;
        closed = true;
        if (settingsOverlayToken) {
          deps.host.close(settingsOverlayToken);
          settingsOverlayToken = null;
        }
        deps.port.emit?.(SETTINGS_CLOSED);
        onClosed();
      };
      const ctx: ScreenCtx = {
        bridge,
        debug: deps.debug,
        clock: deps.clock,
        params: { overlay: true, onClosed: finish },
      };
      settingsOverlayToken = deps.host.mount({
        id: 'settings',
        kind: 'modal',
        render: el => render(el, ctx),
        onEscape: finish,
      });
    },
    syncReducedMotion(): void {
      deps.host.syncReducedMotion();
    },
    pause(): void {},
    resume(): void {},
    quitToHome(): void {
      overlays.hideAll();
      deps.port.startScene('Home');
    },
  };
  return bridge;
}
