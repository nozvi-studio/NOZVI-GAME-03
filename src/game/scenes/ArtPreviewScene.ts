import Phaser from 'phaser';
import type { Balance } from '../../core';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, capyBodyKey, capyHeadKey } from '../art/capyRig';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimState } from '../art/capyPose';
import { HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { button, label } from './ui';

// Debug-only layout for the owner's phone check (ART-001 sizes 24 / 40 / 124 / 256 CSS px).
const PREVIEW = {
  light: 0xf6eedc, dark: 0x1f2433, cols: 4, cellW: 132, gridTop: 70, rowH: 92, small: 24, mid: 40,
  bigSize: 256, homeSize: 124, bodyW: 120, liveY: 700,
} as const;

export class ArtPreviewScene extends Phaser.Scene {
  private live!: Phaser.GameObjects.Image;
  private state!: CapyAnimState;
  constructor() { super('ArtPreview'); }

  // ART-001 every expression at 24 and 40 px on light and dark backgrounds, plus a live 256 px head and body poses.
  create(): void {
    const cfg = (this.registry.get('balance') as Balance).ui.capy;
    const reduced = reduceMotion();
    this.add.rectangle(0, 0, WIDTH / 2, HEIGHT, PREVIEW.light).setOrigin(0);
    this.add.rectangle(WIDTH / 2, 0, WIDTH / 2, HEIGHT, PREVIEW.dark).setOrigin(0);
    label(this, WIDTH / 2, 28, 'Capy preview', 24);
    CAPY_EXPRESSIONS.forEach((e, i) => {
      const x = (i % PREVIEW.cols) * PREVIEW.cellW + PREVIEW.cellW / 2, y = PREVIEW.gridTop + Math.floor(i / PREVIEW.cols) * PREVIEW.rowH;
      this.add.image(x - 22, y + 24, capyHeadKey(e, 'board')).setDisplaySize(PREVIEW.small, PREVIEW.small);
      this.add.image(x + 14, y + 24, capyHeadKey(e, 'board')).setDisplaySize(PREVIEW.mid, PREVIEW.mid);
      label(this, x, y + 62, e, 13);
    });
    const homeY = PREVIEW.gridTop + 3 * PREVIEW.rowH + 80;
    this.add.image(PREVIEW.homeSize / 2 + 16, homeY, capyHeadKey('idle', 'large')).setDisplaySize(PREVIEW.homeSize, PREVIEW.homeSize);
    BODY_POSES.forEach((p, i) => this.add.image(200 + i * (PREVIEW.bodyW + 30), homeY,
      capyBodyKey(p)).setDisplaySize(PREVIEW.bodyW, PREVIEW.bodyW * CAPY_BODY_SIZE.h / CAPY_BODY_SIZE.w));
    this.live = this.add.image(WIDTH / 2, PREVIEW.liveY, capyHeadKey('idle', 'large'));
    const base = PREVIEW.bigSize / CAPY_SIZES.large;
    this.state = createCapyAnim(this.time.now, cfg, Math.random);
    button(this, 90, HEIGHT - 50, 140, 56, 'Eat', 'preview-eat', () => { this.state = capyEat(this.state, this.time.now); });
    button(this, WIDTH / 2, HEIGHT - 50, 140, 56, 'Die', 'preview-die', () => { this.state = capyDie(this.state, this.time.now); });
    button(this, WIDTH - 90, HEIGHT - 50, 140, 56, 'Reset', 'preview-reset', () => { this.state = createCapyAnim(this.time.now, cfg, Math.random); });
    const onUpdate = (now: number): void => {
      const { state, pose } = capyPose(this.state, now, cfg, reduced, Math.random);
      this.state = state;
      this.live.setTexture(capyHeadKey(pose.expression, 'large')).setScale(base * pose.scaleX, base * pose.scaleY)
        .setAngle(pose.rotationDeg).setY(PREVIEW.liveY + pose.dy * (PREVIEW.bigSize / 48));
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  }
}
