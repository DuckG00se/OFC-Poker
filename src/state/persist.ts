import {
  handSeed,
  initialGameState,
  replay,
  type Action,
  type Difficulty,
  type FantasylandMode,
  type GameConfig,
  type GameState,
  type HandSetup,
  type RowName,
  type Seat,
  type Session,
  type Variant,
} from '../engine';
import { DEFAULT_PREFS, type CardBack, type Helpers, type MotionLevel, type Prefs } from '../ui/prefs';
import { ACHIEVEMENTS } from './achievements';
import { initialAppState, type AppState } from './appReducer';
import { EMPTY_STATS, MAX_HISTORY, type HandRecord, type LifetimeStats } from './stats';

/**
 * Saving and loading. Everything read back from storage is treated as untrusted: it may be
 * from an older version, hand-edited, or cut off mid-write. Each field is validated, and the
 * hand in progress is rebuilt by replaying its action log through the engine, which ignores
 * illegal actions. A bad save can therefore lose data, but it cannot crash the game or put
 * it in an impossible state.
 */
export const SAVE_VERSION = 1;
export const STATE_KEY = 'ofc-poker:v1:state';
export const HISTORY_KEY = 'ofc-poker:v1:history';

/** The part of the Storage interface that is used (so tests can pass a plain object). */
export interface SaveTarget {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** localStorage if it is usable (it throws in some private modes), else null. */
export const browserStorage = (): SaveTarget | null => {
  try {
    const storage = window.localStorage;
    const probe = 'ofc-poker:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
};

// ---- Validation helpers ----------------------------------------------------

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const oneOf = <T extends string>(v: unknown, options: readonly T[]): v is T =>
  isString(v) && (options as readonly string[]).includes(v);

const SEATS: readonly Seat[] = ['human', 'ai'];
const ROWS: readonly RowName[] = ['front', 'mid', 'back'];
const VARIANTS: readonly Variant[] = ['classic', 'pineapple'];
const FL_MODES: readonly FantasylandMode[] = ['off', 'flat', 'progressive'];
const LEVELS: readonly Difficulty[] = ['easy', 'medium', 'hard'];
const MOTION: readonly MotionLevel[] = ['full', 'fast', 'off'];
const BACKS: readonly CardBack[] = ['red', 'blue', 'green'];
const FL_COUNTS = [0, 14, 15, 16, 17];

const parseConfig = (v: unknown): GameConfig | null => {
  if (!isObject(v)) return null;
  const { variant, fantasyland, difficulty, stake } = v;
  if (!oneOf(variant, VARIANTS) || !oneOf(fantasyland, FL_MODES) || !oneOf(difficulty, LEVELS)) {
    return null;
  }
  if (!isNumber(stake) || stake <= 0 || stake > 10_000) return null;
  return { variant, fantasyland, difficulty, stake };
};

const parseFantasyland = (v: unknown): Record<Seat, number> | null => {
  if (!isObject(v)) return null;
  const { human, ai } = v;
  if (!isNumber(human) || !isNumber(ai)) return null;
  if (!FL_COUNTS.includes(human) || !FL_COUNTS.includes(ai)) return null;
  return { human, ai };
};

const parseSetup = (v: unknown): HandSetup | null => {
  if (!isObject(v)) return null;
  const config = parseConfig(v.config);
  const fantasyland = parseFantasyland(v.fantasyland);
  if (!isString(v.seed) || !oneOf(v.button, SEATS) || !config || !fantasyland) return null;
  return { seed: v.seed, config, button: v.button, fantasyland };
};

const parseAction = (v: unknown): Action | null => {
  if (!isObject(v)) return null;
  if (v.type === 'START_HAND') {
    const setup = parseSetup(v.setup);
    return setup ? { type: 'START_HAND', setup } : null;
  }
  if (!oneOf(v.seat, SEATS)) return null;
  const seat = v.seat;
  if (v.type === 'CONFIRM') return { type: 'CONFIRM', seat };
  if (!isString(v.cardId)) return null;
  const cardId = v.cardId;
  if (v.type === 'DISCARD' || v.type === 'UNDO') return { type: v.type, seat, cardId };
  if ((v.type === 'PLACE' || v.type === 'MOVE') && oneOf(v.row, ROWS)) {
    return { type: v.type, seat, cardId, row: v.row };
  }
  return null;
};

/** Parses a whole action log; one bad entry invalidates the log. */
const parseLog = (v: unknown): Action[] | null => {
  if (!Array.isArray(v)) return null;
  const log: Action[] = [];
  for (const item of v) {
    const action = parseAction(item);
    if (!action) return null;
    log.push(action);
  }
  return log;
};

const parseSession = (v: unknown): Session | null => {
  if (!isObject(v)) return null;
  const config = parseConfig(v.config);
  const fantasyland = parseFantasyland(v.fantasyland);
  if (!config || !fantasyland || !isString(v.sessionSeed) || !oneOf(v.button, SEATS)) return null;
  if (!isNumber(v.handNo) || v.handNo < 1 || !isNumber(v.bankroll) || !isNumber(v.handsPlayed)) {
    return null;
  }
  return {
    sessionSeed: v.sessionSeed,
    config,
    handNo: Math.floor(v.handNo),
    button: v.button,
    bankroll: v.bankroll,
    fantasyland: config.fantasyland === 'off' ? { human: 0, ai: 0 } : fantasyland,
    handsPlayed: Math.max(0, Math.floor(v.handsPlayed)),
  };
};

const parseStats = (v: unknown): LifetimeStats => {
  if (!isObject(v)) return EMPTY_STATS;
  const stats: LifetimeStats = { ...EMPTY_STATS };
  for (const key of Object.keys(EMPTY_STATS) as (keyof LifetimeStats)[]) {
    const value = v[key];
    if (isNumber(value)) stats[key] = value;
  }
  return stats;
};

const parseAchievements = (v: unknown): Record<string, number> => {
  if (!isObject(v)) return {};
  const out: Record<string, number> = {};
  for (const { id } of ACHIEVEMENTS) {
    const at = v[id];
    if (isNumber(at)) out[id] = at;
  }
  return out;
};

export const parsePrefs = (v: unknown): Prefs => {
  if (!isObject(v)) return DEFAULT_PREFS;
  const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === 'boolean' ? value : fallback;
  const h = isObject(v.helpers) ? v.helpers : {};
  const d = DEFAULT_PREFS;
  const helpers: Helpers = {
    handNames: bool(h.handNames, d.helpers.handNames),
    foulWarning: bool(h.foulWarning, d.helpers.foulWarning),
    outs: bool(h.outs, d.helpers.outs),
    royalties: bool(h.royalties, d.helpers.royalties),
    tracker: bool(h.tracker, d.helpers.tracker),
  };
  return {
    sound: bool(v.sound, d.sound),
    haptics: bool(v.haptics, d.haptics),
    fourColorDeck: bool(v.fourColorDeck, d.fourColorDeck),
    cardBack: oneOf(v.cardBack, BACKS) ? v.cardBack : d.cardBack,
    motion: oneOf(v.motion, MOTION) ? v.motion : d.motion,
    cpuHints: bool(v.cpuHints, d.cpuHints),
    helpers,
    tutorialSeen: bool(v.tutorialSeen, d.tutorialSeen),
  };
};

const parseRecord = (v: unknown): HandRecord | null => {
  if (!isObject(v)) return null;
  const log = parseLog(v.log);
  if (!log || log.length === 0 || !isString(v.id)) return null;
  if (!oneOf(v.variant, VARIANTS) || !oneOf(v.difficulty, LEVELS)) return null;
  const numbers = [v.handNo, v.at, v.stake, v.points, v.payout, v.scoop, v.royalties, v.fantasylandNext];
  if (!numbers.every(isNumber)) return null;
  return {
    id: v.id,
    handNo: v.handNo as number,
    at: v.at as number,
    variant: v.variant,
    difficulty: v.difficulty,
    stake: v.stake as number,
    points: v.points as number,
    payout: v.payout as number,
    humanFouled: v.humanFouled === true,
    cpuFouled: v.cpuFouled === true,
    scoop: v.scoop as number,
    royalties: v.royalties as number,
    fantasylandNext: v.fantasylandNext as number,
    inFantasyland: v.inFantasyland === true,
    log,
  };
};

// ---- The hand in progress --------------------------------------------------

/**
 * If the save was taken while the CPU was half-way through placing its cards, drop that
 * unfinished part of its turn. The CPU then simply decides the turn again when the game
 * resumes (it is seeded, so it reaches the same decision).
 */
export const stripPartialCpuTurn = (log: readonly Action[]): Action[] => {
  const out = [...log];
  const state = replay(out);
  const turn = state.turn;
  if (state.phase !== 'placing' || !turn || turn.seat !== 'ai') return out;
  if (turn.placed.length === 0 && turn.discarded.length === 0) return out;
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (!last || last.type === 'START_HAND' || last.type === 'CONFIRM') break;
    out.pop();
  }
  return out;
};

/** Rebuilds the saved hand, or returns an idle game if the log does not hold together. */
const rebuildGame = (log: Action[] | null, session: Session): GameState => {
  if (!log || log.length === 0) return initialGameState();
  const clean = stripPartialCpuTurn(log);
  const game = replay(clean);
  // Every action must have been legal, or the log is not a real game.
  if (game.log.length !== clean.length || !game.setup || game.phase === 'idle') {
    return initialGameState();
  }
  // The hand must belong to this session: the current hand, or the one just scored.
  const expected = game.phase === 'scored' ? session.handNo - 1 : session.handNo;
  if (game.setup.seed !== handSeed(session.sessionSeed, expected)) return initialGameState();
  return game;
};

// ---- Load ------------------------------------------------------------------

export interface LoadedSave {
  app: AppState;
  prefs: Prefs;
  /** True when nothing usable was stored (first launch, or an unreadable save). */
  fresh: boolean;
}

const readJson = (storage: SaveTarget, key: string): unknown => {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
};

/** Loads the saved game. `seed` is used for the new session when there is nothing to load. */
export const loadSave = (storage: SaveTarget | null, seed: string): LoadedSave => {
  const blank: LoadedSave = { app: initialAppState(seed), prefs: DEFAULT_PREFS, fresh: true };
  if (!storage) return blank;
  const saved = readJson(storage, STATE_KEY);
  if (!isObject(saved) || saved.version !== SAVE_VERSION) return blank;

  const prefs = parsePrefs(saved.prefs);
  const session = parseSession(saved.session);
  const stats = parseStats(saved.stats);
  const achievements = parseAchievements(saved.achievements);
  const rawHistory = readJson(storage, HISTORY_KEY);
  const history = (Array.isArray(rawHistory) ? rawHistory : [])
    .map(parseRecord)
    .filter((r): r is HandRecord => r !== null)
    .slice(0, MAX_HISTORY);

  if (!session) {
    // Keep what is still good (preferences and the lifetime record) and start a new session.
    return {
      app: { ...initialAppState(seed), stats, achievements, history },
      prefs,
      fresh: false,
    };
  }
  return {
    app: {
      session,
      game: rebuildGame(parseLog(saved.log), session),
      stats,
      history,
      achievements,
      unlocked: [],
    },
    prefs,
    fresh: false,
  };
};

// ---- Save ------------------------------------------------------------------

export interface SaveWriter {
  save: (app: AppState, prefs: Prefs) => void;
  clear: () => void;
}

/**
 * Writes saves. The history (the bulky part) is only rewritten when it actually changes.
 * Storage errors (quota, private mode) are swallowed: the game keeps working unsaved.
 */
export const createSaveWriter = (storage: SaveTarget | null): SaveWriter => {
  let lastHistory: readonly HandRecord[] | null = null;
  return {
    save: (app, prefs) => {
      if (!storage) return;
      try {
        storage.setItem(
          STATE_KEY,
          JSON.stringify({
            version: SAVE_VERSION,
            session: app.session,
            log: app.game.log,
            stats: app.stats,
            achievements: app.achievements,
            prefs,
          }),
        );
        if (app.history !== lastHistory) {
          storage.setItem(HISTORY_KEY, JSON.stringify(app.history));
          lastHistory = app.history;
        }
      } catch {
        // Out of space or blocked: nothing sensible to do but carry on.
      }
    },
    clear: () => {
      lastHistory = null;
      try {
        storage?.removeItem(STATE_KEY);
        storage?.removeItem(HISTORY_KEY);
      } catch {
        // Ignore.
      }
    },
  };
};
