// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createHeroStage, skinPortraitUrl } from '../../../src/game/dom/heroStage';
import { MOTION } from '../../../src/game/dom/motionTokens';
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

describe('D4-P3 HeroStage portrait mode', () => {
  const leanX = (hero: { el: HTMLElement }): number =>
    parseFloat(hero.el.querySelector<HTMLElement>('.d4-hero-img')!.style.getPropertyValue('--lean-x'));

  it('D4-P3 skinPortraitUrl maps each skin to its WebP asset', () => {
    for (const skin of SKIN_IDS) expect(skinPortraitUrl(skin)).toBe(`/skins/${skin}.webp`);
  });

  it('D4-P3 portrait renders img + shadow without svg, and setSkin swaps the src', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'pup', mode: 'portrait', clock });
    const img = hero.el.querySelector<HTMLImageElement>('.d4-hero-portrait > img.d4-hero-img')!;
    expect(img.getAttribute('src')).toBe('/skins/pup.webp');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('draggable')).toBe('false');
    expect(hero.el.querySelector('.d4-hero-shadow')?.getAttribute('aria-hidden')).toBe('true');
    expect(hero.el.querySelector('svg')).toBeNull();
    expect(hero.el.dataset.qa).toBe('hero-pup');
    expect(hero.el.classList.contains('is-live')).toBe(true);
    expect(clock.pending()).toBe(0); // no blink timers in portrait mode
    hero.setSkin('tuxedo');
    expect(img.getAttribute('src')).toBe('/skins/tuxedo.webp');
    expect(hero.el.dataset.qa).toBe('hero-tuxedo');
    hero.destroy();
    expect(box.children.length).toBe(0);
  });

  it('D4-P3 portrait lookAt eases a clamped lean on .d4-hero-img and jumps under reduced motion', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'ginger', mode: 'portrait', clock });
    hero.lookAt(1000, 0);
    clock.frame();
    expect(leanX(hero)).toBeGreaterThan(0);
    expect(leanX(hero)).toBeLessThan(MOTION.portraitLeanPx);
    clock.advance(1000);
    expect(leanX(hero)).toBeCloseTo(MOTION.portraitLeanPx, 1);
    const img = hero.el.querySelector<HTMLElement>('.d4-hero-img')!;
    expect(parseFloat(img.style.getPropertyValue('--lean-r'))).toBeCloseTo(MOTION.portraitTiltDeg, 1);
    hero.destroy();
    expect(clock.pending()).toBe(0);

    const rm = createHeroStage(box, { skin: 'ginger', mode: 'portrait', clock, reduceMotion: () => true });
    expect(rm.el.classList.contains('is-live')).toBe(false);
    rm.lookAt(-1000, 0);
    expect(leanX(rm)).toBeCloseTo(-MOTION.portraitLeanPx, 2);
    rm.destroy();
  });

  it('D4-P3 portrait reactions toggle classes + data-reaction, hurt is sticky, reduced motion skips movement', () => {
    const clock = new FakeClock();
    const box = document.createElement('div');
    const hero = createHeroStage(box, { skin: 'capy', mode: 'portrait', clock });
    hero.react('poke');
    expect(hero.el.dataset.reaction).toBe('poke');
    expect(hero.el.classList.contains('is-jelly')).toBe(true);
    clock.advance(MOTION.pokeMs);
    expect(hero.el.dataset.reaction).toBeUndefined();
    expect(hero.el.classList.contains('is-jelly')).toBe(false);

    hero.react('celebrate');
    expect(hero.el.classList.contains('is-hop')).toBe(true);
    hero.react('denied'); // replaces celebrate
    expect(hero.el.classList.contains('is-hop')).toBe(false);
    expect(hero.el.classList.contains('is-recoil')).toBe(true);
    clock.advance(MOTION.deniedMs);
    expect(hero.el.dataset.reaction).toBeUndefined();

    hero.react('hurt');
    clock.advance(5000);
    expect(hero.el.classList.contains('is-hurt')).toBe(true);
    hero.setExpression('idle');
    expect(hero.el.classList.contains('is-hurt')).toBe(false);

    hero.el.dispatchEvent(new Event('pointerdown'));
    expect(hero.el.dataset.reaction).toBe('poke');
    hero.destroy();
    expect(clock.pending()).toBe(0);

    const rm = createHeroStage(box, { skin: 'capy', mode: 'portrait', clock, reduceMotion: () => true });
    rm.react('celebrate');
    expect(rm.el.dataset.reaction).toBe('celebrate');
    expect(rm.el.classList.contains('is-hop')).toBe(false);
    rm.react('hurt');
    expect(rm.el.classList.contains('is-hurt')).toBe(true);
    rm.destroy();
    expect(clock.pending()).toBe(0);
  });
});
