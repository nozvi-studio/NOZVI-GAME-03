import Phaser from 'phaser';
import type { Balance } from '../../core';
import { summarizeLog, deathCauseReport, type RunLog } from '../../meta';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { debugStartLevel, isDebug } from '../flow/debugFlag';
import { homeView, stepCheckpoint } from '../flow/homeModel';
import { HEIGHT, WIDTH } from '../layout';
import { currentPalette } from '../render/palette';
import { bestLine, t, TEXT } from '../text';
import { beginRun, button, label, paintButton, type Button } from './ui';

// MEC-008-R4/R11 greybox Home: Play (checkpoint stepper, L1), carry line, next checkpoint hint, sound.
export class HomeScene extends Phaser.Scene {
  private session!: Session;
  private synth!: Synth;
  private selected = 1;
  private primary!: Button;
  private secondary!: Button;
  private prev!: Button;
  private next!: Button;
  private carry!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private soundBtn!: Button;

  constructor() { super('Home'); }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    const p = currentPalette();
    this.cameras.main.setBackgroundColor(p.bg);
    const cx = WIDTH / 2;
    label(this, cx, 200, TEXT.title, 40, 'home-title');
    label(this, cx, 260, t('banner.biome.1'), 20);
    const best = this.session.save().bestScore;
    if (best > 0) label(this, cx, 300, bestLine('start', best), 18, 'home-best');
    this.selected = this.session.homeModel().defaultStart;
    this.primary = button(this, cx, 470, 360, 72, '', 'home-primary', () => this.play(this.homeView().primary.level), 26);
    this.prev = button(this, cx - 230, 470, 56, 72, '◀', 'home-prev', () => this.step(-1));
    this.next = button(this, cx + 230, 470, 56, 72, '▶', 'home-next', () => this.step(1));
    this.secondary = button(this, cx, 570, 260, 56, t('home.playL1'), 'home-l1', () => this.play(1));
    this.carry = label(this, cx, 650, '', 20, 'home-carry');
    this.hint = label(this, cx, 690, '', 18, 'home-hint');
    this.soundBtn = button(this, cx, HEIGHT - 120, 200, 52, '', 'home-sound', () => {
      const on = !this.session.save().settings.sound;
      this.session.setSound(on); this.synth.setOn(on); if (on) this.synth.play('uiTap'); this.refresh();
    }, 20);
    if (isDebug(window.location.search)) this.setupDebug();
    this.refresh();
  }

  // MEC-003-R21 debug-only log export and console summary helper (P1 design §11).
  private setupDebug(): void {
    const balance = this.registry.get('balance') as Balance;
    (window as unknown as { __summarize?: (json: string) => unknown }).__summarize =
      (json: string) => {
        const log = JSON.parse(json) as RunLog;
        return { ...summarizeLog(log, balance.log.sessionGapMs), deathReport: deathCauseReport(log, balance.log.sessionGapMs) };
      };
    const done = label(this, WIDTH / 2, HEIGHT - 60, '', 16, 'home-export-done');
    button(this, WIDTH / 2, HEIGHT - 190, 200, 48, t('home.exportLog'), 'home-export', () => {
      const json = this.session.exportLog();
      const fallback = () => this.showLogText(json);
      try {
        navigator.clipboard.writeText(json).then(() => done.setText(t('home.exportDone')), fallback);
      } catch { fallback(); }
    }, 18);
  }
  private showLogText(json: string): void {
    const box = document.createElement('textarea');
    box.value = json; box.readOnly = true;
    box.style.cssText = 'position:fixed;inset:10%;width:80%;height:80%;z-index:10;font:12px monospace';
    box.addEventListener('blur', () => box.remove());
    document.body.appendChild(box); box.focus(); box.select();
    this.events.once('shutdown', () => box.remove());
  }

  private homeView() { return homeView(this.session.homeModel(), this.selected); }
  private step(dir: -1 | 1): void {
    this.selected = stepCheckpoint(this.session.homeModel(), this.selected, dir);
    this.synth.play('uiTap'); this.refresh();
  }
  private play(chosen: number): void {
    this.synth.unlock();
    // MEC-003-R21 ?debug=1&level=N overrides the start level; the run writes no progress.
    const balance = this.registry.get('balance') as Balance;
    const dbgLevel = debugStartLevel(window.location.search, balance.level.maxLevel);
    const level = dbgLevel ?? chosen, debug = dbgLevel !== null;
    if (this.session.homeModel().showLoadout) this.scene.start('Loadout', { level, debug });
    else beginRun(this, level, 'home', debug);
  }
  private refresh(): void {
    const v = this.homeView(), p = currentPalette();
    this.primary.text.setText(t(v.primary.key, { level: v.primary.level }));
    paintButton(this.primary, p, p.gold);
    const stepper = v.stepper.length > 1;
    this.prev.c.setVisible(stepper); this.next.c.setVisible(stepper);
    this.secondary.c.setVisible(v.secondaryL1);
    this.carry.setText(v.carry !== null ? t('home.carry', { e: v.carry }) : '');
    this.hint.setText(v.hint ? t(v.hint.key, { level: v.hint.level }) : '');
    this.soundBtn.text.setText(this.session.save().settings.sound ? t('home.soundOn') : t('home.soundOff'));
  }
}
