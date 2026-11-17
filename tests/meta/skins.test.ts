import { describe, expect, it } from 'vitest';
import { addCoins, buySkin, defaultSkinState, equipSkin, sanitizeSkins, skinPrice, skinRarity } from '../../src/meta/skins';
import { loadBalance } from '../support/balance';

const cfg = loadBalance().skins;
const st = (coins: number, owned: string[] = ['snake'], equipped = 'snake') => ({ coins, ownedSkins: owned, equippedSkin: equipped });

describe('MEC-011 skin rules', () => {
  it('MEC-011-R2 rarity and price come from the balance', () => {
    expect(skinRarity(cfg, 'snake')).toBe('default'); expect(skinPrice(cfg, 'snake')).toBe(0);
    expect(skinRarity(cfg, 'ginger')).toBe('common'); expect(skinPrice(cfg, 'ginger')).toBe(300);
    expect(skinRarity(cfg, 'capy')).toBe('rare'); expect(skinPrice(cfg, 'capy')).toBe(800);
  });
  it('MEC-011-R5 the default state owns and equips the snake with 0 coins', () => {
    expect(defaultSkinState()).toEqual({ coins: 0, ownedSkins: ['snake'], equippedSkin: 'snake' });
  });
  it('MEC-011-R6 buy subtracts the price, adds the skin and equips it', () => {
    const r = buySkin(st(350), 'ginger', cfg);
    expect(r).toEqual({ ok: true, state: { coins: 50, ownedSkins: ['snake', 'ginger'], equippedSkin: 'ginger' } });
  });
  it('MEC-011-R6 buy is refused with a reason and leaves the state alone', () => {
    expect(buySkin(st(299), 'ginger', cfg)).toEqual({ ok: false, reason: 'coins' });
    expect(buySkin(st(999, ['snake', 'ginger']), 'ginger', cfg)).toEqual({ ok: false, reason: 'owned' });
    expect(buySkin(st(999), 'snake', cfg)).toEqual({ ok: false, reason: 'owned' });
    expect(buySkin(st(999), 'dragon', cfg)).toEqual({ ok: false, reason: 'unknown' });
  });
  it('MEC-011-R6 buy does not mutate its input', () => {
    const s = st(800); buySkin(s, 'capy', cfg); expect(s).toEqual(st(800));
  });
  it('MEC-011-R7 equip works only for an owned skin; the equipped skin is a no-op', () => {
    expect(equipSkin(st(0, ['snake', 'pup']), 'pup')).toEqual({ ok: true, state: st(0, ['snake', 'pup'], 'pup') });
    expect(equipSkin(st(0), 'pup').ok).toBe(false);
    const same = st(0); expect(equipSkin(same, 'snake')).toEqual({ ok: true, state: same });
  });
  it('MEC-011-R10 addCoins adds whole coins and never goes below 0', () => {
    expect(addCoins(st(10), 500).coins).toBe(510); expect(addCoins(st(10), -50).coins).toBe(0); expect(addCoins(st(10), 1.9).coins).toBe(11);
  });
  it('MEC-011-R12 sanitise drops unknown ids, keeps the snake owned, fixes the equipped skin and clamps coins', () => {
    expect(sanitizeSkins({ coins: 12.7, ownedSkins: ['capy', 'dragon', 'capy', 7], equippedSkin: 'capy' }, cfg))
      .toEqual({ coins: 12, ownedSkins: ['snake', 'capy'], equippedSkin: 'capy' });
    expect(sanitizeSkins({ coins: -5, ownedSkins: 'x', equippedSkin: 'pup' }, cfg)).toEqual(defaultSkinState());
    expect(sanitizeSkins({}, cfg)).toEqual(defaultSkinState());
    expect(sanitizeSkins({ coins: Number.NaN, ownedSkins: ['ginger'], equippedSkin: 'tuxedo' }, cfg))
      .toEqual({ coins: 0, ownedSkins: ['snake', 'ginger'], equippedSkin: 'snake' });
  });
});
