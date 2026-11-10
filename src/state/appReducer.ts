import {
  createSession,
  gameReducer,
  initialGameState,
  settleHand,
  setupForSession,
  type Action,
  type GameConfig,
  type GameState,
  type Session,
} from '../engine';
import { newlyEarned } from './achievements';
import {
  EMPTY_STATS,
  MAX_HISTORY,
  addHandToStats,
  recordHand,
  type HandRecord,
  type LifetimeStats,
} from './stats';

/** Everything that persists: the session, the current hand, and the player's record. */
export interface AppState {
  session: Session;
  game: GameState;
  stats: LifetimeStats;
  /** Finished hands, newest first (capped at MAX_HISTORY). */
  history: readonly HandRecord[];
  /** Unlocked achievements: id -> when (epoch milliseconds). */
  achievements: Readonly<Record<string, number>>;
  /** Achievements unlocked by the hand that was just scored (for the toast). */
  unlocked: readonly string[];
}

export type AppAction =
  /** A game action. `at` is the wall-clock time, supplied by the caller so the reducer stays pure. */
  | { type: 'GAME'; action: Action; at?: number }
  /** Deal the next hand (or the first one). */
  | { type: 'DEAL' }
  /** Change settings; ignored while a hand is in progress. */
  | { type: 'CONFIG'; patch: Partial<GameConfig> }
  /** Fresh bankroll and a new seed, keeping settings, stats, history and achievements. */
  | { type: 'NEW_SESSION'; seed: string }
  /** Wipe everything back to a first launch. */
  | { type: 'RESET_ALL'; seed: string };

export const initialAppState = (seed: string): AppState => ({
  session: createSession(undefined, seed),
  game: initialGameState(),
  stats: EMPTY_STATS,
  history: [],
  achievements: {},
  unlocked: [],
});

/** Applies a just-scored hand to the session, stats, history and achievements. */
const settle = (state: AppState, game: GameState, at: number): AppState => {
  const session = settleHand(state.session, game);
  const record = recordHand(game, state.session.handNo, at);
  if (!record || !game.result) return { ...state, game, session };
  const stats = addHandToStats(state.stats, record);
  const unlocked = newlyEarned(state.achievements, {
    record,
    result: game.result,
    stats,
    bankroll: session.bankroll,
  });
  const achievements = { ...state.achievements };
  for (const id of unlocked) achievements[id] = at;
  return {
    session,
    game,
    stats,
    history: [record, ...state.history].slice(0, MAX_HISTORY),
    achievements,
    unlocked,
  };
};

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'GAME': {
      const game = gameReducer(state.game, action.action);
      if (game === state.game) return state;
      // Settle exactly once, on the transition into "scored".
      const justScored = state.game.phase !== 'scored' && game.phase === 'scored';
      return justScored ? settle(state, game, action.at ?? 0) : { ...state, game };
    }
    case 'DEAL': {
      if (state.game.phase === 'placing') return state;
      const game = gameReducer(state.game, {
        type: 'START_HAND',
        setup: setupForSession(state.session),
      });
      return { ...state, game, unlocked: [] };
    }
    case 'CONFIG': {
      if (state.game.phase === 'placing') return state;
      const config = { ...state.session.config, ...action.patch };
      const fantasyland =
        config.fantasyland === 'off' ? { human: 0, ai: 0 } : state.session.fantasyland;
      return { ...state, session: { ...state.session, config, fantasyland } };
    }
    case 'NEW_SESSION':
      return {
        ...state,
        session: createSession(state.session.config, action.seed),
        game: initialGameState(),
        unlocked: [],
      };
    case 'RESET_ALL':
      return initialAppState(action.seed);
  }
};
