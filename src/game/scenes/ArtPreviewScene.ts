import Phaser from 'phaser';
import type { Balance } from '../../core';
import { BODY_POSES, CAPY_BODY_SIZE, CAPY_EXPRESSIONS, CAPY_SIZES, bodyKey, headKey, skinExpressions } from '../art/capyRig';
import { SKIN_IDS, activeSkin, type SkinId } from '../art/skins';
import { capyDie, capyEat, capyPose, createCapyAnim, type CapyAnimState } from '../art/capyPose';
import { HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { button, label } from './ui';
import { PREVIEW } from '../ui/artPreviewLayout';
import { card, chip, pillButton, progressBar, titleText } from '../ui/widgets';
import { TOKENS } from '../uiTokens';

export class ArtPreviewScene extends Phaser.Scene {
  private live!: Phaser.GameObjects.Image;
  private state!: CapyAnimState;
  private skin: SkinId = activeSkin();
  constructor() { super('ArtPreview'); }

  // ART-003 skin: `&skin=capy|snake` in the URL, else the restart data, else the active skin. Tap the title or press S to switch.
  init(data?: { skin?: SkinId }): void {
    const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('skin');
    const fromUrl = SKIN_IDS.find(s => s === q);
    this.skin = data?.skin ?? fromUrl ?? activeSkin();
  }

  private skinTitle(P: typeof PREVIEW): void {
    const next = SKIN_IDS[(SKIN_IDS.indexOf(this.skin) + 1) % SKIN_IDS.length]!;
    const title = label(this, WIDTH / 2, P.titleY, `Skin: ${this.skin} (tap or S: ${next})`, P.titleSize, 'preview-skin');
    const go = (): void => { this.scene.restart({ skin: next }); };
    title.setInteractive({ useHandCursor: true }).on('pointerdown', go);
    this.input.keyboard?.once('keydown-S', go);
  }

  // ART-003 expressions only this skin has (snake tongue), shown right of the large head swatches on the light and dark bg.
  private extras(P: typeof PREVIEW): void {
    const extra = skinExpressions(this.skin).filter(e => !CAPY_EXPRESSIONS.includes(e));
    extra.forEach((e, i) => {
      const x = P.extraX + i * (P.extraW + P.extraGap);
      this.add.rectangle(x, P.headRowY, P.extraW, P.extraH, i % 2 === 0 ? P.light : P.dark).setOrigin(0);
      this.add.image(x + P.extraW / 2, P.headRowY + P.extraImgDy + P.extraSize / 2, headKey(this.skin, e, 'large')).setDisplaySize(P.extraSize, P.extraSize);
      label(this, x + P.extraW / 2, P.headRowY + P.extraLabelDy, e, P.labelSize);
    });
  }

  preload(): void {
    const P = PREVIEW;
    this.load.spritesheet(P.rmKey, P.rmUrl, { frameWidth: P.rmFrame, frameHeight: P.rmFrame });
  }

  // ART-001 every expression at 24 and 40 px on light and dark backgrounds, plus a live 256 px head and body poses.
  create(): void {
    const cfg = (this.registry.get('balance') as Balance).ui.capy;
    const reduced = reduceMotion();
    const P = PREVIEW;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, P.page).setOrigin(0);
    this.skinTitle(P);
    const swatch = (x: number, y: number, w: number, h: number, color: number): void => {
      this.add.rectangle(x, y, w, h, color).setOrigin(0);
    };
    skinExpressions(this.skin).filter(e => CAPY_EXPRESSIONS.includes(e)).forEach((e, i) => {
      const x0 = (i % P.cols) * P.cellW + (P.cellW - 2 * P.swatchW - P.swatchGap) / 2;
      const y = P.gridTop + Math.floor(i / P.cols) * P.rowH;
      [P.light, P.dark].forEach((color, k) => {
        const sx = x0 + k * (P.swatchW + P.swatchGap);
        swatch(sx, y, P.swatchW, P.swatchH, color);
        this.add.image(sx + P.swatchW / 2 + P.smallDx, y + P.swatchDy, headKey(this.skin, e, 'board')).setDisplaySize(P.small, P.small);
        this.add.image(sx + P.swatchW / 2 + P.midDx, y + P.swatchDy, headKey(this.skin, e, 'board')).setDisplaySize(P.mid, P.mid);
      });
      label(this, x0 + P.swatchW + P.swatchGap / 2, y + P.labelDy, e, P.labelSize);
    });
    [P.light, P.dark].forEach((color, k) => {
      const sx = P.bodyPad + k * (P.headSwatch + P.bodyPad);
      swatch(sx, P.headRowY, P.headSwatch, P.headSwatch, color);
      this.add.image(sx + P.headSwatch / 2, P.headRowY + P.headSwatch / 2, headKey(this.skin, 'idle', 'large')).setDisplaySize(P.homeSize, P.homeSize);
    });
    this.extras(P);
    BODY_POSES.forEach((pose, i) => [P.light, P.dark].forEach((color, k) => {
      const sx = P.bodyPad + (i * 2 + k) * (P.bodySwatchW + P.bodyPad);
      swatch(sx, P.bodyRowY, P.bodySwatchW, P.bodySwatchH, color);
      this.add.image(sx + P.bodySwatchW / 2, P.bodyRowY + P.bodySwatchH / 2, bodyKey(this.skin, pose))
        .setDisplaySize(P.bodyW, P.bodyW * CAPY_BODY_SIZE.h / CAPY_BODY_SIZE.w);
    }));
    const liveBg = this.add.rectangle(0, P.liveTop, WIDTH, HEIGHT - P.liveTop, P.light).setOrigin(0);
    let lightBg = true;
    this.live = this.add.image(WIDTH / 2, P.liveY, headKey(this.skin, 'idle', 'large'));
    const base = P.bigSize / CAPY_SIZES.large;
    this.state = createCapyAnim(this.time.now, cfg, Math.random, this.skin);
    const acts: [string, () => void][] = [
      ['Eat', () => { this.state = capyEat(this.state, this.time.now); }],
      ['Die', () => { this.state = capyDie(this.state, this.time.now); }],
      ['Reset', () => { this.state = createCapyAnim(this.time.now, cfg, Math.random, this.skin); }],
      ['BG', () => { lightBg = !lightBg; liveBg.setFillStyle(lightBg ? P.light : P.dark); }],
    ];
    acts.forEach(([text, fn], i) => button(this, P.btnXs[i], P.btnY, P.btnW, P.btnH, text, `preview-${text.toLowerCase()}`, fn, P.btnSize));
    this.widgetRow();
    this.remotionClip();
    const onUpdate = (now: number): void => {
      const { state, pose } = capyPose(this.state, now, cfg, reduced, Math.random);
      this.state = state;
      this.live.setTexture(headKey(this.skin, pose.expression, 'large')).setScale(base * pose.scaleX, base * pose.scaleY)
        .setAngle(pose.rotationDeg).setY(P.liveY + pose.dy * (P.bigSize / 48));
    };
    this.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  }

  // POC: compare a Remotion-rendered PNG sequence with the tween capy (not used in gameplay).
  private remotionClip(): void {
    const P = PREVIEW;
    if (!this.textures.exists(P.rmKey)) return;
    if (!this.anims.exists(P.rmKey)) {
      this.anims.create({ key: P.rmKey, frames: this.anims.generateFrameNumbers(P.rmKey, { start: 0, end: P.rmFrames - 1 }), frameRate: P.rmFps, repeat: -1 });
    }
    this.add.sprite(P.rmX, P.rmY, P.rmKey).setDisplaySize(P.rmSize, P.rmSize).play(P.rmKey);
    label(this, P.rmX, P.rmLabelY, P.rmLabel, P.labelSize);
  }

  // UIFIX-R11 widget column sits in the left margin of the live panel, clear of the live capy.
  private widgetRow(): void {
    const P = PREVIEW;
    P.wPills.forEach(p => pillButton(this, p.x, p.y, P.wPillW, P.wPillH, p.tone, `preview-pill-${p.tone}`, () => {}, p.tone));
    card(this, P.wCardX, P.wCardY, P.wCardW, P.wCardH, 10);
    chip(this, P.wChipX, P.wChipY, '1,250', TOKENS.accent.butter, 'preview-chip');
    titleText(this, P.wTitleX, P.wTitleY, 'MANGO SNAKE', P.wTitleSize);
    progressBar(this, P.wBarX, P.wBarY, P.wBarW, P.wBarH, TOKENS.green.face).set(60, 100);
  }
}
