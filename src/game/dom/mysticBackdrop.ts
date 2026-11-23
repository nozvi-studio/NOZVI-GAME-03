// Mystic Aqua Marsh backdrop: lightweight 20KB WebP art + 8 evenly distributed GPU-composited fireflies. Pure: no Phaser.

// Evenly spaced fireflies across top/mid/bottom & left/right (x%, y%, size px, delay s, duration s).
const FIREFLIES: readonly [number, number, number, number, number][] = [
  [10, 15, 7, 0.0, 3.8],
  [89, 17, 7, 1.2, 4.1],
  [8, 39, 8, 2.1, 4.4],
  [92, 41, 8, 0.6, 3.9],
  [12, 63, 7, 1.5, 4.2],
  [88, 65, 8, 2.6, 4.0],
  [18, 84, 7, 0.9, 4.5],
  [82, 83, 7, 1.9, 3.7],
];

export function mountMysticBackdrop(screen: HTMLElement): () => void {
  const doc = screen.ownerDocument;
  screen.classList.add('d4-mystic');
  doc.body.classList.add('d4-mystic-band');

  const layer = doc.createElement('div');
  layer.className = 'd4-mystic-bg';
  layer.setAttribute('aria-hidden', 'true');

  for (const [x, y, size, delay, dur] of FIREFLIES) {
    const dot = doc.createElement('span');
    dot.className = 'd4-firefly';
    dot.style.left = `${x}%`;
    dot.style.top = `${y}%`;
    dot.style.setProperty('--ff-size', `${size}px`);
    dot.style.setProperty('--ff-delay', `${delay}s`);
    dot.style.setProperty('--ff-dur', `${dur}s`);
    layer.appendChild(dot);
  }

  screen.prepend(layer);

  return () => {
    layer.remove();
    doc.body.classList.remove('d4-mystic-band');
  };
}
