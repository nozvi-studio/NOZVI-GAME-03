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
});
