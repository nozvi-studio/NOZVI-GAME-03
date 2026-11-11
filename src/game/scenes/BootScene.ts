import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';
import { createSession } from '../../session';
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
import { screenBackground } from '../ui/background';
import { d3, d3Height, d3m, ui } from '../ui/layout';
import { bootRects } from '../ui/menuLayout';
import { D3_BOOT } from '../ui/menuMetrics';
import { d3Logo } from '../ui/menuWidgets';
import { progressBar } from '../ui/widgets';
import { FONT_UI, TOKENS } from '../uiTokens';

type BootRender = (v: ReturnType<typeof bootView>) => void;

export class BootScene extends Phaser.Scene {
  private view?: BootRender;
  constructor() { super('Boot'); }
  // ART-001 capy textures are ready before any scene draws.
  preload(): void {
    preloadSkins(this.load, isArtPreview(typeof location === 'undefined' ? '' : location.search) ? SKIN_IDS : [activeSkin()]); preloadHudIcons(this.load);
    this.buildView(); // P3b3-R12 logo, hero and progress bar are drawn while assets load
    this.load.on('progress', (p: number) => this.setProgress(p));
  }
  private setProgress = (p: number): void => { this.view?.(bootView(p)); };

  // D3-R10 Boot: background, logo, mango progress bar and "Loading… N%"; the logo draws at once and swaps to Lilita when the fonts load (UIFIX-R8).
  private buildView(): void {
    screenBackground(this, 1);
    const R = bootRects(d3Height()), cx = WIDTH / 2;
    const bar = progressBar(this, d3(R.bar.x), d3(R.bar.y), d3m(R.bar.w), d3m(R.bar.h), TOKENS.d3.tone.mango.face[0]);
    const text = this.add.text(cx, d3(R.text.y + R.text.h / 2), '', { fontFamily: FONT_UI, fontStyle: '800', fontSize: `${d3(D3_BOOT.textFont)}px`, color: TOKENS.d3.white }).setOrigin(0.5);
    text.setShadow(0, ui(2), TOKENS.d3.inkDeep, 0, false, true);
    this.view = v => { bar.set(v.fill, 1); text.setText(t(v.textKey, { n: v.n })); };
    this.setProgress(0);
    const drawLogo = () => {
      const l = d3Logo(this, cx, d3(R.logo.y), R.logo.scale);
      return { destroy: () => { l.mango.destroy(); l.snake.destroy(); } };
    };
    const ready = waitForFonts(typeof document === 'undefined' ? undefined : document.fonts, UI_FONT_SPECS, json.ui.fontLoadTimeoutMs);
    drawThenSwap(drawLogo, ready, () => this.sys?.isActive() ?? false); // UIFIX-R8
  }
  // GDD-13 validate config, then create the run session (P1-D1) and open Home.
  create(): void {
    this.setProgress(1);
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
