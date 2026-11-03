// tests/support/balance.ts — shared by every core test (and by the P2a plan)
import json from '../../config/balance.json';
import { parseBalance, type Balance } from '../../src/core/balance';
export const loadBalance = (): Balance => parseBalance(structuredClone(json));
