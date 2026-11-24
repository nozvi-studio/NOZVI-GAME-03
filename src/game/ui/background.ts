// D3-R10/R11 screen background image: Aqua Marsh WebP for Biome 1, cached gradient textures for Biomes 2..6.
import type Phaser from 'phaser';
import { BG_AQUA_MARSH_KEY } from '../hud/hudIcons';
import { HEIGHT, WIDTH } from '../layout';
import { setBandColor } from '../viewport';
import { toInt } from '../uiTokens';
import { bgKey, bgSpec, paintBackground, type BgCtx } from './backgroundSpec';

export function screenBackground(scene: Phaser.Scene, biome: number, dim = false): Phaser.GameObjects.Image {
  const s = bgSpec(biome, WIDTH, HEIGHT, dim);
  scene.cameras.main.setBackgroundColor(toInt(s.outer));
  setBandColor(s.outer);

  if (Math.round(biome) <= 1 && scene.textures.exists(BG_AQUA_MARSH_KEY)) {
    const img = scene.add.image(WIDTH / 2, HEIGHT / 2, BG_AQUA_MARSH_KEY).setOrigin(0.5, 0.5).setDepth(-1000);
    const scale = Math.max(WIDTH / Math.max(1, img.width), HEIGHT / Math.max(1, img.height));
    img.setScale(scale);
    if (dim) img.setTint(0xe8f0f0);
    return img;
  }

  const key = bgKey(biome, WIDTH, HEIGHT, dim);
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, Math.ceil(WIDTH), Math.ceil(HEIGHT));
    if (!tex) throw new Error(`background: cannot create ${key}`);
    paintBackground(tex.getContext() as unknown as BgCtx, s);
    tex.refresh();
  }
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-1000);
}
