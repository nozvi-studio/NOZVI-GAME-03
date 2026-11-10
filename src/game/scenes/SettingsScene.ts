import Phaser from 'phaser';
import type { Balance } from '../../core';
import { resolveDisplay } from '../../meta/settings';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { applySettings, settingsCardEdge, settingsExit, settingsView, SETTINGS_CLOSED, toggleTrackStyle, togglePatch, type SettingsEntry, type SettingsToggle } from '../flow/settingsView';
import { HEIGHT, WIDTH } from '../layout';
import { settingsOrder } from '../flow/entranceOrder';
import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { currentPalette, osDisplay, reduceMotion, themeOf } from '../render/palette';
import { t } from '../text';
import { runSlide } from '../ui/feedbackCore';
import { borderColor, knobX, trackColor } from '../ui/feedbackModel';
import { drawIcon } from '../ui/icons';
import { layoutColumn, ui } from '../ui/layout';
import { headerButton, settingsColumn } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { roundIconButton, scaledBlock, tap } from '../ui/menuWidgets';
import { FONT_UI, TOKENS, toInt, uiTheme, type UiTheme } from '../uiTokens';

const M = MENU.settings;
// SettingsD2 row icon tiles: sound blue, haptics pink, D-pad mint, reduced motion yellow.
const TILE: Record<SettingsToggle, string> = { sound: TOKENS.sky.stat, haptics: TOKENS.accent.pink, dpad: TOKENS.green.mint, reducedMotion: TOKENS.menu.statButter };
const label = (size: number, weight: '800' | '900', color: string): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${ui(size)}px`, color });

/** MOT-1-R8 start state of a switch on rebuild: the previous value when known, else the current one (no slide). */
export const slideFrom = (prev: ReadonlyMap<string, boolean>, id: string, on: boolean): boolean => prev.get(id) ?? on;

// P3b3-R6/R7 SettingsD2: four switch rows; every change saves at once.
// Overlay contract (P3b-2 Hud): scene.launch('Settings', { overlay: true }); Back stops this scene and emits SETTINGS_CLOSED on game.events.
export class SettingsScene extends Phaser.Scene {
  private entry: SettingsEntry = {};
  private session!: Session;
  private synth!: Synth;
  private body?: Phaser.GameObjects.Container;
  private closing = false; private targets: EntranceTargets = {};
  private prev = new Map<string, boolean>(); private slides: (() => void)[] = [];
  private head!: Phaser.GameObjects.Text; private veil?: Phaser.GameObjects.Rectangle;
  constructor() { super('Settings'); }
  private cancelSlides(): void { for (const stop of this.slides.splice(0)) stop(); }
  init(data: SettingsEntry): void { this.entry = data ?? {}; }

  create(): void {
    this.closing = false;
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    // Overlay: a full-screen rect (theme background) that swallows taps on the paused board underneath.
    if (this.entry.overlay) this.veil = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, toInt(this.theme().bg)).setInteractive();
    if (this.veil) { this.veil.setAlpha(0); motionFor(this).fadeIn(this.veil); } // MOT-2-R4
    const back = headerButton('left'), headY = back.cy;
    const backBtn = roundIconButton(this, back.cx, back.cy, MENU.round, 'back', 'settings-back', () => this.back());
    this.head = this.add.text(WIDTH / 2, headY, t('settings.title'), label(M.headFont, '900', TOKENS.text.primary)).setOrigin(0.5);
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { if (e.code === 'Escape') { e.preventDefault(); this.back(); } };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelSlides());
    this.targets = { back: backBtn, title: this.head }; // MOT-2-R5; build() adds card, rows and caption
    this.build();
    if (!this.entry.overlay) enter(this, settingsOrder(M.rows), this.targets); // MOT-2-R3/R5 full screen only; build() after change() never re-enters (R6)
  }

  private theme(): UiTheme { return uiTheme(themeOf(currentPalette())); }
  // UIFIX-R4: screen background, overlay veil and heading follow the board theme; re-run on every build.
  private applyTheme(): void { const th = this.theme(); this.cameras.main.setBackgroundColor(toInt(th.bg)); this.veil?.setFillStyle(toInt(th.bg)); this.head?.setColor(th.title); }

  private back(): void {
    if (this.closing) return; // a double tap or Escape plus tap must close once
    this.closing = true;
    this.synth.play('uiTap');
    const x = settingsExit(this.entry);
    if (x.action === 'start') goTo(this, x.scene, undefined, 'back');
    else {
      const close = (): void => { this.game.events.emit(SETTINGS_CLOSED); this.scene.stop(); }; // MOT-2-R4 overlay: veil fade only, no camera fade
      if (this.veil) { motionFor(this).fadeOut(this.veil); this.time.delayedCall(this.fadeMs(), close); } else close();
    }
  }
  private fadeMs(): number { const b = this.registry.get('balance') as Balance; return reduceMotion() ? b.juice.reduced.softMs : b.motion.fadeMs; }

  private change(patch: Parameters<typeof applySettings>[1]): void {
    applySettings(this.session, patch, osDisplay());
    this.synth.setOn(this.session.save().settings.sound);
    this.synth.play('uiTap');
    this.build();
  }

  // Rebuilds the middle block from the view model (cheap: 5 rows).
  private build(): void {
    this.applyTheme(); const th = this.theme();
    this.body?.destroy(true); this.cancelSlides();
    const minShrink = (this.registry.get('balance') as Balance).ui.minShrink;
    const slideMs = (this.registry.get('balance') as Balance).motion.toggleSlideMs;
    const blk = (this.body = scaledBlock(this, layoutColumn(settingsColumn(minShrink))));
    const s = this.session.save().settings, d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d), g = ui(M.gap), pad = ui(M.pad);
    const cardW = ui(M.cardW), cardX = WIDTH / 2 - cardW / 2, rad = ui(M.radius);
    const rowsH = M.rows * M.rowH;
    let y = g;
    const t_: EntranceTargets = {};
    const rows = this.add.graphics(); blk.add(rows); t_.card = rows; // the shared card background fades with the title
    rows.fillStyle(toInt(th.card)).fillRoundedRect(cardX, y, cardW, ui(rowsH), rad);
    rows.lineStyle(ui(M.sw.line), toInt(settingsCardEdge('light'))).strokeRoundedRect(cardX, y, cardW, ui(rowsH), rad); // UIFIX-R14
    v.rows.forEach((r, i) => {
      const top = y + ui(i * M.rowH), cy = top + ui(M.rowH / 2);
      if (i > 0) rows.fillStyle(toInt(TOKENS.menu.rowDivider)).fillRect(cardX, top, cardW, ui(M.divider));
      // MOT-2-R5 Settings entrances only translate and fade, so the group anchor is the origin: children keep their absolute coordinates
      // (the switch paint() sets absolute knob x on every slide frame).
      t_[`row${i}`] = captureGroup(this, blk, { x: 0, y: 0 }, () => {
      const half = ui(M.tile / 2), tileX = cardX + pad - ui(M.tileInset) + half;
      const tile = this.add.graphics().setPosition(tileX, cy); blk.add(tile);
      tile.fillStyle(toInt(TILE[r.id])).fillRoundedRect(-half, -half, ui(M.tile), ui(M.tile), ui(M.tileR));
      const ic = this.add.graphics().setPosition(tileX, cy); blk.add(ic);
      drawIcon(ic, r.icon, ui(M.icon), toInt(th.ink));
      const tx = tileX + half + ui(M.textGap);
      blk.add(this.add.text(tx, cy - ui(M.titleDy), t(r.titleKey), label(M.titleFont, '900', th.ink)).setOrigin(0, 0.5));
      blk.add(this.add.text(tx, cy - ui(M.subDy), t(r.subKey), { ...label(M.subFont, '800', th.cardSoft), wordWrap: { width: ui(M.subW) } }).setOrigin(0, 0));
      const swW = ui(M.sw.w), swH = ui(M.sw.h), swX = cardX + cardW - pad - swW / 2;
      blk.add(this.add.text(swX - swW / 2 - ui(M.textGap), cy, t(r.valueKey), label(M.valueFont, '900', th.ink)).setOrigin(1, 0.5));
      // Track and knob are separate objects so the knob can slide and squash (MOT-1-R8). Track: green on / sand off; 2 px inset outline per state (SettingsD2).
      const sw = this.add.graphics().setPosition(swX, cy); blk.add(sw);
      const lw = ui(M.sw.line), iw = swW - lw, ih = swH - lw, kpx = ui(M.sw.knob);
      const ts = toggleTrackStyle(r.on, 'light'), fts = toggleTrackStyle(slideFrom(this.prev, r.id, r.on), 'light'); // UIFIX-R14 POL-02
      const kg = this.add.graphics(), kc = this.add.container(swX + knobX(r.on, 1, kpx), cy, [kg]); blk.add(kc);
      const paint = (p: number): void => { // p = slide progress 0..1; 1 is the final look
        kc.x = swX + knobX(r.on, p, kpx);
        sw.clear().fillStyle(trackColor(toInt(fts.fill), toInt(ts.fill), p)).fillRoundedRect(-swW / 2, -swH / 2, swW, swH, swH / 2)
          .lineStyle(lw, borderColor(toInt(fts.border), toInt(ts.border), p)).strokeRoundedRect(-iw / 2, -ih / 2, iw, ih, ih / 2);
        kg.clear().fillStyle(toInt(p < 0.5 ? fts.knob : ts.knob)).fillCircle(0, 0, kpx);
      };
      if (slideFrom(this.prev, r.id, r.on) !== r.on && !reduceMotion()) this.slides.push(runSlide(this, slideMs, paint));
      else paint(1); // unchanged switches and reduced motion draw once at rest
      blk.add(tap(this, WIDTH / 2, cy, cardW, ui(M.rowH), `settings-${r.id}`, () => this.change(togglePatch(s, d, r.id)), { visual: kg, kind: 'switch' }));
      });
    });
    y += ui(rowsH) + g;
    const caption = this.add.text(WIDTH / 2, y + ui(M.captionDy), t('settings.autosave'), label(M.subFont, '800', th.soft)).setOrigin(0.5);
    blk.add(caption); t_.caption = caption;
    Object.assign(this.targets, t_);
    v.rows.forEach(r => this.prev.set(r.id, r.on));
  }
}
