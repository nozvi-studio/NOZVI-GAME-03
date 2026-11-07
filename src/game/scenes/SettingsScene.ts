import Phaser from 'phaser';
import type { Balance } from '../../core';
import { resolveDisplay } from '../../meta/settings';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { applySettings, settingsExit, settingsView, SETTINGS_CLOSED, themePatch, togglePatch, type SettingsEntry, type SettingsToggle } from '../flow/settingsView';
import { HEIGHT, WIDTH } from '../layout';
import { osDisplay } from '../render/palette';
import { t } from '../text';
import { drawIcon } from '../ui/icons';
import { layoutColumn, ui } from '../ui/layout';
import { settingsColumn } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, roundIconButton, scaledBlock, tap } from '../ui/menuWidgets';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';

const M = MENU.settings;
// SettingsD2 row icon tiles: sound blue, haptics pink, D-pad mint, reduced motion yellow.
const TILE: Record<SettingsToggle, string> = { sound: TOKENS.sky.stat, haptics: TOKENS.accent.pink, dpad: TOKENS.green.mint, reducedMotion: TOKENS.menu.statButter };
const label = (size: number, weight: '800' | '900', color: string): Phaser.Types.GameObjects.Text.TextStyle =>
  ({ fontFamily: FONT_UI, fontStyle: weight, fontSize: `${ui(size)}px`, color });

// P3b3-R6/R7 SettingsD2: four switch rows and a Light/Dark board theme choice; every change saves at once.
// Overlay contract (P3b-2 Hud): scene.launch('Settings', { overlay: true }); Back stops this scene and emits SETTINGS_CLOSED on game.events.
export class SettingsScene extends Phaser.Scene {
  private entry: SettingsEntry = {};
  private session!: Session;
  private synth!: Synth;
  private body?: Phaser.GameObjects.Container;
  constructor() { super('Settings'); }
  init(data: SettingsEntry): void { this.entry = data ?? {}; }

  create(): void {
    this.session = this.registry.get('session') as Session;
    this.synth = createSynth(); this.synth.setOn(this.session.save().settings.sound);
    bgCream(this);
    // Overlay: a full-screen cream rect that swallows taps on the paused board underneath.
    if (this.entry.overlay) this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, toInt(TOKENS.surface.cream)).setInteractive();
    const headY = ui(MENU.padTop + MENU.round / 2);
    roundIconButton(this, ui(MENU.side + MENU.round / 2), headY, MENU.round, 'back', 'settings-back', () => this.back());
    this.add.text(WIDTH / 2, headY, t('settings.title'), label(M.headFont, '900', TOKENS.text.primary)).setOrigin(0.5);
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { if (e.code === 'Escape') { e.preventDefault(); this.back(); } };
    keys?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keys?.off('keydown', onKey));
    this.build();
  }

  private back(): void {
    this.synth.play('uiTap');
    const x = settingsExit(this.entry);
    if (x.action === 'start') this.scene.start(x.scene);
    else { this.game.events.emit(SETTINGS_CLOSED); this.scene.stop(); }
  }

  private change(patch: Parameters<typeof applySettings>[1]): void {
    applySettings(this.session, patch, osDisplay());
    this.synth.setOn(this.session.save().settings.sound);
    this.synth.play('uiTap');
    this.build();
  }

  // Rebuilds the middle block from the view model (cheap: 5 rows).
  private build(): void {
    this.body?.destroy(true);
    const minShrink = (this.registry.get('balance') as Balance).ui.minShrink;
    const blk = (this.body = scaledBlock(this, layoutColumn(settingsColumn(minShrink))));
    const s = this.session.save().settings, d = resolveDisplay(s, osDisplay());
    const v = settingsView(s, d), g = ui(M.gap), pad = ui(M.pad);
    const cardW = ui(M.cardW), cardX = WIDTH / 2 - cardW / 2, rad = ui(M.radius);
    const rowsH = M.rows * M.rowH;
    let y = g;
    const rows = this.add.graphics(); blk.add(rows);
    rows.fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(cardX, y, cardW, ui(rowsH), rad);
    v.rows.forEach((r, i) => {
      const top = y + ui(i * M.rowH), cy = top + ui(M.rowH / 2);
      if (i > 0) rows.fillStyle(toInt(TOKENS.menu.rowDivider)).fillRect(cardX, top, cardW, ui(M.divider));
      const half = ui(M.tile / 2), tileX = cardX + pad - ui(M.tileInset) + half;
      const tile = this.add.graphics().setPosition(tileX, cy); blk.add(tile);
      tile.fillStyle(toInt(TILE[r.id])).fillRoundedRect(-half, -half, ui(M.tile), ui(M.tile), ui(M.tileR));
      const ic = this.add.graphics().setPosition(tileX, cy); blk.add(ic);
      drawIcon(ic, r.icon, ui(M.icon), toInt(TOKENS.text.primary));
      const tx = tileX + half + ui(M.textGap);
      blk.add(this.add.text(tx, cy - ui(M.titleDy), t(r.titleKey), label(M.titleFont, '900', TOKENS.text.primary)).setOrigin(0, 0.5));
      blk.add(this.add.text(tx, cy - ui(M.subDy), t(r.subKey), { ...label(M.subFont, '800', TOKENS.text.soft), wordWrap: { width: ui(M.subW) } }).setOrigin(0, 0));
      const swW = ui(M.sw.w), swH = ui(M.sw.h), swX = cardX + cardW - pad - swW / 2;
      blk.add(this.add.text(swX - swW / 2 - ui(M.textGap), cy, t(r.valueKey), label(M.valueFont, '900', TOKENS.text.primary)).setOrigin(1, 0.5));
      // Track: green when on, sand when off; the 2 px outline is inset and coloured per state (SettingsD2).
      const sw = this.add.graphics().setPosition(swX, cy); blk.add(sw);
      const lw = ui(M.sw.line), iw = swW - lw, ih = swH - lw;
      sw.fillStyle(toInt(r.on ? TOKENS.green.face : TOKENS.surface.sand)).fillRoundedRect(-swW / 2, -swH / 2, swW, swH, swH / 2);
      sw.lineStyle(lw, toInt(r.on ? TOKENS.green.deep : TOKENS.text.soft)).strokeRoundedRect(-iw / 2, -ih / 2, iw, ih, ih / 2);
      sw.fillStyle(toInt(r.on ? TOKENS.surface.white : TOKENS.text.soft)).fillCircle(ui(r.on ? M.sw.knob : -M.sw.knob), 0, ui(M.sw.knob));
      blk.add(tap(this, WIDTH / 2, cy, cardW, ui(M.rowH), `settings-${r.id}`, () => this.change(togglePatch(s, d, r.id))));
    });
    y += ui(rowsH) + g;
    // Board theme card: title, sub line, two swatch tiles (Light / Dark).
    const T = M.theme, padX = ui(T.padX), tc = this.add.graphics(); blk.add(tc);
    tc.fillStyle(toInt(TOKENS.surface.card)).fillRoundedRect(cardX, y, cardW, ui(M.themeCardH), rad);
    blk.add(this.add.text(cardX + padX, y + ui(T.titleY), t('settings.theme'), label(M.titleFont, '900', TOKENS.text.primary)).setOrigin(0, 0.5));
    blk.add(this.add.text(cardX + padX, y + ui(T.subY), t('settings.theme.sub'), label(M.subFont, '800', TOKENS.text.soft)).setOrigin(0, 0.5));
    (['light', 'dark'] as const).forEach((th, i) => {
      const w = (cardW - 2 * padX - ui(T.gap)) / 2, x0 = cardX + padX + i * (w + ui(T.gap));
      const y0 = y + ui(T.tilesY), h = ui(T.tileH), r = ui(T.r);
      const sel = v.theme === th, cols = th === 'light' ? TOKENS.menu.themeLight : TOKENS.menu.themeDark;
      tc.fillStyle(toInt(sel ? TOKENS.menu.bestSoft : TOKENS.surface.cream)).fillRoundedRect(x0, y0, w, h, r);
      tc.lineStyle(ui(sel ? T.lineSel : T.line), toInt(sel ? TOKENS.text.primary : TOKENS.surface.stone)).strokeRoundedRect(x0, y0, w, h, r);
      // Rounded swatch: a 2x2 checker whose outer corner cell carries the swatch radius.
      const sq = ui(T.swatch), half = sq / 2, sr = ui(T.swatchR), sx = x0 + w / 2 - half, sy = y0 + ui(T.swatchTop);
      for (let q = 0; q < 4; q++) {
        const col = q % 2, row = q >> 1, corner = (c: number, rr: number) => (c === col && rr === row ? sr : 0);
        tc.fillStyle(toInt(cols[(q + (q >> 1)) % 2]!))
          .fillRoundedRect(sx + half * col, sy + half * row, half, half, { tl: corner(0, 0), tr: corner(1, 0), bl: corner(0, 1), br: corner(1, 1) });
      }
      const lw = ui(T.swatchLine);
      tc.lineStyle(lw, toInt(TOKENS.text.primary), T.swatchEdgeAlpha).strokeRoundedRect(sx + lw / 2, sy + lw / 2, sq - lw, sq - lw, sr - lw / 2);
      tc.fillStyle(toInt(TOKENS.accent.orange)).fillRoundedRect(sx + ui(T.snake.dx), sy + ui(T.snake.dy), ui(T.snake.w), ui(T.snake.h), ui(T.snake.r));
      tc.fillStyle(toInt(TOKENS.menu.slotRing)).fillCircle(sx + ui(T.ball.dx), sy + ui(T.ball.dy), ui(T.ball.r));
      blk.add(this.add.text(x0 + w / 2, y0 + ui(T.labelY), t(th === 'light' ? 'settings.light' : 'settings.dark'), label(T.labelFont, '900', TOKENS.text.primary)).setOrigin(0.5));
      blk.add(tap(this, x0 + w / 2, y0 + h / 2, w, h, `settings-theme-${th}`, () => this.change(themePatch(th))));
    });
    y += ui(M.themeCardH) + g;
    blk.add(this.add.text(WIDTH / 2, y + ui(M.captionDy), t('settings.autosave'), label(M.subFont, '800', TOKENS.text.soft)).setOrigin(0.5));
  }
}
