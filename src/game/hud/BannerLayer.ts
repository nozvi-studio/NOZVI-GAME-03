import type Phaser from 'phaser';
import type { Balance } from '../../core';
import { BOARD, HEIGHT, WIDTH } from '../layout';
import { reduceMotion } from '../render/palette';
import { bannerMotion } from '../juice/juiceMap';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { d3, ui } from '../ui/layout';
import { hostOf, lipPx, skinTexture } from '../ui/skin';
import { chip } from '../ui/widgets';
import { hudLabel } from './draw';
import { bannerStrip, type BannerSpec, type SkillPill } from './banners';
import { advanceBanners, enqueueBanners, IDLE_BANNERS, startBanners, type BannerQueueState } from './bannerQueue';
import { hudIconKey } from './hudIcons';
import { bannerStripRect, STRIP_MOCK, skillTipPlacement } from './hudLayout';
import type { D3HudLayout } from './d3HudLayout';

// SkillActiveD2 / tip metrics in mockup px; the banner strip geometry lives in hudLayout (STRIP_MOCK).
const W = { tipMax: 300 } as const;
const M = {
  shadowDy: 4,
  tip: { font: 15, padX: 28, padY: 20, minH: 46, radius: 16, floor: 60, margin: 16, tailLeft: 50, tailGap: 11, tailHalf: 9, tailH: 10 },
  pill: { h: 30, font: 14, icon: 18, padL: 10, gap: 6, padR: 14, rowGap: 6 },
  // D3-R16 strip card metrics in 360-wide board px (d3()): icon 22, gap 8, title Lilita 15, sub Nunito 12, line-height 1.15.
  card: { chipH: 20, icon: 22, gap: 8, title: 15, sub: 12, lineH: 1.15, unit: 0.5 },
  tint: { radius: 20, ring: 4, ringAlpha: 0.8, inset: 2, ringInset: 6 },
} as const;

// UIFIX-R1 banner strip (level-up, challenge, biome, checkpoint, hint), tips and SkillActiveD2 pills / slow-mo tint.
export class BannerLayer {
  private readonly root: Phaser.GameObjects.Container; private readonly tipBox: Phaser.GameObjects.Container;
  private readonly tipG: Phaser.GameObjects.Graphics; private readonly tipText: Phaser.GameObjects.Text;
  private readonly pills: { c: Phaser.GameObjects.Container; lip: Phaser.GameObjects.Image; face: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; icon: Phaser.GameObjects.Image }[] = [];
  private readonly tint: Phaser.GameObjects.Graphics; private readonly pillKeys = ['', '']; private readonly pillW = [0, 0]; private readonly strip: ReturnType<typeof bannerStripRect>;
  private readonly enter = { k: 0 }; private q: BannerQueueState = IDLE_BANNERS; private cardTimer?: Phaser.Time.TimerEvent; private tipTimer?: Phaser.Time.TimerEvent;

  constructor(private readonly scene: Phaser.Scene, private readonly l: D3HudLayout, private readonly b: Balance) {
    this.strip = bannerStripRect(b.board.cols);
    this.tint = scene.add.graphics().setName('slowmo-tint').setVisible(false);
    this.root = scene.add.container(0, 0).setName('banner').setVisible(false);
    this.tipG = scene.add.graphics();
    this.tipText = hudLabel(scene, 0, 0, '', M.tip.font, TOKENS.hud.tooltipText, 800, 'tip').setOrigin(0.5).setAlign('center');
    this.tipBox = scene.add.container(0, 0, [this.tipG, this.tipText]);
    this.showTip(false);
    for (const slot of [0, 1] as const) {
      const lip = scene.add.image(0, 0, '__DEFAULT'), face = scene.add.image(0, 0, '__DEFAULT'), icon = scene.add.image(0, 0, hudIconKey('slowmo', 'on')).setDisplaySize(ui(M.pill.icon), ui(M.pill.icon));
      const text = hudLabel(scene, 0, 0, '', M.pill.font, TOKENS.d3.white, 900, `pill-${slot}`).setOrigin(0, 0.5);
      const c = scene.add.container(0, 0, [lip, face, icon, text]).setVisible(false);
      this.pills.push({ c, lip, face, text, icon });
    }
    this.drawTint();
  }

  private bannerMax = (): number => this.b.ui.hud.bannerQueueMax;
  show(queue: readonly BannerSpec[]): void { this.reset(); this.q = startBanners(queue, this.bannerMax()); this.present(); }
  /** U5-R2: one card appended, a running queue is never reset. */
  enqueue(spec: BannerSpec): void { this.enqueueAll([spec]); }
  /** U6-R11: run-start banners append behind whatever is running. */
  enqueueAll(specs: readonly BannerSpec[]): void {
    const wasIdle = this.q.shown === null; this.q = enqueueBanners(this.q, specs, this.bannerMax());
    if (wasIdle) this.present();
  }
  /** Clears the cards, their timer and pop tween; the tip is left alone (a tip may be raised just before a queue). */
  private reset(): void { this.cardTimer?.remove(); this.scene.tweens.killTweensOf(this.root); this.scene.tweens.killTweensOf(this.enter); this.root.setScale(1).setAlpha(1).setPosition(0, 0); this.q = IDLE_BANNERS; this.clear(); this.root.setVisible(false); }
  hide(): void { this.reset(); this.tipTimer?.remove(); this.showTip(false); }
  private present(): void {
    const spec = this.q.shown;
    if (!spec) { this.clear(); this.root.setVisible(false); return; }
    this.clear(); this.render(spec); this.root.setVisible(true); this.enterMotion();
    this.cardTimer = this.scene.time.delayedCall(this.b.ui.bannerMs, () => { this.q = advanceBanners(this.q); this.present(); });
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

  /** D3-R16 strip card: light panel skin over the strip rect, icon (or gold chip for a biome) beside a centred title / sub block. */
  private render(s: BannerSpec): void {
    const v = bannerStrip(s), m = M.card, r = this.strip, host = hostOf(this.scene), unit = d3(m.unit), cy = r.y + r.h / 2;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { this.root.add(o); return o; };
    const img = (state: 'lip' | 'rest', y: number) => this.scene.add.image(r.x + r.w / 2, y, skinTexture(host, 'panel', 'light', r.w, r.h, state, unit));
    add(img('lip', cy + lipPx('panel', 'light', unit))); add(img('rest', cy));
    const title = this.scene.add.text(0, 0, v.title, { fontFamily: FONT_TITLE, fontSize: `${d3(m.title)}px`, color: TOKENS.d3.text }).setOrigin(0.5).setName('banner-title');
    const sub = v.sub === null ? null : this.scene.add.text(0, 0, v.sub, { fontFamily: FONT_UI, fontSize: `${d3(m.sub)}px`, fontStyle: '800', color: TOKENS.d3.text }).setOrigin(0.5).setName('banner-subtitle');
    let lead: Phaser.GameObjects.Container | Phaser.GameObjects.Image, leadW: number;
    if (v.chip !== null) {
      const c = chip(this.scene, 0, 0, v.chip, '', 'banner-chip', { tone: 'mango' }), k = d3(m.chipH) / c.height;
      c.setScale(k); lead = c; leadW = c.width * k;
    } else {
      const ic = this.scene.add.image(0, 0, hudIconKey(v.icon)).setDisplaySize(d3(m.icon), d3(m.icon));
      if (v.tone === 'mint') ic.setTint(toInt(TOKENS.hud.mintInk));
      lead = ic; leadW = d3(m.icon);
    }
    const textW = Math.max(title.width, sub?.width ?? 0);
    const x0 = r.x + (r.w - (leadW + d3(m.gap) + textW)) / 2, tx = x0 + leadW + d3(m.gap) + textW / 2;
    const lh = d3(m.title) * m.lineH, sh = d3(m.sub) * m.lineH, block = sub === null ? lh : lh + sh, top = cy - block / 2;
    lead.setPosition(x0 + leadW / 2, cy); title.setPosition(tx, top + lh / 2); sub?.setPosition(tx, top + lh + sh / 2);
    add(lead); add(title); if (sub) add(sub);
  }

  /** Dark tooltip bubble; a slot adds a tail that points at that skill button (MEC-007-R12, BannersD2 skillUnlocked). */
  tip(text: string, tailSlot: 0 | 1 | null = null): void {
    const m = M.tip;
    this.tipTimer?.remove(); this.tipText.setText(text).setWordWrapWidth(ui(W.tipMax - m.padX));
    const w = Math.min(ui(W.tipMax), this.tipText.width + ui(m.padX)), h = Math.max(ui(m.minH), this.tipText.height + ui(m.padY)), g = this.tipG.clear();
    let x: number, y: number;
    if (tailSlot === null) { x = (WIDTH - w) / 2; y = BOARD.y + BOARD.size - ui(m.floor) - h; }
    else {
      ({ x, y } = skillTipPlacement(this.l, tailSlot, w, h, { margin: ui(m.margin), tailLeft: ui(m.tailLeft), tailGap: ui(m.tailGap) }));
    }
    g.fillStyle(toInt(TOKENS.hud.tooltip)).fillRoundedRect(x, y, w, h, ui(m.radius));
    if (tailSlot !== null) { const sk = this.l.skills[tailSlot], tx = d3(sk.x + sk.w / 2); g.fillTriangle(tx - ui(m.tailHalf), y + h, tx + ui(m.tailHalf), y + h, tx, y + h + ui(m.tailH)); }
    this.tipText.setPosition(x + w / 2, y + h / 2); this.showTip(true);
    this.tipTimer = this.scene.time.delayedCall(this.b.ui.bannerMs * this.b.ui.hud.tipFactor, () => this.showTip(false));
  }

  /** The text carries its own flag as well as the box, so a probe on either sees the state. */
  private showTip(on: boolean): void { this.tipBox.setVisible(on); this.tipText.setVisible(on); }

  /** D3-R16 two live skill pills sit side by side centred under the strip when they fit, else stacked; each is a chip skin in its slot colour. */
  setPills(pills: readonly SkillPill[]): void {
    const m = M.pill, host = hostOf(this.scene), h = ui(m.h), unit = ui(1);
    let changed = false;
    const live = ([0, 1] as const).map(slot => pills.find(x => x.slot === slot) ?? null);
    for (const slot of [0, 1] as const) {
      const p = this.pills[slot]!, spec = live[slot]!;
      const key = spec ? `${spec.skill}|${spec.text}|${pills.length}` : '';
      if (key === this.pillKeys[slot]) continue;
      this.pillKeys[slot] = key; changed = true;
      p.c.setVisible(spec !== null); p.text.setVisible(spec !== null); if (!spec) continue;
      const tone = slot === 0 ? 'skillA' : 'skillB';
      p.text.setText(spec.text); p.icon.setTexture(hudIconKey(spec.skill, slot === 0 ? 'on' : 'ink')); p.text.setColor(slot === 0 ? TOKENS.d3.white : TOKENS.d3.text); // D3-R2: white on the orange face is 2.4:1, so slot B uses ink
      const w = ui(m.padL + m.icon + m.gap + m.padR) + p.text.width;
      p.lip.setTexture(skinTexture(host, 'chip', tone, w, h, 'lip', unit)); p.face.setTexture(skinTexture(host, 'chip', tone, w, h, 'rest', unit));
      this.pillW[slot] = w;
    }
    if (!changed) return;
    const ws = live.map((x, i) => (x ? this.pillW[i]! : 0)), both = live[0] !== null && live[1] !== null;
    const side = both && ws[0]! + ws[1]! + ui(m.rowGap) <= this.strip.w, y0 = this.strip.y + this.strip.h + ui(STRIP_MOCK.pillGap) + h / 2;
    // Children carry absolute positions (the container stays at 0,0); cx, cy = pill centre.
    const place = (slot: 0 | 1, cx: number, cy: number): void => {
      const p = this.pills[slot]!, w = ws[slot]!, tone = slot === 0 ? 'skillA' : 'skillB';
      p.lip.setPosition(cx, cy + lipPx('chip', tone, unit)); p.face.setPosition(cx, cy);
      p.icon.setPosition(cx - w / 2 + ui(m.padL + m.icon / 2), cy); p.text.setPosition(cx - w / 2 + ui(m.padL + m.icon + m.gap), cy);
    };
    let row = 0;
    for (const slot of [0, 1] as const) {
      if (!live[slot]) continue;
      if (!side) place(slot, WIDTH / 2, y0 + row++ * (h + ui(m.rowGap)));
    }
    if (side) { const tot = ws[0]! + ws[1]! + ui(m.rowGap), left = WIDTH / 2 - tot / 2; place(0, left + ws[0]! / 2, y0); place(1, left + ws[0]! + ui(m.rowGap) + ws[1]! / 2, y0); }
  }
  setSlowmo(on: boolean): void { this.tint.setVisible(on); }
  private drawTint(): void {
    const m = M.tint, r = ui(m.radius), ins = ui(m.inset);
    this.tint.fillStyle(toInt(TOKENS.hud.slowTint), TOKENS.hud.slowTintAlpha).fillRect(0, 0, WIDTH, HEIGHT)
      .fillStyle(toInt(TOKENS.hud.slowTint), TOKENS.hud.slowBoardAlpha).fillRoundedRect(BOARD.x, BOARD.y, BOARD.size, BOARD.size, r)
      .lineStyle(ui(m.ring), toInt(TOKENS.hud.ring), m.ringAlpha).strokeRoundedRect(BOARD.x + ins, BOARD.y + ins, BOARD.size - 2 * ins, BOARD.size - 2 * ins, r - ui(m.ringInset) / 3);
  }
}
