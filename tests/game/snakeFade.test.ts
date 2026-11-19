import { describe, expect, it } from 'vitest';
import { applySnakeFade, type FadePart, type FadeTarget } from '../../src/game/render/snakeFade';

const log: string[] = [];
const part = (name: string): FadePart => ({ setVisible: (v: boolean) => { log.push(`${name}.visible=${v}`); } });
const target = (): FadeTarget => ({
  clear: () => { log.push('rt.clear'); },
  draw: (objs: readonly FadePart[]) => { log.push(`rt.draw(${objs.length})`); },
  setAlpha: (a: number) => { log.push(`rt.alpha=${a}`); },
  setVisible: (v: boolean) => { log.push(`rt.visible=${v}`); },
});

describe('MEC-019-R7 invulnerable blink fades the snake as one image', () => {
  it('at full alpha shows the parts and hides the composite, without drawing it', () => {
    log.length = 0;
    applySnakeFade(1, [part('body'), part('face')], target());
    expect(log).toEqual(['body.visible=true', 'face.visible=true', 'rt.visible=false']);
  });

  it('at low alpha draws the opaque parts once into the composite, then hides them (no per-shape alpha, no dots at joints)', () => {
    log.length = 0;
    applySnakeFade(0.45, [part('body'), part('face')], target());
    expect(log).toEqual([
      'body.visible=true', 'face.visible=true', 'rt.clear', 'rt.draw(2)',
      'body.visible=false', 'face.visible=false', 'rt.alpha=0.45', 'rt.visible=true',
    ]);
  });
});
