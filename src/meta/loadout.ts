export interface UnlockTable<Id extends string = string> {
  order: readonly Id[];
  unlockLevel: Readonly<Record<Id, number>>;
  secondSlotLevel: number;
}

// MEC-007-R4 sanitize in the six specified steps, without mutating the saved selection.
export function sanitizeLoadout<Id extends string>(saved: unknown, bestLevel: number, table: UnlockTable<Id>): readonly [Id | null, Id | null] {
  // 1. Wrong shape becomes two empty slots.
  const input: unknown[] = Array.isArray(saved) && saved.length === 2 ? saved : [null, null];
  const unlocked = table.order.filter(id => table.unlockLevel[id] <= bestLevel);
  // 2. Unknown and locked skills become null.
  const valid = (id: unknown): Id | null => unlocked.find(skill => skill === id) ?? null;
  const slots: [Id | null, Id | null] = [valid(input[0]), valid(input[1])];
  // 3. Keep only the first duplicate.
  if (slots[0] === slots[1]) slots[1] = null;
  // 4. Drop slots beyond the unlocked slot count.
  const slotCount = bestLevel < table.secondSlotLevel ? 1 : 2;
  if (slotCount === 1) slots[1] = null;
  // 5. Fill empty slots in order from the first unchosen unlocked skill.
  for (let i = 0; i < slotCount; i++) {
    if (slots[i] === null) slots[i] = unlocked.find(id => !slots.includes(id)) ?? null;
  }
  // 6. Compact the remaining second skill when no skill could fill the first slot.
  if (slots[0] === null && slots[1] !== null) { slots[0] = slots[1]; slots[1] = null; }
  return slots;
}
