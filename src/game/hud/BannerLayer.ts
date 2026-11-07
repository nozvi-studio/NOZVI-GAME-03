import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { bannerMotion } from '../juice/juiceMap';
import { FONT_TITLE, TOKENS, toInt } from '../uiTokens';
import { ui, UI_SCALE } from '../ui/layout';
import { drawCard, hudLabel } from './draw';
import type { BannerSpec, SkillPill } from './banners';
import { hudIconKey } from './hudIcons';
import type { HudLayout } from './hudLayout';
import { stack } from './stack';

// BannersD2 / SkillActiveD2 metrics in mockup px (tops are below the board's inner top).
const TOP = { levelUp: 56, challenge: 56, biome: 66, checkpoint: 70, hint: 56, pill: 8 } as const;
const W = { card: 318, checkpoint: 350, hint: 220, tipMax: 300 } as const;
const M = {
  radius: 26, hintRadius: 16, cardDy: 14, shadowDy: 4,
  levelUp: { title: 50, titleH: 47.5, subtitle: 22, subtitleH: 26.4, chipH: 34, chipMt: 6, stroke: 9, gap: 4, pad: 16 },
  challenge: { title: 34, stroke: 7, pad: 16 },
  biome: { icon: 34, label: 14, labelH: 16.8, name: 42, nameH: 39.9, nameStroke: 8, tagline: 14, taglineH: 16.8, gap: 4, pad: 18 },
  checkpoint: { pad: 16, badge: 54, badgeLeft: 20, badgeIcon: 30, textGap: 14, title: 22, subtitle: 14, titleY: 24, subY: 48 },
  hint: { font: 15, padX: 28, padY: 12 },
  chip: { font: 13, h: 34, padL: 10, icon: 22, gap: 8, padR: 14 },
  tip: { font: 15, padX: 28, padY: 20, minH: 46, radius: 16, floor: 60, margin: 16, tailLeft: 50, tailGap: 11, tailHalf: 9, tailH: 10 },
  pill: { h: 30, font: 14, icon: 18, padL: 10, gap: 6, padR: 14, rowGap: 6 },
  tint: { radius: 20, ring: 4, ringAlpha: 0.8, inset: 2, ringInset: 6 },
} as const;

// P3b2-R10 BannersD2 cards (level-up, challenge, biome, checkpoint, hint), tips and SkillActiveD2 pills / slow-mo tint.
export class BannerLayer {
  private readonly root: Phaser.GameObjects.Container; private readonly tipBox: Phaser.GameObjects.Container;
  private readonly tipG: Phaser.GameObjects.Graphics; private readonly tipText: Phaser.GameObjects.Text;
  private readonly pills: { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image }[] = [];
  private readonly tint: Phaser.GameObjects.Graphics; private readonly pillKeys = ['', ''];
  private readonly enter = { k: 0 }; private queue: BannerSpec[] = []; private cardTimer?: Phaser.Time.TimerEvent; private tipTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene, private readonly l: HudLayout, private readonly b: Balance) {
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
    this.enterMotion(spec);
    this.cardTimer = this.scene.time.delayedCall(this.b.ui.bannerMs, () => this.next());
  }
  /** P3a-R8 slide + scale-in (soft fade when reduced); the root scales about (0,0), so the pivot is compensated to keep the card centred. */
  private enterMotion(spec: BannerSpec): void {
    const m = bannerMotion(this.b, reduceMotion()), px = WIDTH / 2, py = BOARD.y + ui(TOP[spec.kind]), st = this.enter;
    const apply = (k: number): void => {
      const s = m.scaleFrom + (1 - m.scaleFrom) * k;
      this.root.setAlpha(k).setScale(s).setPosition(px * (1 - s), py * (1 - s) + m.slidePx * (1 - k));
    };
    this.scene.tweens.killTweensOf(st); st.k = 0; apply(0);
    this.scene.tweens.add({ targets: st, k: 1, duration: m.inMs, ease: m.slidePx > 0 ? 'Back.easeOut' : 'Linear', onUpdate: () => apply(st.k), onComplete: () => apply(1) });
  }
  private clear(): void { this.root.removeAll(true); }

  private render(s: BannerSpec): void {
    const y0 = BOARD.y + ui(TOP[s.kind]);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.root.add(o); return o; };
    const cx = WIDTH / 2;
    const put = (g: Phaser.GameObjects.Graphics, w: number, h: number, fill: string, r: number = M.radius): number => {
      drawCard(g, cx - w / 2, y0, w, h, ui(r), fill, { shadowAlpha: TOKENS.hud.cardShadowAlpha, dy: M.cardDy }); return cx - w / 2;
    };
    const g = add(this.scene.add.graphics());
    const lilita = (y: number, text: string, size: number, fill: string, stroke: string, strokePx: number, name: string): Phaser.GameObjects.Text =>
      add(this.scene.add.text(cx, y, text, { fontFamily: FONT_TITLE, fontSize: `${ui(size)}px`, color: fill, stroke, strokeThickness: ui(strokePx) }).setName(name).setOrigin(0.5, 0)
        .setShadow(0, ui(M.shadowDy), stroke, 0, true, true));
    /** Mockup-px row height: the measured Lilita text (stroke + font metrics make it taller than the CSS line box) or the mockup height if larger. */
    const measured = (t: Phaser.GameObjects.Text, mock: number): number => Math.max(mock, t.height / UI_SCALE);
    switch (s.kind) {
      case 'levelUp': {
        const m = M.levelUp, title = lilita(y0, s.title, m.title, TOKENS.accent.butter, TOKENS.text.logoOutline, m.stroke, 'banner-title');
        const rows = stack([{ h: measured(title, m.titleH) }, { h: m.subtitleH }, ...(s.chip ? [{ h: m.chipH, mt: m.chipMt }] : [])], { gap: m.gap, padTop: m.pad, padBottom: m.pad });
        put(g, ui(W.card), ui(rows.height), TOKENS.surface.card); title.setY(y0 + ui(rows.ys[0]!));
        add(hudLabel(this.scene, cx, y0 + ui(rows.ys[1]!), s.subtitle, m.subtitle, TOKENS.text.primary, 900, 'banner-subtitle').setOrigin(0.5, 0));
        if (s.chip) this.chip(add, cx, y0 + ui(rows.ys[2]!), s.chip, 'shrink', 'banner-chip');
        break;
      }
      case 'challenge': {
        const m = M.challenge, title = lilita(y0 + ui(m.pad), s.title, m.title, TOKENS.accent.orange, TOKENS.text.logoOutline, m.stroke, 'banner-title');
        const room = ui(W.card - 2 * m.pad); if (title.width > room) title.setScale(room / title.width); // a long title shrinks to fit the card
        put(g, ui(W.card), ui(m.pad + measured(title, m.title) + m.pad), TOKENS.surface.card);
        break;
      }
      case 'biome': {
        const m = M.biome, name = lilita(y0, s.name, m.name, TOKENS.surface.white, TOKENS.text.slate, m.nameStroke, 'banner-title');
        const rows = stack([{ h: m.icon }, { h: m.labelH }, { h: measured(name, m.nameH) }, { h: m.taglineH }], { gap: m.gap, padTop: m.pad, padBottom: m.pad });
        put(g, ui(W.card), ui(rows.height), TOKENS.sky.stat); name.setY(y0 + ui(rows.ys[2]!));
        add(this.scene.add.image(cx, y0 + ui(rows.ys[0]! + m.icon / 2), hudIconKey('biome')).setDisplaySize(ui(m.icon), ui(m.icon)));
        add(hudLabel(this.scene, cx, y0 + ui(rows.ys[1]!), s.label, m.label, TOKENS.text.slate, 900, 'banner-label').setOrigin(0.5, 0));
        add(hudLabel(this.scene, cx, y0 + ui(rows.ys[3]!), s.tagline, m.tagline, TOKENS.text.slate, 800, 'banner-tagline').setOrigin(0.5, 0));
        break;
      }
      case 'checkpoint': {
        const m = M.checkpoint, h = ui(m.pad + m.badge + m.pad), x = put(g, ui(W.checkpoint), h, TOKENS.hud.mintCard);
        const bx = x + ui(m.badgeLeft + m.badge / 2), tx = x + ui(m.badgeLeft + m.badge + m.textGap);
        g.fillStyle(toInt(TOKENS.green.face)).fillCircle(bx, y0 + h / 2, ui(m.badge / 2));
        add(this.scene.add.image(bx, y0 + h / 2, hudIconKey('flag', 'ink')).setDisplaySize(ui(m.badgeIcon), ui(m.badgeIcon)));
        add(hudLabel(this.scene, tx, y0 + ui(m.titleY), s.title, m.title, TOKENS.hud.mintInk, 900, 'banner-title'));
        add(hudLabel(this.scene, tx, y0 + ui(m.subY), s.subtitle, m.subtitle, TOKENS.hud.mintInk, 800, 'banner-subtitle'));
        break;
      }
      case 'hint': {
        const m = M.hint;
        const t = add(hudLabel(this.scene, cx, y0 + ui(m.padY), s.text, m.font, TOKENS.hud.tooltipText, 800, 'banner-title').setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(ui(W.hint - m.padX)));
        put(g, ui(W.hint), t.height + 2 * ui(m.padY), TOKENS.hud.tooltip, M.hintRadius);
        break;
      }
    }
  }
  private chip(add: <T extends Phaser.GameObjects.GameObject>(o: T) => T, cx: number, y: number, text: string, icon: 'shrink', name: string): void {
    const m = M.chip;
    const t = add(hudLabel(this.scene, 0, y + ui(m.h / 2), text, m.font, TOKENS.text.primary, 800, name).setOrigin(0, 0.5));
    const w = ui(m.padL + m.icon + m.gap + m.padR) + t.width, x = cx - w / 2, g = this.scene.add.graphics(); this.root.addAt(g, 1);
    g.fillStyle(toInt(TOKENS.surface.sand)).fillRoundedRect(x, y, w, ui(m.h), ui(m.h / 2));
    add(this.scene.add.image(x + ui(m.padL + m.icon / 2), y + ui(m.h / 2), hudIconKey(icon)).setDisplaySize(ui(m.icon), ui(m.icon))); t.setX(x + ui(m.padL + m.icon + m.gap));
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
      const y = BOARD.y + ui(TOP.pill) + pills.indexOf(spec) * (h + ui(m.rowGap)), x = (WIDTH - w) / 2;
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
