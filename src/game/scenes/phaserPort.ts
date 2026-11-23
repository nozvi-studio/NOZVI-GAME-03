// D4-P3-R3 Phaser-side implementation of PhaserPort + lazy UiBridge registry accessor.
import Phaser from 'phaser';
import type { Balance } from '../../core';
import type { Session } from '../../session';
import { ensureSkinTextures } from '../art/capyTextures';
import { activeSkin, type SkinId } from '../art/skins';
import { createSynth } from '../audio/synth';
import { createUiBridge } from '../dom/bridge';
import { charactersScreen } from '../dom/screens/charactersScreen';
import { createHomeScreen } from '../dom/screens/homeScreen';
import type { PhaserPort, UiBridge } from '../dom/uiBridge';
import type { UiHost } from '../dom/uiHost';
import { debugStartLevel, isDebug } from '../flow/debugFlag';
import { installSummarize } from '../flow/installSummarize';
import { goTo } from '../motion';
import { t } from '../text';
import { beginRun } from './ui';

export function createPhaserPort(game: Phaser.Game): PhaserPort {
  const activeScene = (): Phaser.Scene | undefined =>
    game.scene.getScenes(true)[0] ?? game.scene.getScene('Home') ?? game.scene.getScene('Boot');

  return {
    ensureSkins(skins: readonly SkinId[], done: () => void): void {
      const sc = activeScene();
      if (!sc) { done(); return; }
      ensureSkinTextures(sc, skins, done);
    },
    startScene(key, data): void {
      const sc = activeScene();
      if (!sc) return;
      if (key === 'Game') {
        const d = (data ?? {}) as { level?: number; source?: 'home' | 'results'; debug?: boolean };
        beginRun(sc, d.level ?? 1, d.source ?? 'home', d.debug === true);
        return;
      }
      goTo(sc, key, data, key === 'Home' ? 'back' : 'forward');
    },
  };
}

export function bridgeOf(scene: { registry: { get(k: string): unknown; set?(k: string, v: unknown): void }; game?: Phaser.Game }): UiBridge | null {
  const existing = scene.registry.get('uiBridge') as UiBridge | undefined;
  if (existing) return existing;
  const host = scene.registry.get('uiHost') as UiHost | undefined;
  const session = scene.registry.get('session') as Session | undefined;
  const balance = scene.registry.get('balance') as Balance | undefined;
  if (!host || !session || !scene.game) return null;
  const synth = createSynth();
  synth.setOn(session.save().settings.sound);
  const debug = typeof location !== 'undefined' && isDebug(location.search);
  const home = createHomeScreen({
    debugLevel: () => (balance && typeof location !== 'undefined' ? debugStartLevel(location.search, balance.level.maxLevel) : null),
    onInstallSummarize: () => { if (balance) installSummarize(balance); },
  });
  const bridge = createUiBridge({
    host,
    session,
    synth,
    t,
    port: createPhaserPort(scene.game),
    screens: { home, characters: charactersScreen },
    activeSkin,
    debug,
  });
  scene.registry.set?.('uiBridge', bridge);
  return bridge;
}
