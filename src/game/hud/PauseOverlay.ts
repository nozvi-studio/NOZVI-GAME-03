import Phaser from 'phaser';
import { SETTINGS_CLOSED } from '../flow/settingsView';
import { HEIGHT, WIDTH } from '../layout';
import { FONT_TITLE, FONT_UI, TOKENS, toInt } from '../uiTokens';
import { pillButton } from '../ui/widgets';
import { ui } from '../ui/layout';
import { drawCard, hudLabel } from './draw';
import { hudIconKey } from './hudIcons';
import { PAUSE_MOCK, pauseLayout, type PauseButtonId, type PauseView } from './overlayModel';

// Mockup px of the pause dialog drawing (PauseD2); row positions come from pauseLayout.
const M = { sidePad: 20, resumeFont: 32, resumeStroke: 7, secondaryFont: 18, chip: 14, chipIcon: 18, chipPadL: 12, chipGap: 8, chipPadR: 16, shadowDy: 20 } as const;
const IDS: readonly PauseButtonId[] = ['resume', 'settings', 'quit'];

// P3b2-R12 PauseD2: scrim + 310 px card; Resume (green, Lilita), Settings and Quit run (cream pills).
export class PauseOverlay {
  readonly root: Phaser.GameObjects.Container;
  private readonly cardX: number; private readonly cardW: number;
  private readonly card: Phaser.GameObjects.Graphics; private readonly chipG: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text; private readonly subtitle: Phaser.GameObjects.Text; private readonly chipText: Phaser.GameObjects.Text;
  private readonly chipIcon: Phaser.GameObjects.Image;
  private readonly btn: Record<PauseButtonId, ReturnType<typeof pillButton>>;
  private shown = new Set<PauseButtonId>();

  constructor(scene: Phaser.Scene, cb: { onResume(): void; onSettings(): void; onQuit(): void }) {
    const m = PAUSE_MOCK, w = ui(m.w);
    this.cardX = (WIDTH - w) / 2; this.cardW = w;
    const scrim = scene.add.graphics().fillStyle(toInt(TOKENS.hud.scrim), TOKENS.hud.pauseScrimAlpha).fillRect(0, 0, WIDTH, HEIGHT);
    const block = scene.add.zone(0, 0, WIDTH, HEIGHT).setOrigin(0).setInteractive(); // swallows taps behind the dialog
    this.card = scene.add.graphics(); this.chipG = scene.add.graphics();
    this.title = hudLabel(scene, WIDTH / 2, 0, '', m.titleSize, TOKENS.text.primary, 900, 'overlay-title').setOrigin(0.5, 0);
    this.subtitle = hudLabel(scene, WIDTH / 2, 0, '', m.subtitleSize, TOKENS.text.soft, 800, 'overlay-subtitle').setOrigin(0.5, 0);
    this.chipIcon = scene.add.image(0, 0, hudIconKey('flag', 'ink')).setDisplaySize(ui(M.chipIcon), ui(M.chipIcon));
    this.chipText = hudLabel(scene, 0, 0, '', M.chip, TOKENS.text.primary, 800, 'overlay-chip').setOrigin(0, 0.5);
    const inner = m.w - 2 * M.sidePad;
    const resume = pillButton(scene, WIDTH / 2, 0, inner, m.resume, '', 'overlay-action', cb.onResume, 'green');
    // Lilita One is loaded at weight 400 only: 'normal' avoids a synthetic bold.
    resume.text.setFontFamily(FONT_TITLE).setFontSize(ui(M.resumeFont)).setFontStyle('normal').setStroke(TOKENS.green.line, ui(M.resumeStroke));
    const settings = pillButton(scene, WIDTH / 2, 0, inner, m.secondary, '', 'overlay-settings', () => { this.setEnabled(false); cb.onSettings(); }, 'cream');
    const quit = pillButton(scene, WIDTH / 2, 0, inner, m.secondary, '', 'overlay-quit', cb.onQuit, 'cream');
    for (const b of [settings, quit]) b.text.setFontFamily(FONT_UI).setFontSize(ui(M.secondaryFont));
    this.btn = { resume, settings, quit };
    this.root = scene.add.container(0, 0, [scrim, block, this.card, this.chipG, this.title, this.subtitle, this.chipIcon, this.chipText,
      resume.c, settings.c, quit.c]).setName('overlay').setVisible(false);
    // Handoff 3: the Settings overlay sits on top; its buttons come back when it closes (Hud re-reads settings itself).
    const reopen = (): void => this.setEnabled(true);
    scene.game.events.on(SETTINGS_CLOSED, reopen);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(SETTINGS_CLOSED, reopen));
  }

  private setEnabled(on: boolean): void {
    for (const id of IDS) { const c = this.btn[id].c; if (c.input) c.input.enabled = on && this.shown.has(id); }
  }

  show(v: PauseView): void {
    const m = PAUSE_MOCK, lay = pauseLayout(v), h = ui(lay.height), y0 = (HEIGHT - h) / 2;
    this.card.clear(); drawCard(this.card, this.cardX, y0, this.cardW, h, ui(m.radius), TOKENS.surface.card, { shadowAlpha: TOKENS.hud.cardShadowAlpha, dy: M.shadowDy });
    this.title.setText(v.title).setY(y0 + ui(lay.title)); this.subtitle.setText(v.subtitle).setY(y0 + ui(lay.subtitle));
    this.chipG.clear(); this.chipText.setVisible(v.chip !== null); this.chipIcon.setVisible(v.chip !== null);
    if (v.chip !== null && lay.chip !== null) {
      this.chipText.setText(v.chip);
      const ch = ui(m.chip), ic = ui(M.chipIcon), pad = ui(M.chipPadL), gap = ui(M.chipGap);
      const cw = pad + ic + gap + ui(M.chipPadR) + this.chipText.width, cx = WIDTH / 2 - cw / 2, cy = y0 + ui(lay.chip);
      this.chipG.fillStyle(toInt(TOKENS.surface.sand)).fillRoundedRect(cx, cy, cw, ch, ch / 2);
      this.chipIcon.setPosition(cx + pad + ic / 2, cy + ch / 2); this.chipText.setPosition(cx + pad + ic + gap, cy + ch / 2);
    }
    this.shown = new Set(lay.buttons.map(b => b.id));
    for (const id of IDS) {
      const row = lay.buttons.find(b => b.id === id), btn = this.btn[id], def = v.buttons.find(b => b.id === id);
      btn.c.setVisible(row !== undefined);
      if (row && def) { btn.c.setPosition(WIDTH / 2, y0 + ui(row.y + row.h / 2)); btn.text.setText(def.label); }
    }
    this.setEnabled(true);
    this.root.setVisible(true);
  }
  hide(): void { this.root.setVisible(false); }
}
