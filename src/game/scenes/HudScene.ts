import Phaser from 'phaser';
import { nextKeyLevel } from '../../core';
import type { Balance, SimEvent, SimSnapshot } from '../../core';
import type { Session } from '../../session';
import { createSynth, type Synth } from '../audio/synth';
import { isDebug } from '../flow/debugFlag';
import { homeView } from '../flow/homeModel';
import { flowPause, flowResume, flowTogglePause, type FlowEffect } from '../flow/runFlow';
import { SETTINGS_CLOSED } from '../flow/settingsView';
import { BannerLayer } from '../hud/BannerLayer';
import { levelUpBanners, skillPills, skillTip } from '../hud/banners';
import { CountdownOverlay } from '../hud/CountdownOverlay';
import { HudTop } from '../hud/HudTop';
import { hudLayout, HUD_MOCK, type HudLayout } from '../hud/hudLayout';
import { hudView } from '../hud/hudModel';
import { countdownCard, pauseView } from '../hud/overlayModel';
import { PauseOverlay } from '../hud/PauseOverlay';
import { SkillButtons } from '../hud/SkillButtons';
import { createDpad } from '../input/dpad';
import { DeathCard } from '../juice/DeathCard';
import { deathSeed } from '../juice/deathLine';
import { colorOf } from '../juice/colors';
import { JuicePlayer } from '../juice/JuicePlayer';
import { ScreenFx } from '../juice/ScreenFx';
import type { JuiceInput } from '../juice/types';
import { acceptSkillInput, skillSlotForKey } from '../input/skillKeys';
import { BOARD, cellPx, WIDTH } from '../layout';
import { currentPalette, reduceMotion } from '../render/palette';
import { runStartLines } from '../hudText';
import { FONT_UI, TOKENS } from '../uiTokens';
import { pillButton } from '../ui/widgets';
import { ui } from '../ui/layout';
import { incomingBanner, t, TEXT } from '../text';
import type { GameScene } from './GameScene';

type HudHint = ReturnType<typeof homeView>['hint'];
// Mockup px of the wait hint and the ?debug=1 buttons (not in the D2 mockups).
const M = { waitHint: 22, debugNextW: 56, debugKeyW: 70 } as const;

// P3b-2: wiring only. Models in src/game/hud/*, views draw them; this scene owns events, sounds, haptics, flow and session calls.
export class HudScene extends Phaser.Scene {
  private gameScene!: GameScene; private session!: Session; private balance!: Balance; private synth!: Synth;
  private top!: HudTop; private skills!: SkillButtons; private pause!: PauseOverlay; private count!: CountdownOverlay; private banners!: BannerLayer;
  private pad!: ReturnType<typeof createDpad>; private waitHint!: Phaser.GameObjects.Text;
  private heading = ''; private hint: HudHint = null; private cpCount = 0; private bestLevelAtStart = 0; private orbTipShown = false; private leaving = false; private juice!: JuicePlayer;
  private haptics = true; private startBanner: string[] = []; private shrunkTo: number | null = null; private overTimer?: Phaser.Time.TimerEvent;
  private debugKey: { c: Phaser.GameObjects.Container } | null = null; private debugNext: { c: Phaser.GameObjects.Container } | null = null;

  constructor() { super('Hud'); }

  create(): void {
    this.gameScene = this.scene.get('Game') as GameScene;
    this.session = this.registry.get('session') as Session; this.balance = this.registry.get('balance') as Balance;
    const save = this.session.save(), layout = hudLayout(true); // pad geometry always computed; visibility follows settings.dpad
    this.cpCount = save.unlockedCheckpoints.length; this.bestLevelAtStart = save.bestLevel; this.readHint();
    this.orbTipShown = false; this.leaving = false; this.heading = ''; this.shrunkTo = null;
    this.synth = createSynth(); this.synth.unlock();
    this.input.setGlobalTopOnly(true);
    this.top = new HudTop(this, layout, () => this.gameScene.apply(flowTogglePause(this.gameScene.flow, this.balance)));
    this.skills = new SkillButtons(this, layout, slot => this.useSkill(slot), this.balance);
    this.createDebugButtons(layout); // created before the banner layer and overlays so those sit above them
    this.pad = createDpad(this, layout.dpad!, d => this.gameScene.turn(d.x, d.y)); // MEC-001-R2: a turn during the countdown counts
    this.banners = new BannerLayer(this, layout, this.balance);
    const hud = { point: (t: Parameters<HudTop['point']>[0]) => this.top.point(t), skillPoint: (s: 0 | 1) => this.skills.point(s),
      bump: (t: Parameters<HudTop['bump']>[0], k: number, ms: number) => this.top.bump(t, k, ms), plantFlag: (_level: number, ms: number) => this.top.plantFlag(ms) };
    this.juice = new JuicePlayer({ // P3a-R1..R9: sounds, haptics (through the gated buzz), board / screen visuals and the death sequence
      balance: this.balance, synth: { play: n => this.synth.play(n), buzz: p => this.buzz(p) }, board: this.gameScene,
      screen: new ScreenFx(this, hud, id => colorOf(id, currentPalette()), cellPx(this.balance), this.balance.juice.perf, this.balance.juice.skill.iconRingScale),
      settings: () => this.session.save().settings, reduced: reduceMotion,
      seed: () => { const s = this.gameScene.snapshot(); return s ? deathSeed(s.score, s.level, s.timeMs) : 0; },
      makeCard: () => new DeathCard(this, this.balance, reduceMotion()), later: (ms, fn) => this.time.delayedCall(ms, fn), onDone: () => this.leave() });
    this.waitHint = this.add.text(WIDTH / 2, BOARD.y + BOARD.size / 2, this.sys.game?.device?.input?.touch ? TEXT.waitHintTouch : TEXT.waitHintKeys,
      { fontFamily: FONT_UI, fontSize: `${ui(M.waitHint)}px`, fontStyle: '800', color: TOKENS.text.primary, align: 'center' })
      .setName('wait-hint').setOrigin(0.5).setVisible(false);
    this.count = new CountdownOverlay(this);
    this.pause = new PauseOverlay(this, {
      onResume: () => { this.applySettings(); this.gameScene.apply(flowResume(this.gameScene.flow, this.balance)); },
      onSettings: () => this.scene.launch('Settings', { overlay: true }),
      onQuit: () => { this.session.quit(); this.toResults(0); }, // MEC-003-R20, MEC-008-R6
    });
    this.applySettings();
    const flow = (e: FlowEffect): void => this.onFlow(e), events = (e: SimEvent[]): void => this.onEvents(e), over = (s: SimSnapshot): void => this.onOver(s);
    const toggle = (): void => this.toggleSound(), pause = (): void => this.gameScene.apply(flowPause(this.gameScene.flow));
    const hidden = (): void => { if (document.hidden) { pause(); this.session.hidden(); } };
    const reread = (): void => { this.applySettings(); this.refresh(); }; // handoff 3: settings changed in the overlay
    const keys = this.input.keyboard;
    const onKey = (e: KeyboardEvent): void => { // MEC-007-R14/R15; the Settings overlay owns the keyboard while open (handoff 1)
      if (this.scene.isActive('Settings')) return;
      const slot = skillSlotForKey(e.code, e.repeat); if (slot === null) return;
      e.preventDefault(); this.useSkill(slot);
    };
    this.gameScene.events.on('flow', flow); this.gameScene.events.on('sim-events', events);
    this.gameScene.events.on('run-over', over); this.gameScene.events.on('toggle-sound', toggle);
    this.game.events.on(SETTINGS_CLOSED, reread);
    keys?.on('keydown', onKey); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gameScene.events.off('flow', flow); this.gameScene.events.off('sim-events', events);
      this.gameScene.events.off('run-over', over); this.gameScene.events.off('toggle-sound', toggle);
      this.game.events.off(SETTINGS_CLOSED, reread);
      keys?.off('keydown', onKey); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
      this.overTimer?.remove(); this.juice.destroy(); this.banners.hide();
    });
    this.refresh(); this.showRunStart();
  }

  /** Settings that can change while paused (Settings overlay, P3b-3): sound, haptics and D-pad. Read on create, Resume and settings-closed. */
  private applySettings(): void {
    const s = this.session.save().settings;
    this.synth.setOn(s.sound); this.haptics = s.haptics; this.pad.setVisible(s.dpad);
  }
  /** Handoff 2: every vibration goes through the haptics setting. */
  private buzz(pattern: number | number[]): void { if (this.haptics) this.synth.buzz(pattern); }
  private settingsAvailable(): boolean { const s = this.scene.get('Settings'); return s !== null && s !== undefined; }

  // MEC-003 §8 run-start banner (challenge level at run start). Hud is (re)launched once per run start, after Game emitted newRun.
  // Held until the countdown's 'go' so the card does not sit under the digit and expire during the countdown.
  private showRunStart(): void { this.startBanner = runStartLines(this.gameScene.snapshot() ?? { level: 0, challenge: false }, t); }
  private flushRunStart(): void {
    if (this.startBanner.length) this.banners.show(this.startBanner.map(title => ({ kind: 'challenge' as const, title })));
    this.startBanner = [];
  }

  // MEC-003-R21 ?debug=1 only: "+1" and "Key" jump through the normal level-up path; the run becomes a debug run.
  private createDebugButtons(l: HudLayout): void {
    this.debugKey = this.debugNext = null;
    if (typeof window === 'undefined' || !isDebug(window.location?.search ?? '')) return;
    const skip = (key: boolean): void => {
      if (!acceptSkillInput(this.gameScene.flow.status)) return;
      const cur = this.gameScene.snapshot()?.level; if (cur === undefined) return;
      const to = key ? nextKeyLevel(cur, this.balance) : cur + 1;
      if (to !== null && to <= this.balance.level.maxLevel) this.session.debugSkipTo(to);
    };
    const y = l.chip.y + l.chip.h / 2, side = ui(HUD_MOCK.sidePad);
    this.debugNext = pillButton(this, side + ui(M.debugNextW) / 2, y, M.debugNextW, HUD_MOCK.chip, '+1', 'debug-next', () => skip(false), 'cream');
    this.debugKey = pillButton(this, WIDTH - side - ui(M.debugKeyW) / 2, y, M.debugKeyW, HUD_MOCK.chip, 'Key ▶', 'debug-key', () => skip(true), 'cream');
  }
  private useSkill(slot: 0 | 1): void { if (acceptSkillInput(this.gameScene.flow.status)) this.session.useSkill(slot); } // MEC-007-R15

  private onFlow(effect: FlowEffect): void {
    switch (effect.type) {
      case 'newRun': this.overTimer?.remove(); this.banners.hide(); this.synth.unlock(); this.showRunStart(); break; // MEC-003 §8
      case 'hideOverlay': this.pause.hide(); this.count.hide(); this.waitHint.setVisible(false); break;
      case 'showPaused': this.count.hide(); this.waitHint.setVisible(false); this.showPause(); break;
      case 'tick': {
        const s = this.gameScene.snapshot();
        this.count.tick(effect.n, s ? countdownCard(s, !this.gameScene.flow.started, this.balance, t) : null); this.synth.play('tick'); break;
      }
      case 'go': this.count.hide(); this.waitHint.setVisible(this.gameScene.flow.status === 'waiting'); this.synth.play('go'); this.flushRunStart(); break; // MEC-001-R2
      case 'begin': this.waitHint.setVisible(false); break;
    }
    this.refresh();
  }
  private showPause(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    this.pause.show(pauseView({ level: s.level, biome: s.biome, hint: homeView(this.session.homeModel()).hint, settingsAvailable: this.settingsAvailable() }, t));
  }

  // P1 HUD event mapping (MEC-003/006/007/008 §8) with the P3b-2 banner/tip views. Sounds, haptics and visuals come from the JuicePlayer (P3a).
  private onEvents(events: SimEvent[]): void {
    if (events.length === 0) return; // nothing happened this frame: no batch, no settings read, no refresh
    const batch: JuiceInput[] = [];
    for (const e of events) { batch.push(e); switch (e.type) {
      case 'shrunk': this.shrunkTo = e.from > e.to ? e.to : null; break; // MEC-001-R4 chip only when the snake shrank
      case 'levelUp': this.onLevelUp(e, batch); break;
      case 'hazardIncoming':
        if (e.family === 'fence' || e.family === 'maze' || e.family === 'terrain') this.banners.tip(incomingBanner(e.family));
        break;
      case 'orbSpawned':
        if (!this.orbTipShown && this.bestLevelAtStart < 2) { this.orbTipShown = true; this.banners.tip(t('tip.orb.first')); }
        break;
      case 'skillRejected': {
        if (e.reason === 'empty') break;
        this.skills.shake(e.slot);
        this.banners.tip(t(`skill.reject.${e.reason}`, { cost: e.skill ? this.balance.skills[e.skill].cost : 0 }));
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
    this.banners.hide(); this.count.hide(); this.waitHint.setVisible(false);
    this.juice.runOver(s.outcome?.won ?? false); // P3a-R7 the death sequence was started by the `died` event; a win waits the same total
  }
  private leave(): void {
    if (this.leaving) return;
    this.leaving = true; this.scene.stop('Game'); this.scene.start('Results');
  }
  private toResults(delayMs: number): void {
    if (this.leaving) return;
    this.leaving = true; this.overTimer?.remove();
    this.overTimer = this.time.delayedCall(delayMs, () => { this.scene.stop('Game'); this.scene.start('Results'); });
  }
  private toggleSound(): void { // M key (the HUD sound button moved to Settings, P3b-3)
    const on = !this.session.save().settings.sound;
    this.session.setSound(on); this.synth.setOn(on); if (on) this.synth.play('eat');
  }

  update(): void { this.refresh(); }
  private refresh(): void {
    const s = this.gameScene.snapshot(); if (!s) return;
    const status = this.gameScene.flow.status, v = hudView(s, this.hint, this.balance, t);
    this.top.apply(v, status === 'paused', status !== 'ready' && status !== 'over');
    this.skills.apply(v.skills);
    this.banners.setPills(skillPills(s.skills, this.balance, t)); this.banners.setSlowmo(s.slowmo !== null);
    this.debugNext?.c.setVisible(s.level < this.balance.level.maxLevel); this.debugKey?.c.setVisible(nextKeyLevel(s.level, this.balance) !== null);
    const heading = `${s.heading.x},${s.heading.y}`;
    if (heading !== this.heading) { this.pad.setHeading(s.heading); this.heading = heading; }
  }
}
