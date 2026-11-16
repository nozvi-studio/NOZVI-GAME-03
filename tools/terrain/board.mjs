// tools/terrain/board.mjs - MEC-019 picture board: every template in its four variants. Run: node tools/terrain/board.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const { templates } = JSON.parse(readFileSync('config/terrain.json', 'utf8'));
const NAMES = ['original', 'mirror left-right', 'mirror top-bottom', 'rotate 180'];
const variant = (rows, v) => {
  const r = v & 2 ? [...rows].reverse() : rows;
  return v & 1 ? r.map(s => [...s].reverse().join('')) : r;
};
const grid = rows => `<div class="g">${rows.map(row => [...row].map(ch => `<i class="${ch === 'R' ? 'r' : ch === 'F' ? 'f' : ''}"></i>`).join('')).join('')}</div>`;
const html = `<!doctype html><meta charset="utf-8"><title>MEC-019 terrain board</title>
<style>body{font:14px system-ui;margin:16px;background:#f4f1ea;color:#222}h2{margin:24px 0 8px}
.row{display:flex;gap:16px;flex-wrap:wrap}.g{display:grid;grid-template-columns:repeat(17,10px);gap:1px;background:#cfd8c0;padding:1px}
.g i{width:10px;height:10px;background:#eef3e2}.g i.r{background:#6b6f76;border-radius:50%}.g i.f{background:#a8743a}
figure{margin:0}figcaption{font-size:12px;margin-top:4px}</style>
<h1>MEC-019 fixed terrain: 12 templates x 4 variants</h1><p>Grey dot = rock, brown = fence. Generated from config/terrain.json.</p>
${templates.map(t => `<h2>${t.id} - ${t.name} (biome ${t.biome}, segment ${t.segment})</h2><div class="row">${
  [0, 1, 2, 3].map(v => `<figure>${grid(variant(t.rows, v))}<figcaption>${NAMES[v]}</figcaption></figure>`).join('')}</div>`).join('\n')}`;
mkdirSync('docs/design/terrain', { recursive: true });
writeFileSync('docs/design/terrain/board.html', html);
console.log('wrote docs/design/terrain/board.html');
