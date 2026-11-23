// Runtime text loader for CSS/HTML assertions without adding @types/node to tsconfig.
const FS_MOD = 'node:fs';

export async function readRepoText(relPath: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ FS_MOD)) as { readFileSync(p: string, enc: string): string };
  return fs.readFileSync(relPath, 'utf8');
}
