import Phaser from 'phaser';
import type { Balance } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { initEdit, tapCard, tapSlot, type LoadoutEditState } from '../flow/loadoutEdit';
import { loadoutLayout, type LoadoutLayout } from '../flow/loadoutLayout';
import { loadoutView, type SkillCardView } from '../flow/loadoutView';
import { WIDTH } from '../layout';
import { loadoutOrder } from '../flow/entranceOrder';
import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { t } from '../text';
import { screenBackground } from '../ui/background';
import { feedbackOf, pivotAt } from '../ui/feedback';
import { isRejected } from '../ui/feedbackModel';
import { drawIcon, type IconId } from '../ui/icons';
import { d3, d3Height, d3m } from '../ui/layout';
import { MENU } from '../ui/menuMetrics';
import { bigLabel, roundIconButton, tap } from '../ui/menuWidgets';
import { hostOf, lipPx, ringTexture, skinTexture } from '../ui/skin';
import { card, chip, pillButton, titleText } from '../ui/widgets';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { beginRun } from './ui';

const L = MENU.loadout.d3, D = TOKENS.d3;
type Rect = { x: number; y: number; w: number; h: number };
type View = ReturnType<typeof loadoutView>;
type ChipSpec = { text: string; icon: IconId; color: string };

// D3-R19 / U6 Loadout: slots with skill-skin faces, read-only start chips (tall screens only), 4 skill panels, Go! pill. MEC-007 rules live in loadoutEdit.
/** MOT-1-R10 a picked badge pops when its card gained or changed slot since the last render (never on the first render). */
export const badgeIsNew = (prev: ReadonlyMap<string, number | null> | null, id: string, slot: number | null): boolean =>
  prev !== null && slot !== null && prev.get(id) !== slot;

export class LoadoutScene extends Phaser.Scene {
  private session!: Session;
  private balance!: Balance;
  private synth!: Synth;
  private level = 1;
  private debug = false;
  private edit!: LoadoutEditState;
  private body?: Phaser.GameObjects.Container;
  private prevSlot: Map<string, number | null> | null = null;
  private targets: EntranceTargets = {}; // MOT-2-R5/R6 only create() calls enter(); render() on pick or resize shows instantly
  private title!: Phaser.GameObjects.Text;
  private afterCapture: (() => void)[] = [];

  constructor() { super('Loadout'); }

  init(data: { level?: number; debug?: boolean }): void { this.level = data.level ?? 1; this.debug = data.debug === true; }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.balance = this.registry.get('balance') as Balance;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    screenBackground(this, 0, true); // D3-R19 dim rays
    this.edit = initEdit(this.session.loadoutModel());
    this.prevSlot = null; this.afterCapture = [];
    const l = loadoutLayout(d3Height(), { slotCount: 1, chips: 0, cardCount: this.balance.loadout.order.length });
    const backBtn = roundIconButton(this, d3(l.back.x + l.back.w / 2), d3(l.back.y + l.back.h / 2), d3m(l.back.w), 'back', 'loadout-back', () => this.back());
    this.title = titleText(this, WIDTH / 2, d3(l.title.y + l.title.h / 2), '', d3m(L.titleFont)).setName('loadout-title');
    const goBtn = pillButton(this, d3(l.go.x + l.go.w / 2), d3(l.go.y + l.go.h / 2), d3m(l.go.w), d3m(l.go.h), t('loadout.go'), 'loadout-go', () => this.go(), 'green', { navigates: true });
    bigLabel(goBtn, d3m(L.goLabel), d3m(L.goStroke));
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.go(); }
      else if (e.code === 'Escape') { e.preventDefault(); this.back(); }
    };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.targets = { back: backBtn, title: this.title, go: goBtn.c }; // MOT-2-R5; render() adds slots, chips and cards
    this.render();
    const onResize = (): void => this.render(); // re-run the layout when the canvas size changes
    this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
    enter(this, loadoutOrder(this.balance.loadout.order.length), this.targets); // MOT-2-R3/R5 camera fade-in, re-arm goTo, entrance
  }

  // MEC-007-R9 confirm saves the selection; Back leaves without saving.
  private go(): void {
    this.synth.play('uiGo');
    this.session.confirmLoadout(this.edit.selection);
    beginRun(this, this.level, 'home', this.debug);
  }
  private back(): void { this.synth.play('uiTap'); goTo(this, 'Home', undefined, 'back'); }

  // MOT-1-R11 a refused edit (locked card, slot beyond slotCount) returns the same state: shake the tapped target, no sound, no rebuild.
  private pick(action: () => LoadoutEditState, zone: Phaser.GameObjects.Zone): void {
    const next = action();
    if (isRejected(this.edit, next)) { feedbackOf(zone)?.reject(); return; }
    this.edit = next; this.synth.play('uiTap'); this.render();
  }

  // Read-only start chips (C1): the checkpoint level was chosen on Home.
  private chipSpecs(view: View): ChipSpec[] {
    const out: ChipSpec[] = [{ text: t('home.startAt', { level: view.startAt }), icon: 'flag', color: D.text }];
    if (view.energy !== null) out.push({ text: t('home.startEnergy', { e: view.energy }), icon: 'bolt', color: D.results.energyIcon });
    return out;
  }

  // Rebuilds the body from the view model (cheap: 4 cards).
  private render(): void {
    this.body?.destroy(true);
    const view = loadoutView(this.edit, this.balance, { level: this.level, carried: this.session.homeModel().carriedEnergy });
    this.title.setText(t(view.titleKey));
    const specs = this.chipSpecs(view);
    const l = loadoutLayout(d3Height(), { slotCount: view.slots.length as 1 | 2, chips: specs.length, cardCount: view.cards.length });
    const blk = (this.body = this.add.container(0, 0));
    const t_: EntranceTargets = {};
    const s0 = l.slots[0]!.face; // MOT-2-R5 slots are one entrance group
    t_.slots = captureGroup(this, blk, { x: WIDTH / 2, y: d3(s0.y + s0.h / 2) }, () => view.slots.forEach((slot, i) => this.slotView(blk, slot, l.slots[i]!)));
    if (l.chips.length > 0) { // U6-R4 chips only on tall screens
      const r0 = l.chips[0]!;
      t_.chips = captureGroup(this, blk, { x: WIDTH / 2, y: d3(r0.y + r0.h / 2) }, () => l.chips.forEach((r, i) => this.infoChip(blk, specs[i]!, r)));
    } else delete this.targets.chips;
    view.cards.forEach((c, i) => {
      const r = l.cards[i]!;
      t_[`card${i}`] = captureGroup(this, blk, { x: WIDTH / 2, y: d3(r.y + r.h / 2) }, () => this.skillCard(blk, c, r));
    });
    for (const run of this.afterCapture.splice(0)) run(); // MOT-1-R10 pops run after the groups moved their children (rest positions are final)
    this.prevSlot = new Map(view.cards.map(c => [c.id, c.slot] as const));
    Object.assign(this.targets, t_);
  }

  // D3-R19/R21 slot: skill-tone face + lip, selection ring and lift when active (U6-R2), white icon, caption below.
  private slotView(blk: Phaser.GameObjects.Container, slot: View['slots'][number], r: LoadoutLayout['slots'][number]): void {
    const host = hostOf(this), unit = d3(1), s = d3(r.face.w), cx = d3(r.face.x + r.face.w / 2), cy = d3(r.face.y + r.face.h / 2);
    const { pivot, inner } = pivotAt(this, blk, cx, cy); // MOT-1-R3 kind card scales about the slot centre
    const lip = lipPx('skill', slot.tone, unit), lift = slot.active ? d3(D.shape.selectedLift) : 0, fy = cy - lift;
    if (slot.active) inner.add(this.add.image(cx, fy + lip / 2, ringTexture(host, s, s, s / 2, lip, unit)));
    inner.add(this.add.image(cx, fy + lip, skinTexture(host, 'skill', slot.tone, s, s, 'lip', unit)));
    inner.add(this.add.image(cx, fy, skinTexture(host, 'skill', slot.tone, s, s, 'rest', unit)));
    if (slot.skill) { const ic = this.add.graphics().setPosition(cx, fy); drawIcon(ic, slot.skill, d3(L.slotIcon), toInt(D.white)); inner.add(ic); }
    inner.add(this.add.text(cx, d3(r.label.y + r.label.h / 2), t(slot.index === 0 ? 'loadout.slot1' : 'loadout.slot2'),
      { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(L.slotLabelFont)}px`, color: D.white }).setOrigin(0.5));
    const zone = tap(this, cx, cy, d3(r.face.w), d3(r.face.h), `loadout-slot${slot.index + 1}`,
      () => this.pick(() => tapSlot(this.edit, slot.index), zone), { visual: pivot, kind: 'card' });
    blk.add(zone);
  }

  private infoChip(blk: Phaser.GameObjects.Container, spec: ChipSpec, r: Rect): void {
    const c = this.iconChip(spec.text, spec.icon, spec.color, 'light', 'loadout-chip');
    c.setPosition(d3(r.x + r.w / 2), d3(r.y + r.h / 2)).setScale(Math.min(1, d3(r.w) / c.width));
    blk.add(c);
  }

  /** A skin chip with a leading icon drawn inside its lead space. */
  private iconChip(label: string, icon: IconId, color: string, tone: 'light' | 'mango', name: string): Phaser.GameObjects.Container {
    const c = chip(this, 0, 0, label, '', name, { tone, lead: d3m(L.chipIcon + 4) });
    const tx = c.list[2] as Phaser.GameObjects.Text;
    const ic = this.add.graphics().setPosition(-tx.width / 2, 0); drawIcon(ic, icon, d3(L.chipIcon), toInt(color)); c.add(ic);
    return c;
  }

  // D3-R19/R21 panel card: skill disc, name + description, cost and pick chips; locked = faded panel, off disc with lock (U6-R9).
  private skillCard(blk: Phaser.GameObjects.Container, c: SkillCardView, rect: Rect): void {
    const host = hostOf(this), unit = d3(1);
    const x = d3(rect.x), y = d3(rect.y), w = d3(rect.w), h = d3(rect.h), cy = y + h / 2;
    const { pivot, inner } = pivotAt(this, blk, x + w / 2, cy); // MOT-1-R3/R10 the whole card draws inside a pivot at its centre
    const lift = c.slot !== null ? d3(D.shape.selectedLift) : 0; // D3-R21 selected lift
    if (c.slot !== null) { // U6-R2 ring under the panel
      const lipP = lipPx('panel', 'light', unit);
      inner.add(this.add.image(x + w / 2, cy - lift + lipP / 2, ringTexture(host, w, h, d3(D.shape.radiusPanel), lipP, unit)));
    }
    const panel = card(this, x, y - lift, d3m(rect.w), d3m(rect.h)); if (c.locked) panel.setAlpha(L.lockedAlpha); inner.add(panel);
    const dd = d3(L.disc), dx = x + d3(L.padL) + dd / 2, dlip = lipPx('skill', c.tone, unit);
    inner.add(this.add.image(dx, cy - lift + dlip, skinTexture(host, 'skill', c.tone, dd, dd, 'lip', unit)));
    inner.add(this.add.image(dx, cy - lift, skinTexture(host, 'skill', c.tone, dd, dd, 'rest', unit)));
    const ic = this.add.graphics().setPosition(dx, cy - lift);
    drawIcon(ic, c.locked ? 'lock' : c.id, d3(L.discIcon), toInt(c.locked ? D.tone.off.text : D.white)); inner.add(ic);
    const col: Phaser.GameObjects.Container[] = []; let picked: Phaser.GameObjects.Container | null = null;
    if (!c.locked) {
      col.push(this.iconChip(String(c.cost), 'bolt', D.results.energyIcon, 'light', 'loadout-cost'));
      if (c.slot !== null) col.push(picked = this.iconChip(t('loadout.picked', { n: c.slot + 1 }), 'check', D.tone.mango.text, 'mango', 'loadout-picked'));
      for (const k of col) k.setScale(d3(L.costH) / k.height);
    }
    const colW = col.length ? Math.max(...col.map(k => k.width * k.scaleX)) : 0;
    const textX = dx + dd / 2 + d3(L.textGap);
    const wrap = x + w - d3(L.padR) - (colW ? colW + d3(L.textGap) : 0) - textX;
    const name = this.add.text(textX, 0, t(c.nameKey), { fontFamily: FONT_TITLE, fontSize: `${d3(L.nameFont)}px`, color: D.text }).setOrigin(0, 0);
    const descStr = c.locked ? t('loadout.unlocksAt', { level: c.unlockLevel }) : c.desc ? t(c.desc.key, c.desc.vars) : '';
    const desc = this.add.text(textX, 0, descStr, { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(L.descFont)}px`, color: D.tip, wordWrap: { width: wrap } }).setOrigin(0, 0);
    const top = cy - lift - (name.height + desc.height) / 2;
    name.setY(top); desc.setY(top + name.height); inner.add([name, desc]);
    const ch = d3(L.costH), total = col.length * ch + Math.max(0, col.length - 1) * d3(L.pickGap);
    col.forEach((k, i) => { k.setPosition(x + w - d3(L.padR) - k.width * k.scaleX / 2, cy - lift - total / 2 + ch / 2 + i * (ch + d3(L.pickGap))); inner.add(k); });
    const zone = tap(this, x + w / 2, cy, w, h, `loadout-card-${c.id}`, () => this.pick(() => tapCard(this.edit, c.id), zone), { visual: pivot, kind: 'card' });
    blk.add(zone);
    if (badgeIsNew(this.prevSlot, c.id, c.slot)) { // MOT-1-R10
      if (picked) { const p = picked; this.afterCapture.push(() => motionFor(this).popIn(p)); }
      this.afterCapture.push(() => feedbackOf(zone)?.pop());
    }
  }
}
