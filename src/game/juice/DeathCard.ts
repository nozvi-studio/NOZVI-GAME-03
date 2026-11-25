import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { hudLabel } from '../hud/draw';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { TOKENS } from '../uiTokens';
import { d3, d3m, layoutColumn, ui } from '../ui/layout';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { card, titleText } from '../ui/widgets';
import type { DeathCardView } from './JuicePlayer';
import { bannerMotion } from './juiceMap';

// D3-R17 board metrics in 360-wide board px (d3()): panel x 36 / w 288, padding 42 / 18 / 20, line Nunito 900 19 at 1.3; ribbon 260 x 76 rising 40 above the panel.
const M = { panelW: 288, padTop: 42, padX: 18, padBottom: 20, line: 19, lineH: 1.3, naturalLineH: 1.15, ribbonW: 260, ribbonH: 76, ribbonRise: 40, ribbonFont: 34, ribbonStroke: 6, depth: 950, zoneDepth: 960 } as const;

// D3-R17 P3a-R7 "RUN OVER" ribbon over a panel with the death line; reduced motion = fade only (P3a-R8).
export class DeathCard implements DeathCardView {
  private root: Phaser.GameObjects.Container | null = null;
  private zone: Phaser.GameObjects.Zone | null = null;
  constructor(private readonly scene: Phaser.Scene, private readonly balance: Balance, private readonly reduced: boolean) {}

  show(line: string): void {
    const host = hostOf(this.scene), unit = d3(1), w = d3(M.panelW), rw = d3(M.ribbonW), rh = d3(M.ribbonH);
    const text = hudLabel(this.scene, 0, 0, line, d3m(M.line), TOKENS.d3.text, 900, 'death-line').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(w - 2 * d3(M.padX))
      .setLineSpacing(d3(M.line * (M.lineH - M.naturalLineH)));
    const panelH = d3(M.padTop) + text.height + d3(M.padBottom), groupH = d3(M.ribbonRise) + panelH;
    const top = layoutColumn({ top: 0, middle: groupH / ui(1), bottom: 0, minShrink: 1 }).middleY;
    const y0 = -groupH / 2, panelTop = y0 + d3(M.ribbonRise), ribbonCy = y0 + rh / 2;
    const panel = card(this.scene, -w / 2, panelTop, w / ui(1), panelH / ui(1));
    const rib = (state: 'lip' | 'rest', y: number) => this.scene.add.image(0, y, skinTexture(host, 'ribbon', 'ribbon', rw, rh, state, unit));
    const title = titleText(this.scene, 0, ribbonCy, t('death.title').toUpperCase(), d3m(M.ribbonFont)).setStroke(TOKENS.d3.tone.ribbon.line, d3(M.ribbonStroke)).setName('death-title');
    text.setPosition(0, panelTop + d3(M.padTop));
    const mo = bannerMotion(this.balance, this.reduced);
    this.root = this.scene.add.container(WIDTH / 2, top + groupH / 2, [panel, rib('lip', ribbonCy + lipPx('ribbon', 'ribbon', unit)), rib('rest', ribbonCy), title, text])
      .setName('death-card').setDepth(M.depth).setAlpha(0).setScale(mo.scaleFrom);
    this.scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: mo.inMs, ease: mo.slidePx === 0 ? 'Linear' : 'Back.easeOut' });
  }
  /** Tap anywhere skips to Results; the zone covers the whole HUD scene. */
  armSkip(onSkip: (exit?: 'again' | 'results') => void): void {
    this.zone = this.scene.add.zone(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT).setDepth(M.zoneDepth).setInteractive();
    this.zone.once('pointerdown', () => onSkip('results'));
  }
  destroy(): void {
    if (this.root) this.scene.tweens.killTweensOf(this.root);
    this.root?.destroy(); this.zone?.destroy(); this.root = null; this.zone = null;
  }
}
