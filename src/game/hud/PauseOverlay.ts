import Phaser from 'phaser';
import { SETTINGS_CLOSED } from '../flow/settingsView';
import { HEIGHT, WIDTH } from '../layout';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { feedbackOf } from '../ui/feedback';
import { d3, d3m } from '../ui/layout';
import { butterChip } from '../ui/menuWidgets';
import { card, pillButton, titleText } from '../ui/widgets';
import { hudLabel } from './draw';
import { hudIconKey } from './hudIcons';
import { PAUSE_MOCK, pauseLayout, type PauseButtonId, type PauseView } from './overlayModel';

// D3-R15 board px (360 wide, converted with d3/d3m) of the pause dialog drawing; row positions come from pauseLayout.
const M = { sidePad: 24, resumeFont: 32, resumeStroke: 7, secondaryFont: 18, quitFont: 20, chipFont: 13, chipH: 30, chipPadX: 14, chipIcon: 16, chipIconGap: 6,
  gearIcon: 22, gearGap: 8 } as const;
const IDS: readonly PauseButtonId[] = ['resume', 'settings', 'quit'];

// D3-R15 pause: 50% ink scrim, 300 px panel (card skin), title, subtitle, butter chip, Resume (green), Settings (light, gear), Quit run (danger).
export class PauseOverlay {
  readonly root: Phaser.GameObjects.Container;
  private panel: Phaser.GameObjects.Container | null = null; private chipC: Phaser.GameObjects.Container | null = null;
  private readonly title: Phaser.GameObjects.Text; private readonly subtitle: Phaser.GameObjects.Text; private readonly gear: Phaser.GameObjects.Image;
  private readonly btn: Record<PauseButtonId, ReturnType<typeof pillButton>>;
  private shown = new Set<PauseButtonId>();

  constructor(private readonly scene: Phaser.Scene, cb: { onResume(): void; onSettings(): void; onQuit(): void }) {
    const m = PAUSE_MOCK;
    const scrim = scene.add.graphics().fillStyle(toInt(TOKENS.d3.inkDeep), TOKENS.hud.pauseScrimAlpha).fillRect(0, 0, WIDTH, HEIGHT);
    const block = scene.add.zone(0, 0, WIDTH, HEIGHT).setOrigin(0).setInteractive(); // swallows taps behind the dialog
    this.title = titleText(scene, WIDTH / 2, 0, '', d3m(m.titleSize)).setOrigin(0.5, 0).setName('overlay-title');
    this.subtitle = hudLabel(scene, WIDTH / 2, 0, '', d3m(m.subtitleSize), TOKENS.d3.text, 800, 'overlay-subtitle').setOrigin(0.5, 0);
    const inner = d3m(m.w - 2 * M.sidePad);
    const resume = pillButton(scene, WIDTH / 2, 0, inner, d3m(m.resume), '', 'overlay-action', cb.onResume, 'green');
    // Lilita One is loaded at weight 400 only: 'normal' avoids a synthetic bold.
    resume.text.setFontFamily(FONT_TITLE).setFontSize(d3(M.resumeFont)).setFontStyle('normal').setStroke(TOKENS.d3.tone.primary.line, d3(M.resumeStroke));
    const settings = pillButton(scene, WIDTH / 2, 0, inner, d3m(m.secondary), '', 'overlay-settings', () => { this.setEnabled(false); cb.onSettings(); }, 'cream');
    const quit = pillButton(scene, WIDTH / 2, 0, inner, d3m(m.secondary), '', 'overlay-quit', cb.onQuit, 'danger', { navigates: true });
    settings.text.setFontFamily(FONT_UI).setFontSize(d3(M.secondaryFont));
    quit.text.setFontSize(d3(M.quitFont));
    this.gear = scene.add.image(0, 0, hudIconKey('settings', 'ink')).setDisplaySize(d3(M.gearIcon), d3(M.gearIcon));
    settings.c.add(this.gear);
    this.btn = { resume, settings, quit };
    this.root = scene.add.container(0, 0, [scrim, block, this.title, this.subtitle, resume.c, settings.c, quit.c]).setName('overlay').setVisible(false);
    // Handoff 3: the Settings overlay sits on top; its buttons come back when it closes (Hud re-reads settings itself).
    const reopen = (): void => this.setEnabled(true);
    scene.game.events.on(SETTINGS_CLOSED, reopen);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(SETTINGS_CLOSED, reopen));
  }

  private setEnabled(on: boolean): void {
    for (const id of IDS) {
      const c = this.btn[id].c, live = on && this.shown.has(id);
      if (c.input) c.input.enabled = live;
      feedbackOf(c)?.setDisabled(!live); // MOT-1-R12 alpha disabledAlpha, no hover or press feedback; hit area unchanged
    }
  }

  show(v: PauseView): void {
    const m = PAUSE_MOCK, lay = pauseLayout(v), h = d3(lay.height), y0 = (HEIGHT - h) / 2;
    this.panel?.destroy(); this.chipC?.destroy(); this.chipC = null; // height depends on the chip, so the card is rebuilt
    this.panel = card(this.scene, (WIDTH - d3(m.w)) / 2, y0, d3m(m.w), d3m(lay.height));
    this.root.addAt(this.panel, 2);
    this.title.setText(v.title).setY(y0 + d3(lay.title)); this.subtitle.setText(v.subtitle).setY(y0 + d3(lay.subtitle));
    if (v.chip !== null && lay.chip !== null) {
      const probe = this.scene.add.text(0, 0, v.chip, { fontFamily: FONT_UI, fontStyle: '900', fontSize: `${d3(M.chipFont)}px` });
      const tw = probe.width / d3(1); probe.destroy();
      const w = 2 * M.chipPadX + M.chipIcon + M.chipIconGap + tw;
      this.chipC = butterChip(this.scene, WIDTH / 2, y0 + d3(lay.chip + M.chipH / 2), w, M.chipH, v.chip, M.chipFont, 'flag').setName('overlay-chip');
      this.root.addAt(this.chipC, 3);
    }
    this.shown = new Set(lay.buttons.map(b => b.id));
    for (const id of IDS) {
      const row = lay.buttons.find(b => b.id === id), btn = this.btn[id], def = v.buttons.find(b => b.id === id);
      btn.c.setVisible(row !== undefined);
      if (row && def) { btn.c.setPosition(WIDTH / 2, y0 + d3(row.y + row.h / 2)); btn.text.setText(def.label); }
    }
    const sw = this.btn.settings.text.width, gap = d3(M.gearGap), gw = d3(M.gearIcon), tot = gw + gap + sw; // gear left of the label
    this.btn.settings.text.setX(-tot / 2 + gw + gap + sw / 2); this.gear.setX(-tot / 2 + gw / 2);
    this.setEnabled(true);
    this.root.setVisible(true);
  }
  hide(): void { this.root.setVisible(false); }
}
