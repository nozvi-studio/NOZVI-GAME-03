// MOT-2-R5/R9 pure entrance orders and the Results timeline: no Phaser, no tweens (spec 2026-11-10-motion-2-menu-flow-design.md sections 2-3).
import type { MotionBalance } from '../../core/balance';
import { staggerDelay } from '../motion/curves';

export type Dir = 'left' | 'right' | 'up' | 'down';
export interface EntranceStep { id: string; motion: 'pop' | 'slide' | 'fade'; from?: Dir | 'nav' }

const pop = (id: string): EntranceStep => ({ id, motion: 'pop' });
const slide = (id: string, from: Dir | 'nav'): EntranceStep => ({ id, motion: 'slide', from });
const fade = (id: string): EntranceStep => ({ id, motion: 'fade' });

/** D3-R11 / MOT-2-R5 Home: gear, Characters and Best pop, logo slides from the top, hero pops, the rest slides up from below. */
export const HOME_ORDER: EntranceStep[] = [pop('gear'), pop('characters'), pop('best'), slide('logo1', 'up'), slide('logo2', 'up'), pop('hero'),
  slide('stepper', 'down'), slide('play', 'down'), slide('hint', 'down'), slide('links', 'down')];

/** MOT-2-R5 Loadout: back, title, slots, start chips, one slide per card in list order, action last. */
export const loadoutOrder = (cardCount: number): EntranceStep[] => [pop('back'), fade('title'), pop('slots'), slide('chips', 'nav'),
  ...Array.from({ length: cardCount }, (_, i) => slide(`card${i}`, 'nav')), pop('go')];

/** MOT-2-R5 Settings (full screen): back, title, card background, rows, caption. */
export const settingsOrder = (rowCount: number): EntranceStep[] => [pop('back'), fade('title'), fade('card'),
  ...Array.from({ length: rowCount }, (_, i) => slide(`row${i}`, 'nav')), fade('caption')];

/** MEC-011-R20 Characters: back, title, coin chip, hero, ribbon, token shelf, action button. */
export const charactersOrder: EntranceStep[] = [pop('back'), fade('title'), pop('coins'), pop('hero'), pop('ribbon'), slide('shelf', 'down'), pop('action')];

/** MOT-2-R8 time from the first entrance frame until the last of `count` items has settled. */
export function entranceEndMs(count: number, cfg: Pick<MotionBalance, 'staggerMs' | 'staggerCapMs' | 'popInMs' | 'slideInMs'>): number {
  return count <= 0 ? 0 : staggerDelay(count - 1, cfg.staggerMs, cfg.staggerCapMs) + Math.max(cfg.popInMs, cfg.slideInMs);
}

export type SeqKind = 'pop' | 'slide' | 'fade' | 'count' | 'pulse';
export interface SeqItem { item: string; atMs: number; kind: SeqKind }
/** MOT-2-R9 fixed offsets from the spec, in ms from the sequence start (timeline constants, not tunables). */
export const RESULTS_AT = { title: 0, card: 120, score: 200, tiles: 400, plainBest: 600, blocks: 700 } as const;
export interface ResultsParts { newBest: boolean; energy: boolean; banner: boolean; next: boolean; again: boolean; marbles?: boolean }

/** MOT-2-R9 Results sequence: ends exactly at resultsSeqMs (the last footer pop settles at it). Absent parts are skipped without gaps. */
export function resultsTimeline(p: ResultsParts, cfg: Pick<MotionBalance, 'staggerMs' | 'staggerCapMs' | 'popInMs' | 'countUpMs' | 'resultsSeqMs'>): SeqItem[] {
  const out: SeqItem[] = [
    { item: 'title', atMs: RESULTS_AT.title, kind: 'pop' },
    { item: 'card', atMs: RESULTS_AT.card, kind: 'pop' },
    { item: 'headline', atMs: RESULTS_AT.card, kind: 'fade' },
    { item: 'scoreLabel', atMs: RESULTS_AT.card, kind: 'fade' },
    { item: 'score', atMs: RESULTS_AT.score, kind: 'count' },
  ];
  [0, 1, 2].forEach(i => out.push({ item: `stat${i}`, atMs: RESULTS_AT.tiles + staggerDelay(i, cfg.staggerMs, cfg.staggerCapMs), kind: 'pop' }));
  const countEnd = RESULTS_AT.score + cfg.countUpMs;
  if (p.newBest) {
    out.push({ item: 'best', atMs: countEnd, kind: 'pop' }, { item: 'bestStar', atMs: countEnd, kind: 'pulse' });
  } else out.push({ item: 'best', atMs: RESULTS_AT.plainBest, kind: 'fade' });
  const blocks = [p.energy ? 'energy' : null, p.marbles ? 'marbles' : null, p.banner ? 'banner' : null, p.next ? 'next' : null].filter((b): b is string => b !== null);
  blocks.forEach((item, i) => out.push({ item, atMs: RESULTS_AT.blocks + staggerDelay(i, cfg.staggerMs, cfg.staggerCapMs), kind: 'slide' }));
  const againAt = cfg.resultsSeqMs - cfg.popInMs;
  if (p.again) out.push({ item: 'home', atMs: againAt - cfg.staggerMs, kind: 'pop' }, { item: 'again', atMs: againAt, kind: 'pop' });
  else out.push({ item: 'home', atMs: againAt, kind: 'pop' });
  return out.sort((a, b) => a.atMs - b.atMs); // Array.sort is stable: equal times keep the order above
}
