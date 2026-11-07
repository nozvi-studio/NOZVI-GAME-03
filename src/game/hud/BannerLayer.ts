import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { bannerMotion } from '../juice/juiceMap';
import { TOKENS, toInt } from '../uiTokens';
import { ui } from '../ui/layout';
import { drawCard, hudLabel } from './draw';
import { bannerStrip, type BannerSpec, type SkillPill } from './banners';
import { hudIconKey } from './hudIcons';
import { bannerStripRect, STRIP_MOCK, stripRows, type HudLayout } from './hudLayout';

// SkillActiveD2 / tip metrics in mockup px; the banner strip geometry lives in hudLayout (STRIP_MOCK).
const W = { tipMax: 300 } as const;
const M = {
  shadowDy: 4,
  tip: { font: 15, padX: 28, padY: 20, minH: 46, radius: 16, floor: 60, margin: 16, tailLeft: 50, tailGap: 11, tailHalf: 9, tailH: 10 },
  pill: { h: 30, font: 14, icon: 18, padL: 10, gap: 6, padR: 14, rowGap: 6 },
  tint: { radius: 20, ring: 4, ringAlpha: 0.8, inset: 2, ringInset: 6 },
} as const;

// UIFIX-R1 banner strip (level-up, challenge, biome, checkpoint, hint), tips and SkillActiveD2 pills / slow-mo tint.
export class BannerLayer {
  private readonly root: Phaser.GameObjects.Container; private readonly tipBox: Phaser.GameObjects.Container;
  private readonly tipG: Phaser.GameObjects.Graphics; private readonly tipText: Phaser.GameObjects.Text;
  private readonly pills: { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image }[] = [];
  private readonly tint: Phaser.GameObjects.Graphics; private readonly pillKeys = ['', '']; private readonly strip: ReturnType<typeof bannerStripRect>;
  private readonly enter = { k: 0 }; private queue: BannerSpec[] = []; private cardTimer?: Phaser.Time.TimerEvent; private tipTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene, private readonly l: HudLayout, private readonly b: Balance) {
    this.strip = bannerStripRect(b.board.cols);
    this.tint = scene.add.graphics().setName('slowmo-tint').setVisible(false);
    this.root = scene.add.container(0, 0).setName('banner').setVisible(false);
    this.tipG = scene.add.graphics();
    this.tipText = hudLabel(scene, 0, 0, '', M.tip.font, TOKENS.hud.tooltipText, 800, 'tip').setOrigin(0.5).setAlign('center');
    this.tipBox = scene.add.container(0, 0, [this.tipG, this.tipText]);
    this.showTip(false);
    for (const slot of [0, 1] as const) {
      const g = scene.add.graphics(), icon = scene.add.image(0, 0, hudIconKey('slowmo', 'active')).setDisplaySize(ui(M.pill.icon), ui(M.pill.icon));
      const text = hudLabel(scene, 0, 0, '', M.pill.font, TOKENS.text.primary, 900, `pill-${slot}`).setOrigin(0, 0.5);
      const c = scene.add.container(0, 0, [g, icon, text]).setVisible(false);
      this.pills.push({ c, g, text, icon });
    }
    this.drawTint();
  }

  show(queue: readonly BannerSpec[]): void { this.reset(); this.queue = [...queue]; this.next(); }
  /** Clears the cards, their timer and pop tween; the tip is left alone (a tip may be raised just before a queue). */
  private reset(): void { this.cardTimer?.remove(); this.scene.tweens.killTweensOf(this.root); this.scene.tweens.killTweensOf(this.enter); this.root.setScale(1).setAlpha(1).setPosition(0, 0); this.queue = []; this.clear(); this.root.setVisible(false); }
  hide(): void { this.reset(); this.tipTimer?.remove(); this.showTip(false); }
  private next(): void {
    const spec = this.queue.shift();
    if (!spec) { this.clear(); this.root.setVisible(false); return; }
    this.clear(); this.render(spec); this.root.setVisible(true);
    this.enterMotion();
    this.cardTimer = this.scene.time.delayedCall(this.b.ui.bannerMs, () => this.next());
  }
  /** P3a-R8 slide + scale-in (soft fade when reduced); the root scales about (0,0), so the pivot is compensated to keep the card centred. */
  private enterMotion(): void {
    const m = bannerMotion(this.b, reduceMotion()), r = this.strip, px = r.x + r.w / 2, py = r.y + r.h / 2, st = this.enter;
    const apply = (k: number): void => {
      const s = m.scaleFrom + (1 - m.scaleFrom) * k;
      this.root.setAlpha(k).setScale(s).setPosition(px * (1 - s), py * (1 - s) + m.slidePx * (1 - k));
    };
    this.scene.tweens.killTweensOf(st); st.k = 0; apply(0);
    this.scene.tweens.add({ targets: st, k: 1, duration: m.inMs, ease: m.slidePx > 0 ? 'Back.easeOut' : 'Linear', onUpdate: () => apply(st.k), onComplete: () => apply(1) });
  }
  private clear(): void { this.root.removeAll(true); }

  private render(s: BannerSpec): void {
    const v = bannerStrip(s), m = STRIP_MOCK, r = this.strip, rows = stripRows(v.sub !== null, r.h);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.root.add(o); return o; };
    add(this.scene.add.graphics()).fillStyle(toInt(v.fill), m.alpha).fillRoundedRect(r.x, r.y, r.w, r.h, ui(m.radius));
    const icon = ui(m.icon), tx = r.x + ui(m.pad + m.icon + m.iconGap);
    add(this.scene.add.image(r.x + ui(m.pad) + icon / 2, r.y + r.h / 2, hudIconKey(v.icon)).setDisplaySize(icon, icon));
    add(hudLabel(this.scene, tx, r.y + rows.titleY, v.title, m.title, v.ink, 900, 'banner-title').setOrigin(0, 0));
    if (v.sub !== null && rows.subY !== null) add(hudLabel(this.scene, tx, r.y + rows.subY, v.sub, m.sub, v.ink, 800, 'banner-subtitle').setOrigin(0, 0));
  }

  /** Dark tooltip bubble; a slot adds a tail that points at that skill button (MEC-007-R12, BannersD2 skillUnlocked). */
  tip(text: string, tailSlot: 0 | 1 | null = null): void {
    const m = M.tip;
    this.tipTimer?.remove(); this.tipText.setText(text).setWordWrapWidth(ui(W.tipMax - m.padX));
    const w = Math.min(ui(W.tipMax), this.tipText.width + ui(m.padX)), h = Math.max(ui(m.minH), this.tipText.height + ui(m.padY)), g = this.tipG.clear();
    let x: number, y: number;
    if (tailSlot === null) { x = (WIDTH - w) / 2; y = BOARD.y + BOARD.size - ui(m.floor) - h; }
    else {
      const s = this.l.skills[tailSlot]; x = Math.min(WIDTH - ui(m.margin) - w, Math.max(ui(m.margin), s.cx - ui(m.tailLeft))); y = s.groupTop - ui(m.tailGap) - h;
    }
    g.fillStyle(toInt(TOKENS.hud.tooltip)).fillRoundedRect(x, y, w, h, ui(m.radius));
    if (tailSlot !== null) { const tx = this.l.skills[tailSlot].cx; g.fillTriangle(tx - ui(m.tailHalf), y + h, tx + ui(m.tailHalf), y + h, tx, y + h + ui(m.tailH)); }
    this.tipText.setPosition(x + w / 2, y + h / 2); this.showTip(true);
    this.tipTimer = this.scene.time.delayedCall(this.b.ui.bannerMs * this.b.ui.hud.tipFactor, () => this.showTip(false));
  }

  /** The text carries its own flag as well as the box, so a probe on either sees the state. */
  private showTip(on: boolean): void { this.tipBox.setVisible(on); this.tipText.setVisible(on); }

  setPills(pills: readonly SkillPill[]): void {
    const m = M.pill;
    for (const slot of [0, 1] as const) {
      const p = this.pills[slot]!, spec = pills.find(x => x.slot === slot) ?? null;
      const key = spec ? `${spec.skill}|${spec.text}|${pills.indexOf(spec)}` : '';
      if (key === this.pillKeys[slot]) continue;
      this.pillKeys[slot] = key;
      p.c.setVisible(spec !== null); p.text.setVisible(spec !== null); if (!spec) continue;
      p.text.setText(spec.text); p.icon.setTexture(hudIconKey(spec.skill, spec.skill === 'tailSnip' || spec.skill === 'mangoRain' ? 'ink' : 'active'));
      const h = ui(m.h), w = ui(m.padL + m.icon + m.gap + m.padR) + p.text.width;
      const y = this.strip.y + this.strip.h + ui(STRIP_MOCK.pillGap) + pills.indexOf(spec) * (h + ui(m.rowGap)), x = (WIDTH - w) / 2;
      p.g.clear(); drawCard(p.g, x, y, w, h, h / 2, TOKENS.surface.card, { dy: M.shadowDy });
      p.icon.setPosition(x + ui(m.padL + m.icon / 2), y + h / 2); p.text.setPosition(x + ui(m.padL + m.icon + m.gap), y + h / 2);
    }
  }
  setSlowmo(on: boolean): void { this.tint.setVisible(on); }
  private drawTint(): void {
    const h = TOKENS.hud, m = M.tint, r = ui(m.radius), ins = ui(m.inset);
    this.tint.fillStyle(toInt(h.slowTint), h.slowTintAlpha).fillRect(0, 0, WIDTH, HEIGHT)
      .fillStyle(toInt(h.slowTint), h.slowBoardAlpha).fillRoundedRect(BOARD.x, BOARD.y, BOARD.size, BOARD.size, r)
      .lineStyle(ui(m.ring), toInt(h.ring), m.ringAlpha).strokeRoundedRect(BOARD.x + ins, BOARD.y + ins, BOARD.size - 2 * ins, BOARD.size - 2 * ins, r - ui(m.ringInset) / 3);
  }
}
