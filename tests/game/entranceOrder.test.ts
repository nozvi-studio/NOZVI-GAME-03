import { describe, expect, it } from 'vitest';
import json from '../../config/balance.json';
import { staggerDelay } from '../../src/game/motion/curves';
import { HOME_ORDER, entranceEndMs, loadoutOrder, resultsTimeline, settingsOrder } from '../../src/game/flow/entranceOrder';

const m = json.motion;
const ids = (o: { id: string }[]): string[] => o.map(s => s.id);

describe('MOT-2 entrance orders', () => {
  it('MOT-2-R5 D3-R11 Home order is gear, best, logo lines, hero, stepper, play, hint, links', () => {
    expect(ids(HOME_ORDER)).toEqual(['gear', 'best', 'logo1', 'logo2', 'hero', 'stepper', 'play', 'hint', 'links']);
    expect(HOME_ORDER[0]).toMatchObject({ motion: 'pop' });
    expect(HOME_ORDER[1]).toMatchObject({ motion: 'pop' });
    expect(HOME_ORDER[2]).toMatchObject({ motion: 'slide', from: 'up' });
    expect(HOME_ORDER[6]).toMatchObject({ motion: 'slide', from: 'down' });
  });
  it('MOT-2-R5 Loadout order follows the list and every card past index 6 enters at the cap', () => {
    const o = loadoutOrder(12);
    expect(ids(o).slice(0, 4)).toEqual(['back', 'title', 'slots', 'chips']);
    expect(ids(o).filter(i => i.startsWith('card'))).toHaveLength(12);
    expect(o[o.length - 1]).toMatchObject({ id: 'go', motion: 'pop' });
    expect(o.find(s => s.id === 'card0')).toMatchObject({ motion: 'slide', from: 'nav' });
    const delays = o.map((_, i) => staggerDelay(i, m.staggerMs, m.staggerCapMs));
    expect(Math.max(...delays)).toBe(m.staggerCapMs);
    expect(delays[o.length - 1]).toBe(m.staggerCapMs);
  });
  it('MOT-2-R5 Settings order is back, title, card, rows, caption', () => {
    expect(ids(settingsOrder(4))).toEqual(['back', 'title', 'card', 'row0', 'row1', 'row2', 'row3', 'caption']);
  });
  it('MOT-2-R5 entranceEndMs is the last delay plus the longest motion', () => {
    expect(entranceEndMs(8, m)).toBe(staggerDelay(7, m.staggerMs, m.staggerCapMs) + Math.max(m.popInMs, m.slideInMs));
    expect(entranceEndMs(0, m)).toBe(0);
  });
});

describe('MOT-2-R9 resultsTimeline', () => {
  const all = { newBest: true, energy: true, banner: true, next: true, again: true };
  const at = (tl: ReturnType<typeof resultsTimeline>, item: string) => tl.find(x => x.item === item)!.atMs;
  it('MOT-2-R9 matches the spec times and ends exactly at resultsSeqMs', () => {
    const tl = resultsTimeline(all, m);
    expect(at(tl, 'title')).toBe(0); expect(at(tl, 'head')).toBe(80); expect(at(tl, 'card')).toBe(120);
    expect(at(tl, 'score')).toBe(200); expect(at(tl, 'stat0')).toBe(400); expect(at(tl, 'stat2')).toBe(400 + 2 * m.staggerMs);
    expect(at(tl, 'best')).toBe(200 + m.countUpMs);
    expect(at(tl, 'energy')).toBe(700); expect(at(tl, 'banner')).toBe(700 + m.staggerMs); expect(at(tl, 'next')).toBe(700 + 2 * m.staggerMs);
    const last = tl[tl.length - 1]!;
    expect(last.item).toBe('again');
    expect(last.atMs + m.popInMs).toBe(m.resultsSeqMs);
    expect(at(tl, 'home')).toBe(last.atMs - m.staggerMs);
  });
  it('MOT-2-R9 a plain best chip fades in at 600 and a new best pops and pulses at the count-up end', () => {
    const plain = resultsTimeline({ ...all, newBest: false }, m);
    expect(plain.find(x => x.item === 'best')).toEqual({ item: 'best', atMs: 600, kind: 'fade' });
    expect(plain.some(x => x.item === 'bestStar')).toBe(false);
    const gold = resultsTimeline(all, m);
    expect(gold.find(x => x.item === 'best')!.kind).toBe('pop');
    expect(gold.find(x => x.item === 'bestStar')).toEqual({ item: 'bestStar', atMs: 200 + m.countUpMs, kind: 'pulse' });
  });
  it('MOT-2-R9 absent blocks are skipped without gaps and the marbles slot sits between energy and banner', () => {
    const tl = resultsTimeline({ newBest: false, energy: false, banner: false, next: true, again: false }, m);
    expect(tl.map(x => x.item)).toContain('next'); expect(at(tl, 'next')).toBe(700);
    expect(tl.some(x => x.item === 'energy' || x.item === 'banner' || x.item === 'again')).toBe(false);
    expect(tl[tl.length - 1]).toMatchObject({ item: 'home' });
    expect(tl[tl.length - 1]!.atMs + m.popInMs).toBe(m.resultsSeqMs);
    const withMarbles = resultsTimeline({ ...all, marbles: true }, m);
    expect(withMarbles.map(x => x.item).filter(i => ['energy', 'marbles', 'banner'].includes(i))).toEqual(['energy', 'marbles', 'banner']);
  });
  it('MOT-2-R9 every item starts before the footer and no item is sorted after a later one', () => {
    const tl = resultsTimeline(all, m);
    const times = tl.map(x => x.atMs);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});
