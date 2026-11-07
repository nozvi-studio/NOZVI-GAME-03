import type Phaser from 'phaser';
import { TOKENS, toInt } from '../uiTokens';
import { ui, UI_SCALE } from '../ui/layout';
import { reduceMotion } from '../render/palette';
import { bindPress } from '../scenes/ui';
import { drawCard, hudLabel } from './draw';
import { hudIconKey } from './hudIcons';
import { HUD_MOCK, statsRow, type HudLayout, type StatsRow } from './hudLayout';
import type { HudView } from './hudModel';
import { WIDTH } from '../layout';
import type { HudTarget, Pt } from '../juice/types';

// Mockup px of the stats / chip / pause drawing (GameD2); layout rects themselves come from HUD_MOCK / hudLayout.
const M = { stat: 19, chip: 14, mango: 28, star: 20, bolt: 16, bar: 10, chipPadL: 12, chipIcon: 18, chipGap: 8, chipPadR: 16,
  pauseBarW: 5, pauseBarH: 16, pauseBarX: 7, pauseGap: 2, pauseRadius: 2, playHalf: 9, playBack: 6, playTip: 9, pressScale: 0.94, disabledAlpha: 0.4 } as const;

// P3b2-R15 GameD2 header (level + biome + pause), stats pills (mango x/y, score, energy) and the checkpoint / ramp chip.
export class HudTop {
  readonly pauseButton: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics; private readonly pauseG: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text; private readonly biome: Phaser.GameObjects.Text;
  private readonly done: Phaser.GameObjects.Text; private readonly total: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text; private readonly energy: Phaser.GameObjects.Text;
  private readonly chipG: Phaser.GameObjects.Graphics; private readonly chipText: Phaser.GameObjects.Text; private readonly chipIcon: Phaser.GameObjects.Image;
  private readonly icons: Phaser.GameObjects.Image[]; private rowKey = ''; private chipKey = ''; private pauseKey = ''; private fill = -1;
  /** Last drawn positions (set in drawRow, read by the juice adapter; never recomputed per frame). */
  private readonly pos = { score: { x: 0, y: 0 }, energyBar: { x: 0, y: 0 }, levelBar: { x: 0, y: 0 } }; private readonly iconBase = new Map<Phaser.GameObjects.Image, number>(); private chipBase = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly l: HudLayout, onPause: () => void) {
    const ink = TOKENS.text.primary;
    this.g = scene.add.graphics();
    this.level = hudLabel(scene, WIDTH / 2, l.titleY, '', HUD_MOCK.titleSize, ink, 800, 'level').setOrigin(0.5, 0);
    this.biome = hudLabel(scene, WIDTH / 2, l.biomeY, '', HUD_MOCK.biomeSize, TOKENS.text.soft, 700, 'biome').setOrigin(0.5, 0);
    this.pauseG = scene.add.graphics();
    this.pauseButton = scene.add.container(l.pause.cx, l.pause.cy, [this.pauseG]).setName('pause-button').setSize(l.pause.hit, l.pause.hit).setInteractive({ useHandCursor: true });
    bindPress(this.pauseButton, () => { if (!reduceMotion()) this.pauseButton.setScale(M.pressScale); }, () => this.pauseButton.setScale(1), onPause, true);
    this.done = hudLabel(scene, 0, 0, '', M.stat, TOKENS.hud.quota, 800, 'quota-done');
    this.total = hudLabel(scene, 0, 0, '', M.stat, ink, 800, 'quota-total');
    this.score = hudLabel(scene, 0, 0, '', M.stat, ink, 800, 'score');
    this.energy = hudLabel(scene, 0, 0, '', M.stat, ink, 800, 'energy');
    this.icons = [scene.add.image(0, 0, hudIconKey('mango')), scene.add.image(0, 0, hudIconKey('star')), scene.add.image(0, 0, hudIconKey('bolt'))];
    this.chipG = scene.add.graphics();
    this.chipIcon = scene.add.image(0, 0, hudIconKey('flag', 'soft')).setDisplaySize(ui(M.chipIcon), ui(M.chipIcon));
    this.chipText = hudLabel(scene, 0, 0, '', M.chip, TOKENS.text.soft, 800, 'next-checkpoint');
    this.chipBase = this.chipIcon.scaleX;
  }

  apply(v: HudView, paused: boolean, pauseEnabled: boolean): void {
    this.level.setText(v.levelTitle); this.biome.setText(v.biomeName);
    this.done.setText(v.quota.done); this.total.setText(v.quota.total); this.score.setText(v.score); this.energy.setText(v.energy.text);
    const w = (t: Phaser.GameObjects.Text): number => t.width / UI_SCALE;
    const row = statsRow({ quota: w(this.done) + w(this.total), score: w(this.score), energy: w(this.energy) });
    const key = JSON.stringify(row);
    if (key !== this.rowKey || v.energy.fill !== this.fill) { this.rowKey = key; this.fill = v.energy.fill; this.drawRow(row, v.energy.fill); }
    this.drawChip(v.chip?.text ?? null);
    const pk = `${paused}|${pauseEnabled}`;
    if (pk === this.pauseKey) return;
    this.pauseKey = pk;
    if (this.pauseButton.input) this.pauseButton.input.enabled = pauseEnabled;
    this.pauseButton.setAlpha(pauseEnabled ? 1 : M.disabledAlpha); this.drawPause(paused);
  }

  private drawRow(r: StatsRow, fill: number): void {
    const y = this.l.statsY, h = this.l.statsH, rad = h / 2, cy = y + h / 2, g = this.g.clear();
    for (const p of [r.quota, r.score, r.energy]) drawCard(g, ui(p.x), y, ui(p.w), h, rad, TOKENS.surface.card);
    const text = (t: Phaser.GameObjects.Text, x: number): void => { t.setPosition(ui(x), cy).setOrigin(0, 0.5); };
    text(this.done, r.quota.text); this.total.setPosition(this.done.x + this.done.width, cy).setOrigin(0, 0.5);
    text(this.score, r.score.text); text(this.energy, r.energy.text);
    this.icons[0]!.setPosition(ui(r.quota.icon + M.mango / 2), cy).setDisplaySize(ui(M.mango), ui(M.mango));
    this.icons[1]!.setPosition(ui(r.score.icon + M.star / 2), cy).setDisplaySize(ui(M.star), ui(M.star));
    this.icons[2]!.setPosition(ui(r.energy.bolt + M.bolt / 2), cy).setDisplaySize(ui(M.bolt), ui(M.bolt));
    for (const i of this.icons) this.iconBase.set(i, i.scaleX);
    this.pos.score.x = ui(r.score.x + r.score.w / 2); this.pos.levelBar.x = ui(r.quota.x + r.quota.w / 2);
    this.pos.score.y = this.pos.levelBar.y = this.pos.energyBar.y = cy; this.pos.energyBar.x = ui(r.energy.bar + r.energy.barW / 2);
    const bx = ui(r.energy.bar), bh = ui(M.bar), bw = ui(r.energy.barW);
    g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(bx, cy - bh / 2, bw, bh, bh / 2);
    if (fill > 0) g.fillStyle(toInt(TOKENS.sky.energy)).fillRoundedRect(bx, cy - bh / 2, Math.max(bh, bw * fill), bh, bh / 2);
  }
  private drawChip(text: string | null): void {
    this.chipText.setVisible(text !== null); this.chipIcon.setVisible(text !== null);
    if (text === null) { this.chipG.clear(); this.chipKey = ''; return; }
    if (text === this.chipKey) return;
    this.chipKey = text; this.chipText.setText(text);
    const { cx, y, h } = this.l.chip, tw = this.chipText.width, pad = ui(M.chipPadL), ic = ui(M.chipIcon), gap = ui(M.chipGap);
    const w = pad + ic + gap + tw + ui(M.chipPadR), x = cx - w / 2;
    this.chipG.clear(); drawCard(this.chipG, x, y, w, h, h / 2, TOKENS.surface.card);
    this.chipIcon.setPosition(x + pad + ic / 2, y + h / 2); this.chipText.setPosition(x + pad + ic + gap, y + h / 2).setOrigin(0, 0.5);
  }
  private drawPause(paused: boolean): void {
    const r = this.l.pause.r, g = this.pauseG.clear();
    drawCard(g, -r, -r, 2 * r, 2 * r, r, TOKENS.surface.card);
    g.fillStyle(toInt(TOKENS.text.primary));
    const hb = ui(M.pauseBarH) / 2;
    if (paused) g.fillTriangle(-ui(M.playBack), -ui(M.playHalf), -ui(M.playBack), ui(M.playHalf), ui(M.playTip), 0);
    else g.fillRoundedRect(-ui(M.pauseBarX), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius)).fillRoundedRect(ui(M.pauseGap), -hb, ui(M.pauseBarW), 2 * hb, ui(M.pauseRadius));
  }

  /** P3a juice adapter: centre of the score pill, the energy bar and the quota pill (JuiceHud.point). */
  point(target: HudTarget): Pt { return this.pos[target]; }
  /** P3a-R1/R2/R4: yoyo scale bump on a pill's icon and text, relative to their base scale (reduced motion is gated in the mapper). */
  bump(target: HudTarget, scale: number, ms: number): void {
    const parts = target === 'score' ? [this.icons[1]!, this.score] : target === 'levelBar' ? [this.icons[0]!, this.done, this.total] : [this.icons[2]!, this.energy];
    for (const o of parts) {
      const base = this.iconBase.get(o as Phaser.GameObjects.Image) ?? 1;
      this.scene.tweens.killTweensOf(o); o.setScale(base);
      this.scene.tweens.add({ targets: o, scaleX: base * scale, scaleY: base * scale, duration: ms / 2, yoyo: true, ease: 'Quad.easeOut' });
    }
  }
  /** P3a-R6: the chip's flag icon pops in from zero; ms 0 (reduced motion) is a no-op. */
  plantFlag(ms: number): void {
    if (ms <= 0) return;
    this.scene.tweens.killTweensOf(this.chipIcon); this.chipIcon.setScale(0);
    this.scene.tweens.add({ targets: this.chipIcon, scaleX: this.chipBase, scaleY: this.chipBase, duration: ms, ease: 'Back.easeOut' });
  }
}
