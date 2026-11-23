// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { countUp, shakeDenied, staggerEnter } from '../../../src/game/dom/animate';
import { FakeClock } from './fakeClock';

describe('D4-P2-R4 Tier 2 motion helpers', () => {
  it('D4-P2-R4 staggerEnter sets 35 ms incremental delays and reveals on next frame', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    for (let i = 0; i < 4; i++) box.appendChild(document.createElement('div'));
    staggerEnter(box, { clock });
    const kids = Array.from(box.children) as HTMLElement[];
    expect(kids.map(k => k.style.getPropertyValue('--d4-delay'))).toEqual(['0ms', '35ms', '70ms', '105ms']);
    expect(kids.every(k => !k.classList.contains('is-in'))).toBe(true);
    clock.frame();
    expect(kids.every(k => k.classList.contains('is-in'))).toBe(true);
  });

  it('D4-P2-R4 staggerEnter is instant under .reduced-motion', () => {
    const clock = new FakeClock();
    const root = document.createElement('div');
    root.className = 'reduced-motion';
    const box = document.createElement('div');
    box.appendChild(document.createElement('div'));
    root.appendChild(box);
    staggerEnter(box, { clock });
    expect((box.firstElementChild as HTMLElement).classList.contains('is-in')).toBe(true);
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R4 countUp eases out, counts down, cancels, and jumps under reduced motion', () => {
    const clock = new FakeClock();
    const el = document.createElement('span');
    countUp(el, 0, 1234, 600, clock);
    clock.advance(300);
    const mid = Number(el.textContent);
    expect(mid).toBeGreaterThan(617);
    expect(mid).toBeLessThan(1234);
    clock.advance(300);
    expect(el.textContent).toBe('1234');

    const cancel = countUp(el, 100, 40, 400, clock);
    clock.advance(100);
    const snap = el.textContent;
    cancel();
    clock.advance(400);
    expect(el.textContent).toBe(snap);

    const rm = document.createElement('div');
    rm.className = 'reduced-motion';
    const rmSpan = document.createElement('span');
    rm.appendChild(rmSpan);
    countUp(rmSpan, 0, 999, 500, clock);
    expect(rmSpan.textContent).toBe('999');
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R4 shakeDenied returns to rest after 280 ms and is a no-op under reduced motion', () => {
    const clock = new FakeClock();
    const btn = document.createElement('button');
    (btn as unknown as { animate?: unknown }).animate = undefined;
    shakeDenied(btn, clock);
    clock.advance(10);
    expect(btn.style.transform).toBe('translateX(6px)');
    clock.advance(280);
    expect(btn.style.transform).toBe('');

    const rm = document.createElement('div');
    rm.className = 'reduced-motion';
    const rmBtn = document.createElement('button');
    (rmBtn as unknown as { animate?: unknown }).animate = undefined;
    rm.appendChild(rmBtn);
    shakeDenied(rmBtn, clock);
    expect(clock.pending()).toBe(0);
  });
});
