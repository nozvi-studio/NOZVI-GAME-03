import type Phaser from 'phaser';
import { TOKENS, toInt, uiTheme } from '../uiTokens';
import { ui, UI_SCALE } from '../ui/layout';
import { currentPalette, reduceMotion, themeOf } from '../render/palette';
import { bindPress } from '../scenes/ui';
import { drawCard, hudLabel } from './draw';
import { hudIconKey } from './hudIcons';
import { HUD_MOCK, statsRow, type HudLayout, type StatsRow } from './hudLayout';
import type { HudView } from './hudModel';
import { WIDTH } from '../layout';
import type { HudTarget, Pt } from '../juice/types';
import type { Balance } from '../../core';
import { motionFor, type Motion } from '../motion';
import { chipTransition, easeMsFor, energyCue, levelTitleChanged } from './hudMotion';

// Mockup px of the stats / chip / pause drawing (GameD2); layout rects themselves come from HUD_MOCK / hudLayout.
const M = { quotaBarH: 4, quotaBarInset: 14, quotaBarGap: 5, stat: 19, chip: 14, mango: 28, star: 20, bolt: 16, bar: 10, chipPadL: 12, chipIcon: 18, chipGap: 8, chipPadR: 16,
  pauseBarW: 5, pauseBarH: 16, pauseBarX: 7, pauseGap: 2, pauseRadius: 2, playHalf: 9, playBack: 6, playTip: 9, pressScale: 0.94, disabledAlpha: 0.4 } as const;

/** UIFIX-R3: the wait prompt has no icon (no arrow icon exists); ramp / checkpoint chips keep the flag. */
export const chipHasIcon = (kind: 'ramp' | 'checkpoint' | 'wait' | undefined): boolean => kind !== 'wait';

// P3b2-R15 GameD2 header (level + biome + pause), stats pills (mango x/y, score, energy) and the checkpoint / ramp chip.
export class HudTop {
  readonly pauseButton: Phaser.GameObjects.Container;
  private readonly g: Phaser.GameObjects.Graphics; private readonly pauseG: Phaser.GameObjects.Graphics;
  private readonly level: Phaser.GameObjects.Text; private readonly biome: Phaser.GameObjects.Text;
  private readonly done: Phaser.GameObjects.Text; private readonly total: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text; private readonly energy: Phaser.GameObjects.Text;
  private readonly chipG: Phaser.GameObjects.Graphics; private readonly chipText: Phaser.GameObjects.Text; private readonly chipIcon: Phaser.GameObjects.Image;
  private readonly icons: Phaser.GameObjects.Image[]; private rowKey = ''; private chipKey = ''; private pauseKey = '';
  /** Last drawn positions (set in drawRow, read by the juice adapter; never recomputed per frame). */
  private readonly pos = { score: { x: 0, y: 0 }, energyBar: { x: 0, y: 0 }, levelBar: { x: 0, y: 0 } };
  private readonly motion: Motion; private readonly cfg: Balance['motion'];
  private readonly chipBox: Phaser.GameObjects.Container;
  private row: StatsRow | null = null; private quotaBar = false; private cueKey = '';
  private scoreTarget = -1; private scoreW = 0; private readonly scoreEase = { v: 0 };
  private quotaTarget = -1; private quotaShown = 0; private readonly quotaEase = { v: 0 };
  private energyTarget = -1; private energyShown = 0; private readonly energyEase = { v: 0 };
  private stopBolt: (() => void) | null = null; private stopQuota: (() => void) | null = null;
  private titleSeen: string | null = null; private chipKind: string | null = null;

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
    this.motion = motionFor(scene); this.cfg = (scene.registry.get('balance') as Balance).motion;
    this.chipBox = scene.add.container(0, 0, [this.chipG, this.chipIcon, this.chipText]);   // one animated target: children keep world coordinates
    this.chipBox.setVisible(false);
  }

  apply(v: HudView, paused: boolean, pauseEnabled: boolean): void {
    const th = uiTheme(themeOf(currentPalette()));
    const titleMoved = levelTitleChanged(this.titleSeen, v.levelTitle); this.titleSeen = v.levelTitle;
    this.level.setText(v.levelTitle).setColor(th.title); this.biome.setText(v.biomeName).setColor(th.soft);
    if (titleMoved) { this.motion.slideIn(this.level, 'down'); this.motion.slideIn(this.biome, 'down', 1); }   // MOT-4-R12 biome staggered by staggerMs
    this.done.setText(v.quota.done); this.total.setText(v.quota.total); this.energy.setText(v.energy.text);
    if (v.scoreValue !== this.scoreTarget) this.retargetScore(v.scoreValue);
    const w = (t: Phaser.GameObjects.Text): number => t.width / UI_SCALE;
    const row = statsRow({ quota: w(this.done) + w(this.total), score: this.scoreW, energy: w(this.energy) });
    const key = JSON.stringify(row) + String(v.quotaBar);
    this.quotaBar = v.quotaBar;
    this.syncBars(v.quotaFill, v.energy.fill);
    if (key !== this.rowKey) { this.rowKey = key; this.row = row; this.drawRow(row); }
    this.syncCues(v);
    this.drawChip(v.chip);
    const pk = `${paused}|${pauseEnabled}`;
    if (pk === this.pauseKey) return;
    this.pauseKey = pk;
    if (this.pauseButton.input) this.pauseButton.input.enabled = pauseEnabled;
    this.pauseButton.setAlpha(pauseEnabled ? 1 : M.disabledAlpha); this.drawPause(paused);
  }

  /** MOT-4-R7 rising score ticks via motion.ease (same cubicOut as countUp; ease, not countUp, so the P3a bump cannot freeze it). */
  private retargetScore(target: number): void {
    const first = this.scoreTarget < 0, from = this.scoreEase.v;
    this.scoreTarget = target;
    this.score.setText(String(target)); this.scoreW = this.score.width / UI_SCALE;          // layout uses the FINAL width
    if (first || target <= from) { this.motion.ease(this.scoreEase, target, 0, () => {}); return; }
    this.score.setText(String(Math.round(from)));
    this.motion.ease(this.scoreEase, target, this.cfg.hudTickMs, x => { this.score.setText(String(Math.round(x))); });
  }
  /** MOT-4-R8/R9 quota and energy fills ease; first paint and a falling quota (level-up reset) jump; a spend eases faster. */
  private syncBars(quota: number, energy: number): void {
    if (quota !== this.quotaTarget) {
      const jump = this.quotaTarget < 0 || quota < this.quotaTarget; this.quotaTarget = quota;
      if (!jump) this.bump('levelBar', this.cfg.releaseOvershoot, this.cfg.tapUpMs);   // R8 pill pop on a progress change
      this.motion.ease(this.quotaEase, quota, jump ? 0 : this.cfg.barEaseMs, x => { this.quotaShown = x; this.redrawRow(); });
    }
    if (energy !== this.energyTarget) {
      const first = this.energyTarget < 0, ms = first ? 0 : easeMsFor(this.energyTarget, energy, this.cfg); this.energyTarget = energy;
      this.motion.ease(this.energyEase, energy, ms, x => { this.energyShown = x; this.redrawRow(); });
    }
  }
  private redrawRow(): void { if (this.row) this.drawRow(this.row); }
  /** MOT-4-R10 low energy: bolt pulses; full: one bolt pop. R8: the mango icon pulses while one mango is left. Cues are additive, never the only signal. */
  private syncCues(v: HudView): void {
    const cue = energyCue(v.energy.fill, this.cfg.energyLowFrac), key = `${cue}|${v.quotaLast}`;
    if (key === this.cueKey) return;
    const prev = this.cueKey.split('|')[0]; this.cueKey = key;
    this.stopBolt?.(); this.stopBolt = null; this.stopQuota?.(); this.stopQuota = null;
    if (cue === 'low') this.stopBolt = this.motion.pulse(this.icons[2]!);
    else if (cue === 'full' && prev !== '' && prev !== 'full') this.motion.popIn(this.icons[2]!);
    if (v.quotaLast) this.stopQuota = this.motion.pulse(this.icons[0]!);
  }

  private drawRow(r: StatsRow): void {
    const y = this.l.statsY, h = this.l.statsH, rad = h / 2, cy = y + h / 2, g = this.g.clear();
    for (const p of [r.quota, r.score, r.energy]) drawCard(g, ui(p.x), y, ui(p.w), h, rad, TOKENS.surface.card);
    const text = (t: Phaser.GameObjects.Text, x: number): void => { t.setPosition(ui(x), cy).setOrigin(0, 0.5); };
    text(this.done, r.quota.text); this.total.setPosition(this.done.x + this.done.width, cy).setOrigin(0, 0.5);
    text(this.score, r.score.text); text(this.energy, r.energy.text);
    this.icons[0]!.setPosition(ui(r.quota.icon + M.mango / 2), cy).setDisplaySize(ui(M.mango), ui(M.mango));
    this.icons[1]!.setPosition(ui(r.score.icon + M.star / 2), cy).setDisplaySize(ui(M.star), ui(M.star));
    this.icons[2]!.setPosition(ui(r.energy.bolt + M.bolt / 2), cy).setDisplaySize(ui(M.bolt), ui(M.bolt));
    for (const o of [...this.icons, this.done, this.total, this.score, this.energy]) this.motion.rebase(o);   // layout moved them; keep the tween rest position current
    this.pos.score.x = ui(r.score.x + r.score.w / 2); this.pos.levelBar.x = ui(r.quota.x + r.quota.w / 2);
    this.pos.score.y = this.pos.levelBar.y = this.pos.energyBar.y = cy; this.pos.energyBar.x = ui(r.energy.bar + r.energy.barW / 2);
    const bx = ui(r.energy.bar), bh = ui(M.bar), bw = ui(r.energy.barW), low = energyCue(this.energyShown, this.cfg.energyLowFrac) === 'low';
    g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(bx, cy - bh / 2, bw, bh, bh / 2);
    if (this.energyShown > 0) g.fillStyle(toInt(low ? TOKENS.danger.text : TOKENS.sky.energy)).fillRoundedRect(bx, cy - bh / 2, Math.max(bh, bw * this.energyShown), bh, bh / 2);   // R10 low = warn hue
    if (this.quotaBar) {          // R8 quota fill bar, none at the max level
      const qh = ui(M.quotaBarH), qx = ui(r.quota.x) + ui(M.quotaBarInset), qw = ui(r.quota.w) - 2 * ui(M.quotaBarInset), qy = y + h - qh - ui(M.quotaBarGap);
      g.fillStyle(toInt(TOKENS.hud.energyTrack)).fillRoundedRect(qx, qy, qw, qh, qh / 2);
      if (this.quotaShown > 0) g.fillStyle(toInt(TOKENS.hud.quota)).fillRoundedRect(qx, qy, Math.max(qh, qw * this.quotaShown), qh, qh / 2);
    }
  }
  private drawChip(chip: HudView['chip']): void {
    const kind = chip?.kind ?? null, tr = chipTransition(this.chipKind, kind); this.chipKind = kind;
    if (chip === null) {
      if (tr === 'out') this.motion.fadeOut(this.chipBox); else if (this.chipBox.alpha <= 0) this.chipBox.setVisible(false);
      this.chipKey = ''; return;
    }
    const text = chip.text, icon = chipHasIcon(chip.kind);
    this.chipBox.setVisible(true); this.chipText.setVisible(true); this.chipIcon.setVisible(icon);
    const key = `${chip.kind}|${text}`;
    if (key !== this.chipKey) {
      this.chipKey = key; this.chipText.setText(text);
      const { cx, y, h } = this.l.chip, tw = this.chipText.width, pad = ui(M.chipPadL), ic = icon ? ui(M.chipIcon) : 0, gap = icon ? ui(M.chipGap) : 0;
      const w = pad + ic + gap + tw + ui(M.chipPadR), x = cx - w / 2;
      this.chipG.clear(); drawCard(this.chipG, x, y, w, h, h / 2, TOKENS.surface.card);
      this.chipIcon.setPosition(x + pad + ic / 2, y + h / 2); this.chipText.setPosition(x + pad + ic + gap, y + h / 2).setOrigin(0, 0.5);
    }
    if (tr === 'in') { this.chipBox.setAlpha(1); this.motion.slideIn(this.chipBox, 'down'); }   // MOT-4-R13 fade + slide in
    else if (tr === 'cross') { this.chipBox.setAlpha(0); this.motion.fadeIn(this.chipBox); }    // cross-fade over fadeMs
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
    for (const o of parts) this.motion.snap(o, scale, ms, target === 'score' ? undefined : () => { this.cueKey = ''; });   // re-arm the pulse cues a bump interrupted
  }
  /** P3a-R6: the chip's flag icon pops in from zero; ms 0 (reduced motion) is a no-op. */
  plantFlag(ms: number): void {
    if (ms <= 0) return;          // reduced motion is gated in the mapper (ms 0)
    this.motion.popIn(this.chipIcon);
  }
  /** Test seam: the score text as drawn right now. */
  scoreText(): string { return this.score.text; }
}
