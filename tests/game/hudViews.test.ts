import { afterEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { BannerLayer } from '../../src/game/hud/BannerLayer';
import { CountdownOverlay } from '../../src/game/hud/CountdownOverlay';
import { PauseOverlay } from '../../src/game/hud/PauseOverlay';
import { pauseView } from '../../src/game/hud/overlayModel';
import { HudTop } from '../../src/game/hud/HudTop';
import { SkillButtons } from '../../src/game/hud/SkillButtons';
import { hudView, type HudSnap } from '../../src/game/hud/hudModel';
import { hudLayout } from '../../src/game/hud/hudLayout';
import { t } from '../../src/game/text';
import { loadBalance } from '../support/balance';
import { sceneHarness } from '../support/scene';

vi.mock('phaser', () => ({ default: { Scene: class {}, Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  Geom: { Rectangle: Object.assign(class { constructor(..._a: number[]) {} }, { Contains: () => false }) } } }));
afterEach(() => vi.unstubAllGlobals());
const b = loadBalance();
const snap = (o: Partial<HudSnap> = {}): HudSnap => ({ level: 7, biome: 2, challenge: false, progress: 3, need: 6, score: 44, energy: 35, energyMax: 100,
  rampActive: false, rampMangoesLeft: 0, startLevel: 1,
  skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: false, active: false, leftMs: 0 }, { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 }], ...o });

it('P3b2-R15 HudTop shows level, biome, quota, score, energy and the checkpoint chip; pause button is enabled only while a run is live', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), pauses: number[] = [];
  const top = new HudTop(h.scene as unknown as Phaser.Scene, hudLayout(false), () => pauses.push(1));
  top.apply(hudView(snap(), { key: 'hud.nextCheckpoint', level: 10 }, b, t), false, true);
  expect(h.find('level').text).toBe('Level 7'); expect(h.find('biome').text).toBe('Rice Paddy');
  expect(h.find('quota-done').text).toBe('3'); expect(h.find('quota-total').text).toBe('/6');
  expect(h.find('score').text).toBe('44'); expect(h.find('energy').text).toBe('35');
  expect(h.find('next-checkpoint').text).toBe('Next checkpoint at L10'); expect(h.find('next-checkpoint').visible).toBe(true);
  h.find('pause-button').emit('pointerdown'); h.find('pause-button').emit('pointerup'); expect(pauses).toEqual([1]);
  top.apply(hudView(snap(), null, b, t), false, false);
  expect(h.find('pause-button').alpha).toBeLessThan(1); expect(h.find('next-checkpoint').visible).toBe(false);
});
it('P3b2-R15 SkillButtons: hidden for empty slots, pointer down casts (MEC-007-R14), off/ready/active drawn differently', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), used: number[] = [];
  const sk = new SkillButtons(h.scene as unknown as Phaser.Scene, hudLayout(false), s => used.push(s), b);
  sk.apply(hudView(snap({ skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: false, active: false, leftMs: 0 },
    { slot: 1, id: null, cost: 0, affordable: false, active: false, leftMs: 0 }] }), null, b, t).skills);
  expect(h.find('skill-0').visible).toBe(true); expect(h.find('skill-1').visible).toBe(false);
  expect(h.find('skill-0-cost').text).toBe('40');
  h.find('skill-0').emit('pointerdown'); expect(used).toEqual([0]);
  const off = JSON.stringify(h.find('skill-0-face').commands);
  sk.apply(hudView(snap(), null, b, t).skills);
  expect(JSON.stringify(h.find('skill-0-face').commands)).toBe(off);   // slot 0 still off
  expect(h.find('skill-1').visible).toBe(true);
  sk.apply(hudView(snap({ skills: [{ slot: 0, id: 'slowmo', cost: 40, affordable: true, active: true, leftMs: 2000 },
    { slot: 1, id: 'tailSnip', cost: 30, affordable: true, active: false, leftMs: 0 }] }), null, b, t).skills);
  expect(JSON.stringify(h.find('skill-0-face').commands)).not.toBe(off);  // active: ring + pressed face
});
it('P3b2-R15 a rejected cast shakes the button and respects reduced motion', () => {
  const h = sceneHarness(); const moves: unknown[] = [];
  h.scene.tweens.add = (v: unknown) => { moves.push(v); };
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const sk = new SkillButtons(h.scene as unknown as Phaser.Scene, hudLayout(false), () => {}, b);
  sk.apply(hudView(snap(), null, b, t).skills); sk.shake(0); expect(moves).toHaveLength(1);
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
  sk.shake(0); expect(moves).toHaveLength(1);
});
it('P3b2-R12 PauseOverlay: Resume / Quit always, Settings only when offered; buttons call back; no marbles text', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), calls: string[] = [];
  const p = new PauseOverlay(h.scene as unknown as Phaser.Scene, { onResume: () => calls.push('resume'), onSettings: () => calls.push('settings'), onQuit: () => calls.push('quit') });
  expect(h.find('overlay').visible).toBe(false);
  p.show(pauseView({ level: 7, biome: 2, hint: { key: 'hud.nextCheckpoint', level: 10 }, settingsAvailable: false }, t));
  expect(h.find('overlay').visible).toBe(true); expect(h.find('overlay-title').text).toBe('Paused');
  expect(h.find('overlay-subtitle').text).toBe('Level 7 · Rice Paddy');
  expect(h.find('overlay-settings').visible).toBe(false);
  for (const n of ['overlay-action', 'overlay-quit']) { h.find(n).emit('pointerdown'); h.find(n).emit('pointerup'); }
  expect(calls).toEqual(['resume', 'quit']);
  p.show(pauseView({ level: 7, biome: 2, hint: null, settingsAvailable: true }, t));
  expect(h.find('overlay-settings').visible).toBe(true);
  h.find('overlay-settings').emit('pointerdown'); h.find('overlay-settings').emit('pointerup'); expect(calls.at(-1)).toBe('settings');
  expect(h.objects.some(o => /marble/i.test(o.text))).toBe(false);
  p.hide(); expect(h.find('overlay').visible).toBe(false);
});
it('P3b2-R12 PauseOverlay locks its buttons while Settings is open and re-enables them on settings-closed (handoff 3)', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), calls: string[] = [];
  const p = new PauseOverlay(h.scene as unknown as Phaser.Scene, { onResume: () => calls.push('resume'), onSettings: () => calls.push('settings'), onQuit: () => calls.push('quit') });
  p.show(pauseView({ level: 7, biome: 2, hint: null, settingsAvailable: true }, t));
  h.find('overlay-settings').emit('pointerdown'); h.find('overlay-settings').emit('pointerup');
  for (const n of ['overlay-action', 'overlay-settings', 'overlay-quit']) expect(h.find(n).input?.enabled).toBe(false);
  h.scene.game.events.emit('settings-closed');
  for (const n of ['overlay-action', 'overlay-settings', 'overlay-quit']) expect(h.find(n).input?.enabled).toBe(true);
  p.show(pauseView({ level: 7, biome: 2, hint: null, settingsAvailable: false }, t));
  expect(h.find('overlay-settings').input?.enabled).toBe(false);   // hidden row stays disabled after a closed event
  h.scene.game.events.emit('settings-closed'); expect(h.find('overlay-settings').input?.enabled).toBe(false);
});
it('P3b2-R13 CountdownOverlay shows the digit and the checkpoint card, hides both', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), c = new CountdownOverlay(h.scene as unknown as Phaser.Scene);
  expect(h.find('countdown').visible).toBe(false);
  c.tick(3, { title: 'Starting at L6', subtitle: 'Speed ramps up over 5 mangoes' });
  expect(h.find('countdown').text).toBe('3'); expect(h.find('countdown').visible).toBe(true);
  expect(h.find('countdown-card-title').text).toBe('Starting at L6'); expect(h.find('countdown-card-title').visible).toBe(true);
  c.tick(2, null); expect(h.find('countdown').text).toBe('2'); expect(h.find('countdown-card-title').visible).toBe(false);
  c.hide(); expect(h.find('countdown').visible).toBe(false);
});
it('P3b2-R10 BannerLayer shows queued cards one after another for ui.bannerMs, then clears', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), layer = new BannerLayer(h.scene as unknown as Phaser.Scene, hudLayout(false), b);
  layer.show([{ kind: 'levelUp', title: 'Level 8', subtitle: 'Fresh start!', chip: 'Your snake shrinks to 4 segments' },
    { kind: 'biome', label: 'BIOME 3', name: 'Frozen Pond', tagline: 'Ice is slippery. Plan your turns.' }]);
  expect(h.find('banner').visible).toBe(true); expect(h.last('banner-title')!.text).toBe('Level 8');
  expect(h.delayed.at(-1)!.delay).toBe(b.ui.bannerMs);
  h.flush();
  expect(h.last('banner-title')!.text).toBe('Frozen Pond'); expect(h.last('banner-label')!.text).toBe('BIOME 3');
  h.flush(); expect(h.find('banner').visible).toBe(false);
});
it('P3b2-R10 a new queue replaces the old one; hide() cancels pending cards', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), layer = new BannerLayer(h.scene as unknown as Phaser.Scene, hudLayout(false), b);
  layer.show([{ kind: 'hint', text: 'Fences unlocked' }, { kind: 'hint', text: 'Second' }]);
  layer.show([{ kind: 'challenge', title: 'Challenge: Rock rain!' }]);
  expect(h.last('banner-title')!.text).toBe('Challenge: Rock rain!');
  layer.hide(); h.flush(); expect(h.find('banner').visible).toBe(false);
});
it('P3b2-R11 tips last tipFactor x bannerMs; pills and the slow-mo tint follow the skill state', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), layer = new BannerLayer(h.scene as unknown as Phaser.Scene, hudLayout(false), b);
  layer.tip('Need 40 energy'); expect(h.find('tip').text).toBe('Need 40 energy'); expect(h.find('tip').visible).toBe(true);
  expect(h.delayed.at(-1)!.delay).toBe(b.ui.bannerMs * b.ui.hud.tipFactor);
  h.flush(); expect(h.find('tip').visible).toBe(false);
  layer.setPills([{ slot: 0, skill: 'slowmo', text: 'Slow-mo · 3 s left' }]);
  expect(h.find('pill-0').text).toBe('Slow-mo · 3 s left'); expect(h.find('pill-0').visible).toBe(true);
  layer.setPills([]); expect(h.find('pill-0').visible).toBe(false);
  layer.setSlowmo(true); expect(h.find('slowmo-tint').visible).toBe(true); layer.setSlowmo(false); expect(h.find('slowmo-tint').visible).toBe(false);
});
it('P3b2-R10 BannerLayer.hide() also hides the tip and kills the pop tween; show() keeps a tip that was just raised', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), killed: unknown[] = [], layer = new BannerLayer(h.scene as unknown as Phaser.Scene, hudLayout(false), b);
  h.scene.tweens.killTweensOf = (v: unknown) => { killed.push(v); };
  layer.tip('Need 40 energy'); layer.show([{ kind: 'hint', text: 'Fences unlocked' }]);
  expect(h.find('tip').visible).toBe(true);
  killed.length = 0; layer.hide();
  expect(h.find('tip').visible).toBe(false); expect(h.find('banner').visible).toBe(false); expect(killed).toContain(h.find('banner'));
});
it('P3b2-R10 setPills redraws a slot only when its content changes (per-frame calls are cheap)', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), layer = new BannerLayer(h.scene as unknown as Phaser.Scene, hudLayout(false), b);
  const text = h.find('pill-0'), set = vi.spyOn(text, 'setText');
  const pills = [{ slot: 0 as const, skill: 'slowmo' as const, text: 'Slow-mo · 3 s left' }];
  layer.setPills(pills); layer.setPills([...pills]); layer.setPills([...pills]);
  expect(set).toHaveBeenCalledTimes(1);
  layer.setPills([{ ...pills[0]!, text: 'Slow-mo · 2 s left' }]); expect(set).toHaveBeenCalledTimes(2);
  layer.setPills([]); expect(text.visible).toBe(false); layer.setPills(pills); expect(set).toHaveBeenCalledTimes(3);
});
it('P3b2-R15 HudTop redraws the pause icon only when paused or enabled changes', () => {
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  const h = sceneHarness(), top = new HudTop(h.scene as unknown as Phaser.Scene, hudLayout(false), () => {});
  const clear = vi.spyOn(h.find('pause-button').list[0]!, 'clear'), v = hudView(snap(), null, b, t);
  top.apply(v, false, true); top.apply(v, false, true); top.apply(v, false, true);
  expect(clear).toHaveBeenCalledTimes(1);
  top.apply(v, true, true); expect(clear).toHaveBeenCalledTimes(2);
  top.apply(v, true, false); expect(clear).toHaveBeenCalledTimes(3); expect(h.find('pause-button').alpha).toBeLessThan(1);
});
