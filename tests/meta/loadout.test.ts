import { expect, it } from 'vitest';
import { sanitizeLoadout } from '../../src/meta';
import raw from '../../config/balance.json';
const table = { order: raw.loadout.order, secondSlotLevel: raw.loadout.secondSlotLevel,
  unlockLevel: { slowmo: 3, tailSnip: 6, shield: 11, mangoRain: 16 } };
it('MEC-007-R4 sanitize: missing, wrong shape, unknown id, locked, duplicate, extra slot, fill order, slot-2-to-slot-1 move', () => {
  for (const saved of [undefined, 'x', ['laser', null], ['shield'], ['shield', 'tailSnip', 'slowmo']])
    expect(sanitizeLoadout(saved, 12, table)).toEqual(['slowmo', 'tailSnip']);
  expect(sanitizeLoadout(['mangoRain', 'slowmo'], 12, table)).toEqual(['tailSnip', 'slowmo']);
  expect(sanitizeLoadout(['shield', 'shield'], 12, table)).toEqual(['shield', 'slowmo']);
  expect(sanitizeLoadout([null, 'tailSnip'], 4, table)).toEqual(['slowmo', null]);
  expect(sanitizeLoadout([null, 'shield'], 12, table)).toEqual(['slowmo', 'shield']);
  expect(sanitizeLoadout([null, null], 2, table)).toEqual([null, null]);
});
it('MEC-007-R4 step 6 moves slot 2 into slot 1 when nothing can fill slot 1', () => {
  expect(sanitizeLoadout([null, 'slowmo'], 3, { ...table, secondSlotLevel: 2 })).toEqual(['slowmo', null]);
});
it('MEC-007-R4 sanitize never leaves an empty slot while an unchosen unlocked skill exists (table test over best levels 1–30)', () => {
  for (let n = 1; n <= 30; n++) {
    const out = sanitizeLoadout([null, null], n, table);
    expect(out).toEqual(n < 3 ? [null, null] : n < 6 ? ['slowmo', null] : ['slowmo', 'tailSnip']);
    expect(new Set(out.filter(x => x !== null)).size).toBe(out.filter(x => x !== null).length);
  }
});
