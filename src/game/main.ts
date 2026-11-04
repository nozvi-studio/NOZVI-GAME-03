import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './layout';
import { currentPalette } from './render/palette';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { HudScene } from './scenes/HudScene';
import { LoadoutScene } from './scenes/LoadoutScene';
import { ResultsScene } from './scenes/ResultsScene';

// GDD-13 portrait game bootstrap with a parallel HUD above the board.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: currentPalette().bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, HomeScene, LoadoutScene, GameScene, HudScene, ResultsScene],
  input: { activePointers: 2 },
  render: { antialias: true },
});
