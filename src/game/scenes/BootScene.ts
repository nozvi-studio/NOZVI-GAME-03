import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';
import { createSession } from '../../session';
import { headKey } from '../art/capyRig';
import { SKIN_IDS, activeSkin } from '../art/skins';
import { preloadSkins } from '../art/capyTextures';
import { preloadHudIcons } from '../hud/hudIcons';
import { bootView } from '../flow/bootView';
import { isArtPreview } from '../flow/debugFlag';
import { HEIGHT, WIDTH } from '../layout';
import { bootHoldMs, goTo } from '../motion';
import { localStore } from '../platform/localStore';
import { setDisplaySettings } from '../render/palette';
import { t } from '../text';
import { UI_FONT_SPECS, drawThenSwap, waitForFonts } from '../ui/fonts';
import { layoutColumn, ui } from '../ui/layout';
import { bootColumn, smoothPath } from '../ui/menuLayout';
import { MENU } from '../ui/menuMetrics';
import { bgCream, hill, logoLine, scaledBlock } from '../ui/menuWidgets';
import { progressBar } from '../ui/widgets';
import { FONT_UI, TOKENS, toInt } from '../uiTokens';

const B = MENU.boot;
type BootRender = (v: ReturnType<typeof bootView>) => void;

export class BootScene extends Phaser.Scene {
  private view?: BootRender;
  private headSlot?: Phaser.GameObjects.Container;
  private heroCentre = { x: 0, y: 0 };
  constructor() { super('Boot'); }
  // ART-001 capy textures are ready before any scene draws.
  preload(): void {
    preloadSkins(this.load, isArtPreview(typeof location === 'undefined' ? '' : location.search) ? SKIN_IDS : [activeSkin()]); preloadHudIcons(this.load);
    this.buildView(); // P3b3-R12 logo, hero and progress bar are drawn while assets load
    this.load.on('progress', (p: number) => this.setProgress(p));
  }
  private setProgress = (p: number): void => { this.view?.(bootView(p)); };

  // P3b3-R12 BootD2: peach hero disc with snake and mango, progress bar, "Loading… N%"; the logo draws at once and swaps to Lilita when the fonts load (UIFIX-R8).
  private buildView(): void {
    bgCream(this);
    const l = layoutColumn(bootColumn(json.ui.minShrink));
    const blk = scaledBlock(this, l).setY(ui(B.top + MENU.logo.height)), cx = WIDTH / 2, hero = ui(B.hero); // top anchored under the logo (BootD2)
    const cy = ui(B.heroGap) + hero / 2, hx = cx - hero / 2, hy = ui(B.heroGap);
    this.heroCentre = { x: hx + ui(B.capy.x + B.capy.size / 2), y: hy + ui(B.capy.y + B.capy.size / 2) };
    const g = this.add.graphics();
    g.fillStyle(toInt(TOKENS.surface.peach)).fillCircle(cx, cy, hero / 2);
    const at = (px: number, py: number) => ({ x: hx + ui(px), y: hy + ui(py) });
    const trail = smoothPath(B.trail.map(([px, py]) => ({ x: px!, y: py! })), B.trailRadius, B.trailStep);
    for (const [col, rad] of [[TOKENS.snake.shade, B.shadeR], [TOKENS.snake.body, B.bodyR]] as const) {
      g.fillStyle(toInt(col)); for (const p of trail) { const q = at(p.x, p.y); g.fillCircle(q.x, q.y, ui(rad)); }
    }
    g.fillStyle(toInt(TOKENS.surface.white), B.hiAlpha);
    for (const p of trail) { const q = at(p.x + B.hiDx, p.y + B.hiDy); g.fillCircle(q.x, q.y, ui(B.hiR)); }
    const M = B.mango, mc = at(B.hero - M.right - M.size / 2, B.hero - M.bottom - M.size / 2);
    g.fillStyle(toInt(TOKENS.surface.white)).fillCircle(mc.x, mc.y, ui(M.size * M.outer));
    g.fillStyle(toInt(TOKENS.accent.orange)).fillCircle(mc.x, mc.y, ui(M.size * M.inner));
    g.fillStyle(toInt(TOKENS.green.deep)).fillEllipse(mc.x + ui(M.size * M.leaf.dx), mc.y + ui(M.size * M.leaf.dy), ui(M.size * M.leaf.w), ui(M.size * M.leaf.h));
    const barY = hy + hero + ui(B.barGap);
    const bar = progressBar(this, cx - ui(B.barW) / 2, barY, B.barW, B.barH, TOKENS.accent.orange);
    const text = this.add.text(cx, barY + ui(B.barH + B.textGap + B.textH / 2), '', { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${ui(B.textFont)}px`, color: TOKENS.text.soft }).setOrigin(0.5);
    const head = this.add.container(0, 0);
    blk.add([g, bar.g, text, head]);
    this.headSlot = head;
    this.view = v => { bar.set(v.fill, 1); text.setText(t(v.textKey, { n: v.n })); };
    this.setProgress(0);
    hill(this, HEIGHT - ui(B.hillPeek));
    const logoY = ui(B.top + MENU.logo.lineH / 2);
    const drawLogo = () => {
      const a = logoLine(this, cx, logoY, t('logo.mango'), 0, MENU.logo.size);
      const b = logoLine(this, cx, logoY + ui(MENU.logo.lineH - MENU.logo.overlap), t('logo.snake'), 2, MENU.logo.size);
      return { destroy: () => { a.destroy(); b.destroy(); } };
    };
    const ready = waitForFonts(typeof document === 'undefined' ? undefined : document.fonts, UI_FONT_SPECS, json.ui.fontLoadTimeoutMs);
    drawThenSwap(drawLogo, ready, () => this.sys?.isActive() ?? false); // UIFIX-R8
  }
  // The capy head texture exists only after loading, so it is added from create().
  private drawHead(): void {
    const key = headKey(activeSkin(), 'idle', 'large');
    if (this.headSlot && this.textures.exists(key)) this.headSlot.add(this.add.image(this.heroCentre.x, this.heroCentre.y, key).setDisplaySize(ui(B.capy.size), ui(B.capy.size)));
  }
  // GDD-13 validate config, then create the run session (P1-D1) and open Home.
  create(): void {
    this.setProgress(1);
    this.drawHead();
    const balance = parseBalance(structuredClone(json));
    this.registry.set('balance', balance);
    const store = localStore();
    this.registry.set('store', store);
    // MEC-008-R12 the session loads the save with balance rules; the seed only picks a run (core RNG does the rest).
    const session = createSession({ balance, store,
      newSeed: () => (Math.random() * 2 ** 31) >>> 0, now: () => Date.now() });
    this.registry.set('session', session);
    const save = session.save();
    this.registry.set('save', save);
    setDisplaySettings(save.settings); // P3-0-R5
    const search = typeof location === 'undefined' ? '' : location.search;
    const next = isArtPreview(search) ? 'ArtPreview' : 'Home';
    const fontSet = typeof document === 'undefined' ? undefined : document.fonts;
    const waitStart = performance.now(); // MOT-2-R7
    void waitForFonts(fontSet, UI_FONT_SPECS, balance.ui.fontLoadTimeoutMs).then(() => {
      const hold = bootHoldMs(performance.now() - waitStart, balance.motion.fadeMs);
      const go = (): void => { goTo(this, next, undefined, 'start'); }; // fade only: Boot has no spatial relation to Home (ruling 1); ArtPreview gets the same fade
      if (hold > 0 && this.time) this.time.delayedCall(hold, go); else go();
    }); // P3-0-R6
  }
}
