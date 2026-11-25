import { describe, expect, it } from 'vitest';
import { JuicePlayer, type JuiceDeps } from '../../src/game/juice/JuicePlayer';
import type { BoardVisual, ScreenVisual } from '../../src/game/juice/types';
import { loadBalance } from '../support/balance';
const b = loadBalance(), j = b.juice;
function make(over: Partial<JuiceDeps> = {}, reduced = false) {
  const timers: { ms: number; at: number; fn: () => void; removed: boolean }[] = [];
  let now = 0; // cumulative clock: later(ms) fires at now + ms, like Phaser's time.delayedCall
  const log = { play: [] as string[], buzz: [] as unknown[], board: [] as string[], screen: [] as string[], card: [] as string[], done: 0, skip: null as null | ((exit?: 'again' | 'results') => void) };
  const deps: JuiceDeps = {
    balance: b, synth: { play: n => { log.play.push(n); }, buzz: p => { log.buzz.push(p); } },
    board: { playBoardFx: l => log.board.push(...l.map(v => v.kind)) }, screen: { play: v => { log.screen.push(v.kind); } },
    settings: () => ({ sound: true, haptics: true }), reduced: () => reduced, seed: () => 7,
    makeCard: () => ({ show: l => { log.card.push(l); }, armSkip: cb => { log.skip = cb; }, destroy: () => { log.card.push('destroyed'); } }),
    later: (ms, fn) => { const t = { ms, at: now + ms, fn, removed: false }; timers.push(t); return { remove: () => { t.removed = true; } }; },
    onDone: () => { log.done++; }, ...over };
  const run = (ms: number) => timers.filter(t => t.ms === ms && !t.removed).forEach(t => t.fn());
  /** Advance the clock to absolute time `to`, firing due timers in order (timers they schedule fire too). */
  const advance = (to: number) => {
    for (;;) {
      const due = timers.filter(t => !t.removed && t.at <= to).sort((a, c) => a.at - c.at)[0];
      if (!due) break;
      now = due.at; due.removed = true; due.fn();
    }
    now = to;
  };
  return { p: new JuicePlayer(deps), log, timers, run, advance };
}
describe('P3a player', () => {
  it('P3a-R1 eat plays sound, haptic, board and screen visuals from one cue', () => {
    const m = make(); m.p.handle({ type: 'ate', x: 1, y: 1, golden: false, points: 1, progressGain: 1, source: 'mango' });
    expect(m.log.play).toEqual(['eat']); expect(m.log.buzz).toEqual([12]);
    expect(m.log.board).toEqual(['burst', 'floatText', 'gulp']); expect(m.log.screen).toEqual(['barBump']);
  });
  it('P3a-R9 settings are read per event', () => {
    let s = { sound: false, haptics: false };
    const m = make({ settings: () => s });
    m.p.handle({ type: 'orbEaten', x: 1, y: 1, gained: 15 }); expect(m.log.play).toEqual([]); expect(m.log.buzz).toEqual([]);
    s = { sound: true, haptics: true }; m.p.handle({ type: 'orbEaten', x: 1, y: 1, gained: 15 }); expect(m.log.play).toEqual(['orb']);
  });
  it('P3a-R6 batch: only the last haptic of a batch is buzzed', () => {
    const m = make(); m.p.handleBatch([{ type: 'levelUp', level: 3, biome: 0, biomeChanged: false } as never, { type: 'checkpointUnlocked', level: 3 }]);
    expect(m.log.buzz).toEqual([j.haptics.checkpointMs]); expect(m.log.play).toEqual(['level', 'checkpoint']);
  });
  it('P3a-R7 death: card at cardInMs, then waits for a tap (no auto-advance to Results)', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'fence', x: 1, y: 1 });
    expect(m.log.play).toEqual(['die']); expect(m.log.board).toContain('shake'); expect(m.log.screen).toEqual(['deathFlash']);
    expect(m.timers.map(t => t.ms)).toEqual([j.death.cardInMs]);
    m.run(j.death.cardInMs); expect(m.log.card.length).toBe(1);
    m.advance(60_000); expect(m.log.done).toBe(0);
  });
  it('P3a-R7 skip arms exactly at cardInMs + skipLockMs (normal and reduced)', () => {
    for (const reduced of [false, true]) {
      const m = make({}, reduced); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
      const armAt = j.death.cardInMs + j.death.skipLockMs;
      m.advance(armAt - 1); expect(m.log.skip, `reduced=${reduced} early`).toBeNull();
      m.advance(armAt); expect(m.log.skip, `reduced=${reduced} armed`).not.toBeNull();
      expect(m.log.done).toBe(0);
    }
  });
  it('P3a-R7 the run-over event right after a death does not start a second timer', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 }); const n = m.timers.length;
    m.p.runOver(false); expect(m.timers.length).toBe(n);
  });
  it('P3a-R7 tap skips: once armed, the skip leaves immediately and exactly once', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
    m.advance(j.death.cardInMs + j.death.skipLockMs); // lock timer arms the skip
    m.log.skip?.(); m.log.skip?.(); expect(m.log.done).toBe(1);
    m.run(j.death.totalMs); expect(m.log.done).toBe(1);
  });
  it('GAMEOVER-R5 the chosen exit (again / results) reaches onDone once', () => {
    for (const exit of ['again', 'results'] as const) {
      const exits: string[] = [];
      const m = make({ onDone: e => { exits.push(e); } }); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
      m.advance(j.death.cardInMs + j.death.skipLockMs);
      m.log.skip?.(exit); m.log.skip?.(exit); expect(exits).toEqual([exit]);
    }
  });
  it('P3a-R8 reduced motion: no shake, card still waits for a tap', () => {
    const m = make({}, true); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
    expect(m.log.board).not.toContain('shake'); m.advance(60_000); expect(m.log.done).toBe(0);
  });
  it('a win (no death) goes to Results after the total time without a card', () => {
    const m = make(); m.p.runOver(true); expect(m.timers.map(t => t.ms)).toEqual([j.death.totalMs]);
    m.run(j.death.totalMs); expect(m.log.done).toBe(1); expect(m.log.card).toEqual([]);
  });
  it('destroy cancels pending timers', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 }); m.p.destroy();
    m.run(j.death.totalMs); expect(m.log.done).toBe(0);
  });
});

describe('MOT-3 JuicePlayer', () => {
  const cast = { type: 'skillUsed', slot: 1, skill: 'shield', level: 3, energyBefore: 90, energyAfter: 40 } as const;
  it('MOT-3-R6 the shield slot of the last cast is used by the later shield break (even in a later batch)', () => {
    const seen: ScreenVisual[] = [];
    const m = make({ screen: { play: v => { seen.push(v); } } });
    m.p.handleBatch([cast]); seen.length = 0;
    m.p.handleBatch([{ type: 'shieldBroke', x: 1, y: 1, family: 'rock' }]);
    expect(seen).toEqual([{ kind: 'iconPop', slot: 1, color: 'shield', scale: j.skill.iconPopScale, ms: j.skill.iconPopMs }]);
  });
  it('MOT-3-R6 a break with no remembered cast plays no icon pop', () => {
    const seen: ScreenVisual[] = [];
    make({ screen: { play: v => { seen.push(v); } } }).p.handleBatch([{ type: 'shieldBroke', x: 1, y: 1, family: 'rock' }]);
    expect(seen).toEqual([]);
  });
  it('MOT-3-R8 the head burst uses headCell(); a null head skips it', () => {
    const seen: BoardVisual[] = [];
    const won = { type: 'runWon', score: 1, timeMs: 1 } as const;
    make({ board: { playBoardFx: l => { seen.push(...l); } }, headCell: () => ({ x: 7, y: 8 }) }).p.handleBatch([won]);
    expect(seen.filter(v => v.kind === 'burst').length).toBe(5); expect(seen[1]).toMatchObject({ kind: 'burst', x: 7, y: 8, color: 'gold' });
    seen.length = 0;
    make({ board: { playBoardFx: l => { seen.push(...l); } }, headCell: () => null }).p.handleBatch([won]);
    expect(seen.filter(v => v.kind === 'burst').length).toBe(4);
  });
  it('MOT-3 one level-bar bump per batch: rampEnded + levelUp', () => {
    const m = make();
    m.p.handleBatch([{ type: 'rampEnded', level: 3 }, { type: 'levelUp', level: 3, biome: 0, biomeChanged: false } as never]);
    expect(m.log.screen.filter(k => k === 'barBump').length).toBe(1);
  });
  it('MOT-3-R9/R12 derived inputs enter through handleBatch like any event', () => {
    const m = make();
    m.p.handleBatch([{ type: 'turned', dx: 1, dy: 0 }, { type: 'landedAt', hazardType: 'rock', cells: [{ x: 1, y: 1 }] }, { type: 'mangoSpawned', x: 2, y: 2, golden: false }]);
    expect(m.log.board).toEqual(['turnTilt', 'burst', 'shake', 'burst']);
  });
});
