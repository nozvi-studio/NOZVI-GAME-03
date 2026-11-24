import Phaser from 'phaser';
import './dom/styles/tokens.css';
import './dom/styles/components.css';
import './dom/styles/motion.css';
import './dom/styles/screens.css';
import './dom/styles/overlays.css';
import './dom/styles/mystic.css';
import { installAudioUnlock } from './audio/synth';
import { startStageSync } from './dom/stageSync';
import type { LoopHooks } from './dom/uiBridge';
import { createUiHost } from './dom/uiHost';
import { BOARD, HEIGHT, WIDTH } from './layout';
import { ArtPreviewScene } from './scenes/ArtPreviewScene';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { HudScene } from './scenes/HudScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { META_BG_FAILED_EVENT, META_BG_KEY, META_BG_READY_EVENT, MetaBgScene } from './scenes/MetaBgScene';
import { ResultsScene } from './scenes/ResultsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { CharactersScene } from './scenes/CharactersScene';
import { rigbyPhaser } from './vendor/rigby2d/rigby2d-phaser-0.5.1.mjs';
import { D3_W } from './ui/layout';
import { TOKENS } from './uiTokens';
import { initViewport, setBandLock } from './viewport';
import { isDebug } from './flow/debugFlag';
import json from '../../config/balance.json';
import { recordError } from '../meta';
import { localStore } from './platform/localStore';

// MEC-003-R22 crash capture: any uncaught error or rejection lands in the run log (exported from Home in debug).
const logError = (message: string, stack: string): void => { recordError(localStore(), message, stack, Date.now(), json.log.maxEntries); };
window.addEventListener('error', e => { logError(String(e.message), String((e.error as Error | undefined)?.stack ?? `${e.filename}:${e.lineno}:${e.colno}`)); });
window.addEventListener('unhandledrejection', e => { const r = e.reason as Error | undefined; logError(String(r?.message ?? r), String(r?.stack ?? '')); });

// GDD-13 portrait game bootstrap with a parallel HUD above the board.
initViewport();
installAudioUnlock();
const { RigbyPlugin } = rigbyPhaser(Phaser);
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  // D4-P1-R6 single AudioContext lives in synth.ts
  audio: { noAudio: true },
  // D4-P3-R3 first frame matches the D4 DOM background (no blue flash)
  backgroundColor: TOKENS.d4.bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  plugins: { scene: [{ key: 'RigbyPlugin', plugin: RigbyPlugin, mapping: 'rigby' }] },
  scene: [BootScene, MetaBgScene, HomeScene, LoadoutScene, GameScene, HudScene, ResultsScene, SettingsScene, CharactersScene, ArtPreviewScene],
  input: { activePointers: 2 },
  render: { antialias: true },
  // MEC-003-R21 ?debug=1 only: QA handle for headless drivers (tools/qa/shot.mjs `eval:`), e.g. __game.registry.get('session').debugSkipTo(8).
  callbacks: {
    postBoot: game => {
      if (isDebug(window.location.search)) (window as unknown as { __game?: Phaser.Game }).__game = game;
      const root = document.getElementById('ui-root');
      if (!root) return;
      let metaBgLaunched = false;
      let metaBgLoading = false;
      const canLiveMetaBg = (): boolean => game.renderer.type === Phaser.WEBGL;
      const hooks: LoopHooks = {
        sleep: () => { if (!metaBgLoading) game.loop.sleep(); },
        wake: () => { game.loop.wake(); },
        inputEnabled: on => { game.input.enabled = on; },
        keyboardCapture: on => {
          for (const s of game.scene.getScenes(true)) {
            if (on) s.input.keyboard?.enableGlobalCapture();
            else s.input.keyboard?.disableGlobalCapture();
          }
        },
        canvasVisible: on => { game.canvas.style.visibility = on ? '' : 'hidden'; },
        setMetaBg: active => {
          if (!canLiveMetaBg()) return false;
          if (active) {
            if (!metaBgLaunched) {
              metaBgLaunched = true;
              metaBgLoading = true;
              game.loop.wake();
              game.scene.start(META_BG_KEY);
              return false;
            }
            if (!game.registry.get('metaBgReady')) return false;
            if (game.scene.isSleeping(META_BG_KEY)) game.scene.wake(META_BG_KEY);
            game.scene.sendToBack(META_BG_KEY);
            return true;
          }
          if (metaBgLaunched && game.scene.isActive(META_BG_KEY)) {
            game.scene.sleep(META_BG_KEY);
          }
          return false;
        },
      };
      startStageSync({
        root,
        readRect: () => game.canvas.getBoundingClientRect(),
        board: () => ({ top: BOARD.y, size: BOARD.size, height: HEIGHT }),
        baseWidth: D3_W,
        subscribe: onChange => {
          window.addEventListener('resize', onChange);
          const vv = window.visualViewport;
          vv?.addEventListener('resize', onChange);
          game.scale.on('resize', onChange);
          return () => {
            window.removeEventListener('resize', onChange);
            vv?.removeEventListener('resize', onChange);
            game.scale.off('resize', onChange);
          };
        },
      });
      const uiHost = createUiHost(root, hooks, { bandLock: on => setBandLock(on, TOKENS.d4.bg) });
      game.events.once(META_BG_READY_EVENT, () => {
        metaBgLoading = false;
        uiHost.syncReducedMotion();
      });
      game.events.once(META_BG_FAILED_EVENT, () => {
        metaBgLoading = false;
        uiHost.syncReducedMotion();
      });
      game.registry.set('uiHost', uiHost);
    },
  },
});
