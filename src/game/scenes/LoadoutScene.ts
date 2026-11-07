import Phaser from 'phaser';
import type { Balance, SkillId } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { initEdit, tapCard, tapSlot, type LoadoutEditState } from '../flow/loadoutEdit';
import { loadoutView, type SkillCardView } from '../flow/loadoutView';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { drawIcon, type IconId } from '../ui/icons';
import { layoutColumn, ui } from '../ui/layout';
import { loadoutColumn } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, bigLabel, roundIconButton, scaledBlock, tap } from '../ui/menuWidgets';
import { pillButton } from '../ui/widgets';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { beginRun } from './ui';

const L = MENU.loadout;
const text = (size: number, weight: '800' | '900', color: string): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${ui(size)}px`, color });
const DISC: Record<SkillId, string> = { slowmo: TOKENS.sky.stat, tailSnip: TOKENS.accent.pink, shield: TOKENS.sky.lavender, mangoRain: TOKENS.accent.butter };

// P3b3-R8/R9 LoadoutD2: slots panel, read-only start chips (C1), 4 skill cards, Go! pinned at the bottom. MEC-007 rules live in loadoutEdit.
export class LoadoutScene extends Phaser.Scene {
  private session!: Session;
  private balance!: Balance;
  private synth!: Synth;
  private level = 1;
  private debug = false;
  private edit!: LoadoutEditState;
  private body?: Phaser.GameObjects.Container;

  constructor() { super('Loadout'); }

  init(data: { level?: number; debug?: boolean }): void { this.level = data.level ?? 1; this.debug = data.debug === true; }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.balance = this.registry.get('balance') as Balance;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    bgCream(this);
    this.edit = initEdit(this.session.loadoutModel());
    const headY = ui(MENU.padTop + MENU.round / 2);
    roundIconButton(this, ui(MENU.side + MENU.round / 2), headY, MENU.round, 'back', 'loadout-back', () => this.back());
    this.title = this.add.text(WIDTH / 2, headY, '', text(L.titleFont, '900', TOKENS.text.primary)).setOrigin(0.5).setName('loadout-title');
    const goY = HEIGHT - ui(L.goBottom + L.goH / 2 + MENU.widgets.shelfDy);
    bigLabel(pillButton(this, WIDTH / 2, goY, L.goW, L.goH, t('loadout.go'), 'loadout-go', () => this.go()), L.goLabel, L.goStroke);
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.go(); }
      else if (e.code === 'Escape') { e.preventDefault(); this.back(); }
    };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.render();
  }
  private title!: Phaser.GameObjects.Text;

  // MEC-007-R9 confirm saves the selection; Back leaves without saving.
  private go(): void {
    this.synth.play('uiGo');
    this.session.confirmLoadout(this.edit.selection);
    beginRun(this, this.level, 'home', this.debug);
  }
  private back(): void { this.synth.play('uiTap'); this.scene.start('Home'); }

  private pick(action: () => LoadoutEditState): void { this.edit = action(); this.synth.play('uiTap'); this.render(); }

  // Rebuilds the middle block from the view model (cheap: 4 cards).
  private render(): void {
    this.body?.destroy(true);
    const view = loadoutView(this.edit, this.balance, { level: this.level, carried: this.session.homeModel().carriedEnergy });
    this.title.setText(t(view.titleKey));
    const blk = (this.body = scaledBlock(this, layoutColumn(loadoutColumn(this.balance.ui.minShrink))));
    const g = ui(MENU.gap), cardW = ui(L.cardW), cardX = WIDTH / 2 - cardW / 2;
    let y = g;
    // Slots panel.
    const panel = this.add.graphics(); blk.add(panel);
    const sh = TOKENS.shadow.card;
    panel.fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(cardX, y + ui(sh.y), cardW, ui(L.slotsH), ui(L.slotsR));
    panel.fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(cardX, y, cardW, ui(L.slotsH), ui(L.slotsR));
    const centres = view.slots.length === 1 ? [WIDTH / 2]
      : [cardX + ui(L.slotsEdge + L.slotCol / 2), cardX + cardW - ui(L.slotsEdge + L.slotCol / 2)];
    view.slots.forEach((slot, i) => {
      const cx = centres[i]!, cy = y + ui(L.slotsPadTop + L.slotCircle / 2), r = ui(L.slotCircle / 2);
      const c = this.add.graphics(); blk.add(c);
      if (slot.active) c.fillStyle(toInt(TOKENS.menu.slotRing), L.ringAlpha).fillCircle(cx, cy, r + ui(L.slotRing));
      c.fillStyle(toInt(TOKENS.sky.bottom), L.shelfAlpha).fillCircle(cx, cy + ui(L.slotShelf), r);
      c.fillStyle(toInt(TOKENS.surface.white)).fillCircle(cx, cy, r);
      if (slot.skill) { const ic = this.add.graphics().setPosition(cx, cy); blk.add(ic); drawIcon(ic, slot.skill, ui(L.slotIcon), toInt(TOKENS.text.slate)); }
      const ly = cy + r + ui(L.slotGap);
      const cap = this.add.text(cx, ly, t(i === 0 ? 'loadout.slot1' : 'loadout.slot2').toUpperCase(), text(L.slotLabel, '800', TOKENS.text.soft)).setOrigin(0.5, 0);
      cap.setLetterSpacing(ui(L.slotLabelTrack)); blk.add(cap);
      blk.add(this.add.text(cx, ly + cap.height, slot.skill ? t(`skill.${slot.skill}.name`) : t('loadout.emptySlot'), text(L.slotName, '900', TOKENS.text.primary)).setOrigin(0.5, 0));
      blk.add(tap(this, cx, y + ui(L.slotsH / 2), ui(L.slotCol), ui(L.slotsH), `loadout-slot${slot.index + 1}`, () => this.pick(() => tapSlot(this.edit, slot.index))));
    });
    y += ui(L.slotsH + MENU.gap);
    // Read-only start chips (C1): the checkpoint level was chosen on Home.
    const chips: { text: string; icon: IconId }[] = [{ text: t('home.startAt', { level: view.startAt }), icon: 'flag' }];
    if (view.energy !== null) chips.push({ text: t('home.startEnergy', { e: view.energy }), icon: 'bolt' });
    chips.forEach((c, i) => this.infoChip(blk, c.text, c.icon, chips.length === 1 ? 'mid' : i === 0 ? 'left' : 'right', cardX, cardW, y));
    y += ui(L.chipsH + MENU.gap);
    for (const card of view.cards) { this.skillCard(blk, card, cardX, y); y += ui(L.cardH + L.cardGap); }
  }

  private infoChip(blk: Phaser.GameObjects.Container, label: string, icon: IconId, at: 'left' | 'mid' | 'right', cardX: number, cardW: number, y: number): void {
    const tx = this.add.text(0, 0, label, text(L.chipFont, '800', TOKENS.text.primary)).setOrigin(0, 0.5);
    const h = ui(L.chipsH), ico = ui(L.chipIcon), pad = ui(L.chipPad), gap = ui(L.chipIconGap);
    const w = pad + ico + gap + tx.width + pad;
    const x = at === 'left' ? cardX : at === 'right' ? cardX + cardW - w : WIDTH / 2 - w / 2;
    const g = this.add.graphics();
    const sh = TOKENS.shadow.card;
    g.fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, y + ui(sh.y), w, h, h / 2);
    g.fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(x, y, w, h, h / 2);
    const ic = this.add.graphics().setPosition(x + pad + ico / 2, y + h / 2);
    drawIcon(ic, icon, ico, toInt(TOKENS.text.primary));
    tx.setPosition(x + pad + ico + gap, y + h / 2);
    blk.add([g, ic, tx]);
  }

  private skillCard(blk: Phaser.GameObjects.Container, c: SkillCardView, x: number, y: number): void {
    const w = ui(L.cardW), h = ui(L.cardH), pad = ui(L.padX), disc = ui(L.disc), r = ui(L.cardR);
    const g = this.add.graphics(); blk.add(g);
    const textX = x + pad + disc + ui(L.textGap), cy = y + h / 2;
    if (c.locked) g.fillStyle(toInt(TOKENS.surface.sand)).fillRoundedRect(x, y, w, h, r);
    else {
      const sh = TOKENS.shadow.card;
      g.fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, y + ui(sh.y), w, h, r);
      g.fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(x, y, w, h, r);
      if (c.slot !== null) g.lineStyle(ui(L.pickRing), toInt(TOKENS.menu.pickRing)).strokeRoundedRect(x, y, w, h, r);
    }
    g.fillStyle(toInt(c.locked ? TOKENS.surface.stone : DISC[c.id])).fillCircle(x + pad + disc / 2, cy, disc / 2);
    const ic = this.add.graphics().setPosition(x + pad + disc / 2, cy); blk.add(ic);
    drawIcon(ic, c.locked ? 'lock' : c.id, ui(L.discIcon), toInt(c.locked ? TOKENS.text.soft : TOKENS.text.slate));
    const name = this.add.text(textX, 0, t(c.nameKey), text(L.nameFont, '900', TOKENS.text.primary)).setOrigin(0, 0); blk.add(name);
    const nameH = name.height, gap = ui(L.nameGap);
    if (c.locked) {
      const row = this.add.text(textX + ui(L.lockIcon + L.lockGap), 0, t('loadout.unlocksAt', { level: c.unlockLevel }), text(L.descFont, '800', TOKENS.text.primary)).setOrigin(0, 0);
      const top = cy - (nameH + gap + row.height) / 2;
      name.setY(top); row.setY(top + nameH + gap); blk.add(row);
      const li = this.add.graphics().setPosition(textX + ui(L.lockIcon / 2), top + nameH + gap + row.height / 2); blk.add(li);
      drawIcon(li, 'lock', ui(L.lockIcon), toInt(TOKENS.text.primary));
    } else {
      const wrap = w - pad * 2 - disc - ui(L.textGap) - (c.slot !== null ? ui(L.badgeReserve) : 0);
      const desc = this.add.text(textX, 0, c.desc ? t(c.desc.key, c.desc.vars) : '', { ...text(L.descFont, '800', TOKENS.text.soft), wordWrap: { width: wrap } }).setOrigin(0, 0);
      const top = cy - (nameH + gap + desc.height) / 2;
      name.setY(top); desc.setY(top + nameH + gap); blk.add(desc);
      // Cost chip (bolt + cost) right of the name.
      const ch = ui(L.costH), cost = this.add.text(0, 0, String(c.cost), text(L.costFont, '900', TOKENS.text.slate)).setOrigin(0, 0.5);
      const icoS = ui(L.costIcon), cw = ui(L.costPadL) + icoS + ui(L.costGap / 2) + cost.width + ui(L.costPadR);
      const cx = textX + name.width + ui(L.costGap), ccy = top + nameH / 2;
      g.fillStyle(toInt(TOKENS.menu.costChip)).fillRoundedRect(cx, ccy - ch / 2, cw, ch, ch / 2);
      const bi = this.add.graphics().setPosition(cx + ui(L.costPadL) + icoS / 2, ccy); blk.add(bi);
      drawIcon(bi, 'bolt', icoS, toInt(TOKENS.text.slate));
      cost.setPosition(cx + ui(L.costPadL) + icoS + ui(L.costGap / 2), ccy); blk.add(cost);
      if (c.slot !== null) {
        const badge = this.add.text(0, 0, t('loadout.picked', { n: c.slot + 1 }), text(L.badgeFont, '900', TOKENS.menu.mintBannerText)).setOrigin(0.5);
        const bw = badge.width + 2 * ui(L.badgePad), bh = ui(L.badgeH), bx = x + w - pad - bw;
        g.fillStyle(toInt(TOKENS.green.face)).fillRoundedRect(bx, cy - bh / 2, bw, bh, bh / 2);
        badge.setPosition(bx + bw / 2, cy); blk.add(badge);
      }
    }
    blk.add(tap(this, x + w / 2, cy, w, h, `loadout-card-${c.id}`, () => this.pick(() => tapCard(this.edit, c.id))));
  }
}
