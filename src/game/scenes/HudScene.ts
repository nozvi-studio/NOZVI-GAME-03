import Phaser from 'phaser';
import { nextKeyLevel } from '../../core';
import type { Balance, SimEvent, SimSnapshot } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { isDebug } from '../flow/debugFlag';
import { homeView } from '../flow/homeModel';
import { flowPause, flowResume, flowTogglePause, type FlowEffect } from '../flow/runFlow';
import { SETTINGS_CLOSED } from '../flow/settingsView';
import { SnakeRig } from '../art/snakeRig';
import { metaHeroPlacement, shouldUseSnakeRig } from '../art/snakeRigModel';
import { activeSkin } from '../art/skins';
import { BannerLayer } from '../hud/BannerLayer';
import { levelUpBanners, skillPills, skillTip } from '../hud/banners';
import { CountdownOverlay } from '../hud/CountdownOverlay';
import { HudTop } from '../hud/HudTop';
import { BottomGroup } from '../hud/BottomGroup';
import { d3HudLayout, debugRects } from '../hud/d3HudLayout';

import { hudView } from '../hud/hudModel';
import { countdownCard, pauseView } from '../hud/overlayModel';
import { PauseOverlay } from '../hud/PauseOverlay';
import { SkillButtons } from '../hud/SkillButtons';
import { createDpad, type DpadKeys, type DpadRect } from '../input/dpad';
import { DeathCard } from '../juice/DeathCard';
import { deathSeed } from '../juice/deathLine';
import { colorOf } from '../juice/colors';
import { landedCells } from '../juice/derived';
import { JuicePlayer, type DeathCardView, type DeathExit } from '../juice/JuicePlayer';
import { ScreenFx } from '../juice/ScreenFx';
import type { HudTarget, JuiceInput } from '../juice/types';
import { acceptSkillInput, skillSlotForKey } from '../input/skillKeys';
import { cellPx, WIDTH } from '../layout';
import { enter, goTo } from '../motion';
import { currentPalette, reduceMotion } from '../render/palette';
import { runStartLines } from '../hudText';
import { pillButton } from '../ui/widgets';
import { d3, d3Height, d3m } from '../ui/layout';
import { incomingBanner, t } from '../text';
import { MOTION } from '../dom/motionTokens';
import type { UiBridge } from '../dom/uiBridge';
import type { StageRect } from '../dom/stageSync';
import type { GameScene } from './GameScene';
import { bridgeOf } from './phaserPort';

type HudHint = ReturnType<typeof homeView>['hint'];
/** Render order only: the DeathCard dim and rig sit above every HUD object. */
const DEATH_HERO_DEPTH = 10_000;

// P3b-2 / D4-P4-R4: wiring only. Models in src/game/hud/*, views draw them; this scene owns events, sounds, haptics, flow and session calls.
export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene; private session!: Session; private balance!: Balance; private synth!: Synth;
  private bridge: UiBridge | null = null;
  private top!: HudTop; private bottom!: BottomGroup; private skills!: SkillButtons; private pause!: PauseOverlay; private count!: CountdownOverlay; private banners!: BannerLayer;
  private pad!: ReturnType<typeof createDpad>; private dpadOn = false; private touch = false;
  private heading = ''; private hint: HudHint = null; private cpCount = 0; private bestLevelAtStart = 0; private orbTipShown = false; private leaving = false; private juice!: JuicePlayer;
  private haptics = true; private startBanner: string[] = []; private shrunkTo: number | null = null; private overTimer?: Phaser.Time.TimerEvent; private goTimer?: Phaser.Time.TimerEvent;
  private deathRig: SnakeRig | null = null; private deathDim: Phaser.GameObjects.Rectangle | null = null; private deathSlot: (() => StageRect) | null = null;
  private debugKey: { c: Phaser.GameObjects.Container } | null = null; private debugNext: { c: Phaser.GameObjects.Container } | null = null;

  constructor() { super('Hud'); }

  create(): void {
    this.gameScene = this.scene.get('Game') as GameScene;
    this.session = this.registry.get('session') as Session; this.balance = this.registry.get('balance') as Balance;
    this.bridge = bridgeOf(this);
    const save = this.session.save(); // pad geometry always computed (dpadKeys); visibility follows settings.dpad
    this.cpCount = save.unlockedCheckpoints.length; this.bestLevelAtStart = save.bestLevel; this.readHint();
    this.touch = !!this.sys.game?.device?.input?.touch; this.orbTipShown = false; this.leaving = false; this.heading = ''; this.shrunkTo = null;
    this.synth = createSynth(); this.synth.unlock();
    this.input.setGlobalTopOnly(true);
    const d3l = d3HudLayout(d3Height(), save.settings.dpad);
    this.top = new HudTop(this, d3l, () => this.gameScene.apply(flowTogglePause(this.gameScene.flow, this.balance)));
    this.bottom = new BottomGroup(this, d3l); this.bottom.setTouch(this.touch, reduceMotion());
    this.skills = new SkillButtons(this, d3l, slot => this.useSkill(slot), this.balance, slot => this.skillDenied(slot));
    this.createDebugButtons(); // created before the banner layer and overlays so those sit above them
    this.dpadOn = save.settings.dpad;
    this.pad = createDpad(this, this.dpadKeys(), d => this.gameScene.turn(d.x, d.y)); // MEC-001-R2: a turn during the countdown counts
    this.banners = new BannerLayer(this, d3l, this.balance);
    const hud = { point: (t: HudTarget) => t === 'energyBar' ? this.bottom.point(t) : this.top.point(t), skillPoint: (s: 0 | 1) => this.skills.point(s),
      bump: (t: HudTarget, k: number, ms: number) => { if (t === 'energyBar') this.bottom.bump(t, k, ms); else this.top.bump(t, k, ms); }, plantFlag: (_level: number, ms: number) => this.bottom.plantFlag(ms) };
    this.juice = new JuicePlayer({ // P3a-R1..R9: sounds, haptics (through the gated buzz), board / screen visuals and the death sequence
      balance: this.balance, synth: { play: n => this.synth.play(n), buzz: p => this.buzz(p) }, board: this.gameScene,
      screen: new ScreenFx(this, hud, id => colorOf(id, currentPalette()), cellPx(this.balance), this.balance.juice.perf, this.balance.juice.skill.iconRingScale),
      settings: () => this.session.save().settings, reduced: reduceMotion,
      headCell: () => { const s = this.gameScene.snapshot(); const h = s?.snake[0]; return h ? { x: h.x, y: h.y } : null; }, // MOT-3-R8
      seed: () => { const s = this.gameScene.snapshot(); return s ? deathSeed(s.score, s.level, s.timeMs) : 0; },
      makeCard: () => this.makeDeathCard(), later: (ms, fn) => this.time.delayedCall(ms, fn), onDone: exit => this.leave(exit) });
    this.count = new CountdownOverlay(this);
    this.pause = new PauseOverlay(this, {
      onResume: () => { this.applySettings(); this.gameScene.apply(flowResume(this.gameScene.flow, this.balance)); },
      onSettings: () => this.scene.launch('Settings', { overlay: true }),
      onQuit: () => { this.session.quit(); this.toResults(0); }, // MEC-003-R20, MEC-008-R6
    });
    this.applySettings();
    const flow = (e: FlowEffect): void => this.onFlow(e), events = (e: SimEvent[]): void => this.onEvents(e), over = (s: SimSnapshot): void => this.onOver(s);
    const derived = (i: JuiceInput): void => this.juice.handleBatch([i]);
    const toggle = (): void => this.toggleSound(), pause = (): void => this.gameScene.apply(flowPause(this.gameScene.flow));
    const hidden = (): void => { if (document.hidden) { pause(); this.session.hidden(); } };
    const reread = (): void => { this.applySettings(); this.refresh(); }; // handoff 3: settings changed in the overlay
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { // MEC-007-R14/R15; the Settings overlay or DOM modal owns the keyboard while open (D4-P4-R5)
      if (this.scene.isActive('Settings') || this.bridge?.overlays.isModalOpen()) return;
      const slot = skillSlotForKey(e.code, e.repeat); if (slot === null) return;
      e.preventDefault(); this.useSkill(slot);
    };
    this.gameScene.events.on('flow', flow); this.gameScene.events.on('sim-events', events);
    this.gameScene.events.on('derived-juice', derived);
    this.gameScene.events.on('run-over', over); this.gameScene.events.on('toggle-sound', toggle);
    this.game.events.on(SETTINGS_CLOSED, reread);
    keys?.on('keydown', onKey); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene.events.off('flow', flow); this.gameScene.events.off('sim-events', events);
      this.gameScene.events.off('derived-juice', derived);
      this.gameScene.events.off('run-over', over); this.gameScene.events.off('toggle-sound', toggle);
      this.game.events.off(SETTINGS_CLOSED, reread);
      keys?.off('keydown', onKey); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
      this.overTimer?.remove(); this.goTimer?.remove(); this.juice.destroy(); this.banners.hide(); this.clearDeathHero(); this.bridge?.overlays.hideAll();
    });
    this.refresh(); this.showRunStart();
    enter(this, [], {}); // MOT-2-R11 camera fade-in, same as Game; also re-arms goTo on this reused scene instance
  }

  /** Settings that can change while paused (Settings overlay, P3b-3): sound, haptics and D-pad. Read on create, Resume and settings-closed. */
  private applySettings(): void {
    const s = this.session.save().settings;
    this.bottom.setTouch(this.touch, reduceMotion()); this.synth.setOn(s.sound); this.haptics = s.haptics; this.pad.setVisible(s.dpad);
    if (s.dpad !== this.dpadOn) { // D3-R9 R4: re-place the views, nothing is recreated
      this.dpadOn = s.dpad; const l = d3HudLayout(d3Height(), s.dpad);
      this.skills.place(l); this.bottom.place(l); this.top.place(l);
    }
  }
  private dpadKeys(): DpadKeys {
    const k = d3HudLayout(d3Height(), true).dpad!, px = (r: { x: number; y: number; w: number; h: number }): DpadRect => ({ x: d3(r.x), y: d3(r.y), w: d3(r.w), h: d3(r.h) });
    return { up: px(k.up), left: px(k.left), right: px(k.right), down: px(k.down) };
  }
  /** Handoff 2: every vibration goes through the haptics setting. */
  private buzz(pattern: number | number[]): void { if (this.haptics) this.synth.buzz(pattern); }
  private settingsAvailable(): boolean {
    if (this.bridge) return true;
    const s = this.scene.get('Settings');
    return s !== null && s !== undefined;
  }

  /** ANIM-SNAKE-R13 centered Rigby2D dead clip under the DeathCard: Phaser dim + unzoomed rig aligned to the DOM hero slot. */
  private showDeathHero(readRect: () => StageRect): void {
    this.clearDeathHero();
    const cfg = this.balance.ui.snakeRig;
    const cam = this.cameras.main;
    try {
      this.deathDim = this.add.rectangle(0, 0, cam.width, cam.height, cfg.deathDimColor, cfg.deathDimAlpha)
        .setOrigin(0).setScrollFactor(0).setDepth(DEATH_HERO_DEPTH);
      this.deathRig = SnakeRig.createOverlay(this, cfg);
      (this.deathRig.rig as unknown as { setDepth?(d: number): unknown }).setDepth?.(DEATH_HERO_DEPTH + 1);
      this.deathRig.setVisible(false);
      this.deathRig.play('dead');
    } catch {
      this.clearDeathHero();
      return;
    }
    this.deathSlot = readRect;
    this.syncDeathHero(0, 0);
    this.events.on(Phaser.Scenes.Events.UPDATE, this.syncDeathHero, this);
  }

  private syncDeathHero(_time: number, delta: number): void {
    if (!this.deathRig || !this.deathSlot) return;
    const cam = this.cameras.main;
    const dt = Number.isFinite(delta) ? Math.min(Math.max(0, delta), this.balance.flow.maxFrameDeltaMs) : 0;
    const place = metaHeroPlacement(this.deathSlot(), this.game.canvas?.getBoundingClientRect?.(), cam.width, cam.height, this.balance.ui.snakeRig);
    if (!place.visible) { this.deathRig.setVisible(false); return; }
    this.deathRig.setVisible(true);
    this.deathRig.updateOverlay(dt, place.x, place.feetY, place.scale);
  }

  private clearDeathHero(): void {
    this.events.off(Phaser.Scenes.Events.UPDATE, this.syncDeathHero, this);
    this.deathRig?.destroy(); this.deathRig = null;
    this.deathDim?.destroy(); this.deathDim = null;
    this.deathSlot = null;
  }

  private makeDeathCard(): DeathCardView {
    if (!this.bridge) return new DeathCard(this, this.balance, reduceMotion());
    const bridge = this.bridge;
    const { skipLockMs: lockMs, continueMs } = this.balance.juice.death;
    const scene = this;
    let skipFn: ((exit?: DeathExit) => void) | null = null;
    let pending: DeathExit | null = null;
    return {
      show(): void { // GAMEOVER-R1..R5: the humorous death line is no longer shown
        const skin = activeSkin();
        const live = shouldUseSnakeRig({ isWebGL: SnakeRig.isWebGL(scene), reduced: reduceMotion(), skin, rigLoaded: SnakeRig.isLoaded(scene) });
        bridge.overlays.deathCard({ lockMs, continueMs, onChoice: c => {
          if (skipFn) skipFn(c);
          else pending = c;
        } }, { skin, live, onSlot: live ? readRect => scene.showDeathHero(readRect) : undefined });
      },
      armSkip(onSkip: (exit?: DeathExit) => void): void {
        skipFn = onSkip;
        if (pending) {
          const c = pending;
          pending = null;
          onSkip(c);
        }
      },
      destroy(): void {
        skipFn = null;
        pending = null;
        scene.clearDeathHero();
        bridge.overlays.hideAll();
      },
    };
  }

  // MEC-003 §8 run-start banner (challenge level at run start). Hud is (re)launched once per run start, after Game emitted newRun.
  // Held until the countdown's 'go' so the card does not sit under the digit and expire during the countdown.
  private showRunStart(): void { this.startBanner = runStartLines(this.gameScene.snapshot() ?? { level: 0, challenge: false }, t); }
  private flushRunStart(): void {
    if (this.startBanner.length) this.banners.enqueueAll(this.startBanner.map(title => ({ kind: 'challenge' as const, title })));
    this.startBanner = [];
  }

  // MEC-003-R21 ?debug=1 only: "+1" and "Key" jump through the normal level-up path; the run becomes a debug run.
  private createDebugButtons(): void {
    this.debugKey = this.debugNext = null;
    if (typeof window === 'undefined' || !isDebug(window.location?.search ?? '')) return;
    const skip = (key: boolean): void => {
      if (!acceptSkillInput(this.gameScene.flow.status)) return;
      const cur = this.gameScene.snapshot()?.level; if (cur === undefined) return;
      const to = key ? nextKeyLevel(cur, this.balance) : cur + 1;
      if (to !== null && to <= this.balance.level.maxLevel) this.session.debugSkipTo(to);
    };
    const r = debugRects(d3Height()), btn = (b: DpadRect, text: string, name: string, key: boolean): ReturnType<typeof pillButton> =>
      pillButton(this, d3(b.x + b.w / 2), d3(b.y + b.h / 2), d3m(b.w), d3m(b.h), text, name, () => skip(key), 'cream');
    this.debugKey = btn(r.key, 'Key ▶', 'debug-key', true); this.debugNext = btn(r.next, '+1', 'debug-next', false); // debug only: bottom corners
  }
  /** D3-R1 tap on a locked slot: denied shake and the nope sound, no cast. */
  private skillDenied(slot: 0 | 1): void { if (!acceptSkillInput(this.gameScene.flow.status)) return; this.skills.shake(slot); this.synth.play('nope'); }
  private useSkill(slot: 0 | 1): void { if (acceptSkillInput(this.gameScene.flow.status)) this.session.useSkill(slot); } // MEC-007-R15

  private onFlow(effect: FlowEffect): void {
    switch (effect.type) {
      case 'newRun': this.overTimer?.remove(); this.goTimer?.remove(); this.banners.hide(); this.synth.unlock(); this.showRunStart(); break; // MEC-003 §8
      case 'hideOverlay':
        this.goTimer?.remove();
        if (this.bridge) { this.bridge.overlays.hidePause(); this.bridge.overlays.countdown(null, null); }
        else { this.pause.hide(); this.count.hide(); }
        break;
      case 'showPaused':
        this.goTimer?.remove();
        if (this.bridge) this.bridge.overlays.countdown(null, null);
        else this.count.hide();
        this.showPause();
        break;
      case 'tick': {
        this.goTimer?.remove();
        const s = this.gameScene.snapshot();
        const card = s ? countdownCard(s, !this.gameScene.flow.started, this.balance, t) : null;
        if (this.bridge) this.bridge.overlays.countdown(effect.n, card);
        else this.count.tick(effect.n, card);
        this.synth.play('tick');
        break;
      }
      case 'go':
        this.goTimer?.remove();
        if (this.bridge) {
          this.bridge.overlays.countdown('go', null);
          this.goTimer = this.time.delayedCall(MOTION.countdownGoMs, () => this.bridge?.overlays.countdown(null, null));
        } else {
          this.count.hide();
        }
        this.synth.play('go');
        this.flushRunStart();
        break; // MEC-001-R2
    }
    this.refresh();
  }
  private showPause(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    const v = pauseView({ level: s.level, biome: s.biome, hint: homeView(this.session.homeModel()).hint, settingsAvailable: this.settingsAvailable() }, t);
    if (this.bridge) {
      this.bridge.overlays.showPause(v, {
        onResume: () => { this.applySettings(); this.gameScene.apply(flowResume(this.gameScene.flow, this.balance)); },
        onSettings: () => this.bridge?.openSettingsOverlay(() => { this.applySettings(); this.refresh(); this.showPause(); }),
        onQuit: () => { this.bridge?.overlays.hideAll(); this.session.quit(); this.toResults(0); }, // MEC-003-R20, MEC-008-R6
      });
    } else {
      this.pause.show(v);
    }
  }

  // P1 HUD event mapping (MEC-003/006/007/008 §8) with the P3b-2 banner/tip views. Sounds, haptics and visuals come from the JuicePlayer (P3a).
  private onEvents(events: SimEvent[]): void {
    if (events.length === 0) return; // nothing happened this frame: no batch, no settings read, no refresh
    const batch: JuiceInput[] = [];
    for (const e of events) { batch.push(e); switch (e.type) {
      case 'shrunk': this.shrunkTo = e.from > e.to ? e.to : null; break; // MEC-001-R4 chip only when the snake shrank
      case 'levelUp': this.onLevelUp(e, batch); break;
      case 'terrainChanged': // MEC-019-R9, FT-8: name only when the template changes
        if (e.newTemplate) this.banners.enqueue({ kind: 'hint', text: t('banner.terrain', { name: e.name }) });
        break;
      case 'hazardIncoming':
        if (e.family === 'fence' || e.family === 'maze' || e.family === 'terrain') this.banners.enqueue({ kind: 'incoming', text: incomingBanner(e.family) });
        break;
      case 'orbSpawned':
        if (!this.orbTipShown && this.bestLevelAtStart < 2) { this.orbTipShown = true; this.banners.tip(t('tip.orb.first')); }
        break;
      case 'skillUsed': this.skills.cast(e.slot); break;   // D3-R23 tap burst on a successful cast
      case 'skillRejected': {
        if (e.reason === 'empty') break;
        this.skills.shake(e.slot);
        this.banners.tip(t(`skill.reject.${e.reason}`, { cost: e.skill ? this.balance.skills[e.skill].cost : 0 }), e.slot);
        break;
      }
      case 'landed': { // MOT-3-R9 the sim event has no coordinates: read the landed cells from the current snapshot
        const s = this.gameScene.snapshot();
        const cells = s ? landedCells(s.hazards, e.hazardType, this.balance.juice.events.landCellsMax) : [];
        if (cells.length) batch.push({ type: 'landedAt', hazardType: e.hazardType, cells });
        break;
      }
      case 'skillUnlocked': { const tip = skillTip(e, t); this.banners.tip(tip.text, tip.slot); break; }
      case 'slotUnlocked': this.banners.tip(t('tip.slotUnlocked')); break;
      case 'mangoStolen': this.banners.tip(t('toast.mangoStolen')); break; // MEC-016 §8 toast
      default: break;
    } }
    this.juice.handleBatch(batch); // U4-4: one buzz per batch (the last haptic wins)
    this.refresh();
  }
  private onLevelUp(e: Extract<SimEvent, { type: 'levelUp' }>, batch: JuiceInput[]): void {
    const cps = this.session.save().unlockedCheckpoints;
    let newCheckpoint: number | null = null;
    if (cps.length > this.cpCount) { // MEC-008 §8 checkpoint banner + first-unlock tip
      newCheckpoint = Math.max(...cps);
      if (this.cpCount === 0) this.banners.tip(t('tip.checkpoint'));
      this.cpCount = cps.length;
      batch.push({ type: 'checkpointUnlocked', level: newCheckpoint }); // P3a-R6
    }
    this.banners.show(levelUpBanners(e, { shrunkTo: this.shrunkTo, newCheckpoint }, this.balance, t));
    this.shrunkTo = null;
    this.readHint();
  }
  /** MEC-008-R11 chip hint: it only changes when a checkpoint is saved (level-up), so it is read here, not every frame. */
  private readHint(): void { this.hint = homeView(this.session.homeModel()).hint; }

  private onOver(s: SimSnapshot): void {
    if (this.leaving) return; // the Quit path already left
    this.goTimer?.remove();
    this.banners.hide();
    if (this.bridge) this.bridge.overlays.countdown(null, null);
    else this.count.hide();
    this.juice.runOver(s.outcome?.won ?? false); // P3a-R7 the death sequence was started by the `died` event; a win waits the same total
  }
  private leave(exit: DeathExit = 'results'): void {
    if (this.leaving) return;
    // GAMEOVER-R5 quick restart goes through Results with `again`, which restarts at once via the proven playAgain path.
    const data = exit === 'again' ? { again: true } : undefined;
    this.leaving = true; goTo(this, 'Results', data, 'quit', { before: () => this.scene.stop('Game') }); // MOT-2-R12
  }
  private toResults(delayMs: number): void {
    if (this.leaving) return;
    this.leaving = true; this.overTimer?.remove();
    this.overTimer = this.time.delayedCall(delayMs, () => { goTo(this, 'Results', undefined, 'quit', { before: () => this.scene.stop('Game') }); }); // MOT-2-R12 delay unchanged
  }
  private toggleSound(): void { // M key (the HUD sound button moved to Settings, P3b-3)
    const on = !this.session.save().settings.sound;
    this.session.setSound(on); this.synth.setOn(on); if (on) this.synth.play('eat');
  }

  update(time: number): void { this.refresh(); this.bottom.tick(time); this.top.tick(time); this.skills.tick(time); }
  private refresh(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    const status = this.gameScene.flow.status, v = hudView(s, this.hint, this.balance, t, status === 'waiting' ? { touch: this.touch } : null);
    const storm = s.biome === 6;
    this.top.apply(v, status === 'paused', status !== 'ready' && status !== 'over', storm);
    this.bottom.apply(v, storm);
    this.skills.apply(v.skills);
    this.banners.setPills(skillPills(s.skills, this.balance, t)); this.banners.setSlowmo(s.slowmo !== null);
    this.debugNext?.c.setVisible(s.level < this.balance.level.maxLevel); this.debugKey?.c.setVisible(nextKeyLevel(s.level, this.balance) !== null);
    const heading = `${s.heading.x},${s.heading.y}`;
    if (heading !== this.heading) { this.pad.setHeading(s.heading); this.heading = heading; }
  }
}
