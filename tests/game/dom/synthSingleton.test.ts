// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetAudioForTests, createSynth, installAudioUnlock } from '../../../src/game/audio/synth';

class FakeAudioContext {
  static count = 0;
  static last: FakeAudioContext | null = null;
  state: string = 'running';
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => { this.state = 'running'; });
  createOscillator = vi.fn(() => ({
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }));
  constructor() {
    FakeAudioContext.count += 1;
    FakeAudioContext.last = this;
  }
}

describe('D4-P1-R6 singleton audio and unlock', () => {
  const orig = window.AudioContext;

  beforeEach(() => {
    FakeAudioContext.count = 0;
    FakeAudioContext.last = null;
    __resetAudioForTests();
    (window as unknown as { AudioContext: typeof FakeAudioContext }).AudioContext = FakeAudioContext;
  });

  afterEach(() => {
    __resetAudioForTests();
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = orig;
  });

  it('D4-P1-R6 two synths share one AudioContext', () => {
    const a = createSynth();
    const b = createSynth();
    a.unlock();
    b.unlock();
    expect(FakeAudioContext.count).toBe(1);
  });

  it('D4-P1-R6 setOn(false) on one synth mutes every synth', () => {
    const a = createSynth();
    const b = createSynth();
    a.unlock();
    a.setOn(false);
    b.play('eat');
    expect(FakeAudioContext.last?.createOscillator).not.toHaveBeenCalled();
  });

  it('D4-P1-R6 unlock listener is capturing and creates the context synchronously', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const dispose = installAudioUnlock(window, document);
    expect(addSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    window.dispatchEvent(new Event('pointerdown'));
    expect(FakeAudioContext.count).toBe(1);
    dispose();
    addSpy.mockRestore();
  });

  it('D4-P1-R6 interrupted or suspended contexts resume on visibilitychange', () => {
    const dispose = installAudioUnlock(window, document);
    createSynth().unlock();
    FakeAudioContext.last!.state = 'interrupted';
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FakeAudioContext.last!.resume).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('D4-P1-R6 disposer removes the listeners', () => {
    const dispose = installAudioUnlock(window, document);
    dispose();
    window.dispatchEvent(new Event('pointerdown'));
    expect(FakeAudioContext.count).toBe(0);
  });
});
