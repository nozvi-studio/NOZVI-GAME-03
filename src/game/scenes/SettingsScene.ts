import Phaser from 'phaser';
import type { Balance } from '../../core';
import { resolveDisplay } from '../../meta/settings';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { applySettings, settingsExit, settingsView, SETTINGS_CLOSED, trackAlpha, togglePatch, type SettingsEntry, type SettingsToggle } from '../flow/settingsView';
import { knobTravel, settingsLayout } from '../flow/settingsLayout';
import { WIDTH } from '../layout';
import { settingsOrder } from '../flow/entranceOrder';
import { captureGroup, enter, goTo, motionFor, type EntranceTargets } from '../motion';
import { osDisplay, reduceMotion } from '../render/palette';
import { t } from '../text';
import { screenBackground } from '../ui/background';
import { runSlide } from '../ui/feedbackCore';
import { knobX } from '../ui/feedbackModel';
import { drawIcon } from '../ui/icons';
import { d3, d3Height, d3m } from '../ui/layout';
import { MENU } from '../ui/menuMetrics';
import { roundIconButton, tap } from '../ui/menuWidgets';
import { hostOf, skinTexture } from '../ui/skin';
import { card, titleText } from '../ui/widgets';
import { FONT_UI, TOKENS, toInt, type D3Tone } from '../uiTokens';

const M = MENU.settings.d3, D = TOKENS.d3;
// D3-R19 row icon tiles: sound energy blue, haptics purple, D-pad green, reduced motion mango.
const TILE: Record<SettingsToggle, D3Tone> = { sound: 'energy', haptics: 'skillA', dpad: 'primary', reducedMotion: 'mango' };

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
  private head!: Phaser.GameObjects.Text; private bg!: Phaser.GameObjects.Image;
  constructor() { super('Settings'); }
  private cancelSlides(): void { for (const stop of this.slides.splice(0)) stop(); }
  init(data: SettingsEntry): void { this.entry = data ?? {}; }

  create(): void {
    this.closing = false;
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    this.bg = screenBackground(this, 0, true); // U6-R8 dim rays; in overlay mode it also swallows taps on the paused board underneath
    if (this.entry.overlay) { this.bg.setInteractive(); this.bg.setAlpha(0); motionFor(this).fadeIn(this.bg); } // MOT-2-R4
    const l = settingsLayout(d3Height(), 4);
    const backBtn = roundIconButton(this, d3(l.back.x + l.back.w / 2), d3(l.back.y + l.back.h / 2), d3m(l.back.w), 'back', 'settings-back', () => this.back());
    this.head = titleText(this, WIDTH / 2, d3(l.title.y + l.title.h / 2), t('settings.title'), d3m(M.titleFont)).setName('settings-title');
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { if (e.code === 'Escape') { e.preventDefault(); this.back(); } };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cancelSlides());
    this.targets = { back: backBtn, title: this.head }; // MOT-2-R5; build() adds card, rows and caption
    this.build();
    if (!this.entry.overlay) enter(this, settingsOrder(4), this.targets); // MOT-2-R3/R5 full screen only; build() after change() never re-enters (R6)
  }

  private back(): void {
    if (this.closing) return; // a double tap or Escape plus tap must close once
    this.closing = true;
    this.synth.play('uiTap');
    const x = settingsExit(this.entry);
    if (x.action === 'start') goTo(this, x.scene, undefined, 'back');
    else {
      const close = (): void => { this.game.events.emit(SETTINGS_CLOSED); this.scene.stop(); }; // MOT-2-R4 overlay: background fade only, no camera fade
      if (this.entry.overlay && this.bg) { motionFor(this).fadeOut(this.bg); this.time.delayedCall(this.fadeMs(), close); } else close();
    }
  }
  private fadeMs(): number { const b = this.registry.get('balance') as Balance; return reduceMotion() ? b.juice.reduced.softMs : b.motion.fadeMs; }

  private change(patch: Parameters<typeof applySettings>[1]): void {
    applySettings(this.session, patch, osDisplay());
    this.synth.setOn(this.session.save().settings.sound);
    this.synth.play('uiTap');
    this.build();
  }

  // Rebuilds the panel from the view model (cheap: 4 rows).
  private build(): void {
    this.body?.destroy(true); this.cancelSlides();
    const slideMs = (this.registry.get('balance') as Balance).motion.toggleSlideMs;
    const blk = (this.body = this.add.container(0, 0));
    const s = this.session.save().settings, d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d), l = settingsLayout(d3Height(), v.rows.length), host = hostOf(this), unit = d3(1);
    const t_: EntranceTargets = {};
    const panel = card(this, d3(l.panel.x), d3(l.panel.y), d3m(l.panel.w), d3m(l.panel.h)); blk.add(panel); t_.card = panel; // the panel fades with the title
    v.rows.forEach((r, i) => {
      const row = l.rows[i]!, cy = d3(row.y + row.h / 2);
      if (i > 0) blk.add(this.add.rectangle(WIDTH / 2, d3(row.y - M.divider / 2), d3(row.w - 2 * M.rowPadX), d3(M.divider), toInt(D.divider)));
      // MOT-2-R5 Settings entrances only translate and fade, so the group anchor is the origin: children keep their absolute coordinates
      // (the switch paint() sets absolute knob x on every slide frame).
      t_[`row${i}`] = captureGroup(this, blk, { x: 0, y: 0 }, () => {
        const tr = l.tile[i]!, tx = d3(tr.x + tr.w / 2), tone = D.tone[TILE[r.id]], ts = d3(tr.w);
        const tile = this.add.graphics().setPosition(tx, cy); blk.add(tile);
        tile.fillStyle(toInt(tone.face[1])).fillRoundedRect(-ts / 2, -ts / 2, ts, ts, d3(M.tileR)).lineStyle(d3(M.tileLine), toInt(tone.line)).strokeRoundedRect(-ts / 2, -ts / 2, ts, ts, d3(M.tileR));
        const ic = this.add.graphics().setPosition(tx, cy); blk.add(ic);
        drawIcon(ic, r.icon, d3(M.icon), toInt(D.white));
        const textX = d3(tr.x + tr.w + M.textGap);
        blk.add(this.add.text(textX, cy - d3(2), t(r.titleKey), { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(M.titleFontRow)}px`, color: D.text }).setOrigin(0, 1));
        blk.add(this.add.text(textX, cy, t(r.subKey), { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(M.subFont)}px`, color: D.tip, wordWrap: { width: d3(M.subW) } }).setOrigin(0, 0));
        // U6-R7 two bar tracks cross-fade; the round knob slides (MOT-1-R8).
        const tg = l.toggle[i]!, swX = d3(tg.x + tg.w / 2), w = d3(tg.w), h = d3(tg.h), k = d3(M.knob);
        const trackOn = this.add.image(swX, cy, skinTexture(host, 'bar', 'primary', w, h, 'rest', unit));
        const trackOff = this.add.image(swX, cy, skinTexture(host, 'bar', 'off', w, h, 'rest', unit));
        const kn = this.add.image(0, 0, skinTexture(host, 'round', 'light', k, k, 'rest', unit));
        const kc = this.add.container(swX + knobX(r.on, 1, d3(knobTravel(M.toggleW, M.knob))), cy, [kn]);
        blk.add([trackOff, trackOn, kc]);
        const from = slideFrom(this.prev, r.id, r.on);
        const paint = (p: number): void => { // p = slide progress 0..1; 1 is the final look
          kc.x = swX + knobX(r.on, p, d3(knobTravel(M.toggleW, M.knob)));
          const a = trackAlpha(from, r.on, p); trackOn.setAlpha(a); trackOff.setAlpha(1 - a);
        };
        if (from !== r.on && !reduceMotion()) this.slides.push(runSlide(this, slideMs, paint));
        else paint(1); // unchanged switches and reduced motion draw once at rest
        blk.add(tap(this, WIDTH / 2, cy, d3(row.w), d3(row.h), `settings-${r.id}`, () => this.change(togglePatch(s, d, r.id)), { visual: kc, kind: 'switch' }));
      });
    });
    const caption = this.add.text(WIDTH / 2, d3(l.caption.y + l.caption.h / 2), t('settings.autosave'),
      { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(M.captionFont)}px`, color: D.white }).setOrigin(0.5);
    blk.add(caption); t_.caption = caption;
    Object.assign(this.targets, t_);
    v.rows.forEach(r => this.prev.set(r.id, r.on));
  }
}
