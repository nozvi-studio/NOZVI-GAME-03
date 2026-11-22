// MEC-011 skins: catalogue from the balance, ownership, coins, equip. Pure: no Phaser, no storage.
export type SkinRarity = 'default' | 'common' | 'rare';
export interface SkinsConfig { order: readonly string[]; rare: readonly string[]; prices: { common: number; rare: number } }
export interface SkinState { coins: number; ownedSkins: string[]; equippedSkin: string }
export type BuyResult = { ok: true; state: SkinState } | { ok: false; reason: 'owned' | 'coins' | 'unknown' };

export const DEFAULT_SKIN = 'snake';
// MEC-011-R5 each call owns its array.
export const defaultSkinState = (): SkinState => ({ coins: 0, ownedSkins: [DEFAULT_SKIN], equippedSkin: DEFAULT_SKIN });

// MEC-011-R2 the default skin is free; every other skin is common unless the balance lists it as rare.
export function skinRarity(cfg: SkinsConfig, id: string): SkinRarity {
  return id === DEFAULT_SKIN ? 'default' : cfg.rare.includes(id) ? 'rare' : 'common';
}
export function skinPrice(cfg: SkinsConfig, id: string): number {
  const r = skinRarity(cfg, id);
  return r === 'default' ? 0 : cfg.prices[r];
}

// MEC-011-R6 buy: known, not owned, enough coins; pays, owns and equips in one step.
export function buySkin(state: SkinState, id: string, cfg: SkinsConfig): BuyResult {
  if (!cfg.order.includes(id)) return { ok: false, reason: 'unknown' };
  if (state.ownedSkins.includes(id)) return { ok: false, reason: 'owned' };
  const price = skinPrice(cfg, id);
  if (state.coins < price) return { ok: false, reason: 'coins' };
  return { ok: true, state: { coins: state.coins - price, ownedSkins: [...state.ownedSkins, id], equippedSkin: id } };
}

// MEC-011-R7 equip: owned skins only; equipping the equipped skin returns the same state.
export function equipSkin(state: SkinState, id: string): { ok: boolean; state: SkinState } {
  if (!state.ownedSkins.includes(id)) return { ok: false, state };
  return { ok: true, state: state.equippedSkin === id ? state : { ...state, equippedSkin: id } };
}

// MEC-011-R10 whole coins, never negative.
export function addCoins(state: SkinState, n: number): SkinState {
  return { ...state, coins: Math.max(0, state.coins + Math.floor(n)) };
}

// MEC-011-R12 load-time repair; owned skins keep the balance order with the default first.
export function sanitizeSkins(raw: { coins?: unknown; ownedSkins?: unknown; equippedSkin?: unknown }, cfg: SkinsConfig): SkinState {
  const coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) ? Math.max(0, Math.floor(raw.coins)) : 0;
  const listed = Array.isArray(raw.ownedSkins) ? raw.ownedSkins : [];
  const owned = cfg.order.filter(id => id === DEFAULT_SKIN || listed.includes(id));
  const ownedSkins = [DEFAULT_SKIN, ...owned.filter(id => id !== DEFAULT_SKIN)];
  const equippedSkin = typeof raw.equippedSkin === 'string' && ownedSkins.includes(raw.equippedSkin) ? raw.equippedSkin : DEFAULT_SKIN;
  return { coins, ownedSkins, equippedSkin };
}
