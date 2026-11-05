import Phaser from 'phaser';
import type { Balance, SimEvent, SimSnapshot, SkillId } from '../../core';
import type { Session } from '../../session';
import { createSynth, type SfxName, type Synth } from '../audio/synth';
import { homeView } from '../flow/homeModel';
import { flowPause, flowResume, flowTogglePause, type FlowEffect } from '../flow/runFlow';
import { createDpad } from '../input/dpad';
import { acceptSkillInput, skillSlotForKey } from '../input/skillKeys';
import { BOARD, DPAD, HEADER, LEVEL_BAR, WIDTH } from '../layout';
import { currentPalette, P1_COLORS, reduceMotion, type Palette } from '../render/palette';
import { levelLabel, levelUpLines, runStartLines } from '../hudText';
import { incomingBanner, progressLabel, t, TEXT } from '../text';
import type { GameScene } from './GameScene';

const SKILL_SFX: Record<SkillId, SfxName> = { slowmo: 'skillSlowmo', tailSnip: 'skillSnip', shield: 'skillShield', mangoRain: 'skillRain' };
const SKILL_LETTER: Record<SkillId, string> = { slowmo: 'S', tailSnip: 'T', shield: 'D', mangoRain: 'R' };
/** MEC-006 §8 / GDD §10.4 greybox feedback timings (presentation only). */
const FEEDBACK = { orbHapticMs: 8, castHapticMs: 20, rejectShakeMs: 200, tipFactor: 2 } as const;
const ENERGY_ROW = { x: BOARD.x, y: BOARD.y + BOARD.size + 6, width: BOARD.size, height: 14 };
const SKILL_SIZE = 96;
const SKILL_X = [DPAD.x / 2, WIDTH - DPAD.x / 2] as const;
const SKILL_Y = DPAD.y + 60;

// GDD-13 + P1 HUD: score, level/biome, quota, energy, skill buttons, hints, banners, pause Resume/Quit.
export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private session!: Session;
  private balance!: Balance;
  private synth!: Synth;
  private p!: Palette;
  private score!: Phaser.GameObjects.Text;
  private best!: Phaser.GameObjects.Text;
  private level!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private energy!: Phaser.GameObjects.Text;
  private ramp!: Phaser.GameObjects.Text;
  private nextCp!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private tip!: Phaser.GameObjects.Text;
  private count!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private card!: Phaser.GameObjects.Graphics;
  private pauseButton!: Phaser.GameObjects.Container;
  private soundIcon!: Phaser.GameObjects.Graphics;
  private pauseIcon!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Graphics;
  private skills: { c: Phaser.GameObjects.Container; g: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text }[] = [];
  private pad!: ReturnType<typeof createDpad>;
  private heading = '';
  private labels: Phaser.GameObjects.Text[] = [];
  private buttons: { g: Phaser.GameObjects.Graphics; w: number; h: number }[] = [];
  private bannerTimer?: Phaser.Time.TimerEvent;
  private tipTimer?: Phaser.Time.TimerEvent;
  private overTimer?: Phaser.Time.TimerEvent;
  private cpCount = 0;
  private bestLevelAtStart = 0;
  private orbTipShown = false;
  private leaving = false;

  constructor() { super('Hud'); }

  create(): void {
    this.gameScene = this.scene.get('Game') as GameScene;
    this.session = this.registry.get('session') as Session;
    this.balance = this.registry.get('balance') as Balance;
    const save = this.session.save();
    this.cpCount = save.unlockedCheckpoints.length; this.bestLevelAtStart = save.bestLevel;
    this.orbTipShown = false; this.leaving = false;
    this.p = currentPalette(); this.labels = []; this.buttons = []; this.skills = []; this.heading = '';
    this.synth = createSynth(); this.synth.setOn(save.settings.sound); this.synth.unlock();
    this.input.setGlobalTopOnly(true);
    this.label(HEADER.x, 17, TEXT.header, 28); this.label(HEADER.x + 2, 53, TEXT.hard, 16);
    this.label(250, 16, TEXT.score, 14).setOrigin(.5, 0);
    this.label(330, 16, TEXT.best, 14).setOrigin(.5, 0);
    this.score = this.label(250, 37, '0', 28, 'score').setOrigin(.5, 0);
    this.best = this.label(330, 37, String(save.bestScore), 28, 'best').setOrigin(.5, 0);
    const sound = this.button(420, 44, 48, 48, 'sound-button', () => this.toggleSound());
    this.soundIcon = this.add.graphics(); sound.add(this.soundIcon);
    this.pauseButton = this.button(494, 44, 48, 48, 'pause-button', () => this.gameScene.apply(flowTogglePause(this.gameScene.flow, this.balance)));
    this.pauseIcon = this.add.graphics(); this.pauseButton.add(this.pauseIcon);
    this.bar = this.add.graphics();
    this.level = this.label(LEVEL_BAR.x + 12, LEVEL_BAR.y + 3, '', 18, 'level');
    this.progress = this.label(LEVEL_BAR.x + LEVEL_BAR.width - 12, LEVEL_BAR.y + 3, '', 18).setOrigin(1, 0);
    this.energy = this.label(ENERGY_ROW.x + ENERGY_ROW.width / 2, ENERGY_ROW.y + ENERGY_ROW.height / 2, '', 12, 'energy').setOrigin(.5);
    this.flash = this.add.graphics().setAlpha(0);
    this.createSkillButtons();
    this.ramp = this.label(SKILL_X[0], SKILL_Y + 70, '', 14, 'ramp').setOrigin(.5, 0).setWordWrapWidth(DPAD.x - 16).setAlign('center');
    this.nextCp = this.label(SKILL_X[1], SKILL_Y + 70, '', 14, 'next-checkpoint').setOrigin(.5, 0).setWordWrapWidth(DPAD.x - 16).setAlign('center');
    this.createPauseCard();
    this.banner = this.label(BOARD.x + BOARD.size / 2, BOARD.y + 14, '', 20, 'banner').setOrigin(.5, 0).setAlign('center').setVisible(false);
    this.tip = this.label(BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size - 60, '', 17, 'tip')
      .setOrigin(.5, 0).setWordWrapWidth(BOARD.size - 40).setAlign('center').setVisible(false);
    this.count = this.label(BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size / 2, '', 96, 'countdown').setOrigin(.5).setVisible(false);
    this.pad = createDpad(this, DPAD, d => this.gameScene.turn(d.x, d.y));
    const flow = (e: FlowEffect): void => this.onFlow(e);
    const events = (e: SimEvent[]): void => this.onEvents(e);
    const over = (s: SimSnapshot): void => this.onOver(s);
    const toggle = (): void => this.toggleSound();
    const pause = (): void => this.gameScene.apply(flowPause(this.gameScene.flow));
    const hidden = (): void => { if (document.hidden) { pause(); this.session.hidden(); } };
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { // MEC-007-R14/R15
      const slot = skillSlotForKey(e.code, e.repeat);
      if (slot === null) return;
      e.preventDefault(); this.useSkill(slot);
    };
    const theme = window.matchMedia('(prefers-color-scheme: dark)');
    const recolor = (): void => { this.p = currentPalette(); this.heading = ''; this.drawChrome(); this.refresh(); };
    this.gameScene.events.on('flow', flow); this.gameScene.events.on('sim-events', events);
    this.gameScene.events.on('run-over', over); this.gameScene.events.on('toggle-sound', toggle);
    keys?.on('keydown', onKey);
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    theme.addEventListener('change', recolor);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene.events.off('flow', flow); this.gameScene.events.off('sim-events', events);
      this.gameScene.events.off('run-over', over); this.gameScene.events.off('toggle-sound', toggle);
      keys?.off('keydown', onKey);
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
      theme.removeEventListener('change', recolor);
      this.bannerTimer?.remove(); this.tipTimer?.remove(); this.overTimer?.remove();
    });
    this.drawChrome(); this.refresh();
    this.showRunStart();
  }

  // MEC-003 §8 run-start banner. Hud is (re)launched once per run start, after Game emitted newRun, so show it here.
  private showRunStart(): void {
    const start = runStartLines(this.gameScene.snapshot() ?? { level: 0, challenge: false }, t);
    if (start.length) this.showBanner(start.join('\n'));
  }

  private label(x: number, y: number, text: string, size: number, name = ''): Phaser.GameObjects.Text {
    const label = this.add.text(x, y, text, { fontFamily: '"Baloo 2", system-ui, sans-serif',
      fontSize: `${size}px`, fontStyle: 'bold', color: this.ink() }).setName(name);
    this.labels.push(label); return label;
  }
  private ink(): string { return `#${this.p.ink.toString(16).padStart(6, '0')}`; }

  private button(x: number, y: number, w: number, h: number, name: string, action: () => void): Phaser.GameObjects.Container {
    const g = this.add.graphics(); this.buttons.push({ g, w, h });
    const button = this.add.container(x, y, [g]).setName(name).setSize(w, h).setInteractive({ useHandCursor: true });
    let pressed = false;
    button.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event?: Phaser.Types.Input.EventData) => {
      event?.stopPropagation(); pressed = true; if (!reduceMotion()) button.setScale(.96);
    });
    button.on('pointerup', () => { const activate = pressed; pressed = false; button.setScale(1); if (activate) action(); });
    button.on('pointerout', () => { pressed = false; button.setScale(1); });
    return button;
  }

  // MEC-007-R14 skill buttons react on pointer down; drawn only for non-null slots.
  private createSkillButtons(): void {
    for (const slot of [0, 1] as const) {
      const g = this.add.graphics();
      const text = this.label(0, 0, '', 20).setOrigin(.5).setAlign('center');
      const c = this.add.container(SKILL_X[slot], SKILL_Y, [g, text]).setName(`skill-${slot}`)
        .setSize(SKILL_SIZE, SKILL_SIZE).setInteractive({ useHandCursor: true });
      c.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, event?: Phaser.Types.Input.EventData) => {
        event?.stopPropagation(); this.useSkill(slot);
      });
      this.skills.push({ c, g, text });
    }
  }
  private useSkill(slot: 0 | 1): void {
    if (acceptSkillInput(this.gameScene.flow.status)) this.session.useSkill(slot); // MEC-007-R15
  }

  private createPauseCard(): void {
    this.card = this.add.graphics();
    const title = this.label(0, -130, TEXT.paused, 28, 'overlay-title').setOrigin(.5, 0);
    const text = this.label(0, -84, TEXT.pausedText, 19, 'overlay-text').setOrigin(.5, 0).setWordWrapWidth(384).setAlign('center');
    const resume = this.button(0, 20, 200, 50, 'overlay-action', () => this.gameScene.apply(flowResume(this.gameScene.flow, this.balance)));
    resume.add(this.label(0, 0, TEXT.resume, 22).setOrigin(.5));
    // MEC-003-R20 Quit ends the run (cause quit) and opens Results.
    const quit = this.button(0, 90, 200, 50, 'overlay-quit', () => { this.session.quit(); this.toResults(0); });
    quit.add(this.label(0, 0, t('pause.quit'), 22).setOrigin(.5));
    this.overlay = this.add.container(BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size / 2,
      [this.card, title, text, resume, quit]).setName('overlay').setVisible(false);
  }

  private drawChrome(): void {
    for (const { g, w, h } of this.buttons) g.clear().fillStyle(this.p.panel).fillRoundedRect(-w / 2, -h / 2, w, h, 12)
      .lineStyle(3, this.p.ink).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    for (const label of this.labels) label.setColor(this.ink());
    this.card.clear().fillStyle(this.p.panel, .96).fillRoundedRect(-220, -160, 440, 320, 18)
      .lineStyle(3, this.p.ink).strokeRoundedRect(-220, -160, 440, 320, 18);
    this.flash.clear().fillStyle(this.p.gold).fillRoundedRect(LEVEL_BAR.x, LEVEL_BAR.y, LEVEL_BAR.width, LEVEL_BAR.height, 12);
    const s = this.soundIcon.clear().fillStyle(this.p.ink).lineStyle(2, this.p.ink);
    s.fillRect(-16, -5, 7, 10).fillTriangle(-9, -5, 0, -12, 0, 12);
    if (this.session.save().settings.sound) {
      s.beginPath().arc(0, 0, 8, -.8, .8).strokePath(); s.beginPath().arc(0, 0, 15, -.8, .8).strokePath();
    } else s.beginPath().moveTo(5, -6).lineTo(16, 6).moveTo(16, -6).lineTo(5, 6).strokePath();
    this.drawPause();
  }
  private drawPause(): void {
    const status = this.gameScene.flow.status, active = status !== 'ready' && status !== 'over';
    this.pauseButton.input!.enabled = active; this.pauseButton.setAlpha(active ? 1 : .4);
    const p = this.pauseIcon.clear().fillStyle(this.p.ink);
    if (status === 'paused') p.fillTriangle(-6, -10, -6, 10, 10, 0);
    else p.fillRect(-9, -10, 6, 20).fillRect(3, -10, 6, 20);
  }

  private hideBanner(): void { this.bannerTimer?.remove(); this.banner.setVisible(false); }
  private showBanner(text: string): void {
    this.hideBanner(); this.banner.setText(text).setVisible(true);
    this.bannerTimer = this.time.delayedCall(this.balance.ui.bannerMs, () => this.banner.setVisible(false));
  }
  private showTip(text: string): void {
    this.tipTimer?.remove(); this.tip.setText(text).setVisible(true);
    this.tipTimer = this.time.delayedCall(this.balance.ui.bannerMs * FEEDBACK.tipFactor, () => this.tip.setVisible(false));
  }

  private onFlow(effect: FlowEffect): void {
    switch (effect.type) {
      case 'newRun': {
        this.overTimer?.remove(); this.hideBanner(); this.synth.unlock();
        const start = runStartLines(this.gameScene.snapshot() ?? { level: 0, challenge: false }, t); // MEC-003 §8
        if (start.length) this.showBanner(start.join('\n'));
        break;
      }
      case 'hideOverlay': this.overlay.setVisible(false); this.count.setVisible(false); break;
      case 'showPaused': this.count.setVisible(false); this.overlay.setVisible(true); break;
      case 'tick': this.count.setText(String(effect.n)).setVisible(true); this.synth.play('tick'); break;
      case 'go': this.count.setVisible(false); this.synth.play('go'); break;
    }
    this.refresh();
  }

  // P1 HUD event mapping (plan Task 9 table; MEC-003/006/007/008 §8).
  private onEvents(events: SimEvent[]): void {
    const ui = this.balance.ui;
    for (const e of events) switch (e.type) {
      case 'ate':
        this.synth.play(e.golden ? 'golden' : 'eat'); this.synth.buzz(ui.haptics.eatMs);
        if (!reduceMotion()) {
          this.tweens.killTweensOf(this.score); this.score.setScale(1.15);
          this.tweens.add({ targets: this.score, scale: 1, duration: 160 });
        }
        break;
      case 'levelUp': this.onLevelUp(e); break;
      case 'runWon': this.synth.play('level'); this.time.delayedCall(ui.bannerMs / 4, () => this.synth.play('level')); break;
      case 'hazardIncoming':
        if (e.family === 'fence' || e.family === 'maze' || e.family === 'terrain') this.showBanner(incomingBanner(e.family));
        break;
      case 'landed': this.synth.play('land'); break;
      case 'rotted': this.synth.play('rot'); break;
      case 'orbSpawned':
        if (!this.orbTipShown && this.bestLevelAtStart < 2) { this.orbTipShown = true; this.showTip(t('tip.orb.first')); }
        break;
      case 'orbEaten': this.synth.play('orb'); this.synth.buzz(FEEDBACK.orbHapticMs); break;
      case 'skillUsed': this.synth.play(SKILL_SFX[e.skill]); this.synth.buzz(FEEDBACK.castHapticMs); break;
      case 'skillRejected': {
        if (e.reason === 'empty') break;
        this.synth.play('nope'); this.shake(e.slot);
        const cost = e.skill ? this.balance.skills[e.skill].cost : 0;
        this.showTip(t(`skill.reject.${e.reason}`, { cost }));
        break;
      }
      case 'shieldBroke': this.synth.play('shieldBreak'); break;
      case 'skillUnlocked': {
        const skill = t(`skill.${e.skill}.name`);
        this.showTip(e.slot === null ? t('tip.skillUnlocked.next', { skill })
          : t('tip.skillUnlocked.slot', { skill, side: t(e.slot === 0 ? 'side.left' : 'side.right') }));
        this.synth.play('unlock');
        break;
      }
      case 'slotUnlocked': this.showTip(t('tip.slotUnlocked')); break;
      case 'mangoStolen': this.showTip(t('toast.mangoStolen')); break; // MEC-016 §8 toast
      case 'rampEnded': this.synth.play('go'); break;
      case 'died': this.synth.play('die'); this.synth.buzz(ui.haptics.deathMs); break;
      default: break;
    }
    this.refresh();
  }
  private onLevelUp(e: Extract<SimEvent, { type: 'levelUp' }>): void {
    const lines = levelUpLines(e, t); // MEC-003 §8 incl. challenge banner
    const cps = this.session.save().unlockedCheckpoints;
    if (cps.length > this.cpCount) { // MEC-008 §8 checkpoint banner + first-unlock tip
      lines.push(t('banner.checkpoint', { level: Math.max(...cps) }));
      if (this.cpCount === 0) this.showTip(t('tip.checkpoint'));
      this.cpCount = cps.length;
    }
    this.showBanner(lines.join('\n')); this.synth.play('level'); this.synth.buzz(this.balance.ui.haptics.level);
    if (!reduceMotion()) {
      this.tweens.killTweensOf(this.flash); this.flash.setAlpha(.65);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 500 });
    }
  }
  private shake(slot: 0 | 1): void {
    const c = this.skills[slot]!.c;
    if (reduceMotion()) return;
    this.tweens.killTweensOf(c); c.setPosition(SKILL_X[slot], SKILL_Y);
    this.tweens.add({ targets: c, x: SKILL_X[slot] + 6, duration: FEEDBACK.rejectShakeMs / 4, yoyo: true, repeat: 1,
      onComplete: () => c.setPosition(SKILL_X[slot], SKILL_Y) });
  }

  private onOver(_s: SimSnapshot): void {
    this.hideBanner(); this.count.setVisible(false); this.drawPause();
    this.best.setText(String(this.session.save().bestScore));
    this.toResults(reduceMotion() ? 0 : this.balance.flow.deathCardDelayMs);
  }
  private toResults(delayMs: number): void {
    if (this.leaving) return;
    this.leaving = true; this.overTimer?.remove();
    this.overTimer = this.time.delayedCall(delayMs, () => { this.scene.stop('Game'); this.scene.start('Results'); });
  }
  private toggleSound(): void {
    const on = !this.session.save().settings.sound;
    this.session.setSound(on); this.synth.setOn(on); this.drawChrome();
    if (on) this.synth.play('eat');
  }

  update(): void { this.refresh(); }
  private refresh(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    this.score.setText(String(s.score));
    this.level.setText(levelLabel(s, t)); // MEC-003 §8 star while challenge
    const max = this.balance.level.maxLevel, full = s.level >= max;
    this.progress.setText(progressLabel(s.progress, s.need, s.level, max));
    const bar = this.bar.clear().fillStyle(this.p.panel).fillRoundedRect(LEVEL_BAR.x, LEVEL_BAR.y, LEVEL_BAR.width, LEVEL_BAR.height, 12);
    bar.fillStyle(this.p.rock, .25).fillRoundedRect(LEVEL_BAR.x + 12, LEVEL_BAR.y + 31, LEVEL_BAR.width - 24, 7, 3);
    const fill = full ? 1 : Math.min(1, s.progress / s.need);
    if (fill > 0) bar.fillStyle(this.p.gold).fillRoundedRect(LEVEL_BAR.x + 12, LEVEL_BAR.y + 31, (LEVEL_BAR.width - 24) * fill, 7, 3);
    // MEC-006 §8 energy bar energy/100.
    const r = ENERGY_ROW;
    bar.fillStyle(this.p.panel).fillRoundedRect(r.x, r.y, r.width, r.height, 6);
    const ef = Math.min(1, s.energy / s.energyMax);
    if (ef > 0) bar.fillStyle(P1_COLORS.orb).fillRoundedRect(r.x, r.y, r.width * ef, r.height, 6);
    this.energy.setText(t('hud.energy', { energy: s.energy, max: s.energyMax }));
    this.drawSkills(s);
    this.ramp.setText(s.rampActive ? t('hud.ramp', { n: s.rampMangoesLeft }) : '');
    const hint = homeView(this.session.homeModel()).hint; // MEC-008-R11
    this.nextCp.setText(hint ? t(hint.key, { level: hint.level }) : '');
    const heading = `${s.heading.x},${s.heading.y}`;
    if (heading !== this.heading) { this.pad.setHeading(s.heading); this.heading = heading; }
    this.drawPause();
  }
  // MEC-006 §8 letter + cost; glow when affordable, grey when not; ring of remaining time while active.
  private drawSkills(s: SimSnapshot): void {
    for (const k of s.skills) {
      const b = this.skills[k.slot]!;
      b.c.setVisible(k.id !== null);
      if (!k.id) continue;
      const half = SKILL_SIZE / 2;
      b.g.clear().fillStyle(k.affordable ? this.p.gold : P1_COLORS.skillOff).fillCircle(0, 0, half)
        .lineStyle(k.affordable ? 5 : 3, this.p.ink).strokeCircle(0, 0, half);
      if (k.active && k.leftMs > 0) {
        const total = k.id === 'tailSnip' ? k.leftMs : this.balance.skills[k.id].durationMs;
        const end = -Math.PI / 2 + Math.PI * 2 * Math.min(1, k.leftMs / total);
        b.g.lineStyle(6, P1_COLORS.shield).beginPath().arc(0, 0, half + 6, -Math.PI / 2, end, false).strokePath();
      }
      b.text.setText(`${SKILL_LETTER[k.id]}\n${k.cost}`);
    }
  }
}
