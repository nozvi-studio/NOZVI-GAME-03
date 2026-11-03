// src/meta/storage.ts — key/value store port; the browser adapter lives in src/game/platform/localStore.ts. GDD-8.4
export interface KeyValueStore { get(k: string): string | null; set(k: string, v: string): void }

export function memoryStore(init: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const m: Record<string, string> = { ...init };
  return { get: k => (k in m ? m[k]! : null), set: (k, v) => { m[k] = v; }, dump: () => ({ ...m }) };
}
