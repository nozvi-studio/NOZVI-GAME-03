import Phaser from 'phaser';
import type { SimEvent, SimSnapshot } from '../../core';
import { save, type KeyValueStore, type SaveData } from '../../meta';
import { createSynth, type Synth } from '../audio/synth';
import { flowPause, flowResume, flowStart, flowTogglePause, type FlowEffect } from '../flow/runFlow';
import { createDpad } from '../input/dpad';
import { BOARD, DPAD, HEADER, LEVEL_BAR } from '../layout';
import { currentPalette, reduceMotion, type Palette } from '../render/palette';
import { bestLine, deathMessage, incomingBanner, levelBanner, levelLabel, progressLabel, TEXT } from '../text';
import type { GameScene } from './GameScene';

export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private store!: KeyValueStore;
  private saveData!: SaveData;
  private synth!: Synth;
  private p!: Palette;
  private score!: Phaser.GameObjects.Text;
  private best!: Phaser.GameObjects.Text;
  private level!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private count!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private card!: Phaser.GameObjects.Graphics;
  private cardTitle!: Phaser.GameObjects.Text;
  private cardText!: Phaser.GameObjects.Text;
  private cardBest!: Phaser.GameObjects.Text;
  private actionText!: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Container;
  private soundIcon!: Phaser.GameObjects.Graphics;
  private pauseIcon!: Phaser.GameObjects.Graphics;
  private bar!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Graphics;
  private pad!: ReturnType<typeof createDpad>;
  private heading = '';
  private labels: Phaser.GameObjects.Text[] = [];
  private buttons: { g: Phaser.GameObjects.Graphics; w: number; h: number }[] = [];
  private bannerTimer?: Phaser.Time.TimerEvent;
  private overTimer?: Phaser.Time.TimerEvent;

  constructor() { super('Hud'); }

  // GDD-13 parallel HUD owns cards, feedback and browser save wiring (design §7–8).
  create(): void {
    this.gameScene = this.scene.get('Game') as GameScene;
    this.store = this.registry.get('store') as KeyValueStore;
    this.saveData = this.registry.get('save') as SaveData;
    this.p = currentPalette(); this.labels = []; this.buttons = []; this.heading = '';
    this.synth = createSynth(); this.synth.setOn(this.saveData.settings.sound);
    this.input.setGlobalTopOnly(true); // Only the card button blocks the board's swipe zone below.
    this.label(HEADER.x, 17, TEXT.header, 28); this.label(HEADER.x + 2, 53, TEXT.hard, 16);
    this.label(250, 16, TEXT.score, 14).setOrigin(.5, 0);
    this.label(330, 16, TEXT.best, 14).setOrigin(.5, 0);
    this.score = this.label(250, 37, '0', 28, 'score').setOrigin(.5, 0);
    this.best = this.label(330, 37, String(this.saveData.bestScore), 28, 'best').setOrigin(.5, 0);
    const sound = this.button(420, 44, 48, 48, 'sound-button', () => this.toggleSound());
    this.soundIcon = this.add.graphics(); sound.add(this.soundIcon);
    this.pauseButton = this.button(494, 44, 48, 48, 'pause-button', () => this.gameScene.apply(flowTogglePause(this.gameScene.flow, this.gameScene.balance)));
    this.pauseIcon = this.add.graphics(); this.pauseButton.add(this.pauseIcon);
    this.bar = this.add.graphics();
    this.level = this.label(LEVEL_BAR.x + 12, LEVEL_BAR.y + 3, '', 18);
    this.progress = this.label(LEVEL_BAR.x + LEVEL_BAR.width - 12, LEVEL_BAR.y + 3, '', 18).setOrigin(1, 0);
    this.flash = this.add.graphics().setAlpha(0);
    this.createCard();
    this.banner = this.label(BOARD.x + BOARD.size / 2, BOARD.y + 14, '', 20, 'banner')
      .setOrigin(.5, 0).setVisible(false);
    this.count = this.label(BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size / 2, '', 96, 'countdown')
      .setOrigin(.5).setVisible(false);
    this.pad = createDpad(this, DPAD, d => this.gameScene.turn(d.x, d.y));
    const flow = (e: FlowEffect): void => this.onFlow(e);
    const events = (e: SimEvent[]): void => this.onEvents(e);
    const over = (s: SimSnapshot): void => this.onOver(s);
    const toggle = (): void => this.toggleSound();
    const pause = (): void => this.gameScene.apply(flowPause(this.gameScene.flow));
    const hidden = (): void => { if (document.hidden) pause(); };
    const theme = window.matchMedia('(prefers-color-scheme: dark)');
    const recolor = (): void => { this.p = currentPalette(); this.heading = ''; this.drawChrome(); this.refresh(); };
    this.gameScene.events.on('flow', flow); this.gameScene.events.on('sim-events', events);
    this.gameScene.events.on('run-over', over); this.gameScene.events.on('toggle-sound', toggle);
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    theme.addEventListener('change', recolor);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene.events.off('flow', flow); this.gameScene.events.off('sim-events', events);
      this.gameScene.events.off('run-over', over); this.gameScene.events.off('toggle-sound', toggle);
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
      theme.removeEventListener('change', recolor); this.bannerTimer?.remove(); this.overTimer?.remove();
    });
    this.drawChrome(); this.refresh();
    this.showCard(TEXT.title, TEXT.start, TEXT.play, bestLine('start', this.saveData.bestScore));
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

  private createCard(): void {
    this.card = this.add.graphics();
    this.cardTitle = this.label(0, -145, '', 28, 'overlay-title').setOrigin(.5, 0);
    this.cardText = this.label(0, -98, '', 19, 'overlay-text').setOrigin(.5, 0).setWordWrapWidth(384).setAlign('center');
    const legend = this.add.container(0, -12).setName('legend');
    const icons = this.add.graphics(); legend.add(icons);
    const entries = [TEXT.landsSoon, TEXT.groundRising, TEXT.mangoRotting];
    entries.forEach((text, i) => legend.add(this.label(-164, i * 28, text, 16)));
    // Legend colors encode warnings consistently on every card.
    icons.fillStyle(this.p.danger).fillCircle(-180, 11, 7);
    icons.fillStyle(this.p.warn).fillCircle(-180, 39, 7);
    icons.lineStyle(3, this.p.food).strokeCircle(-180, 67, 7);
    this.cardBest = this.label(0, 80, '', 17, 'overlay-best').setOrigin(.5, 0);
    const action = this.button(0, 133, 200, 50, 'overlay-action', () => {
      const game = this.gameScene;
      game.apply(game.flow.status === 'paused' ? flowResume(game.flow, game.balance) : flowStart(game.flow, game.balance));
    });
    this.actionText = this.label(0, 0, '', 22).setOrigin(.5); action.add(this.actionText);
    this.overlay = this.add.container(BOARD.x + BOARD.size / 2, BOARD.y + BOARD.size / 2,
      [this.card, this.cardTitle, this.cardText, legend, this.cardBest, action]).setName('overlay');
  }

  private drawChrome(): void {
    for (const { g, w, h } of this.buttons) g.clear().fillStyle(this.p.panel).fillRoundedRect(-w / 2, -h / 2, w, h, 12)
      .lineStyle(3, this.p.ink).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    for (const label of this.labels) label.setColor(this.ink());
    this.card.clear().fillStyle(this.p.panel, .96).fillRoundedRect(-220, -176, 440, 352, 18)
      .lineStyle(3, this.p.ink).strokeRoundedRect(-220, -176, 440, 352, 18);
    this.flash.clear().fillStyle(this.p.gold).fillRoundedRect(LEVEL_BAR.x, LEVEL_BAR.y, LEVEL_BAR.width, LEVEL_BAR.height, 12);
    const s = this.soundIcon.clear().fillStyle(this.p.ink).lineStyle(2, this.p.ink);
    s.fillRect(-16, -5, 7, 10).fillTriangle(-9, -5, 0, -12, 0, 12);
    if (this.saveData.settings.sound) {
      s.beginPath().arc(0, 0, 8, -.8, .8).strokePath(); s.beginPath().arc(0, 0, 15, -.8, .8).strokePath();
    } else s.beginPath().moveTo(5, -6).lineTo(16, 6).moveTo(16, -6).lineTo(5, 6).strokePath();
    this.drawPause();
  }
  private drawPause(): void {
    const active = this.gameScene.flow.status !== 'ready' && this.gameScene.flow.status !== 'over';
    this.pauseButton.input!.enabled = active; this.pauseButton.setAlpha(active ? 1 : .4);
    const p = this.pauseIcon.clear().fillStyle(this.p.ink);
    if (this.gameScene.flow.status === 'paused') p.fillTriangle(-6, -10, -6, 10, 10, 0);
    else p.fillRect(-9, -10, 6, 20).fillRect(3, -10, 6, 20);
  }

  private showCard(title: string, text: string, action: string, best = ''): void {
    this.cardTitle.setText(title); this.cardText.setText(text); this.actionText.setText(action);
    this.cardBest.setText(best); this.overlay.setVisible(true);
  }
  private hideBanner(): void { this.bannerTimer?.remove(); this.banner.setVisible(false); }
  private showBanner(text: string): void {
    this.hideBanner(); this.banner.setText(text).setVisible(true);
    this.bannerTimer = this.time.delayedCall(this.gameScene.balance.ui.bannerMs, () => this.banner.setVisible(false));
  }

  private onFlow(effect: FlowEffect): void {
    switch (effect.type) {
      case 'newRun': this.overTimer?.remove(); this.hideBanner(); this.synth.unlock(); break;
      case 'hideOverlay': this.overlay.setVisible(false); this.count.setVisible(false); break;
      case 'showPaused': this.count.setVisible(false); this.showCard(TEXT.paused, TEXT.pausedText, TEXT.resume); break;
      case 'tick': this.count.setText(String(effect.n)).setVisible(true); this.synth.play('tick'); break;
      case 'go': this.count.setVisible(false); this.synth.play('go'); break;
    }
    this.refresh();
  }
  private onEvents(events: SimEvent[]): void {
    const ui = this.gameScene.balance.ui;
    for (const e of events) switch (e.type) {
      case 'ate':
        this.synth.play(e.golden ? 'golden' : 'eat'); this.synth.buzz(ui.haptics.eatMs);
        if (!reduceMotion()) {
          this.tweens.killTweensOf(this.score); this.score.setScale(1.15);
          this.tweens.add({ targets: this.score, scale: 1, duration: 160 });
        }
        break;
      case 'levelUp':
        this.showBanner(levelBanner(e.level, e.unlocked)); this.synth.play('level'); this.synth.buzz(ui.haptics.level);
        if (!reduceMotion()) {
          this.tweens.killTweensOf(this.flash); this.flash.setAlpha(.65);
          this.tweens.add({ targets: this.flash, alpha: 0, duration: 500 });
        }
        break;
      case 'hazardIncoming': this.showBanner(incomingBanner(e.family)); break;
      case 'landed': this.synth.play('land'); break;
      case 'rotted': this.synth.play('rot'); break;
    }
    this.refresh();
  }
  private onOver(s: SimSnapshot): void {
    this.hideBanner(); this.count.setVisible(false); this.drawPause();
    const won = s.outcome?.won ?? false, newBest = s.score > this.saveData.bestScore;
    if (newBest) { this.saveData.bestScore = s.score; save(this.store, this.saveData); }
    this.best.setText(String(this.saveData.bestScore));
    if (!won) { this.synth.play('die'); this.synth.buzz(this.gameScene.balance.ui.haptics.deathMs); }
    this.overTimer?.remove();
    this.overTimer = this.time.delayedCall(reduceMotion() ? 0 : this.gameScene.balance.flow.deathCardDelayMs, () => {
      if (this.gameScene.flow.status === 'over') this.showCard(won ? TEXT.won : TEXT.over,
        deathMessage(won, s.outcome?.cause, s.score, s.level), TEXT.playAgain,
        bestLine('over', this.saveData.bestScore, newBest, s.score));
    });
  }
  private toggleSound(): void {
    this.saveData.settings.sound = !this.saveData.settings.sound;
    this.synth.setOn(this.saveData.settings.sound); save(this.store, this.saveData); this.drawChrome();
    if (this.saveData.settings.sound) this.synth.play('eat');
  }

  update(): void { this.refresh(); }
  private refresh(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    this.score.setText(String(s.score)); this.level.setText(levelLabel(s.level));
    const max = this.gameScene.balance.level.maxLevel, full = s.level >= max;
    this.progress.setText(progressLabel(s.progress, s.need, s.level, max));
    this.bar.clear().fillStyle(this.p.panel).fillRoundedRect(LEVEL_BAR.x, LEVEL_BAR.y, LEVEL_BAR.width, LEVEL_BAR.height, 12);
    this.bar.fillStyle(this.p.rock, .25).fillRoundedRect(LEVEL_BAR.x + 12, LEVEL_BAR.y + 31, LEVEL_BAR.width - 24, 7, 3);
    const fill = full ? 1 : Math.min(1, s.progress / s.need);
    if (fill > 0) this.bar.fillStyle(this.p.gold).fillRoundedRect(LEVEL_BAR.x + 12, LEVEL_BAR.y + 31, (LEVEL_BAR.width - 24) * fill, 7, 3);
    const heading = `${s.heading.x},${s.heading.y}`;
    if (heading !== this.heading) { this.pad.setHeading(s.heading); this.heading = heading; }
    this.drawPause();
  }
}
