import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './layout';
import { ArtPreviewScene } from './scenes/ArtPreviewScene';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { HudScene } from './scenes/HudScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { ResultsScene } from './scenes/ResultsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TOKENS } from './uiTokens';
import { initViewport } from './viewport';
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
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  // D3-R10 first frame matches the Boot/Home background (biome 1 outer stop)
  backgroundColor: TOKENS.d3.biomes[0]!.bg[2],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, HomeScene, LoadoutScene, GameScene, HudScene, ResultsScene, SettingsScene, ArtPreviewScene],
  input: { activePointers: 2 },
  render: { antialias: true },
  // MEC-003-R21 ?debug=1 only: QA handle for headless drivers (tools/qa/shot.mjs `eval:`), e.g. __game.registry.get('session').debugSkipTo(8).
  callbacks: { postBoot: game => { if (isDebug(window.location.search)) (window as unknown as { __game?: Phaser.Game }).__game = game; } },
});
