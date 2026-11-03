import Phaser from 'phaser';
import { HEIGHT, WIDTH } from './layout';
import { currentPalette } from './render/palette';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

// GDD-13 portrait game bootstrap; HUD is added in Task 8.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: currentPalette().bg,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, GameScene],
  input: { activePointers: 2 },
  render: { antialias: true },
});
