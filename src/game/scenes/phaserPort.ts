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
import { loadoutScreen } from '../dom/screens/loadoutScreen';
import { resultsScreen } from '../dom/screens/resultsScreen';
import { settingsScreen } from '../dom/screens/settingsScreen';
import type { MetaHeroAnim, MetaHeroPort, MetaHeroSlot, PhaserPort, UiBridge } from '../dom/uiBridge';
import type { UiHost } from '../dom/uiHost';
import { debugStartLevel, isDebug } from '../flow/debugFlag';
import { installSummarize } from '../flow/installSummarize';
import { goTo } from '../motion';
import { t } from '../text';
import { META_BG_KEY, META_BG_READY_EVENT, type MetaBgScene } from './MetaBgScene';
import { beginRun } from './ui';

export function createPhaserPort(game: Phaser.Game): PhaserPort {
  // META-BG-R2 ignore the parallel MetaBg scene when resolving the foreground scene.
  const activeScene = (): Phaser.Scene | undefined =>
    game.scene.getScenes(true).find(s => s.scene?.key !== META_BG_KEY)
      ?? game.scene.getScene('Home')
      ?? game.scene.getScene('Boot');

  // uiHost may sleep the Phaser loop while a DOM screen is up; loader and scene
  // transitions need ticks, so wake it before any Phaser work (else deadlock).
  const wake = (): void => { (game as { loop?: { wake?: () => void } }).loop?.wake?.(); };

  // ANIM-SNAKE-R10 forward DOM hero slot rects and reactions to MetaBgScene's Rigby2D snake rig.
  let pendingSlot: MetaHeroSlot | null = null;
  const metaBgOf = (): MetaBgScene | null => {
    const sc = game.scene.getScene(META_BG_KEY) as MetaBgScene | null | undefined;
    return sc && typeof sc.setHeroSlot === 'function' ? sc : null;
  };
  game.events?.on?.(META_BG_READY_EVENT, () => {
    if (pendingSlot) metaBgOf()?.setHeroSlot(pendingSlot);
  });

  const metaHero: MetaHeroPort = {
    setSlot(slot: MetaHeroSlot | null): boolean {
      pendingSlot = slot;
      return metaBgOf()?.setHeroSlot(slot) ?? false;
    },
    play(anim: MetaHeroAnim, opts?: { loop?: boolean }): void {
      metaBgOf()?.playHeroAnim(anim, opts);
    },
    isLive(): boolean {
      return metaBgOf()?.isSnakeRigReady() ?? false;
    },
  };

  return {
    ensureSkins(skins: readonly SkinId[], done: () => void): void {
      wake();
      const sc = activeScene();
      if (!sc) { done(); return; }
      ensureSkinTextures(sc, skins, done);
    },
    startScene(key, data): void {
      wake();
      const sc = activeScene();
      if (!sc) return;
      if (key === 'Game') {
        const d = (data ?? {}) as { level?: number; source?: 'home' | 'results'; debug?: boolean };
        beginRun(sc, d.level ?? 1, d.source ?? 'home', d.debug === true);
        return;
      }
      goTo(sc, key, data, key === 'Home' ? 'back' : 'forward');
    },
    emit(event: string): void {
      game.events.emit(event);
    },
    metaHero,
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
    onInstallSummarize: () => {
      if (balance && typeof window !== 'undefined') {
        installSummarize(balance, window as unknown as { __summarize?: (json: string) => unknown });
      }
    },
  });
  const root = typeof document !== 'undefined' ? document.getElementById('ui-root') ?? undefined : undefined;
  const bridge = createUiBridge({
    host,
    root,
    session,
    balance,
    synth,
    t,
    port: createPhaserPort(scene.game),
    screens: {
      home,
      characters: charactersScreen,
      results: resultsScreen,
      settings: settingsScreen,
      loadout: loadoutScreen,
    },
    activeSkin,
    debug,
  });
  scene.registry.set?.('uiBridge', bridge);
  return bridge;
}
