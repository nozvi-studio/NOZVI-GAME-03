import type Phaser from 'phaser';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { FONT_TITLE, TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';
import { drawCard, hudLabel } from './draw';

// Mockup px of the CountdownD2 checkpoint card and the digit pop.
const M = { cardSide: 30, cardTop: 372, cardPad: 10, titleSize: 17, subSize: 14, lineH: 1.2, titleGap: 2, radius: 22, shadowAlpha: 0.4, shadowDy: 10, popScale: 1.2, popMs: 180 } as const;

// P3b2-R13 CountdownD2: dim scrim, huge butter digit with plum outline and drop shadow, optional checkpoint card.
export class CountdownOverlay {
  private readonly scrim: Phaser.GameObjects.Graphics; private readonly digit: Phaser.GameObjects.Text;
  private readonly cardG: Phaser.GameObjects.Graphics; private readonly cardTitle: Phaser.GameObjects.Text; private readonly cardSub: Phaser.GameObjects.Text;
  constructor(private readonly scene: Phaser.Scene) {
    const h = TOKENS.hud;
    this.scrim = scene.add.graphics().fillStyle(toInt(h.scrim), h.countScrimAlpha).fillRect(0, 0, WIDTH, HEIGHT).setVisible(false);
    this.digit = scene.add.text(WIDTH / 2, BOARD.y + BOARD.size / 2, '', { fontFamily: FONT_TITLE, fontSize: `${ui(h.countdownSizePx)}px`, color: h.countdown,
      stroke: TOKENS.text.logoOutline, strokeThickness: ui(h.countdownStrokePx) }).setName('countdown').setOrigin(0.5).setVisible(false)
      .setShadow(0, ui(h.countdownShadowY), TOKENS.text.logoOutline, 0, true, true);
    this.cardG = scene.add.graphics();
    this.cardTitle = hudLabel(scene, WIDTH / 2, 0, '', M.titleSize, TOKENS.text.primary, 900, 'countdown-card-title').setOrigin(0.5, 0);
    this.cardSub = hudLabel(scene, WIDTH / 2, 0, '', M.subSize, TOKENS.text.soft, 800, 'countdown-card-sub').setOrigin(0.5, 0);
    this.setCard(null);
  }
  tick(n: number, card: { title: string; subtitle: string } | null): void {
    this.scrim.setVisible(true); this.digit.setText(String(n)).setVisible(true); this.setCard(card);
    if (!reduceMotion()) { this.scene.tweens.killTweensOf(this.digit); this.digit.setScale(M.popScale); this.scene.tweens.add({ targets: this.digit, scale: 1, duration: M.popMs }); }
  }
  hide(): void { this.scrim.setVisible(false); this.digit.setVisible(false); this.setCard(null); }
  private setCard(card: { title: string; subtitle: string } | null): void {
    for (const o of [this.cardG, this.cardTitle, this.cardSub]) o.setVisible(card !== null);
    this.cardG.clear(); if (!card) return;
    const x = ui(M.cardSide), w = WIDTH - 2 * x, y = BOARD.y + ui(M.cardTop);
    const tH = M.titleSize * M.lineH, h = ui(M.cardPad + tH + M.titleGap + M.subSize * M.lineH + M.cardPad);
    drawCard(this.cardG, x, y, w, h, ui(M.radius), TOKENS.surface.card, { shadowAlpha: M.shadowAlpha, dy: M.shadowDy });
    this.cardTitle.setText(card.title).setY(y + ui(M.cardPad)); this.cardSub.setText(card.subtitle).setY(y + ui(M.cardPad + tH + M.titleGap));
  }
}
