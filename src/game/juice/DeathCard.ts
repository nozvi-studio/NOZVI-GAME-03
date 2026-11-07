import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { hudLabel } from '../hud/draw';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { TOKENS } from '../uiTokens';
import { layoutColumn, ui } from '../ui/layout';
import { card } from '../ui/widgets';
import type { DeathCardView } from './JuicePlayer';
import { bannerMotion } from './juiceMap';

// DeathD2 metrics in mockup px: card margins, padding, radius, "RUN OVER" size and spacing, line size.
const M = { side: 30, padX: 18, padY: 14, radius: 24, title: 12, titleH: 14, spacing: 0.12, gap: 2, line: 23, lineH: 1.15, depth: 950, zoneDepth: 960 } as const;

// P3a-R7 "RUN OVER" card with the death line (DeathD2); reduced motion = fade only (P3a-R8).
export class DeathCard implements DeathCardView {
  private root: Phaser.GameObjects.Container | null = null;
  private zone: Phaser.GameObjects.Zone | null = null;
  constructor(private readonly scene: Phaser.Scene, private readonly balance: Balance, private readonly reduced: boolean) {}

  show(line: string): void {
    const w = WIDTH - 2 * ui(M.side), inner = w - 2 * ui(M.padX);
    const title = hudLabel(this.scene, 0, 0, t('death.title'), M.title, TOKENS.text.soft, 800, 'death-title').setOrigin(0.5, 0).setLetterSpacing(ui(M.title * M.spacing));
    const text = hudLabel(this.scene, 0, 0, line, M.line, TOKENS.text.primary, 900, 'death-line').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(inner);
    const h = 2 * ui(M.padY) + ui(M.titleH) + ui(M.gap) + text.height, hMock = h / ui(1);
    const top = layoutColumn({ top: 0, middle: hMock, bottom: 0, minShrink: 1 }).middleY;
    const g = card(this.scene, -w / 2, -h / 2, w / ui(1), hMock, M.radius);
    title.setPosition(0, -h / 2 + ui(M.padY)); text.setPosition(0, -h / 2 + ui(M.padY) + ui(M.titleH) + ui(M.gap));
    const mo = bannerMotion(this.balance, this.reduced);
    this.root = this.scene.add.container(WIDTH / 2, top + h / 2, [g, title, text]).setName('death-card').setDepth(M.depth).setAlpha(0).setScale(mo.scaleFrom);
    this.scene.tweens.add({ targets: this.root, alpha: 1, scale: 1, duration: mo.inMs, ease: 'Back.easeOut' });
  }
  /** Tap anywhere skips to Results; the zone covers the whole HUD scene. */
  armSkip(onSkip: () => void): void {
    this.zone = this.scene.add.zone(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT).setDepth(M.zoneDepth).setInteractive();
    this.zone.once('pointerdown', onSkip);
  }
  destroy(): void {
    if (this.root) this.scene.tweens.killTweensOf(this.root);
    this.root?.destroy(); this.zone?.destroy(); this.root = null; this.zone = null;
  }
}
