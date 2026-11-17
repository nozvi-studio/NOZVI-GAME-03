import { describe, expect, it } from 'vitest';
import { createSession } from '../../src/session';
import { memoryStore, SAVE_KEY } from '../../src/meta';
import { loadBalance } from '../support/balance';

const make = () => { const store = memoryStore(), balance = loadBalance();
  return { store, balance, session: createSession({ balance, store, newSeed: () => 1, now: () => 0 }) }; };
const stored = (store: ReturnType<typeof memoryStore>) => JSON.parse(store.get(SAVE_KEY)!).data;

describe('MEC-011 session skins', () => {
  it('MEC-011-R5 a fresh session lists 5 skins in balance order, snake owned and equipped', () => {
    const m = make().session.skinsModel();
    expect(m.coins).toBe(0); expect(m.equipped).toBe('snake');
    expect(m.skins.map(s => s.id)).toEqual(['snake', 'ginger', 'pup', 'tuxedo', 'capy']);
    expect(m.skins.map(s => s.owned)).toEqual([true, false, false, false, false]);
    expect(m.skins.find(s => s.id === 'capy')).toMatchObject({ rarity: 'rare', price: 800 });
  });
  it('MEC-011-R10 the debug grant adds balance.skins.debugGrant coins and saves', () => {
    const { session, store, balance } = make();
    session.debugAddCoins();
    expect(session.skinsModel().coins).toBe(balance.skins.debugGrant); expect(stored(store).coins).toBe(balance.skins.debugGrant);
  });
  it('MEC-011-R6/R13 buy pays, owns, equips and saves at once; a second buy is refused', () => {
    const { session, store } = make();
    session.debugAddCoins();
    expect(session.buySkin('ginger')).toEqual({ ok: true });
    expect(session.skinsModel()).toMatchObject({ coins: 200, equipped: 'ginger' });
    expect(stored(store)).toMatchObject({ coins: 200, ownedSkins: ['snake', 'ginger'], equippedSkin: 'ginger' });
    expect(session.buySkin('ginger')).toEqual({ ok: false, reason: 'owned' });
    expect(session.buySkin('capy')).toEqual({ ok: false, reason: 'coins' });
  });
  it('MEC-011-R7/R13 equip switches between owned skins and saves', () => {
    const { session, store } = make();
    session.debugAddCoins(); session.buySkin('pup');
    expect(session.equipSkin('snake')).toBe(true); expect(stored(store).equippedSkin).toBe('snake');
    expect(session.equipSkin('capy')).toBe(false); expect(session.skinsModel().equipped).toBe('snake');
  });
});
