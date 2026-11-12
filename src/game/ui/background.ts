// D3-R10/R11 screen background image: one canvas texture per biome and canvas size, kept for the game's life.
import type Phaser from 'phaser';
import { HEIGHT, WIDTH } from '../layout';
import { setBandColor } from '../viewport';
import { toInt } from '../uiTokens';
import { bgKey, bgSpec, paintBackground, type BgCtx } from './backgroundSpec';

export function screenBackground(scene: Phaser.Scene, biome: number, dim = false): Phaser.GameObjects.Image {
  const key = bgKey(biome, WIDTH, HEIGHT, dim), s = bgSpec(biome, WIDTH, HEIGHT, dim);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, Math.ceil(WIDTH), Math.ceil(HEIGHT));
    if (!tex) throw new Error(`background: cannot create ${key}`);
    paintBackground(tex.getContext() as unknown as BgCtx, s);
    tex.refresh();
  }
  scene.cameras.main.setBackgroundColor(toInt(s.outer));
  setBandColor(s.outer);
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
}
