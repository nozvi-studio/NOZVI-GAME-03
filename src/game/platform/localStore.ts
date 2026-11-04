import type { KeyValueStore } from '../../meta';

// GDD-8.4 tolerate blocked or full browser storage on every access (prototype L231–234).
export const localStore = (): KeyValueStore => ({
  get: k => { try { return window.localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* Storage full or blocked. */ } },
});
