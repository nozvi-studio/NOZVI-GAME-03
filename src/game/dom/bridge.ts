// D4-P3-R3 typed bridge over UiHost: token mounts, Escape routing, and skin preload before Game. Pure: no Phaser.
import type { Session } from '../../session';
import type { SkinId } from '../art/skins';
import type { Synth } from '../audio/synth';
import { homeView } from '../flow/homeModel';
import type { MotionClock } from './clock';
import type { PhaserPort, ScreenCtx, ScreenId, ScreenRender, UiBridge } from './uiBridge';
import type { UiHost } from './uiHost';

export interface UiBridgeDeps {
  host: UiHost;
  session: Session;
  synth: Synth;
  t: UiBridge['t'];
  port: PhaserPort;
  screens: Partial<Record<ScreenId, ScreenRender>>;
  activeSkin: () => SkinId;
  debug: boolean;
  clock?: MotionClock;
}

// D4-P3-R3 typed bridge over UiHost: token mounts, skin preload before Game.
export function createUiBridge(deps: UiBridgeDeps): UiBridge {
  let starting = false;

  const bridge: UiBridge = {
    session: deps.session,
    synth: deps.synth,
    t: deps.t,
    open(id: ScreenId): symbol {
      const render = deps.screens[id];
      if (!render) throw new Error(`no screen: ${id}`);
      const ctx: ScreenCtx = { bridge, debug: deps.debug, clock: deps.clock };
      return deps.host.mount({
        id,
        kind: 'screen',
        render: el => render(el, ctx),
        onEscape: id === 'characters' ? () => bridge.goHome() : undefined,
      });
    },
    close(token: symbol): boolean {
      return deps.host.close(token);
    },
    startRun(level?: number, debugRun = false): void {
      if (starting) return;
      starting = true;
      deps.synth.unlock();
      const targetLevel = level ?? homeView(deps.session.homeModel()).playLevel;
      deps.port.ensureSkins([deps.activeSkin()], () => {
        starting = false;
        deps.port.startScene('Game', { level: targetLevel, source: 'home', debug: debugRun });
      });
    },
    goCharacters(): void {
      deps.port.startScene('Characters', { debug: deps.debug });
    },
    goSettings(): void {
      deps.port.startScene('Settings', { returnTo: 'Home' });
    },
    goHome(): void {
      deps.port.startScene('Home');
    },
    pause(): void {},
    resume(): void {},
    quitToHome(): void {
      deps.port.startScene('Home');
    },
  };
  return bridge;
}
