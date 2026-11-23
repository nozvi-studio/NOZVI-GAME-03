import Phaser from 'phaser';
import './dom/styles/tokens.css';
import './dom/styles/components.css';
import './dom/styles/motion.css';
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
import { ResultsScene } from './scenes/ResultsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { CharactersScene } from './scenes/CharactersScene';
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
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  // D4-P1-R6 single AudioContext lives in synth.ts
  audio: { noAudio: true },
  // D3-R10 first frame matches the Boot/Home background (biome 1 outer stop)
  backgroundColor: TOKENS.d3.biomes[0]!.bg[2],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, HomeScene, LoadoutScene, GameScene, HudScene, ResultsScene, SettingsScene, CharactersScene, ArtPreviewScene],
  input: { activePointers: 2 },
  render: { antialias: true },
  // MEC-003-R21 ?debug=1 only: QA handle for headless drivers (tools/qa/shot.mjs `eval:`), e.g. __game.registry.get('session').debugSkipTo(8).
  callbacks: {
    postBoot: game => {
      if (isDebug(window.location.search)) (window as unknown as { __game?: Phaser.Game }).__game = game;
      const root = document.getElementById('ui-root');
      if (!root) return;
      const hooks: LoopHooks = {
        sleep: () => { game.loop.sleep(); },
        wake: () => { game.loop.wake(); },
        inputEnabled: on => { game.input.enabled = on; },
        keyboardCapture: on => {
          for (const s of game.scene.getScenes(true)) {
            if (on) s.input.keyboard?.enableGlobalCapture();
            else s.input.keyboard?.disableGlobalCapture();
          }
        },
        canvasVisible: on => { game.canvas.style.visibility = on ? '' : 'hidden'; },
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
      game.registry.set('uiHost', createUiHost(root, hooks, { bandLock: on => setBandLock(on) }));
    },
  },
});
