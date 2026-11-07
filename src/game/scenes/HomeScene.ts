import Phaser from 'phaser';
import type { Balance } from '../../core';
import { summarizeLog, deathCauseReport, type RunLog } from '../../meta';
import type { Session } from '../../session';
import { capyHeadKey } from '../art/capyRig';
import { createSynth, type Synth } from '../audio/synth';
import { debugStartLevel, isDebug } from '../flow/debugFlag';
import { homeView, stepCheckpoint } from '../flow/homeModel';
import { HEIGHT, WIDTH } from '../layout';
import { t } from '../text';
import { drawIcon } from '../ui/icons';
import { layoutColumn, ui, UI_SCALE } from '../ui/layout';
import { homeColumn, smoothPath } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, bigLabel, hill, logoLine, roundIconButton, scaledBlock } from '../ui/menuWidgets';
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

  constructor() { super('Home'); }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    bgCream(this);
    this.selected = this.session.homeModel().defaultStart;
    roundIconButton(this, WIDTH - ui(MENU.side + MENU.round / 2), ui(MENU.padTop + MENU.round / 2), MENU.round, 'gear', 'home-settings',
      () => { this.synth.play('uiTap'); this.scene.start('Settings', { returnTo: 'Home' }); });
    const logoY = ui(MENU.padTop + MENU.round + MENU.gap + MENU.logo.lineH / 2);
    logoLine(this, WIDTH / 2, logoY, 'MANGO', 0, MENU.logo.size);
    logoLine(this, WIDTH / 2, logoY + ui(MENU.logo.lineH - MENU.logo.overlap), 'SNAKE', 2, MENU.logo.size);
    hill(this, HEIGHT - ui(H.hillPeek));
    if (isDebug(window.location.search)) this.setupDebug();
    this.build();
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
    this.synth.play('uiTap'); this.build();
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

  // Rebuilds the middle block (hero, stepper, Play, chips, hint) from the view model.
  private build(): void {
    this.body?.destroy(true);
    const v = this.homeView(), g = ui(MENU.gap);
    const minShrink = (this.registry.get('balance') as Balance).ui.minShrink;
    const blk = (this.body = scaledBlock(this, layoutColumn(homeColumn({ compact: v.compact, stepper: v.showStepper, extras: v.extras, hint: v.hint !== null }, minShrink))));
    const heroY = ui(H.hero.gap);
    this.heroPanel(blk, WIDTH / 2 - ui(H.hero.w) / 2, heroY);
    let y = heroY + ui(H.hero.h);
    if (v.showStepper && v.startAt !== null) {
      y += g;
      const cy = y + ui(H.stepperH) / 2, mid = chip(this, WIDTH / 2, cy, t('home.startAt', { level: v.startAt }), TOKENS.surface.card);
      const off = mid.width / 2 + ui(H.stepper.chipGap + H.stepper.btn / 2);
      const prev = pillButton(this, WIDTH / 2 - off, cy, H.stepper.btn, H.stepper.btn, '◀', 'home-prev', () => this.step(-1), 'cream');
      const next = pillButton(this, WIDTH / 2 + off, cy, H.stepper.btn, H.stepper.btn, '▶', 'home-next', () => this.step(1), 'cream');
      blk.add([mid, prev.c, next.c]);
      y += ui(H.stepperH);
    }
    y += g;
    const ph = v.compact ? H.playHFirst : H.playH;
    const play = pillButton(this, WIDTH / 2, y + ui(ph) / 2, H.hero.w, ph, t('home.play'), 'home-primary',
      () => this.play(this.homeView().primary.level));
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
    y += ui(ph);
    if (v.extras) {
      y += g;
      this.chipRow(blk, v, y);
      y += ui(H.chipH);
    }
    if (v.hint) {
      y += g;
      blk.add(this.add.text(WIDTH / 2, y + ui(H.hintH) / 2, t(v.hint.key, { level: v.hint.level }), style(H.hintFont, '800', TOKENS.text.soft)).setOrigin(0.5));
    }
  }

  // "Start from L1" pill (when a checkpoint exists) and the carried-energy chip, centred together.
  private chipRow(blk: Phaser.GameObjects.Container, v: ReturnType<HomeScene['homeView']>, y: number): void {
    const cy = y + ui(H.chipH) / 2, gap = ui(H.chips.gap), C = H.chips;
    const items: { w: number; make: (cx: number) => Phaser.GameObjects.GameObject }[] = [];
    if (v.secondaryL1) {
      const label = t('home.startL1'), tw = this.measure(label, C.font);
      const wMock = tw / UI_SCALE + 2 * C.padX;
      items.push({ w: ui(wMock), make: cx => {
        const b = pillButton(this, cx, cy, wMock, H.chipH, label, 'home-l1', () => this.play(1), 'cream');
        b.text.setFontSize(ui(C.font)); return b.c;
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
    for (const it of items) { blk.add(it.make(x + it.w / 2) as Phaser.GameObjects.Container); x += it.w + gap; }
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
    const back = this.add.graphics().fillStyle(toInt(sh.color), sh.alpha).fillRoundedRect(x, y + ui(sh.y * 3), w, h, r);
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
    blk.add(this.add.image(cc.x, cc.y, capyHeadKey('idle', 'large')).setDisplaySize(ui(C.size), ui(C.size)));
  }

}
