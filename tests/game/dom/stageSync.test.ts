// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { stageVars, startStageSync } from '../../../src/game/dom/stageSync';

describe('D4-P1-R1 stageSync', () => {
  it('D4-P1-R1 stageVars maps a 360x640 canvas 1:1 and a letterboxed 1280x800 desktop', () => {
    const phone = stageVars({ left: 0, top: 0, width: 360, height: 640 }, { top: 100, size: 320, height: 640 }, 360);
    expect(phone['--stage-scale']).toBe('1');
    expect(phone['--stage-w']).toBe('360px');
    expect(phone['--stage-h']).toBe('640px');
    expect(phone['--board-top']).toBe('15.625%');
    expect(phone['--board-h']).toBe('50%');

    const desk = stageVars({ left: 415, top: 0, width: 450, height: 800 }, { top: 160, size: 400, height: 800 }, 360);
    expect(desk.left).toBe('415px');
    expect(desk['--stage-scale']).toBe('1.25');
    expect(desk['--board-top']).toBe('20%');
    expect(desk['--board-h']).toBe('50%');
  });

  it('D4-P1-R1 phones 360x640 through 430x932 keep #ui-root equal to the canvas rect', () => {
    const sizes: [number, number][] = [[360, 640], [375, 667], [390, 844], [412, 915], [430, 932]];
    for (const [w, h] of sizes) {
      const root = document.createElement('div');
      const sync = startStageSync({
        root,
        readRect: () => ({ left: 0, top: 0, width: w, height: h }),
        board: () => ({ top: 120, size: 340, height: h }),
        baseWidth: 360,
        subscribe: () => () => {},
      });
      expect(root.style.left).toBe('0px');
      expect(root.style.top).toBe('0px');
      expect(root.style.width).toBe(`${w}px`);
      expect(root.style.height).toBe(`${h}px`);
      sync.stop();
    }
  });

  it('D4-P1-R1 bursts of resize events produce one rAF and one write', () => {
    const root = document.createElement('div');
    const readRect = vi.fn(() => ({ left: 10, top: 20, width: 360, height: 640 }));
    const queue: (() => void)[] = [];
    const raf = vi.fn((cb: () => void) => { queue.push(cb); return queue.length; });
    const unsub = vi.fn();
    const sync = startStageSync({
      root,
      readRect,
      board: () => ({ top: 100, size: 320, height: 640 }),
      baseWidth: 360,
      raf,
      subscribe: () => unsub,
    });
    readRect.mockClear();
    for (let i = 0; i < 5; i++) sync.schedule();
    expect(raf).toHaveBeenCalledTimes(1);
    expect(readRect).not.toHaveBeenCalled();
    queue.shift()!();
    expect(readRect).toHaveBeenCalledTimes(1);
    sync.stop();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
