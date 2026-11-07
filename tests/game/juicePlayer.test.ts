import { describe, expect, it } from 'vitest';
import { JuicePlayer, type JuiceDeps } from '../../src/game/juice/JuicePlayer';
import { loadBalance } from '../support/balance';
const b = loadBalance(), j = b.juice;
function make(over: Partial<JuiceDeps> = {}, reduced = false) {
  const timers: { ms: number; fn: () => void; removed: boolean }[] = [];
  const log = { play: [] as string[], buzz: [] as unknown[], board: [] as string[], screen: [] as string[], card: [] as string[], done: 0, skip: null as null | (() => void) };
  const deps: JuiceDeps = {
    balance: b, synth: { play: n => { log.play.push(n); }, buzz: p => { log.buzz.push(p); } },
    board: { playBoardFx: l => log.board.push(...l.map(v => v.kind)) }, screen: { play: v => { log.screen.push(v.kind); } },
    settings: () => ({ sound: true, haptics: true }), reduced: () => reduced, seed: () => 7,
    makeCard: () => ({ show: l => { log.card.push(l); }, armSkip: cb => { log.skip = cb; }, destroy: () => { log.card.push('destroyed'); } }),
    later: (ms, fn) => { const t = { ms, fn, removed: false }; timers.push(t); return { remove: () => { t.removed = true; } }; },
    onDone: () => { log.done++; }, ...over };
  const run = (ms: number) => timers.filter(t => t.ms === ms && !t.removed).forEach(t => t.fn());
  return { p: new JuicePlayer(deps), log, timers, run };
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
  it('P3a-R7 death: card at cardInMs, Results at totalMs, within 1.5 s', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'fence', x: 1, y: 1 });
    expect(m.log.play).toEqual(['die']); expect(m.log.board).toContain('shake'); expect(m.log.screen).toEqual(['deathFlash']);
    expect(m.timers.map(t => t.ms).sort((a, c) => a - c)).toEqual([j.death.cardInMs, j.death.totalMs]);
    m.run(j.death.cardInMs); expect(m.log.card.length).toBe(1); expect(m.log.card[0]).toMatch(/\S/);
    m.run(j.death.totalMs); expect(m.log.done).toBe(1); expect(j.death.totalMs).toBeLessThanOrEqual(1500);
  });
  it('P3a-R7 the run-over event right after a death does not start a second timer', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 }); const n = m.timers.length;
    m.p.runOver(false); expect(m.timers.length).toBe(n);
  });
  it('P3a-R7 tap skips: once armed, the skip leaves immediately and exactly once', () => {
    const m = make(); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
    m.run(j.death.cardInMs); m.run(j.death.cardInMs + j.death.skipLockMs); // lock timer arms the skip
    m.log.skip?.(); m.log.skip?.(); expect(m.log.done).toBe(1);
    m.run(j.death.totalMs); expect(m.log.done).toBe(1);
  });
  it('P3a-R8 reduced motion: no shake, no card timing change beyond the reduced total', () => {
    const m = make({}, true); m.p.handle({ type: 'died', cause: 'wall', x: 0, y: 0 });
    expect(m.log.board).not.toContain('shake'); expect(m.timers.map(t => t.ms)).toContain(j.reduced.deathTotalMs);
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
