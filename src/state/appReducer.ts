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

/** Match-level state plus the current hand. Pure: no timers, no randomness. */
export interface AppState {
  session: Session;
  game: GameState;
}

export type AppAction =
  | { type: 'GAME'; action: Action }
  /** Deal the next hand (or the first one). */
  | { type: 'DEAL' }
  /** Change settings; ignored while a hand is in progress. */
  | { type: 'CONFIG'; patch: Partial<GameConfig> }
  /** Fresh bankroll and a new seed, keeping the current settings. */
  | { type: 'NEW_SESSION'; seed: string };

export const initialAppState = (seed: string): AppState => ({
  session: createSession(undefined, seed),
  game: initialGameState(),
});

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'GAME': {
      const game = gameReducer(state.game, action.action);
      if (game === state.game) return state;
      // Settle exactly once, on the transition into "scored".
      const justScored = state.game.phase !== 'scored' && game.phase === 'scored';
      return { game, session: justScored ? settleHand(state.session, game) : state.session };
    }
    case 'DEAL': {
      if (state.game.phase === 'placing') return state;
      const game = gameReducer(state.game, {
        type: 'START_HAND',
        setup: setupForSession(state.session),
      });
      return { ...state, game };
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
        session: createSession(state.session.config, action.seed),
        game: initialGameState(),
      };
  }
};
