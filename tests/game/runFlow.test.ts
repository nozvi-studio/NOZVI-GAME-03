// tests/game/runFlow.test.ts
import { describe, expect, it } from 'vitest';
import { createFlow, flowKey, flowPause, flowResume, flowStart, flowTick, flowTurn, flowOver } from '../../src/game/flow/runFlow';
import { loadBalance } from '../support/balance';

const b = loadBalance();
describe('GDD-13 run flow (L651–700, L721–729, L988–994)', () => {
  it('GDD-13 start from ready: new run, overlay hidden, countdown 1500', () => {
    const f = createFlow();
    expect(flowStart(f, b)).toEqual([{ type: 'newRun' }, { type: 'hideOverlay' }]);
    expect(f).toEqual({ status: 'countdown', countLeftMs: 1500, lastCount: 0 });
  });
  it('GDD-13 countdown ticks 3, 2, 1 then go', () => {
    const f = createFlow(); flowStart(f, b);
    expect(flowTick(f, b, 16)).toEqual([{ type: 'tick', n: 3 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 2 }]);
    expect(flowTick(f, b, 500)).toEqual([{ type: 'tick', n: 1 }]);
    expect(flowTick(f, b, 484)).toEqual([{ type: 'go' }]);
    expect(f.status).toBe('playing');
  });
  it('GDD-13 a turn in ready starts a run and is forwarded; in paused it is dropped', () => {
    const f = createFlow();
    expect(flowTurn(f, b)).toEqual({ forward: true, effects: [{ type: 'newRun' }, { type: 'hideOverlay' }] });
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
    expect(f).toEqual({ status: 'countdown', countLeftMs: 1500, lastCount: 0 });
  });
  it('GDD-13 pause is ignored in ready and over', () => {
    const f = createFlow(); expect(flowPause(f)).toEqual([]); expect(f.status).toBe('ready');
    flowOver(f); expect(flowPause(f)).toEqual([]); expect(f.status).toBe('over');
  });
  it('GDD-13 flowTick does nothing outside countdown', () => {
    const f = createFlow(); expect(flowTick(f, b, 100)).toEqual([]);
    flowStart(f, b); flowTick(f, b, 1500); expect(flowTick(f, b, 100)).toEqual([]);
    flowPause(f); expect(flowTick(f, b, 100)).toEqual([]);
    flowOver(f); expect(flowTick(f, b, 100)).toEqual([]);
  });
  it('GDD-13 a turn in over starts a new run', () => {
    const f = createFlow(); flowOver(f);
    expect(flowTurn(f, b)).toEqual({ forward: true, effects: [{ type: 'newRun' }, { type: 'hideOverlay' }] });
    expect(f.status).toBe('countdown');
  });
});
