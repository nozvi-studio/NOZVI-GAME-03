import type Phaser from 'phaser';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3 } from '../ui/layout';
import { butterChip } from '../ui/menuWidgets';

// D3-R15 board px (360 wide, d3()) of the countdown digit, start chip and ramp line; popScale/popMs are the digit pop.
const M = { digit: 170, digitStroke: 12, digitShadowY: 8, chipTop: 372, chipH: 30, chipFont: 13, chipPadX: 14, chipIcon: 16, chipIconGap: 6,
  subSize: 14, subStroke: 3, subGap: 8, popScale: 1.2, popMs: 180 } as const;

// D3-R15 / U5-R7 Countdown: 28% ink scrim, huge mango-yellow digit (brown outline and drop), butter start chip with the ramp line under it.
export class CountdownOverlay {
  private readonly scrim: Phaser.GameObjects.Graphics; private readonly digit: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text; private chipC: Phaser.GameObjects.Container | null = null; private chipTitle = ''; private label: Phaser.GameObjects.Text | undefined;
  constructor(private readonly scene: Phaser.Scene) {
    const logo = TOKENS.d3.logo;
    this.scrim = scene.add.graphics().fillStyle(toInt(TOKENS.d3.inkDeep), TOKENS.hud.countScrimAlpha).fillRect(0, 0, WIDTH, HEIGHT).setVisible(false);
    // Board centre is within 10 board px of the mock digit centre (top 186 + 85), so it stays the anchor.
    this.digit = scene.add.text(WIDTH / 2, BOARD.y + BOARD.size / 2, '', { fontFamily: FONT_TITLE, fontSize: `${d3(M.digit)}px`, color: logo.mango,
      stroke: logo.mangoLine, strokeThickness: d3(M.digitStroke) }).setName('countdown').setOrigin(0.5).setVisible(false)
      .setShadow(0, d3(M.digitShadowY), logo.mangoLine, 0, true, true);
    this.sub = scene.add.text(WIDTH / 2, 0, '', { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(M.subSize)}px`, color: TOKENS.d3.white,
      stroke: TOKENS.d3.inkDeep, strokeThickness: d3(M.subStroke) }).setName('countdown-card-sub').setOrigin(0.5, 0).setVisible(false);
  }
  tick(n: number, card: { title: string; subtitle: string } | null): void {
    this.scrim.setVisible(true); this.digit.setText(String(n)).setVisible(true); this.setCard(card);
    if (!reduceMotion()) { this.scene.tweens.killTweensOf(this.digit); this.digit.setScale(M.popScale); this.scene.tweens.add({ targets: this.digit, scale: 1, duration: M.popMs }); }
  }
  hide(): void { this.scrim.setVisible(false); this.digit.setVisible(false); this.setCard(null); }
  private show(on: boolean): void { this.chipC?.setVisible(on); this.label?.setVisible(on); }
  private setCard(card: { title: string; subtitle: string } | null): void {
    if (!card) { this.show(false); this.sub.setVisible(false); return; }
    const y = d3(M.chipTop);
    if (this.chipC === null || this.chipTitle !== card.title) { // rebuild only when the text changes
      this.chipC?.destroy();
      const probe = this.scene.add.text(0, 0, card.title, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(M.chipFont)}px` });
      const w = 2 * M.chipPadX + M.chipIcon + M.chipIconGap + probe.width / d3(1); probe.destroy();
      this.chipC = butterChip(this.scene, WIDTH / 2, y + d3(M.chipH / 2), w, M.chipH, card.title, M.chipFont, 'flag');
      this.label = this.chipC.list.find(o => (o as Phaser.GameObjects.Text).text === card.title) as Phaser.GameObjects.Text | undefined;
      this.label?.setName('countdown-card-title'); // QA name: the chip's text object
      this.chipTitle = card.title;
    }
    this.show(true); this.sub.setText(card.subtitle).setY(y + d3(M.chipH + M.subGap)).setVisible(true);
  }
}
