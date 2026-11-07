import type { Balance, SkillId } from '../../core';
import type { SfxName } from '../audio/synth';
import type { BoardVisual, ColorId, JuiceCtx, JuiceCue, JuiceInput, ScreenVisual } from './types';

const SKILL_SFX: Record<SkillId, SfxName> = { slowmo: 'skillSlowmo', tailSnip: 'skillSnip', shield: 'skillShield', mangoRain: 'skillRain' };
const SKILL_COLOR: Record<SkillId, ColorId> = { slowmo: 'slowmo', tailSnip: 'tailSnip', shield: 'shield', mangoRain: 'mangoRain' };

export interface DeathTimeline { shakeMs: number; flashMs: number; cardInMs: number; totalMs: number; skipLockMs: number }
/** P3a-R7 death sequence timing; total <= 1.5 s is enforced by parseBalance. */
export function deathTimeline(b: Balance, reduced: boolean): DeathTimeline {
  const d = b.juice.death, r = b.juice.reduced;
  return { shakeMs: reduced ? 0 : d.shakeMs, flashMs: reduced ? r.softMs : d.flashMs, cardInMs: d.cardInMs,
    totalMs: reduced ? r.deathTotalMs : d.totalMs, skipLockMs: d.skipLockMs };
}
/** P3a-R8 banner entrance: slide + scale normally, a soft fade when reduced. */
export function bannerMotion(b: Balance, reduced: boolean): { inMs: number; slidePx: number; scaleFrom: number } {
  const n = b.juice.banner;
  return reduced ? { inMs: b.juice.reduced.softMs, slidePx: 0, scaleFrom: 1 } : { inMs: n.inMs, slidePx: n.slidePx, scaleFrom: n.scaleFrom };
}
/** P3a-R11 drop the oldest items so `list.length <= max`. */
export function trimOldest<T>(list: T[], max: number): void { if (list.length > max) list.splice(0, list.length - max); }

// P3a-R1..R9 one event -> one cue; reduced motion and settings are applied here so they are unit-tested.
export function mapJuice(ev: JuiceInput, ctx: JuiceCtx): JuiceCue {
  const j = ctx.balance.juice, r = ctx.reduced, cap = j.reduced.flashAlphaMax, soft = j.reduced.softMs;
  const cue: JuiceCue = { board: [], screen: [], sounds: [], haptic: null, death: null };
  const board = (v: BoardVisual): void => { cue.board.push(v); };
  const screen = (v: ScreenVisual): void => { cue.screen.push(v); };
  const burst = (x: number, y: number, color: ColorId, key: keyof typeof j.bursts): void => {
    if (!r) board({ kind: 'burst', x, y, color, ...j.bursts[key] });
  };
  switch (ev.type) {
    case 'ate': // P3a-R1
      burst(ev.x, ev.y, ev.golden ? 'gold' : 'food', ev.golden ? 'golden' : 'eat');
      board({ kind: 'floatText', x: ev.x, y: ev.y, points: ev.points, big: ev.golden });
      if (!r) { board({ kind: 'gulp' }); screen({ kind: 'barBump', target: 'score', scale: j.barBump.scale, ms: j.barBump.ms }); }
      cue.sounds = [ev.golden ? 'golden' : 'eat']; cue.haptic = j.haptics.eatMs; break;
    case 'orbEaten': // P3a-R2
      if (!r) {
        screen({ kind: 'sparks', from: { x: ev.x, y: ev.y }, count: j.orb.sparkCount, ms: j.orb.sparkMs, staggerMs: j.orb.sparkStaggerMs, color: 'orb' });
        screen({ kind: 'barBump', target: 'energyBar', scale: j.orb.barBumpScale, ms: j.barBump.ms });
      }
      cue.sounds = ['orb']; cue.haptic = j.haptics.orbMs; break;
    case 'skillUsed': { // P3a-R3 (Slow-mo tint is drawn by the board and HUD layers, U2-2)
      const color = SKILL_COLOR[ev.skill];
      if (!r) {
        screen({ kind: 'flash', color, alpha: j.skill.flashAlpha, ms: j.skill.flashMs });
        screen({ kind: 'iconPop', slot: ev.slot, color, scale: j.skill.iconPopScale, ms: j.skill.iconPopMs });
      }
      if (ev.skill === 'shield') board({ kind: 'tint', color, alpha: j.skill.tintAlpha, fadeMs: j.skill.tintFadeMs, ms: ctx.balance.skills.shield.durationMs });
      cue.sounds = [SKILL_SFX[ev.skill]]; cue.haptic = j.haptics.castMs; break;
    }
    case 'skillEnded': if (ev.skill === 'shield') board({ kind: 'tintEnd', fadeMs: j.skill.tintFadeMs }); break;
    case 'skillRejected': if (ev.reason !== 'empty') cue.sounds = ['nope']; break;
    case 'levelUp': // P3a-R4 / P3a-R5
      if (!r) board({ kind: 'snakePop', ms: j.level.popMs });
      board({ kind: 'levelGlow', alpha: r ? cap : j.level.glowAlpha, ms: r ? soft : j.level.glowMs });
      if (ev.biomeChanged) board({ kind: 'biomeSweep', biome: ev.biome, alpha: r ? cap : j.biome.sweepAlpha, ms: r ? soft : j.biome.sweepMs, sweep: !r });
      if (!r) screen({ kind: 'barBump', target: 'levelBar', scale: j.barBump.scale, ms: j.barBump.ms });
      cue.sounds = [ev.biomeChanged ? 'biome' : 'level'];
      cue.haptic = ev.biomeChanged ? j.haptics.biomeMs : j.haptics.level; break;
    case 'checkpointUnlocked': // P3a-R6 (derived by the player from save growth; not a sim event)
      screen({ kind: 'flagPlant', level: ev.level, ms: r ? 0 : j.checkpoint.flagMs });
      cue.sounds = ['checkpoint']; cue.haptic = j.haptics.checkpointMs; break;
    case 'died': // P3a-R7 X eyes are the capy's own dead pose (GameScene)
      burst(ev.x, ev.y, 'snake', 'death');
      if (!r) board({ kind: 'shake', amplitudePx: j.death.shakePx, ms: j.death.shakeMs });
      screen({ kind: 'deathFlash', alpha: r ? cap : j.death.flashAlpha, ms: r ? soft : j.death.flashMs, vignette: !r });
      cue.sounds = ['die']; cue.haptic = j.haptics.deathMs; cue.death = { cause: ev.cause }; break;
    case 'rotted': burst(ev.x, ev.y, 'rock', 'rot'); cue.sounds = ['rot']; break;
    case 'dust': burst(ev.x, ev.y, 'rock', 'dust'); break;
    case 'landed': cue.sounds = ['land']; break;
    case 'rampEnded': cue.sounds = ['go']; break;
    case 'shieldBroke': cue.sounds = ['shieldBreak']; break;
    case 'skillUnlocked': cue.sounds = ['unlock']; break;
    case 'runWon': cue.sounds = ['biome']; break;
    default: break;
  }
  if (!ctx.sound) cue.sounds = [];     // P3a-R9
  if (!ctx.haptics) cue.haptic = null; // P3a-R9
  return cue;
}
