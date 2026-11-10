import Phaser from 'phaser';
import type { Balance } from '../../core';
import { summarizeLog, deathCauseReport, type RunLog } from '../../meta';
import type { Session } from '../../session';
import { capyHeadKey } from '../art/capyRig';
import { createSynth, type Synth } from '../audio/synth';
import { debugStartLevel, isDebug, isMotionOff } from '../flow/debugFlag';
import { HOME_ORDER, entranceEndMs } from '../flow/entranceOrder';
import { breathScale, createIdleGate } from '../flow/homeIdle';
import { homeView, stepCheckpoint } from '../flow/homeModel';
import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { reduceMotion } from '../render/palette';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { drawIcon } from '../ui/icons';
import { layoutColumn, ui, UI_SCALE } from '../ui/layout';
import { headerButton, homeColumn, l1Link, smoothPath } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, bigLabel, hill, logoLine, roundIconButton, scaledBlock, tap } from '../ui/menuWidgets';
import { pivotAt } from '../ui/feedback';
import { chip, pillButton } from '../ui/widgets';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';
import { beginRun, button, label } from './ui';

const H = MENU.home;
const HERO_KEY = 'home-hero-bg';
const style = (size: number, weight: '800' | '900', color: string): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${ui(size)}px`, color });

// P3b3-R10 HomeD2: logo, hero panel, optional checkpoint stepper, Play, chip row, hint. MEC-008 rules live in homeModel.
export class HomeScene extends Phaser.Scene {
  private session!: Session;
  private synth!: Synth;
  private selected = 1;
  private body?: Phaser.GameObjects.Container;
  private entered = false; private targets: EntranceTargets = {}; // MOT-2-R5/R6 entrance targets; later rebuilds show instantly
  private capy?: Phaser.GameObjects.Image; private capyRest = { sx: 1, sy: 1 };
  private idle: { t0: number; gate: ReturnType<typeof createIdleGate> } | null = null; // MOT-2-R8
  private stopPulse: (() => void) | null = null; private playBtn?: Phaser.GameObjects.Container;

  constructor() { super('Home'); }

  create(): void {
    this.entered = false; this.idle = null; this.stopPulse = null; this.targets = {}; this.capy = undefined; this.playBtn = undefined; // Phaser reuses the instance
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    bgCream(this);
    this.selected = this.session.homeModel().defaultStart;
    const gear = headerButton('right');
    const gearBtn = roundIconButton(this, gear.cx, gear.cy, MENU.round, 'sliders', 'home-settings',
      () => { this.synth.play('uiTap'); goTo(this, 'Settings', { returnTo: 'Home' }, 'forward'); });
    const logoY = ui(MENU.padTop + MENU.round + MENU.gap + MENU.logo.lineH / 2);
    const logo1 = logoLine(this, WIDTH / 2, logoY, t('logo.mango'), 0, MENU.logo.size);
    const logo2 = logoLine(this, WIDTH / 2, logoY + ui(MENU.logo.lineH - MENU.logo.overlap), t('logo.snake'), 2, MENU.logo.size);
    this.targets.gear = gearBtn; this.targets.logo1 = logo1; this.targets.logo2 = logo2;
    hill(this, HEIGHT - ui(H.hillPeek));
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
    if (want && !this.stopPulse && this.playBtn) this.stopPulse = motionFor(this).pulse(this.playBtn);
    else if (!want && this.stopPulse) { this.stopPulse(); this.stopPulse = null; }
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

  // Rebuilds the middle block (hero, stepper, Play, chips, hint) from the view model.
  private build(): void {
    this.stopPulse?.(); this.stopPulse = null; this.body?.destroy(true); // the pulse stops before its target is destroyed
    const v = this.homeView(), g = ui(MENU.gap);
    const minShrink = (this.registry.get('balance') as Balance).ui.minShrink;
    const blk = (this.body = scaledBlock(this, layoutColumn(homeColumn({ compact: v.compact, stepper: v.showStepper, extras: v.extras, hint: v.hint !== null }, minShrink))));
    const heroY = ui(H.hero.gap);
    const hero = captureGroup(this, blk, { x: WIDTH / 2, y: heroY + ui(H.hero.h) / 2 }, () => this.heroPanel(blk, WIDTH / 2 - ui(H.hero.w) / 2, heroY));
    const t_: EntranceTargets = { hero };
    let y = heroY + ui(H.hero.h);
    if (v.showStepper && v.startAt !== null) {
      y += g;
      const cy = y + ui(H.stepperH) / 2, mid = chip(this, WIDTH / 2, cy, t('home.startAt', { level: v.startAt }), TOKENS.surface.card);
      const off = mid.width / 2 + ui(H.stepper.chipGap + H.stepper.btn / 2);
      const prev = pillButton(this, WIDTH / 2 - off, cy, H.stepper.btn, H.stepper.btn, t('home.prev'), 'home-prev', () => this.step(-1), 'cream');
      const next = pillButton(this, WIDTH / 2 + off, cy, H.stepper.btn, H.stepper.btn, t('home.next'), 'home-next', () => this.step(1), 'cream');
      blk.add([mid, prev.c, next.c]);
      t_.stepper = [mid, prev.c, next.c];
      if (this.entered) motionFor(this).popIn(mid, 0); // MOT-2-R6 confirm the new start-at value
      y += ui(H.stepperH);
    }
    y += g;
    const ph = v.compact ? H.playHFirst : H.playH;
    const play = pillButton(this, WIDTH / 2, y + ui(ph) / 2, H.hero.w, ph, t('home.play'), 'home-primary',
      () => this.play(this.homeView().primary.level), 'green', { navigates: true });
    bigLabel(play, v.compact ? H.play.labelFirst : H.play.label, v.compact ? H.play.strokeFirst : H.play.stroke);
    if (v.startAt !== null) {
      play.text.setOrigin(0, 0.5).setX(-play.w / 2 + ui(H.play.labelLeft));
      const tx = this.add.text(0, 0, t('home.startAt', { level: v.startAt }), style(H.play.chipFont, '800', TOKENS.text.primary)).setOrigin(0, 0.5);
      const ch = ui(H.play.chipH), ico = ui(H.play.chipIcon), w = ui(H.play.chipPadL) + ico + ui(H.chips.iconGap) + tx.width + ui(H.play.chipPadR);
      const x = play.w / 2 - ui(H.play.chipRight) - w;
      const bg = this.add.graphics().fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(x, -ch / 2, w, ch, ch / 2);
      const ic = this.add.graphics().setPosition(x + ui(H.play.chipPadL) + ico / 2, 0); drawIcon(ic, 'flag', ico, toInt(TOKENS.text.primary));
      tx.setPosition(x + ui(H.play.chipPadL) + ico + ui(H.chips.iconGap), 0);
      play.c.add([bg, ic, tx]);
    }
    blk.add(play.c);
    t_.play = play.c; this.playBtn = play.c;
    y += ui(ph);
    if (v.extras) {
      y += g;
      t_.chips = this.chipRow(blk, v, y);
      y += ui(H.chipH);
    }
    if (v.hint) {
      y += g;
      const hint = this.add.text(WIDTH / 2, y + ui(H.hintH) / 2, t(v.hint.key, { level: v.hint.level }), style(H.hintFont, '800', TOKENS.text.soft)).setOrigin(0.5);
      blk.add(hint); t_.hint = hint;
    }
    Object.assign(this.targets, t_);
  }

  // "Start from L1" text link (when a checkpoint exists) and the carried-energy chip, centred together.
  private chipRow(blk: Phaser.GameObjects.Container, v: ReturnType<HomeScene['homeView']>, y: number): Phaser.GameObjects.Container[] {
    const cy = y + ui(H.chipH) / 2, gap = ui(H.chips.gap), C = H.chips;
    const items: { w: number; make: (cx: number) => Phaser.GameObjects.GameObject }[] = [];
    if (v.secondaryL1) {
      const label = t('home.startL1'), K = H.l1, link = l1Link(this.measure(label, K.font) / UI_SCALE);
      items.push({ w: ui(link.w), make: cx => {
        const tx = this.add.text(cx, cy, label, style(K.font, '800', TOKENS.text.soft)).setOrigin(0.5);
        const ly = cy + tx.height / 2 + ui(K.underlineDy);
        const line = this.add.graphics().lineStyle(ui(K.underline), toInt(TOKENS.text.soft)).lineBetween(cx - tx.width / 2, ly, cx + tx.width / 2, ly);
        // MOT-1-R3 the link text and underline scale together (kind card, half delta) about the link centre; the zone stays unscaled.
        const lc = this.add.container(0, 0), { pivot, inner } = pivotAt(this, lc, cx, cy);
        inner.add([line, tx]);
        lc.add(tap(this, cx, cy, ui(link.w), ui(link.h), 'home-l1', () => this.play(1), { visual: pivot, kind: 'card', navigates: true }));
        return lc;
      } });
    }
    if (v.carry !== null) {
      const label = t('home.startEnergy', { e: v.carry }), tw = this.measure(label, C.font), ico = ui(C.icon);
      const w = ui(C.padL) + ico + ui(C.iconGap) + tw + ui(C.padR), h = ui(H.chipH);
      items.push({ w, make: cx => {
        const sh = TOKENS.shadow.card, x = cx - w / 2;
        const bg = this.add.graphics().setPosition(0, 0)
          .fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, cy - h / 2 + ui(sh.y), w, h, h / 2)
          .fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(x, cy - h / 2, w, h, h / 2);
        const ic = this.add.graphics().setPosition(x + ui(C.padL) + ico / 2, cy); drawIcon(ic, 'bolt', ico, toInt(TOKENS.text.primary));
        const tx = this.add.text(x + ui(C.padL) + ico + ui(C.iconGap), cy, label, style(C.font, '800', TOKENS.text.primary)).setOrigin(0, 0.5);
        return this.add.container(0, 0, [bg, ic, tx]);
      } });
    }
    let x = WIDTH / 2 - (items.reduce((a, i) => a + i.w, 0) + gap * (items.length - 1)) / 2;
    const made: Phaser.GameObjects.Container[] = [];
    for (const it of items) { const c = it.make(x + it.w / 2) as Phaser.GameObjects.Container; blk.add(c); made.push(c); x += it.w + gap; }
    return made;
  }

  private measure(text: string, size: number): number {
    const m = this.add.text(0, 0, text, style(size, '900', TOKENS.text.primary)); const w = m.width; m.destroy(); return w;
  }

  // HomeD2 hero: diagonal colour bands (canvas texture, rounded), blue snake trail, mango and capy head.
  private heroPanel(blk: Phaser.GameObjects.Container, x: number, y: number): void {
    const w = ui(H.hero.w), h = ui(H.hero.h), r = ui(H.hero.radius), sh = TOKENS.shadow.card;
    if (!this.textures.exists(HERO_KEY)) {
      const tex = this.textures.createCanvas(HERO_KEY, Math.ceil(w), Math.ceil(h));
      const ctx = tex!.getContext();
      ctx.beginPath(); ctx.roundRect(0, 0, w, h, r); ctx.clip();
      const grad = ctx.createLinearGradient(0, 0, w, h);
      const [s1, s2] = TOKENS.menu.heroBandStops, [c1, c2, c3] = TOKENS.menu.heroBands;
      for (const [at, col] of [[0, c1], [s1, c1], [s1, c2], [s2, c2], [s2, c3], [1, c3]] as const) grad.addColorStop(at, col);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      tex!.refresh();
    }
    const back = this.add.graphics().fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, y + ui(sh.y * H.hero.shadowDepth), w, h, r);
    blk.add([back, this.add.image(x, y, HERO_KEY).setOrigin(0, 0)]);
    const at = (px: number, py: number) => ({ x: x + ui(px), y: y + ui(py) });
    const trail = smoothPath(H.trail.map(([px, py]) => ({ x: px!, y: py! })), H.trailRadius, H.trailStep);
    const g = this.add.graphics(); blk.add(g);
    for (const [col, rad] of [[TOKENS.snake.shade, H.shadeR], [TOKENS.snake.body, H.bodyR]] as const) {
      g.fillStyle(toInt(col)); for (const p of trail) { const q = at(p.x, p.y); g.fillCircle(q.x, q.y, ui(rad)); }
    }
    g.fillStyle(toInt(TOKENS.surface.white), H.hiAlpha);
    for (const p of trail) { const q = at(p.x + H.hiDx, p.y + H.hiDy); g.fillCircle(q.x, q.y, ui(H.hiR)); }
    const M = H.mango, mc = at(M.x + M.size / 2, M.y + M.size / 2), m = this.add.graphics(); blk.add(m);
    m.fillStyle(toInt(TOKENS.surface.white)).fillCircle(mc.x, mc.y, ui(M.size * M.outer));
    m.fillStyle(toInt(TOKENS.accent.orange)).fillCircle(mc.x, mc.y, ui(M.size * M.inner));
    m.fillStyle(toInt(TOKENS.green.deep)).fillEllipse(mc.x + ui(M.size * M.leaf.dx), mc.y + ui(M.size * M.leaf.dy), ui(M.size * M.leaf.w), ui(M.size * M.leaf.h));
    const C = H.capy, cc = at(C.x + C.size / 2, C.y + C.size / 2);
    const capy = this.add.image(cc.x, cc.y, capyHeadKey('idle', 'large')).setDisplaySize(ui(C.size), ui(C.size));
    blk.add(capy); this.capy = capy; this.capyRest = { sx: capy.scaleX, sy: capy.scaleY };
  }

}
