import type { SkinRarity } from '../../meta';
import type { SkinsModel } from '../../session';
import { t } from '../text';

export type TokenState = 'equipped' | 'owned' | 'locked';
export interface CharactersView {
  coins: number; preview: string; name: string; rarity: SkinRarity; perk: string;
  tokens: { id: string; state: TokenState; price: number; selected: boolean }[];
  action: { kind: 'equipped' | 'equip' | 'buy' | 'need'; price: number; missing: number };
}
// MEC-011-R14..R17 everything the Characters screen shows, from the session model and the previewed id.
export function charactersView(m: SkinsModel, preview: string): CharactersView {
  const cur = m.skins.find(s => s.id === preview) ?? m.skins.find(s => s.id === m.equipped)!;
  const kind = cur.id === m.equipped ? 'equipped' : cur.owned ? 'equip' : m.coins >= cur.price ? 'buy' : 'need';
  return {
    coins: m.coins, preview: cur.id, name: t(`skin.${cur.id}.name`), rarity: cur.rarity, perk: t(`skin.${cur.id}.perk`),
    tokens: m.skins.map(s => ({ id: s.id, price: s.price, selected: s.id === cur.id, state: s.id === m.equipped ? 'equipped' : s.owned ? 'owned' : 'locked' })),
    action: { kind, price: cur.price, missing: kind === 'need' ? cur.price - m.coins : 0 },
  };
}
