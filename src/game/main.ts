// src/game/main.ts — temporary hello scene; replaced by Boot/Game/Hud in Tasks 7–8
import Phaser from 'phaser';

const WIDTH = 540;
const HEIGHT = 960;

class HelloScene extends Phaser.Scene {
  constructor() { super('Hello'); }
  create(): void {
    this.add.text(WIDTH / 2, HEIGHT / 2, 'Mango Snake', {
      fontFamily: '"Baloo 2", system-ui, sans-serif', fontSize: '48px', color: '#22311a',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#dfe9c8',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [HelloScene],
});
