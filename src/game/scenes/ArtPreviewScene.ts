import Phaser from 'phaser';
import type { Balance } from '../../core';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, capyBodyKey, capyHeadKey } from '../art/capyRig';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimState } from '../art/capyPose';
import { HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { button, label } from './ui';

// Debug-only layout for the owner's phone check (ART-001 sizes 24 / 40 / 124 / 256 CSS px, each on light and dark).
const PREVIEW = {
  page: 0xcfcfcf, light: 0xf6eedc, dark: 0x1f2433, cols: 3, cellW: 180, gridTop: 100, rowH: 76,
  swatchW: 84, swatchH: 56, swatchGap: 4, small: 24, mid: 40, smallDx: -18, midDx: 18, swatchDy: 28, labelDy: 66, labelSize: 13,
  titleY: 20, titleSize: 20, btnY: 60, btnW: 100, btnH: 40, btnSize: 18, btnXs: [70, 190, 310, 430],
  headRowY: 410, homeSize: 124, headSwatch: 130, headDx: 70, bodyRowY: 548, bodyW: 80, bodySwatchW: 90, bodySwatchH: 130,
  bodyDx: 50, bodyCols: 4, bodyPad: 5,
  bigSize: 256, liveTop: 680, liveY: 808,
} as const;

export class ArtPreviewScene extends Phaser.Scene {
  private live!: Phaser.GameObjects.Image;
  private state!: CapyAnimState;
  constructor() { super('ArtPreview'); }

  // ART-001 every expression at 24 and 40 px on light and dark backgrounds, plus a live 256 px head and body poses.
  create(): void {
    const cfg = (this.registry.get('balance') as Balance).ui.capy;
    const reduced = reduceMotion();
    const P = PREVIEW;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, P.page).setOrigin(0);
    label(this, WIDTH / 2, P.titleY, 'Capy preview', P.titleSize);
    const swatch = (x: number, y: number, w: number, h: number, color: number): void => {
      this.add.rectangle(x, y, w, h, color).setOrigin(0);
    };
    CAPY_EXPRESSIONS.forEach((e, i) => {
      const x0 = (i % P.cols) * P.cellW + (P.cellW - 2 * P.swatchW - P.swatchGap) / 2;
      const y = P.gridTop + Math.floor(i / P.cols) * P.rowH;
      [P.light, P.dark].forEach((color, k) => {
        const sx = x0 + k * (P.swatchW + P.swatchGap);
        swatch(sx, y, P.swatchW, P.swatchH, color);
        this.add.image(sx + P.swatchW / 2 + P.smallDx, y + P.swatchDy, capyHeadKey(e, 'board')).setDisplaySize(P.small, P.small);
        this.add.image(sx + P.swatchW / 2 + P.midDx, y + P.swatchDy, capyHeadKey(e, 'board')).setDisplaySize(P.mid, P.mid);
      });
      label(this, x0 + P.swatchW + P.swatchGap / 2, y + P.labelDy, e, P.labelSize);
    });
    [P.light, P.dark].forEach((color, k) => {
      const sx = P.bodyPad + k * (P.headSwatch + P.bodyPad);
      swatch(sx, P.headRowY, P.headSwatch, P.headSwatch, color);
      this.add.image(sx + P.headSwatch / 2, P.headRowY + P.headSwatch / 2, capyHeadKey('idle', 'large')).setDisplaySize(P.homeSize, P.homeSize);
    });
    BODY_POSES.forEach((pose, i) => [P.light, P.dark].forEach((color, k) => {
      const sx = P.bodyPad + (i * 2 + k) * (P.bodySwatchW + P.bodyPad);
      swatch(sx, P.bodyRowY, P.bodySwatchW, P.bodySwatchH, color);
      this.add.image(sx + P.bodySwatchW / 2, P.bodyRowY + P.bodySwatchH / 2, capyBodyKey(pose))
        .setDisplaySize(P.bodyW, P.bodyW * CAPY_BODY_SIZE.h / CAPY_BODY_SIZE.w);
    }));
    const liveBg = this.add.rectangle(0, P.liveTop, WIDTH, HEIGHT - P.liveTop, P.light).setOrigin(0);
    let lightBg = true;
    this.live = this.add.image(WIDTH / 2, P.liveY, capyHeadKey('idle', 'large'));
    const base = P.bigSize / CAPY_SIZES.large;
    this.state = createCapyAnim(this.time.now, cfg, Math.random);
    const acts: [string, () => void][] = [
      ['Eat', () => { this.state = capyEat(this.state, this.time.now); }],
      ['Die', () => { this.state = capyDie(this.state, this.time.now); }],
      ['Reset', () => { this.state = createCapyAnim(this.time.now, cfg, Math.random); }],
      ['BG', () => { lightBg = !lightBg; liveBg.setFillStyle(lightBg ? P.light : P.dark); }],
    ];
    acts.forEach(([text, fn], i) => button(this, P.btnXs[i], P.btnY, P.btnW, P.btnH, text, `preview-${text.toLowerCase()}`, fn, P.btnSize));
    const onUpdate = (now: number): void => {
      const { state, pose } = capyPose(this.state, now, cfg, reduced, Math.random);
      this.state = state;
      this.live.setTexture(capyHeadKey(pose.expression, 'large')).setScale(base * pose.scaleX, base * pose.scaleY)
        .setAngle(pose.rotationDeg).setY(P.liveY + pose.dy * (P.bigSize / 48));
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  }
}
