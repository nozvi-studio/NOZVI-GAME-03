// tests/game/runFlow.test.ts
import { describe, expect, it } from 'vitest';
import { createFlow, flowKey, flowPause, flowResume, flowStart, flowTick, flowTurn, flowOver } from '../../src/game/flow/runFlow';
import { acceptSkillInput } from '../../src/game/input/skillKeys';
import { loadBalance } from '../support/balance';

const b = loadBalance();
describe('GDD-13 run flow (L651–700, L721–729, L988–994)', () => {
  it('GDD-13 start from ready: new run, overlay hidden, countdown 1500', () => {
    const f = createFlow();
    expect(flowStart(f, b)).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f).toEqual({ status: 'countdown', countLeftMs: 1500, lastCount: 0, started: false });
  });
  it('GDD-13 countdown ticks 3, 2, 1 then go', () => {
    const f = createFlow(); flowStart(f, b);
    expect(flowTick(f, b, 16)).toEqual([{ type: 'tick', n: 3 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 2 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 1 }]);
    expect(flowTick(f, b, 484)).toEqual([{ type: 'go' }]);
    expect(f.status).toBe('waiting');
  });
  it('P1 runFlow: a turn in ready no longer starts a countdown', () => {
    const f = createFlow();
    expect(flowTurn(f, b)).toEqual({ forward: false, effects: [] });
    expect(f.status).toBe('ready');
  });
  it('GDD-13 a turn in countdown is forwarded; in paused it is dropped', () => {
    const f = createFlow(); flowStart(f, b);
    expect(flowTurn(f, b)).toEqual({ forward: true, effects: [] });
    flowPause(f);
    expect(flowTurn(f, b)).toEqual({ forward: false, effects: [] });
  });
  it('GDD-13 keys: P/Esc/Space pause and resume; only Space starts from ready/over', () => {
    const f = createFlow();
    expect(flowKey(f, b, 'KeyP')).toEqual([]); expect(f.status).toBe('ready');
    expect(flowKey(f, b, 'Space')[0]).toEqual({ type: 'newRun' });
    expect(flowKey(f, b, 'Escape')).toEqual([{ type: 'showPaused' }]); expect(f.status).toBe('paused');
    expect(flowKey(f, b, 'KeyP')).toEqual([{ type: 'hideOverlay' }]); expect(f.status).toBe('countdown');
    flowOver(f); expect(flowKey(f, b, 'Escape')).toEqual([]);
  });
  it('GDD-13 resume runs a new countdown', () => {
    const f = createFlow(); flowStart(f, b); flowTick(f, b, 1500); flowPause(f);
    expect(flowResume(f, b)).toEqual([{ type: 'hideOverlay' }]);
    expect(f).toEqual({ status: 'countdown', countLeftMs: 1500, lastCount: 0, started: false });
  });
  it('GDD-13 pause is ignored in ready and over', () => {
    const f = createFlow(); expect(flowPause(f)).toEqual([]); expect(f.status).toBe('ready');
    flowOver(f); expect(flowPause(f)).toEqual([]); expect(f.status).toBe('over');
  });
  it('GDD-13 flowTick does nothing outside countdown', () => {
    const f = createFlow(); expect(flowTick(f, b, 100)).toEqual([]);
    flowStart(f, b); flowTick(f, b, 1500); expect(f.status).toBe('waiting'); expect(flowTick(f, b, 100)).toEqual([]);
    flowPause(f); expect(flowTick(f, b, 100)).toEqual([]);
    flowOver(f); expect(flowTick(f, b, 100)).toEqual([]);
  });
  it('P1 runFlow: a turn in over is dropped (Results starts the next run)', () => {
    const f = createFlow(); flowOver(f);
    expect(flowTurn(f, b)).toEqual({ forward: false, effects: [] });
    expect(f.status).toBe('over');
  });
  const waiting = () => { const f = createFlow(); flowStart(f, b); flowTick(f, b, 1500); return f; };
  it('MEC-001-R2 countdown end waits for the first input (waiting, no playing)', () => {
    const f = waiting();
    expect(f.status).toBe('waiting');
    expect(flowTick(f, b, 5000)).toEqual([]);
  });
  it('MEC-001-R2 a turn or straight input in waiting starts movement and is forwarded', () => {
    const up = waiting();
    expect(flowTurn(up, b, 0, -1)).toEqual({ forward: true, effects: [{ type: 'begin' }] });
    expect(up.status).toBe('playing');
    const straight = waiting();
    expect(flowTurn(straight, b, 1, 0)).toEqual({ forward: true, effects: [{ type: 'begin' }] });
    expect(straight.status).toBe('playing');
  });
  it('MEC-001-R2 the reverse of the start direction is ignored in waiting', () => {
    const f = waiting();
    expect(flowTurn(f, b, -1, 0)).toEqual({ forward: false, effects: [] });
    expect(f.status).toBe('waiting');
  });
  it('MEC-001-R2 pause and resume in waiting return to a countdown, then waiting again', () => {
    const f = waiting();
    expect(flowKey(f, b, 'Escape')).toEqual([{ type: 'showPaused' }]); expect(f.status).toBe('paused');
    flowResume(f, b); flowTick(f, b, 1500);
    expect(f.status).toBe('waiting');
  });
  it('MEC-001-R2 resume after movement started returns to playing, not waiting', () => {
    const f = waiting(); flowTurn(f, b, 0, -1); flowPause(f); flowResume(f, b); flowTick(f, b, 1500);
    expect(f.status).toBe('playing');
  });
  it('MEC-001-R2 a new run after over waits for input again', () => {
    const f = waiting(); flowTurn(f, b, 0, -1); flowOver(f); flowStart(f, b); flowTick(f, b, 1500);
    expect(f.status).toBe('waiting');
  });
  it('MEC-007-R15 skill input is ignored in waiting', () => {
    expect(acceptSkillInput('waiting')).toBe(false);
  });
});
