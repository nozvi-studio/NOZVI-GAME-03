// Boundary rules for the pure modules (design §3, §9.4). GDD-13
const FORBIDDEN: readonly { name: string; re: RegExp }[] = [
  { name: 'phaser import', re: /from\s+['"]phaser['"]|import\s*\(\s*['"]phaser['"]\s*\)/ },
  { name: 'window', re: /\bwindow\b/ },
  { name: 'document', re: /\bdocument\b/ },
  { name: 'localStorage', re: /\blocalStorage\b/ },
  { name: 'Math.random', re: /\bMath\.random\b/ },
  { name: 'performance', re: /\bperformance\b/ },
  { name: 'Date', re: /\bDate\b/ },
];

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

export function findViolations(files: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [path, text] of Object.entries(files)) {
    const code = stripComments(text);
    for (const f of FORBIDDEN) if (f.re.test(code)) out.push(`${path}: ${f.name}`);
  }
  return out;
}
