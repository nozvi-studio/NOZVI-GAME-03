import Phaser from 'phaser';
import type { Balance } from '../../core';
import { summarizeLog, deathCauseReport, type RunLog } from '../../meta';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { debugStartLevel, isDebug, isMotionOff } from '../flow/debugFlag';
import { HOME_ORDER, entranceEndMs } from '../flow/entranceOrder';
import { breathScale, createIdleGate } from '../flow/homeIdle';
import { sweepAllowed, sweepCycle, sweepX } from '../flow/sweepModel';
import { TOKENS, toInt } from '../uiTokens';
import { homeExtras, homeView, stepCheckpoint } from '../flow/homeModel';
import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { reduceMotion } from '../render/palette';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { d3, d3Height, d3m, ui } from '../ui/layout';
import { homeRects, type Rect } from '../ui/menuLayout';
import { D3_HOME, D3_LOGO } from '../ui/menuMetrics';
import { screenBackground } from '../ui/background';
import { butterChip, d3Logo, roundIconButton, snakeHero } from '../ui/menuWidgets';
import { chip, pillButton } from '../ui/widgets';
import { beginRun, button, label } from './ui';

// D3-R11 Home: background, logo, hero, optional Start-at row, PLAY, hint, link row. P3b3-R10 content rules unchanged. MEC-008 rules live in homeModel.
export class HomeScene extends Phaser.Scene {
  private session!: Session;
  private synth!: Synth;
  private selected = 1;
  private body?: Phaser.GameObjects.Container;
  private entered = false; private targets: EntranceTargets = {}; // MOT-2-R5/R6 entrance targets; later rebuilds show instantly
  private capy?: Phaser.GameObjects.Image; private playGeom?: { w: number; h: number }; private capyRest = { sx: 1, sy: 1 };
  private idle: { t0: number; gate: ReturnType<typeof createIdleGate> } | null = null; // MOT-2-R8
  private stopPulse: (() => void) | null = null; private playBtn?: Phaser.GameObjects.Container;
  private sweep?: { band: Phaser.GameObjects.Graphics; maskG: Phaser.GameObjects.Graphics; t0: number; cycle: number; start: number }; // D3-R21

  constructor() { super('Home'); }

  create(): void {
    this.entered = false; this.idle = null; this.stopPulse = null; this.targets = {}; this.capy = undefined; this.playBtn = undefined; this.sweep = undefined; // Phaser reuses the instance
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    screenBackground(this, 1);
    this.selected = this.session.homeModel().defaultStart;
    const R = this.rects(), px = (r: Rect) => ({ cx: d3(r.x + r.w / 2), cy: d3(r.y + r.h / 2) });
    const gearBtn = roundIconButton(this, px(R.settings).cx, px(R.settings).cy, d3m(D3_HOME.round), 'sliders', 'home-settings',
      () => { this.synth.play('uiTap'); goTo(this, 'Settings', { returnTo: 'Home' }, 'forward'); });
    this.targets.gear = gearBtn;
    const best = this.extras().best;
    if (best !== null) {
      const bc = chip(this, 0, px(R.best).cy, t('home.best', { n: best }), '', 'home-best'); bc.setX(d3(R.best.x) + bc.width / 2);
      this.targets.best = bc;
    }
    const lg = d3Logo(this, WIDTH / 2, d3(R.logo.y - D3_LOGO.textTop * R.logo.scale), R.logo.scale);
    this.targets.logo1 = lg.mango; this.targets.logo2 = lg.snake;
    if (isDebug(window.location.search)) this.setupDebug();
    this.build();
    this.input.on('pointerdown', () => this.idle?.gate.interact(this.time.now)); // MOT-2-R8 any tap pauses the attention pulse
    this.input.on('gameobjectover', () => this.idle?.gate.interact(this.time.now));
    const n = enter(this, HOME_ORDER, this.targets); // MOT-2-R3 camera fade-in, re-arm goTo, staggered entrance (R5)
    this.entered = true; // MOT-2-R6 later build() calls (stepper taps) show instantly
    const cfg = (this.registry.get('balance') as Balance).motion;
    if (!reduceMotion() && !isMotionOff(window.location.search)) {
      this.time.delayedCall(entranceEndMs(n, cfg), () => { this.idle = { t0: this.time.now, gate: createIdleGate(cfg, this.time.now) }; });
    }
  }

  // MOT-2-R8 Home idle: capy breath (pure curve, no tween) and the Play attention pulse, both after the entrance.
  update(time: number): void {
    const idle = this.idle; if (!idle) return;
    const cfg = (this.registry.get('balance') as Balance).motion;
    if (this.capy) { const k = breathScale(time - idle.t0, cfg); this.capy.setScale(this.capyRest.sx * k.sx, this.capyRest.sy * k.sy); }
    const want = idle.gate.allowed(time);
    if (want && !this.stopPulse && this.playBtn) {
      this.stopPulse = motionFor(this).pulse(this.playBtn);
      if (!this.sweep && sweepAllowed(reduceMotion(), isMotionOff(window.location.search))) this.makeSweep(time);
      else if (this.sweep) { this.sweep.t0 = time; this.sweep.cycle = -1; } // D3-R21 re-sync sweeps with the restarted pulse
    } else if (!want && this.stopPulse) { this.stopPulse(); this.stopPulse = null; this.sweep?.band.setVisible(false); }
    const s = this.sweep, g = this.playGeom;
    if (s && g && this.stopPulse) { // D3-R21 one gloss sweep per pulse period
      const c = sweepCycle(time, s.t0, cfg.pulsePeriodMs);
      if (c !== s.cycle) { s.cycle = c; s.start = time; }
      const x = sweepX(time - s.start, cfg.d3.sweepMs, g.w, g.w * cfg.d3.sweepBand);
      s.band.setVisible(x !== null); if (x !== null) s.band.setX(x);
    }
  }

  // D3-R21 white skewed band clipped to the PLAY face; child of the button so it follows the pulse.
  private makeSweep(time: number): void {
    const btn = this.playBtn, g = this.playGeom; if (!btn || !g) return;
    const d3 = (this.registry.get('balance') as Balance).motion.d3, bw = g.w * d3.sweepBand, sk = g.h / 2;
    const band = this.add.graphics().setVisible(false);
    band.fillStyle(toInt(TOKENS.d3.white), d3.sweepAlpha);
    band.fillPoints([new Phaser.Geom.Point(-bw / 2 + sk, -g.h / 2), new Phaser.Geom.Point(bw / 2 + sk, -g.h / 2),
      new Phaser.Geom.Point(bw / 2 - sk, g.h / 2), new Phaser.Geom.Point(-bw / 2 - sk, g.h / 2)], true);
    btn.add(band);
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(toInt(TOKENS.d3.white)).fillRoundedRect(btn.x - g.w / 2, btn.y - g.h / 2, g.w, g.h, ui(TOKENS.d3.shape.radiusBig));
    band.setMask(maskG.createGeometryMask());
    this.sweep = { band, maskG, t0: time, cycle: -1, start: -1e9 };
    this.events.once('shutdown', () => this.clearSweep());
  }
  private clearSweep(): void {
    const s = this.sweep; this.sweep = undefined; if (!s) return;
    s.band.setVisible(false); s.band.destroy(); s.maskG.destroy();
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
    this.idle?.gate.interact(this.time.now); // MOT-2-R8 a stepper tap pauses the attention pulse
    this.selected = stepCheckpoint(this.session.homeModel(), this.selected, dir);
    this.synth.play('uiTap'); this.build();
  }
  private play(chosen: number): void {
    this.synth.unlock();
    // MEC-003-R21 ?debug=1&level=N overrides the start level; the run writes no progress.
    const balance = this.registry.get('balance') as Balance;
    const dbgLevel = debugStartLevel(window.location.search, balance.level.maxLevel);
    const level = dbgLevel ?? chosen, debug = dbgLevel !== null;
    if (this.session.homeModel().showLoadout) goTo(this, 'Loadout', { level, debug }, 'forward');
    else beginRun(this, level, 'home', debug);
  }

  private extras() {
    const m = this.session.homeModel();
    return homeExtras(this.session.save().bestScore, m.showLoadout, this.session.loadoutModel().slotCount);
  }
  // D3-R11/R7 Home rects in mock px for the current canvas height.
  private rects() {
    const v = this.homeView(), ex = this.extras();
    return homeRects(d3Height(), { start: v.startAt !== null, stepper: v.showStepper, l1: v.secondaryL1, loadout: ex.loadoutKey !== null, hint: v.hint !== null });
  }

  // Rebuilds the middle block (hero, start row, PLAY, hint, links) from the view model.
  private build(): void {
    this.stopPulse?.(); this.stopPulse = null; this.clearSweep(); this.body?.destroy(true); // the pulse stops before its target is destroyed
    const v = this.homeView(), ex = this.extras(), R = this.rects();
    const px = (r: Rect) => ({ cx: d3(r.x + r.w / 2), cy: d3(r.y + r.h / 2) });
    const body = (this.body = this.add.container(0, 0));
    const t_: EntranceTargets = { hero: undefined, stepper: undefined, play: undefined, hint: undefined, links: undefined };
    const hero = captureGroup(this, body, { x: px(R.hero).cx, y: px(R.hero).cy }, () => {
      const h = snakeHero(this, WIDTH / 2, d3(R.hero.y), R.hero.w);
      body.add(h.c); this.capy = h.head; this.capyRest = { sx: h.head.scaleX, sy: h.head.scaleY };
      if (v.carry !== null) { // H4 carried energy sits inside the hero's bottom-right corner
        const c = chip(this, 0, 0, t('home.startEnergy', { e: v.carry }), '');
        const inset = d3(D3_HOME.carryInset);
        c.setPosition(d3(R.hero.x + R.hero.w) - inset - c.width / 2, d3(R.hero.y + R.hero.h) - inset - c.height / 2);
        body.add(c);
      }
    });
    t_.hero = hero;
    const play = pillButton(this, px(R.play).cx, px(R.play).cy, d3m(R.play.w), d3m(R.play.h), t('home.playBig'), 'home-primary',
      () => this.play(this.homeView().primary.level), 'green', { navigates: true });
    body.add(play.c); t_.play = play.c; this.playBtn = play.c; this.playGeom = { w: play.w, h: play.h };
    if (R.start && v.startAt !== null) { // H1 Start-at row, with arrows when 2+ checkpoints
      const mid = butterChip(this, px(R.start).cx, px(R.start).cy, R.start.w, R.start.h, t('home.startAt', { level: v.startAt }), D3_HOME.linkFont, 'flag');
      const row: Phaser.GameObjects.Container[] = [mid]; body.add(mid);
      for (const [r, key, dir] of [[R.prev, 'home.prev', -1], [R.next, 'home.next', 1]] as const) {
        if (!r) continue;
        const b = pillButton(this, px(r).cx, px(r).cy, d3m(r.w), d3m(r.h), t(key), `home-${dir < 0 ? 'prev' : 'next'}`, () => this.step(dir), 'cream');
        body.add(b.c); row.push(b.c);
      }
      t_.stepper = row;
      if (this.entered) motionFor(this).popIn(mid, 0); // MOT-2-R6 confirm the new start-at value
    }
    if (R.hint && v.hint) { // H3 next checkpoint hint
      const h = butterChip(this, px(R.hint).cx, px(R.hint).cy, R.hint.w, R.hint.h, t(v.hint.key, { level: v.hint.level }), D3_HOME.linkFont, 'flag');
      body.add(h); t_.hint = h;
    }
    const links: Phaser.GameObjects.Container[] = [];
    if (R.l1) links.push(pillButton(this, px(R.l1).cx, px(R.l1).cy, d3m(R.l1.w), d3m(R.l1.h), t('home.startL1'), 'home-l1', () => this.play(1), 'cream', { navigates: true }).c);
    if (R.loadout && ex.loadoutKey) links.push(pillButton(this, px(R.loadout).cx, px(R.loadout).cy, d3m(R.loadout.w), d3m(R.loadout.h), t(ex.loadoutKey), 'home-loadout',
      () => this.play(this.homeView().primary.level), 'cream', { navigates: true }).c);
    body.add(links); if (links.length) t_.links = links;
    Object.assign(this.targets, t_);
  }
}
