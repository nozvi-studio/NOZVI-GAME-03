import Phaser from 'phaser';
import json from '../../../config/balance.json';
import { parseBalance } from '../../core';
import { createSession } from '../../session';
import { preloadCapy } from '../art/capyTextures';
import { isArtPreview } from '../flow/debugFlag';
import { localStore } from '../platform/localStore';
import { setDisplaySettings } from '../render/palette';
import { UI_FONT_SPECS, waitForFonts } from '../ui/fonts';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  // ART-001 capy textures are ready before any scene draws.
  preload(): void { preloadCapy(this.load); }
  // GDD-13 validate config, then create the run session (P1-D1) and open Home.
  create(): void {
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
    void waitForFonts(fontSet, UI_FONT_SPECS, balance.ui.fontLoadTimeoutMs).then(() => this.scene.start(next)); // P3-0-R6
  }
}
