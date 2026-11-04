// Shared balance fixture; patches always pass through real validation.
import json from '../../config/balance.json';
import { parseBalance, type Balance } from '../../src/core/balance';
export const loadBalance = (patch?: (json: any) => void): Balance => {
  const copy = structuredClone(json);
  patch?.(copy);
  return parseBalance(copy);
};
