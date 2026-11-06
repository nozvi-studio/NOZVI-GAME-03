// MEC-003-R21 the debug export is available only when the URL query has debug=1.
export function isDebug(search: string): boolean {
  return new URLSearchParams(search).get('debug') === '1';
}

// MEC-003-R21 `?debug=1&level=N` starts the next run at level N (1..maxLevel); null when debug is off or N is invalid.
export function debugStartLevel(search: string, maxLevel: number): number | null {
  if (!isDebug(search)) return null;
  const raw = new URLSearchParams(search).get('level');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= maxLevel ? n : null;
}

// ART-001 `?debug=1&artPreview=1` opens the capy preview page instead of Home.
export function isArtPreview(search: string): boolean {
  return isDebug(search) && new URLSearchParams(search).get('artPreview') === '1';
}
