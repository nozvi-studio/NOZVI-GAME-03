// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createHeroStage } from '../../../src/game/dom/heroStage';
import { SKIN_IDS } from '../../../src/game/art/skins';
import { FakeClock } from './fakeClock';

function parseTranslate(el: Element): [number, number] {
  const m = (el.getAttribute('transform') ?? '').match(/translate\(([-\d.]+)\s+([-\d.]+)\)/);
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
}

describe('D4-P2-R3 HeroStage', () => {
  it('D4-P2-R3 mounts the hero svg for each of the 5 skins with data-qa and role img', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    for (const skin of SKIN_IDS) {
      const hero = createHeroStage(box, { skin, clock });
      expect(hero.el.dataset.qa).toBe(`hero-${skin}`);
      expect(hero.el.getAttribute('role')).toBe('img');
      expect(hero.el.classList.contains('is-live')).toBe(true);
      hero.destroy();
    }
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R3 auto-blink fires between 3.0 and 4.5 s and lasts 120 ms', () => {
    const clock = new FakeClock();
    clock.rnd = () => 0;
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'capy', clock });
    const eyes = () => hero.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes');
    expect(eyes()).toBe('open');
    clock.advance(2999);
    expect(eyes()).toBe('open');
    clock.advance(1);
    expect(eyes()).toBe('blink');
    clock.advance(120);
    expect(eyes()).toBe('open');
    expect(clock.pending()).toBeGreaterThan(0);
    hero.destroy();
    expect(clock.pending()).toBe(0);
  });

  it('D4-P2-R3 blink interval uses injected random and reduced motion disables breathing and blink', () => {
    const clock = new FakeClock();
    clock.rnd = () => 0.999;
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'pup', clock });
    clock.advance(4400);
    expect(hero.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('open');
    clock.advance(100);
    expect(hero.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('blink');
    hero.destroy();

    const reduced = createHeroStage(box, { skin: 'pup', clock, reduceMotion: () => true });
    expect(reduced.el.classList.contains('is-live')).toBe(false);
    expect(clock.pending()).toBe(0);
    reduced.destroy();
  });

  it('D4-P2-R3 lookAt eases and clamps pupils to 2.2 units, and jumps under reduced motion', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'ginger', clock });
    hero.lookAt(1000, 0);
    clock.frame();
    const p1 = parseTranslate(hero.el.querySelector('[data-part="pupil"]')!);
    expect(p1[0]).toBeGreaterThan(0);
    expect(p1[0]).toBeLessThan(2.2);
    clock.advance(1000);
    const pEnd = parseTranslate(hero.el.querySelector('[data-part="pupil"]')!);
    expect(pEnd[0]).toBeCloseTo(2.2, 1);
    expect(pEnd[1]).toBeCloseTo(0, 1);
    hero.lookAt(-1000, -1000);
    clock.advance(1000);
    const pDiag = parseTranslate(hero.el.querySelector('[data-part="pupil"]')!);
    expect(Math.hypot(pDiag[0], pDiag[1])).toBeCloseTo(2.2, 2);
    hero.destroy();

    const rm = createHeroStage(box, { skin: 'ginger', clock, reduceMotion: () => true });
    rm.lookAt(1000, 0);
    const pRm = parseTranslate(rm.el.querySelector('[data-part="pupil"]')!);
    expect(pRm[0]).toBeCloseTo(2.2, 2);
    rm.destroy();
  });

  it('D4-P2-R3 poke, celebrate, denied, hurt reactions and pointerdown work and clean up', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    const capy = createHeroStage(box, { skin: 'capy', clock });
    capy.react('poke');
    expect(capy.el.dataset.reaction).toBe('poke');
    expect(capy.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('closed');
    clock.advance(600);
    expect(capy.el.dataset.reaction).toBeUndefined();
    expect(capy.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('open');

    capy.react('celebrate');
    expect(capy.el.querySelector('[data-layer="mouth"]')?.getAttribute('data-mouth')).toBe('open');
    clock.advance(800);
    expect(capy.el.dataset.reaction).toBeUndefined();

    capy.react('denied');
    expect(capy.el.querySelector('[data-layer="mouth"]')?.getAttribute('data-mouth')).toBe('o');
    capy.react('hurt');
    expect(capy.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('x');
    clock.advance(2000);
    expect(capy.el.querySelector('[data-layer="eyes"]')?.getAttribute('data-eyes')).toBe('x');
    capy.destroy();
    expect(clock.pending()).toBe(0);

    const snake = createHeroStage(box, { skin: 'snake', clock });
    snake.el.dispatchEvent(new Event('pointerdown'));
    expect(snake.el.innerHTML).toContain('data-part="tongue"');
    snake.destroy();
    expect(clock.pending()).toBe(0);
  });
});
