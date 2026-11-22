import { describe, expect, it } from 'vitest';
import { charactersView } from '../../src/game/flow/charactersView';
import type { SkinsModel } from '../../src/session';

const model = (coins: number, owned: string[], equipped: string): SkinsModel => ({ coins, equipped,
  skins: [['snake', 'default', 0], ['ginger', 'common', 300], ['pup', 'common', 300], ['tuxedo', 'common', 300], ['capy', 'rare', 800]]
    .map(([id, rarity, price]) => ({ id: id as string, rarity: rarity as 'default' | 'common' | 'rare', price: price as number, owned: owned.includes(id as string) })) });

describe('MEC-011 characters view', () => {
  it('MEC-011-R16 token states: equipped, owned, locked; the previewed token is selected', () => {
    const v = charactersView(model(120, ['snake', 'ginger'], 'snake'), 'ginger');
    expect(v.tokens.map(t => t.state)).toEqual(['equipped', 'owned', 'locked', 'locked', 'locked']);
    expect(v.tokens.map(t => t.selected)).toEqual([false, true, false, false, false]);
  });
  it('MEC-011-R17 action button per state of the previewed skin', () => {
    const m = model(350, ['snake', 'ginger'], 'snake');
    expect(charactersView(m, 'snake').action).toEqual({ kind: 'equipped', price: 0, missing: 0 });
    expect(charactersView(m, 'ginger').action).toEqual({ kind: 'equip', price: 300, missing: 0 });
    expect(charactersView(m, 'pup').action).toEqual({ kind: 'buy', price: 300, missing: 0 });
    expect(charactersView(m, 'capy').action).toEqual({ kind: 'need', price: 800, missing: 450 });
  });
  it('MEC-011-R15 an unknown preview id falls back to the equipped skin', () => {
    expect(charactersView(model(0, ['snake'], 'snake'), 'dragon').preview).toBe('snake');
  });
  it('MEC-011-R14 name, rarity and perk of the previewed skin', () => {
    const v = charactersView(model(0, ['snake'], 'snake'), 'capy');
    expect(v.name).toBe('Capybara'); expect(v.rarity).toBe('rare'); expect(v.perk).toBe('Sparkle bite · Leaf trail');
  });
});
