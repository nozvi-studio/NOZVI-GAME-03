// MEC-003-R21 the debug export is available only when the URL query has debug=1.
export function isDebug(search: string): boolean {
  return new URLSearchParams(search).get('debug') === '1';
}
