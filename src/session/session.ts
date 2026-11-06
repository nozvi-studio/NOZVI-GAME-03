// Pure session: wires save, sim and run log (P1-D1). Imports only the core and meta public entries.
import { createSim, unlockedSkills, slotCount, unlockTable } from '../core/index';
import type { Balance, CauseKey, Loadout, Sim, SimEvent, SimSnapshot, SkillId, TileKind } from '../core/index';
import {
  load, save as writeSave, applyLevelReached, applyRunWon, carryEnergy, nextMilestone, sanitizeLoadout,
  loadLog, nextRun, appendRecord, flushLog,
} from '../meta/index';
import type { KeyValueStore, LogRecord, RunLog, SaveDataV2 } from '../meta/index';

export interface SessionDeps { balance: Balance; store: KeyValueStore; newSeed(): number; now(): number }
export interface HomeModel {
  checkpoints: number[]; defaultStart: number; carriedEnergy: number;
  nextMilestone: { reach: number; requiresClear: boolean } | null; showLoadout: boolean;
}
export interface LoadoutModel { unlocked: SkillId[]; slotCount: 1 | 2; selection: Loadout }
export interface RunSummary {
  won: boolean; cause: CauseKey | 'clear' | 'quit'; level: number; startLevel: number;
  levelsCleared: number; score: number; bestScore: number; newBest: boolean; carriedEnergy: number;
  context?: TileKind;
}
export interface Session {
  homeModel(): HomeModel;
  loadoutModel(): LoadoutModel;
  confirmLoadout(l: Loadout): void;
  startRun(startLevel: number, entry?: 'home' | 'results', debug?: boolean): void;
  lastStartLevel(): number | null;
  frame(ms: number): SimEvent[];
  turn(dx: -1 | 0 | 1, dy: -1 | 0 | 1): void;
  useSkill(slot: 0 | 1): void;
  /** MEC-003-R21 debug only: level-up into `level` (> current); marks the run debug. Returns false when refused. */
  debugSkipTo(level: number): boolean;
  snapshot(): Readonly<SimSnapshot>;
  pause(): void; hidden(): void; quit(): void;
  summary(): RunSummary | null;
  save(): Readonly<SaveDataV2>;
  setSound(on: boolean): void;
  exportLog(): string;
}

interface RunState {
  sim: Sim; runId: number; startLevel: number; startEnergy: number; loadout: Loadout;
  over: boolean; summary: RunSummary | null; turns: number;
  /** MEC-003-R21 debug start: no checkpoint or best-level progress is written during this run. */
  debug: boolean;
}

type RecordBody = LogRecord extends infer R ? R extends LogRecord ? Omit<R, 't' | 'runId'> : never : never;

const handlers = new WeakMap<Session, (events: SimEvent[]) => void>();

/** The frame() event handler (P1 design section 8). Tests only; not re-exported from index.ts. */
export function processEvents(session: Session, events: SimEvent[]): void {
  const h = handlers.get(session);
  if (!h) throw new Error('processEvents: not a session');
  h(events);
}

// P1-D1 session flow: MEC-008-R1..R7, MEC-007-R1..R13, MEC-003-R19/R20.
export function createSession(deps: SessionDeps): Session {
  const b = deps.balance;
  const rules = { skillIds: b.loadout.order, maxLevel: b.level.maxLevel, carryMax: b.checkpoints.carryMax };
  let data: SaveDataV2 = load(deps.store, rules);
  let log: RunLog = loadLog(deps.store);
  let run: RunState | null = null;
  let lastStart: number | null = null;
  let lastDebug = false;

  const persist = (d: SaveDataV2) => { data = d; writeSave(deps.store, data); };
  const record = (rec: RecordBody) => {
    if (!run) return;
    log = appendRecord(log, { ...rec, t: deps.now(), runId: run.runId } as LogRecord, b.log.maxEntries);
  };
  const bestLevel = () => Math.max(1, data.bestLevel);
  const currentLoadout = (): Loadout => sanitizeLoadout(data.lastLoadout, bestLevel(), unlockTable(b));

  const reached = (level: number) => {
    if (run?.debug) return; // MEC-003-R21 debug runs never unlock progress
    const r = applyLevelReached(data, level, b);
    if (r.data.bestLevel !== data.bestLevel || r.newCheckpoints.length > 0) persist(r.data);
    for (const cp of r.newCheckpoints) record({ type: 'checkpoint_unlocked', level: cp, reachedLevel: level });
  };

  // MEC-008-R6 / MEC-003-R19/R20 run end: carry, best score, run_end record, save and flush.
  const endRun = (cause: CauseKey | 'clear' | 'quit', context?: TileKind) => {
    if (!run || run.over) return;
    const snap = run.sim.snapshot();
    const won = cause === 'clear';
    if (won && !run.debug) persist(applyRunWon(data, b).data);
    const carried = carryEnergy(snap.energy, b);
    const newBest = snap.score > data.bestScore;
    persist({ ...data, carriedEnergy: carried, bestScore: Math.max(data.bestScore, snap.score) });
    record({ type: 'run_end', level: snap.level, score: snap.score, cause, durationMs: snap.timeMs,
      startLevel: snap.startLevel, levelsCleared: snap.levelsCleared, won, turns: run.turns,
      ...(context === undefined ? {} : { context }) });
    flushLog(deps.store, log);
    run.over = true;
    run.summary = { won, cause, level: snap.level, startLevel: snap.startLevel, levelsCleared: snap.levelsCleared,
      score: snap.score, bestScore: data.bestScore, newBest, carriedEnergy: carried,
      ...(context === undefined ? {} : { context }) };
  };

  const handle = (events: SimEvent[]) => {
    for (const e of events) {
      if (!run || run.over) return;
      switch (e.type) {
        case 'levelUp': // MEC-008-R1/R3 and MEC-003-R19 level_up
          reached(e.level);
          record({ type: 'level_up', level: e.level, levelTimeMs: e.clearedLevelTimeMs });
          break;
        case 'skillUsed':
          record({ type: 'skill_used', skill: e.skill, level: e.level, energyBefore: e.energyBefore });
          break;
        case 'runWon': endRun('clear'); break;
        case 'died': endRun(e.cause, e.context); break;
        default: break;
      }
    }
  };

  // MEC-008-R7 provisional carry plus log flush; no-op without an active run.
  const provisional = () => {
    if (!run || run.over) return;
    persist({ ...data, carriedEnergy: carryEnergy(run.sim.snapshot().energy, b) });
    flushLog(deps.store, log);
  };

  const session: Session = {
    homeModel() {
      const checkpoints = [...data.unlockedCheckpoints];
      return {
        checkpoints,
        defaultStart: checkpoints.length > 0 ? Math.max(...checkpoints) : 1, // MEC-008-R4
        carriedEnergy: data.carriedEnergy,
        nextMilestone: nextMilestone(data, b),
        showLoadout: unlockedSkills(b, bestLevel()).length > 0, // MEC-007-R1
      };
    },
    loadoutModel() { // MEC-007-R3
      return { unlocked: unlockedSkills(b, bestLevel()), slotCount: slotCount(b, bestLevel()), selection: currentLoadout() };
    },
    confirmLoadout(l) { persist({ ...data, lastLoadout: [l[0], l[1]] }); }, // MEC-007-R9
    startRun(startLevel, entry = 'home', debug = false) { // MEC-008-R5, MEC-007-R10, MEC-003-R21 debug start
      const dbg = debug || (entry === 'results' && lastDebug && startLevel === lastStart);
      if (dbg) {
        if (!Number.isInteger(startLevel) || startLevel < 1 || startLevel > b.level.maxLevel)
          throw new RangeError('startRun: debug level ' + startLevel + ' is out of range');
      } else if (startLevel !== 1 && !data.unlockedCheckpoints.includes(startLevel))
        throw new RangeError('startRun: level ' + startLevel + ' is not an unlocked start');
      const best = bestLevel();
      const loadout = currentLoadout();
      const startEnergy = data.carriedEnergy;
      persist({ ...data, carriedEnergy: 0 });
      const sim = createSim(b, deps.newSeed(), { startLevel, startEnergy, loadout, bestLevel: best });
      const n = nextRun(log); log = n.log;
      run = { sim, runId: n.runId, startLevel, startEnergy, loadout, over: false, summary: null, turns: 0, debug: dbg };
      lastStart = startLevel; lastDebug = dbg;
      reached(startLevel);
      record({ type: 'run_start', startLevel, startEnergy, loadout: [loadout[0], loadout[1]], entry, ...(dbg ? { debug: true } : {}) });
    },
    lastStartLevel: () => lastStart,
    frame(ms) {
      if (!run || run.over) return [];
      run.sim.advance(ms);
      const events = run.sim.drainEvents();
      handle(events);
      return events;
    },
    turn(dx, dy) { if (run && !run.over && run.sim.turn(dx, dy)) run.turns++; }, // MEC-003-R19 turns
    useSkill(slot) { if (run && !run.over) run.sim.useSkill(slot); }, // MEC-007-R14
    debugSkipTo(level) { // MEC-003-R21 converts a normal run to debug on first use; stats and progress stay clean
      const from = run && !run.over ? run.sim.snapshot().level : 0;
      if (!run || run.over || !run.sim.debugSkipTo(level)) return false;
      if (!run.debug) { run.debug = true; lastDebug = true; }
      record({ type: 'debug_skip', from, to: level });
      return true;
    },
    snapshot() {
      if (!run) throw new Error('snapshot: no run');
      return run.sim.snapshot();
    },
    pause: provisional,
    hidden: provisional,
    quit() { endRun('quit'); }, // MEC-003-R20
    summary: () => run?.summary ?? null,
    save: () => data,
    setSound(on) { persist({ ...data, settings: { ...data.settings, sound: on } }); },
    exportLog: () => JSON.stringify(log),
  };
  handlers.set(session, handle);
  return session;
}
