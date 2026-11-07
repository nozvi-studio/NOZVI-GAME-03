// P3b3-R12 BootD2 progress bar and "Loading… N%" text.
export function bootView(progress: number): { fill: number; textKey: 'boot.loading'; n: number } {
  const fill = Math.min(1, Math.max(0, progress));
  return { fill, textKey: 'boot.loading', n: Math.round(fill * 100) };
}
