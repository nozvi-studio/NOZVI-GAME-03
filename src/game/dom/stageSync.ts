// D4-P1-R1 syncs #ui-root to the Phaser canvas rect and exposes --stage-* / --board-* CSS vars. Pure: no Phaser.
export interface StageRect { left: number; top: number; width: number; height: number }
export interface BoardMetrics { top: number; size: number; height: number }
export interface StageSyncDeps {
  root: HTMLElement;
  readRect: () => StageRect;
  board: () => BoardMetrics;
  baseWidth: number;
  raf?: (cb: () => void) => number;
  subscribe?: (onChange: () => void) => () => void;
}

export function stageVars(rect: StageRect, board: BoardMetrics, baseWidth: number): Record<string, string> {
  const scale = baseWidth > 0 ? rect.width / baseWidth : 1;
  const boardTop = board.height > 0 ? (board.top / board.height) * 100 : 0;
  const boardH = board.height > 0 ? (board.size / board.height) * 100 : 100;
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    '--stage-w': `${rect.width}px`,
    '--stage-h': `${rect.height}px`,
    '--stage-scale': String(+scale.toFixed(4)),
    '--board-top': `${+boardTop.toFixed(4)}%`,
    '--board-h': `${+boardH.toFixed(4)}%`,
  };
}

function defaultSubscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', onChange);
  const vv = window.visualViewport;
  vv?.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('resize', onChange);
    vv?.removeEventListener('resize', onChange);
  };
}

// D4-P1-R1 keeps #ui-root aligned 1:1 with the Phaser canvas box, throttled by rAF.
export function startStageSync(d: StageSyncDeps): { sync(): void; schedule(): void; stop(): void } {
  const raf = d.raf ?? (cb => window.requestAnimationFrame(cb));
  let pending = false;
  let stopped = false;

  const sync = (): void => {
    if (stopped) return;
    const vars = stageVars(d.readRect(), d.board(), d.baseWidth);
    const s = d.root.style;
    s.left = vars.left!;
    s.top = vars.top!;
    s.width = vars.width!;
    s.height = vars.height!;
    s.setProperty('--stage-w', vars['--stage-w']!);
    s.setProperty('--stage-h', vars['--stage-h']!);
    s.setProperty('--stage-scale', vars['--stage-scale']!);
    s.setProperty('--board-top', vars['--board-top']!);
    s.setProperty('--board-h', vars['--board-h']!);
  };

  const schedule = (): void => {
    if (stopped || pending) return;
    pending = true;
    raf(() => {
      pending = false;
      sync();
    });
  };

  const unsub = (d.subscribe ?? defaultSubscribe)(schedule);
  sync();

  return {
    sync,
    schedule,
    stop: () => {
      if (stopped) return;
      stopped = true;
      unsub();
    },
  };
}
