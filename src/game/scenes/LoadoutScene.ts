import Phaser from 'phaser';
import type { Balance, SkillId } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { initEdit, tapCard, tapSlot, type LoadoutEditState } from '../flow/loadoutEdit';
import { HEIGHT, WIDTH } from '../layout';
import { currentPalette } from '../render/palette';
import { t } from '../text';
import { beginRun, button, label, paintButton, type Button } from './ui';

// MEC-007 §8 greybox loadout: slots on top, 2x2 skill cards, Go! and Back.
export class LoadoutScene extends Phaser.Scene {
  private session!: Session;
  private balance!: Balance;
  private synth!: Synth;
  private level = 1;
  private edit!: LoadoutEditState;
  private slots: Button[] = [];
  private cards: { id: SkillId; b: Button; sub: Phaser.GameObjects.Text }[] = [];

  constructor() { super('Loadout'); }

  init(data: { level?: number }): void { this.level = data.level ?? 1; }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.balance = this.registry.get('balance') as Balance;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    this.cameras.main.setBackgroundColor(currentPalette().bg);
    this.edit = initEdit(this.session.loadoutModel());
    this.slots = []; this.cards = [];
    const cx = WIDTH / 2;
    button(this, 70, 50, 110, 48, t('loadout.back'), 'loadout-back', () => this.back(), 20);
    label(this, cx, 130, t('loadout.title'), 34, 'loadout-title');
    for (const slot of [0, 1] as const) {
      if (slot >= this.edit.slotCount) continue;
      const x = this.edit.slotCount === 1 ? cx : cx + (slot === 0 ? -120 : 120);
      this.slots.push(button(this, x, 240, 210, 80, '', `loadout-slot${slot + 1}`, () => {
        this.edit = tapSlot(this.edit, slot); this.synth.play('uiTap'); this.refresh();
      }, 20));
    }
    this.balance.loadout.order.forEach((id, i) => {
      const x = cx + (i % 2 === 0 ? -120 : 120), y = 420 + Math.floor(i / 2) * 190;
      const b = button(this, x, y, 210, 170, t(`skill.${id}.name`), `loadout-card-${id}`, () => {
        this.edit = tapCard(this.edit, id); this.synth.play('uiTap'); this.refresh();
      }, 24);
      b.text.setY(-30);
      const sub = label(this, 0, 30, '', 18); b.c.add(sub);
      this.cards.push({ id, b, sub });
    });
    button(this, cx, HEIGHT - 120, 300, 80, t('loadout.go'), 'loadout-go', () => this.go(), 32);
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); this.go(); }
      else if (e.code === 'Escape') { e.preventDefault(); this.back(); }
    };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.refresh();
  }

  // MEC-007-R9 confirm saves the selection; Back leaves without saving.
  private go(): void {
    this.synth.play('uiGo');
    this.session.confirmLoadout(this.edit.selection);
    beginRun(this, this.level, 'home');
  }
  private back(): void { this.synth.play('uiTap'); this.scene.start('Home'); }

  private refresh(): void {
    const p = currentPalette();
    this.slots.forEach((b, slot) => {
      const id = this.edit.selection[slot];
      b.text.setText(`${t(slot === 0 ? 'loadout.slot1' : 'loadout.slot2')}: ${id ? t(`skill.${id}.name`) : '-'}`);
      paintButton(b, p, p.panel, slot === this.edit.activeSlot ? 7 : 3);
    });
    for (const { id, b, sub } of this.cards) {
      const unlocked = this.edit.unlocked.includes(id);
      const slot = this.edit.selection.indexOf(id);
      if (!unlocked) {
        sub.setText(`🔒 ${t('loadout.locked', { level: this.balance.skills[id].unlockLevel })}`);
        paintButton(b, p, p.rock, 3); b.c.setAlpha(.6);
      } else {
        sub.setText(slot >= 0 ? t('loadout.picked', { n: slot + 1 }) : `${this.balance.skills[id].cost}`);
        paintButton(b, p, slot >= 0 ? p.gold : p.panel, slot >= 0 ? 7 : 3); b.c.setAlpha(1);
      }
    }
  }
}
